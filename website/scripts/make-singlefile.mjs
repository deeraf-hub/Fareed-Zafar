// Inline the built JS and CSS into dist/index.html to produce a fully
// self-contained single-file build at dist-single/index.html (used for
// URL-based deploys where only one file can be fetched).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
let html = readFileSync(join(dist, 'index.html'), 'utf8');

html = html.replace(
  /<script type="module"[^>]*src="\/(assets\/[^"]+\.js)"><\/script>/,
  (_, path) => {
    const js = readFileSync(join(dist, path), 'utf8').replaceAll('</script>', '<\\/script>');
    return `<script type="module">${js}</script>`;
  },
);

html = html.replace(/<link rel="stylesheet"[^>]*href="\/(assets\/[^"]+\.css)">/, (_, path) => {
  const css = readFileSync(join(dist, path), 'utf8');
  return `<style>${css}</style>`;
});

if (html.includes('/assets/')) {
  throw new Error('Un-inlined asset references remain in index.html');
}

mkdirSync(join(root, 'dist-single'), { recursive: true });
writeFileSync(join(root, 'dist-single', 'index.html'), html);
console.log('Wrote dist-single/index.html (%d KiB)', Math.round(html.length / 1024));
