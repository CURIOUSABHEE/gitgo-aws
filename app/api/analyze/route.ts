/**
 * Main analysis orchestration API route.
 *
 * POST /api/analyze
 * Body: { repoUrl: string, forceRefresh?: boolean }
 *
 * Flow:
 * 1. Validate auth session
 * 2. Parse & validate GitHub URL
 * 3. Check MongoDB cache (unless forceRefresh)
 * 4. Fetch all GitHub data in parallel
 * 5. Run LLM analysis (architecture + routes)
 * 6. Save to MongoDB
 * 7. Return full analysis
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { RepositoryAnalysis } from "@/models/RepositoryAnalysis";
import { parseGitHubUrl } from "@/lib/utils";
import {
    getRepoMetadata,
    getCommits,
    getContributors,
    getRepoStatus,
    getTechStack,
    getFileTree,
    getKeyFileContents,
} from "@/lib/github";
import { analyzeArchitecture, analyzeRoutes } from "@/lib/llm";
import { requestDeduplicator } from "@/lib/request-deduplicator";
import { SmartCache } from "@/lib/smart-cache";
import { RepoTracker } from "@/lib/repo-tracker";

export const maxDuration = 300; // Vercel: allow up to 5 minutes for heavy analysis

export async function POST(req: NextRequest) {
    // ── 1. Auth check ──────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    // ── 2. Parse request body ──────────────────────────────────────────
    let body: { repoUrl: string; forceRefresh?: boolean };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { repoUrl, forceRefresh = false } = body;

    if (!repoUrl) {
        return NextResponse.json({ error: "repoUrl is required." }, { status: 400 });
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
        return NextResponse.json(
            { error: "Invalid GitHub URL. Expected format: https://github.com/owner/repo" },
            { status: 400 }
        );
    }

    const { owner, repo } = parsed;

    // ── 3. Connect to DB & check cache with smart caching ──────────────
    await connectDB();

    // Normalize URL (strip trailing slash / .git)
    const normalizedUrl = `https://github.com/${owner}/${repo}`;

    // ── Track repository view ──────────────────────────────────────────
    const userId = session.user.id || session.user.email || "anonymous";
    const userAgent = req.headers.get("user-agent") || undefined;

    try {
        const trackingResult = await RepoTracker.trackView(normalizedUrl, {
            userId,
            userAgent,
        });

        console.log(`[/api/analyze] View tracked: ${normalizedUrl} - Views: ${trackingResult.viewCount}, Cached: ${trackingResult.isCached}`);

        if (trackingResult.cacheDecision) {
            console.log(`[/api/analyze] Cache decision: ${trackingResult.cacheDecision.reason} (Priority: ${trackingResult.cacheDecision.priority})`);
        }
    } catch (trackErr) {
        // Don't fail the request if tracking fails
        console.error("[/api/analyze] Tracking error:", trackErr);
    }

    if (!forceRefresh) {
        // Use SmartCache with stale-while-revalidate pattern
        const cacheResult = await SmartCache.getRepoAnalysis(normalizedUrl, {
            staleWhileRevalidate: true,
        });

        if (cacheResult) {
            const { data, stale } = cacheResult;

            // If data is fresh, return immediately
            if (!stale) {
                console.log(`[/api/analyze] ✅ Fresh cache hit for ${normalizedUrl}`);

                // Compact the cached data to prevent 413 errors
                const compactData = {
                    ...data,
                    commits: Array.isArray(data.commits) ? data.commits.slice(0, 10) : [],
                    contributors: Array.isArray(data.contributors) ? data.contributors.slice(0, 20) : [],
                    fileTree: undefined, // Remove large fields
                    keyFileContents: undefined,
                };

                return NextResponse.json({ cached: true, data: compactData }, { status: 200 });
            }

            // If data is stale, return it but trigger background refresh
            console.log(`[/api/analyze] ⚠️ Stale cache hit for ${normalizedUrl}, returning stale data`);

            // Compact stale data too
            const compactStaleData = {
                ...data,
                commits: Array.isArray(data.commits) ? data.commits.slice(0, 10) : [],
                contributors: Array.isArray(data.contributors) ? data.contributors.slice(0, 20) : [],
                fileTree: undefined,
                keyFileContents: undefined,
            };

            // Trigger background refresh (fire and forget)
            // Note: In production, consider using a queue system for this
            Promise.resolve().then(async () => {
                try {
                    console.log(`[/api/analyze] 🔄 Background refresh started for ${normalizedUrl}`);
                    await performAnalysis(normalizedUrl, owner, repo, session);
                } catch (err) {
                    console.error(`[/api/analyze] Background refresh failed for ${normalizedUrl}:`, err);
                }
            });

            return NextResponse.json({
                cached: true,
                stale: true,
                data: compactStaleData
            }, { status: 200 });
        }
    }

    // ── 4. Deduplicate concurrent requests ─────────────────────────────
    // If multiple users/tabs request the same repo simultaneously,
    // only one analysis runs and all get the same result
    return await requestDeduplicator.deduplicate(
        `analyze:${normalizedUrl}`,
        async () => performAnalysis(normalizedUrl, owner, repo, session)
    );
}

/**
 * Performs the actual analysis work - extracted to allow background refresh
 */
