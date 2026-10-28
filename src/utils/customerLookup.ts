import { RepairTicket, POSSaleRecord, DeviceType, GovCreditInfo } from '../types';

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
  matchedField: 'name' | 'phone' | 'model' | 'serial';
  matchedValue: string;
  suggestedDevice?: CustomerDeviceHistory;
}

/**
 * Normalizes phone numbers by removing hyphens, spaces, and punctuation
 */
export function normalizePhone(phone: string): string {
  return (phone || '').replace(/[^0-9]/g, '');
}

/**
 * Normalizes Thai names for comparison: trims, removes common honorific prefixes
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/^(คุณ|นาย|นาง|นางสาว|ด\.ช\.|ด\.ญ\.|ช่าง|อาจารย์|ผอ\.|ครู)\s*/i, '');
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
    // Unique key: prefer phone if at least 9 digits, otherwise clean name
    const profileKey = cleanPhone.length >= 9 ? `phone-${cleanPhone}` : `name-${cleanName.toLowerCase()}`;

    const existing = profileMap.get(profileKey);

    const deviceEntry: CustomerDeviceHistory = {
      deviceType: t.deviceType || 'printer',
      brand: t.brand || 'อื่นๆ',
      model: t.model || '',
      serialNumber: t.serialNumber || '',
      color: t.color || '',
      accessories: t.accessories || [],
      problemDescription: t.problemDescription || '',
      ticketNumber: t.ticketNumber,
      ticketDate: t.receivedDate || t.createdAt?.split('T')[0] || ''
    };

    if (existing) {
      existing.totalVisits += 1;
      existing.customerName = cleanName || existing.customerName;
      if (cleanPhone) existing.customerPhone = t.customerPhone || existing.customerPhone;
      if (t.customerLineId) existing.customerLineId = t.customerLineId;
      if (t.customerAddress) existing.customerAddress = t.customerAddress;
      if (t.govCreditInfo) existing.govCreditInfo = t.govCreditInfo;

      // Add device if not already recorded with the same model and serial
      const duplicateDevice = existing.devices.some(
        d => d.model.toLowerCase() === deviceEntry.model.toLowerCase() &&
             d.serialNumber === deviceEntry.serialNumber
      );
      if (!duplicateDevice && (deviceEntry.model || deviceEntry.brand)) {
        existing.devices.unshift(deviceEntry);
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
        devices: (deviceEntry.model || deviceEntry.brand) ? [deviceEntry] : [],
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
 * - Customer Name (starts with or includes)
 * - Customer Phone (digits start with or includes)
 * - Device Model (starts with or includes)
 * - Serial Number (starts with or includes)
 */
export function searchReturningCustomers(
  profiles: ReturningCustomerProfile[],
  query: string,
  targetField?: 'name' | 'phone' | 'model' | 'all'
): CustomerSearchResult[] {
  const rawQ = (query || '').trim();
  if (rawQ.length < 2) return [];

  const lowerQ = rawQ.toLowerCase();
  const cleanQPhone = normalizePhone(rawQ);
  const normalizedQName = normalizeName(rawQ);

  const results: CustomerSearchResult[] = [];

  for (const profile of profiles) {
    let matchedField: 'name' | 'phone' | 'model' | 'serial' | null = null;
    let matchedValue = '';
    let suggestedDevice: CustomerDeviceHistory | undefined = undefined;

    const profileRawName = profile.customerName.toLowerCase();
    const profileNormName = normalizeName(profile.customerName);
    const profileCleanPhone = normalizePhone(profile.customerPhone);

    // 1. Check Phone (if searching phone or all)
    if ((!targetField || targetField === 'phone' || targetField === 'all') && cleanQPhone.length >= 2) {
      if (profileCleanPhone.includes(cleanQPhone)) {
        matchedField = 'phone';
        matchedValue = profile.customerPhone;
      }
    }

    // 2. Check Name (if searching name or all, or not yet matched)
    if (!matchedField && (!targetField || targetField === 'name' || targetField === 'all')) {
      if (
        profileRawName.includes(lowerQ) ||
        (normalizedQName.length >= 2 && profileNormName.includes(normalizedQName)) ||
        profileRawName.startsWith(lowerQ) ||
        profileNormName.startsWith(normalizedQName)
      ) {
        matchedField = 'name';
        matchedValue = profile.customerName;
      }
    }

    // 3. Check Model (if searching model or all, or not yet matched)
    if (!matchedField && (!targetField || targetField === 'model' || targetField === 'all')) {
      const foundDevice = profile.devices.find(d =>
        d.model.toLowerCase().includes(lowerQ) ||
        d.brand.toLowerCase().includes(lowerQ)
      );
      if (foundDevice) {
        matchedField = 'model';
        matchedValue = `${foundDevice.brand} ${foundDevice.model}`;
        suggestedDevice = foundDevice;
      }
    }

    // 4. Check Serial Number
    if (!matchedField && (!targetField || targetField === 'all')) {
      const foundDevice = profile.devices.find(d =>
        d.serialNumber && d.serialNumber.toLowerCase().includes(lowerQ)
      );
      if (foundDevice) {
        matchedField = 'serial';
        matchedValue = `S/N: ${foundDevice.serialNumber}`;
        suggestedDevice = foundDevice;
      }
    }

    if (matchedField) {
      results.push({
        customer: profile,
        matchedField,
        matchedValue,
        suggestedDevice: suggestedDevice || profile.devices[0]
      });
    }
  }

  // Sort results: exact / prefix matches first, then by total visits descending
  return results.sort((a, b) => {
    // If targetField is specified, prioritize prefix match on that field
    if (targetField === 'name') {
      const aStarts = normalizeName(a.customer.customerName).startsWith(normalizedQName);
      const bStarts = normalizeName(b.customer.customerName).startsWith(normalizedQName);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
    } else if (targetField === 'phone') {
      const aStarts = normalizePhone(a.customer.customerPhone).startsWith(cleanQPhone);
      const bStarts = normalizePhone(b.customer.customerPhone).startsWith(cleanQPhone);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
    } else if (targetField === 'model') {
      const aModel = a.suggestedDevice?.model.toLowerCase() || '';
      const bModel = b.suggestedDevice?.model.toLowerCase() || '';
      const aStarts = aModel.startsWith(lowerQ);
      const bStarts = bModel.startsWith(lowerQ);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
    }
    return b.customer.totalVisits - a.customer.totalVisits;
  });
}
