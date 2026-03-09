import "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    refreshToken?: string
    user: {
      githubId?: string
      githubLogin?: string
      linkedinId?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    githubId?: string
    githubLogin?: string
    linkedinId?: string
  }
}
