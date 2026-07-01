import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

async function main() {
  const outDir = resolve(root, 'dist/runtime');
  mkdirSync(outDir, { recursive: true });

  const res = await fetch('https://nodejs.org/dist/index.json');
  const versions = await res.json();
  const latest = versions.find(v => v.lts && v.files.includes('win-x64-exe'));
  const version = latest.version;
  const url = `https://nodejs.org/dist/${version}/win-x64/node.exe`;

  console.log(`Downloading Node.js ${version} (win-x64)...`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  const outPath = resolve(outDir, 'node.exe');
  writeFileSync(outPath, buffer);

  const size = (buffer.length / 1024 / 1024).toFixed(1);
  console.log(`✓ Downloaded ${version} (${size} MB) to dist/runtime/node.exe`);
}

main().catch(e => { console.error(e); process.exit(1); });
