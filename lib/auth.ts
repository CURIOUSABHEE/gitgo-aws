import { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import LinkedInProvider from "next-auth/providers/linkedin"

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo read:org",
        },
      },
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
      wellKnown: "https://www.linkedin.com/oauth/.well-known/openid-configuration",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        
        if (account.provider === "github") {
          token.githubId = (profile as any)?.id
        }
        
        if (account.provider === "linkedin") {
          token.linkedinId = (profile as any)?.sub || (profile as any)?.id
        }
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.user.githubId = token.githubId as string
      session.user.linkedinId = token.linkedinId as string
      return session
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
}


import { getServerSession } from "next-auth"

export async function auth() {
  return await getServerSession(authOptions)
}
