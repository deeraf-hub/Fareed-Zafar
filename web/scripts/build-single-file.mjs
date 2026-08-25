/**
 * Bundles the storefront into one self-contained HTML file (dist-single/qalandari-autos.html).
 *
 * Everything is inlined — JavaScript, CSS and every SVG in public/ becomes a
 * data URI — so the file can be opened straight from disk or dropped on any
 * static host with no server-side routing. It uses the hash router for exactly
 * that reason; the normal `npm run build` output is what you deploy.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const outDir = join(root, 'dist-single');

console.log('Building with the hash router…');
execFileSync('npx', ['vite', 'build', '--config', 'vite.single.config.ts'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_ROUTER: 'hash' },
});

const dataUri = (path) =>
  `data:image/svg+xml;base64,${readFileSync(path).toString('base64')}`;

/** Every public SVG, keyed by the absolute path the app references it with. */
const assets = new Map();
for (const file of readdirSync(join(outDir, 'products'))) {
  assets.set(`/products/${file}`, dataUri(join(outDir, 'products', file)));
}
for (const file of ['logo.svg', 'motorcycle.svg', 'favicon.svg']) {
  assets.set(`/${file}`, dataUri(join(outDir, file)));
}

const assetDir = join(outDir, 'assets');
const jsFile = readdirSync(assetDir).find((f) => f.endsWith('.js'));
const cssFile = readdirSync(assetDir).find((f) => f.endsWith('.css'));

let js = readFileSync(join(assetDir, jsFile), 'utf8');
let css = readFileSync(join(assetDir, cssFile), 'utf8');
let inlined = 0;
for (const [path, uri] of assets) {
  const before = js;
  js = js.split(path).join(uri);
  css = css.split(path).join(uri);
  if (before !== js) inlined += 1;
}

// A literal </script> inside the bundle would end the inline script tag early.
js = js.split('</script').join('<\\/script');

// Bundles contain `$&` and similar sequences, which String.replace treats as
// special replacement patterns — always inline through a replacer function.
const insert = (value) => () => value;

const html = readFileSync(join(outDir, 'index.html'), 'utf8')
  .replace(/<script type="module"[^>]*><\/script>/, '')
  .replace(/<link rel="stylesheet"[^>]*>/, '')
  .replace(/<link rel="icon"[^>]*>/, insert(`<link rel="icon" type="image/svg+xml" href="${assets.get('/favicon.svg')}" />`))
  .replace('</head>', insert(`<style>${css}</style>\n  </head>`))
  .replace('</body>', insert(`<script type="module">${js}<\/script>\n  </body>`));

const outFile = join(outDir, 'qalandari-autos.html');
writeFileSync(outFile, html);
console.log(`\nInlined ${inlined} images, ${(css.length / 1024).toFixed(0)} KB CSS, ${(js.length / 1024).toFixed(0)} KB JS`);
console.log(`Wrote ${outFile} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
