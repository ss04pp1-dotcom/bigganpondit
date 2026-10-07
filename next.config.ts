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
  turbopack: {},
  webpack: (config, {dev}) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
