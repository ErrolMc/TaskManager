import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://backend";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/hubs/:path*",
        destination: `${backendUrl}/hubs/:path*`,
      },
    ];
  },
};

export default nextConfig;
