import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Images are served through the authenticated Worker endpoint /api/files/*
    // (Cloudflare R2 objects), so the Next Image optimizer is not used.
    unoptimized: true,
  },
  // Keep runtime packages external so the same code runs on:
  //  - local dev (bun:sqlite / node:sqlite behind the D1-compatible adapter)
  //  - Cloudflare Workers (@opennextjs/cloudflare provides real D1/R2 bindings)
  serverExternalPackages: [
    "@opennextjs/cloudflare",
  ],
};

export default nextConfig;
