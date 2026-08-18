import type { Tx } from '../db.js';

const STOP_WORDS = new Set(['the', 'and', 'a', 'of', 'for']);

/**
 * Abbreviations the fashion trade already uses. Falling back to a generic
 * algorithm would give "BLC" for black; staff expect "BLK".
 */
const KNOWN_CODES: Record<string, string> = {
  // Colours
  BLACK: 'BLK', WHITE: 'WHT', BLUE: 'BLU', NAVY: 'NVY', GREY: 'GRY', GRAY: 'GRY',
  RED: 'RED', GREEN: 'GRN', BROWN: 'BRN', BEIGE: 'BGE', PINK: 'PNK', YELLOW: 'YEL',
  ORANGE: 'ORG', PURPLE: 'PRP', MAROON: 'MRN', OLIVE: 'OLV', CHARCOAL: 'CHR',
  CREAM: 'CRM', KHAKI: 'KHK', DENIM: 'DNM', MUSTARD: 'MST', TEAL: 'TEL',
  SILVER: 'SLV', GOLD: 'GLD', IVORY: 'IVR', RUST: 'RST', SAND: 'SND',
  // Categories
  'T SHIRTS': 'TSH', 'T SHIRT': 'TSH', TSHIRT: 'TSH', TSHIRTS: 'TSH', TEES: 'TSH',
  JEANS: 'JNS', SHIRTS: 'SHT', SHIRT: 'SHT', TROUSERS: 'TRS', TROUSER: 'TRS',
  CAPS: 'CAP', CAP: 'CAP', BAGS: 'BAG', BAG: 'BAG', JACKETS: 'JKT', JACKET: 'JKT',
  HOODIES: 'HOD', HOODIE: 'HOD', SHORTS: 'SHR', SWEATSHIRTS: 'SWT',
  SWEATSHIRT: 'SWT', ACCESSORIES: 'ACC', BELTS: 'BLT', SOCKS: 'SCK',
};

/** Turns "Basic T-Shirt" into "TSH" and "Black" into "BLK". */
export function codeFrom(value: string | null | undefined, length = 3): string {
  if (!value) return '';
  const normalised = value.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (KNOWN_CODES[normalised]) return KNOWN_CODES[normalised];

  const words = normalised.split(' ').filter((word) => word && !STOP_WORDS.has(word.toLowerCase()));
  if (words.length === 0) return '';

  // A known term anywhere in the phrase wins: "Basic T-Shirt" -> TSH. Multi-word
  // terms are checked first so "T SHIRT" beats the bare word "SHIRT".
  const multiWord = Object.keys(KNOWN_CODES).filter((key) => key.includes(' '));
  for (const key of multiWord) {
    if (normalised === key || normalised.includes(` ${key}`) || normalised.startsWith(`${key} `)) {
      return KNOWN_CODES[key]!;
    }
  }
  for (const word of [...words].reverse()) {
    if (KNOWN_CODES[word]) return KNOWN_CODES[word];
  }

  if (words.length >= length) return words.slice(0, length).map((w) => w[0]).join('');
  const joined = words.join('');
  const consonants = joined[0] + joined.slice(1).replace(/[AEIOU]/g, '');
  return (consonants.length >= length ? consonants : joined).slice(0, length);
}

export interface SkuParts {
  category?: string | null;
  productName?: string | null;
  color?: string | null;
  size?: string | null;
  brand?: string | null;
}

/**
 * Renders an SKU from the configured format, e.g. `{CAT}-{COLOR}-{SIZE}-{SEQ}`
 * with a T-Shirt / Black / M variant yields `TSH-BLK-M-001`. Empty tokens are
 * dropped so a product with no colour does not produce `TSH--M-001`.
 */
export function renderSku(format: string, parts: SkuParts, sequence: number): string {
  const tokens: Record<string, string> = {
    '{CAT}': codeFrom(parts.category ?? parts.productName, 3),
    '{PROD}': codeFrom(parts.productName, 3),
    '{BRAND}': codeFrom(parts.brand, 3),
    '{COLOR}': codeFrom(parts.color, 3),
    '{SIZE}': (parts.size ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
    '{SEQ}': String(sequence).padStart(3, '0'),
  };
  return format
    .split('-')
    .map((segment) =>
      segment.replace(/\{[A-Z]+\}/g, (token) => tokens[token] ?? ''),
    )
    .filter((segment) => segment.length > 0)
    .join('-');
}

/**
 * Finds a free SKU by rendering the format and bumping the sequence until the
 * value is unused across both products and variants.
 */
export async function generateUniqueSku(
  tx: Tx,
  format: string,
  parts: SkuParts,
  startAt = 1,
): Promise<string> {
  for (let sequence = startAt; sequence < startAt + 5000; sequence += 1) {
    const candidate = renderSku(format, parts, sequence);
    const [product, variant] = await Promise.all([
      tx.product.findUnique({ where: { sku: candidate }, select: { id: true } }),
      tx.productVariant.findUnique({ where: { sku: candidate }, select: { id: true } }),
    ]);
    if (!product && !variant) return candidate;
  }
  throw new Error('Unable to generate a unique SKU. Please enter one manually.');
}

/**
 * EAN-13 style barcode: a 12-digit body derived from a numeric seed plus a
 * check digit, so generated barcodes scan on ordinary retail hardware.
 */
export function generateBarcode(seed?: number): string {
  const base = String(seed ?? Math.floor(Math.random() * 1_000_000_000_000)).padStart(12, '0').slice(-12);
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return `${base}${check}`;
}

export async function generateUniqueBarcode(tx: Tx): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateBarcode();
    const [product, variant] = await Promise.all([
      tx.product.findUnique({ where: { barcode: candidate }, select: { id: true } }),
      tx.productVariant.findUnique({ where: { barcode: candidate }, select: { id: true } }),
    ]);
    if (!product && !variant) return candidate;
  }
  throw new Error('Unable to generate a unique barcode. Please enter one manually.');
}
