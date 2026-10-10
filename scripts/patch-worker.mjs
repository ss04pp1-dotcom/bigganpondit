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

  if (modified) {
    fs.writeFileSync(filePath, content, "utf-8");
    modifiedCount++;
    console.log(`[patch-worker] Successfully patched ${filePath}`);
  }
}

console.log(`[patch-worker] Worker post-processing completed (${modifiedCount} file(s) updated).`);
