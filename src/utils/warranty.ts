import { RepairTicket } from '../types';
import { normalizePhone } from './customerLookup';

export interface WarrantyCalculationResult {
  hasWarranty: boolean;
  warrantyDays: number;
  startDate: string;           // YYYY-MM-DD
  expiryDate: string;          // YYYY-MM-DD
  isExpired: boolean;
  daysRemaining: number;       // > 0 = days left, <= 0 = days expired
  totalDays: number;
  progressPercent: number;     // 0-100% of warranty duration elapsed
  status: 'active' | 'expiring_soon' | 'expired' | 'no_warranty' | 'pending_delivery';
  badgeLabel: string;
  badgeClass: string;
  descriptionText: string;
}

export interface ActiveWarrantyMatch {
  ticket: RepairTicket;
  warrantyResult: WarrantyCalculationResult;
  matchType: 'serial' | 'phone_model' | 'name_model';
}

export const WARRANTY_PRESETS = [
  { days: 0, label: 'ไม่มีประกัน' },
  { days: 7, label: '7 วัน' },
  { days: 15, label: '15 วัน' },
  { days: 30, label: '30 วัน (มาตรฐาน)' },
  { days: 60, label: '60 วัน (2 เดือน)' },
  { days: 90, label: '90 วัน (3 เดือน)' },
  { days: 180, label: '6 เดือน' },
  { days: 365, label: '1 ปี' }
];

/**
 * Calculates warranty period, expiry date, and days remaining for a repair ticket
 */
export function calculateTicketWarranty(
  ticket: RepairTicket,
  referenceDateInput?: string | Date
): WarrantyCalculationResult {
  const warrantyDays = ticket.warrantyDays !== undefined ? ticket.warrantyDays : 30;

  if (warrantyDays <= 0) {
    return {
      hasWarranty: false,
      warrantyDays: 0,
      startDate: '',
      expiryDate: '',
      isExpired: true,
      daysRemaining: 0,
      totalDays: 0,
      progressPercent: 100,
      status: 'no_warranty',
      badgeLabel: 'ไม่มีประกัน',
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700',
      descriptionText: 'ไม่มีการรับประกันงานซ่อม'
    };
  }

  // Warranty start date prefers deliveredDate, then completedDate, then receivedDate
  const startDateStr = ticket.deliveredDate || ticket.completedDate || ticket.receivedDate || '';
  if (!startDateStr) {
    return {
      hasWarranty: true,
      warrantyDays,
      startDate: '',
      expiryDate: '',
      isExpired: false,
      daysRemaining: warrantyDays,
      totalDays: warrantyDays,
      progressPercent: 0,
      status: 'pending_delivery',
      badgeLabel: `ประกัน ${warrantyDays} วัน (เริ่มเมื่อส่งมอบ)`,
      badgeClass: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      descriptionText: `รับประกัน ${warrantyDays} วัน เริ่มนับจากวันที่ลูกค้ารับเครื่อง`
    };
  }

  const startDate = new Date(startDateStr);
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + warrantyDays);
  const expiryDateStr = expiryDate.toISOString().split('T')[0];

  const now = referenceDateInput
    ? (typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : referenceDateInput)
    : new Date();
  
  // Normalize both dates to midnight for fair day-based calculation
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryMidnight = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.round((expiryMidnight.getTime() - nowMidnight.getTime()) / msPerDay);
  const daysElapsed = Math.round((nowMidnight.getTime() - startMidnight.getTime()) / msPerDay);
  const progressPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / warrantyDays) * 100)));

  // If ticket is not yet delivered or completed, it's pending delivery
  const isPending = ticket.status !== 'completed' && !ticket.deliveredDate;

  if (isPending) {
    return {
      hasWarranty: true,
      warrantyDays,
      startDate: startDateStr,
      expiryDate: expiryDateStr,
      isExpired: false,
      daysRemaining: warrantyDays,
      totalDays: warrantyDays,
      progressPercent: 0,
      status: 'pending_delivery',
      badgeLabel: `ประกัน ${warrantyDays} วัน (เริ่มเมื่อรับเครื่อง)`,
      badgeClass: 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      descriptionText: `รับประกันงานซ่อม ${warrantyDays} วัน (เริ่มนับจากวันส่งมอบเครื่อง)`
    };
  }

  if (daysRemaining > 0) {
    if (daysRemaining <= 7) {
      return {
        hasWarranty: true,
        warrantyDays,
        startDate: startDateStr,
        expiryDate: expiryDateStr,
        isExpired: false,
        daysRemaining,
        totalDays: warrantyDays,
        progressPercent,
        status: 'expiring_soon',
        badgeLabel: `⏳ ประกันใกล้หมด (เหลืออีก ${daysRemaining} วัน)`,
        badgeClass: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800 shadow-xs animate-pulse',
        descriptionText: `อยู่ในระยะประกัน (เหลืออีก ${daysRemaining} วัน ถึง ${expiryDateStr})`
      };
    }

    return {
      hasWarranty: true,
      warrantyDays,
      startDate: startDateStr,
      expiryDate: expiryDateStr,
      isExpired: false,
      daysRemaining,
      totalDays: warrantyDays,
      progressPercent,
      status: 'active',
      badgeLabel: `🛡️ ในประกัน (เหลืออีก ${daysRemaining} วัน)`,
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 shadow-xs',
      descriptionText: `อยู่ในระยะรับประกันงานซ่อม (เหลืออีก ${daysRemaining} วัน ถึง ${expiryDateStr})`
    };
  }

  // Expired
  const daysExpired = Math.abs(daysRemaining);
  return {
    hasWarranty: true,
    warrantyDays,
    startDate: startDateStr,
    expiryDate: expiryDateStr,
    isExpired: true,
    daysRemaining,
    totalDays: warrantyDays,
    progressPercent: 100,
    status: 'expired',
    badgeLabel: daysExpired === 0 ? 'หมดประกันวันนี้' : `หมดประกันแล้ว (${daysExpired} วันที่แล้ว)`,
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    descriptionText: `หมดระยะประกันงานซ่อมเมื่อ ${expiryDateStr}`
  };
}

