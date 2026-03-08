/**
 * GET /api/analyze/files?repoUrl=...
 * 
 * Returns the file tree and key file contents for a repository.
 * This is separated from the main analyze endpoint to avoid 413 errors.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { RepositoryAnalysis } from "@/models/RepositoryAnalysis";
import { parseGitHubUrl } from "@/lib/utils";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const repoUrl = searchParams.get("repoUrl");

    if (!repoUrl) {
        return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
        return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
    }

    await connectDB();
    const normalizedUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;

    const analysis = await RepositoryAnalysis.findOne({ repoUrl: normalizedUrl })
        .select("fileTree keyFileContents")
        .lean();

    if (!analysis) {
        return NextResponse.json({ error: "Repository not analyzed yet" }, { status: 404 });
    }

    // Parse fileTree if it's stored as string
    let fileTree: any = analysis.fileTree;
    if (typeof fileTree === 'string') {
        try {
            fileTree = JSON.parse(fileTree);
        } catch {
            fileTree = [];
        }
    }

    return NextResponse.json({
        fileTree,
        keyFileContents: analysis.keyFileContents || []
    });
}
