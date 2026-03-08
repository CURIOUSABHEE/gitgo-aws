/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Remove 'standalone' for Amplify - it uses default SSR mode
  images: {
    domains: ['avatars.githubusercontent.com', 'github.com'],
    unoptimized: true, // Required for Amplify
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
