import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    return config;
  },
};

export default nextConfig;
