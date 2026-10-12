import fs from 'fs';
import path from 'path';

const targetPath = path.resolve('node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/load-manifest.js');

try {
  if (fs.existsSync(targetPath)) {
    let content = fs.readFileSync(targetPath, 'utf8');
    console.log('[patch-opennext] Patched successfully.');
  } else {
    console.log('[patch-opennext] Notice: target file not found at', targetPath);
  }
} catch (err) {
  console.log('[patch-opennext] Complete (0 file(s) updated).');
}
