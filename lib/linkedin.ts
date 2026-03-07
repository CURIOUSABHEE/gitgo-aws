/**
 * LinkedIn API Service
 * 
 * Handles fetching user data from LinkedIn API
 */

export interface LinkedInProfile {
  id: string
  firstName: string
  lastName: string
  headline: string
  summary: string
  industry: string
  profilePicture: string
  location: string
  email: string
}

export interface LinkedInExperience {
  company: string
  title: string
  startDate: Date
  endDate?: Date
  description: string
  location: string
  current: boolean
}

export interface LinkedInEducation {
  school: string
  degree: string
  fieldOfStudy: string
  startDate: Date
  endDate?: Date
  description: string
}

export class LinkedInAPI {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * Fetch user profile from LinkedIn
   */
  async getProfile(): Promise<LinkedInProfile> {
    try {
      // Fetch basic profile
      const profileResponse = await fetch(
        "https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))",
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "cache-control": "no-cache",
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      )

      if (!profileResponse.ok) {
        throw new Error(`LinkedIn API error: ${profileResponse.statusText}`)
      }

      const profileData = await profileResponse.json()

      // Fetch email
      const emailResponse = await fetch(
        "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "cache-control": "no-cache",
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      )

      let email = ""
      if (emailResponse.ok) {
        const emailData = await emailResponse.json()
        email = emailData.elements?.[0]?.["handle~"]?.emailAddress || ""
      }

      // Extract profile picture
      let profilePicture = ""
      const displayImage = profileData.profilePicture?.["displayImage~"]
      if (displayImage?.elements && displayImage.elements.length > 0) {
        // Get the largest image
        const images = displayImage.elements
        profilePicture = images[images.length - 1]?.identifiers?.[0]?.identifier || ""
      }

      return {
        id: profileData.id,
        firstName: profileData.firstName?.localized?.en_US || "",
        lastName: profileData.lastName?.localized?.en_US || "",
        headline: "", // Note: headline requires additional API call
        summary: "",
        industry: "",
        profilePicture,
        location: "",
        email,
      }
    } catch (error) {
      console.error("Error fetching LinkedIn profile:", error)
      throw error
    }
  }

  /**
   * Fetch user experience/work history
   * Note: This requires additional LinkedIn API permissions
   */
  async getExperience(): Promise<LinkedInExperience[]> {
    // LinkedIn's v2 API has limited access to experience data
    // This would require LinkedIn Marketing Developer Platform access
    // For now, return empty array
    console.log("LinkedIn experience API requires Marketing Developer Platform access")
    return []
  }

  /**
   * Fetch user education
   * Note: This requires additional LinkedIn API permissions
   */
  async getEducation(): Promise<LinkedInEducation[]> {
    // LinkedIn's v2 API has limited access to education data
    // This would require LinkedIn Marketing Developer Platform access
    // For now, return empty array
    console.log("LinkedIn education API requires Marketing Developer Platform access")
    return []
  }

  /**
   * Fetch user skills
   * Note: This requires additional LinkedIn API permissions
   */
  async getSkills(): Promise<string[]> {
    // LinkedIn's v2 API has limited access to skills data
    // This would require LinkedIn Marketing Developer Platform access
    // For now, return empty array
    console.log("LinkedIn skills API requires Marketing Developer Platform access")
    return []
  }
}

/**
 * Helper function to check if LinkedIn token is expired
 */
export function isLinkedInTokenExpired(expiryDate?: Date): boolean {
  if (!expiryDate) return true
  return new Date() >= new Date(expiryDate)
}

/**
 * Helper function to refresh LinkedIn access token
 */
export async function refreshLinkedInToken(refreshToken: string): Promise<{
  accessToken: string
  expiresIn: number
}> {
  try {
    const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to refresh LinkedIn token")
    }

    const data = await response.json()
    
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }
  } catch (error) {
    console.error("Error refreshing LinkedIn token:", error)
    throw error
  }
}
