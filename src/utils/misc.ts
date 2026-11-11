/** Initials for avatars: `Anita Rao` → `AR`. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic warm avatar tone from a string. */
export function avatarTone(seed: string): string {
  const tones = [
    'bg-wine-100 text-wine-700 ring-wine-200',
    'bg-gold-100 text-gold-700 ring-gold-200',
    'bg-sage-100 text-sage-700 ring-sage-200',
    'bg-ink-100 text-ink-700 ring-ink-200',
    'bg-rose-100 text-rose-700 ring-rose-200',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return tones[hash % tones.length];
}

export function groupBy<T, K extends string | number>(items: T[], key: (item: T) => K): Record<K, T[]> {
  return items.reduce<Record<K, T[]>>(
    (acc, item) => {
      const k = key(item);
      (acc[k] ||= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function sortBy<T>(items: T[], key: (item: T) => number | string, direction: 'asc' | 'desc' = 'asc'): T[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = key(a);
    const bv = key(b);
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * factor;
  });
}

/** Trigger a browser download for an in-memory blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function bytesToSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function monthBounds(month: string): { start: string; end: string } {
  const [year, m] = month.split('-').map(Number);
  const start = `${year}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  return { start, end: `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` };
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalises an Indian mobile number for search/WhatsApp links. */
export function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
