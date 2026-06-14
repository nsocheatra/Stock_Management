import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  async rewrites() {
    return [
      {
        source: "/setting",
        destination: "/settings",
      },
    ];
  },
};

export default nextConfig;
