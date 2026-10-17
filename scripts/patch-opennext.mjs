import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const targetFiles = [
  path.join(rootDir, "node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/load-manifest.js"),
];

let patchedCount = 0;

for (const targetPath of targetFiles) {
  if (!fs.existsSync(targetPath)) {
    console.warn(`[patch-opennext] Notice: target file not found at ${targetPath}`);
    continue;
  }

  let code = fs.readFileSync(targetPath, "utf-8");
  let modified = false;

  // 1. Expand the glob to include preview-props.json as well as other manifests
  if (code.includes("**/{*-manifest,required-server-files,prefetch-hints}.json")) {
    code = code.replace(
      "**/{*-manifest,required-server-files,prefetch-hints}.json",
      "**/{*-manifest,required-server-files,prefetch-hints,preview-props}.json"
    );
    modified = true;
    console.log("[patch-opennext] Expanded manifest glob pattern to include preview-props");
  }

  // 2. Include preview-props in the optional manifest check if not already present
  if (code.includes('p.endsWith("prefetch-hints")') && !code.includes('p.endsWith("preview-props")')) {
    code = code.replace(
      'p.endsWith("prefetch-hints")',
      'p.endsWith("prefetch-hints") || p.endsWith("preview-props")'
    );
    modified = true;
    console.log("[patch-opennext] Added preview-props check to optional manifests filter");
  }

  // 3. Replace the fatal throw with safe empty-object fallback so Worker never crashes with Error 1101
  const throwPattern = /throw new Error\(`Unexpected loadManifest\(\$\{\$PATH\}\) call!`\);/g;
  if (throwPattern.test(code)) {
    code = code.replace(
      throwPattern,
      'console.warn(`[OpenNext Cloudflare] Unexpected loadManifest(${PATH}) requested - returning empty object fallback`); return {};'
    );
    modified = true;
    console.log("[patch-opennext] Replaced fatal loadManifest throw with non-crashing fallback");
  }

  if (modified) {
    fs.writeFileSync(targetPath, code, "utf-8");
    patchedCount++;
    console.log(`[patch-opennext] Successfully patched ${targetPath}`);
  } else {
    console.log(`[patch-opennext] File already patched or up-to-date: ${targetPath}`);
  }
}

console.log(`[patch-opennext] Complete (${patchedCount} file(s) updated).`);
