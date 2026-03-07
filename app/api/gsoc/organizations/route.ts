import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import GsocOrganizations from "@/models/GsocOrganizations"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const year = searchParams.get("year") || "2026"

    console.log(`[GSoC] Fetching organizations for year ${year}...`)

    // Connect to MongoDB
    await connectDB()

    // Check if we have cached data that hasn't expired
    const cached = await GsocOrganizations.findOne({
      year: parseInt(year),
      expiresAt: { $gt: new Date() },
    })

    if (cached) {
      console.log(`[GSoC] Returning cached data from ${cached.fetchedAt}`)
      console.log(`[GSoC] Cache expires at ${cached.expiresAt}`)
      return NextResponse.json({
        organizations: cached.organizations,
        cached: true,
        fetchedAt: cached.fetchedAt,
        expiresAt: cached.expiresAt,
      })
    }

    console.log(`[GSoC] No valid cache found, fetching from API...`)
    
    // Try the direct API endpoint
    try {
      const apiUrl = `https://api.gsocorganizations.dev/${year}.json`
      console.log(`[GSoC] Trying API: ${apiUrl}`)
      
      const apiResponse = await fetch(apiUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })
      
      if (apiResponse.ok) {
        const data = await apiResponse.json()
        console.log(`[GSoC] API response type:`, typeof data, Array.isArray(data))
        console.log(`[GSoC] API response keys:`, Object.keys(data).slice(0, 10))
        
        // Handle different response formats
        let orgsArray = []
        if (Array.isArray(data)) {
          orgsArray = data
        } else if (data.organizations && Array.isArray(data.organizations)) {
          orgsArray = data.organizations
        } else if (typeof data === 'object') {
          // If it's an object with org names as keys
          orgsArray = Object.values(data)
        }
        
        console.log(`[GSoC] Found ${orgsArray.length} organizations`)
        
        // Transform the data to match our interface
        const organizations = orgsArray.map((org: any) => {
          // Ensure technologies is always an array
          let technologies = []
          if (Array.isArray(org.technologies)) {
            technologies = org.technologies
          } else if (Array.isArray(org.tech)) {
            technologies = org.tech
          } else if (Array.isArray(org.technology_tags)) {
            technologies = org.technology_tags
          } else if (typeof org.technologies === 'string') {
            technologies = org.technologies.split(',').map((t: string) => t.trim())
          }

          // Ensure topics is always an array
          let topics = []
          if (Array.isArray(org.topics)) {
            topics = org.topics
          } else if (Array.isArray(org.tags)) {
            topics = org.tags
          } else if (Array.isArray(org.topic_tags)) {
            topics = org.topic_tags
          } else if (typeof org.topics === 'string') {
            topics = org.topics.split(',').map((t: string) => t.trim())
          }

          // Determine category
          let category = "Other"
          if (org.category) {
            category = org.category
          } else if (org.primary_open_source_license) {
            category = "Other"
          } else if (technologies.length > 0) {
            // Try to infer category from technologies
            const techStr = technologies.join(' ').toLowerCase()
            if (techStr.includes('tensorflow') || techStr.includes('pytorch') || techStr.includes('ml') || techStr.includes('ai')) {
              category = "Artificial Intelligence"
            } else if (techStr.includes('database') || techStr.includes('sql') || techStr.includes('postgres') || techStr.includes('mysql') || techStr.includes('mongodb')) {
              category = "Data"
            } else if (techStr.includes('git') || techStr.includes('jenkins') || techStr.includes('ci') || techStr.includes('testing')) {
              category = "Development tools"
            } else if (techStr.includes('gnome') || techStr.includes('kde') || techStr.includes('desktop') || techStr.includes('gtk') || techStr.includes('qt')) {
              category = "End user applications"
            } else if (techStr.includes('kubernetes') || techStr.includes('docker') || techStr.includes('cloud') || techStr.includes('devops')) {
              category = "Infrastructure and cloud"
            } else if (techStr.includes('linux') || techStr.includes('kernel') || techStr.includes('operating')) {
              category = "Operating systems"
            } else if (techStr.includes('python') || techStr.includes('java') || techStr.includes('rust') || techStr.includes('javascript')) {
              category = "Programming languages"
            } else if (techStr.includes('numpy') || techStr.includes('scipy') || techStr.includes('scientific') || techStr.includes('medicine')) {
              category = "Science and medicine"
            } else if (techStr.includes('wiki') || techStr.includes('social') || techStr.includes('communication')) {
              category = "Social and communication"
            } else if (techStr.includes('web') || techStr.includes('react') || techStr.includes('django') || techStr.includes('html')) {
              category = "Web"
            }
          }

          return {
            name: org.name || org.organization_name || "Unknown Organization",
            description: org.description || org.tagline || org.short_description || "No description available",
            technologies: technologies.filter(Boolean),
            category: category,
            url: org.url || org.website || org.organization_url || "",
            ideas_list: org.ideas_list || org.ideas_page || org.ideas_url || "",
            contact_email: org.contact_email || org.email || "",
            irc_channel: org.irc_channel || "",
            topics: topics.filter(Boolean),
            year: parseInt(year),
          }
        }).filter((org: any) => org.name !== "Unknown Organization") // Filter out invalid orgs
        
        console.log(`[GSoC] Transformed ${organizations.length} valid organizations`)
        console.log(`[GSoC] Sample org:`, organizations[0])
        
        // Cache the results for 6 months
        const now = new Date()
        const expiresAt = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000) // 6 months
        
        await GsocOrganizations.findOneAndUpdate(
          { year: parseInt(year) },
          {
            year: parseInt(year),
            organizations,
            fetchedAt: now,
            expiresAt,
          },
          { upsert: true, new: true }
        )
        
        console.log(`[GSoC] Cached ${organizations.length} organizations until ${expiresAt}`)
        
        return NextResponse.json({
          organizations,
          cached: false,
          fetchedAt: now,
          expiresAt,
        })
      }
    } catch (apiError) {
      console.error("[GSoC] API endpoint failed:", apiError)
    }

    // Fallback: Return empty array (frontend will use fallback data)
    console.log("[GSoC] All methods failed, returning empty array")
    return NextResponse.json({ organizations: [], cached: false })
  } catch (error) {
    console.error("[GSoC] Error fetching organizations:", error)
    return NextResponse.json(
      { error: "Failed to fetch GSoC organizations", organizations: [], cached: false },
      { status: 500 }
    )
  }
}

