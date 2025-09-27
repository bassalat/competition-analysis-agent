import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    turbo: undefined
  },
  // Ensure proper static generation
  trailingSlash: false,
  // Output configuration for Netlify
  output: 'standalone',
};

export default nextConfig;
