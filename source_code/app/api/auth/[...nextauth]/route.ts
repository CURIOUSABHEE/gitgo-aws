import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"

const handler = NextAuth({
  ...authOptions,
  callbacks: {
    ...authOptions.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider === "linkedin") {
        try {
          await connectDB()
          
          // Find user by GitHub ID (assuming they're already logged in with GitHub)
          // Or create/update user with LinkedIn data
          const linkedinId = (profile as any)?.sub || (profile as any)?.id
          const email = (profile as any)?.email
          
          if (linkedinId) {
            // Update existing user or create new one
            await User.findOneAndUpdate(
              { email }, // Find by email if GitHub user exists
              {
                $set: {
                  linkedinId,
                  linkedinAccessToken: account.access_token,
                  linkedinRefreshToken: account.refresh_token,
                  linkedinTokenExpiry: account.expires_at 
                    ? new Date(account.expires_at * 1000)
                    : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days default
                },
              },
              { upsert: false } // Don't create new user, only update existing
            )
          }
        } catch (error) {
          console.error("Error storing LinkedIn credentials:", error)
        }
      }
      
      return true
    },
  },
})

export { handler as GET, handler as POST }
