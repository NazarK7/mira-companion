/**
 * Date e size formatting per UI MiRa Companion.
 * Pure functions, no DI, testabili.
 */

/**
 * "3 weeks ago", "in 5 days", "yesterday".
 * Usa Intl.RelativeTimeFormat (browser nativo, no deps).
 */
export function relativeTime(isoDate: string, lang: 'en' | 'it' = 'en'): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });

  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 60) return rtf.format(diffSec, 'second');
  if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (absSec < 86_400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (absSec < 2_592_000) return rtf.format(Math.round(diffSec / 86_400), 'day');
  if (absSec < 31_536_000) return rtf.format(Math.round(diffSec / 2_592_000), 'month');
  return rtf.format(Math.round(diffSec / 31_536_000), 'year');
}

/**
 * Giorni rimasti fino a una data ISO. Negativo se passata.
 * Arrotondato per eccesso (oggi = 0, domani = 1, ieri = -1).
 */
export function daysUntil(isoDate: string): number {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return Math.ceil(diffMs / 86_400_000);
}

/**
 * "487 MB", "1.2 GB", "143 KB". Restituisce "—" se undefined/0.
 */
export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }
  return `${size < 10 ? size.toFixed(1) : Math.round(size)} ${units[unitIdx]}`;
}

/**
 * "15 May 2026" — formato compatto, no orario.
 */
export function formatDate(isoDate: string, lang: 'en-GB' | 'it-IT' = 'en-GB'): string {
  return new Date(isoDate).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}