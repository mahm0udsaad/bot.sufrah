/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
