import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg"],
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
