import { NextRequest } from "next/server"

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import Repository from "@/models/Repository"
import Recommendation from "@/models/Recommendation"
import { analyzeProfileForDomains, generateExpertCuratedRepos, UserDomainProfile } from "@/lib/llm"
import { getRepoMetadata, fetchPublicGitHubProfile, fetchRepoReadme, fetchRepoContributing } from "@/lib/github"
import { UserService } from "@/lib/services/user-service"
import { RecommendationRepository } from "@/lib/db/RecommendationRepository"

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Builds valid GitHub repository search strings from domain analysis output.
 * SAFE: only uses language:, topic:, stars:>, pushed:>, is:unarchived — no label: (invalid for repos)
 */
function buildSearchQueries(domain: {
    primaryLanguage: string
    frameworks: string[]
    minStars: number
}, experienceLevel: "none" | "small" | "good" | "frequent"): string[] {
    const lang = domain.primaryLanguage
    const minStars = Math.max(domain.minStars || 100, 100)
    const pushed = "2024-06-01"

    // Dynamically adjust issue label filter based on experience
    const issueFilter = (experienceLevel === "none" || experienceLevel === "small")
        ? "good-first-issues:>0"
        : "help-wanted-issues:>0"

    const base = `is:unarchived pushed:>${pushed} ${issueFilter}`
    const queries: string[] = []

    if (domain.frameworks[0]) {
        queries.push(`language:${lang} topic:${domain.frameworks[0]} stars:>${minStars} ${base}`)
    }
    if (domain.frameworks[1]) {
        queries.push(`language:${lang} topic:${domain.frameworks[1]} stars:>${minStars} ${base}`)
    }
    if (domain.frameworks[2]) {
        queries.push(`language:${lang} topic:${domain.frameworks[2]} stars:>${minStars} ${base}`)
    }

    // ALWAYS include a fallback query for the raw language to guarantee we don't drop the domain entirely 
    // if the specific topics are too restrictive.
    queries.push(`language:${lang} stars:>${Math.max(Math.floor(minStars / 2), 50)} ${base}`)

    // De-dupe and slice to max 4 queries to run per domain
    return Array.from(new Set(queries)).slice(0, 4)
}

function extractUsername(input: string): string {
    try {
        const url = new URL(input)
        const parts = url.pathname.split("/").filter(Boolean)
        return parts[0] || input.trim()
    } catch {
        return input.trim().replace("@", "")
    }
}

