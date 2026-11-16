import React, { useState, useMemo, useEffect } from 'react';
import {
  RepairTicket,
  DeviceType,
  RepairStatus,
  STATUS_CONFIG,
  RepairDocumentType
} from '../types';
import {
  Search,
  Plus,
  Printer as PrintIcon,
  MessageSquare,
  Edit3,
  Trash2,
  ExternalLink,
  Monitor,
  Laptop,
  Printer,
  CheckCircle,
  Phone,
  Tag,
  Calendar,
  Shield,
  ShieldCheck,
  Building2,
  Wrench,
  LayoutGrid,
  List,
  PackageCheck,
  Layers
} from 'lucide-react';
import { calculateTicketWarranty } from '../utils/warranty';
import { getGovCreditDueStatus } from '../utils/govCredit';
import { getTicketDevices, formatDevicesSummary } from '../utils/ticketDevices';
import { formatThaiDateFull } from '../utils/printHelpers';

const VIEW_MODE_STORAGE_KEY = 'fixpro_ticket_view_mode';

interface RepairTicketsProps {
  tickets: RepairTicket[];
  initialViewPage?: 'active' | 'closed';
  onNewTicket: () => void;
  onEditTicket: (ticket: RepairTicket) => void;
  onDeleteTicket: (ticketId: string) => void;
  onUpdateStatus: (ticketId: string, status: RepairStatus) => void;
  onUpdateDiscount?: (ticketId: string, newDiscount: number) => void;
  onPrintTicket: (ticket: RepairTicket, docType?: RepairDocumentType) => void;
  onLineNotify: (ticket: RepairTicket) => void;
  onOpenTracking: (ticket: RepairTicket) => void;
}

