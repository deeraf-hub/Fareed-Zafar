/**
 * Downloads every royalty-free photo listed in src/data/photos.ts into
 * public/products/photos/, so the shop serves its own images instead of
 * depending on the Pexels CDN.
 *
 * Run it from a machine with normal internet access:
 *
 *   npm run fetch-images
 *
 * Then set SELF_HOSTED to true in src/data/photos.ts (the script prints a
 * reminder) and rebuild.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const outDir = join(root, 'public/products/photos');
mkdirSync(outDir, { recursive: true });

const source = await import(join(root, 'src/data/photos.ts')).catch(() => null);

/** photos.ts is TypeScript, so parse the CDN paths out of it rather than importing. */
const readEntries = async () => {
  if (source?.photos) return Object.values(source.photos).map((p) => ({ id: p.id, src: p.src }));
  const { readFileSync } = await import('node:fs');
  const text = readFileSync(join(root, 'src/data/photos.ts'), 'utf8');
  return [...text.matchAll(/P\('([^']+)',\s*'([^']+)'/g)].map(([, id, path]) => ({
    id,
    src: `https://images.pexels.com/photos/${path}`,
  }));
};

const entries = await readEntries();
console.log(`Downloading ${entries.length} photos into public/products/photos/…`);

let ok = 0;
for (const { id, src } of entries) {
  const url = `${src}?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=900`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(join(outDir, `${id}.jpg`), buffer);
    ok += 1;
    console.log(`  ✓ ${id}.jpg (${Math.round(buffer.length / 1024)} KB)`);
  } catch (error) {
    console.warn(`  ✗ ${id}: ${error.message}`);
  }
}

console.log(`\n${ok}/${entries.length} downloaded.`);
console.log('Now set SELF_HOSTED = true in src/data/photos.ts and rebuild.');
