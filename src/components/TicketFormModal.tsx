import React, { useState, useEffect } from 'react';
import {
  RepairTicket,
  InventoryItem,
  DeviceType,
  RepairStatus,
  UsedPart
} from '../types';
import {
  X,
  Plus,
  Trash2,
  Package,
  Wrench,
  User,
  Phone,
  Laptop,
  Printer,
  Monitor,
  Check,
  AlertCircle
} from 'lucide-react';

interface TicketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ticket: RepairTicket, previousParts: UsedPart[]) => void;
  ticketToEdit?: RepairTicket | null;
  inventory: InventoryItem[];
  allTickets: RepairTicket[];
  generateNextTicketNumber: () => string;
}

const COMMON_ACCESSORIES = [
  'สายไฟ AC Power',
  'อะแดปเตอร์ชาร์จ (Adapter)',
  'สายเชื่อมต่อ USB',
  'ตลับหมึก / แท็งก์หมึก',
  'ถาดใส่กระดาษ',
  'กระเป๋าโน้ตบุ๊ก',
  'เมาส์ / คีย์บอร์ด',
  'กล่องบรรจุภัณฑ์'
];

const PRINTER_BRANDS = ['Epson', 'Canon', 'HP', 'Brother', 'Fuji Xerox', 'Ricoh', 'Pantum'];
const PC_BRANDS = ['ASUS', 'Acer', 'Dell', 'HP', 'Lenovo', 'MSI', 'Custom PC (ประกอบ)', 'Apple'];

const PRINTER_PROBLEMS = [
  'หัวพิมพ์ตัน / พิมพ์ไม่ออก / สีขาดหาย',
  'ไฟส้มกะพริบแจ้งแผ่นซับหมึกเต็ม (Waste Ink Pad Full)',
  'กระดาษติดบ่อย / ไม่ยอมดึงกระดาษ (Pickup Roller สึก)',
  'เปิดไม่ติด / ไฟไม่เข้าเครื่อง',
  'เครื่องมีเสียงดังแกรกๆ / ฟีดกระดาษเบิ้ลหลายแผ่น',
  'ต่อ Wi-Fi / สั่งพิมพ์จากคอมไม่ได้'
];

const PC_PROBLEMS = [
  'เปิดไม่ติด / พัดลมไม่หมุน / ไฟไม่เข้า',
  'เปิดติดแต่ภาพไม่ขึ้นจอ (No Display)',
  'จอฟ้า (BSOD) / เครื่องรีสตาร์ทเอง',
  'เครื่องช้ามาก / พื้นที่ไดรฟ์ C เต็ม ต้องการอัปเกรด SSD',
  'เครื่องร้อนจัด / พัดลมเสียงดัง / ทาซิลิโคนใหม่',
  'ติดไวรัส / ใช้งานช้า ต้องการติดตั้ง Windows & โปรแกรมใหม่',
  'โน้ตบุ๊กแบตเตอรี่เสื่อม / คีย์บอร์ดกดไม่ติดบางปุ่ม'
];

