import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  reactStrictMode: true,
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    agentUpgrade: 'security',
  },
};

export default nextConfig;
