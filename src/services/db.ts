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
import { RepairTicket, InventoryItem, ShopSettings } from '../types';
import { INITIAL_TICKETS, INITIAL_INVENTORY, INITIAL_SHOP_SETTINGS } from '../utils/mockSeedData';

const LOCAL_STORAGE_KEYS = {
  TICKETS: 'fixpro_repair_tickets',
  INVENTORY: 'fixpro_inventory',
  SETTINGS: 'fixpro_shop_settings',
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

class DatabaseService {
  private isOnlineFirestore: boolean = true;

  // Initialize and Seed Default Data if empty
  async initializeAndSeed(): Promise<void> {
    try {
      // Initialize settings if empty
      const settingsRef = doc(db, 'shop_settings', 'default');
      const settingsSnap = await getDoc(settingsRef).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'shop_settings/default');
      });

      if (!settingsSnap || !settingsSnap.exists()) {
        await setDoc(settingsRef, INITIAL_SHOP_SETTINGS).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, 'shop_settings/default');
        });
      }

      // Check inventory
      const invSnap = await getDocs(collection(db, 'inventory')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'inventory');
      });

      if (invSnap && invSnap.empty) {
        for (const item of INITIAL_INVENTORY) {
          await setDoc(doc(db, 'inventory', item.id), item).catch(err => {
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
          await setDoc(doc(db, 'repair_tickets', ticket.id), ticket).catch(err => {
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
      }
    }
  }

  // --- Real-time Subscriptions ---
  subscribeTickets(callback: (tickets: RepairTicket[]) => void): () => void {
    try {
      return onSnapshot(
        collection(db, 'repair_tickets'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: RepairTicket[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as RepairTicket);
            });
            // Sort by createdAt descending
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setLocal(LOCAL_STORAGE_KEYS.TICKETS, list);
            callback(list);
          } else {
            // Check local fallback
            const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
            callback(local);
          }
        },
        (error) => {
          console.warn('Snapshot error on repair_tickets:', error);
          const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
          callback(local);
        }
      );
    } catch {
      const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
      callback(local);
      return () => {};
    }
  }

  subscribeInventory(callback: (items: InventoryItem[]) => void): () => void {
    try {
      return onSnapshot(
        collection(db, 'inventory'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: InventoryItem[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as InventoryItem);
            });
            list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
            setLocal(LOCAL_STORAGE_KEYS.INVENTORY, list);
            callback(list);
          } else {
            const local = getLocal<InventoryItem[]>(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
            callback(local);
          }
        },
        (error) => {
          console.warn('Snapshot error on inventory:', error);
          const local = getLocal<InventoryItem[]>(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
          callback(local);
        }
      );
    } catch {
      const local = getLocal<InventoryItem[]>(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
      callback(local);
      return () => {};
    }
  }

  subscribeSettings(callback: (settings: ShopSettings) => void): () => void {
    try {
      return onSnapshot(
        doc(db, 'shop_settings', 'default'),
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as ShopSettings;
            setLocal(LOCAL_STORAGE_KEYS.SETTINGS, data);
            callback(data);
          } else {
            const local = getLocal<ShopSettings>(LOCAL_STORAGE_KEYS.SETTINGS, INITIAL_SHOP_SETTINGS);
            callback(local);
          }
        },
        (error) => {
          console.warn('Snapshot error on shop_settings:', error);
          const local = getLocal<ShopSettings>(LOCAL_STORAGE_KEYS.SETTINGS, INITIAL_SHOP_SETTINGS);
          callback(local);
        }
      );
    } catch {
      const local = getLocal<ShopSettings>(LOCAL_STORAGE_KEYS.SETTINGS, INITIAL_SHOP_SETTINGS);
      callback(local);
      return () => {};
    }
  }

  // --- Repair Tickets Operations ---
  async saveTicket(ticket: RepairTicket, previousParts: typeof ticket.partsUsed = []): Promise<void> {
    try {
      await setDoc(doc(db, 'repair_tickets', ticket.id), ticket);
    } catch (e) {
      console.warn('Firestore write failed, saving to local:', e);
    }

    // Always sync local
    const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
    const idx = local.findIndex(t => t.id === ticket.id);
    if (idx >= 0) {
      local[idx] = ticket;
    } else {
      local.unshift(ticket);
    }
    setLocal(LOCAL_STORAGE_KEYS.TICKETS, local);

    // Auto-deduct inventory if parts were added or changed
    this.reconcilePartsStock(ticket.partsUsed, previousParts);
  }

  async updateTicketStatus(ticketId: string, status: RepairTicket['status'], extraData: Partial<RepairTicket> = {}): Promise<void> {
    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      status,
      updatedAt: now,
      ...extraData
    };
    if (status === 'repaired' || status === 'ready_pickup') {
      updatePayload.completedDate = extraData.completedDate || new Date().toISOString().split('T')[0];
    } else if (status === 'completed') {
      updatePayload.deliveredDate = extraData.deliveredDate || new Date().toISOString().split('T')[0];
      if (extraData.isPaid === undefined) {
        updatePayload.isPaid = true;
      }
    }

    try {
      await updateDoc(doc(db, 'repair_tickets', ticketId), updatePayload);
    } catch (e) {
      console.warn('Firestore update failed, fallback to local:', e);
    }

    // Update local
    const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS);
    const idx = local.findIndex(t => t.id === ticketId);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...updatePayload };
      setLocal(LOCAL_STORAGE_KEYS.TICKETS, local);
    }
  }

  async deleteTicket(ticketId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'repair_tickets', ticketId));
    } catch (e) {
      console.warn('Firestore delete failed:', e);
    }
    const local = getLocal<RepairTicket[]>(LOCAL_STORAGE_KEYS.TICKETS, INITIAL_TICKETS).filter(t => t.id !== ticketId);
    setLocal(LOCAL_STORAGE_KEYS.TICKETS, local);
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
      t => t.ticketNumber.toUpperCase() === clean ||
           t.id.toUpperCase() === clean ||
           t.customerPhone.replace(/[^0-9]/g, '') === clean.replace(/[^0-9]/g, '')
    ) || null;
  }

  // --- Inventory Operations ---
  async saveInventoryItem(item: InventoryItem): Promise<void> {
    try {
      await setDoc(doc(db, 'inventory', item.id), item);
    } catch (e) {
      console.warn('Firestore inventory save failed:', e);
    }
    const local = getLocal<InventoryItem[]>(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
    const idx = local.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      local[idx] = item;
    } else {
      local.push(item);
    }
    setLocal(LOCAL_STORAGE_KEYS.INVENTORY, local);
  }

  async adjustStock(itemId: string, diffQuantity: number): Promise<void> {
    const local = getLocal<InventoryItem[]>(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
    const target = local.find(i => i.id === itemId);
    if (!target) return;

    const newQty = Math.max(0, target.stockQuantity + diffQuantity);
    target.stockQuantity = newQty;
    target.updatedAt = new Date().toISOString();

    try {
      await updateDoc(doc(db, 'inventory', itemId), {
        stockQuantity: newQty,
        updatedAt: target.updatedAt
      });
    } catch (e) {
      console.warn('Firestore adjustStock failed:', e);
    }
    setLocal(LOCAL_STORAGE_KEYS.INVENTORY, local);
  }

  async deleteInventoryItem(itemId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
    } catch (e) {
      console.warn('Firestore delete inventory failed:', e);
    }
    const local = getLocal<InventoryItem[]>(LOCAL_STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY).filter(i => i.id !== itemId);
    setLocal(LOCAL_STORAGE_KEYS.INVENTORY, local);
  }

  private async reconcilePartsStock(newParts: RepairTicket['partsUsed'], oldParts: RepairTicket['partsUsed']): Promise<void> {
    // Calculate difference
    const mapDiff = new Map<string, number>();

    // Reverse old usage (add back to stock)
    for (const op of oldParts) {
      mapDiff.set(op.itemId, (mapDiff.get(op.itemId) || 0) + op.quantity);
    }
    // Deduct new usage
    for (const np of newParts) {
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
    const payload = { ...settings, updatedAt: new Date().toISOString() };
    try {
      await setDoc(doc(db, 'shop_settings', 'default'), payload);
    } catch (e) {
      console.warn('Firestore saveSettings failed:', e);
    }
    setLocal(LOCAL_STORAGE_KEYS.SETTINGS, payload);
  }

  // Helper to generate next Ticket Number: REP-YYYYMMDD-001
  generateNextTicketNumber(existingTickets: RepairTicket[]): string {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `REP-${dateStr}-`;

    const todaysTickets = existingTickets.filter(t => t.ticketNumber?.startsWith(prefix));
    let maxSeq = 0;
    for (const t of todaysTickets) {
      const parts = t.ticketNumber.split('-');
      if (parts.length >= 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return `${prefix}${nextSeq}`;
  }
}

export const dbService = new DatabaseService();
