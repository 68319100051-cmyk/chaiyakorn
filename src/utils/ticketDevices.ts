import {
  RepairTicket,
  RepairDeviceItem,
  UsedPart,
  DEVICE_LABELS,
  RepairStatus
} from '../types';

/**
 * Creates a blank RepairDeviceItem with sensible defaults
 */
export function createEmptyDeviceItem(overrides: Partial<RepairDeviceItem> = {}): RepairDeviceItem {
  return {
    id: overrides.id || `dev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    deviceType: overrides.deviceType || 'printer',
    brand: overrides.brand ?? 'Epson',
    model: overrides.model ?? '',
    serialNumber: overrides.serialNumber ?? '',
    color: overrides.color ?? '',
    accessories: Array.isArray(overrides.accessories) ? overrides.accessories : ['สายไฟ AC Power'],
    problemDescription: overrides.problemDescription ?? '',
    initialConditionNotes: overrides.initialConditionNotes ?? 'สภาพปกติ ไม่มีรอยแตกร้าวรุนแรง',
    technicianNotes: overrides.technicianNotes ?? '',
    status: overrides.status,
    estimatedCost: overrides.estimatedCost ?? 0,
    laborCost: overrides.laborCost ?? 300,
    partsCost: overrides.partsCost ?? 0,
    partsUsed: Array.isArray(overrides.partsUsed) ? overrides.partsUsed : []
  };
}

/**
 * Normalizes and migrates any RepairTicket (legacy 1-device or new N-device)
 * into a clean non-empty RepairDeviceItem[] array without mutating legacy data.
 */
export function getTicketDevices(ticket: RepairTicket | null | undefined): RepairDeviceItem[] {
  if (!ticket) return [];

  if (Array.isArray(ticket.devices) && ticket.devices.length > 0) {
    return ticket.devices.map((d, idx) => {
      const parts = Array.isArray(d.partsUsed) ? d.partsUsed : [];
      const computedPartsCost = parts.reduce((sum, p) => sum + (Number(p.totalPrice) || 0), 0);
      return {
        id: d.id || `dev-${ticket.id}-${idx + 1}`,
        deviceType: d.deviceType || ticket.deviceType || 'other',
        brand: d.brand || 'อื่นๆ',
        model: d.model || 'ไม่ระบุรุ่น',
        serialNumber: d.serialNumber || '',
        color: d.color || '',
        accessories: Array.isArray(d.accessories) ? d.accessories : [],
        problemDescription: d.problemDescription || 'ตรวจเช็คอาการทั่วไป',
        initialConditionNotes: d.initialConditionNotes || '',
        technicianNotes: d.technicianNotes || '',
        status: d.status || ticket.status,
        estimatedCost: Number(d.estimatedCost) || 0,
        laborCost: Number(d.laborCost) || 0,
        partsCost: Number(d.partsCost ?? computedPartsCost) || 0,
        partsUsed: parts
      };
    });
  }

  // Legacy single-device migration
  const legacyParts = Array.isArray(ticket.partsUsed) ? ticket.partsUsed : [];
  const legacyPartsCost =
    ticket.partsCost !== undefined
      ? Number(ticket.partsCost) || 0
      : legacyParts.reduce((sum, p) => sum + (Number(p.totalPrice) || 0), 0);

  return [
    {
      id: `dev-${ticket.id || 'legacy'}-1`,
      deviceType: ticket.deviceType || 'other',
      brand: ticket.brand || 'อื่นๆ',
      model: ticket.model || 'ไม่ระบุรุ่น',
      serialNumber: ticket.serialNumber || '',
      color: ticket.color || '',
      accessories: Array.isArray(ticket.accessories) ? ticket.accessories : [],
      problemDescription: ticket.problemDescription || 'ตรวจเช็คอาการทั่วไป',
      initialConditionNotes: ticket.initialConditionNotes || '',
      technicianNotes: ticket.technicianNotes || '',
      status: ticket.status,
      estimatedCost: Number(ticket.estimatedCost) || 0,
      laborCost: Number(ticket.laborCost) || 0,
      partsCost: legacyPartsCost,
      partsUsed: legacyParts
    }
  ];
}

/**
 * Aggregates all parts used across all devices of a ticket (preserving item grouping cleanly).
 */
export function getTicketAllParts(ticket: RepairTicket | null | undefined): UsedPart[] {
  if (!ticket) return [];
  const devices = getTicketDevices(ticket);
  if (devices.length <= 1) {
    return devices[0]?.partsUsed || ticket.partsUsed || [];
  }

  const combined: UsedPart[] = [];
  for (const dev of devices) {
    for (const p of dev.partsUsed || []) {
      combined.push({ ...p });
    }
  }
  return combined;
}

/**
 * Aggregates parts across devices into summed UsedPart entries by itemId (useful for stock reconciliation)
 */
export function flattenUsedPartsForStock(devices: RepairDeviceItem[]): UsedPart[] {
  const map = new Map<string, UsedPart>();
  for (const dev of devices) {
    for (const p of dev.partsUsed || []) {
      const existing = map.get(p.itemId);
      if (existing) {
        existing.quantity += Number(p.quantity) || 0;
        existing.totalPrice += Number(p.totalPrice) || 0;
      } else {
        map.set(p.itemId, { ...p });
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Synchronizes top-level ticket fields with devices[] so Firestore rules, legacy lists,
 * and dashboard queries always have accurate aggregated values.
 */
export function buildSyncedDevicePayload(
  devices: RepairDeviceItem[],
  ticketStatus: RepairStatus
): {
  devices: RepairDeviceItem[];
  deviceType: RepairTicket['deviceType'];
  brand: string;
  model: string;
  serialNumber: string;
  color: string;
  accessories: string[];
  problemDescription: string;
  initialConditionNotes: string;
  technicianNotes: string;
  laborCost: number;
  partsCost: number;
  partsUsed: UsedPart[];
} {
  const normalizedDevices = devices.map((d, idx) => {
    const parts = Array.isArray(d.partsUsed) ? d.partsUsed : [];
    const pCost = parts.reduce((sum, p) => sum + (Number(p.totalPrice) || 0), 0);
    return {
      ...d,
      id: d.id || `dev-${Date.now()}-${idx + 1}`,
      brand: (d.brand || 'อื่นๆ').trim(),
      model: (d.model || 'ไม่ระบุรุ่น').trim(),
      serialNumber: (d.serialNumber || '').trim(),
      color: (d.color || '').trim(),
      accessories: Array.isArray(d.accessories) ? d.accessories : [],
      problemDescription: (d.problemDescription || 'ตรวจเช็คอาการทั่วไป').trim(),
      initialConditionNotes: (d.initialConditionNotes || '').trim(),
      technicianNotes: (d.technicianNotes || '').trim(),
      status: d.status || ticketStatus,
      laborCost: Math.max(0, Number(d.laborCost) || 0),
      partsCost: pCost,
      partsUsed: parts
    };
  });

  const primary = normalizedDevices[0] || createEmptyDeviceItem();
  const totalLabor = normalizedDevices.reduce((sum, d) => sum + d.laborCost, 0);
  const totalPartsCost = normalizedDevices.reduce((sum, d) => sum + d.partsCost, 0);
  const combinedParts = flattenUsedPartsForStock(normalizedDevices);

  const uniqueAccessories = Array.from(
    new Set(normalizedDevices.flatMap(d => d.accessories || []))
  );

  const combinedProblem =
    normalizedDevices.length === 1
      ? primary.problemDescription
      : normalizedDevices
          .map((d, idx) => `[เครื่อง ${idx + 1}: ${d.brand} ${d.model}] ${d.problemDescription}`)
          .join(' | ');

  const combinedTechNotes =
    normalizedDevices.length === 1
      ? primary.technicianNotes || ''
      : normalizedDevices
          .filter(d => Boolean(d.technicianNotes))
          .map((d, idx) => `[เครื่อง ${idx + 1}] ${d.technicianNotes}`)
          .join(' | ');

  return {
    devices: normalizedDevices,
    deviceType: primary.deviceType,
    brand:
      normalizedDevices.length === 1
        ? primary.brand
        : `${primary.brand} (+${normalizedDevices.length - 1} เครื่อง)`,
    model:
      normalizedDevices.length === 1
        ? primary.model
        : primary.model,
    serialNumber: primary.serialNumber || '',
    color: primary.color || '',
    accessories: uniqueAccessories,
    problemDescription: combinedProblem,
    initialConditionNotes: primary.initialConditionNotes || '',
    technicianNotes: combinedTechNotes,
    laborCost: totalLabor,
    partsCost: totalPartsCost,
    partsUsed: combinedParts
  };
}

/**
 * Formats a concise human-readable device summary string for tables, tracking cards, and stubs
 */
export function formatDevicesSummary(ticket: RepairTicket | null | undefined): string {
  const devices = getTicketDevices(ticket);
  if (devices.length === 0) return '-';
  if (devices.length === 1) {
    const d = devices[0];
    return `${d.brand} ${d.model}${d.serialNumber ? ` (S/N: ${d.serialNumber})` : ''}`.trim();
  }
  return devices
    .map((d, i) => `${i + 1}. ${d.brand} ${d.model}`)
    .join(', ');
}

/**
 * Formats full device type + name line
 */
export function formatDeviceLabel(device: RepairDeviceItem): string {
  const typeLabel = DEVICE_LABELS[device.deviceType]?.label || device.deviceType;
  return `${typeLabel} ${device.brand} ${device.model}${device.serialNumber ? ` (S/N: ${device.serialNumber})` : ''}`.trim();
}
