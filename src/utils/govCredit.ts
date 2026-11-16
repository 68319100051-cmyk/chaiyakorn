import {
  CustomerType,
  GovBillingStatus,
  GovCreditInfo,
  POSSaleRecord,
  RepairTicket
} from '../types';
import { formatThaiDateFull } from './printHelpers';

export const THAILAND_TIMEZONE = 'Asia/Bangkok';
export const DEFAULT_GOV_ALERT_DAYS = [7, 3, 1];

export const CREDIT_DAYS_PRESETS = [
  { days: 15, label: '15 วัน (เร่งด่วน)' },
  { days: 30, label: '30 วัน (มาตรฐานราชการ)' },
  { days: 45, label: '45 วัน' },
  { days: 60, label: '60 วัน (โครงการใหญ่)' },
  { days: 90, label: '90 วัน' }
];

export type GovAlertStatus =
  | 'paid'
  | 'overdue'
  | 'due_today'
  | 'due_soon'
  | 'within_credit'
  | 'no_due';

export interface DueStatusInfo {
  status: GovAlertStatus;
  daysDiff: number; // positive = days remaining, 0 = due today, negative = days overdue
  badgeLabel: string;
  shortLabel: string;
  badgeClass: string;
  colorTone: 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'slate';
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean;
  isActionableAlert: boolean;
  isMilestoneDay: boolean;
  dueDateFormatted: string;
}

export interface GovBillAlertItem {
  uid: string;
  source: 'ticket' | 'pos';
  id: string;
  docNumber: string;
  agencyName: string;
  customerName: string;
  orderNumber?: string;
  amount: number;
  billingSubmittedDate?: string;
  dueDate: string;
  dueDateFormatted: string;
  creditDays: number;
  billingStatus: GovBillingStatus;
  paidDate?: string;
  dueInfo: DueStatusInfo;
  isSnoozed: boolean;
  snoozedUntil?: string;
  snoozedDays?: number;
  ticket?: RepairTicket;
  posSale?: POSSaleRecord;
}

/**
 * Parses a YYYY-MM-DD (or ISO timestamp) into numeric { year, month, day } safely.
 * Returns null if invalid.
 */
export function parseDateYMD(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  const bkk = getBangkokDateTimeParts(parsed);
  return parseDateYMD(bkk.dateStr);
}

/**
 * Returns deterministic date & time components in Thailand time (Asia/Bangkok, UTC+7).
 */
export function getBangkokDateTimeParts(date: Date = new Date()): {
  dateStr: string;
  hour: number;
  minute: number;
  timeStr: string;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: THAILAND_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = p.value;
    }
  }
  const hourNum = parseInt(map.hour || '0', 10) % 24;
  const minuteNum = parseInt(map.minute || '0', 10) % 60;
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  const timeStr = `${String(hourNum).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}`;
  return {
    dateStr,
    hour: hourNum,
    minute: minuteNum,
    timeStr
  };
}

/**
 * Returns current date string YYYY-MM-DD in Asia/Bangkok timezone.
 */
export function getBangkokTodayStr(date: Date = new Date()): string {
  return getBangkokDateTimeParts(date).dateStr;
}

/**
 * Pure calendar day addition on YYYY-MM-DD using UTC midnight (immune to DST/local TZ).
 */
