export type DeviceType = 'computer' | 'laptop' | 'printer' | 'other';

export type RepairStatus =
  | 'pending'        // รอดำเนินการ / รับเครื่องแล้ว
  | 'diagnosing'     // กำลังตรวจสอบ / กำลังซ่อม
  | 'waiting_parts'  // รออะไหล่
  | 'repaired'       // ซ่อมเสร็จเรียบร้อย
  | 'ready_pickup'   // พร้อมส่งมอบ / รอรับเครื่อง
  | 'completed'      // ส่งมอบแล้ว / รับเครื่องแล้ว
  | 'cancelled';     // ยกเลิก / ซ่อมไม่ได้

export interface UsedPart {
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface RepairTicket {
  id: string;
  ticketNumber: string;               // เช่น REP-20261026-001
  customerName: string;
  customerPhone: string;
  customerLineId?: string;
  customerAddress?: string;
  deviceType: DeviceType;
  brand: string;
  model: string;
  serialNumber?: string;
  color?: string;
  accessories: string[];              // สายไฟ, อะแดปเตอร์, สาย USB, ตลับหมึก, ถาดกระดาษ, กระเป๋า
  problemDescription: string;         // อาการเสียที่ลูกค้าระบุ
  initialConditionNotes?: string;     // สภาพตัวเครื่องเบื้องต้น รอยตำหนิ
  technicianNotes?: string;           // บันทึกการตรวจเช็คและการซ่อมของช่าง
  technicianName?: string;            // ช่างผู้รับผิดชอบ
  status: RepairStatus;
  estimatedCost: number;              // ราคาประเมิน
  laborCost: number;                  // ค่าแรง/ค่าบริการ
  partsCost: number;                  // ค่าอะไหล่รวม
  discount: number;                   // ส่วนลด
  totalAmount: number;                // ยอดสุทธิ
  isPaid: boolean;                    // ชำระเงินแล้วหรือยัง
  paymentMethod?: 'cash' | 'transfer' | 'credit' | 'unpaid';
  partsUsed: UsedPart[];              // รายการอะไหล่ที่ใช้
  trackingToken?: string;             // รหัสสำหรับเช็คสถานะ
  lineNotified: boolean;              // แจ้งเตือนไลน์แล้วหรือยัง
  lastLineNotifiedAt?: string;
  receivedDate: string;               // วันที่รับเครื่อง
  estimatedCompletionDate?: string;   // วันที่คาดว่าจะเสร็จ
  completedDate?: string;             // วันที่ซ่อมเสร็จ
  deliveredDate?: string;             // วันที่ส่งมอบเครื่อง
  createdAt: string;
  updatedAt: string;
}

export type InventoryCategory =
  | 'computer_parts'  // อะไหล่คอมพิวเตอร์
  | 'printer_parts'   // อะไหล่ปริ้นเตอร์
  | 'printer_ink'     // หมึกพิมพ์ / โทนเนอร์
  | 'consumables'     // วัสดุสิ้นเปลือง / ซับหมึก / ซิลิโคน
  | 'accessories'     // อุปกรณ์ต่อพ่วง & ขายหน้าร้าน
  | 'tools';          // เครื่องมือช่าง

export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: InventoryCategory;
  brand: string;
  modelCompatibility?: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  unit: string;                       // ชิ้น, กล่อง, ขวด, ตลับ, แผ่น, หลอด
  locationShelf?: string;             // ตู้/ชั้นวาง เช่น A-01, P-02
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShopSettings {
  id: string;
  shopName: string;
  shopPhone: string;
  shopLineId: string;
  shopAddress: string;
  taxId?: string;
  receiptFooterMessage: string;
  warrantyTerms: string;
  lineNotifyToken?: string;
  lineNotifyEnabled: boolean;
  updatedAt: string;
}

export const STATUS_CONFIG: Record<
  RepairStatus,
  { label: string; bg: string; text: string; border: string; step: number; desc: string }
> = {
  pending: {
    label: 'รับเครื่องแล้ว / รอดำเนินการ',
    bg: 'bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-800',
    step: 1,
    desc: 'เครื่องอยู่ในคิวรอการตรวจสอบเบื้องต้น'
  },
  diagnosing: {
    label: 'กำลังตรวจเช็ค / กำลังซ่อม',
    bg: 'bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-800',
    step: 2,
    desc: 'ช่างกำลังตรวจวิเคราะห์อาการเสียและทำการแก้ไข'
  },
  waiting_parts: {
    label: 'รออะไหล่',
    bg: 'bg-purple-500/10',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-300 dark:border-purple-800',
    step: 3,
    desc: 'กำลังรอการจัดส่งอะไหล่ที่ต้องใช้ทดแทน'
  },
  repaired: {
    label: 'ซ่อมเสร็จแล้ว (ทดสอบผ่าน)',
    bg: 'bg-teal-500/10',
    text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-300 dark:border-teal-800',
    step: 4,
    desc: 'ซ่อมเสร็จและผ่านการทดสอบการใช้งานเรียบร้อย'
  },
  ready_pickup: {
    label: 'พร้อมส่งมอบ (รอรับเครื่อง)',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-800',
    step: 5,
    desc: 'เครื่องพร้อมส่งมอบ ลูกค้าสามารถมารับได้ทันที'
  },
  completed: {
    label: 'ส่งมอบแล้ว / ปิดงาน',
    bg: 'bg-gray-500/10',
    text: 'text-gray-700 dark:text-gray-400',
    border: 'border-gray-300 dark:border-gray-700',
    step: 6,
    desc: 'ลูกค้าตรวจรับเครื่องและชำระค่าบริการเรียบร้อย'
  },
  cancelled: {
    label: 'ยกเลิก / ซ่อมไม่ได้',
    bg: 'bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-300 dark:border-rose-800',
    step: 0,
    desc: 'ยกเลิกการซ่อมหรือส่งคืนเนื่องจากไม่มีอะไหล่'
  }
};

export const DEVICE_LABELS: Record<DeviceType, { label: string; icon: string }> = {
  computer: { label: 'คอมพิวเตอร์ตั้งโต๊ะ (PC)', icon: 'Monitor' },
  laptop: { label: 'โน้ตบุ๊ก (Notebook/Laptop)', icon: 'Laptop' },
  printer: { label: 'เครื่องพิมพ์ (Printer)', icon: 'Printer' },
  other: { label: 'อุปกรณ์อื่นๆ', icon: 'Cpu' }
};

export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  computer_parts: 'อะไหล่คอมพิวเตอร์ (CPU/RAM/SSD/PSU)',
  printer_parts: 'อะไหล่ปริ้นเตอร์ (หัวพิมพ์/ลูกยาง/สายแพร)',
  printer_ink: 'หมึกพิมพ์ / โทนเนอร์เลเซอร์',
  consumables: 'วัสดุสิ้นเปลือง / ซับหมึก / ซิลิโคน',
  accessories: 'อุปกรณ์เสริม & สินค้าหน้าร้าน',
  tools: 'เครื่องมือช่างและอุปกรณ์ทดสอบ'
};
