import type { NextConfig } from "next";

const isGitHubPages = process.env.DEPLOY_TARGET === "github-pages";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "the-little-room";
const deploymentBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
const basePath = isGitHubPages ? deploymentBasePath ?? `/${repositoryName}` : "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  output: isGitHubPages ? "export" : undefined,
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: isGitHubPages,
};

export default nextConfig;
