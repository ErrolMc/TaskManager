import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL}/api/:path*`,
      },
      {
        source: "/hubs/:path*",
        destination: `${process.env.BACKEND_URL}/hubs/:path*`,
      },
    ];
  },
};

export default nextConfig;
