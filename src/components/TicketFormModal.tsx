import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  RepairTicket,
  InventoryItem,
  DeviceType,
  RepairStatus,
  UsedPart,
  GovCreditInfo,
  POSSaleRecord
} from '../types';
import {
  buildCustomerProfiles,
  searchReturningCustomers,
  ReturningCustomerProfile,
  CustomerDeviceHistory,
  normalizePhone
} from '../utils/customerLookup';
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
  AlertCircle,
  Building2,
  History,
  Sparkles,
  Search,
  ArrowRight,
  Clock,
  RotateCcw,
  CheckCircle2,
  Layers,
  ChevronRight
} from 'lucide-react';

interface TicketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ticket: RepairTicket, previousParts: UsedPart[]) => Promise<void> | void;
  ticketToEdit?: RepairTicket | null;
  inventory: InventoryItem[];
  allTickets: RepairTicket[];
  posSales?: POSSaleRecord[];
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
  posSales = [],
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'credit' | 'gov_credit' | 'unpaid'>('unpaid');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Government Credit State
  const [govAgencyName, setGovAgencyName] = useState<string>('');
  const [govTaxId, setGovTaxId] = useState<string>('');
  const [govDepartment, setGovDepartment] = useState<string>('งานพัสดุ');
  const [govOrderNumber, setGovOrderNumber] = useState<string>('');
  const [govCreditDays, setGovCreditDays] = useState<number>(30);

  // Parts Used State
  const [partsUsed, setPartsUsed] = useState<UsedPart[]>([]);
  const [initialPartsUsed, setInitialPartsUsed] = useState<UsedPart[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [partQuantity, setPartQuantity] = useState<number>(1);

  // Returning Customer Auto-Lookup & Suggestion State
  const [activeLookupQuery, setActiveLookupQuery] = useState('');
  const [selectedReturningCustomer, setSelectedReturningCustomer] = useState<ReturningCustomerProfile | null>(null);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [showLookupDropdown, setShowLookupDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // References for outside click dismissal
  const nameInputWrapperRef = useRef<HTMLDivElement>(null);
  const phoneInputWrapperRef = useRef<HTMLDivElement>(null);
  const modelInputWrapperRef = useRef<HTMLDivElement>(null);
  const lookupInputWrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (nameInputWrapperRef.current && !nameInputWrapperRef.current.contains(target)) {
        setShowNameSuggestions(false);
      }
      if (phoneInputWrapperRef.current && !phoneInputWrapperRef.current.contains(target)) {
        setShowPhoneSuggestions(false);
      }
      if (modelInputWrapperRef.current && !modelInputWrapperRef.current.contains(target)) {
        setShowModelSuggestions(false);
      }
      if (lookupInputWrapperRef.current && !lookupInputWrapperRef.current.contains(target)) {
        setShowLookupDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Aggregated returning customer profiles
  const customerProfiles = useMemo(() => {
    return buildCustomerProfiles(allTickets, posSales);
  }, [allTickets, posSales]);

  // Suggestions for Customer Name input
  const nameSuggestions = useMemo(() => {
    if (!customerName || customerName.trim().length < 2) return [];
    return searchReturningCustomers(customerProfiles, customerName, 'name').slice(0, 6);
  }, [customerProfiles, customerName]);

  // Suggestions for Customer Phone input
  const phoneSuggestions = useMemo(() => {
    const cleanDigits = normalizePhone(customerPhone);
    if (cleanDigits.length < 2) return [];
    return searchReturningCustomers(customerProfiles, customerPhone, 'phone').slice(0, 6);
  }, [customerProfiles, customerPhone]);

  // Suggestions for Model input
  const modelSuggestions = useMemo(() => {
    if (!model || model.trim().length < 2) return [];
    return searchReturningCustomers(customerProfiles, model, 'model').slice(0, 6);
  }, [customerProfiles, model]);

  // Suggestions for General Quick Lookup Bar
  const generalLookupSuggestions = useMemo(() => {
    if (!activeLookupQuery || activeLookupQuery.trim().length < 2) return [];
    return searchReturningCustomers(customerProfiles, activeLookupQuery, 'all').slice(0, 8);
  }, [customerProfiles, activeLookupQuery]);

  // Handler to autofill from returning customer
  const handleSelectCustomerProfile = (
    profile: ReturningCustomerProfile,
    device?: CustomerDeviceHistory
  ) => {
    setSelectedReturningCustomer(profile);
    setCustomerName(profile.customerName);
    setCustomerPhone(profile.customerPhone);
    if (profile.customerLineId) setCustomerLineId(profile.customerLineId);
    if (profile.customerAddress) setCustomerAddress(profile.customerAddress);

    // If government credit info exists, pre-fill it!
    if (profile.govCreditInfo) {
      setPaymentMethod('gov_credit');
      setGovAgencyName(profile.govCreditInfo.agencyName || profile.customerName);
      if (profile.govCreditInfo.taxId) setGovTaxId(profile.govCreditInfo.taxId);
      if (profile.govCreditInfo.department) setGovDepartment(profile.govCreditInfo.department);
      if (profile.govCreditInfo.orderNumber) setGovOrderNumber(profile.govCreditInfo.orderNumber);
      if (profile.govCreditInfo.creditDays) setGovCreditDays(profile.govCreditInfo.creditDays);
    }

    // Pre-fill device information if available
    const targetDevice = device || profile.devices[0];
    if (targetDevice) {
      if (targetDevice.deviceType) setDeviceType(targetDevice.deviceType);
      if (targetDevice.brand) setBrand(targetDevice.brand);
      if (targetDevice.model) setModel(targetDevice.model);
      if (targetDevice.serialNumber) setSerialNumber(targetDevice.serialNumber);
      if (targetDevice.color) setColor(targetDevice.color);
      if (targetDevice.accessories && targetDevice.accessories.length > 0) {
        setAccessories(targetDevice.accessories);
      }
    }

    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
    setShowModelSuggestions(false);
    setShowLookupDropdown(false);
    setActiveLookupQuery('');

    const deviceText = targetDevice ? ` (${targetDevice.brand} ${targetDevice.model})` : '';
    setToastMessage(`ดึงข้อมูลคุณ ${profile.customerName}${deviceText} สำเร็จ (ประวัติส่งซ่อม ${profile.totalVisits} ครั้ง)`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleApplySpecificDevice = (device: CustomerDeviceHistory) => {
    if (device.deviceType) setDeviceType(device.deviceType);
    if (device.brand) setBrand(device.brand);
    if (device.model) setModel(device.model);
    if (device.serialNumber) setSerialNumber(device.serialNumber);
    if (device.color) setColor(device.color);
    if (device.accessories && device.accessories.length > 0) {
      setAccessories(device.accessories);
    }
    setToastMessage(`เลือกเครื่อง: ${device.brand} ${device.model} (S/N: ${device.serialNumber || '-'})`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleClearReturningCustomer = () => {
    setSelectedReturningCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerLineId('');
    setCustomerAddress('');
    setModel('');
    setSerialNumber('');
    setColor('');
    setAccessories([]);
    setGovAgencyName('');
    setGovTaxId('');
    setPaymentMethod('unpaid');
  };

  // Initialize form
  useEffect(() => {
    setIsSubmitting(false);
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

      // Gov Credit Info
      setGovAgencyName(ticketToEdit.govCreditInfo?.agencyName || '');
      setGovTaxId(ticketToEdit.govCreditInfo?.taxId || '');
      setGovDepartment(ticketToEdit.govCreditInfo?.department || 'งานพัสดุ');
      setGovOrderNumber(ticketToEdit.govCreditInfo?.orderNumber || '');
      setGovCreditDays(ticketToEdit.govCreditInfo?.creditDays || 30);
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

      // Reset Gov Credit Info
      setGovAgencyName('');
      setGovTaxId('');
      setGovDepartment('งานพัสดุ');
      setGovOrderNumber('');
      setGovCreditDays(30);
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('กรุณากรอกชื่อลูกค้า');
      return;
    }
    if (!customerPhone.trim()) {
      alert('กรุณากรอกเบอร์โทรศัพท์ลูกค้า');
      return;
    }
    const safeModel = model.trim() || 'ไม่ระบุรุ่น';
    const safeProblem = problemDescription.trim() || 'ตรวจเช็คอาการทั่วไป';

    const now = new Date().toISOString();
    const finalTicketNumber = ticketNumber.trim() || generateNextTicketNumber();

    let govCreditInfo: GovCreditInfo | undefined = undefined;
    if (paymentMethod === 'gov_credit') {
      const dueDateObj = new Date();
      dueDateObj.setDate(dueDateObj.getDate() + (govCreditDays || 30));
      govCreditInfo = {
        agencyName: govAgencyName.trim() || customerName.trim(),
        taxId: govTaxId.trim() || undefined,
        department: govDepartment.trim() || undefined,
        orderNumber: govOrderNumber.trim() || undefined,
        creditDays: govCreditDays || 30,
        dueDate: dueDateObj.toISOString().split('T')[0],
        billingStatus: ticketToEdit?.govCreditInfo?.billingStatus || (isPaid ? 'paid' : 'pending_billing')
      };
    }

    const ticketData: RepairTicket = {
      id: ticketToEdit ? ticketToEdit.id : `ticket-${Date.now()}`,
      ticketNumber: finalTicketNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerLineId: customerLineId.trim() || '',
      customerAddress: customerAddress.trim() || '',
      deviceType,
      brand: brand || 'อื่นๆ',
      model: safeModel,
      serialNumber: serialNumber.trim() || '',
      color: color.trim() || '',
      accessories: accessories || [],
      problemDescription: safeProblem,
      initialConditionNotes: initialConditionNotes.trim() || '',
      technicianNotes: technicianNotes.trim() || '',
      technicianName: technicianName || 'ช่างเอก',
      status,
      estimatedCost: Number(estimatedCost) || 0,
      laborCost: Number(laborCost) || 0,
      partsCost: Number(partsCost) || 0,
      discount: Number(discount) || 0,
      totalAmount: Math.max(0, Number(totalAmount) || 0),
      isPaid: Boolean(isPaid),
      paymentMethod: paymentMethod || 'unpaid',
      govCreditInfo,
      partsUsed: partsUsed || [],
      trackingToken: (ticketToEdit?.trackingToken) || finalTicketNumber,
      lineNotified: Boolean(ticketToEdit?.lineNotified),
      lastLineNotifiedAt: ticketToEdit?.lastLineNotifiedAt || '',
      receivedDate: receivedDate || new Date().toISOString().split('T')[0],
      estimatedCompletionDate: estimatedCompletionDate || '',
      completedDate: (status === 'repaired' || status === 'ready_pickup' || status === 'completed')
        ? (ticketToEdit?.completedDate || new Date().toISOString().split('T')[0])
        : '',
      deliveredDate: status === 'completed'
        ? (ticketToEdit?.deliveredDate || new Date().toISOString().split('T')[0])
        : '',
      createdAt: ticketToEdit?.createdAt || now,
      updatedAt: now
    };

    try {
      setIsSubmitting(true);
      await onSave(ticketData, initialPartsUsed);
    } catch (err) {
      console.error('Error saving repair ticket:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
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
          {/* Toast Notification */}
          {toastMessage && (
            <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top-2 duration-150">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                <span>{toastMessage}</span>
              </span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-white/80 hover:text-white cursor-pointer ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 1. Customer Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                <span>1. ข้อมูลลูกค้า</span>
              </h3>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>พิมพ์ชื่อ/เบอร์/รุ่น เพื่อดึงข้อมูลลูกค้าเก่าอัตโนมัติ</span>
              </span>
            </div>

            {/* Quick Returning Customer Search Bar */}
            <div ref={lookupInputWrapperRef} className="relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="🔍 ค้นหาดึงข้อมูลลูกค้าเดิม (พิมพ์ชื่อ, เบอร์โทร หรือรุ่นเครื่อง)..."
                  value={activeLookupQuery}
                  onChange={e => {
                    setActiveLookupQuery(e.target.value);
                    setShowLookupDropdown(true);
                  }}
                  onFocus={() => setShowLookupDropdown(true)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-slate-800 dark:text-white placeholder:text-blue-400/80 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                />
                {activeLookupQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveLookupQuery('');
                      setShowLookupDropdown(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* General Lookup Dropdown */}
              {showLookupDropdown && generalLookupSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-blue-300 dark:border-blue-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in duration-150">
                  <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 flex items-center justify-between text-[11px] text-blue-700 dark:text-blue-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <span>พบประวัติลูกค้าเก่า ({generalLookupSuggestions.length} รายการ)</span>
                    </span>
                    <span className="text-[10px] text-slate-500">คลิกเพื่อเลือกและดึงข้อมูลลงฟอร์ม</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {generalLookupSuggestions.map(res => (
                      <button
                        key={res.customer.key}
                        type="button"
                        onClick={() => handleSelectCustomerProfile(res.customer, res.suggestedDevice)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/80 dark:hover:bg-slate-700/70 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 dark:text-white text-xs">
                              {res.customer.customerName}
                            </span>
                            <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.2 rounded">
                              {res.customer.customerPhone}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                              เคยซ่อม {res.customer.totalVisits} ครั้ง
                            </span>
                          </div>
                          {res.suggestedDevice && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="text-purple-600 dark:text-purple-400 font-semibold">
                                {res.suggestedDevice.brand} {res.suggestedDevice.model}
                              </span>
                              {res.suggestedDevice.serialNumber && (
                                <span>(S/N: {res.suggestedDevice.serialNumber})</span>
                              )}
                              <span>• ล่าสุด: {res.customer.latestVisitDate}</span>
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs group-hover:scale-105 transition-all">
                          <span>ดึงข้อมูล</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Active Returning Customer Highlight Banner */}
            {selectedReturningCustomer && (
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      ✓
                    </div>
                    <div>
                      <span className="font-bold text-emerald-900 dark:text-emerald-200">
                        ดึงข้อมูลลูกค้าเดิม: {selectedReturningCustomer.customerName}
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 text-[11px] ml-2">
                        (โทร: {selectedReturningCustomer.customerPhone} • เคยส่งซ่อมแล้ว {selectedReturningCustomer.totalVisits} ครั้ง)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearReturningCustomer}
                    className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>ล้าง / กรอกลูกค้าใหม่</span>
                  </button>
                </div>

                {/* Quick device switcher if customer has registered devices */}
                {selectedReturningCustomer.devices.length > 0 && (
                  <div className="pt-1.5 border-t border-emerald-200/70 dark:border-emerald-800/60">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold block mb-1">
                      เลือกรุ่นที่ลูกค้านำมาซ่อมรอบนี้ (คลิกเพื่อสลับข้อมูลเครื่องเดิม):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedReturningCustomer.devices.map((dev, idx) => {
                        const isCurrent = model === dev.model && brand === dev.brand;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleApplySpecificDevice(dev)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isCurrent
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            <span>{dev.brand} {dev.model}</span>
                            {dev.serialNumber && <span className="opacity-75 font-mono text-[10px]">({dev.serialNumber})</span>}
                            {isCurrent && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Customer Inputs Grid with Autocomplete */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Customer Name Input with Suggestions */}
              <div ref={nameInputWrapperRef} className="relative">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อ-นามสกุล ลูกค้า <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณสมชาย ใจดี"
                  value={customerName}
                  onChange={e => {
                    setCustomerName(e.target.value);
                    setShowNameSuggestions(true);
                  }}
                  onFocus={() => setShowNameSuggestions(true)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                />

                {/* Name Auto-Suggestions Dropdown */}
                {showNameSuggestions && nameSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-blue-300 dark:border-blue-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in duration-150">
                    <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 flex items-center justify-between text-[11px] text-blue-700 dark:text-blue-300 font-bold">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        <span>ลูกค้าเก่าที่ชื่อขึ้นต้น/ตรงกัน ({nameSuggestions.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-500">คลิกเพื่อดึงข้อมูล</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {nameSuggestions.map(res => (
                        <button
                          key={res.customer.key}
                          type="button"
                          onClick={() => handleSelectCustomerProfile(res.customer, res.suggestedDevice)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50/80 dark:hover:bg-slate-700/70 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-white text-xs flex items-center gap-1.5">
                              <span>{res.customer.customerName}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                {res.customer.totalVisits} ครั้ง
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono">{res.customer.customerPhone}</span>
                              {res.suggestedDevice && (
                                <>
                                  <span>•</span>
                                  <span className="text-purple-600 dark:text-purple-400 font-medium truncate">
                                    {res.suggestedDevice.brand} {res.suggestedDevice.model}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                            เลือก →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Phone Input with Suggestions */}
              <div ref={phoneInputWrapperRef} className="relative">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="เช่น 089-123-4567"
                  value={customerPhone}
                  onChange={e => {
                    setCustomerPhone(e.target.value);
                    setShowPhoneSuggestions(true);
                  }}
                  onFocus={() => setShowPhoneSuggestions(true)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-mono"
                />

                {/* Phone Auto-Suggestions Dropdown */}
                {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-blue-300 dark:border-blue-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in duration-150">
                    <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 flex items-center justify-between text-[11px] text-blue-700 dark:text-blue-300 font-bold">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-blue-500" />
                        <span>พบเบอร์ลูกค้าเก่าที่ตรงกัน ({phoneSuggestions.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-500">คลิกเพื่อดึงข้อมูล</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {phoneSuggestions.map(res => (
                        <button
                          key={res.customer.key}
                          type="button"
                          onClick={() => handleSelectCustomerProfile(res.customer, res.suggestedDevice)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50/80 dark:hover:bg-slate-700/70 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-white text-xs flex items-center gap-1.5">
                              <span className="font-mono text-blue-600 dark:text-blue-400 font-extrabold">{res.customer.customerPhone}</span>
                              <span>({res.customer.customerName})</span>
                            </div>
                            {res.suggestedDevice && (
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                รุ่นเดิม: {res.suggestedDevice.brand} {res.suggestedDevice.model}
                              </div>
                            )}
                          </div>
                          <span className="shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                            เลือก →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

              <div ref={modelInputWrapperRef} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    รุ่น (Model) <span className="text-rose-500">*</span>
                  </label>
                  {modelSuggestions.length > 0 && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3" />
                      <span>มีประวัติ {modelSuggestions.length} เครื่อง</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="เช่น EcoTank L3150, TUF F15, G3010"
                  value={model}
                  onChange={e => {
                    setModel(e.target.value);
                    setShowModelSuggestions(true);
                  }}
                  onFocus={() => setShowModelSuggestions(true)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                />

                {/* Model Auto-Suggestions Dropdown */}
                {showModelSuggestions && modelSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-purple-300 dark:border-purple-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in duration-150">
                    <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950 flex items-center justify-between text-[11px] text-purple-700 dark:text-purple-300 font-bold">
                      <span className="flex items-center gap-1">
                        <History className="w-3.5 h-3.5 text-purple-500" />
                        <span>พบประวัติรุ่นนี้เคยส่งซ่อม ({modelSuggestions.length} เครื่อง)</span>
                      </span>
                      <span className="text-[10px] text-slate-500">คลิกเพื่อดึงข้อมูลเครื่องและเจ้าของ</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {modelSuggestions.map(res => (
                        <button
                          key={`${res.customer.key}-${res.suggestedDevice?.model}-${res.suggestedDevice?.serialNumber}`}
                          type="button"
                          onClick={() => handleSelectCustomerProfile(res.customer, res.suggestedDevice)}
                          className="w-full text-left px-3 py-2.5 hover:bg-purple-50/80 dark:hover:bg-slate-700/70 transition-colors flex items-start justify-between gap-2 cursor-pointer group"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-white text-xs flex items-center gap-1.5">
                              <span className="text-purple-600 dark:text-purple-400 font-extrabold">
                                {res.suggestedDevice?.brand} {res.suggestedDevice?.model}
                              </span>
                              {res.suggestedDevice?.serialNumber && (
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-1 rounded">
                                  {res.suggestedDevice.serialNumber}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>เจ้าของ: <strong className="text-slate-800 dark:text-slate-200">{res.customer.customerName}</strong></span>
                              <span>•</span>
                              <span className="font-mono">{res.customer.customerPhone}</span>
                            </div>
                            {res.suggestedDevice?.problemDescription && (
                              <div className="text-[10px] text-slate-400 truncate mt-0.5 max-w-xs">
                                อาการเดิม: {res.suggestedDevice.problemDescription}
                              </div>
                            )}
                          </div>
                          <span className="shrink-0 text-[10px] font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform">
                            ดึงข้อมูล →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

            {/* Payment Section */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">ช่องทางชำระเงิน / รูปแบบการชำระ:</span>
                  <select
                    value={paymentMethod}
                    onChange={e => {
                      const val = e.target.value as any;
                      setPaymentMethod(val);
                      if (val === 'cash' || val === 'transfer' || val === 'credit') {
                        setIsPaid(true);
                      } else if (val === 'unpaid') {
                        setIsPaid(false);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-xs text-slate-800 dark:text-white"
                  >
                    <option value="unpaid">รอชำระเมื่อมารับเครื่อง (ยังไม่ชำระ)</option>
                    <option value="cash">เงินสด (ชำระแล้ว)</option>
                    <option value="transfer">โอนเงินธนาคาร / QR PromptPay (ชำระแล้ว)</option>
                    <option value="credit">บัตรเครดิต (ชำระแล้ว)</option>
                    <option value="gov_credit">🏛️ เครดิตสำหรับราชการ / วางบิล (Government Credit)</option>
                  </select>
                </div>

                {paymentMethod !== 'gov_credit' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={e => setIsPaid(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      ชำระเงินเรียบร้อยแล้ว
                    </span>
                  </label>
                )}
              </div>

              {/* Government Credit Extra Inputs */}
              {paymentMethod === 'gov_credit' && (
                <div className="p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-purple-200 dark:border-purple-800">
                    <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      <span>ข้อมูลเครดิตสำหรับหน่วยงานราชการ / โรงเรียน</span>
                    </span>
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold">
                      เครดิต {govCreditDays} วัน
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        ชื่อหน่วยงานราชการ / สถาบัน
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น โรงเรียนพัทลุง, อบต."
                        value={govAgencyName}
                        onChange={e => setGovAgencyName(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        เลขผู้เสียภาษี 13 หลัก
                      </label>
                      <input
                        type="text"
                        placeholder="เลข 13 หลัก"
                        value={govTaxId}
                        onChange={e => setGovTaxId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        เลขที่ใบสั่งซื้อ / PO No.
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น PO-69/01"
                        value={govOrderNumber}
                        onChange={e => setGovOrderNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        ฝ่าย / งานพัสดุ
                      </label>
                      <input
                        type="text"
                        placeholder="งานพัสดุ / แผนกคอมพิวเตอร์"
                        value={govDepartment}
                        onChange={e => setGovDepartment(e.target.value)}
                        className="w-full px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        เครดิตเทอม
                      </label>
                      <div className="flex gap-1">
                        {[15, 30, 45, 60].map(days => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setGovCreditDays(days)}
                            className={`flex-1 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                              govCreditDays === days
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 border border-purple-200 text-purple-900 dark:text-purple-300'
                            }`}
                          >
                            {days}ว.
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <span>บันทึกใบรับซ่อม</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
