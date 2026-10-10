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

export function isCloudflareWorkersRuntime(): boolean {
  return (
    typeof (globalThis as any).WebSocketPair !== "undefined" ||
    (typeof navigator !== "undefined" && (navigator as any).userAgent === "Cloudflare-Workers") ||
    !!(globalThis as any)[Symbol.for("__cloudflare-context__")]
  );
}

export async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    // 1) Direct OpenNext AsyncLocalStorage accessor (zero async overhead, no hang)
    const cfContext = (globalThis as any)[Symbol.for("__cloudflare-context__")];
    if (cfContext?.env) {
      return cfContext.env as CloudflareEnv;
    }

    // 2) Direct global or process.env check
    const directEnv = (globalThis as any).env || (globalThis as any).__env__ || (process as any).env;
    if (directEnv?.DB) return directEnv as CloudflareEnv;

    // 3) Direct getCloudflareContext without race timeout
    try {
      const dynamicImport = (name: string): Promise<any> => {
        try {
          const fn = new Function("n", "return import(n)");
          return fn(name);
        } catch {
          return Promise.reject(new Error("Dynamic import unsupported"));
        }
      };
      const mod: any = await dynamicImport("@opennextjs/cloudflare").catch(() => null);
      if (typeof mod?.getCloudflareContext === "function") {
        try {
          const syncCtx = mod.getCloudflareContext();
          if (syncCtx?.env) return syncCtx.env as CloudflareEnv;
        } catch {
          const asyncCtx = await mod.getCloudflareContext({ async: true }).catch(() => null);
          if (asyncCtx?.env) return asyncCtx.env as CloudflareEnv;
        }
      }
    } catch {
      // not available or not on edge
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
    // Opt-in demo seeding for local development (see .dev.vars.example).
    // Production must NEVER set this to "1".
    SEED_DEMO_DATA: process.env.SEED_DEMO_DATA,
  };
}