// Encode a single SSE data line
function sseChunk(data: object): Uint8Array {
    return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function POST(req: NextRequest) {
    const body = await req.json()
    const { testGithubUrl, regenerate } = body

    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => controller.enqueue(sseChunk(data))
            const closeWithError = async (msg: string) => {
                send({ type: "error", error: msg })
                await sleep(100)
                try { controller.close() } catch { /* ignore */ }
            }

            try {
                // Note: AWS Amplify handles Lambda execution automatically
                // No need for manual API Gateway forwarding

                const session = await getServerSession(authOptions)
                // In test mode, we might not need a strict matching githubId if we are just testing
                if (!session?.user?.githubId && !testGithubUrl) {
                    await closeWithError("Unauthorized")
                    return
                }

                await connectDB()

                // Fallback to process.env.GITHUB_TOKEN if session token isn't available
                const token = (session as any)?.accessToken || process.env.GITHUB_TOKEN
                if (!token) {
                    await closeWithError("No GitHub token available. Please set GITHUB_TOKEN in your environment variables.")
                    return
                }

                let userProfile: {
                    name?: string
                    languages: string[]
                    skills: string[]
                    techStack: string[]
                    repos: any[]
                    resume?: any
                    hasOSContributions: boolean
                    isTestProfile?: boolean
                    testUsername?: string
                }

                let user: any = null

                // ─── PATH A: Test Mode — fetch any public GitHub profile ──────────────
                if (testGithubUrl && testGithubUrl.trim()) {
                    const username = extractUsername(testGithubUrl)
                    try {
                        const publicProfile = await fetchPublicGitHubProfile(username, token as string)
                        userProfile = {
                            name: publicProfile.name,
                            languages: publicProfile.languages,
                            skills: publicProfile.skills,
                            techStack: publicProfile.techStack,
                            repos: publicProfile.repos,
                            resume: undefined,
                            hasOSContributions: publicProfile.repos.some(r => r.fork),
                            isTestProfile: true,
                            testUsername: username
                        }
                    } catch (err: any) {
                        await closeWithError(`Could not fetch GitHub profile for "${extractUsername(testGithubUrl)}": ${err.message}`)
                        return
                    }
                }
                // ─── PATH B: Logged-in User — pull from MongoDB ───────────────────────
                else {
                    if (!session?.user?.githubId) {
                        await closeWithError("Unauthorized: You must be logged in to view your profile matches.")
                        return
                    }
                    user = await User.findOne({ githubId: String(session.user.githubId) }).lean()
                    if (!user) {
                        await closeWithError("User not found")
                        return
                    }

                    let allUserRepos = await Repository.find(
                        { userId: user._id },
                        { name: 1, description: 1, language: 1, topics: 1, fork: 1, html_url: 1, full_name: 1 }
                    ).limit(30).lean()

                    // Auto-sync if data is missing
                    if ((!user.languages || user.languages.length === 0) || allUserRepos.length === 0) {
                        console.log(`[Recommendations] Auto-syncing GitHub data for "${user.name || user.login}"...`)
                        try {
                            await UserService.invalidateUserCache(user.githubId)
                            const updatedUser = await UserService.syncUserFromGitHub(token as string, user.githubId)
                            await UserService.syncRepositories(token as string, updatedUser._id.toString(), user.githubId)

                            // Re-fetch
                            user = await User.findOne({ githubId: String(session.user.githubId) }).lean()
                            if (!user) {
                                await closeWithError("User not found after sync")
                                return
                            }
                            allUserRepos = await Repository.find(
                                { userId: user._id },
                                { name: 1, description: 1, language: 1, topics: 1, fork: 1, html_url: 1, full_name: 1 }
                            ).limit(30).lean()
                        } catch (syncErr: any) {
                            console.error("[Recommendations] Auto-sync failed:", syncErr)
                        }
                    }

                    if (!user) return

                    userProfile = {
                        name: user.name,
                        languages: user.languages || [],
                        skills: user.skills || [],
                        techStack: user.techStack || [],
                        repos: allUserRepos,
                        resume: {
                            careerObjective: user.resumeCareerObjective,
                            skillGroups: user.resumeSkillGroups,
                            experience: user.resumeExperience,
                            projects: user.resumeProjects
                        },
                        hasOSContributions: allUserRepos.some(r => r.fork)
                    }
                }

                // ─── Phase 1: LLM Profile Analysis → structured domain objects ────────
                send({ type: "phase", phase: "analyzing" })
                console.log(`[Recommendations] Phase 1: Analyzing profile for "${userProfile.name}"...`)

                // Fetch READMEs for top 2 repos to enhance analysis context
                const topReposToFetch = userProfile.repos.filter((r: any) => !r.fork).slice(0, 2)
                for (const r of topReposToFetch) {
                    const fullName = r.full_name
                    if (fullName) {
                        const [owner, name] = fullName.split("/")
                        try {
                            const readme = await fetchRepoReadme(owner, name, token as string)
                            if (readme) {
                                r.readme = readme.slice(0, 1500)
                            }
                        } catch (e) {
                            // ignore
                        }
                    }
                }

                let domainProfile: UserDomainProfile
                try {
                    domainProfile = await analyzeProfileForDomains(userProfile)
                } catch (err) {
                    console.error("[Recommendations] Phase 1 failed:", err)
                    await closeWithError("Profile analysis failed. Try again.")
                    return
                }

                console.log(`[Recommendations] Level: ${domainProfile.experienceLevel}, Domains: ${domainProfile.domains.map(d => d.label).join(" | ")}`)

                // ─── Phase 2: LLM Curates Repositories ───
                send({ type: "phase", phase: "github" })
                console.log(`[Recommendations] Phase 2: LLM Curating Repositories...`)

                let categories: any[] = []
                try {
                    categories = await generateExpertCuratedRepos(domainProfile)
                } catch (err) {
                    console.error("[Recommendations] Phase 2 failed:", err)
                    await closeWithError("Curriculum generation failed. Please try again.")
                    return
                }

                if (!categories || categories.length === 0) {
                    await closeWithError("Failed to generate curriculum. Please try again.")
                    return
                }

                // ─── Phase 3: Hydrate Live GitHub Metadata ───
                send({ type: "phase", phase: "personalizing" })
                console.log("[Recommendations] Phase 3: Hydrating with live GitHub data...")

                const finalCategories: any[] = []
                for (const category of categories) {
                    const hydratedRepos: any[] = []
                    for (const repo of category.repos) {
                        try {
                            if (!repo.full_name || !repo.full_name.includes('/')) continue;
                            const [owner, name] = repo.full_name.split('/')

                            // Fetch real metadata to verify the repo exists and get live stats
                            const meta = await getRepoMetadata(owner, name, token as string)

                            hydratedRepos.push({
                                ...repo,
                                name: meta.name || name,
                                html_url: meta.html_url || `https://github.com/${repo.full_name}`,
                                description: meta.description || repo.description || "",
                                stars: meta.stargazers_count || repo.stars || 0,
                                language: meta.language || repo.language || "",
                                topics: meta.topics || repo.topics || []
                            })
                        } catch (err) {
                            console.warn(`[Recommendations] Could not hydrate repo ${repo.full_name}, skipping...`)
                            // Drop repo if it 404s to ensure we only recommend real alive repos
                        }
                    }
                    if (hydratedRepos.length > 0) {
                        finalCategories.push({
                            ...category,
                            repos: hydratedRepos
                        })
                    }
                }

                if (finalCategories.length === 0) {
                    await closeWithError("All recommended repositories failed validation. Please try again.")
                    return
                }

                // ─── Save to Database (Dual Mode: MongoDB or DynamoDB) ──────────────
                try {
                    await RecommendationRepository.save({
                        userId: userProfile.isTestProfile ? undefined : (user as any)?._id,
                        githubId: userProfile.isTestProfile ? undefined : Number(session?.user?.githubId),
                        experienceLevel: domainProfile.experienceLevel,
                        hasOSSContributions: domainProfile.hasOpenSourceContributions,
                        contributionNotes: domainProfile.contributionNotes,
                        strengths: domainProfile.strengths || [],
                        weaknesses: domainProfile.weaknesses || [],
                        improvements: domainProfile.improvements || [],
                        categories: finalCategories,
                        isTestProfile: userProfile.isTestProfile || false,
                        testUsername: userProfile.testUsername,
                    })
                    console.log(`[Recommendations] Successfully saved to database`)
                } catch (saveError) {
                    console.error("[Recommendations] Failed to save to database:", saveError)
                }

                // ─── Emit final result ────────────────────────────────────────────────
                send({
                    type: "result",
                    categories: finalCategories,
                    meta: {
                        experienceLevel: domainProfile.experienceLevel,
                        hasOSSContributions: domainProfile.hasOpenSourceContributions,
                        contributionNotes: domainProfile.contributionNotes,
                        strengths: domainProfile.strengths || [],
                        weaknesses: domainProfile.weaknesses || [],
                        improvements: domainProfile.improvements || [],
                        isTestProfile: userProfile.isTestProfile || false,
                        testUsername: userProfile.testUsername,
                        generatedAt: new Date().toISOString()
                    }
                })

            } catch (error: any) {
                console.error("Recommendations Error:", error)
                try {
                    send({ type: "error", error: error.message || "Failed" })
                    await sleep(100)
                } catch { /* stream may already be closed */ }
            } finally {
                try { controller.close() } catch { /* ignore double-close */ }
            }
        }
    })

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    })
}
