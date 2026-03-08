/**
 * Repository Analytics API
 * 
 * GET /api/repos/analytics - Get overall repository analytics
 * GET /api/repos/analytics?type=popular - Get popular repositories
 * GET /api/repos/analytics?type=cached - Get cached repositories
 * GET /api/repos/analytics?type=recent&userId=xxx - Get user's recent repos
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { RepoTracker } from "@/lib/repo-tracker";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "overview";
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    try {
        switch (type) {
            case "overview": {
                const analytics = await RepoTracker.getAnalytics();
                return NextResponse.json({ analytics });
            }

            case "popular": {
                const repos = await RepoTracker.getPopularRepos(limit);
                return NextResponse.json({ repos });
            }

            case "cached": {
                const repos = await RepoTracker.getCachedRepos(limit);
                return NextResponse.json({ repos });
            }

            case "recent": {
                const userId = session.user.id || session.user.email || "anonymous";
                const repos = await RepoTracker.getUserRecentRepos(userId, limit);
                return NextResponse.json({ repos });
            }

            default:
                return NextResponse.json(
                    { error: "Invalid type. Use: overview, popular, cached, or recent" },
                    { status: 400 }
                );
        }
    } catch (err) {
        console.error("[/api/repos/analytics] Error:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json(
            { error: `Analytics failed: ${message}` },
            { status: 500 }
        );
    }
}

// POST: Evict low-priority cached repositories
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { action, keepCount = 100 } = body;

        if (action === "evict") {
            const evictedCount = await RepoTracker.evictLowPriorityCache(keepCount);
            return NextResponse.json({
                success: true,
                evictedCount,
                message: `Evicted ${evictedCount} low-priority cached repositories`,
            });
        }

        return NextResponse.json(
            { error: "Invalid action. Use: evict" },
            { status: 400 }
        );
    } catch (err) {
        console.error("[/api/repos/analytics] POST Error:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json(
            { error: `Operation failed: ${message}` },
            { status: 500 }
        );
    }
}