export const RepairTickets: React.FC<RepairTicketsProps> = ({
  tickets,
  initialViewPage = 'active',
  onNewTicket,
  onEditTicket,
  onDeleteTicket,
  onUpdateStatus,
  onUpdateDiscount,
  onPrintTicket,
  onLineNotify,
  onOpenTracking
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<'all' | DeviceType>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | RepairStatus>('all');
  const [warrantyFilter, setWarrantyFilter] = useState<'all' | 'under_warranty' | 'claim'>('all');
  const [govCreditFilter, setGovCreditFilter] = useState<boolean>(false);
  const [viewPage, setViewPage] = useState<'active' | 'closed' | 'all'>(initialViewPage);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return saved === 'table' ? 'table' : 'cards';
    } catch {
      return 'cards';
    }
  });

  const handleChangeViewMode = (mode: 'cards' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    if (initialViewPage) {
      setViewPage(initialViewPage);
    }
  }, [initialViewPage]);
  
  // Quick discount modal state
  const [discountModalTicket, setDiscountModalTicket] = useState<RepairTicket | null>(null);
  const [quickDiscountAmount, setQuickDiscountAmount] = useState<string>('0');
  const [quickDiscountMode, setQuickDiscountMode] = useState<'baht' | 'percent'>('baht');

  // Active vs Closed counts
  const activeTicketsCount = useMemo(() => {
    return tickets.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  }, [tickets]);

  const closedTicketsCount = useMemo(() => {
    return tickets.filter(t => t.status === 'completed' || t.status === 'cancelled').length;
  }, [tickets]);

  const totalClosedRevenue = useMemo(() => {
    return tickets
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  }, [tickets]);

  // Warranty and Gov Credit counts
  const underWarrantyCount = useMemo(() => {
    return tickets.filter(t => {
      const w = calculateTicketWarranty(t);
      return !w.isExpired && (w.status === 'active' || w.status === 'expiring_soon');
    }).length;
  }, [tickets]);

  const warrantyClaimCount = useMemo(() => {
    return tickets.filter(t => Boolean(t.isWarrantyClaim)).length;
  }, [tickets]);

  const govCreditCount = useMemo(() => {
    return tickets.filter(t => t.paymentMethod === 'gov_credit').length;
  }, [tickets]);

  // Filtered tickets with active vs closed page separation
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // 1. Primary Page Filter: Active vs Closed Bills
      if (viewPage === 'active' && (ticket.status === 'completed' || ticket.status === 'cancelled')) {
        return false;
      }
      if (viewPage === 'closed' && (ticket.status !== 'completed' && ticket.status !== 'cancelled')) {
        return false;
      }

      // 2. Search filter (supports multi-device tickets)
      const devices = getTicketDevices(ticket);
      const term = searchTerm.trim().toLowerCase();
      const matchDeviceSearch = devices.some(
        d =>
          d.brand.toLowerCase().includes(term) ||
          d.model.toLowerCase().includes(term) ||
          (d.serialNumber && d.serialNumber.toLowerCase().includes(term)) ||
          d.problemDescription.toLowerCase().includes(term)
      );
      const matchSearch =
        !term ||
        ticket.ticketNumber.toLowerCase().includes(term) ||
        ticket.customerName.toLowerCase().includes(term) ||
        ticket.customerPhone.includes(term) ||
        matchDeviceSearch ||
        (ticket.originalTicketNumber && ticket.originalTicketNumber.toLowerCase().includes(term)) ||
        (ticket.govCreditInfo?.agencyName && ticket.govCreditInfo.agencyName.toLowerCase().includes(term)) ||
        (ticket.govCreditInfo?.disbursementNumber && ticket.govCreditInfo.disbursementNumber.toLowerCase().includes(term)) ||
        ticket.problemDescription.toLowerCase().includes(term);

      // 3. Device filter (matches if any device on ticket has selectedDevice)
      const matchDevice =
        selectedDevice === 'all' ||
        devices.some(d => d.deviceType === selectedDevice);

      // 4. Status filter
      const matchStatus = selectedStatus === 'all' || ticket.status === selectedStatus;

      // 5. Warranty filter
      let matchWarranty = true;
      if (warrantyFilter === 'under_warranty') {
        const w = calculateTicketWarranty(ticket);
        matchWarranty = !w.isExpired && (w.status === 'active' || w.status === 'expiring_soon');
      } else if (warrantyFilter === 'claim') {
        matchWarranty = Boolean(ticket.isWarrantyClaim);
      }

      // 6. Gov Credit filter
      const matchGovCredit = !govCreditFilter || ticket.paymentMethod === 'gov_credit';

      return matchSearch && matchDevice && matchStatus && matchWarranty && matchGovCredit;
    });
  }, [tickets, searchTerm, selectedDevice, selectedStatus, warrantyFilter, govCreditFilter, viewPage]);

  // Dynamic status options depending on active page vs closed page
  const statusOptions = useMemo(() => {
    if (viewPage === 'active') {
      return [
        { value: 'all' as const, label: 'ทั้งหมด (กำลังซ่อม)' },
        { value: 'pending' as const, label: '1. รับเครื่องแล้ว' },
        { value: 'diagnosing' as const, label: '2. กำลังตรวจเช็ค/ซ่อม' },
        { value: 'waiting_parts' as const, label: '3. รออะไหล่' },
        { value: 'ready_pickup' as const, label: '4. พร้อมส่งมอบ' }
      ];
    }
    if (viewPage === 'closed') {
      return [
        { value: 'all' as const, label: 'ทั้งหมด (ปิดบิลแล้ว)' },
        { value: 'completed' as const, label: 'ส่งมอบแล้ว / ปิดงาน' },
        { value: 'cancelled' as const, label: 'ยกเลิก / คืนเครื่อง' }
      ];
    }
    return [
      { value: 'all' as const, label: 'ทั้งหมด' },
      { value: 'pending' as const, label: 'รับเครื่องแล้ว' },
      { value: 'diagnosing' as const, label: 'กำลังตรวจเช็ค/ซ่อม' },
      { value: 'waiting_parts' as const, label: 'รออะไหล่' },
      { value: 'ready_pickup' as const, label: 'พร้อมส่งมอบ' },
      { value: 'completed' as const, label: 'ส่งมอบแล้ว' },
      { value: 'cancelled' as const, label: 'ยกเลิก' }
    ];
  }, [viewPage]);

  return (
    <div className="space-y-5">
      {/* Top Header & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span>
              {viewPage === 'active'
                ? 'งานซ่อมที่กำลังดำเนินการ'
                : viewPage === 'closed'
                ? 'รายการที่ปิดบิลแล้ว / ส่งมอบเรียบร้อย'
                : 'รายการงานซ่อมทั้งหมด'}
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              viewPage === 'active'
                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                : viewPage === 'closed'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {filteredTickets.length} รายการ
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            {viewPage === 'active'
              ? 'เครื่องซ่อมที่อยู่ระหว่างดำเนินการในร้าน (รายการที่ปิดบิลแล้วจะแยกไปอยู่อีกหน้าอัตโนมัติ)'
              : viewPage === 'closed'
              ? 'ประวัติเครื่องซ่อมที่ปิดบิลและส่งมอบแล้ว สามารถพิมพ์ใบเสร็จและตรวจสอบงานประกันได้'
              : 'แสดงงานซ่อมทั้งหมดทั้งที่กำลังซ่อมและที่ปิดบิลแล้ว'}
          </p>
        </div>

        <button
          onClick={onNewTicket}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-cyan-700 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เปิดใบรับซ่อมใหม่</span>
        </button>
      </div>

      {/* Main Page View Tabs (Active vs Closed Separation) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full scrollbar-none sm:flex-wrap">
          <button
            type="button"
            onClick={() => {
              setViewPage('active');
              setSelectedStatus('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewPage === 'active'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>งานที่กำลังดำเนินการ ({activeTicketsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewPage('closed');
              setSelectedStatus('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewPage === 'closed'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>รายการที่ปิดบิลแล้ว ({closedTicketsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewPage('all');
              setSelectedStatus('all');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewPage === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <span>รวมทั้งหมด ({tickets.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {viewPage === 'closed' && (
            <div className="flex items-center gap-2 text-xs text-slate-500 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                ยอดเงินปิดบิลรวม: ฿{totalClosedRevenue.toLocaleString()} บาท
              </span>
            </div>
          )}

          {/* View Mode Toggle Switch (Cards vs List Table) */}
          <div
            className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            role="group"
            aria-label="รูปแบบการแสดงผล"
          >
            <button
              type="button"
              onClick={() => handleChangeViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>การ์ด</span>
            </button>
            <button
              type="button"
              onClick={() => handleChangeViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>รายการ (List)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาด้วยเลขที่ใบรับ, ชื่อลูกค้า, เบอร์โทร, ยี่ห้อ, รุ่น, Serial Number..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ล้าง
              </button>
            )}
          </div>

          {/* Device Type Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs font-medium">
            <button
              onClick={() => setSelectedDevice('all')}
              className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedDevice === 'all'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setSelectedDevice('printer')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedDevice === 'printer'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ปริ้นเตอร์</span>
            </button>
            <button
              onClick={() => setSelectedDevice('laptop')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedDevice === 'laptop'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>โน้ตบุ๊ก</span>
            </button>
            <button
              onClick={() => setSelectedDevice('computer')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedDevice === 'computer'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>คอมพิวเตอร์ PC</span>
            </button>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold uppercase mr-1">สถานะ:</span>
          {statusOptions.map(opt => {
            const isSelected = selectedStatus === opt.value;
            const count =
              opt.value === 'all'
                ? (viewPage === 'active' ? activeTicketsCount : viewPage === 'closed' ? closedTicketsCount : tickets.length)
                : tickets.filter(t => t.status === opt.value).length;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedStatus(opt.value)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {opt.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Warranty Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-100 dark:border-slate-800 pt-2">
          <span className="text-slate-400 text-[11px] font-semibold uppercase mr-1 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>ประกันงานซ่อม:</span>
          </span>
          <button
            onClick={() => setWarrantyFilter('all')}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer ${
              warrantyFilter === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setWarrantyFilter('under_warranty')}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              warrantyFilter === 'under_warranty'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>🛡️ อยู่ในระยะประกัน ({underWarrantyCount})</span>
          </button>
          <button
            onClick={() => setWarrantyFilter('claim')}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              warrantyFilter === 'claim'
                ? 'bg-purple-600 text-white font-bold shadow-xs'
                : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100'
            }`}
          >
            <span>งานเคลมประกัน ({warrantyClaimCount})</span>
          </button>
          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
          <button
            onClick={() => setGovCreditFilter(prev => !prev)}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              govCreditFilter
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>🏛️ เครดิตราชการ ({govCreditCount})</span>
          </button>
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {viewPage === 'closed'
              ? 'ไม่พบรายการที่ปิดบิลแล้ว'
              : 'ไม่พบรายการงานซ่อม'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {viewPage === 'closed'
              ? 'ยังไม่มีรายการที่ปิดบิลตามเงื่อนไขที่เลือก เมื่อเปลี่ยนสถานะงานซ่อมเป็น "ส่งมอบแล้ว / ปิดงาน" รายการจะย้ายมาแสดงที่หน้านี้โดยอัตโนมัติ'
              : 'ไม่พบงานซ่อมที่ตรงกับเงื่อนไขการค้นหา คุณสามารถล้างตัวกรองหรือเปิดใบรับซ่อมใหม่ได้ทันที'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            {viewPage === 'closed' ? (
              <button
                onClick={() => setViewPage('active')}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm cursor-pointer"
              >
                ดูงานที่กำลังดำเนินการ ({activeTicketsCount})
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDevice('all');
                    setSelectedStatus('all');
                    setWarrantyFilter('all');
                    setGovCreditFilter(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
                >
                  ล้างตัวกรอง
                </button>
                <button
                  onClick={onNewTicket}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm cursor-pointer"
                >
                  + เปิดใบรับซ่อมใหม่
                </button>
              </>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* ================= LIST / TABLE VIEW MODE ================= */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">เลขที่</th>
                  <th className="py-3 px-3 whitespace-nowrap">ชื่อลูกค้า</th>
                  <th className="py-3 px-3">อุปกรณ์</th>
                  <th className="py-3 px-3">อาการเสีย</th>
                  <th className="py-3 px-3 whitespace-nowrap">สถานะ</th>
                  <th className="py-3 px-3 whitespace-nowrap">วันที่รับ</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">ยอดเงิน</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredTickets.map(ticket => {
                  const statusInfo = STATUS_CONFIG[ticket.status];
                  const devices = getTicketDevices(ticket);
                  const canDeliveryNote =
                    ticket.status === 'repaired' ||
                    ticket.status === 'ready_pickup' ||
                    ticket.status === 'completed';

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => onEditTicket(ticket)}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                    >
                      {/* 1. Ticket Number */}
                      <td className="py-3 px-3.5 align-top whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {ticket.ticketNumber}
                        </div>
                        {ticket.isWarrantyClaim && (
                          <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>เคลมฟรี</span>
                          </span>
                        )}
                      </td>

                      {/* 2. Customer */}
                      <td className="py-3 px-3 align-top">
                        <div className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {ticket.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {ticket.customerPhone}
                        </div>
                        {ticket.paymentMethod === 'gov_credit' && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            <Building2 className="w-2.5 h-2.5" />
                            <span>ราชการ</span>
                          </span>
                        )}
                      </td>

                      {/* 3. Devices (supports N devices) */}
                      <td className="py-3 px-3 align-top max-w-[230px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {formatDevicesSummary(ticket)}
                          </span>
                          {devices.length > 1 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 shrink-0">
                              <Layers className="w-2.5 h-2.5" />
                              <span>{devices.length} เครื่อง</span>
                            </span>
                          )}
                        </div>
                        {devices.length === 1 && devices[0].serialNumber && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            S/N: {devices[0].serialNumber}
                          </div>
                        )}
                      </td>

                      {/* 4. Problem Description */}
                      <td className="py-3 px-3 align-top max-w-[230px]">
                        <p className="text-slate-700 dark:text-slate-300 line-clamp-2">
                          {ticket.problemDescription}
                        </p>
                      </td>

                      {/* 5. Status (Quick Change Dropdown) */}
                      <td className="py-3 px-3 align-top whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <select
                          value={ticket.status}
                          onChange={e => onUpdateStatus(ticket.id, e.target.value as RepairStatus)}
                          className={`text-[11px] font-bold py-1 px-2 rounded-lg border cursor-pointer focus:ring-1 focus:ring-blue-500 ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                        >
                          <option value="pending">1. รับเครื่องแล้ว</option>
                          <option value="diagnosing">2. กำลังตรวจเช็ค/ซ่อม</option>
                          <option value="waiting_parts">3. รออะไหล่</option>
                          <option value="repaired">4. ซ่อมเสร็จแล้ว</option>
                          <option value="ready_pickup">5. พร้อมส่งมอบ</option>
                          <option value="completed">6. ส่งมอบแล้ว</option>
                          <option value="cancelled">ยกเลิก</option>
                        </select>
                      </td>

                      {/* 6. Received Date */}
                      <td className="py-3 px-3 align-top whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {formatThaiDateFull(ticket.receivedDate)}
                      </td>

                      {/* 7. Total Amount */}
                      <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                        <div className="font-extrabold text-blue-700 dark:text-blue-400 text-sm">
                          ฿{(ticket.totalAmount || 0).toLocaleString()}
                        </div>
                        <span
                          className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-semibold mt-0.5 ${
                            ticket.isPaid
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {ticket.isPaid ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}
                        </span>
                      </td>

                      {/* 8. Action Buttons */}
                      <td className="py-3 px-3.5 align-top text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onPrintTicket(ticket)}
                            title="พิมพ์เอกสาร (A5)"
                            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <PrintIcon className="w-3.5 h-3.5" />
                            <span>พิมพ์</span>
                          </button>

                          {canDeliveryNote && (
                            <button
                              onClick={() => onPrintTicket(ticket, 'delivery_note')}
                              title="พิมพ์ใบส่งมอบของ"
                              className="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>ใบส่งมอบของ</span>
                            </button>
                          )}

                          <button
                            onClick={() => onLineNotify(ticket)}
                            title="แจ้ง LINE"
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenTracking(ticket)}
                            title="เช็คสถานะออนไลน์"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onEditTicket(ticket)}
                            title="แก้ไข"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`ต้องการลบใบรับซ่อม ${ticket.ticketNumber} ของคุณ ${ticket.customerName} หรือไม่?`)) {
                                onDeleteTicket(ticket.id);
                              }
                            }}
                            title="ลบ"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= CARD GRID VIEW MODE ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map(ticket => {
            const statusInfo = STATUS_CONFIG[ticket.status];
            const warrantyInfo = calculateTicketWarranty(ticket);
            const devices = getTicketDevices(ticket);
            const canDeliveryNote =
              ticket.status === 'repaired' ||
              ticket.status === 'ready_pickup' ||
              ticket.status === 'completed';

            const deviceIcon =
              ticket.deviceType === 'printer' ? (
                <Printer className="w-4 h-4 text-purple-500" />
              ) : ticket.deviceType === 'laptop' ? (
                <Laptop className="w-4 h-4 text-blue-500" />
              ) : (
                <Monitor className="w-4 h-4 text-cyan-500" />
              );

            return (
              <div
                key={ticket.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                        {deviceIcon}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {ticket.ticketNumber}
                          </span>
                          {devices.length > 1 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                              <Layers className="w-2.5 h-2.5" />
                              <span>{devices.length} เครื่อง</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Calendar className="w-3 h-3" />
                          <span>รับเข้า: {formatThaiDateFull(ticket.receivedDate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Warranty Badges */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                      >
                        {statusInfo.label}
                      </span>
                      {ticket.isWarrantyClaim && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                          <ShieldCheck className="w-3 h-3 text-purple-600" />
                          <span>งานเคลมฟรี {ticket.originalTicketNumber ? `(${ticket.originalTicketNumber})` : ''}</span>
                        </span>
                      )}
                      {warrantyInfo.hasWarranty && warrantyInfo.status !== 'no_warranty' && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${warrantyInfo.badgeClass}`}>
                          {warrantyInfo.badgeLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="mt-3">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {ticket.customerName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <a
                        href={`tel:${ticket.customerPhone}`}
                        className="hover:text-blue-600 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {ticket.customerPhone}
                      </a>
                      {ticket.customerLineId && (
                        <span className="text-[11px] text-emerald-600 font-medium">
                          • LINE: {ticket.customerLineId}
                        </span>
                      )}
                    </div>

                    {/* Government Credit Status Pill */}
                    {ticket.paymentMethod === 'gov_credit' && (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <Building2 className="w-3 h-3 text-purple-600" />
                          <span>{ticket.govCreditInfo?.agencyName || 'เครดิตราชการ'}</span>
                        </span>
                        {ticket.govCreditInfo?.dueDate && (() => {
                          const dueStatus = getGovCreditDueStatus(ticket.govCreditInfo.dueDate, ticket.govCreditInfo.billingStatus);
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${dueStatus.badgeClass}`}>
                              {dueStatus.badgeLabel}
                            </span>
                          );
                        })()}
                        {ticket.govCreditInfo?.disbursementNumber && (
                          <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 font-semibold">
                            {ticket.govCreditInfo.disbursementNumber}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Device & Problem Details */}
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 text-xs space-y-1.5">
                    {devices.length > 1 ? (
                      <div className="space-y-1">
                        {devices.map((dev, idx) => (
                          <div key={dev.id} className="flex justify-between items-baseline font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                            <span>{idx + 1}. {dev.brand} {dev.model}</span>
                            {dev.serialNumber && (
                              <span className="text-[10px] text-slate-400 font-mono">SN: {dev.serialNumber}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex justify-between items-baseline font-semibold text-slate-800 dark:text-slate-200">
                        <span>{ticket.brand} {ticket.model}</span>
                        {ticket.serialNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            SN: {ticket.serialNumber}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-slate-600 dark:text-slate-300 line-clamp-2">
                      <span className="font-medium text-slate-500">อาการ: </span>
                      {ticket.problemDescription}
                    </p>

                    {ticket.technicianNotes && (
                      <p className="text-blue-700 dark:text-blue-300 text-[11px] bg-blue-50/60 dark:bg-blue-950/30 p-1.5 rounded border border-blue-100 dark:border-blue-900/40 line-clamp-2">
                        <span className="font-semibold">ผลการตรวจ: </span>
                        {ticket.technicianNotes}
                      </p>
                    )}
                  </div>

                  {/* Accessories & Parts Info */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {ticket.accessories?.map((acc, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      >
                        +{acc}
                      </span>
                    ))}
                    {ticket.partsUsed?.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-medium">
                        ใช้อะไหล่ {ticket.partsUsed.length} รายการ
                      </span>
                    )}
                  </div>

                  {/* Financial Total & Discount Display */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-xs">ยอดสุทธิ:</span>
                        <span className="font-extrabold text-blue-700 dark:text-blue-400 text-base">
                          ฿{ticket.totalAmount.toLocaleString()}
                        </span>
                      </div>
                      {ticket.discount > 0 ? (
                        <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                          <span className="text-slate-400 line-through">
                            ฿{((ticket.laborCost || 0) + (ticket.partsCost || 0)).toLocaleString()}
                          </span>
                          <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                            ลด -฿{ticket.discount.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">
                          (ค่าแรง ฿{(ticket.laborCost || 0).toLocaleString()} + อะไหล่ ฿{(ticket.partsCost || 0).toLocaleString()})
                        </div>
                      )}
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          ticket.isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}
                      >
                        {ticket.isPaid ? 'ชำระเงินแล้ว' : 'ยังไม่ชำระ'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountModalTicket(ticket);
                          setQuickDiscountAmount(String(ticket.discount || 0));
                          setQuickDiscountMode('baht');
                        }}
                        className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
                      >
                        <Tag className="w-3 h-3" />
                        <span>{ticket.discount > 0 ? 'แก้ไขส่วนลด' : '+ ใส่ส่วนลด'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Status Bar & Actions Footer */}
                <div className="bg-slate-50 dark:bg-slate-900/80 px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">เปลี่ยนสถานะ:</span>
                    <select
                      value={ticket.status}
                      onChange={e => onUpdateStatus(ticket.id, e.target.value as RepairStatus)}
                      className="w-full text-xs py-1 px-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium focus:ring-1 focus:ring-blue-500"
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

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1 flex-wrap gap-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        onClick={() => onPrintTicket(ticket)}
                        title="พิมพ์ใบรับซ่อม / ใบเสร็จติด QR Code"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <PrintIcon className="w-3.5 h-3.5" />
                        <span>พิมพ์</span>
                      </button>

                      {canDeliveryNote && (
                        <button
                          onClick={() => onPrintTicket(ticket, 'delivery_note')}
                          title="พิมพ์ใบส่งมอบของ (ส่งคืนลูกค้า)"
                          className="flex items-center gap-1 px-2 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>ใบส่งมอบของ</span>
                        </button>
                      )}

                      <button
                        onClick={() => onLineNotify(ticket)}
                        title="ส่งข้อความแจ้งเตือนผ่าน LINE"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>LINE</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenTracking(ticket)}
                        title="เปิดหน้าตรวจเช็คสถานะออนไลน์ (เหมือนลูกค้าสแกน QR)"
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onEditTicket(ticket)}
                        title="แก้ไขข้อมูลงานซ่อมและอะไหล่"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`ต้องการลบใบรับซ่อม ${ticket.ticketNumber} ของคุณ ${ticket.customerName} หรือไม่?`)) {
                            onDeleteTicket(ticket.id);
                          }
                        }}
                        title="ลบใบรับซ่อม"
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Discount Modal */}
      {discountModalTicket && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  %
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    ปรับส่วนลดพิเศษ (Quick Discount)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {discountModalTicket.ticketNumber} • คุณ{discountModalTicket.customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDiscountModalTicket(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {/* Calculations Breakdown */}
            {(() => {
              const subtotal = (discountModalTicket.laborCost || 0) + (discountModalTicket.partsCost || 0);
              let disc = 0;
              if (quickDiscountMode === 'baht') {
                disc = Math.max(0, parseFloat(quickDiscountAmount) || 0);
              } else {
                const pct = Math.max(0, Math.min(100, parseFloat(quickDiscountAmount) || 0));
                disc = Math.round((subtotal * pct) / 100);
              }
              const effectiveDisc = Math.min(disc, subtotal);
              const newTotal = Math.max(0, subtotal - effectiveDisc);

              return (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 space-y-1.5 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>ค่าแรงตรวจเช็ค/บริการ:</span>
                      <span>฿{(discountModalTicket.laborCost || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>ค่าอะไหล่รวม ({discountModalTicket.partsUsed?.length || 0} รายการ):</span>
                      <span>฿{(discountModalTicket.partsCost || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span>รวมก่อนหักส่วนลด:</span>
                      <span>฿{subtotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Discount input & toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        ระบุจำนวนส่วนลด:
                      </label>
                      <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setQuickDiscountMode('baht')}
                          className={`px-3 py-1 transition-colors ${
                            quickDiscountMode === 'baht'
                              ? 'bg-rose-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          ฿ บาท
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickDiscountMode('percent')}
                          className={`px-3 py-1 transition-colors ${
                            quickDiscountMode === 'percent'
                              ? 'bg-rose-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          % เปอร์เซ็นต์
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={quickDiscountMode === 'percent' ? 100 : subtotal}
                        placeholder="0"
                        value={quickDiscountAmount}
                        onChange={e => setQuickDiscountAmount(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-extrabold text-base text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500"
                        autoFocus
                      />
                      <span className="absolute right-3.5 top-2.5 font-bold text-slate-400 text-sm">
                        {quickDiscountMode === 'baht' ? '฿' : '%'}
                      </span>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickDiscountMode('baht');
                          setQuickDiscountAmount('0');
                        }}
                        className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-[11px]"
                      >
                        ล้างส่วนลด (฿0)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickDiscountMode('baht');
                          setQuickDiscountAmount('50');
                        }}
                        className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 text-[11px] font-bold"
                      >
                        -฿50
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickDiscountMode('baht');
                          setQuickDiscountAmount('100');
                        }}
                        className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 text-[11px] font-bold"
                      >
                        -฿100
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickDiscountMode('baht');
                          setQuickDiscountAmount('200');
                        }}
                        className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 text-[11px] font-bold"
                      >
                        -฿200
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickDiscountMode('percent');
                          setQuickDiscountAmount('10');
                        }}
                        className="px-2 py-1 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-900 text-[11px] font-bold"
                      >
                        -10%
                      </button>
                      {discountModalTicket.laborCost > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuickDiscountMode('baht');
                            setQuickDiscountAmount(String(discountModalTicket.laborCost));
                          }}
                          className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-900 text-[11px] font-bold"
                        >
                          ฟรีค่าแรง (-฿{discountModalTicket.laborCost})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Net preview box */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        ยอดที่ต้องชำระหลังหักส่วนลด:
                      </span>
                      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                        ส่วนลด -฿{effectiveDisc.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-2xl font-black text-blue-900 dark:text-white">
                      ฿{newTotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setDiscountModalTicket(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onUpdateDiscount) {
                          onUpdateDiscount(discountModalTicket.id, effectiveDisc);
                        }
                        setDiscountModalTicket(null);
                      }}
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                    >
                      ✓ บันทึกส่วนลดทันที
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
