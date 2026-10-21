import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Images are served through the authenticated Worker endpoint /api/files/*
    // (Cloudflare R2 objects), so the Next Image optimizer is not used.
    unoptimized: true,
  },
  // In OpenNext on Cloudflare Workers, runtime bindings are provided via context globals.
  serverExternalPackages: [],
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev && process.env.DISABLE_HMR === "true") {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/apple-touch-icon.png",
        destination: "/api/logo",
      },
      {
        source: "/apple-touch-icon-precomposed.png",
        destination: "/api/logo",
      },
      {
        source: "/icons/icon-192.png",
        destination: "/api/logo",
      },
      {
        source: "/icons/icon-512.png",
        destination: "/api/logo",
      },
      {
        source: "/icons/icon-maskable-192.png",
        destination: "/api/logo",
      },
      {
        source: "/icons/icon-maskable-512.png",
        destination: "/api/logo",
      },
    ];
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
