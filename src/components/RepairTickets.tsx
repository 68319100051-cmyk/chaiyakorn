import React, { useState, useMemo } from 'react';
import {
  RepairTicket,
  DeviceType,
  RepairStatus,
  STATUS_CONFIG,
  DEVICE_LABELS
} from '../types';
import {
  Search,
  Plus,
  Filter,
  Printer as PrintIcon,
  MessageSquare,
  Edit3,
  Trash2,
  ExternalLink,
  ChevronRight,
  Monitor,
  Laptop,
  Printer,
  CheckCircle,
  Clock,
  Phone,
  Tag,
  Calendar
} from 'lucide-react';

interface RepairTicketsProps {
  tickets: RepairTicket[];
  onNewTicket: () => void;
  onEditTicket: (ticket: RepairTicket) => void;
  onDeleteTicket: (ticketId: string) => void;
  onUpdateStatus: (ticketId: string, status: RepairStatus) => void;
  onPrintTicket: (ticket: RepairTicket) => void;
  onLineNotify: (ticket: RepairTicket) => void;
  onOpenTracking: (ticket: RepairTicket) => void;
}

export const RepairTickets: React.FC<RepairTicketsProps> = ({
  tickets,
  onNewTicket,
  onEditTicket,
  onDeleteTicket,
  onUpdateStatus,
  onPrintTicket,
  onLineNotify,
  onOpenTracking
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<'all' | DeviceType>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | RepairStatus>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Search filter
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        ticket.ticketNumber.toLowerCase().includes(term) ||
        ticket.customerName.toLowerCase().includes(term) ||
        ticket.customerPhone.includes(term) ||
        ticket.brand.toLowerCase().includes(term) ||
        ticket.model.toLowerCase().includes(term) ||
        (ticket.serialNumber && ticket.serialNumber.toLowerCase().includes(term)) ||
        ticket.problemDescription.toLowerCase().includes(term);

      // Device filter
      const matchDevice = selectedDevice === 'all' || ticket.deviceType === selectedDevice;

      // Status filter
      const matchStatus = selectedStatus === 'all' || ticket.status === selectedStatus;

      return matchSearch && matchDevice && matchStatus;
    });
  }, [tickets, searchTerm, selectedDevice, selectedStatus]);

  const statusOptions: { value: 'all' | RepairStatus; label: string }[] = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'pending', label: 'รับเครื่องแล้ว' },
    { value: 'diagnosing', label: 'กำลังตรวจเช็ค/ซ่อม' },
    { value: 'waiting_parts', label: 'รออะไหล่' },
    { value: 'ready_pickup', label: 'พร้อมส่งมอบ' },
    { value: 'completed', label: 'ส่งมอบแล้ว' },
    { value: 'cancelled', label: 'ยกเลิก' }
  ];

  return (
    <div className="space-y-5">
      {/* Top Header & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span>รายการงานซ่อม</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold">
              {filteredTickets.length} / {tickets.length} รายการ
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            จัดการสถานะงานซ่อมคอมพิวเตอร์ โน้ตบุ๊ก ปริ้นเตอร์ แจ้งเตือน LINE และพิมพ์ใบรับซ่อม
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
                ? tickets.length
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
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            ไม่พบรายการงานซ่อม
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            ไม่พบงานซ่อมที่ตรงกับเงื่อนไขการค้นหา คุณสามารถล้างตัวกรองหรือเปิดใบรับซ่อมใหม่ได้ทันที
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDevice('all');
                setSelectedStatus('all');
              }}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            >
              ล้างตัวกรอง
            </button>
            <button
              onClick={onNewTicket}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm"
            >
              + เปิดใบรับซ่อมใหม่
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map(ticket => {
            const statusInfo = STATUS_CONFIG[ticket.status];
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
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {ticket.ticketNumber}
                        </span>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Calendar className="w-3 h-3" />
                          <span>รับเข้า: {ticket.receivedDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                    >
                      {statusInfo.label}
                    </span>
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
                  </div>

                  {/* Device & Problem Details */}
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 text-xs space-y-1.5">
                    <div className="flex justify-between items-baseline font-semibold text-slate-800 dark:text-slate-200">
                      <span>{ticket.brand} {ticket.model}</span>
                      {ticket.serialNumber && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          SN: {ticket.serialNumber}
                        </span>
                      )}
                    </div>

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

                  {/* Financial Total */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500">ค่าแรง+อะไหล่: </span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        ฿{ticket.totalAmount.toLocaleString()}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        ticket.isPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                      }`}
                    >
                      {ticket.isPaid ? 'ชำระเงินแล้ว' : 'ยังไม่ชำระ'}
                    </span>
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
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onPrintTicket(ticket)}
                        title="พิมพ์ใบรับซ่อม / ใบเสร็จติด QR Code"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                      >
                        <PrintIcon className="w-3.5 h-3.5" />
                        <span>พิมพ์ใบรับซ่อม</span>
                      </button>

                      <button
                        onClick={() => onLineNotify(ticket)}
                        title="ส่งข้อความแจ้งเตือนผ่าน LINE"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>แจ้ง LINE</span>
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
    </div>
  );
};
