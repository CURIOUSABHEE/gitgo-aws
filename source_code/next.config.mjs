/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone', // For AWS deployment
  images: {
    domains: ['avatars.githubusercontent.com', 'github.com'],
  },
}

export default nextConfig
