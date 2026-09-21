import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? "/wish-together" : "";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: isGitHubPages },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
