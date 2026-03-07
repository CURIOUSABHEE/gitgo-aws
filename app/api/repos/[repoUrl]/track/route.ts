/**
 * Individual Repository Tracking API
 * 
 * GET /api/repos/[repoUrl]/track - Get tracking info for a specific repo
 * DELETE /api/repos/[repoUrl]/track - Reset tracking for a specific repo
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { RepositoryAnalysis } from "@/models/RepositoryAnalysis";
import { RepoTracker } from "@/lib/repo-tracker";

interface RouteContext {
    params: {
        repoUrl: string;
    };
}

export async function GET(
    req: NextRequest,
    context: RouteContext
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const repoUrl = decodeURIComponent(context.params.repoUrl);
        
        await connectDB();
        const repo = await RepositoryAnalysis.findOne({ repoUrl })
            .select("repoUrl owner repoName viewCount uniqueViewCount lastViewedAt isCached cacheReason cachePriority viewHistory")
            .lean();

        if (!repo) {
            return NextResponse.json(
                { error: "Repository not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ repo });
    } catch (err) {
        console.error("[/api/repos/track] GET Error:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json(
            { error: `Failed to get tracking info: ${message}` },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    context: RouteContext
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const repoUrl = decodeURIComponent(context.params.repoUrl);
        
        const success = await RepoTracker.resetRepoTracking(repoUrl);

        if (!success) {
            return NextResponse.json(
                { error: "Repository not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Repository tracking reset successfully",
        });
    } catch (err) {
        console.error("[/api/repos/track] DELETE Error:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json(
            { error: `Failed to reset tracking: ${message}` },
            { status: 500 }
        );
    }
}
