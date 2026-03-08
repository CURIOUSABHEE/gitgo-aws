import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Notification from "@/models/Notification"

// GET /api/notifications - Fetch user notifications
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.githubId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const { searchParams } = new URL(req.url)
        const unreadOnly = searchParams.get("unreadOnly") === "true"
        const limit = parseInt(searchParams.get("limit") || "20")

        const query: any = { userId: session.user.githubId }
        if (unreadOnly) {
            query.read = false
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()

        const unreadCount = await Notification.countDocuments({
            userId: session.user.githubId,
            read: false,
        })

        return NextResponse.json({
            success: true,
            notifications,
            unreadCount,
        })
    } catch (error: any) {
        console.error("[Notifications API] Error:", error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.githubId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const body = await req.json()
        const { notificationIds, markAllAsRead } = body

        if (markAllAsRead) {
            await Notification.updateMany(
                { userId: session.user.githubId, read: false },
                { $set: { read: true } }
            )
        } else if (notificationIds && Array.isArray(notificationIds)) {
            await Notification.updateMany(
                { _id: { $in: notificationIds }, userId: session.user.githubId },
                { $set: { read: true } }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("[Notifications API] Error:", error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