export function addDaysToDateStr(startDateStr: string, days: number): string {
  const parsed = parseDateYMD(startDateStr);
  if (!parsed) return '';
  const utc = Date.UTC(parsed.year, parsed.month - 1, parsed.day + (Number(days) || 0));
  const d = new Date(utc);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Computes integer day difference: dueDate - referenceDate (both treated as calendar dates).
 * Positive = remaining days, 0 = due today, Negative = overdue days.
 */
export function diffBangkokDays(
  dueDateStr?: string,
  referenceDateStr: string = getBangkokTodayStr()
): number | null {
  const due = parseDateYMD(dueDateStr);
  const ref = parseDateYMD(referenceDateStr);
  if (!due || !ref) return null;
  const dueMs = Date.UTC(due.year, due.month - 1, due.day);
  const refMs = Date.UTC(ref.year, ref.month - 1, ref.day);
  return Math.round((dueMs - refMs) / 86400000);
}

/**
 * Calculates due date based on a start date string (YYYY-MM-DD) and credit days.
 */
export function calculateGovDueDate(startDateStr: string, creditDays: number): string {
  if (!startDateStr) return '';
  const days = Number(creditDays);
  if (isNaN(days) || days < 0) return '';
  return addDaysToDateStr(startDateStr, days);
}

/**
 * Normalizes configurable alert days (e.g. "7/3/1" or [7, 3, 1]) into sorted descending positive integers.
 */
export function normalizeGovAlertDays(input?: string | number[]): number[] {
  let nums: number[] = [];
  if (Array.isArray(input)) {
    nums = input.map(n => Math.floor(Number(n)));
  } else if (typeof input === 'string') {
    nums = input
      .split(/[,/\s]+/)
      .map(s => Math.floor(Number(s.trim())));
  }
  const clean = Array.from(new Set(nums.filter(n => Number.isFinite(n) && n > 0 && n <= 365)));
  if (clean.length === 0) return [...DEFAULT_GOV_ALERT_DAYS];
  return clean.sort((a, b) => b - a);
}

/**
 * Backward-compatible helper to derive customer type from legacy or new records.
 */
export function getEffectiveCustomerType(record: {
  customerType?: CustomerType;
  paymentMethod?: string;
  govCreditInfo?: GovCreditInfo;
}): CustomerType {
  if (record.customerType === 'government' || record.customerType === 'general') {
    return record.customerType;
  }
  if (record.paymentMethod === 'gov_credit' || Boolean(record.govCreditInfo?.agencyName)) {
    return 'government';
  }
  return 'general';
}

/**
 * Backward-compatible check whether a government bill has been paid.
 */
export function isGovBillPaid(record: {
  isPaid?: boolean;
  govCreditInfo?: GovCreditInfo;
}): boolean {
  if (record.govCreditInfo?.billingStatus === 'paid') return true;
  if (record.govCreditInfo?.paidDate) return true;
  if (
    record.isPaid === true &&
    record.govCreditInfo?.billingStatus !== 'pending_billing' &&
    record.govCreditInfo?.billingStatus !== 'billed'
  ) {
    return true;
  }
  return false;
}

/**
 * Resolves the effective due date for a government bill (migration-safe fallback).
 */
export function resolveEffectiveGovDueDate(record: {
  govCreditInfo?: GovCreditInfo;
  receivedDate?: string;
  deliveredDate?: string;
  createdAt?: string;
}): string {
  const info = record.govCreditInfo;
  if (info?.dueDate) return info.dueDate;
  const submitted =
    info?.billingSubmittedDate ||
    info?.billedDate ||
    record.deliveredDate ||
    record.receivedDate ||
    (record.createdAt ? getBangkokTodayStr(new Date(record.createdAt)) : '');
  const creditDays = Number(info?.creditDays) > 0 ? Number(info?.creditDays) : 30;
  return submitted ? calculateGovDueDate(submitted, creditDays) : '';
}

/**
 * Returns true if the bill is currently snoozed on the given Bangkok date.
 */
export function isGovBillSnoozed(
  govCreditInfo?: GovCreditInfo,
  bangkokTodayStr: string = getBangkokTodayStr()
): boolean {
  if (!govCreditInfo?.snoozedUntil) return false;
  const diff = diffBangkokDays(govCreditInfo.snoozedUntil, bangkokTodayStr);
  return diff !== null && diff > 0;
}

/**
 * Evaluates the credit due status for a government bill strictly in Asia/Bangkok timezone.
 */
export function getGovCreditDueStatus(
  dueDateStr?: string,
  billingStatus: GovBillingStatus = 'pending_billing',
  referenceDateOrStr: Date | string = getBangkokTodayStr(),
  alertDays: number[] = DEFAULT_GOV_ALERT_DAYS,
  isPaidFlag?: boolean
): DueStatusInfo {
  const isPaid = billingStatus === 'paid' || (isPaidFlag === true && billingStatus !== 'pending_billing' && billingStatus !== 'billed');

  if (isPaid) {
    return {
      status: 'paid',
      daysDiff: 0,
      badgeLabel: 'รับเงินแล้ว',
      shortLabel: 'รับเงินแล้ว',
      badgeClass:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold',
      colorTone: 'green',
      isOverdue: false,
      isDueToday: false,
      isDueSoon: false,
      isActionableAlert: false,
      isMilestoneDay: false,
      dueDateFormatted: dueDateStr ? formatThaiDateFull(dueDateStr) : '-'
    };
  }

  if (!dueDateStr) {
    return {
      status: 'no_due',
      daysDiff: 0,
      badgeLabel: 'ไม่ระบุวันครบกำหนด',
      shortLabel: 'รอระบุวันครบกำหนด',
      badgeClass:
        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      colorTone: 'slate',
      isOverdue: false,
      isDueToday: false,
      isDueSoon: false,
      isActionableAlert: false,
      isMilestoneDay: false,
      dueDateFormatted: '-'
    };
  }

  const refDateStr =
    typeof referenceDateOrStr === 'string'
      ? referenceDateOrStr
      : getBangkokTodayStr(referenceDateOrStr);

  const diffDays = diffBangkokDays(dueDateStr, refDateStr);
  if (diffDays === null) {
    return {
      status: 'no_due',
      daysDiff: 0,
      badgeLabel: 'วันที่ไม่ถูกต้อง',
      shortLabel: 'วันที่ไม่ถูกต้อง',
      badgeClass:
        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      colorTone: 'slate',
      isOverdue: false,
      isDueToday: false,
      isDueSoon: false,
      isActionableAlert: false,
      isMilestoneDay: false,
      dueDateFormatted: dueDateStr
    };
  }

  const normalizedDays = normalizeGovAlertDays(alertDays);
  const maxAlertDay = Math.max(...normalizedDays);
  const dueDateFormatted = formatThaiDateFull(dueDateStr);

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      status: 'overdue',
      daysDiff: diffDays,
      badgeLabel: `เกินกำหนด ${overdueDays} วัน`,
      shortLabel: `เกิน ${overdueDays} วัน`,
      badgeClass:
        'bg-rose-100 text-rose-800 dark:bg-rose-950/90 dark:text-rose-200 border-rose-400 dark:border-rose-700 font-bold',
      colorTone: 'red',
      isOverdue: true,
      isDueToday: false,
      isDueSoon: false,
      isActionableAlert: true,
      isMilestoneDay: true,
      dueDateFormatted
    };
  }

  if (diffDays === 0) {
    return {
      status: 'due_today',
      daysDiff: 0,
      badgeLabel: 'ครบกำหนดวันนี้',
      shortLabel: 'ครบกำหนดวันนี้',
      badgeClass:
        'bg-orange-100 text-orange-900 dark:bg-orange-950/90 dark:text-orange-200 border-orange-400 dark:border-orange-700 font-bold',
      colorTone: 'orange',
      isOverdue: false,
      isDueToday: true,
      isDueSoon: false,
      isActionableAlert: true,
      isMilestoneDay: true,
      dueDateFormatted
    };
  }

  if (diffDays <= maxAlertDay) {
    const isMilestone = normalizedDays.includes(diffDays);
    return {
      status: 'due_soon',
      daysDiff: diffDays,
      badgeLabel: `ใกล้ครบกำหนด (เหลือ ${diffDays} วัน)`,
      shortLabel: `เหลือ ${diffDays} วัน`,
      badgeClass:
        'bg-amber-100 text-amber-900 dark:bg-amber-950/90 dark:text-amber-200 border-amber-400 dark:border-amber-700 font-bold',
      colorTone: 'yellow',
      isOverdue: false,
      isDueToday: false,
      isDueSoon: true,
      isActionableAlert: true,
      isMilestoneDay: isMilestone,
      dueDateFormatted
    };
  }

  return {
    status: 'within_credit',
    daysDiff: diffDays,
    badgeLabel: `เหลืออีก ${diffDays} วัน`,
    shortLabel: `อีก ${diffDays} วัน`,
    badgeClass:
      'bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    colorTone: 'blue',
    isOverdue: false,
    isDueToday: false,
    isDueSoon: false,
    isActionableAlert: false,
    isMilestoneDay: false,
    dueDateFormatted
  };
}

