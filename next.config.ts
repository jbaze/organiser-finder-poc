import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No ESLint setup in this POC; type checking still runs during build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
