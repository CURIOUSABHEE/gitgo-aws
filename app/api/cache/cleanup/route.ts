/**
 * Cache Cleanup API
 * 
 * DELETE /api/cache/cleanup?olderThan=30
 * 
 * Removes cache entries older than specified days (default: 30 days)
 * Requires authentication
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SmartCache } from "@/lib/smart-cache";

export async function DELETE(req: NextRequest) {
    // Auth check - only authenticated users can trigger cleanup
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const olderThanDays = parseInt(searchParams.get("olderThan") || "30", 10);
    
    if (olderThanDays < 1 || olderThanDays > 365) {
        return NextResponse.json(
            { error: "olderThan must be between 1 and 365 days" },
            { status: 400 }
        );
    }

    try {
        const olderThanMs = olderThanDays * 24 * 60 * 60 * 1000;
        const deletedCount = await SmartCache.cleanupOldEntries(olderThanMs);

        return NextResponse.json({
            success: true,
            deletedCount,
            olderThanDays,
        });
    } catch (err) {
        console.error("[/api/cache/cleanup] Error:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json(
            { error: `Cleanup failed: ${message}` },
            { status: 500 }
        );
    }
}

// GET: Get cache statistics
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const stats = await SmartCache.getStats();
        return NextResponse.json({ stats });
    } catch (err) {
        console.error("[/api/cache/cleanup] Error getting stats:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json(
            { error: `Failed to get stats: ${message}` },
            { status: 500 }
        );
    }
}
