import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { RepairTicket, InventoryItem, ShopSettings, POSSaleRecord } from '../types';
import { INITIAL_TICKETS, INITIAL_INVENTORY, INITIAL_SHOP_SETTINGS } from '../utils/mockSeedData';

const LOCAL_STORAGE_KEYS = {
  TICKETS: 'fixpro_repair_tickets',
  INVENTORY: 'fixpro_inventory',
  SETTINGS: 'fixpro_shop_settings',
  POS_SALES: 'fixpro_pos_sales',
  SEEDED: 'fixpro_data_seeded_v1'
};

// Local storage fallback helpers
function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write error', e);
  }
}

/**
 * Recursively strips undefined values so Firestore setDoc / updateDoc will not crash.
 * Firestore strictly forbids 'undefined' field values.
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

class DatabaseService {
  private isOnlineFirestore: boolean = true;
  private ticketSubscribers: Set<(tickets: RepairTicket[]) => void> = new Set();
  private inventorySubscribers: Set<(items: InventoryItem[]) => void> = new Set();
  private settingsSubscribers: Set<(settings: ShopSettings) => void> = new Set();
  private posSalesSubscribers: Set<(sales: POSSaleRecord[]) => void> = new Set();

  private notifyTickets(list: RepairTicket[]) {
    this.ticketSubscribers.forEach(cb => {
      try { cb(list); } catch (e) { console.warn('Ticket subscriber error:', e); }
    });
  }

  private notifyInventory(list: InventoryItem[]) {
    this.inventorySubscribers.forEach(cb => {
      try { cb(list); } catch (e) { console.warn('Inventory subscriber error:', e); }
    });
  }

  private notifySettings(data: ShopSettings) {
    this.settingsSubscribers.forEach(cb => {
      try { cb(data); } catch (e) { console.warn('Settings subscriber error:', e); }
    });
  }

  private notifyPOSSales(list: POSSaleRecord[]) {
    this.posSalesSubscribers.forEach(cb => {
      try { cb(list); } catch (e) { console.warn('POS Sales subscriber error:', e); }
    });
  }

  // Initialize and Seed Default Data if empty
  async initializeAndSeed(): Promise<void> {
    try {
      // Initialize settings if empty
      const settingsRef = doc(db, 'shop_settings', 'default');
      const settingsSnap = await getDoc(settingsRef).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'shop_settings/default');
      });

      if (!settingsSnap || !settingsSnap.exists() || (settingsSnap.data() as any)?.shopName?.includes('FixPro')) {
        await setDoc(settingsRef, cleanFirestoreData(INITIAL_SHOP_SETTINGS)).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, 'shop_settings/default');
        });
      }

      const localSett = getLocal<ShopSettings | null>(LOCAL_STORAGE_KEYS.SETTINGS, null);
      if (!localSett || localSett.shopName?.includes('FixPro')) {
        setLocal(LOCAL_STORAGE_KEYS.SETTINGS, INITIAL_SHOP_SETTINGS);
        this.notifySettings(INITIAL_SHOP_SETTINGS);
      }

      // Check inventory
      const invSnap = await getDocs(collection(db, 'inventory')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'inventory');
      });

      if (invSnap && invSnap.empty) {
        for (const item of INITIAL_INVENTORY) {
          await setDoc(doc(db, 'inventory', item.id), cleanFirestoreData(item)).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `inventory/${item.id}`);
          });
        }
      }

      // Check tickets
      const ticketsSnap = await getDocs(collection(db, 'repair_tickets')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'repair_tickets');
      });

      if (ticketsSnap && ticketsSnap.empty) {
        for (const ticket of INITIAL_TICKETS) {
          await setDoc(doc(db, 'repair_tickets', ticket.id), cleanFirestoreData(ticket)).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `repair_tickets/${ticket.id}`);
          });
        }
      }
      this.isOnlineFirestore = true;
    } catch (e) {
      console.warn('Using Local Storage fallback for seeding:', e);
      this.isOnlineFirestore = false;
      if (!localStorage.getItem(LOCAL_STORAGE_KEYS.SEEDED)) {
        setLocal(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
        setLocal(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
        setLocal(LOCAL_STORAGE_KEYS.SETTINGS, INITIAL_SHOP_SETTINGS);
        localStorage.setItem(LOCAL_STORAGE_KEYS.SEEDED, 'true');
        this.notifyTickets(INITIAL_TICKETS);
        this.notifyInventory(INITIAL_INVENTORY);
        this.notifySettings(INITIAL_SHOP_SETTINGS);
      }
    }
  }

  // --- Real-time Subscriptions ---
  subscribeTickets(callback: (tickets: RepairTicket[]) => void): () => void {
    this.ticketSubscribers.add(callback);

    // Provide immediate initial data from local storage
    const initialLocal = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
    callback(initialLocal);

    let unsubFirestore = () => {};
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'repair_tickets'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: RepairTicket[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as RepairTicket);
            });
            // Sort by createdAt descending
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setLocal(LOCAL_STORAGE_KEYS.TICKETS, list);
            this.notifyTickets(list);
          } else {
            const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
            this.notifyTickets(local);
          }
        },
        (error) => {
          console.warn('Snapshot error on repair_tickets:', error);
          const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
          this.notifyTickets(local);
        }
      );
    } catch (err) {
      console.warn('Error setting up onSnapshot for tickets:', err);
    }

    return () => {
      this.ticketSubscribers.delete(callback);
      unsubFirestore();
    };
  }

  subscribeInventory(callback: (items: InventoryItem[]) => void): () => void {
    this.inventorySubscribers.add(callback);

    const initialLocal = getLocal<InventoryItem[]>(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
    callback(initialLocal);

    let unsubFirestore = () => {};
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'inventory'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: InventoryItem[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as InventoryItem);
            });
            list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
            setLocal(LOCAL_STORAGE_KEYS.INVENTORY, list);
            this.notifyInventory(list);
          } else {
            const local = getLocal<InventoryItem[]>(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
            this.notifyInventory(local);
          }
        },
        (error) => {
          console.warn('Snapshot error on inventory:', error);
          const local = getLocal<InventoryItem[]>(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
          this.notifyInventory(local);
        }
      );
    } catch (err) {
      console.warn('Error setting up onSnapshot for inventory:', err);
    }

    return () => {
      this.inventorySubscribers.delete(callback);
      unsubFirestore();
    };
  }

  subscribeSettings(callback: (settings: ShopSettings) => void): () => void {
    this.settingsSubscribers.add(callback);

    const initialLocal = getLocal<ShopSettings>(LOCAL_STORAGE_KEYS.SETTINGS, INITIAL_SHOP_SETTINGS);
    callback(initialLocal);

    let unsubFirestore = () => {};
    try {
      unsubFirestore = onSnapshot(
        doc(db, 'shop_settings', 'default'),
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as ShopSettings;
            setLocal(LOCAL_STORAGE_KEYS.SETTINGS, data);
            this.notifySettings(data);
          } else {
            const local = getLocal<ShopSettings>(LOCAL_STORAGE_KEYS.SETTINGS, INITIAL_SHOP_SETTINGS);
            this.notifySettings(local);
          }
        },
        (error) => {
          console.warn('Snapshot error on shop_settings:', error);
          const local = getLocal<ShopSettings>(LOCAL_STORAGE_KEYS.SETTINGS, INITIAL_SHOP_SETTINGS);
          this.notifySettings(local);
        }
      );
    } catch (err) {
      console.warn('Error setting up onSnapshot for shop_settings:', err);
    }

    return () => {
      this.settingsSubscribers.delete(callback);
      unsubFirestore();
    };
  }

  subscribePOSSales(callback: (sales: POSSaleRecord[]) => void): () => void {
    this.posSalesSubscribers.add(callback);

    const initialLocal = getLocal<POSSaleRecord[]>(LOCAL_STORAGE_KEYS.POS_SALES, []);
    callback(initialLocal);

    let unsubFirestore = () => {};
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'pos_sales'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: POSSaleRecord[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as POSSaleRecord);
            });
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setLocal(LOCAL_STORAGE_KEYS.POS_SALES, list);
            this.notifyPOSSales(list);
          } else {
            const local = getLocal<POSSaleRecord[]>(LOCAL_STORAGE_KEYS.POS_SALES, []);
            this.notifyPOSSales(local);
          }
        },
        (error) => {
          console.warn('Snapshot error on pos_sales:', error);
          const local = getLocal<POSSaleRecord[]>(LOCAL_STORAGE_KEYS.POS_SALES, []);
          this.notifyPOSSales(local);
        }
      );
    } catch (err) {
      console.warn('Error setting up onSnapshot for pos_sales:', err);
    }

    return () => {
      this.posSalesSubscribers.delete(callback);
      unsubFirestore();
    };
  }

  // --- Repair Tickets Operations ---
  async saveTicket(ticket: RepairTicket, previousParts: typeof ticket.partsUsed = []): Promise<void> {
    // 1. Sanitize ticket to ensure no undefined values are sent to Firestore
    const cleanedTicket = cleanFirestoreData(ticket);

    // 2. Always sync and notify local immediately so UI updates instantly
    const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
    const idx = local.findIndex(t => t.id === ticket.id);
    if (idx >= 0) {
      local[idx] = cleanedTicket;
    } else {
      local.unshift(cleanedTicket);
    }
    setLocal(LOCAL_STORAGE_KEYS.TICKETS, local);
    this.notifyTickets(local);

    // 3. Persist to Firestore
    try {
      await setDoc(doc(db, 'repair_tickets', ticket.id), cleanedTicket);
    } catch (e) {
      console.warn('Firestore write failed, using local storage state:', e);
    }

    // 4. Auto-deduct inventory if parts were added or changed
    this.reconcilePartsStock(ticket.partsUsed || [], previousParts || []);
  }

  async updateTicketStatus(ticketId: string, status?: RepairTicket['status'], extraData: Partial<RepairTicket> = {}): Promise<void> {
    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      updatedAt: now,
      ...extraData
    };
    if (status) {
      updatePayload.status = status;
    }
    if (status === 'repaired' || status === 'ready_pickup') {
      updatePayload.completedDate = extraData.completedDate || new Date().toISOString().split('T')[0];
    } else if (status === 'completed') {
      updatePayload.deliveredDate = extraData.deliveredDate || new Date().toISOString().split('T')[0];
      if (extraData.isPaid === undefined) {
        updatePayload.isPaid = true;
      }
    }

    const cleanedPayload = cleanFirestoreData(updatePayload);

    // Update local immediately
    const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
    const idx = local.findIndex(t => t.id === ticketId);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...cleanedPayload };
      setLocal(LOCAL_STORAGE_KEYS.TICKETS, local);
      this.notifyTickets(local);
    }

    try {
      await updateDoc(doc(db, 'repair_tickets', ticketId), cleanedPayload);
    } catch (e) {
      console.warn('Firestore update failed, fallback to local:', e);
    }
  }

  async updateTicketBillingStatus(
    ticketId: string,
    billingStatus: import('../types').GovBillingStatus,
    extra?: {
      billedDate?: string;
      paidDate?: string;
      notes?: string;
      disbursementNumber?: string;
      disbursementDate?: string;
      transferRef?: string;
    }
  ): Promise<void> {
    const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
    const idx = local.findIndex(t => t.id === ticketId);
    if (idx >= 0) {
      const existing = local[idx];
      const now = new Date().toISOString().split('T')[0];
      const updatedGovInfo = existing.govCreditInfo
        ? {
            ...existing.govCreditInfo,
            billingStatus,
            ...(billingStatus === 'billed' && !existing.govCreditInfo.billedDate ? { billedDate: now } : {}),
            ...(billingStatus === 'paid' && !existing.govCreditInfo.paidDate ? { paidDate: now } : {}),
            ...(extra?.billedDate ? { billedDate: extra.billedDate } : {}),
            ...(extra?.paidDate ? { paidDate: extra.paidDate } : {}),
            ...(extra?.notes !== undefined ? { notes: extra.notes } : {}),
            ...(extra?.disbursementNumber !== undefined ? { disbursementNumber: extra.disbursementNumber } : {}),
            ...(extra?.disbursementDate !== undefined ? { disbursementDate: extra.disbursementDate } : {}),
            ...(extra?.transferRef !== undefined ? { transferRef: extra.transferRef } : {})
          }
        : undefined;

      const updatedTicket: RepairTicket = {
        ...existing,
        isPaid: billingStatus === 'paid' ? true : existing.isPaid,
        govCreditInfo: updatedGovInfo,
        updatedAt: new Date().toISOString()
      };

      local[idx] = updatedTicket;
      setLocal(LOCAL_STORAGE_KEYS.TICKETS, local);
      this.notifyTickets(local);

      try {
        await updateDoc(doc(db, 'repair_tickets', ticketId), cleanFirestoreData({
          isPaid: billingStatus === 'paid' ? true : existing.isPaid,
          govCreditInfo: updatedGovInfo,
          updatedAt: new Date().toISOString()
        }));
      } catch (e) {
        console.warn('Firestore update ticket billing status failed:', e);
      }
    }
  }

  async deleteTicket(ticketId: string): Promise<void> {
    const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS).filter(t => t.id !== ticketId);
    setLocal(LOCAL_STORAGE_KEYS.TICKETS, local);
    this.notifyTickets(local);

    try {
      await deleteDoc(doc(db, 'repair_tickets', ticketId));
    } catch (e) {
      console.warn('Firestore delete failed:', e);
    }
  }

  // Look up ticket by Ticket Number or ID (for public QR code tracking)
  async getTicketForTracking(query: string): Promise<RepairTicket | null> {
    const clean = query.trim().toUpperCase();
    if (!clean) return null;

    // First check firestore by doc id
    try {
      const snap = await getDoc(doc(db, 'repair_tickets', query.trim()));
      if (snap.exists()) {
        return snap.data() as RepairTicket;
      }
    } catch {}

    // Next check by ticketNumber in firestore
    try {
      const allDocs = await getDocs(collection(db, 'repair_tickets'));
      for (const d of allDocs.docs) {
        const data = d.data() as RepairTicket;
        if (data.ticketNumber?.toUpperCase() === clean || data.id === clean || data.customerPhone === clean) {
          return data;
        }
      }
    } catch {}

    // Fallback local search
    const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
    return local.find(
      t => t.ticketNumber?.toUpperCase() === clean ||
           t.id?.toUpperCase() === clean ||
           t.customerPhone?.replace(/[^0-9]/g, '') === clean.replace(/[^0-9]/g, '')
    ) || null;
  }

  // Subscribe to real-time updates for a single ticket by ticketNumber or ID
  subscribeSingleTicket(queryKey: string, callback: (ticket: RepairTicket | null) => void): () => void {
    const clean = queryKey.trim().toUpperCase();
    if (!clean) {
      callback(null);
      return () => {};
    }

    // Try listening to the entire collection to find the matching document dynamically
    try {
      return onSnapshot(
        collection(db, 'repair_tickets'),
        (snapshot) => {
          let found: RepairTicket | null = null;
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as RepairTicket;
            if (
              data.ticketNumber?.toUpperCase() === clean ||
              data.id?.toUpperCase() === clean ||
              data.trackingToken?.toUpperCase() === clean
            ) {
              found = data;
            }
          });

          if (found) {
            callback(found);
          } else {
            // Check fallback local
            const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
            const localMatch = local.find(
              t => t.ticketNumber?.toUpperCase() === clean ||
                   t.id?.toUpperCase() === clean ||
                   t.trackingToken?.toUpperCase() === clean
            ) || null;
            callback(localMatch);
          }
        },
        (error) => {
          console.warn('Single ticket snapshot error:', error);
          const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
          const localMatch = local.find(
            t => t.ticketNumber?.toUpperCase() === clean || t.id?.toUpperCase() === clean
          ) || null;
          callback(localMatch);
        }
      );
    } catch {
      const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
      const localMatch = local.find(
        t => t.ticketNumber?.toUpperCase() === clean || t.id?.toUpperCase() === clean
      ) || null;
      callback(localMatch);
      return () => {};
    }
  }

  // --- Inventory Operations ---
  async saveInventoryItem(item: InventoryItem): Promise<void> {
    const cleaned = cleanFirestoreData(item);
    const local = getLocal<InventoryItem[]>(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
    const idx = local.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      local[idx] = cleaned;
    } else {
      local.push(cleaned);
    }
    setLocal(LOCAL_STORAGE_KEYS.INVENTORY, local);
    this.notifyInventory(local);

    try {
      await setDoc(doc(db, 'inventory', item.id), cleaned);
    } catch (e) {
      console.warn('Firestore inventory save failed:', e);
    }
  }

  async adjustStock(itemId: string, diffQuantity: number): Promise<void> {
    const local = getLocal<InventoryItem[]>(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
    const target = local.find(i => i.id === itemId);
    if (!target) return;

    const newQty = Math.max(0, target.stockQuantity + diffQuantity);
    target.stockQuantity = newQty;
    target.updatedAt = new Date().toISOString();

    setLocal(LOCAL_STORAGE_KEYS.INVENTORY, local);
    this.notifyInventory(local);

    try {
      await updateDoc(doc(db, 'inventory', itemId), {
        stockQuantity: newQty,
        updatedAt: target.updatedAt
      });
    } catch (e) {
      console.warn('Firestore adjustStock failed:', e);
    }
  }

  async deleteInventoryItem(itemId: string): Promise<void> {
    const local = getLocal<InventoryItem[]>(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY).filter(i => i.id !== itemId);
    setLocal(LOCAL_STORAGE_KEYS.INVENTORY, local);
    this.notifyInventory(local);

    try {
      await deleteDoc(doc(db, 'inventory', itemId));
    } catch (e) {
      console.warn('Firestore delete inventory failed:', e);
    }
  }

  private async reconcilePartsStock(newParts: RepairTicket['partsUsed'] = [], oldParts: RepairTicket['partsUsed'] = []): Promise<void> {
    const mapDiff = new Map<string, number>();

    // Reverse old usage (add back to stock)
    for (const op of (oldParts || [])) {
      mapDiff.set(op.itemId, (mapDiff.get(op.itemId) || 0) + op.quantity);
    }
    // Deduct new usage
    for (const np of (newParts || [])) {
      mapDiff.set(np.itemId, (mapDiff.get(np.itemId) || 0) - np.quantity);
    }

    for (const [itemId, netDiff] of mapDiff.entries()) {
      if (netDiff !== 0) {
        await this.adjustStock(itemId, netDiff);
      }
    }
  }

  // --- Settings ---
  async saveSettings(settings: ShopSettings): Promise<void> {
    const payload = cleanFirestoreData({ ...settings, updatedAt: new Date().toISOString() });
    setLocal(LOCAL_STORAGE_KEYS.SETTINGS, payload);
    this.notifySettings(payload);

    try {
      await setDoc(doc(db, 'shop_settings', 'default'), payload);
    } catch (e) {
      console.warn('Firestore saveSettings failed:', e);
    }
  }

  // Helper to generate next Ticket Number: REP-YYYYMMDD-001
  generateNextTicketNumber(existingTickets: RepairTicket[] = []): string {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `REP-${dateStr}-`;

    const list = Array.isArray(existingTickets) && existingTickets.length > 0
      ? existingTickets
      : getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);

    const todaysTickets = list.filter(t => t?.ticketNumber?.startsWith(prefix));
    let maxSeq = 0;
    for (const t of todaysTickets) {
      if (t?.ticketNumber) {
        const parts = t.ticketNumber.split('-');
        if (parts.length >= 3) {
          const seq = parseInt(parts[2], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    }
    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return `${prefix}${nextSeq}`;
  }

  // --- POS Operations ---
  async savePOSSale(sale: POSSaleRecord): Promise<void> {
    const cleaned = cleanFirestoreData(sale);

    // 1. Deduct stock for items in cart
    for (const item of sale.items) {
      if (item.inventoryItemId) {
        await this.adjustStock(item.inventoryItemId, -item.quantity);
      }
    }

    // 2. Save sale record locally and notify
    const local = getLocal<POSSaleRecord[]>(LOCAL_STORAGE_KEYS.POS_SALES, []);
    const idx = local.findIndex(s => s.id === sale.id);
    if (idx >= 0) {
      local[idx] = cleaned;
    } else {
      local.unshift(cleaned);
    }
    setLocal(LOCAL_STORAGE_KEYS.POS_SALES, local);
    this.notifyPOSSales(local);

    // 3. Write to Firestore
    try {
      await setDoc(doc(db, 'pos_sales', sale.id), cleaned);
    } catch (e) {
      console.warn('Firestore pos_sales save failed:', e);
    }
  }

  async deletePOSSale(saleId: string): Promise<void> {
    const local = getLocal<POSSaleRecord[]>(LOCAL_STORAGE_KEYS.POS_SALES, []).filter(s => s.id !== saleId);
    setLocal(LOCAL_STORAGE_KEYS.POS_SALES, local);
    this.notifyPOSSales(local);

    try {
      await deleteDoc(doc(db, 'pos_sales', saleId));
    } catch (e) {
      console.warn('Firestore delete pos_sale failed:', e);
    }
  }

  async updatePOSSaleBillingStatus(
    saleId: string,
    billingStatus: import('../types').GovBillingStatus,
    extra?: {
      billedDate?: string;
      paidDate?: string;
      notes?: string;
      disbursementNumber?: string;
      disbursementDate?: string;
      transferRef?: string;
    }
  ): Promise<void> {
    const local = getLocal<POSSaleRecord[]>(LOCAL_STORAGE_KEYS.POS_SALES, []);
    const idx = local.findIndex(s => s.id === saleId);
    if (idx >= 0) {
      const existing = local[idx];
      const now = new Date().toISOString().split('T')[0];
      const updatedGovInfo = existing.govCreditInfo
        ? {
            ...existing.govCreditInfo,
            billingStatus,
            ...(billingStatus === 'billed' && !existing.govCreditInfo.billedDate ? { billedDate: now } : {}),
            ...(billingStatus === 'paid' && !existing.govCreditInfo.paidDate ? { paidDate: now } : {}),
            ...(extra?.billedDate ? { billedDate: extra.billedDate } : {}),
            ...(extra?.paidDate ? { paidDate: extra.paidDate } : {}),
            ...(extra?.notes !== undefined ? { notes: extra.notes } : {}),
            ...(extra?.disbursementNumber !== undefined ? { disbursementNumber: extra.disbursementNumber } : {}),
            ...(extra?.disbursementDate !== undefined ? { disbursementDate: extra.disbursementDate } : {}),
            ...(extra?.transferRef !== undefined ? { transferRef: extra.transferRef } : {})
          }
        : undefined;

      const updatedSale: POSSaleRecord = {
        ...existing,
        govCreditInfo: updatedGovInfo
      };

      local[idx] = updatedSale;
      setLocal(LOCAL_STORAGE_KEYS.POS_SALES, local);
      this.notifyPOSSales(local);

      try {
        await updateDoc(doc(db, 'pos_sales', saleId), cleanFirestoreData({ govCreditInfo: updatedGovInfo }));
      } catch (e) {
        console.warn('Firestore update pos_sale billing status failed:', e);
      }
    }
  }

  generateNextPOSReceiptNumber(existingSales: POSSaleRecord[] = []): string {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `POS-${dateStr}-`;

    const list = Array.isArray(existingSales) && existingSales.length > 0
      ? existingSales
      : getLocal<POSSaleRecord[]>(LOCAL_STORAGE_KEYS.POS_SALES, []);

    const todaysSales = list.filter(s => s?.receiptNumber?.startsWith(prefix));
    let maxSeq = 0;
    for (const s of todaysSales) {
      if (s?.receiptNumber) {
        const parts = s.receiptNumber.split('-');
        if (parts.length >= 3) {
          const seq = parseInt(parts[2], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    }
    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return `${prefix}${nextSeq}`;
  }
}

export const dbService = new DatabaseService();
