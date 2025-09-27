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
  trailingSlash: false,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
