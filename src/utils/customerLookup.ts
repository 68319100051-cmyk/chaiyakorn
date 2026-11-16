import { RepairTicket, POSSaleRecord, DeviceType, GovCreditInfo } from '../types';
import { calculateTicketWarranty, WarrantyCalculationResult } from './warranty';
import { getTicketDevices } from './ticketDevices';

export interface CustomerDeviceHistory {
  deviceType: DeviceType;
  brand: string;
  model: string;
  serialNumber?: string;
  color?: string;
  accessories?: string[];
  problemDescription?: string;
  ticketNumber: string;
  ticketDate: string;
  deliveredDate?: string;
  technicianName?: string;
  warrantyCalculation?: WarrantyCalculationResult;
  isUnderWarranty?: boolean;
  warrantyDaysRemaining?: number;
}

export interface ReturningCustomerProfile {
  key: string;                         // Unique key (normalized phone or name)
  customerName: string;
  customerPhone: string;
  customerLineId?: string;
  customerAddress?: string;
  govCreditInfo?: GovCreditInfo;
  devices: CustomerDeviceHistory[];
  totalVisits: number;
  latestTicketNumber: string;
  latestVisitDate: string;
  lastProblemDescription?: string;
}

export interface CustomerSearchResult {
  customer: ReturningCustomerProfile;
  matchedField: 'name' | 'phone' | 'model' | 'serial' | 'recent';
  matchedValue: string;
  suggestedDevice?: CustomerDeviceHistory;
  score: number; // Higher is better match
}

/**
 * Normalizes phone numbers by removing hyphens, spaces, and punctuation
 */
export function normalizePhone(phone: string): string {
  return (phone || '').replace(/[^0-9]/g, '');
}

/**
 * Common prefixes in Thai customer names
 */
const THAI_PREFIX_REGEX = /^(คุณ|นาย|นาง|นางสาว|ด\.ช\.|ด\.ญ\.|ช่าง|อาจารย์|ผอ\.|ครู|หจก\.|บจก\.|บริษัท|สำนักงาน|โรงเรียน|อบต\.|เทศบาล|รพ\.สต\.)\s*/i;

/**
 * Normalizes Thai names for comparison: trims, removes common honorific prefixes
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(THAI_PREFIX_REGEX, '');
}

/**
 * Extracts words/tokens from a name or text for multi-token prefix matching
 * e.g. "หจก. พัทลุงก่อสร้างและบริการ (คุณพรทิพย์)" -> ["หจก", "พัทลุงก่อสร้างและบริการ", "คุณพรทิพย์", "พรทิพย์"]
 */
export function extractSearchTokens(text: string): string[] {
  if (!text) return [];
  const raw = text.toLowerCase();
  const tokens = new Set<string>();

  // Full raw and normalized
  tokens.add(raw.trim());
  const norm = normalizeName(text);
  if (norm) tokens.add(norm);

  // Split by whitespace, parentheses, brackets, dots, commas, hyphens, slashes
  const parts = raw.split(/[\s\(\)\[\]\.\,\-\/\\]+/).filter(Boolean);
  for (const p of parts) {
    tokens.add(p);
    const pNorm = normalizeName(p);
    if (pNorm) tokens.add(pNorm);
  }

  return Array.from(tokens);
}

/**
 * Builds customer profiles aggregated from all historical tickets and POS sales
 */