/**
 * Sorts government bills so longest-overdue bills appear first, then due today,
 * then closest due_soon, then within_credit, then paid.
 */
export function compareGovAlerts(a: GovBillAlertItem, b: GovBillAlertItem): number {
  const rank = (s: GovAlertStatus): number => {
    switch (s) {
      case 'overdue':
        return 0;
      case 'due_today':
        return 1;
      case 'due_soon':
        return 2;
      case 'within_credit':
        return 3;
      case 'no_due':
        return 4;
      case 'paid':
        return 5;
    }
  };
  const ra = rank(a.dueInfo.status);
  const rb = rank(b.dueInfo.status);
  if (ra !== rb) return ra - rb;
  // Within overdue: more negative daysDiff (longer overdue) comes FIRST
  // Within due_soon / within_credit: smaller positive daysDiff comes FIRST
  if (a.dueInfo.daysDiff !== b.dueInfo.daysDiff) {
    return a.dueInfo.daysDiff - b.dueInfo.daysDiff;
  }
  return b.amount - a.amount;
}

/**
 * Collects and normalizes government bills from both RepairTickets and POSSaleRecords.
 */
export function collectGovBillAlerts(
  tickets: RepairTicket[] = [],
  posSales: POSSaleRecord[] = [],
  alertDays: number[] = DEFAULT_GOV_ALERT_DAYS,
  options?: {
    includeSnoozed?: boolean;
    includePaid?: boolean;
    includeWithinCredit?: boolean;
    referenceDateStr?: string;
  }
): GovBillAlertItem[] {
  const refDateStr = options?.referenceDateStr || getBangkokTodayStr();
  const normalizedDays = normalizeGovAlertDays(alertDays);
  const items: GovBillAlertItem[] = [];

  for (const ticket of tickets) {
    if (ticket.status === 'cancelled') continue;
    if (getEffectiveCustomerType(ticket) !== 'government') continue;

    const paid = isGovBillPaid(ticket);
    const effectiveStatus: GovBillingStatus = paid
      ? 'paid'
      : ticket.govCreditInfo?.billingStatus || 'pending_billing';
    const dueDate = resolveEffectiveGovDueDate(ticket);
    const dueInfo = getGovCreditDueStatus(dueDate, effectiveStatus, refDateStr, normalizedDays, ticket.isPaid);
    const snoozed = !paid && isGovBillSnoozed(ticket.govCreditInfo, refDateStr);

    if (!options?.includePaid && dueInfo.status === 'paid') continue;
    if (!options?.includeWithinCredit && !dueInfo.isActionableAlert && dueInfo.status !== 'paid') continue;
    if (!options?.includeSnoozed && snoozed) continue;

    items.push({
      uid: `ticket:${ticket.id}`,
      source: 'ticket',
      id: ticket.id,
      docNumber: ticket.ticketNumber,
      agencyName: ticket.govCreditInfo?.agencyName || ticket.customerName,
      customerName: ticket.customerName,
      orderNumber: ticket.govCreditInfo?.orderNumber,
      amount: Number(ticket.totalAmount) || 0,
      billingSubmittedDate: ticket.govCreditInfo?.billingSubmittedDate || ticket.govCreditInfo?.billedDate,
      dueDate,
      dueDateFormatted: dueInfo.dueDateFormatted,
      creditDays: ticket.govCreditInfo?.creditDays || 30,
      billingStatus: effectiveStatus,
      paidDate: ticket.govCreditInfo?.paidDate,
      dueInfo,
      isSnoozed: snoozed,
      snoozedUntil: ticket.govCreditInfo?.snoozedUntil,
      snoozedDays: ticket.govCreditInfo?.snoozedDays,
      ticket
    });
  }

  for (const sale of posSales) {
    if (getEffectiveCustomerType(sale) !== 'government') continue;

    const paid = isGovBillPaid({ govCreditInfo: sale.govCreditInfo });
    const effectiveStatus: GovBillingStatus = paid
      ? 'paid'
      : sale.govCreditInfo?.billingStatus || 'pending_billing';
    const dueDate = resolveEffectiveGovDueDate(sale);
    const dueInfo = getGovCreditDueStatus(dueDate, effectiveStatus, refDateStr, normalizedDays);
    const snoozed = !paid && isGovBillSnoozed(sale.govCreditInfo, refDateStr);

    if (!options?.includePaid && dueInfo.status === 'paid') continue;
    if (!options?.includeWithinCredit && !dueInfo.isActionableAlert && dueInfo.status !== 'paid') continue;
    if (!options?.includeSnoozed && snoozed) continue;

    items.push({
      uid: `pos:${sale.id}`,
      source: 'pos',
      id: sale.id,
      docNumber: sale.receiptNumber,
      agencyName: sale.govCreditInfo?.agencyName || sale.customerName || 'หน่วยงานราชการ',
      customerName: sale.customerName || sale.govCreditInfo?.agencyName || 'หน่วยงานราชการ',
      orderNumber: sale.govCreditInfo?.orderNumber,
      amount: Number(sale.totalAmount) || 0,
      billingSubmittedDate: sale.govCreditInfo?.billingSubmittedDate || sale.govCreditInfo?.billedDate,
      dueDate,
      dueDateFormatted: dueInfo.dueDateFormatted,
      creditDays: sale.govCreditInfo?.creditDays || 30,
      billingStatus: effectiveStatus,
      paidDate: sale.govCreditInfo?.paidDate,
      dueInfo,
      isSnoozed: snoozed,
      snoozedUntil: sale.govCreditInfo?.snoozedUntil,
      snoozedDays: sale.govCreditInfo?.snoozedDays,
      posSale: sale
    });
  }

  return items.sort(compareGovAlerts);
}

