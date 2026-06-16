import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@libsql/client"],
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
