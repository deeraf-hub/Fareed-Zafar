/** Escapes a value for CSV, guarding against spreadsheet formula injection. */
function escape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((column) => escape(column.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escape(column.value(row))).join(','));
  }
  // A BOM makes Excel open UTF-8 exports (e.g. Rs, accented names) correctly.
  return `﻿${lines.join('\r\n')}`;
}

export function csvFilename(base: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `brandsloop-${base}-${stamp}.csv`;
}
