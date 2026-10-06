// Cloudflare bindings accessor.
// In production (Cloudflare Workers via @opennextjs/cloudflare) this returns the
// real D1/R2/env bindings. In local development it returns null and the app
// falls back to the SQLite/filesystem adapters.

export interface CloudflareEnv {
  DB?: unknown;
  BUCKET?: unknown;
  AUTH_SECRET?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  APP_URL?: string;
  [key: string]: unknown;
}

export async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const mod: any = await import("@opennextjs/cloudflare");
    if (typeof mod?.getCloudflareContext === "function") {
      let ctx: any;
      try {
        ctx = await mod.getCloudflareContext({ async: true });
      } catch {
        ctx = mod.getCloudflareContext();
      }
      if (ctx && typeof ctx.then === "function") {
        ctx = await ctx;
      }
      if (ctx?.env) return ctx.env as CloudflareEnv;
    }
  } catch (err) {
    console.error("Failed to get Cloudflare context:", err);
  }
  return null;
}

export function localEnv(): CloudflareEnv {
  return {
    AUTH_SECRET: process.env.AUTH_SECRET,
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    APP_URL: process.env.APP_URL,
  };
}
