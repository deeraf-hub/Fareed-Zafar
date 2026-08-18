/**
 * Client-side preview of the configured SKU format. It mirrors the server's
 * renderer closely enough to show what a code will look like; the server
 * remains the only thing that actually assigns SKUs.
 */
const SAMPLE: Record<string, string> = {
  '{CAT}': 'TSH',
  '{PROD}': 'TSH',
  '{BRAND}': 'BSL',
  '{COLOR}': 'BLK',
  '{SIZE}': 'M',
  '{SEQ}': '001',
};

export function renderSkuPreview(format: string): string {
  const rendered = format
    .split('-')
    .map((segment) => segment.replace(/\{[A-Z]+\}/g, (token) => SAMPLE[token] ?? ''))
    .filter((segment) => segment.length > 0)
    .join('-');
  return rendered || '—';
}
