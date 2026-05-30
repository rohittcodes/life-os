/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow any external hostname for user-supplied cover image URLs
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
}

export default nextConfig
