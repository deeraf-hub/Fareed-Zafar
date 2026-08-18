/* Rebuilds the Tailwind CSS that lives inside ../index.html.
   Only needed if you change the design classes in index.html.

   Run:  cd inventory/dev && npm install && npm run build
*/
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const PAGE = new URL('../index.html', import.meta.url).pathname;
const html = readFileSync(PAGE, 'utf8');

/* Scan the page with the existing <style> blocks stripped out, so class names
   are picked up from the markup and JavaScript only — not from the old CSS. */
const scanText = html.replace(/<style>[\s\S]*?<\/style>/g, '');
writeFileSync(new URL('./.scan.tmp.html', import.meta.url), scanText);

execFileSync('./node_modules/.bin/tailwindcss',
  ['-c', 'tailwind.config.js', '-i', 'input.css', '-o', '.out.tmp.css', '--minify'],
  { cwd: new URL('.', import.meta.url).pathname, stdio: 'inherit' });

const css = readFileSync(new URL('./.out.tmp.css', import.meta.url), 'utf8').trim();

/* The first <style> block in index.html is the generated one. */
const start = html.indexOf('<style>');
const end   = html.indexOf('</style>', start) + '</style>'.length;
writeFileSync(PAGE, html.slice(0, start) + '<style>\n' + css + '\n</style>' + html.slice(end));

unlinkSync(new URL('./.scan.tmp.html', import.meta.url));
unlinkSync(new URL('./.out.tmp.css', import.meta.url));
console.log('index.html styles rebuilt (' + Math.round(css.length / 1024) + ' KB).');