export function buildCustomerProfiles(
  tickets: RepairTicket[] = [],
  posSales: POSSaleRecord[] = []
): ReturningCustomerProfile[] {
  const profileMap = new Map<string, ReturningCustomerProfile>();

  // Process tickets in chronological order (oldest to newest so latest ticket info ends up on top)
  const sortedTickets = [...tickets].sort((a, b) => {
    const dateA = a.createdAt || a.receivedDate || '';
    const dateB = b.createdAt || b.receivedDate || '';
    return dateA.localeCompare(dateB);
  });

  for (const t of sortedTickets) {
    if (!t.customerName && !t.customerPhone) continue;

    const cleanPhone = normalizePhone(t.customerPhone);
    const cleanName = (t.customerName || '').trim();
    const profileKey = cleanPhone.length >= 9 ? `phone-${cleanPhone}` : `name-${cleanName.toLowerCase()}`;

    const existing = profileMap.get(profileKey);
    const warrantyCalc = calculateTicketWarranty(t);
    const ticketDevices = getTicketDevices(t);

    const deviceEntries: CustomerDeviceHistory[] = ticketDevices.map(dev => ({
      deviceType: dev.deviceType || 'printer',
      brand: dev.brand || 'อื่นๆ',
      model: dev.model || '',
      serialNumber: dev.serialNumber || '',
      color: dev.color || '',
      accessories: dev.accessories || [],
      problemDescription: dev.problemDescription || '',
      ticketNumber: t.ticketNumber,
      ticketDate: t.receivedDate || t.createdAt?.split('T')[0] || '',
      deliveredDate: t.deliveredDate,
      technicianName: t.technicianName,
      warrantyCalculation: warrantyCalc,
      isUnderWarranty: !warrantyCalc.isExpired && (warrantyCalc.status === 'active' || warrantyCalc.status === 'expiring_soon'),
      warrantyDaysRemaining: warrantyCalc.daysRemaining
    }));

    if (existing) {
      existing.totalVisits += 1;
      existing.customerName = cleanName || existing.customerName;
      if (cleanPhone) existing.customerPhone = t.customerPhone || existing.customerPhone;
      if (t.customerLineId) existing.customerLineId = t.customerLineId;
      if (t.customerAddress) existing.customerAddress = t.customerAddress;
      if (t.govCreditInfo) existing.govCreditInfo = t.govCreditInfo;

      for (const deviceEntry of deviceEntries) {
        const duplicateDevice = existing.devices.some(
          d => d.model.toLowerCase() === deviceEntry.model.toLowerCase() &&
               d.serialNumber === deviceEntry.serialNumber
        );
        if (!duplicateDevice && (deviceEntry.model || deviceEntry.brand)) {
          existing.devices.unshift(deviceEntry);
        }
      }

      existing.latestTicketNumber = t.ticketNumber;
      existing.latestVisitDate = t.receivedDate || t.createdAt?.split('T')[0] || existing.latestVisitDate;
      existing.lastProblemDescription = t.problemDescription || existing.lastProblemDescription;
    } else {
      profileMap.set(profileKey, {
        key: profileKey,
        customerName: cleanName,
        customerPhone: t.customerPhone || '',
        customerLineId: t.customerLineId || '',
        customerAddress: t.customerAddress || '',
        govCreditInfo: t.govCreditInfo,
        devices: deviceEntries.filter(d => d.model || d.brand),
        totalVisits: 1,
        latestTicketNumber: t.ticketNumber,
        latestVisitDate: t.receivedDate || t.createdAt?.split('T')[0] || '',
        lastProblemDescription: t.problemDescription || ''
      });
    }
  }

  // Also include POS sales customers
  for (const s of posSales) {
    if (!s.customerName && !s.customerPhone) continue;
    const cleanPhone = normalizePhone(s.customerPhone || '');
    const cleanName = (s.customerName || '').trim();
    if (!cleanName && !cleanPhone) continue;

    const profileKey = cleanPhone.length >= 9 ? `phone-${cleanPhone}` : `name-${cleanName.toLowerCase()}`;
    const existing = profileMap.get(profileKey);

    if (existing) {
      existing.totalVisits += 1;
      if (!existing.customerAddress && s.customerPhone) {
        existing.customerPhone = s.customerPhone;
      }
      if (!existing.govCreditInfo && s.govCreditInfo) {
        existing.govCreditInfo = s.govCreditInfo;
      }
    } else {
      profileMap.set(profileKey, {
        key: profileKey,
        customerName: cleanName,
        customerPhone: s.customerPhone || '',
        customerLineId: '',
        customerAddress: '',
        govCreditInfo: s.govCreditInfo,
        devices: [],
        totalVisits: 1,
        latestTicketNumber: s.receiptNumber,
        latestVisitDate: s.createdAt?.split('T')[0] || '',
        lastProblemDescription: 'ซื้อสินค้าหน้าร้าน (POS)'
      });
    }
  }

  return Array.from(profileMap.values());
}

/**
 * Searches for matching returning customers based on:
 * - Customer Name (starts with, word starts with, or includes — supports 1-char queries like "ป" or "ก")
 * - Customer Phone (digits start with or includes)
 * - Device Model (starts with or includes)
 * - Serial Number (starts with or includes)
 * If query is empty: returns recent customers for instant pick!
 */
