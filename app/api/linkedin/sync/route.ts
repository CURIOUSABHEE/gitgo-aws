/**
 * LinkedIn Sync API
 * 
 * POST /api/linkedin/sync
 * Syncs LinkedIn profile data to MongoDB
 */

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import { LinkedInAPI, isLinkedInTokenExpired, refreshLinkedInToken } from "@/lib/linkedin"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.githubId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      )
    }

    await connectDB()

    // Find user
    const user = await User.findOne({ githubId: session.user.githubId })
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if LinkedIn is connected
    if (!user.linkedinId || !user.linkedinAccessToken) {
      return NextResponse.json(
        { error: "LinkedIn not connected. Please connect your LinkedIn account first." },
        { status: 400 }
      )
    }

    // Check if token is expired and refresh if needed
    let accessToken = user.linkedinAccessToken
    
    if (isLinkedInTokenExpired(user.linkedinTokenExpiry)) {
      if (!user.linkedinRefreshToken) {
        return NextResponse.json(
          { error: "LinkedIn token expired. Please reconnect your LinkedIn account." },
          { status: 401 }
        )
      }

      try {
        const refreshed = await refreshLinkedInToken(user.linkedinRefreshToken)
        accessToken = refreshed.accessToken
        
        // Update token in database
        user.linkedinAccessToken = refreshed.accessToken
        user.linkedinTokenExpiry = new Date(Date.now() + refreshed.expiresIn * 1000)
        await user.save()
      } catch (error) {
        return NextResponse.json(
          { error: "Failed to refresh LinkedIn token. Please reconnect your account." },
          { status: 401 }
        )
      }
    }

    // Fetch LinkedIn data
    const linkedinAPI = new LinkedInAPI(accessToken)
    
    const [profile, experience, education, skills] = await Promise.all([
      linkedinAPI.getProfile(),
      linkedinAPI.getExperience(),
      linkedinAPI.getEducation(),
      linkedinAPI.getSkills(),
    ])

    // Update user with LinkedIn data
    user.linkedinProfile = {
      headline: profile.headline,
      summary: profile.summary,
      industry: profile.industry,
      profilePicture: profile.profilePicture,
    }
    
    user.linkedinExperience = experience.map(exp => ({
      company: exp.company,
      title: exp.title,
      startDate: exp.startDate,
      endDate: exp.endDate,
      description: exp.description,
      location: exp.location,
      current: exp.current,
    }))
    
    user.linkedinEducation = education.map(edu => ({
      school: edu.school,
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy,
      startDate: edu.startDate,
      endDate: edu.endDate,
      description: edu.description,
    }))
    
    user.linkedinSkills = skills
    user.linkedinLastSynced = new Date()

    // Optionally update user's main profile fields if they're empty
    if (!user.name && profile.firstName && profile.lastName) {
      user.name = `${profile.firstName} ${profile.lastName}`
    }
    
    if (!user.email && profile.email) {
      user.email = profile.email
    }

    await user.save()

    return NextResponse.json({
      success: true,
      message: "LinkedIn data synced successfully",
      data: {
        profile: user.linkedinProfile,
        experience: user.linkedinExperience,
        education: user.linkedinEducation,
        skills: user.linkedinSkills,
        lastSynced: user.linkedinLastSynced,
      },
    })
  } catch (error) {
    console.error("LinkedIn sync error:", error)
    return NextResponse.json(
      { error: "Failed to sync LinkedIn data" },
      { status: 500 }
    )
  }
}

// Force dynamic rendering
export const dynamic = "force-dynamic"