async function performAnalysis(
    normalizedUrl: string,
    owner: string,
    repo: string,
    session: any
): Promise<NextResponse> {
    try {
        const githubToken = (session as any).accessToken || process.env.GITHUB_TOKEN;

        if (!githubToken) {
            return NextResponse.json(
                { error: "GitHub token not found. Please sign in with GitHub." },
                { status: 401 }
            );
        }

        // First fetch metadata, commits, contributors, and repo status
        const [metadata, commits, contributors, repoStatus] = await Promise.all([
            getRepoMetadata(owner, repo, githubToken),
            getCommits(owner, repo, githubToken),
            getContributors(owner, repo, githubToken),
            getRepoStatus(owner, repo, githubToken),
        ]);

        // Then fetch file tree (needs to be separate as it doesn't depend on metadata)
        const fileTree = await getFileTree(owner, repo, githubToken);

        // Now fetch tech stack and key files (both need fileTree)
        const [techStack, keyFileContents] = await Promise.all([
            getTechStack(owner, repo, fileTree, githubToken),
            getKeyFileContents(owner, repo, fileTree, githubToken),
        ]);

        // ── 5. LLM Analysis ──────────────────────────────────────────────
        let architectureResult;
        let routesResult;

        try {
            [architectureResult, routesResult] = await Promise.all([
                analyzeArchitecture(fileTree, techStack, keyFileContents),
                analyzeRoutes(keyFileContents, fileTree, techStack),
            ]);
        } catch (llmError: any) {
            console.error("[/api/analyze] LLM Analysis failed:", llmError);

            // Provide fallback analysis if LLM fails
            architectureResult = {
                overallFlow: "Unable to generate architecture analysis. The repository structure has been saved and can be analyzed later.",
                architectureJson: {
                    nodes: [
                        { id: "repo", label: `${owner}/${repo}`, type: "backend" as const }
                    ],
                    edges: [],
                    notes: ["LLM analysis unavailable. Please check API keys and try again."]
                }
            };

            routesResult = [
                {
                    path: "/",
                    method: "PAGE",
                    functionality: "Repository analysis pending. LLM service unavailable.",
                    contribution: "Main entry point",
                    lifecycleRole: "UI Rendering"
                }
            ];

            // Log the specific error for debugging
            console.error("[/api/analyze] LLM Error Details:", {
                message: llmError.message,
                stack: llmError.stack?.slice(0, 500),
                name: llmError.name
            });
        }

        console.log("TECH STACK PAYLOAD:", JSON.stringify(techStack, null, 2));

        const llmAnalysis = {
            overallFlow: architectureResult.overallFlow,
            architectureJson: architectureResult.architectureJson,
            routes: routesResult,
        };

        // ── 6. Save to MongoDB ────────────────────────────────────────────
        const fileTreeStr = JSON.stringify(fileTree);

        const mappedMetadata = {
            ...metadata,
            stars: metadata.stargazers_count || 0,
            forks: metadata.forks_count || 0,
            language: metadata.language,
            description: metadata.description,
            topics: metadata.topics || []
        };

        const analysisDoc = await RepositoryAnalysis.findOneAndUpdate(
            { repoUrl: normalizedUrl },
            {
                repoUrl: normalizedUrl,
                owner,
                repoName: repo,
                metadata: mappedMetadata,
                commits,
                contributors,
                repoStatus,
                techStack: techStack as unknown as Record<string, unknown>,
                fileTree: fileTreeStr,
                keyFileContents,
                llmAnalysis,
                analyzedAt: new Date(),
                // Preserve tracking fields on update
                $setOnInsert: {
                    viewCount: 0,
                    uniqueViewCount: 0,
                    viewHistory: [],
                    viewedByUsers: [],
                    isCached: false,
                    cachePriority: 0,
                },
            },
            { upsert: true, new: true }
        );

        // ── 7. Return result ──────────────────────────────────────────────
        // Temporarily bypass MongoDB schema for the techStack in the response to test
        const responseData = analysisDoc.toObject ? analysisDoc.toObject() : analysisDoc;
        responseData.techStack = techStack as unknown as Record<string, unknown>;

        // Remove large fields to prevent 413 Payload Too Large errors
        // File tree and key files are stored in DB but not returned in API response
        const compactResponse = {
            _id: responseData._id,
            repoUrl: responseData.repoUrl,
            owner: responseData.owner,
            repoName: responseData.repoName,
            metadata: responseData.metadata,
            commits: Array.isArray(responseData.commits) ? responseData.commits.slice(0, 10) : [], // Only return last 10 commits
            contributors: Array.isArray(responseData.contributors) ? responseData.contributors.slice(0, 20) : [], // Only top 20 contributors
            repoStatus: responseData.repoStatus,
            techStack: responseData.techStack,
            // Don't send fileTree (can be 1-2MB)
            // Don't send keyFileContents (can be 3-5MB)
            llmAnalysis: responseData.llmAnalysis,
            analyzedAt: responseData.analyzedAt,
            viewCount: responseData.viewCount,
        };

        return NextResponse.json({ cached: false, data: compactResponse }, { status: 200 });
    } catch (err: unknown) {
        console.error("[/api/analyze] Error:", err);

        // Enhanced error logging
        if (err && typeof err === 'object') {
            console.error("[/api/analyze] Error details:", {
                message: (err as any).message,
                name: (err as any).name,
                stack: (err as any).stack?.slice(0, 500),
                code: (err as any).code,
                statusCode: (err as any).statusCode,
            });
        }

        // Handle GitHub rate limiting
        if (err && typeof err === "object" && "status" in err) {
            const status = (err as { status: number }).status;
            if (status === 403) {
                return NextResponse.json(
                    { error: "GitHub API rate limit exceeded. Please try again in an hour or add a GITHUB_TOKEN." },
                    { status: 429 }
                );
            }
            if (status === 404) {
                return NextResponse.json(
                    { error: "Repository not found. Is it private? Make sure your GitHub token has repo access." },
                    { status: 404 }
                );
            }
        }

        const message = err instanceof Error ? err.message : "An unknown error occurred.";

        // Handle Bedrock errors
        if (message.includes("bedrock") || message.includes("Bedrock") || message.includes("Access Denied")) {
            console.error("[/api/analyze] 🔒 AWS Bedrock error - check IAM permissions");
            return NextResponse.json({
                error: "AI analysis service unavailable. Please check AWS Bedrock permissions.",
                details: message
            }, { status: 503 });
        }

        return NextResponse.json({
            error: `Analysis failed: ${message}`,
            hint: "Check CloudWatch logs for details"
        }, { status: 500 });
    }
}

// GET: check if a repo has been analyzed (for initial cache check)
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const repoUrl = searchParams.get("repoUrl");
    if (!repoUrl) return NextResponse.json({ cached: false });

    await connectDB();
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) return NextResponse.json({ cached: false });

    const normalizedUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
    const existing = await RepositoryAnalysis.findOne({ repoUrl: normalizedUrl })
        .select("repoUrl analyzedAt owner repoName")
        .lean();

    return NextResponse.json({ cached: !!existing, meta: existing });
}