export function searchReturningCustomers(
  profiles: ReturningCustomerProfile[],
  query: string,
  targetField?: 'name' | 'phone' | 'model' | 'all'
): CustomerSearchResult[] {
  const rawQ = (query || '').trim();

  // If query is empty, return top recent customers so user can pick immediately when focusing an empty field!
  if (rawQ.length === 0) {
    return profiles.slice(0, 6).map(profile => ({
      customer: profile,
      matchedField: 'recent',
      matchedValue: profile.customerName,
      suggestedDevice: profile.devices[0],
      score: 10
    }));
  }

  const lowerQ = rawQ.toLowerCase();
  const cleanQPhone = normalizePhone(rawQ);
  const normalizedQName = normalizeName(rawQ);

  const results: CustomerSearchResult[] = [];

  for (const profile of profiles) {
    let score = 0;
    let matchedField: 'name' | 'phone' | 'model' | 'serial' | null = null;
    let matchedValue = '';
    let suggestedDevice: CustomerDeviceHistory | undefined = undefined;

    const profileRawName = profile.customerName.toLowerCase();
    const profileCleanPhone = normalizePhone(profile.customerPhone);
    const nameTokens = extractSearchTokens(profile.customerName);

    // 1. Phone matching
    if ((!targetField || targetField === 'phone' || targetField === 'all') && cleanQPhone.length >= 1) {
      if (profileCleanPhone.startsWith(cleanQPhone)) {
        score = 100 + (10 - profileCleanPhone.indexOf(cleanQPhone));
        matchedField = 'phone';
        matchedValue = profile.customerPhone;
      } else if (profileCleanPhone.includes(cleanQPhone)) {
        score = 60;
        matchedField = 'phone';
        matchedValue = profile.customerPhone;
      }
    }

    // 2. Name matching (even 1 letter like "ป", "ก", "ส")
    if (!targetField || targetField === 'name' || targetField === 'all') {
      let nameScore = 0;

      // Prefix match on full name or tokens (highest rank)
      if (profileRawName.startsWith(lowerQ)) {
        nameScore = 120;
      } else if (nameTokens.some(tok => tok.startsWith(lowerQ) || (normalizedQName && tok.startsWith(normalizedQName)))) {
        nameScore = 110;
      } else if (profileRawName.includes(lowerQ) || (normalizedQName && profileRawName.includes(normalizedQName))) {
        nameScore = 70;
      }

      if (nameScore > score) {
        score = nameScore;
        matchedField = 'name';
        matchedValue = profile.customerName;
      }
    }

    // 3. Model & Brand matching
    if (!targetField || targetField === 'model' || targetField === 'all') {
      for (const dev of profile.devices) {
        const devModel = dev.model.toLowerCase();
        const devBrand = dev.brand.toLowerCase();
        let modelScore = 0;

        if (devModel.startsWith(lowerQ) || devBrand.startsWith(lowerQ)) {
          modelScore = 115;
        } else if (devModel.includes(lowerQ) || devBrand.includes(lowerQ)) {
          modelScore = 65;
        }

        if (modelScore > score) {
          score = modelScore;
          matchedField = 'model';
          matchedValue = `${dev.brand} ${dev.model}`;
          suggestedDevice = dev;
        }
      }
    }

    // 4. Serial number matching
    if (!targetField || targetField === 'all') {
      for (const dev of profile.devices) {
        if (dev.serialNumber) {
          const sn = dev.serialNumber.toLowerCase();
          if (sn.startsWith(lowerQ)) {
            if (110 > score) {
              score = 110;
              matchedField = 'serial';
              matchedValue = `S/N: ${dev.serialNumber}`;
              suggestedDevice = dev;
            }
          } else if (sn.includes(lowerQ)) {
            if (60 > score) {
              score = 60;
              matchedField = 'serial';
              matchedValue = `S/N: ${dev.serialNumber}`;
              suggestedDevice = dev;
            }
          }
        }
      }
    }

    if (matchedField && score > 0) {
      results.push({
        customer: profile,
        matchedField,
        matchedValue,
        suggestedDevice: suggestedDevice || profile.devices[0],
        score
      });
    }
  }

  // Sort results: highest match score first, then by total visits descending
  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.customer.totalVisits - a.customer.totalVisits;
  });
}

/**
 * Searches distinct historical values for any text input field
 * (e.g. addresses, LINE IDs, technician names, problem descriptions, etc.)
 */
export function searchHistoricalFieldValues(
  tickets: RepairTicket[] = [],
  field: 'customerAddress' | 'customerLineId' | 'technicianName' | 'problemDescription' | 'serialNumber' | 'color',
  query: string
): string[] {
  const rawQ = (query || '').trim().toLowerCase();
  const values = new Set<string>();

  for (const t of tickets) {
    const val = (t[field] as string | undefined || '').trim();
    if (val && val.length > 0) {
      values.add(val);
    }
  }

  const allList = Array.from(values);

  if (!rawQ) {
    return allList.slice(0, 6);
  }

  // Prefix match first, then includes
  const prefixMatches: string[] = [];
  const includeMatches: string[] = [];

  for (const item of allList) {
    const lower = item.toLowerCase();
    if (lower.startsWith(rawQ)) {
      prefixMatches.push(item);
    } else if (lower.includes(rawQ)) {
      includeMatches.push(item);
    }
  }

  return [...prefixMatches, ...includeMatches].slice(0, 6);
}
