import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Codex SDK 는 번들 대신 실행 시점에 자체 CLI 바이너리를 찾아야 한다
  serverExternalPackages: ["@openai/codex-sdk"],
  /* config options here */
};

export default nextConfig;
