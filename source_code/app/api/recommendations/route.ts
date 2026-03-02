import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import Repository from "@/models/Repository"
import { analyzeProfileForDomains, generateStructuredRecommendations, UserDomainProfile } from "@/lib/llm"
import { searchRepositoriesRaw, fetchPublicGitHubProfile } from "@/lib/github"

/**
 * Builds valid GitHub repository search strings from domain analysis output.
 * SAFE: only uses language:, topic:, stars:>, pushed:>, is:unarchived — no label: (invalid for repos)
 */
function buildSearchQueries(domain: {
    primaryLanguage: string
    frameworks: string[]
    minStars: number
}): string[] {
    const lang = domain.primaryLanguage
    const minStars = Math.max(domain.minStars || 300, 100)
    const pushed = "2023-01-01"
    const base = `is:unarchived pushed:>${pushed}`
    const queries: string[] = []

    if (domain.frameworks.length > 0) {
        queries.push(`language:${lang} topic:${domain.frameworks[0]} stars:>${minStars} ${base}`)
    }
    if (domain.frameworks.length > 1) {
        queries.push(`language:${lang} topic:${domain.frameworks[1]} stars:>${minStars} ${base}`)
    } else {
        queries.push(`language:${lang} stars:>${minStars} ${base}`)
    }
    if (domain.frameworks.length > 2) {
        queries.push(`language:${lang} topic:${domain.frameworks[2]} stars:>${minStars} ${base}`)
    } else {
        queries.push(`language:${lang} stars:>${Math.max(Math.floor(minStars / 2), 50)} ${base}`)
    }

    return queries.filter(Boolean).slice(0, 3)
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
    const { testGithubUrl } = body

    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => controller.enqueue(sseChunk(data))

            try {
                const session = await getServerSession(authOptions)
                if (!session?.user?.githubId) {
                    send({ type: "error", error: "Unauthorized" })
                    controller.close()
                    return
                }

                await connectDB()
                const token = (session as any).accessToken || process.env.GITHUB_TOKEN

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
                        send({ type: "error", error: `Could not fetch GitHub profile for "${extractUsername(testGithubUrl)}": ${err.message}` })
                        controller.close()
                        return
                    }
                }
                // ─── PATH B: Logged-in User — pull from MongoDB ───────────────────────
                else {
                    const user = await User.findOne({ githubId: String(session.user.githubId) }).lean()
                    if (!user) {
                        send({ type: "error", error: "User not found" })
                        controller.close()
                        return
                    }

                    const allUserRepos = await Repository.find(
                        { userId: user._id },
                        { name: 1, description: 1, language: 1, topics: 1, fork: 1, html_url: 1, full_name: 1 }
                    ).limit(30).lean()

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

                let domainProfile: UserDomainProfile
                try {
                    domainProfile = await analyzeProfileForDomains(userProfile)
                } catch (err) {
                    console.error("[Recommendations] Phase 1 failed:", err)
                    send({ type: "error", error: "Profile analysis failed. Try again." })
                    controller.close()
                    return
                }

                console.log(`[Recommendations] Level: ${domainProfile.experienceLevel}, Domains: ${domainProfile.domains.map(d => d.label).join(" | ")}`)

                // ─── Phase 2: Backend builds safe GitHub queries from domain objects ───
                send({ type: "phase", phase: "github" })
                const fetchedReposByDomain: Array<{ domain: string; label: string; repos: any[] }> = []

                for (const domain of domainProfile.domains) {
                    const queries = buildSearchQueries({
                        primaryLanguage: domain.primaryLanguage,
                        frameworks: domain.frameworks,
                        minStars: domain.minStars
                    })

                    const domainRepos: any[] = []
                    for (const query of queries) {
                        try {
                            console.log(`[Recommendations] Search: ${query}`)
                            const results = await searchRepositoriesRaw(query, token as string, 12)
                            domainRepos.push(...results)
                        } catch (err: any) {
                            console.error(`[Recommendations] Search failed: ${query}`, err?.message)
                        }
                    }

                    // Deduplicate
                    const seen = new Set<string>()
                    const unique = domainRepos.filter(r => {
                        const key = r.full_name || r.name
                        if (!key || seen.has(key)) return false
                        seen.add(key)
                        return true
                    })

                    // Post-filter: drop archived repos or those with very few open issues
                    const alive = unique.filter(r => !r.archived && (r.open_issues_count ?? 0) >= 5)
                    // Sort by open_issues_count descending (most active first)
                    const sorted = alive.sort((a, b) => (b.open_issues_count ?? 0) - (a.open_issues_count ?? 0))

                    fetchedReposByDomain.push({ domain: domain.domainKey, label: domain.label, repos: sorted })
                    console.log(`[Recommendations] "${domain.label}": ${sorted.length} repos after filtering`)
                }

                const totalFound = fetchedReposByDomain.reduce((s, d) => s + d.repos.length, 0)
                if (totalFound === 0) {
                    send({ type: "error", error: "No repositories found. Please check your GITHUB_TOKEN permissions." })
                    controller.close()
                    return
                }

                // ─── Phase 3: LLM Personalizer — references actual project names ───────
                send({ type: "phase", phase: "personalizing" })
                console.log("[Recommendations] Phase 3: Personalizing...")

                const categories = await generateStructuredRecommendations(userProfile, fetchedReposByDomain, domainProfile)

                // Fallback: raw repos with level-aware messages if LLM JSON fails
                const level = domainProfile.experienceLevel
                const finalCategories = categories.length > 0
                    ? categories
                    : fetchedReposByDomain.map(d => ({
                        domain: d.domain,
                        label: d.label,
                        repos: d.repos.slice(0, 10).map(r => ({
                            name: r.name,
                            full_name: r.full_name,
                            html_url: r.html_url || `https://github.com/${r.full_name}`,
                            description: r.description || "",
                            stars: r.stargazers_count || 0,
                            language: r.language || "",
                            topics: r.topics || [],
                            whyItFits: level === "beginner"
                                ? `Great starter repo! As a ${level} developer in ${d.label}, this active project has many small issues perfect for a first contribution.`
                                : level === "advanced"
                                    ? `As an advanced developer, this high-star ${d.label} project has architecture-level challenges matching your experience.`
                                    : `Your background in ${d.label} makes you a strong candidate to contribute to this well-maintained project.`,
                            whereToStart: "Go to Issues tab → filter by label 'good first issue' or 'help wanted' → sort by 'Most commented' for easier entry points."
                        }))
                    }))

                // ─── Emit final result ────────────────────────────────────────────────
                send({
                    type: "result",
                    categories: finalCategories,
                    meta: {
                        experienceLevel: domainProfile.experienceLevel,
                        hasOSSContributions: domainProfile.hasOpenSourceContributions,
                        contributionNotes: domainProfile.contributionNotes,
                        isTestProfile: userProfile.isTestProfile || false,
                        testUsername: userProfile.testUsername,
                        generatedAt: new Date().toISOString()
                    }
                })

            } catch (error: any) {
                console.error("Recommendations Error:", error)
                try {
                    controller.enqueue(sseChunk({ type: "error", error: error.message || "Failed" }))
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
