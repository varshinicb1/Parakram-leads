import * as esbuild from 'esbuild';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

async function bundle() {
  mkdirSync(resolve(root, 'dist/bundle'), { recursive: true });

  await esbuild.build({
    entryPoints: [resolve(root, 'src/backend/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: resolve(root, 'dist/bundle/backend.cjs'),
    minify: true,
    sourcemap: false,
  });

  console.log('✓ Backend bundled to dist/bundle/backend.cjs');
}

bundle().catch(e => { console.error(e); process.exit(1); });
