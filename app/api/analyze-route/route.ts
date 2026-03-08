import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { RepositoryAnalysis } from "@/models/RepositoryAnalysis";
import { RouteCache } from "@/models/RouteCache";
import { analyzeSpecificRoute, identifyRelevantFilesForRoute } from "@/lib/llm";
import { getSpecificFiles } from "@/lib/github";
import { requestDeduplicator } from "@/lib/request-deduplicator";
import { SmartCache } from "@/lib/smart-cache";

export const maxDuration = 300;

// ─── Call Groq and convert any unrecoverable 429 to RateLimitExhaustedError ──
class RateLimitExhaustedError extends Error {
    constructor(public readonly originalMessage: string) {
        super("RATE_LIMIT_EXHAUSTED");
        this.name = "RateLimitExhaustedError";
    }
}

/** Returns wait time in ms if the 429 is a short TPM delay, or throws RateLimitExhaustedError for long / daily limits. */
function parseGroq429WaitMs(message: string): number {
    // Hour-level wait (daily token limit) → subscription gate immediately
    if (/try again in\s+\d+h/i.test(message)) throw new RateLimitExhaustedError(message);

    // Hard payload limit (requested tokens > total allowed per minute) → cannot wait this out
    if (/Limit \d+, Requested \d+/i.test(message)) throw new RateLimitExhaustedError(message);

    const minMatch = message.match(/try again in\s+(\d+)m([\d.]+)s/i);
    if (minMatch) {
        const ms = (parseInt(minMatch[1]) * 60 + parseFloat(minMatch[2])) * 1000;
        if (ms > 12000) throw new RateLimitExhaustedError(message); // >12s = treat as exhausted
        return ms + 400;
    }

    const secMatch = message.match(/try again in\s+([\d.]+)s/i);
    if (secMatch) return Math.ceil(parseFloat(secMatch[1]) * 1000) + 400;

    return 3000; // unknown format — default 3s wait
}

async function withRateLimitRetry<T>(fn: () => Promise<T>): Promise<T> {
    let result: T;
    try {
        result = await fn();
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("429")) throw err; // Non-429 errors bubble up normally

        console.error("[analyze-route] Groq 429 on first attempt:", message);

        try {
            const waitMs = parseGroq429WaitMs(message); // throws RateLimitExhaustedError for long waits
            console.log(`[analyze-route] Waiting ${waitMs}ms then retrying with same key…`);
            await new Promise(r => setTimeout(r, waitMs));
            result = await fn(); // single retry
        } catch (retryErr: unknown) {
            const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
            // If the retry ALSO hits 429 → all keys exhausted → subscription page
            if (retryMsg.includes("429") || retryErr instanceof RateLimitExhaustedError) {
                console.error("[analyze-route] Groq 429 on retry too — all tokens exhausted:", retryMsg);
                throw new RateLimitExhaustedError(retryMsg);
            }
            throw retryErr;
        }
    }
    return result;
}

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const repoUrl = searchParams.get("repoUrl");
    const route = searchParams.get("route");
    const routeIndex = parseInt(searchParams.get("routeIndex") ?? "0", 10);
    const forceReload = searchParams.get("forceReload") === "true";

    if (!repoUrl || !route) {
        return NextResponse.json({ error: "repoUrl and route are required." }, { status: 400 });
    }

    await connectDB();

    // ─── 1. Check subscription limit before proceeding ──────────────────
    if (!forceReload) {
        try {
            const checkResponse = await fetch(
                new URL("/api/subscription/check-limit", req.url).toString(),
                {
                    method: "POST",
                    headers: {
                        cookie: req.headers.get("cookie") || "",
                    },
                }
            );

            if (!checkResponse.ok) {
                const limitData = await checkResponse.json();
                if (limitData.reason === "limit_exceeded") {
                    console.log(`[analyze-route] User ${session.user.email} exceeded ${limitData.plan} plan limit`);
                    return NextResponse.json({ rateLimitExceeded: true }, { status: 402 });
                }
            }
        } catch (limitError) {
            console.error("[analyze-route] Error checking subscription limit:", limitError);
            // Continue anyway - don't block on limit check failure
        }
    }

    // ─── 2. Smart cache check with stale-while-revalidate ───────────────
    if (!forceReload) {
        const cacheResult = await SmartCache.getRouteAnalysis(repoUrl, route, {
            staleWhileRevalidate: true,
        });

        if (cacheResult) {
            const { data, stale } = cacheResult;

            // If data is fresh, return immediately
            if (!stale) {
                console.log(`[analyze-route] ✅ Fresh cache HIT: "${route}" — returning instantly.`);
                return NextResponse.json({
                    data,
                    fromCache: true,
                }, { status: 200 });
            }

            // If data is stale, return it but trigger background refresh
            console.log(`[analyze-route] ⚠️ Stale cache HIT: "${route}" — returning stale data.`);

            // Trigger background refresh (fire and forget)
            Promise.resolve().then(async () => {
                try {
                    console.log(`[analyze-route] 🔄 Background refresh started for "${route}"`);
                    const token = (session as any)?.githubAccessToken || process.env.GITHUB_TOKEN || "";
                    await performRouteAnalysis(repoUrl, route, routeIndex, token);
                } catch (err) {
                    console.error(`[analyze-route] Background refresh failed for "${route}":`, err);
                }
            });

            return NextResponse.json({
                data,
                fromCache: true,
                stale: true,
            }, { status: 200 });
        }
        console.log(`[analyze-route] Cache MISS: "${route}" — running LLM.`);
    } else {
        console.log(`[analyze-route] Force-reload: "${route}" — bypassing cache.`);
    }

    // ─── 2. Deduplicate concurrent requests ──────────────────────────────
    // If multiple users request the same route analysis simultaneously,
    // only one LLM call is made
    const token = (session as any)?.githubAccessToken || process.env.GITHUB_TOKEN || "";
    return await requestDeduplicator.deduplicate(
        `analyze-route:${repoUrl}:${route}`,
        async () => performRouteAnalysis(repoUrl, route, routeIndex, token)
    );
}

