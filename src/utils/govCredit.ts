import { GovCreditInfo, GovBillingStatus } from '../types';

export const CREDIT_DAYS_PRESETS = [
  { days: 15, label: '15 วัน (เร่งด่วน)' },
  { days: 30, label: '30 วัน (มาตรฐานราชการ)' },
  { days: 45, label: '45 วัน' },
  { days: 60, label: '60 วัน (โครงการใหญ่)' },
  { days: 90, label: '90 วัน' }
];

export interface DueStatusInfo {
  status: 'paid' | 'overdue' | 'due_soon' | 'within_credit' | 'no_due';
  daysDiff: number; // positive = days remaining, negative = days overdue
  badgeLabel: string;
  badgeClass: string;
  isOverdue: boolean;
  dueDateFormatted: string;
}

/**
 * Calculates due date based on a start date string (YYYY-MM-DD) and credit days
 */
export function calculateGovDueDate(startDateStr: string, creditDays: number): string {
  if (!startDateStr || creditDays <= 0) return '';
  const date = new Date(startDateStr);
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + creditDays);
  return date.toISOString().split('T')[0];
}

/**
 * Evaluates the credit due status for a government bill
 */
export function getGovCreditDueStatus(
  dueDateStr?: string,
  billingStatus: GovBillingStatus = 'pending_billing',
  referenceDate = new Date()
): DueStatusInfo {
  if (billingStatus === 'paid') {
    return {
      status: 'paid',
      daysDiff: 0,
      badgeLabel: 'ชำระแล้ว / เงินโอนเข้า',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      isOverdue: false,
      dueDateFormatted: dueDateStr ? new Date(dueDateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
    };
  }

  if (!dueDateStr) {
    return {
      status: 'no_due',
      daysDiff: 0,
      badgeLabel: 'ไม่ระบุวันครบกำหนด',
      badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      isOverdue: false,
      dueDateFormatted: '-'
    };
  }

  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) {
    return {
      status: 'no_due',
      daysDiff: 0,
      badgeLabel: 'วันที่ไม่ถูกต้อง',
      badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      isOverdue: false,
      dueDateFormatted: dueDateStr
    };
  }

  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - ref.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const dueDateFormatted = due.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      status: 'overdue',
      daysDiff: diffDays,
      badgeLabel: `🚨 เกินกำหนด ${overdueDays} วัน`,
      badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold animate-pulse',
      isOverdue: true,
      dueDateFormatted
    };
  }

  if (diffDays <= 7) {
    return {
      status: 'due_soon',
      daysDiff: diffDays,
      badgeLabel: diffDays === 0 ? '⏳ ครบกำหนดวันนี้!' : `⏳ ครบกำหนดใน ${diffDays} วัน`,
      badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold',
      isOverdue: false,
      dueDateFormatted
    };
  }

  return {
    status: 'within_credit',
    daysDiff: diffDays,
    badgeLabel: `⏱️ เหลืออีก ${diffDays} วัน`,
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    isOverdue: false,
    dueDateFormatted
  };
}
