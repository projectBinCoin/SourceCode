import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins: ["127.0.0.1", "http://127.0.0.1:53214", "http://127.0.2.2:3000"],
};

export default nextConfig;