/**
 * Searches historical tickets to find if this customer or device currently has an ACTIVE warranty
 */
export function checkActiveWarranty(
  allTickets: RepairTicket[],
  query: {
    customerPhone?: string;
    customerName?: string;
    serialNumber?: string;
    model?: string;
    brand?: string;
    excludeTicketId?: string;
  }
): ActiveWarrantyMatch | null {
  if (!allTickets || allTickets.length === 0) return null;

  const cleanPhone = normalizePhone(query.customerPhone || '');
  const cleanSerial = (query.serialNumber || '').trim().toLowerCase();
  const cleanModel = (query.model || '').trim().toLowerCase();
  const cleanName = (query.customerName || '').trim().toLowerCase();

  // Find candidate completed/delivered tickets
  const candidates = allTickets.filter(t => {
    if (query.excludeTicketId && (t.id === query.excludeTicketId || t.ticketNumber === query.excludeTicketId)) {
      return false;
    }
    // Must be a finished repair
    return t.status === 'completed' || t.status === 'ready_pickup' || t.deliveredDate;
  });

  // 1. First priority: Exact Serial Number match (most accurate)
  if (cleanSerial.length >= 4) {
    for (const t of candidates) {
      if (t.serialNumber && t.serialNumber.trim().toLowerCase() === cleanSerial) {
        const warranty = calculateTicketWarranty(t);
        if (!warranty.isExpired && warranty.status !== 'no_warranty') {
          return {
            ticket: t,
            warrantyResult: warranty,
            matchType: 'serial'
          };
        }
      }
    }
  }

  // 2. Second priority: Phone + Model match
  if (cleanPhone.length >= 9 && cleanModel.length >= 2) {
    for (const t of candidates) {
      const tPhone = normalizePhone(t.customerPhone);
      const tModel = (t.model || '').toLowerCase();
      if (tPhone === cleanPhone && (tModel.includes(cleanModel) || cleanModel.includes(tModel))) {
        const warranty = calculateTicketWarranty(t);
        if (!warranty.isExpired && warranty.status !== 'no_warranty') {
          return {
            ticket: t,
            warrantyResult: warranty,
            matchType: 'phone_model'
          };
        }
      }
    }
  }

  // 3. Third priority: Name + Model match
  if (cleanName.length >= 3 && cleanModel.length >= 2) {
    for (const t of candidates) {
      const tName = (t.customerName || '').toLowerCase();
      const tModel = (t.model || '').toLowerCase();
      if (tName.includes(cleanName) && (tModel.includes(cleanModel) || cleanModel.includes(tModel))) {
        const warranty = calculateTicketWarranty(t);
        if (!warranty.isExpired && warranty.status !== 'no_warranty') {
          return {
            ticket: t,
            warrantyResult: warranty,
            matchType: 'name_model'
          };
        }
      }
    }
  }

  return null;
}
