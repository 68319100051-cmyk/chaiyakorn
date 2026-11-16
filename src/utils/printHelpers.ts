/**
 * Centralized formatting & print helpers for ร้านพัทลุงปริ้นเตอร์ คอมพิวเตอร์
 * Enforces:
 * - Zero '฿' currency symbol on all printed documents (avoids font glyph bugs such as '$' or 'B')
 * - Full Thai Buddhist Era dates everywhere ("16 พฤศจิกายน 2569")
 * - Shared A5 portrait paper & margin standards
 */

export const THAI_FULL_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม'
] as const;

export const A5_PAGE_CONFIG = {
  paperWidthMm: 148,
  paperHeightMm: 210,
  marginTopMm: 6,
  marginRightMm: 6,
  marginBottomMm: 3.5,
  marginLeftMm: 6,
  printableWidthMm: 136,
  printableHeightMm: 200.5,
  minFontPt: 9,
  lineHeight: 1.55
} as const;

/**
 * Triggers window.print() while temporarily setting a clean document title
 * (without slashes) so browser PDF export filenames are clean and consistent.
 */
export function printWithCleanTitle(cleanTitle: string): void {
  const prevTitle = document.title;
  const safeTitle = (cleanTitle || 'FixPro')
    .replace(/\s*\/\s*/g, '-')
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim();

  document.title = safeTitle;
  const restore = () => {
    document.title = prevTitle;
  };
  window.addEventListener('afterprint', restore, { once: true });
  window.print();
  // Fallback restore in case browser blocks/skips afterprint event
  setTimeout(restore, 1500);
}

/**
 * Parses ISO date strings ("2026-11-19" or "2026-11-19T08:30:00Z") or Date objects
 * without timezone day-shift bugs on pure YYYY-MM-DD strings.
 */
export function parseSafeDate(dateInput?: string | Date | null): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  const trimmed = String(dateInput).trim();
  if (!trimmed) return null;

  // Match pure YYYY-MM-DD so it resolves to local calendar date (no UTC midnight shift)
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    // Support both AD and already-BE years safely
    const adYear = year > 2400 ? year - 543 : year;
    const d = new Date(adYear, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Match YYYY-MM-DDTHH:mm:ss...
  const isoPrefixMatch = /^(\d{4})-(\d{2})-(\d{2})T/.exec(trimmed);
  if (isoPrefixMatch) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Formats any date into full Thai Buddhist Era format:
 * e.g., "16 พฤศจิกายน 2569"
 */
export function formatThaiDateFull(dateInput?: string | Date | null, fallback = '-'): string {
  const date = parseSafeDate(dateInput);
  if (!date) return fallback;

  const day = date.getDate();
  const monthName = THAI_FULL_MONTHS[date.getMonth()];
  const rawYear = date.getFullYear();
  const beYear = rawYear > 2400 ? rawYear : rawYear + 543;

  return `${day} ${monthName} ${beYear}`;
}

/**
 * Formats today's date in full Thai BE format: "16 พฤศจิกายน 2569"
 */
export function formatTodayThaiFull(): string {
  return formatThaiDateFull(new Date());
}

/**
 * Formats monetary amounts WITHOUT any currency symbol ('฿' or '$'),
 * returning clean formatted numerals e.g. "300.00" or "1,250.00".
 */
export function formatMoneyPlain(amount?: number | string | null, decimals = 2): string {
  const num = Number(amount ?? 0);
  const safe = isFinite(num) ? num : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Formats integer/compact plain money e.g. "300" or "1,250.00" when decimals matter.
 */
export function formatMoneyClean(amount?: number | string | null): string {
  const num = Number(amount ?? 0);
  const safe = isFinite(num) ? num : 0;
  const hasCents = Math.abs(safe - Math.round(safe)) > 0.001;
  return formatMoneyPlain(safe, hasCents ? 2 : 2);
}

/**
 * Strips any accidental ฿ symbol from a string (safety net for rendered print copy)
 */
export function stripBahtSymbol(text: string): string {
  return (text || '').replace(/฿/g, '').trim();
}
