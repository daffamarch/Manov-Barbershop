import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow development access via local network IP so the hot reloader scripts don't fail
  allowedDevOrigins: [
    "localhost", 
    "192.168.1.59", 
    "127.0.0.1"
  ],
};

export default nextConfig;
