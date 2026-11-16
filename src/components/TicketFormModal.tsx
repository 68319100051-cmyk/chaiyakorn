import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  RepairTicket,
  RepairDeviceItem,
  InventoryItem,
  DeviceType,
  RepairStatus,
  UsedPart,
  GovCreditInfo,
  POSSaleRecord,
  RepairDocumentType
} from '../types';
import {
  createEmptyDeviceItem,
  getTicketDevices,
  flattenUsedPartsForStock,
  buildSyncedDevicePayload
} from '../utils/ticketDevices';
import {
  buildCustomerProfiles,
  searchReturningCustomers,
  searchHistoricalFieldValues,
  ReturningCustomerProfile,
  CustomerDeviceHistory,
  normalizePhone
} from '../utils/customerLookup';
import {
  checkActiveWarranty,
  calculateTicketWarranty,
  WARRANTY_PRESETS,
  ActiveWarrantyMatch
} from '../utils/warranty';
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
  ChevronRight,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Printer as PrintIcon,
  PackageCheck
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
  onPrintTicket?: (ticket: RepairTicket, docType?: RepairDocumentType) => void;
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
  generateNextTicketNumber,
  onPrintTicket
}) => {
  if (!isOpen) return null;

  // Form State
  const [ticketNumber, setTicketNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerLineId, setCustomerLineId] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Multi-Device State (1 Ticket : N Devices)
  const [devices, setDevices] = useState<RepairDeviceItem[]>(() => [createEmptyDeviceItem()]);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState<number>(0);
  const [laborInputById, setLaborInputById] = useState<Record<string, string>>({});

  const [customAccessory, setCustomAccessory] = useState('');
  const [technicianName, setTechnicianName] = useState('ร้านพัทลุงปริ้นเตอร์');
  const [status, setStatus] = useState<RepairStatus>('pending');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
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

  // Warranty & Claim State
  const [warrantyDays, setWarrantyDays] = useState<number>(30);
  const [isWarrantyClaim, setIsWarrantyClaim] = useState<boolean>(false);
  const [originalTicketNumber, setOriginalTicketNumber] = useState<string>('');
  const [warrantyClaimNotes, setWarrantyClaimNotes] = useState<string>('');
  const [dismissWarrantyAlert, setDismissWarrantyAlert] = useState<boolean>(false);

  // Parts Used State
  const [initialPartsUsed, setInitialPartsUsed] = useState<UsedPart[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [partQuantity, setPartQuantity] = useState<number>(1);

  // Active device accessors & updaters
  const safeActiveIndex = Math.min(activeDeviceIndex, Math.max(0, devices.length - 1));
  const activeDevice = devices[safeActiveIndex] || devices[0] || createEmptyDeviceItem();
  const deviceType = activeDevice.deviceType;
  const brand = activeDevice.brand;
  const model = activeDevice.model;
  const serialNumber = activeDevice.serialNumber || '';
  const color = activeDevice.color || '';
  const accessories = activeDevice.accessories || [];
  const problemDescription = activeDevice.problemDescription;
  const initialConditionNotes = activeDevice.initialConditionNotes || '';
  const technicianNotes = activeDevice.technicianNotes || '';
  const partsUsed = activeDevice.partsUsed || [];
  const laborCostInput = laborInputById[activeDevice.id] ?? String(activeDevice.laborCost ?? 300);

  const updateActiveDevice = (patch: Partial<RepairDeviceItem>) => {
    setDevices(prev =>
      prev.map((d, idx) => (idx === safeActiveIndex ? { ...d, ...patch } : d))
    );
  };

  const setDeviceType = (val: DeviceType) => updateActiveDevice({ deviceType: val });
  const setBrand = (val: string) => updateActiveDevice({ brand: val });
  const setModel = (val: string) => updateActiveDevice({ model: val });
  const setSerialNumber = (val: string) => updateActiveDevice({ serialNumber: val });
  const setColor = (val: string) => updateActiveDevice({ color: val });
  const setAccessories = (val: string[]) => updateActiveDevice({ accessories: val });
  const setProblemDescription = (val: string) => updateActiveDevice({ problemDescription: val });
  const setInitialConditionNotes = (val: string) => updateActiveDevice({ initialConditionNotes: val });
  const setTechnicianNotes = (val: string) => updateActiveDevice({ technicianNotes: val });
  const setPartsUsed = (val: UsedPart[]) =>
    updateActiveDevice({
      partsUsed: val,
      partsCost: val.reduce((sum, p) => sum + (Number(p.totalPrice) || 0), 0)
    });
  const setLaborCostInput = (val: string) => {
    const numeric = Math.max(0, parseFloat(val) || 0);
    setLaborInputById(prev => ({ ...prev, [activeDevice.id]: val }));
    updateActiveDevice({ laborCost: numeric });
  };

  const handleAddDevice = () => {
    const newDev = createEmptyDeviceItem({
      deviceType: activeDevice.deviceType,
      brand: activeDevice.deviceType === 'printer' ? 'Epson' : activeDevice.brand,
      laborCost: 300
    });
    const nextIdx = devices.length;
    setDevices(prev => [...prev, newDev]);
    setLaborInputById(prev => ({ ...prev, [newDev.id]: '300' }));
    setActiveDeviceIndex(nextIdx);
    setToastMessage(`เพิ่มเครื่องที่ ${nextIdx + 1} ในใบรับซ่อมเดียวกันเรียบร้อยแล้ว`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleRemoveDevice = (indexToRemove: number) => {
    if (devices.length <= 1) return;
    setDevices(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setActiveDeviceIndex(prevIdx => {
      if (prevIdx > indexToRemove) return prevIdx - 1;
      if (prevIdx >= devices.length - 1) return Math.max(0, devices.length - 2);
      return prevIdx;
    });
  };

  // Returning Customer Auto-Lookup & Suggestion State
  const [activeLookupQuery, setActiveLookupQuery] = useState('');
  const [selectedReturningCustomer, setSelectedReturningCustomer] = useState<ReturningCustomerProfile | null>(null);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [showLineSuggestions, setShowLineSuggestions] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [showSerialSuggestions, setShowSerialSuggestions] = useState(false);
  const [showProblemSuggestions, setShowProblemSuggestions] = useState(false);
  const [showTechnicianSuggestions, setShowTechnicianSuggestions] = useState(false);
  const [showGovAgencySuggestions, setShowGovAgencySuggestions] = useState(false);
  const [showGovTaxIdSuggestions, setShowGovTaxIdSuggestions] = useState(false);
  const [showGovDeptSuggestions, setShowGovDeptSuggestions] = useState(false);
  const [showLookupDropdown, setShowLookupDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // References for outside click dismissal
  const nameInputWrapperRef = useRef<HTMLDivElement>(null);
  const phoneInputWrapperRef = useRef<HTMLDivElement>(null);
  const lineInputWrapperRef = useRef<HTMLDivElement>(null);
  const addressInputWrapperRef = useRef<HTMLDivElement>(null);
  const modelInputWrapperRef = useRef<HTMLDivElement>(null);
  const serialInputWrapperRef = useRef<HTMLDivElement>(null);
  const problemInputWrapperRef = useRef<HTMLDivElement>(null);
  const technicianInputWrapperRef = useRef<HTMLDivElement>(null);
  const govAgencyInputWrapperRef = useRef<HTMLDivElement>(null);
  const govTaxIdInputWrapperRef = useRef<HTMLDivElement>(null);
  const govDeptInputWrapperRef = useRef<HTMLDivElement>(null);
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
      if (lineInputWrapperRef.current && !lineInputWrapperRef.current.contains(target)) {
        setShowLineSuggestions(false);
      }
      if (addressInputWrapperRef.current && !addressInputWrapperRef.current.contains(target)) {
        setShowAddressSuggestions(false);
      }
      if (modelInputWrapperRef.current && !modelInputWrapperRef.current.contains(target)) {
        setShowModelSuggestions(false);
      }
      if (serialInputWrapperRef.current && !serialInputWrapperRef.current.contains(target)) {
        setShowSerialSuggestions(false);
      }
      if (problemInputWrapperRef.current && !problemInputWrapperRef.current.contains(target)) {
        setShowProblemSuggestions(false);
      }
      if (technicianInputWrapperRef.current && !technicianInputWrapperRef.current.contains(target)) {
        setShowTechnicianSuggestions(false);
      }
      if (govAgencyInputWrapperRef.current && !govAgencyInputWrapperRef.current.contains(target)) {
        setShowGovAgencySuggestions(false);
      }
      if (govTaxIdInputWrapperRef.current && !govTaxIdInputWrapperRef.current.contains(target)) {
        setShowGovTaxIdSuggestions(false);
      }
      if (govDeptInputWrapperRef.current && !govDeptInputWrapperRef.current.contains(target)) {
        setShowGovDeptSuggestions(false);
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

  // Suggestions for Customer Name input (supports from 1 character or empty for recent)
  const nameSuggestions = useMemo(() => {
    return searchReturningCustomers(customerProfiles, customerName, 'name').slice(0, 8);
  }, [customerProfiles, customerName]);

  // Suggestions for Customer Phone input (supports from 1 digit or empty for recent)
  const phoneSuggestions = useMemo(() => {
    return searchReturningCustomers(customerProfiles, customerPhone, 'phone').slice(0, 8);
  }, [customerProfiles, customerPhone]);

  // Suggestions for Model input (supports from 1 character or empty for recent)
  const modelSuggestions = useMemo(() => {
    return searchReturningCustomers(customerProfiles, model, 'model').slice(0, 8);
  }, [customerProfiles, model]);

  // Suggestions for LINE ID
  const lineSuggestions = useMemo(() => {
    return searchHistoricalFieldValues(allTickets, 'customerLineId', customerLineId);
  }, [allTickets, customerLineId]);

  // Suggestions for Customer Address
  const addressSuggestions = useMemo(() => {
    return searchHistoricalFieldValues(allTickets, 'customerAddress', customerAddress);
  }, [allTickets, customerAddress]);

  // Suggestions for Serial Number
  const serialSuggestions = useMemo(() => {
    return searchHistoricalFieldValues(allTickets, 'serialNumber', serialNumber);
  }, [allTickets, serialNumber]);

  // Suggestions for Problem Description
  const problemSuggestions = useMemo(() => {
    return searchHistoricalFieldValues(allTickets, 'problemDescription', problemDescription);
  }, [allTickets, problemDescription]);

  // Suggestions for Technician Name
  const technicianSuggestions = useMemo(() => {
    return searchHistoricalFieldValues(allTickets, 'technicianName', technicianName);
  }, [allTickets, technicianName]);

  // Suggestions for Government Agency Name
  const govAgencySuggestions = useMemo(() => {
    const values = new Set<string>();
    allTickets.forEach(t => {
      if (t.govCreditInfo?.agencyName) values.add(t.govCreditInfo.agencyName);
    });
    posSales.forEach(s => {
      if (s.govCreditInfo?.agencyName) values.add(s.govCreditInfo.agencyName);
    });
    const list = Array.from(values);
    if (!govAgencyName.trim()) return list.slice(0, 6);
    return list.filter(v => v.toLowerCase().includes(govAgencyName.trim().toLowerCase())).slice(0, 6);
  }, [allTickets, posSales, govAgencyName]);

  // Suggestions for Government Tax ID
  const govTaxIdSuggestions = useMemo(() => {
    const values = new Set<string>();
    allTickets.forEach(t => {
      if (t.govCreditInfo?.taxId) values.add(t.govCreditInfo.taxId);
    });
    posSales.forEach(s => {
      if (s.govCreditInfo?.taxId) values.add(s.govCreditInfo.taxId);
    });
    const list = Array.from(values);
    if (!govTaxId.trim()) return list.slice(0, 6);
    return list.filter(v => v.includes(govTaxId.trim())).slice(0, 6);
  }, [allTickets, posSales, govTaxId]);

  // Suggestions for Government Department
  const govDeptSuggestions = useMemo(() => {
    const values = new Set<string>(['งานพัสดุ', 'กองคลัง', 'ฝ่ายบริหารงานทั่วไป', 'กลุ่มงานสารสนเทศ']);
    allTickets.forEach(t => {
      if (t.govCreditInfo?.department) values.add(t.govCreditInfo.department);
    });
    posSales.forEach(s => {
      if (s.govCreditInfo?.department) values.add(s.govCreditInfo.department);
    });
    const list = Array.from(values);
    if (!govDepartment.trim()) return list.slice(0, 6);
    return list.filter(v => v.toLowerCase().includes(govDepartment.trim().toLowerCase())).slice(0, 6);
  }, [allTickets, posSales, govDepartment]);

  // Suggestions for General Quick Lookup Bar
  const generalLookupSuggestions = useMemo(() => {
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

  // Real-time Active Warranty Match Detection
  const activeWarrantyMatch = useMemo<ActiveWarrantyMatch | null>(() => {
    if (dismissWarrantyAlert || isWarrantyClaim) return null;
    return checkActiveWarranty(allTickets, {
      customerPhone,
      customerName,
      serialNumber,
      model,
      brand,
      excludeTicketId: ticketToEdit?.id
    });
  }, [allTickets, customerPhone, customerName, serialNumber, model, brand, ticketToEdit, dismissWarrantyAlert, isWarrantyClaim]);

  // Apply 1-click Free Warranty Claim
  const handleApplyWarrantyClaim = (match: ActiveWarrantyMatch) => {
    setIsWarrantyClaim(true);
    setOriginalTicketNumber(match.ticket.ticketNumber);
    setLaborCostInput('0');
    setDiscountInput('0');
    if (!problemDescription.startsWith('[งานเคลมประกัน')) {
      const claimPrefix = `[งานเคลมประกันจาก ${match.ticket.ticketNumber}] `;
      setProblemDescription(claimPrefix + (problemDescription ? problemDescription : `อาการเดิม: ${match.ticket.problemDescription}`));
    }
    setToastMessage(`🛡️ ตั้งค่าเป็นงานเคลมประกันจาก ${match.ticket.ticketNumber} ฟรีค่าแรง (0 บาท) เรียบร้อย`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCancelWarrantyClaim = () => {
    setIsWarrantyClaim(false);
    setOriginalTicketNumber('');
    setLaborCostInput('300');
    setToastMessage('ยกเลิกงานเคลมประกัน กลับสู่การคิดค่าบริการปกติ');
    setTimeout(() => setToastMessage(null), 3000);
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
    setIsWarrantyClaim(false);
    setOriginalTicketNumber('');
    setDismissWarrantyAlert(false);
  };

  // Initialize form
  useEffect(() => {
    setIsSubmitting(false);
    if (ticketToEdit) {
      const loadedDevices = getTicketDevices(ticketToEdit);
      setDevices(loadedDevices);
      setActiveDeviceIndex(0);
      const inputMap: Record<string, string> = {};
      loadedDevices.forEach(d => {
        inputMap[d.id] = String(d.laborCost ?? 300);
      });
      setLaborInputById(inputMap);

      setTicketNumber(ticketToEdit.ticketNumber);
      setCustomerName(ticketToEdit.customerName);
      setCustomerPhone(ticketToEdit.customerPhone);
      setCustomerLineId(ticketToEdit.customerLineId || '');
      setCustomerAddress(ticketToEdit.customerAddress || '');
      setTechnicianName(ticketToEdit.technicianName || 'ร้านพัทลุงปริ้นเตอร์');
      setStatus(ticketToEdit.status);
      setEstimatedCost(ticketToEdit.estimatedCost || 0);
      setDiscountInput(String(ticketToEdit.discount ?? 0));
      setDiscountMode('baht');
      setIsPaid(ticketToEdit.isPaid || false);
      setPaymentMethod(ticketToEdit.paymentMethod || 'unpaid');
      setReceivedDate(ticketToEdit.receivedDate || new Date().toISOString().split('T')[0]);
      setEstimatedCompletionDate(ticketToEdit.estimatedCompletionDate || '');
      setInitialPartsUsed(flattenUsedPartsForStock(loadedDevices));

      // Warranty & Claim
      setWarrantyDays(ticketToEdit.warrantyDays !== undefined ? ticketToEdit.warrantyDays : 30);
      setIsWarrantyClaim(Boolean(ticketToEdit.isWarrantyClaim));
      setOriginalTicketNumber(ticketToEdit.originalTicketNumber || '');
      setWarrantyClaimNotes(ticketToEdit.warrantyClaimNotes || '');
      setDismissWarrantyAlert(Boolean(ticketToEdit.isWarrantyClaim));

      // Gov Credit Info
      setGovAgencyName(ticketToEdit.govCreditInfo?.agencyName || '');
      setGovTaxId(ticketToEdit.govCreditInfo?.taxId || '');
      setGovDepartment(ticketToEdit.govCreditInfo?.department || 'งานพัสดุ');
      setGovOrderNumber(ticketToEdit.govCreditInfo?.orderNumber || '');
      setGovCreditDays(ticketToEdit.govCreditInfo?.creditDays || 30);
    } else {
      // New Ticket defaults
      const firstDev = createEmptyDeviceItem();
      setDevices([firstDev]);
      setActiveDeviceIndex(0);
      setLaborInputById({ [firstDev.id]: '300' });

      setTicketNumber(generateNextTicketNumber());
      setCustomerName('');
      setCustomerPhone('');
      setCustomerLineId('');
      setCustomerAddress('');
      setTechnicianName('ร้านพัทลุงปริ้นเตอร์');
      setStatus('pending');
      setEstimatedCost(500);
      setDiscountInput('0');
      setDiscountMode('baht');
      setIsPaid(false);
      setPaymentMethod('unpaid');
      setReceivedDate(new Date().toISOString().split('T')[0]);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      setEstimatedCompletionDate(tomorrow.toISOString().split('T')[0]);
      setInitialPartsUsed([]);

      // Reset Warranty
      setWarrantyDays(30);
      setIsWarrantyClaim(false);
      setOriginalTicketNumber('');
      setWarrantyClaimNotes('');
      setDismissWarrantyAlert(false);

      // Reset Gov Credit Info
      setGovAgencyName('');
      setGovTaxId('');
      setGovDepartment('งานพัสดุ');
      setGovOrderNumber('');
      setGovCreditDays(30);
    }
  }, [ticketToEdit, isOpen]);

  // Financial calculations (Aggregated across all devices in the ticket)
  const activeDeviceLaborCost = Math.max(0, parseFloat(laborCostInput) || 0);
  const activeDevicePartsCost = partsUsed.reduce((sum, p) => sum + p.totalPrice, 0);
  const laborCost = devices.reduce((sum, d) => sum + (Number(d.laborCost) || 0), 0);
  const partsCost = devices.reduce(
    (sum, d) => sum + (d.partsUsed || []).reduce((s, p) => s + (Number(p.totalPrice) || 0), 0),
    0
  );
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

    const now = new Date().toISOString();
    const finalTicketNumber = ticketNumber.trim() || generateNextTicketNumber();

    let govCreditInfo: GovCreditInfo | undefined = undefined;
    if (paymentMethod === 'gov_credit') {
      const dueDateObj = new Date();
      dueDateObj.setDate(dueDateObj.getDate() + (govCreditDays || 30));
      govCreditInfo = {
        ...(ticketToEdit?.govCreditInfo || {}),
        agencyName: govAgencyName.trim() || customerName.trim(),
        taxId: govTaxId.trim() || undefined,
        department: govDepartment.trim() || undefined,
        orderNumber: govOrderNumber.trim() || undefined,
        creditDays: govCreditDays || 30,
        dueDate: ticketToEdit?.govCreditInfo?.dueDate || dueDateObj.toISOString().split('T')[0],
        billingStatus: ticketToEdit?.govCreditInfo?.billingStatus || (isPaid ? 'paid' : 'pending_billing')
      };
    }

    const syncedDeviceFields = buildSyncedDevicePayload(devices, status);

    const ticketData: RepairTicket = {
      id: ticketToEdit ? ticketToEdit.id : `ticket-${Date.now()}`,
      ticketNumber: finalTicketNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerLineId: customerLineId.trim() || '',
      customerAddress: customerAddress.trim() || '',
      ...syncedDeviceFields,
      technicianName: technicianName || 'ร้านพัทลุงปริ้นเตอร์',
      status,
      estimatedCost: Number(estimatedCost) || 0,
      discount: Number(discount) || 0,
      totalAmount: Math.max(0, Number(totalAmount) || 0),
      isPaid: Boolean(isPaid),
      paymentMethod: paymentMethod || 'unpaid',
      govCreditInfo,
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
      warrantyDays: Number(warrantyDays) >= 0 ? Number(warrantyDays) : 30,
      warrantyExpiryDate: (() => {
        const wDays = Number(warrantyDays) >= 0 ? Number(warrantyDays) : 30;
        if (wDays <= 0) return '';
        const baseDateStr = (status === 'completed' ? (ticketToEdit?.deliveredDate || new Date().toISOString().split('T')[0]) : receivedDate) || new Date().toISOString().split('T')[0];
        const d = new Date(baseDateStr);
        d.setDate(d.getDate() + wDays);
        return d.toISOString().split('T')[0];
      })(),
      isWarrantyClaim: Boolean(isWarrantyClaim),
      originalTicketNumber: isWarrantyClaim ? (originalTicketNumber.trim() || undefined) : undefined,
      warrantyClaimNotes: isWarrantyClaim ? (warrantyClaimNotes.trim() || undefined) : undefined,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[96vh] sm:max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
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
                    <span className="text-[10px] text-slate-500">เลือก: ใส่เฉพาะข้อมูล หรือ ดึงทั้งหมด</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                    {generalLookupSuggestions.map(res => (
                      <div
                        key={res.customer.key}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 dark:text-white text-xs">
                              {res.customer.customerName}
                            </span>
                            <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.2 rounded font-semibold">
                              {res.customer.customerPhone}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                              เคยซ่อม {res.customer.totalVisits} ครั้ง
                            </span>
                          </div>
                          {res.suggestedDevice && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-purple-600 dark:text-purple-400 font-semibold">
                                {res.suggestedDevice.brand} {res.suggestedDevice.model}
                              </span>
                              {res.suggestedDevice.serialNumber && (
                                <span>(S/N: {res.suggestedDevice.serialNumber})</span>
                              )}
                              {res.suggestedDevice.isUnderWarranty && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 flex items-center gap-0.5">
                                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>ในประกัน ({res.suggestedDevice.warrantyDaysRemaining} วัน)</span>
                                </span>
                              )}
                              <span>• ล่าสุด: {res.customer.latestVisitDate}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Option 1: ใส่เฉพาะชื่อ+เบอร์ */}
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerName(res.customer.customerName);
                              setCustomerPhone(res.customer.customerPhone);
                              setShowLookupDropdown(false);
                              setActiveLookupQuery('');
                              setToastMessage(`ใส่ชื่อและเบอร์ "${res.customer.customerName}" เรียบร้อยแล้ว`);
                              setTimeout(() => setToastMessage(null), 3000);
                            }}
                            title="ใส่เฉพาะชื่อและเบอร์โทร ไม่เปลี่ยนข้อมูลเครื่องหรือช่องอื่น"
                            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer"
                          >
                            ใส่เฉพาะชื่อ+เบอร์
                          </button>
                          {/* Option 2: ดึงข้อมูลทั้งหมด */}
                          <button
                            type="button"
                            onClick={() => handleSelectCustomerProfile(res.customer, res.suggestedDevice)}
                            title="ดึงข้อมูลเดิมทั้งหมดของลูกค้านี้ (ชื่อ, เบอร์, ที่อยู่, รุ่นเครื่อง)"
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>ดึงทั้งหมด</span>
                          </button>
                        </div>
                      </div>
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
                            {dev.isUnderWarranty && (
                              <span className="px-1 py-0.2 rounded bg-emerald-200 dark:bg-emerald-800 text-[9px] text-emerald-900 dark:text-emerald-100 font-bold">
                                🛡️ ในประกัน
                              </span>
                            )}
                            {isCurrent && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Active Warranty Match Alert Banner (Real-time detection) */}
            {activeWarrantyMatch && (
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 dark:from-emerald-950/50 dark:via-teal-950/40 dark:to-amber-950/40 border-2 border-emerald-500/80 dark:border-emerald-500 rounded-xl p-3.5 text-xs shadow-md space-y-2 animate-in fade-in duration-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm mt-0.5">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-emerald-900 dark:text-emerald-100">
                          🛡️ ตรวจพบ: เครื่องนี้อยู่ในระยะประกันงานซ่อม!
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-xs animate-pulse">
                          เหลืออีก {activeWarrantyMatch.warrantyResult.daysRemaining} วัน
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                        ใบรับซ่อมเดิม: <strong className="font-mono">{activeWarrantyMatch.ticket.ticketNumber}</strong> • 
                        {activeWarrantyMatch.ticket.deliveredDate ? ` ส่งมอบเมื่อ ${activeWarrantyMatch.ticket.deliveredDate}` : ` รับเครื่อง ${activeWarrantyMatch.ticket.receivedDate}`} • 
                        หมดประกันวันที่: <strong className="font-mono">{activeWarrantyMatch.warrantyResult.expiryDate}</strong> (ประกัน {activeWarrantyMatch.warrantyResult.warrantyDays} วัน)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissWarrantyAlert(true)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                    title="ปิดการแจ้งเตือน"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 rounded-lg p-2.5 border border-emerald-200 dark:border-emerald-800 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 flex-wrap gap-1">
                    <span>
                      เครื่อง: <strong>{activeWarrantyMatch.ticket.brand} {activeWarrantyMatch.ticket.model}</strong>
                      {activeWarrantyMatch.ticket.serialNumber && <span className="font-mono text-slate-500 ml-1">(S/N: {activeWarrantyMatch.ticket.serialNumber})</span>}
                    </span>
                    <span className="text-slate-500">
                      ช่างผู้ซ่อมเดิม: <strong>{activeWarrantyMatch.ticket.technicianName || 'ช่างประจำร้าน'}</strong>
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">อาการเดิม: </span>
                    <span>{activeWarrantyMatch.ticket.problemDescription}</span>
                  </div>
                  {activeWarrantyMatch.ticket.partsUsed && activeWarrantyMatch.ticket.partsUsed.length > 0 && (
                    <div className="text-slate-500 text-[10px]">
                      <span>อะไหล่ที่เคยเปลี่ยน: </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {activeWarrantyMatch.ticket.partsUsed.map(p => p.itemName).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                    💡 หากลูกค้านำเครื่องกลับมาด้วยปัญหาเดิม สามารถเปิดเป็นงานเคลมประกันฟรีโดยไม่คิดค่าแรงซ้ำ
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyWarrantyClaim(activeWarrantyMatch)}
                    className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-200" />
                    <span>🛡️ เปิดเป็นงานเคลมประกันฟรี (ปรับค่าแรง 0 บาท)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Warranty Claim Active Indicator */}
            {isWarrantyClaim && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/60 dark:to-indigo-950/60 border-2 border-purple-400 dark:border-purple-600 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-purple-950 dark:text-purple-100 flex items-center gap-1.5 flex-wrap">
                      <span>งานเคลมประกันต่อเนื่อง (ฟรีค่าแรง)</span>
                      {originalTicketNumber && (
                        <span className="font-mono bg-purple-200/80 dark:bg-purple-900 text-purple-900 dark:text-purple-200 px-1.5 py-0.2 rounded font-bold">
                          อ้างอิงใบเดิม: {originalTicketNumber}
                        </span>
                      )}
                    </span>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300">
                      ✓ ไม่คิดค่าแรงตรวจเช็คซ้ำซ้อนตามเงื่อนไขการรับประกันงานซ่อม
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelWarrantyClaim}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  ยกเลิกเคลม / คิดค่าแรงปกติ
                </button>
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
                        <span>ลูกค้าเก่าที่ขึ้นต้น/ตรงกัน ({nameSuggestions.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-500 hidden sm:inline">เลือก: ใส่เฉพาะชื่อ หรือ ดึงข้อมูลทั้งหมด</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {nameSuggestions.map(res => (
                        <div
                          key={res.customer.key}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50/70 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 dark:text-white text-xs flex items-center gap-1.5 flex-wrap">
                              <span>{res.customer.customerName}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                เคยซ่อม {res.customer.totalVisits} ครั้ง
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="font-mono">{res.customer.customerPhone}</span>
                              {res.suggestedDevice && (
                                <>
                                  <span>•</span>
                                  <span className="text-purple-600 dark:text-purple-400 font-medium truncate">
                                    {res.suggestedDevice.brand} {res.suggestedDevice.model}
                                  </span>
                                  {res.suggestedDevice.isUnderWarranty && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 flex items-center gap-0.5">
                                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                      <span>ในประกัน ({res.suggestedDevice.warrantyDaysRemaining} วัน)</span>
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomerName(res.customer.customerName);
                                setShowNameSuggestions(false);
                                setToastMessage(`ใส่เฉพาะชื่อ "${res.customer.customerName}" เรียบร้อย (ไม่เปลี่ยนช่องอื่น)`);
                                setTimeout(() => setToastMessage(null), 3000);
                              }}
                              title="ใส่เฉพาะชื่อในช่องนี้ (ไม่กระทบเบอร์โทรหรือเครื่อง)"
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer"
                            >
                              ใส่เฉพาะชื่อ
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectCustomerProfile(res.customer, res.suggestedDevice);
                                setShowNameSuggestions(false);
                              }}
                              title="ดึงข้อมูลลูกค้าเดิมทั้งหมด (ชื่อ, เบอร์, ที่อยู่, รุ่นเครื่องเดิม)"
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>ดึงทั้งหมด</span>
                            </button>
                          </div>
                        </div>
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
                      <span className="text-[10px] text-slate-500 hidden sm:inline">เลือก: ใส่เฉพาะเบอร์ หรือ ดึงข้อมูลทั้งหมด</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {phoneSuggestions.map(res => (
                        <div
                          key={res.customer.key}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50/70 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 dark:text-white text-xs flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-blue-600 dark:text-blue-400 font-extrabold">{res.customer.customerPhone}</span>
                              <span>({res.customer.customerName})</span>
                            </div>
                            {res.suggestedDevice && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="truncate">รุ่นเดิม: {res.suggestedDevice.brand} {res.suggestedDevice.model}</span>
                                {res.suggestedDevice.isUnderWarranty && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 flex items-center gap-0.5">
                                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>ในประกัน ({res.suggestedDevice.warrantyDaysRemaining} วัน)</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomerPhone(res.customer.customerPhone);
                                setShowPhoneSuggestions(false);
                                setToastMessage(`ใส่เฉพาะเบอร์ "${res.customer.customerPhone}" เรียบร้อย (ไม่เปลี่ยนช่องอื่น)`);
                                setTimeout(() => setToastMessage(null), 3000);
                              }}
                              title="ใส่เฉพาะเบอร์โทรในช่องนี้ (ไม่กระทบชื่อหรือเครื่อง)"
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer"
                            >
                              ใส่เฉพาะเบอร์
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectCustomerProfile(res.customer, res.suggestedDevice);
                                setShowPhoneSuggestions(false);
                              }}
                              title="ดึงข้อมูลลูกค้าเดิมทั้งหมด (ชื่อ, เบอร์, ที่อยู่, รุ่นเครื่องเดิม)"
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>ดึงทั้งหมด</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div ref={lineInputWrapperRef} className="relative">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  LINE ID (สำหรับส่งลิงก์ตรวจสถานะ)
                </label>
                <input
                  type="text"
                  placeholder="เช่น somchai_jd"
                  value={customerLineId}
                  onChange={e => {
                    setCustomerLineId(e.target.value);
                    setShowLineSuggestions(true);
                  }}
                  onFocus={() => setShowLineSuggestions(true)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                />

                {showLineSuggestions && lineSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-blue-200 dark:border-blue-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in duration-150">
                    <div className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-[10px] text-blue-700 dark:text-blue-300 font-bold flex items-center justify-between">
                      <span>ประวัติ LINE ID ในระบบ ({lineSuggestions.length})</span>
                      <span className="text-[10px] text-slate-400">คลิกเลือก</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {lineSuggestions.map((lid, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCustomerLineId(lid);
                            setShowLineSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                        >
                          <span>{lid}</span>
                          <span className="text-[10px] text-blue-600 font-bold">เลือก →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div ref={addressInputWrapperRef} className="sm:col-span-2 lg:col-span-3 relative">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ที่อยู่ / สถานที่ติดต่อ (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="ตำบล อำเภอ จังหวัด"
                  value={customerAddress}
                  onChange={e => {
                    setCustomerAddress(e.target.value);
                    setShowAddressSuggestions(true);
                  }}
                  onFocus={() => setShowAddressSuggestions(true)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                />

                {showAddressSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-blue-200 dark:border-blue-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in duration-150">
                    <div className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-[10px] text-blue-700 dark:text-blue-300 font-bold flex items-center justify-between">
                      <span>ประวัติที่อยู่เดิมในระบบ ({addressSuggestions.length})</span>
                      <span className="text-[10px] text-slate-400">คลิกเลือก</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {addressSuggestions.map((addr, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCustomerAddress(addr);
                            setShowAddressSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate">{addr}</span>
                          <span className="text-[10px] text-blue-600 font-bold shrink-0 ml-2">เลือก →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Device Details (Supports 1 Ticket : N Devices) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-purple-500" />
                <span>2. ข้อมูลอุปกรณ์ที่นำมาซ่อม</span>
                {devices.length > 1 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                    ทั้งหมด {devices.length} เครื่อง
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={handleAddDevice}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มเครื่อง</span>
              </button>
            </div>

            {/* Device Switcher Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
              {devices.map((dev, idx) => {
                const isActive = idx === safeActiveIndex;
                return (
                  <div key={dev.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setActiveDeviceIndex(idx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-400'
                      } ${devices.length > 1 ? 'rounded-r-none' : ''}`}
                    >
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[180px]">
                        เครื่องที่ {idx + 1}: {dev.brand} {dev.model || '(ระบุรุ่น)'}
                      </span>
                    </button>
                    {devices.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDevice(idx)}
                        title={`ลบเครื่องที่ ${idx + 1}`}
                        className={`px-2 py-1.5 rounded-r-lg border-y border-r text-xs transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-purple-700 hover:bg-rose-600 text-white border-purple-700'
                            : 'bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-500 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

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
                      <span className="text-[10px] text-slate-500 hidden sm:inline">เลือก: ใส่เฉพาะรุ่น หรือ ดึงข้อมูลทั้งหมด</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {modelSuggestions.map(res => (
                        <div
                          key={`${res.customer.key}-${res.suggestedDevice?.model}-${res.suggestedDevice?.serialNumber}`}
                          className="w-full text-left px-3 py-2.5 hover:bg-purple-50/70 dark:hover:bg-slate-700/60 transition-colors flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 dark:text-white text-xs flex items-center gap-1.5 flex-wrap">
                              <span className="text-purple-600 dark:text-purple-400 font-extrabold">
                                {res.suggestedDevice?.brand} {res.suggestedDevice?.model}
                              </span>
                              {res.suggestedDevice?.serialNumber && (
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-1 rounded">
                                  {res.suggestedDevice.serialNumber}
                                </span>
                              )}
                              {res.suggestedDevice?.isUnderWarranty && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 flex items-center gap-0.5">
                                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>ในประกัน ({res.suggestedDevice.warrantyDaysRemaining} วัน)</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>เจ้าของเดิม: <strong className="text-slate-800 dark:text-slate-200">{res.customer.customerName}</strong></span>
                              <span>•</span>
                              <span className="font-mono">{res.customer.customerPhone}</span>
                            </div>
                            {res.suggestedDevice?.problemDescription && (
                              <div className="text-[10px] text-slate-400 truncate mt-0.5 max-w-xs">
                                อาการเดิม: {res.suggestedDevice.problemDescription}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (res.suggestedDevice) {
                                  setModel(res.suggestedDevice.model);
                                  if (res.suggestedDevice.brand) setBrand(res.suggestedDevice.brand);
                                  if (res.suggestedDevice.deviceType) setDeviceType(res.suggestedDevice.deviceType);
                                }
                                setShowModelSuggestions(false);
                                setToastMessage(`ใส่เฉพาะรุ่น "${res.suggestedDevice?.brand} ${res.suggestedDevice?.model}" แล้ว (ไม่เปลี่ยนข้อมูลลูกค้า)`);
                                setTimeout(() => setToastMessage(null), 3000);
                              }}
                              title="ใส่เฉพาะรุ่นและยี่ห้อนี้ในช่องอุปกรณ์ (ไม่เปลี่ยนข้อมูลลูกค้า)"
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer"
                            >
                              ใส่เฉพาะรุ่นนี้
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectCustomerProfile(res.customer, res.suggestedDevice);
                                setShowModelSuggestions(false);
                              }}
                              title="ดึงข้อมูลลูกค้าและเครื่องเดิมทั้งหมด"
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>ดึงทั้งหมด</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div ref={serialInputWrapperRef} className="relative">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Serial Number (S/N)
                </label>
                <input
                  type="text"
                  placeholder="หมายเลขเครื่องใต้ฐาน"
                  value={serialNumber}
                  onChange={e => {
                    setSerialNumber(e.target.value);
                    setShowSerialSuggestions(true);
                  }}
                  onFocus={() => setShowSerialSuggestions(true)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-mono"
                />

                {showSerialSuggestions && serialSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-purple-200 dark:border-purple-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in duration-150">
                    <div className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950 text-[10px] text-purple-700 dark:text-purple-300 font-bold flex items-center justify-between">
                      <span>ประวัติ S/N ในระบบ ({serialSuggestions.length})</span>
                      <span className="text-[10px] text-slate-400">คลิกเลือก</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {serialSuggestions.map((sn, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSerialNumber(sn);
                            setShowSerialSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                        >
                          <span>{sn}</span>
                          <span className="text-[10px] text-purple-600 font-bold">เลือก →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
              <span>
                3. อาการเสียและบันทึกตรวจเช็ค
                {devices.length > 1 ? ` (เครื่องที่ ${safeActiveIndex + 1}: ${brand} ${model || '-'})` : ''}
              </span>
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
                <span>
                  4. รายการอะไหล่ที่เปลี่ยน
                  {devices.length > 1 ? ` (เครื่องที่ ${safeActiveIndex + 1})` : ' (ตัดสต็อกอัตโนมัติ)'}
                </span>
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {devices.length > 1
                  ? `เครื่องนี้ ฿${activeDevicePartsCost.toLocaleString()} • รวมทุกเครื่อง ฿${partsCost.toLocaleString()}`
                  : `รวมค่าอะไหล่: ฿${partsCost.toLocaleString()}`}
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

              <div ref={technicianInputWrapperRef} className="relative">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ช่างผู้รับผิดชอบ
                </label>
                <input
                  type="text"
                  placeholder="ร้านพัทลุงปริ้นเตอร์"
                  value={technicianName}
                  onChange={e => {
                    setTechnicianName(e.target.value);
                    setShowTechnicianSuggestions(true);
                  }}
                  onFocus={() => setShowTechnicianSuggestions(true)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />

                {showTechnicianSuggestions && technicianSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-cyan-200 dark:border-cyan-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in duration-150">
                    <div className="px-2.5 py-1 bg-cyan-50 dark:bg-cyan-950 text-[10px] text-cyan-700 dark:text-cyan-300 font-bold flex items-center justify-between">
                      <span>รายชื่อช่างในระบบ ({technicianSuggestions.length})</span>
                      <span className="text-[10px] text-slate-400">คลิกเลือก</span>
                    </div>
                    <div className="max-h-44 overflow-y-auto">
                      {technicianSuggestions.map((tech, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setTechnicianName(tech);
                            setShowTechnicianSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-cyan-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                        >
                          <span>{tech}</span>
                          <span className="text-[10px] text-cyan-600 font-bold">เลือก →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

              {/* Multi-Device Cost Breakdown Summary */}
              {devices.length > 1 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-purple-200 dark:border-purple-800/60 space-y-1.5">
                  <div className="text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center justify-between">
                    <span>สรุปค่าใช้จ่ายแยกตามเครื่อง ({devices.length} เครื่อง)</span>
                    <span className="text-[10px] font-normal text-slate-500">คลิกที่เครื่องเพื่อแก้ไขค่าแรง/อะไหล่</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {devices.map((d, idx) => {
                      const dParts = (d.partsUsed || []).reduce((s, p) => s + (Number(p.totalPrice) || 0), 0);
                      const dSub = (Number(d.laborCost) || 0) + dParts;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setActiveDeviceIndex(idx)}
                          className={`text-left px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                            idx === safeActiveIndex
                              ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 text-purple-900 dark:text-purple-100 font-bold'
                              : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate mr-2">
                            {idx + 1}. {d.brand} {d.model || '-'}
                          </span>
                          <span className="font-mono shrink-0">฿{dSub.toLocaleString()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3 Main Input Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Labor Cost */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {devices.length > 1
                      ? `ค่าแรงเครื่องที่ ${safeActiveIndex + 1} (฿)`
                      : 'ค่าแรง/บริการตรวจเช็ค (฿)'}
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
                    {devices.length > 1
                      ? `ค่าอะไหล่รวมทุกเครื่อง (${devices.reduce((s, d) => s + (d.partsUsed?.length || 0), 0)} รายการ)`
                      : `ค่าอะไหล่รวม (${partsUsed.length} รายการ)`}
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 h-[38px] flex items-center justify-between">
                    <span>฿{partsCost.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 font-normal">คำนวณจากตาราง</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {devices.length > 1
                      ? `เครื่องนี้ ฿${activeDevicePartsCost.toLocaleString()} • ค่าแรงรวมทุกเครื่อง ฿${laborCost.toLocaleString()}`
                      : partsUsed.length > 0
                      ? `ใช้อะไหล่จากคลัง ${partsUsed.length} รายการ`
                      : 'ยังไม่มีการเลือกเบิกอะไหล่'}
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

            {/* Warranty Tracking & Guarantee Section */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-50 via-emerald-50/20 to-slate-50 dark:from-slate-900/60 dark:via-emerald-950/20 dark:to-slate-900/60 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-slate-800 dark:text-white text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>ระยะเวลารับประกันงานซ่อมสำหรับใบนี้ (Warranty Tracking)</span>
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  warrantyDays > 0
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}>
                  {warrantyDays > 0 ? `🛡️ รับประกัน ${warrantyDays} วัน` : 'ไม่มีการรับประกัน'}
                </span>
              </div>

              {/* Warranty Presets */}
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1.5">
                  เลือกระยะเวลารับประกันสำเร็จรูป (คลิกเลือก):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WARRANTY_PRESETS.map(preset => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setWarrantyDays(preset.days)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        warrantyDays === preset.days
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:border-emerald-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Warranty Days & Expiry Calculation Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    หรือระบุจำนวนวันรับประกันเอง (วัน)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      placeholder="เช่น 30"
                      value={warrantyDays}
                      onChange={e => setWarrantyDays(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-32 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold"
                    />
                    <span className="text-slate-500 font-medium">วัน</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    {warrantyDays > 0 ? (
                      <>
                        <span className="font-bold">การนับถอยหลังประกันงานซ่อม:</span>
                        <p className="text-[10px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                          เริ่มนับ {warrantyDays} วัน ทันทีที่ส่งมอบเครื่องให้ลูกค้า หากลูกค้ากลับมาซ่อมซ้ำในระยะนี้ ระบบจะแจ้งเตือนงานเคลมฟรีอัตโนมัติ
                        </p>
                      </>
                    ) : (
                      <span>ไม่มีการรับประกันสำหรับงานนี้</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Checkbox for Warranty Claim Flag */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWarrantyClaim}
                    onChange={e => {
                      setIsWarrantyClaim(e.target.checked);
                      if (e.target.checked) {
                        setLaborCostInput('0');
                        setDiscountInput('0');
                      }
                    }}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>ระบุว่าเป็นงานเคลมประกันงานซ่อมเดิม (ฟรีค่าแรง)</span>
                  </span>
                </label>

                {isWarrantyClaim && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">เลขที่ใบรับซ่อมเดิมที่เคลม:</span>
                    <input
                      type="text"
                      placeholder="เช่น REP-20261026-002"
                      value={originalTicketNumber}
                      onChange={e => setOriginalTicketNumber(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 font-mono text-xs text-purple-900 dark:text-purple-200 font-bold focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
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
                    <div ref={govAgencyInputWrapperRef} className="relative">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        ชื่อหน่วยงานราชการ / สถาบัน
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น โรงเรียนพัทลุง, อบต."
                        value={govAgencyName}
                        onChange={e => {
                          setGovAgencyName(e.target.value);
                          setShowGovAgencySuggestions(true);
                        }}
                        onFocus={() => setShowGovAgencySuggestions(true)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800"
                      />

                      {showGovAgencySuggestions && govAgencySuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-purple-200 dark:border-purple-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in duration-150">
                          <div className="px-2 py-1 bg-purple-50 dark:bg-purple-950 text-[10px] text-purple-700 dark:text-purple-300 font-bold flex items-center justify-between">
                            <span>หน่วยงานในระบบ ({govAgencySuggestions.length})</span>
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            {govAgencySuggestions.map((agency, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setGovAgencyName(agency);
                                  setShowGovAgencySuggestions(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 hover:bg-purple-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                              >
                                <span className="truncate">{agency}</span>
                                <span className="text-[10px] text-purple-600 font-bold ml-1">เลือก →</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div ref={govTaxIdInputWrapperRef} className="relative">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        เลขผู้เสียภาษี 13 หลัก
                      </label>
                      <input
                        type="text"
                        placeholder="เลข 13 หลัก"
                        value={govTaxId}
                        onChange={e => {
                          setGovTaxId(e.target.value);
                          setShowGovTaxIdSuggestions(true);
                        }}
                        onFocus={() => setShowGovTaxIdSuggestions(true)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 font-mono"
                      />

                      {showGovTaxIdSuggestions && govTaxIdSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-purple-200 dark:border-purple-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in duration-150">
                          <div className="px-2 py-1 bg-purple-50 dark:bg-purple-950 text-[10px] text-purple-700 dark:text-purple-300 font-bold flex items-center justify-between">
                            <span>เลขผู้เสียภาษี ({govTaxIdSuggestions.length})</span>
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            {govTaxIdSuggestions.map((tax, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setGovTaxId(tax);
                                  setShowGovTaxIdSuggestions(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 hover:bg-purple-50 dark:hover:bg-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                              >
                                <span>{tax}</span>
                                <span className="text-[10px] text-purple-600 font-bold ml-1">เลือก →</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
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
                    <div ref={govDeptInputWrapperRef} className="relative">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        ฝ่าย / งานพัสดุ
                      </label>
                      <input
                        type="text"
                        placeholder="งานพัสดุ / แผนกคอมพิวเตอร์"
                        value={govDepartment}
                        onChange={e => {
                          setGovDepartment(e.target.value);
                          setShowGovDeptSuggestions(true);
                        }}
                        onFocus={() => setShowGovDeptSuggestions(true)}
                        className="w-full px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800"
                      />

                      {showGovDeptSuggestions && govDeptSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-purple-200 dark:border-purple-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in duration-150">
                          <div className="px-2 py-1 bg-purple-50 dark:bg-purple-950 text-[10px] text-purple-700 dark:text-purple-300 font-bold flex items-center justify-between">
                            <span>ฝ่าย/งานพัสดุ ({govDeptSuggestions.length})</span>
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            {govDeptSuggestions.map((dept, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setGovDepartment(dept);
                                  setShowGovDeptSuggestions(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 hover:bg-purple-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                              >
                                <span>{dept}</span>
                                <span className="text-[10px] text-purple-600 font-bold ml-1">เลือก →</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
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

          {/* Modal Actions Footer (Sticky on Mobile) */}
          <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-3 sm:p-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 z-20">
            <div className="flex items-center gap-2">
              {ticketToEdit && onPrintTicket && (status === 'repaired' || status === 'ready_pickup' || status === 'completed') && (
                <button
                  type="button"
                  onClick={() =>
                    onPrintTicket(
                      {
                        ...ticketToEdit,
                        ...buildSyncedDevicePayload(devices, status),
                        customerName: customerName.trim() || ticketToEdit.customerName,
                        customerPhone: customerPhone.trim() || ticketToEdit.customerPhone,
                        customerLineId: customerLineId.trim() || '',
                        customerAddress: customerAddress.trim() || '',
                        technicianName: technicianName || 'ร้านพัทลุงปริ้นเตอร์',
                        status,
                        discount: Number(discount) || 0,
                        totalAmount: Math.max(0, Number(totalAmount) || 0),
                        isPaid: Boolean(isPaid),
                        paymentMethod,
                        receivedDate,
                        warrantyDays: Number(warrantyDays) >= 0 ? Number(warrantyDays) : 30
                      },
                      'delivery_note'
                    )
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>พิมพ์ใบส่งมอบของ</span>
                </button>
              )}
              {ticketToEdit && onPrintTicket && (
                <button
                  type="button"
                  onClick={() =>
                    onPrintTicket({
                      ...ticketToEdit,
                      ...buildSyncedDevicePayload(devices, status),
                      customerName: customerName.trim() || ticketToEdit.customerName,
                      customerPhone: customerPhone.trim() || ticketToEdit.customerPhone,
                      customerLineId: customerLineId.trim() || '',
                      customerAddress: customerAddress.trim() || '',
                      technicianName: technicianName || 'ร้านพัทลุงปริ้นเตอร์',
                      status,
                      discount: Number(discount) || 0,
                      totalAmount: Math.max(0, Number(totalAmount) || 0),
                      isPaid: Boolean(isPaid),
                      paymentMethod,
                      receivedDate,
                      warrantyDays: Number(warrantyDays) >= 0 ? Number(warrantyDays) : 30
                    })
                  }
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PrintIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">พิมพ์เอกสาร</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 ml-auto">
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
          </div>
        </form>
      </div>
    </div>
  );
};
