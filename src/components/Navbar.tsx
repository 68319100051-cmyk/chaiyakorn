import React, { useState, useRef, useEffect } from 'react';
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  Package,
  FileText,
  Plus,
  Settings,
  Smartphone,
  ShoppingCart,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Calendar,
  X
} from 'lucide-react';
import { GovBillAlertItem, getBangkokTodayStr } from '../utils/govCredit';

interface NavbarProps {
  activeTab: 'dashboard' | 'tickets' | 'inventory' | 'pos' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'tickets' | 'inventory' | 'pos' | 'reports') => void;
  onNewTicket: () => void;
  onOpenSettings: () => void;
  activeTicketsCount: number;
  lowStockCount: number;
  shopName: string;
  logoUrl?: string;
  onPreviewCustomer: () => void;
  govAlerts?: GovBillAlertItem[];
  onMarkGovBillPaid?: (source: 'ticket' | 'pos', id: string, paidDate?: string) => Promise<void> | void;
  onSnoozeGovBill?: (source: 'ticket' | 'pos', id: string, days: 1 | 3 | 7) => Promise<void> | void;
  onOpenGovBill?: (alert: GovBillAlertItem) => void;
  onViewGovAlertsInTickets?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNewTicket,
  onOpenSettings,
  activeTicketsCount,
  lowStockCount,
  shopName,
  logoUrl,
  onPreviewCustomer,
  govAlerts = [],
  onMarkGovBillPaid,
  onSnoozeGovBill,
  onOpenGovBill,
  onViewGovAlertsInTickets
}) => {
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [payingItemUid, setPayingItemUid] = useState<string | null>(null);
  const [paidDateInput, setPaidDateInput] = useState<string>(() => getBangkokTodayStr());
  const [snoozePickerUid, setSnoozePickerUid] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const bellWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (bellWrapperRef.current && !bellWrapperRef.current.contains(e.target as Node)) {
        setIsBellOpen(false);
        setPayingItemUid(null);
        setSnoozePickerUid(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const overdueCount = govAlerts.filter(a => a.dueInfo.status === 'overdue').length;
  const dueTodayCount = govAlerts.filter(a => a.dueInfo.status === 'due_today').length;
  const dueSoonCount = govAlerts.filter(a => a.dueInfo.status === 'due_soon').length;

  const badgeBgClass =
    overdueCount > 0
      ? 'bg-rose-600 text-white'
      : dueTodayCount > 0
      ? 'bg-orange-500 text-white'
      : 'bg-amber-400 text-slate-950';

  const handleConfirmPaid = async (item: GovBillAlertItem) => {
    if (!onMarkGovBillPaid) return;
    setBusyUid(item.uid);
    try {
      await onMarkGovBillPaid(item.source, item.id, paidDateInput || getBangkokTodayStr());
      setPayingItemUid(null);
    } finally {
      setBusyUid(null);
    }
  };

  const handleConfirmSnooze = async (item: GovBillAlertItem, days: 1 | 3 | 7) => {
    if (!onSnoozeGovBill) return;
    setBusyUid(item.uid);
    try {
      await onSnoozeGovBill(item.source, item.id, days);
      setSnoozePickerUid(null);
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Brand Logo & Shop Name */}
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0"
              onClick={() => setActiveTab('dashboard')}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={shopName}
                  className="w-9 h-9 sm:w-11 sm:h-11 object-contain rounded-xl bg-white p-0.5 shadow-md shadow-blue-500/20 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                  <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-extrabold text-sm sm:text-base md:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent truncate max-w-[130px] sm:max-w-xs">
                    {shopName}
                  </span>
                  <span className="hidden xs:inline-block text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 rounded-full bg-blue-950 text-blue-400 border border-blue-800 font-bold uppercase shrink-0">
                    Admin
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate max-w-[160px] sm:max-w-xs">
                  พัทลุง • 083-426-8058
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                แดชบอร์ด
              </button>

              <button
                onClick={() => setActiveTab('tickets')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === 'tickets'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                จัดการงานซ่อม
                {activeTicketsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-slate-950">
                    {activeTicketsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === 'inventory'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Package className="w-4 h-4" />
                คลังสต็อก & อะไหล่
                {lowStockCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                    {lowStockCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('pos')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'pos'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                ขายหน้าร้าน (POS)
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                สรุปยอด & ประวัติ
              </button>
            </nav>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Quick Preview Customer View */}
              <button
                onClick={onPreviewCustomer}
                title="ดูตัวอย่างหน้าลูกค้าเมื่อสแกน QR Code (Live Tracking Portal)"
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 hover:bg-emerald-900/50 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">หน้าลูกค้า (QR)</span>
                <span className="sm:hidden text-[10px]">QR ลูกค้า</span>
              </button>

              {/* Quick New Ticket Action */}
              <button
                onClick={onNewTicket}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/25 hover:from-blue-600 hover:to-cyan-600 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">เปิดใบรับซ่อม</span>
                <span className="sm:hidden">รับซ่อม</span>
              </button>

              {/* Government Bill Alert Bell */}
              <div ref={bellWrapperRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsBellOpen(prev => !prev);
                    setPaidDateInput(getBangkokTodayStr());
                  }}
                  title="แจ้งเตือนบิลราชการใกล้ครบกำหนด / เกินกำหนด"
                  className={`relative p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
                    isBellOpen
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${overdueCount > 0 ? 'text-rose-400' : ''}`} />
                  {govAlerts.length > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center shadow-md ${badgeBgClass}`}
                    >
                      {govAlerts.length}
                    </span>
                  )}
                </button>

                {/* Alert Dropdown / Popover */}
                {isBellOpen && (
                  <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-15 sm:top-full sm:mt-2 sm:w-[440px] max-w-[calc(100vw-1rem)] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden flex flex-col max-h-[82vh]">
                    {/* Popover Header */}
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              แจ้งเตือนบิลราชการ ({govAlerts.length} บิล)
                            </h3>
                            <p className="text-[10px] text-slate-500">
                              คำนวณตามเวลาประเทศไทย (Asia/Bangkok) • เรียงเกินกำหนดมากสุดไว้บนสุด
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsBellOpen(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Status Summary Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
                          เกินกำหนด: {overdueCount}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200 border border-orange-300 dark:border-orange-800">
                          ครบกำหนดวันนี้: {dueTodayCount}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                          ใกล้ครบกำหนด: {dueSoonCount}
                        </span>
                      </div>
                    </div>

                    {/* Alert Items List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {govAlerts.length === 0 ? (
                        <div className="py-10 px-4 text-center space-y-2">
                          <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            ไม่มีบิลราชการที่ใกล้ครบกำหนดหรือเกินกำหนด
                          </p>
                          <p className="text-[11px] text-slate-500">
                            บิลที่รับเงินแล้วหรือเลื่อนการแจ้งเตือนไว้จะไม่แสดงในรายการนี้
                          </p>
                        </div>
                      ) : (
                        govAlerts.map(item => {
                          const toneBorder =
                            item.dueInfo.colorTone === 'red'
                              ? 'border-l-4 border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/15'
                              : item.dueInfo.colorTone === 'orange'
                              ? 'border-l-4 border-l-orange-500 bg-orange-50/30 dark:bg-orange-950/15'
                              : 'border-l-4 border-l-amber-400 bg-amber-50/25 dark:bg-amber-950/10';

                          const isPaying = payingItemUid === item.uid;
                          const isSnoozing = snoozePickerUid === item.uid;
                          const isBusy = busyUid === item.uid;

                          return (
                            <div key={item.uid} className={`p-3 space-y-2 text-xs ${toneBorder}`}>
                              {/* Top line: Doc number + Status Badge + Amount */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                                      {item.docNumber}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[10px] border ${item.dueInfo.badgeClass}`}
                                    >
                                      {item.dueInfo.badgeLabel}
                                    </span>
                                  </div>
                                  <p className="font-bold text-slate-900 dark:text-white truncate mt-0.5">
                                    {item.agencyName}
                                  </p>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      ครบกำหนด: <strong className="text-slate-700 dark:text-slate-300">{item.dueDateFormatted}</strong>
                                    </span>
                                    {item.orderNumber && (
                                      <span className="font-mono text-[10px] text-slate-400">
                                        ({item.orderNumber})
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="text-sm font-black text-slate-900 dark:text-white">
                                    ฿{item.amount.toLocaleString()}
                                  </span>
                                  <span className="block text-[10px] text-slate-400">
                                    {item.source === 'ticket' ? 'งานซ่อม' : 'ขาย POS'}
                                  </span>
                                </div>
                              </div>

                              {/* Inline Paid Date Picker */}
                              {isPaying && (
                                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                                      วันที่รับเงิน:
                                    </span>
                                    <input
                                      type="date"
                                      value={paidDateInput}
                                      onChange={e => setPaidDateInput(e.target.value)}
                                      className="px-2 py-1 rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-[11px] font-mono text-slate-900 dark:text-white"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleConfirmPaid(item)}
                                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer disabled:opacity-50"
                                    >
                                      {isBusy ? 'กำลังบันทึก...' : 'ยืนยันรับเงิน'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPayingItemUid(null)}
                                      className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer"
                                    >
                                      ยกเลิก
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Inline Snooze Options */}
                              {isSnoozing && (
                                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                    เลื่อนการแจ้งเตือนออกไป:
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {([1, 3, 7] as const).map(d => (
                                      <button
                                        key={d}
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleConfirmSnooze(item, d)}
                                        className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                                      >
                                        {d} วัน
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => setSnoozePickerUid(null)}
                                      className="px-1.5 py-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Per-bill Action Buttons */}
                              <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    setSnoozePickerUid(null);
                                    setPaidDateInput(getBangkokTodayStr());
                                    setPayingItemUid(isPaying ? null : item.uid);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>บันทึกรับเงินแล้ว</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    setPayingItemUid(null);
                                    setSnoozePickerUid(isSnoozing ? null : item.uid);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>เลื่อนการแจ้งเตือน</span>
                                </button>

                                {onOpenGovBill && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsBellOpen(false);
                                      onOpenGovBill(item);
                                    }}
                                    className="ml-auto px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>เปิดบิล</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Popover Footer */}
                    {onViewGovAlertsInTickets && (
                      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setIsBellOpen(false);
                            onViewGovAlertsInTickets();
                          }}
                          className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs text-center cursor-pointer transition-colors"
                        >
                          ดูรายการบิลราชการทั้งหมด
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Shop Settings */}
              <button
                onClick={onOpenSettings}
                title="ตั้งค่าร้านค้า & การแจ้งเตือนบิลราชการ"
                className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modern Docked Bottom Navigation Bar for Mobile (Thumb-Friendly) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 shadow-2xl px-1 py-1 flex items-center justify-around print:hidden pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-blue-400 font-bold bg-blue-950/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">แดชบอร์ด</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all relative cursor-pointer ${
            activeTab === 'tickets'
              ? 'text-blue-400 font-bold bg-blue-950/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <ClipboardList className="w-5 h-5 mb-0.5" />
            {activeTicketsCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 min-w-4 text-[9px] font-bold rounded-full bg-amber-500 text-slate-950 text-center">
                {activeTicketsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight">งานซ่อม</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all relative cursor-pointer ${
            activeTab === 'inventory'
              ? 'text-blue-400 font-bold bg-blue-950/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Package className="w-5 h-5 mb-0.5" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 min-w-4 text-[9px] font-bold rounded-full bg-rose-500 text-white text-center">
                {lowStockCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight">สต็อก</span>
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'pos'
              ? 'text-emerald-400 font-bold bg-emerald-950/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-5 h-5 mb-0.5 text-emerald-400" />
          <span className="text-[10px] leading-tight">ขาย POS</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'text-blue-400 font-bold bg-blue-950/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">สรุปบิล</span>
        </button>
      </nav>
    </>
  );
};