export const TicketFormModal: React.FC<TicketFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  ticketToEdit,
  inventory,
  allTickets,
  generateNextTicketNumber
}) => {
  if (!isOpen) return null;

  // Form State
  const [ticketNumber, setTicketNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerLineId, setCustomerLineId] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('printer');
  const [brand, setBrand] = useState('Epson');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [color, setColor] = useState('');
  const [accessories, setAccessories] = useState<string[]>([]);
  const [customAccessory, setCustomAccessory] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [initialConditionNotes, setInitialConditionNotes] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [technicianName, setTechnicianName] = useState('ช่างเอก');
  const [status, setStatus] = useState<RepairStatus>('pending');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [laborCostInput, setLaborCostInput] = useState<string>('300');
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [discountMode, setDiscountMode] = useState<'baht' | 'percent'>('baht');
  const [discountPercentInput, setDiscountPercentInput] = useState<string>('10');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'credit' | 'unpaid'>('unpaid');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState<string>('');

  // Parts Used State
  const [partsUsed, setPartsUsed] = useState<UsedPart[]>([]);
  const [initialPartsUsed, setInitialPartsUsed] = useState<UsedPart[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [partQuantity, setPartQuantity] = useState<number>(1);

  // Initialize form
  useEffect(() => {
    if (ticketToEdit) {
      setTicketNumber(ticketToEdit.ticketNumber);
      setCustomerName(ticketToEdit.customerName);
      setCustomerPhone(ticketToEdit.customerPhone);
      setCustomerLineId(ticketToEdit.customerLineId || '');
      setCustomerAddress(ticketToEdit.customerAddress || '');
      setDeviceType(ticketToEdit.deviceType);
      setBrand(ticketToEdit.brand);
      setModel(ticketToEdit.model);
      setSerialNumber(ticketToEdit.serialNumber || '');
      setColor(ticketToEdit.color || '');
      setAccessories(ticketToEdit.accessories || []);
      setProblemDescription(ticketToEdit.problemDescription);
      setInitialConditionNotes(ticketToEdit.initialConditionNotes || '');
      setTechnicianNotes(ticketToEdit.technicianNotes || '');
      setTechnicianName(ticketToEdit.technicianName || 'ช่างเอก');
      setStatus(ticketToEdit.status);
      setEstimatedCost(ticketToEdit.estimatedCost || 0);
      setLaborCostInput(String(ticketToEdit.laborCost ?? 300));
      setDiscountInput(String(ticketToEdit.discount ?? 0));
      setDiscountMode('baht');
      setIsPaid(ticketToEdit.isPaid || false);
      setPaymentMethod(ticketToEdit.paymentMethod || 'unpaid');
      setReceivedDate(ticketToEdit.receivedDate || new Date().toISOString().split('T')[0]);
      setEstimatedCompletionDate(ticketToEdit.estimatedCompletionDate || '');
      setPartsUsed(ticketToEdit.partsUsed || []);
      setInitialPartsUsed(ticketToEdit.partsUsed || []);
    } else {
      // New Ticket defaults
      setTicketNumber(generateNextTicketNumber());
      setCustomerName('');
      setCustomerPhone('');
      setCustomerLineId('');
      setCustomerAddress('');
      setDeviceType('printer');
      setBrand('Epson');
      setModel('');
      setSerialNumber('');
      setColor('');
      setAccessories(['สายไฟ AC Power']);
      setProblemDescription('');
      setInitialConditionNotes('สภาพปกติ ไม่มีรอยแตกร้าวรุนแรง');
      setTechnicianNotes('');
      setTechnicianName('ช่างเอก');
      setStatus('pending');
      setEstimatedCost(500);
      setLaborCostInput('300');
      setDiscountInput('0');
      setDiscountMode('baht');
      setIsPaid(false);
      setPaymentMethod('unpaid');
      setReceivedDate(new Date().toISOString().split('T')[0]);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      setEstimatedCompletionDate(tomorrow.toISOString().split('T')[0]);
      setPartsUsed([]);
      setInitialPartsUsed([]);
    }
  }, [ticketToEdit, isOpen]);

  // Financial calculations
  const laborCost = Math.max(0, parseFloat(laborCostInput) || 0);
  const partsCost = partsUsed.reduce((sum, p) => sum + p.totalPrice, 0);
  const subtotalBeforeDiscount = laborCost + partsCost;

  let calculatedDiscount = 0;
  if (discountMode === 'baht') {
    calculatedDiscount = Math.max(0, parseFloat(discountInput) || 0);
  } else {
    const pct = Math.max(0, Math.min(100, parseFloat(discountPercentInput) || 0));
    calculatedDiscount = Math.round((subtotalBeforeDiscount * pct) / 100);
  }

  // Effective discount cannot exceed total of labor + parts
  const discount = Math.min(calculatedDiscount, subtotalBeforeDiscount);
  const totalAmount = Math.max(0, subtotalBeforeDiscount - discount);

  // Toggle accessory
  const toggleAccessory = (item: string) => {
    if (accessories.includes(item)) {
      setAccessories(accessories.filter(a => a !== item));
    } else {
      setAccessories([...accessories, item]);
    }
  };

  const addCustomAccessory = () => {
    if (customAccessory.trim() && !accessories.includes(customAccessory.trim())) {
      setAccessories([...accessories, customAccessory.trim()]);
      setCustomAccessory('');
    }
  };

  // Add Part from Inventory
  const handleAddPart = () => {
    if (!selectedInventoryId) return;
    const invItem = inventory.find(i => i.id === selectedInventoryId);
    if (!invItem) return;

    const qty = Math.max(1, partQuantity);
    const existingIndex = partsUsed.findIndex(p => p.itemId === invItem.id);

    if (existingIndex >= 0) {
      const updated = [...partsUsed];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setPartsUsed(updated);
    } else {
      setPartsUsed([
        ...partsUsed,
        {
          itemId: invItem.id,
          itemCode: invItem.itemCode,
          itemName: invItem.name,
          quantity: qty,
          unitPrice: invItem.sellingPrice,
          totalPrice: invItem.sellingPrice * qty
        }
      ]);
    }

    setSelectedInventoryId('');
    setPartQuantity(1);
  };

  const handleRemovePart = (index: number) => {
    const updated = [...partsUsed];
    updated.splice(index, 1);
    setPartsUsed(updated);
  };

  // Handle Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์ของลูกค้า');
      return;
    }
    if (!model.trim()) {
      alert('กรุณากรอกรุ่นของอุปกรณ์');
      return;
    }
    if (!problemDescription.trim()) {
      alert('กรุณาระบุอาการเสียเบื้องต้น');
      return;
    }

    const now = new Date().toISOString();
    const ticketData: RepairTicket = {
      id: ticketToEdit ? ticketToEdit.id : `ticket-${Date.now()}`,
      ticketNumber: ticketNumber || generateNextTicketNumber(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerLineId: customerLineId.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      deviceType,
      brand,
      model: model.trim(),
      serialNumber: serialNumber.trim() || undefined,
      color: color.trim() || undefined,
      accessories,
      problemDescription: problemDescription.trim(),
      initialConditionNotes: initialConditionNotes.trim() || undefined,
      technicianNotes: technicianNotes.trim() || undefined,
      technicianName,
      status,
      estimatedCost,
      laborCost,
      partsCost,
      discount,
      totalAmount,
      isPaid,
      paymentMethod,
      partsUsed,
      trackingToken: ticketToEdit ? ticketToEdit.trackingToken : ticketNumber,
      lineNotified: ticketToEdit ? ticketToEdit.lineNotified : false,
      lastLineNotifiedAt: ticketToEdit?.lastLineNotifiedAt,
      receivedDate,
      estimatedCompletionDate: estimatedCompletionDate || undefined,
      completedDate: (status === 'repaired' || status === 'ready_pickup' || status === 'completed')
        ? (ticketToEdit?.completedDate || new Date().toISOString().split('T')[0])
        : undefined,
      deliveredDate: status === 'completed'
        ? (ticketToEdit?.deliveredDate || new Date().toISOString().split('T')[0])
        : undefined,
      createdAt: ticketToEdit ? ticketToEdit.createdAt : now,
      updatedAt: now
    };

    onSave(ticketData, initialPartsUsed);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold">
                {ticketNumber}
              </span>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {ticketToEdit ? 'แก้ไขใบรับซ่อม' : 'เปิดใบรับเครื่องซ่อมใหม่'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              บันทึกข้อมูลลูกค้า อุปกรณ์ อาการเสีย และจัดสรรอะไหล่เพื่อเริ่มงานซ่อม
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* 1. Customer Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
              <User className="w-4 h-4 text-blue-500" />
              <span>1. ข้อมูลลูกค้า</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อ-นามสกุล ลูกค้า <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณสมชาย ใจดี"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="เช่น 089-123-4567"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  LINE ID (สำหรับส่งลิงก์ตรวจสถานะ)
                </label>
                <input
                  type="text"
                  placeholder="เช่น somchai_jd"
                  value={customerLineId}
                  onChange={e => setCustomerLineId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ที่อยู่ / สถานที่ติดต่อ (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="ตำบล อำเภอ จังหวัด"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* 2. Device Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
              <Laptop className="w-4 h-4 text-purple-500" />
              <span>2. ข้อมูลอุปกรณ์ที่นำมาซ่อม</span>
            </h3>

            {/* Device Type Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setDeviceType('printer');
                  setBrand('Epson');
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  deviceType === 'printer'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Printer className="w-5 h-5" />
                <span>เครื่องพิมพ์ (Printer)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeviceType('laptop');
                  setBrand('ASUS');
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  deviceType === 'laptop'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Laptop className="w-5 h-5" />
                <span>โน้ตบุ๊ก (Notebook)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeviceType('computer');
                  setBrand('Custom PC (ประกอบ)');
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  deviceType === 'computer'
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Monitor className="w-5 h-5" />
                <span>คอมพิวเตอร์ PC (Desktop)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeviceType('other');
                  setBrand('อื่นๆ');
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  deviceType === 'other'
                    ? 'border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Wrench className="w-5 h-5" />
                <span>อุปกรณ์อื่นๆ / จอภาพ</span>
              </button>
            </div>

            {/* Brand, Model, Serial Number */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ยี่ห้อ (Brand) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Epson, Canon, ASUS, HP"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(deviceType === 'printer' ? PRINTER_BRANDS : PC_BRANDS).slice(0, 4).map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBrand(b)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  รุ่น (Model) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น EcoTank L3150, TUF F15, G3010"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Serial Number (S/N)
                </label>
                <input
                  type="text"
                  placeholder="หมายเลขเครื่องใต้ฐาน"
                  value={serialNumber}
                  onChange={e => setSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Accessories Checklist */}
            <div className="text-xs pt-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                อุปกรณ์ที่ลูกค้านำติดมาด้วย (เลือกเพื่อความถูกต้องในการส่งคืน)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_ACCESSORIES.map(acc => {
                  const checked = accessories.includes(acc);
                  return (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => toggleAccessory(acc)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                        checked
                          ? 'bg-blue-600 text-white font-medium shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3" />}
                      <span>{acc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Accessory Add */}
              <div className="flex gap-2 mt-2 max-w-sm">
                <input
                  type="text"
                  placeholder="ระบุอุปกรณ์อื่นๆ เพิ่มเติม..."
                  value={customAccessory}
                  onChange={e => setCustomAccessory(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
                <button
                  type="button"
                  onClick={addCustomAccessory}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-semibold hover:bg-slate-300"
                >
                  + เพิ่ม
                </button>
              </div>
            </div>
          </div>

          {/* 3. Problem Description & Quick Presets */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>3. อาการเสียและบันทึกตรวจเช็ค</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                อาการเสียที่ลูกค้าระบุ <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="ระบุอาการเสีย เช่น หมึกไม่ออก ไฟกะพริบ เปิดไม่ติด..."
                value={problemDescription}
                onChange={e => setProblemDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
              />

              {/* Quick Problem Presets */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-[10px] text-slate-400 self-center mr-1">อาการยอดนิยม:</span>
                {(deviceType === 'printer' ? PRINTER_PROBLEMS : PC_PROBLEMS).map((prob, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (!problemDescription) {
                        setProblemDescription(prob);
                      } else {
                        setProblemDescription(problemDescription + ', ' + prob);
                      }
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                  >
                    +{prob}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  สภาพเครื่องเบื้องต้น / ตำหนิ
                </label>
                <input
                  type="text"
                  placeholder="เช่น รอยขูดขีดด้านข้าง, ขาตั้งหัก, ฝาปิดปกติ"
                  value={initialConditionNotes}
                  onChange={e => setInitialConditionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ผลการตรวจเช็ค / บันทึกการซ่อมของช่าง
                </label>
                <input
                  type="text"
                  placeholder="เช่น ล้างหัวพิมพ์แล้ว, เปลี่ยนซิลิโคน, เปลี่ยนแรม"
                  value={technicianNotes}
                  onChange={e => setTechnicianNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-blue-700 dark:text-blue-300"
                />
              </div>
            </div>
          </div>

          {/* 4. Spare Parts Used (From Inventory) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-500" />
                <span>4. รายการอะไหล่ที่เปลี่ยน (ตัดสต็อกอัตโนมัติ)</span>
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                รวมค่าอะไหล่: ฿{partsCost.toLocaleString()}
              </span>
            </h3>

            {/* Select part from inventory */}
            <div className="flex flex-col sm:flex-row gap-2 text-xs">
              <select
                value={selectedInventoryId}
                onChange={e => setSelectedInventoryId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
              >
                <option value="">-- เลือกอะไหล่หรือหมึกพิมพ์จากสต็อกร้าน --</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>
                    [{item.itemCode}] {item.name} - คงเหลือ {item.stockQuantity} {item.unit} (฿{item.sellingPrice})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={partQuantity}
                  onChange={e => setPartQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-center"
                  placeholder="จำนวน"
                />
                <button
                  type="button"
                  onClick={handleAddPart}
                  disabled={!selectedInventoryId}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs whitespace-nowrap"
                >
                  + ใส่อะไหล่
                </button>
              </div>
            </div>

            {/* Parts Table */}
            {partsUsed.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                    <tr>
                      <th className="py-2 px-3">รหัส/ชื่ออะไหล่</th>
                      <th className="py-2 px-3 text-center">จำนวน</th>
                      <th className="py-2 px-3 text-right">ราคา/หน่วย</th>
                      <th className="py-2 px-3 text-right">รวมเงิน</th>
                      <th className="py-2 px-3 text-center">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {partsUsed.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-2 px-3">
                          <span className="font-mono text-slate-500 mr-2">[{p.itemCode}]</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{p.itemName}</span>
                        </td>
                        <td className="py-2 px-3 text-center font-semibold">{p.quantity}</td>
                        <td className="py-2 px-3 text-right">฿{p.unitPrice.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                          ฿{p.totalPrice.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePart(idx)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-1">
                ยังไม่มีการเบิกใช้อะไหล่ (สามารถเลือกเพิ่มได้จากรายการสต็อกด้านบน)
              </p>
            )}
          </div>

          {/* 5. Pricing, Status & Technician */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
              <Wrench className="w-4 h-4 text-cyan-500" />
              <span>5. สถานะ ค่าบริการ และช่างผู้รับผิดชอบ</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  สถานะงานซ่อม
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as RepairStatus)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                >
                  <option value="pending">1. รับเครื่องแล้ว / รอดำเนินการ</option>
                  <option value="diagnosing">2. กำลังตรวจเช็ค / กำลังซ่อม</option>
                  <option value="waiting_parts">3. รออะไหล่</option>
                  <option value="repaired">4. ซ่อมเสร็จแล้ว (ทดสอบผ่าน)</option>
                  <option value="ready_pickup">5. พร้อมส่งมอบ (รอรับเครื่อง)</option>
                  <option value="completed">6. ส่งมอบแล้ว / ปิดงาน</option>
                  <option value="cancelled">ยกเลิก / ซ่อมไม่ได้</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ช่างผู้รับผิดชอบ
                </label>
                <input
                  type="text"
                  placeholder="เช่น ช่างเอก, ช่างบอย"
                  value={technicianName}
                  onChange={e => setTechnicianName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  วันที่รับเครื่อง
                </label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={e => setReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  กำหนดแล้วเสร็จโดยประมาณ
                </label>
                <input
                  type="date"
                  value={estimatedCompletionDate}
                  onChange={e => setEstimatedCompletionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>
            </div>

            {/* Financials Calculation Box */}
            <div className="bg-slate-50 dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>💰 คำนวณค่าบริการ อะไหล่ และส่วนลด</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  รวมก่อนลด: <span className="font-bold text-slate-800 dark:text-slate-200">฿{subtotalBeforeDiscount.toLocaleString()}</span>
                </span>
              </div>

              {/* 3 Main Input Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Labor Cost */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ค่าแรง/บริการตรวจเช็ค (฿)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={laborCostInput}
                    onChange={e => setLaborCostInput(e.target.value)}
                    onBlur={() => {
                      if (!laborCostInput.trim()) setLaborCostInput('0');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-1 mt-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setLaborCostInput('200')}
                      className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                    >
                      200
                    </button>
                    <button
                      type="button"
                      onClick={() => setLaborCostInput('300')}
                      className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                    >
                      300
                    </button>
                    <button
                      type="button"
                      onClick={() => setLaborCostInput('400')}
                      className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                    >
                      400
                    </button>
                    <button
                      type="button"
                      onClick={() => setLaborCostInput('500')}
                      className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                    >
                      500
                    </button>
                  </div>
                </div>

                {/* 2. Parts Total Cost (Auto calculated from selected inventory) */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ค่าอะไหล่รวม ({partsUsed.length} รายการ)
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 h-[38px] flex items-center justify-between">
                    <span>฿{partsCost.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 font-normal">คำนวณจากตาราง</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {partsUsed.length > 0 ? `ใช้อะไหล่จากคลัง ${partsUsed.length} รายการ` : 'ยังไม่มีการเลือกเบิกอะไหล่'}
                  </p>
                </div>

                {/* 3. Discount Controls */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      ส่วนลด (Discount)
                    </label>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setDiscountMode('baht')}
                        className={`px-2 py-0.5 transition-colors ${
                          discountMode === 'baht'
                            ? 'bg-rose-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        ฿ บาท
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountMode('percent')}
                        className={`px-2 py-0.5 transition-colors ${
                          discountMode === 'percent'
                            ? 'bg-rose-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>

                  {discountMode === 'baht' ? (
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={subtotalBeforeDiscount}
                        placeholder="0"
                        value={discountInput}
                        onChange={e => setDiscountInput(e.target.value)}
                        onBlur={() => {
                          if (!discountInput.trim()) setDiscountInput('0');
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500"
                      />
                      <span className="absolute right-3 top-2 font-bold text-slate-400 text-xs">฿</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={discountPercentInput}
                        onChange={e => setDiscountPercentInput(e.target.value)}
                        onBlur={() => {
                          if (!discountPercentInput.trim()) setDiscountPercentInput('0');
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500"
                      />
                      <span className="absolute right-3 top-2 font-bold text-slate-400 text-xs">%</span>
                    </div>
                  )}

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountMode('baht');
                        setDiscountInput('0');
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 text-[10px]"
                    >
                      ไม่ลด
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountMode('baht');
                        setDiscountInput('50');
                      }}
                      className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 text-[10px] font-semibold"
                    >
                      -฿50
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountMode('baht');
                        setDiscountInput('100');
                      }}
                      className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 text-[10px] font-semibold"
                    >
                      -฿100
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountMode('baht');
                        setDiscountInput('200');
                      }}
                      className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 text-[10px] font-semibold"
                    >
                      -฿200
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountMode('percent');
                        setDiscountPercentInput('10');
                      }}
                      className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-900 text-[10px] font-semibold"
                    >
                      -10%
                    </button>
                    {laborCost > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountMode('baht');
                          setDiscountInput(String(laborCost));
                        }}
                        className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-900 text-[10px] font-semibold"
                      >
                        ฟรีค่าแรง
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Summary Pill */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/90 rounded-xl p-3 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      รวมค่าแรง (฿{laborCost.toLocaleString()}) + อะไหล่ (฿{partsCost.toLocaleString()}) =
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      ฿{subtotalBeforeDiscount.toLocaleString()}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                      <span>✓ หักส่วนลดที่มอบให้ลูกค้า:</span>
                      <span>-฿{discount.toLocaleString()} {discountMode === 'percent' ? `(${discountPercentInput}%)` : ''}</span>
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="block text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    ยอดชำระสุทธิทั้งสิ้น
                  </span>
                  <span className="text-2xl font-black text-blue-900 dark:text-white">
                    ฿{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Checkbox */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={e => setIsPaid(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  ลูกค้าชำระเงินเรียบร้อยแล้ว
                </span>
              </label>

              {isPaid && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">วิธีชำระ:</span>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="cash">เงินสด (Cash)</option>
                    <option value="transfer">โอนเงินธนาคาร / QR PromptPay</option>
                    <option value="credit">บัตรเครดิต</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              บันทึกใบรับซ่อม
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