/**
 * Performs the actual route analysis work - extracted to allow background refresh
 */
async function performRouteAnalysis(
    repoUrl: string,
    route: string,
    routeIndex: number,
    githubToken: string
): Promise<NextResponse> {
    try {
        await connectDB();
        // ─── Load repo data from RepositoryAnalysis ──────────────────────────
        const repoDoc = await RepositoryAnalysis.findOne({ repoUrl }).lean() as any;
        if (!repoDoc) {
            return NextResponse.json({
                error: "Repository not analyzed yet. Run the general analysis first."
            }, { status: 404 });
        }

        // Build file path list
        let filePaths: string[] = [];
        if (repoDoc.fileTree) {
            try {
                const tree = JSON.parse(repoDoc.fileTree);
                filePaths = tree.map((t: any) => t.path);
            } catch { /* ignore */ }
        }
        if (filePaths.length === 0) {
            filePaths = (repoDoc.keyFileContents as any[]).map((f: any) => f.path);
        }

        // ── Step A: Identify relevant files ──
        const relevantPaths = await withRateLimitRetry(() =>
            identifyRelevantFilesForRoute(route, filePaths)
        );

        // ── Step B: Fetch full source from GitHub ─────────────────────────────
        let codebaseStr = "";
        let fullFiles: any[] = [];

        if (relevantPaths.length > 0) {
            fullFiles = await getSpecificFiles(repoDoc.owner, repoDoc.repoName, relevantPaths, githubToken);
            codebaseStr = fullFiles.map((f: any) => {
                const lines = f.content.split("\n")
                    .map((line: string, i: number) => `${i + 1}| ${line}`)
                    .join("\n");
                return `\n\n=== FULL FILE: ${f.path} ===\n${lines}`;
            }).join("");
        }

        // ── Step C: Fallback to cached key files if GitHub fetch failed ───────
        if (!codebaseStr.trim()) {
            const keyFiles = repoDoc.keyFileContents as { path: string; content: string }[];
            codebaseStr = keyFiles.map(f => {
                const lines = f.content.split("\n")
                    .map((line, i) => `${i + 1}| ${line}`)
                    .join("\n");
                return `\n\n=== CACHED FILE: ${f.path} ===\n${lines}`;
            }).join("");
            fullFiles = keyFiles;
        }

        // ── Step D: Deep analysis ───────
        const result = await withRateLimitRetry(() =>
            analyzeSpecificRoute(route, codebaseStr)
        );

        // ── Step E: Resolve <<<FILE:path:start-end>>> tags to real code ────────
        if (result.executionTrace && typeof result.executionTrace === "string") {
            result.executionTrace = result.executionTrace.replace(
                /`?<+FILE:(.*?):(\d+)(?:-(\d+))?>+`?/g,
                (_match, filePath, startLine, endLine) => {
                    const file =
                        fullFiles.find((f: any) => f.path === filePath) ||
                        (repoDoc.keyFileContents as any[]).find((f: any) => f.path === filePath);
                    if (!file) {
                        return `\`\`\`plaintext\n// File not found: ${filePath}\n\`\`\``;
                    }
                    const start = Math.max(0, parseInt(startLine, 10) - 1);
                    const end = endLine ? parseInt(endLine, 10) : start + 30;
                    const snippet = file.content.split("\n").slice(start, end).join("\n");

                    let lang = "typescript";
                    if (filePath.endsWith(".py")) lang = "python";
                    else if (filePath.endsWith(".go")) lang = "go";
                    else if (filePath.endsWith(".js") || filePath.endsWith(".jsx")) lang = "javascript";
                    else if (filePath.endsWith(".rs")) lang = "rust";
                    else if (filePath.endsWith(".java")) lang = "java";

                    return `\`\`\`${lang}\n${snippet}\n\`\`\``;
                }
            );
        }

        // ── Step F: Save to RouteCache (upsert — works even on repeat analysis) ─
        const finalTrace = typeof result.executionTrace === "string"
            ? result.executionTrace
            : (result.executionTrace as string[]).join("\n\n");

        await RouteCache.findOneAndUpdate(
            { repoUrl, route },                        // lookup key
            {
                repoUrl,
                route,
                flowVisualization: result.flowVisualization,
                executionTrace: finalTrace,
                cachedAt: new Date(),
            },
            { upsert: true, new: true }               // insert if not exists, else update
        );

        console.log(`[analyze-route] ✅ Saved "${route}" to RouteCache for future instant retrieval.`);
        return NextResponse.json({ data: result, fromCache: false }, { status: 200 });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const name = err instanceof Error ? err.name : "";

        // Groq daily token limit exhausted → show subscription gate, not error
        if (
            err instanceof RateLimitExhaustedError ||
            name === "RateLimitExhaustedError" ||
            message.includes("429") ||
            message.includes("RateLimitExhausted") ||
            message.includes("rate_limit_exceeded") ||
            message.includes("Limit 12000, Requested")
        ) {
            console.warn("[analyze-route] 🔒 Token limit exhausted — returning rateLimitExceeded (402).");
            return NextResponse.json({ rateLimitExceeded: true }, { status: 402 });
        }

        console.error("[analyze-route] Error:", err);
        return NextResponse.json({ error: `Route analysis failed: ${message}` }, { status: 500 });
    }
}
