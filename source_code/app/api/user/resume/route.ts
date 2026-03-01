import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import { parseResume } from "@/lib/resume-parser"

// POST /api/user/resume - Upload and parse a PDF resume
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.githubId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const formData = await request.formData()
        const file = formData.get("resume") as File | null

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        if (file.type !== "application/pdf") {
            return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 })
        }

        // 5MB limit
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 })
        }

        // Read file buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Parse the resume
        const parsed = await parseResume(buffer)

        // Try to match parsed projects against user's GitHub repos
        try {
            const { default: Repository } = await import("@/models/Repository")
            const repos = await Repository.find(
                { userId: session.user.githubId },
                { name: 1, html_url: 1 }
            ).lean()

            if (repos && repos.length > 0) {
                const normalize = (s: string) =>
                    s.toLowerCase().replace(/[^a-z0-9]/g, "")

                for (const project of parsed.projects) {
                    // Skip if already has a real URL
                    if (project.githubUrl && project.githubUrl.startsWith("http")) continue

                    const projNorm = normalize(project.name)
                    // Find matching repo by normalized name
                    const match = repos.find((r: any) => {
                        const repoNorm = normalize(r.name)
                        return (
                            repoNorm === projNorm ||
                            repoNorm.includes(projNorm) ||
                            projNorm.includes(repoNorm)
                        )
                    })
                    if (match && (match as any).html_url) {
                        project.githubUrl = (match as any).html_url
                    }
                }
            }
        } catch {
            // Repo matching is optional — don't fail the upload
        }

        // Update user with parsed resume data
        const updatedUser = await User.findOneAndUpdate(
            { githubId: String(session.user.githubId) },
            {
                $set: {
                    resumeFileName: file.name,
                    resumeUploadedAt: new Date(),
                    resumeCareerObjective: parsed.careerObjective,
                    resumeSkillGroups: parsed.skillGroups,
                    resumeExperience: parsed.experience,
                    resumeEducation: parsed.education,
                    resumeProjects: parsed.projects,
                    resumeRawText: parsed.rawText,
                },
            },
            { new: true }
        )

        if (!updatedUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: {
                fileName: updatedUser.resumeFileName,
                uploadedAt: updatedUser.resumeUploadedAt,
                careerObjective: updatedUser.resumeCareerObjective,
                skillGroups: updatedUser.resumeSkillGroups,
                experience: updatedUser.resumeExperience,
                education: updatedUser.resumeEducation,
                projects: updatedUser.resumeProjects,
            },
        })
    } catch (error: any) {
        console.error("Resume upload error:", error?.message || error)
        console.error("Resume upload stack:", error?.stack)
        
        // Return specific error message to help user
        const errorMessage = error?.message || "Failed to process resume"
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.githubId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const user = await User.findOne({ githubId: String(session.user.githubId) },
            {
                resumeFileName: 1,
                resumeUploadedAt: 1,
                resumeCareerObjective: 1,
                resumeSkillGroups: 1,
                resumeExperience: 1,
                resumeEducation: 1,
                resumeProjects: 1,
            }
        )

        if (!user || !user.resumeFileName) {
            return NextResponse.json({ data: null })
        }

        return NextResponse.json({
            data: {
                fileName: user.resumeFileName,
                uploadedAt: user.resumeUploadedAt,
                careerObjective: user.resumeCareerObjective,
                skillGroups: user.resumeSkillGroups,
                experience: user.resumeExperience,
                education: user.resumeEducation,
                projects: user.resumeProjects,
            },
        })
    } catch (error) {
        console.error("Resume fetch error:", error)
        return NextResponse.json({ error: "Failed to fetch resume data" }, { status: 500 })
    }
}

// DELETE /api/user/resume - Remove resume data
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.githubId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        await User.findOneAndUpdate(
            { githubId: String(session.user.githubId) },
            {
                $unset: {
                    resumeFileName: "",
                    resumeUploadedAt: "",
                    resumeCareerObjective: "",
                    resumeSkillGroups: "",
                    resumeExperience: "",
                    resumeEducation: "",
                    resumeProjects: "",
                    resumeRawText: "",
                },
            }
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Resume delete error:", error)
        return NextResponse.json({ error: "Failed to delete resume data" }, { status: 500 })
    }
}

export const dynamic = "force-dynamic"
