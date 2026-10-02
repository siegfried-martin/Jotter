// Bundle the server (and the SPA code it shares via src/shared.ts) into dist/index.js.
// npm packages stay external and load from jotter-server/node_modules at runtime, so the
// deploy is: npm ci --omit=dev && node build.mjs. esbuild is cheap on memory, so this is
// safe to run on the droplet.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info'
});
