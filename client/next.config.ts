import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "https://smartbooklm.onrender.com/api/auth/:path*", // Replace with your actual Render URL
      },
    ];
  },
};

export default nextConfig;
