import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Agent SDK 는 번들 대신 실행 시점에 자체 바이너리를 찾아야 한다
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
  /* config options here */
};

export default nextConfig;
