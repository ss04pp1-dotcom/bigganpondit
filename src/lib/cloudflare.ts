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
    // 1) Direct global or process.env check (immediate, zero async overhead)
    const directEnv = (globalThis as any).env || (process as any).env;
    if (directEnv?.DB) return directEnv as CloudflareEnv;

    // 2) @opennextjs/cloudflare context with 800ms race timeout to prevent infinite hang
    const mod: any = await import("@opennextjs/cloudflare");
    if (typeof mod?.getCloudflareContext === "function") {
      const fetchContext = async () => {
        try {
          const res = mod.getCloudflareContext({ async: true });
          return res && typeof res.then === "function" ? await res : res;
        } catch {
          const res = mod.getCloudflareContext();
          return res && typeof res.then === "function" ? await res : res;
        }
      };

      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 800));
      const ctx: any = await Promise.race([fetchContext(), timeout]);
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
