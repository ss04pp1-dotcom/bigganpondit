import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const candidateFiles = [
  path.join(rootDir, ".open-next/worker.js"),
  path.join(rootDir, ".open-next/server-functions/default/handler.mjs"),
];

let modifiedCount = 0;

for (const filePath of candidateFiles) {
  if (!fs.existsSync(filePath)) {
    continue;
  }

  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;

  // 1. Replace any fatal throw with safe fallback
  // Example in worker.js: throw new Error(`Unexpected loadManifest(${...}) call!`)
  const loadManifestThrowRegex = /throw new Error\((?:`Unexpected loadManifest\([^`]*\)|['"]Unexpected loadManifest[^'"]*['"])\);?/g;
  if (loadManifestThrowRegex.test(content)) {
    content = content.replace(
      loadManifestThrowRegex,
      '{ console.warn("[OpenNext Cloudflare] Safe loadManifest fallback triggered"); return {}; }'
    );
    modified = true;
    console.log(`[patch-worker] Replaced fatal Unexpected loadManifest throw in ${path.basename(filePath)}`);
  }

  // 2. Ensure preview-props check is present if there is an optional manifests filter list
  if (content.includes('prefetch-hints') && !content.includes('preview-props')) {
    content = content.replace(
      /p\.endsWith\((['"])prefetch-hints\1\)/g,
      'p.endsWith("prefetch-hints") || p.endsWith("preview-props")'
    );
    modified = true;
    console.log(`[patch-worker] Added preview-props check to ${path.basename(filePath)}`);
  }

  // 3. Inject the scheduled (cron) handler needed by the push-notification
  //    queue. wrangler.toml registers a cron trigger every 5 minutes; the
  //    OpenNext bundle has no `scheduled` export, so Cloudflare would drop
  //    every cron invocation without this patch.
  //
  //    The injected handler calls POST /api/cron/push on the deployed APP_URL
  //    with the CRON_SECRET server-side secret. All queue logic (claiming,
  //    idempotency, retry/backoff) lives in the app route — this shim only
  //    bridges cron → HTTP. Overlaps are safe: the processor is claim-guarded.
  if (
    path.basename(filePath) === "worker.js" &&
    !/export\s+(const|let|var|async\s+function|function)\s+scheduled\b|export\s*\{[^}]*\bscheduled\b/.test(content) &&
    !content.includes("__BIGGANPONDIT_CRON__")
  ) {
    const cronShim = `
// --- [patch-worker] __BIGGANPONDIT_CRON__ scheduled handler (injected) ---
// Cron bridge for the push-notification queue (every 5 min, see wrangler.toml).
export async function scheduled(event, env, ctx) {
  const baseUrl = (env && (env.APP_URL || (env.vars && env.vars.APP_URL))) || "";
  const target =
    (baseUrl ? String(baseUrl).replace(/\\/+$/, "") : "") + "/api/cron/push";
  const secret = (env && (env.CRON_SECRET || (env.vars && env.vars.CRON_SECRET))) || "";
  try {
    if (!target.startsWith("http")) {
      console.warn("[cron] APP_URL not set — push processor skipped");
      return;
    }
    const res = await fetch(target, {
      method: "POST",
      headers: { "x-cron-secret": String(secret) },
    });
    console.log("[cron] push processor:", res.status);
  } catch (err) {
    console.error("[cron] push processor failed:", (err && err.message) || err);
  }
}
// --- end injected scheduled handler ---
`;
    content = content + cronShim;
    modified = true;
    console.log("[patch-worker] Injected scheduled() cron handler for /api/cron/push");
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf-8");
    modifiedCount++;
    console.log(`[patch-worker] Successfully patched ${filePath}`);
  }
}

console.log(`[patch-worker] Worker post-processing completed (${modifiedCount} file(s) updated).`);
