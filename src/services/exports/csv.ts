import { downloadBlob } from '@/utils/misc';

/**
 * CSV/JSON export helpers. Exports contain readable business data — the UI must
 * warn the owner before exporting anything sensitive.
 */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text: string;
  if (typeof value === 'object') {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  } else {
    text = String(value);
  }
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  const keys = columns ?? Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const header = keys.map(escapeCell).join(',');
  const body = rows.map((row) => keys.map((key) => escapeCell(row[key])).join(',')).join('\r\n');
  return `${header}\r\n${body}`;
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>, columns?: string[]): void {
  const csv = toCsv(rows, columns);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
}

/** `zine-bills-2026-11-10` */
export function datedFilename(prefix: string, extension: string, date = new Date()): string {
  const iso = date.toISOString().slice(0, 10);
  return `${prefix}-${iso}.${extension}`;
}
