import React from 'react';
import {
  RepairTicket,
  InventoryItem,
  STATUS_CONFIG,
  DEVICE_LABELS,
  POSSaleRecord
} from '../types';
import {
  Wrench,
  Clock,
  AlertCircle,
  CheckCircle2,
  Package,
  TrendingUp,
  Printer,
  Monitor,
  Laptop,
  Plus,
  ArrowRight,
  MessageSquare,
  Printer as PrintIcon,
  ShoppingCart,
  Building2
} from 'lucide-react';

interface DashboardProps {
  tickets: RepairTicket[];
  inventory: InventoryItem[];
  posSales?: POSSaleRecord[];
  onNewTicket: () => void;
  onOpenPOS?: () => void;
  onSelectTicket: (ticket: RepairTicket) => void;
  onPrintTicket: (ticket: RepairTicket) => void;
  onLineNotify: (ticket: RepairTicket) => void;
  onViewAllTickets: () => void;
  onViewClosedTickets?: () => void;
  onViewInventory: () => void;
  onOpenGovBilling?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  tickets,
  inventory,
  posSales = [],
  onNewTicket,
  onOpenPOS,
  onSelectTicket,
  onPrintTicket,
  onLineNotify,
  onViewAllTickets,
  onViewClosedTickets,
  onViewInventory,
  onOpenGovBilling
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Government Credit pending bills count & sum
  const pendingGovTickets = tickets.filter(
    t => t.paymentMethod === 'gov_credit' && t.govCreditInfo?.billingStatus !== 'paid'
  );
  const pendingGovSales = (posSales || []).filter(
    s => s.paymentMethod === 'gov_credit' && s.govCreditInfo?.billingStatus !== 'paid'
  );
  const pendingGovBillsCount = pendingGovTickets.length + pendingGovSales.length;
  const pendingGovAmount =
    pendingGovTickets.reduce((sum, t) => sum + (t.totalAmount || 0), 0) +
    pendingGovSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  // Calculated metrics
  const pendingCount = tickets.filter(t => t.status === 'pending').length;
  const diagnosingCount = tickets.filter(t => t.status === 'diagnosing').length;
  const waitingPartsCount = tickets.filter(t => t.status === 'waiting_parts').length;
  const readyPickupCount = tickets.filter(t => t.status === 'ready_pickup').length;
  const completedTodayCount = tickets.filter(
    t => t.status === 'completed' && (t.deliveredDate === todayStr || t.updatedAt?.startsWith(todayStr))
  ).length;

  const activeRepairsCount = tickets.filter(
    t => t.status !== 'completed' && t.status !== 'cancelled'
  ).length;

  // Today's repair revenue calculation
  const todayRepairRevenue = tickets
    .filter(t => t.isPaid && (t.deliveredDate === todayStr || t.updatedAt?.startsWith(todayStr)))
    .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

  // Today's POS sales revenue
  const todayPOSRevenue = (posSales || [])
    .filter(s => s.createdAt?.startsWith(todayStr))
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const todayRevenue = todayRepairRevenue + todayPOSRevenue;

  // Low stock inventory items
  const lowStockItems = inventory.filter(i => i.stockQuantity <= i.minStockAlert);

  // Device Breakdown
  const computerCount = tickets.filter(t => t.deviceType === 'computer').length;
  const laptopCount = tickets.filter(t => t.deviceType === 'laptop').length;
  const printerCount = tickets.filter(t => t.deviceType === 'printer').length;
  const otherCount = tickets.filter(t => t.deviceType === 'other').length;
  const totalCount = tickets.length || 1;

  // Tickets ready for pickup (high priority)
  const readyTickets = tickets.filter(t => t.status === 'ready_pickup');
  const recentTickets = tickets.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                ระบบจัดการร้านซ่อมออนไลน์
              </span>
              <span className="text-slate-400 text-xs">
                วันที่ {new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight">
              ภาพรวมงานซ่อมคอมพิวเตอร์ & ปริ้นเตอร์
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              ติดตามสถานะงานซ่อมแบบเรียลไทม์ พร้อมระบบแจ้งเตือน LINE, พิมพ์ใบรับซ่อมติด QR Code และตัดสต็อกอะไหล่อัตโนมัติ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenPOS && (
              <button
                onClick={onOpenPOS}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-600 transition-all active:scale-95 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>ขายหน้าร้าน (POS)</span>
              </button>
            )}
            {onOpenGovBilling && (
              <button
                onClick={onOpenGovBilling}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition-all active:scale-95 cursor-pointer"
                title="รวมบิลวางบิลราชการอัตโนมัติตามเลขประจำตัวผู้เสียภาษี"
              >
                <Building2 className="w-4 h-4 text-purple-200" />
                <span>รวมบิลวางบิลราชการ</span>
                {pendingGovBillsCount > 0 && (
                  <span className="bg-purple-800 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {pendingGovBillsCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={onNewTicket}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-cyan-600 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เปิดใบรับซ่อมใหม่</span>
            </button>
            <button
              onClick={onViewAllTickets}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors"
            >
              <span>ดูงานซ่อมทั้งหมด ({tickets.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Government Credit Billing Alert Banner */}
      {pendingGovBillsCount > 0 && onOpenGovBilling && (
        <div className="bg-gradient-to-r from-purple-900/20 via-indigo-900/15 to-purple-900/20 border border-purple-300 dark:border-purple-800/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-3 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-600/30 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-purple-900 dark:text-purple-200">
                  มีรายการเครดิตราชการรอรวมบิลวางบิล
                </span>
                <span className="text-xs bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-full font-semibold border border-purple-400/30">
                  {pendingGovBillsCount} บิล • รวม ฿{pendingGovAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                ระบบจะตรวจสอบเลขประจำตัวผู้เสียภาษี 13 หลักที่ตรงกัน และรวมเป็นบิลเดียวพร้อมคำนวณยอดรวม, ตัวอักษรภาษาไทย, QR พร้อมเพย์ และช่องลงนาม 3 ฝ่ายให้ทันที
              </p>
            </div>
          </div>
          <button
            onClick={onOpenGovBilling}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer w-full sm:w-auto justify-center"
          >
            <span>เปิดหน้ารวมบิลวางบิล</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Repairs */}
        <div className="bg-white dark:bg-slate-800/90 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              งานที่กำลังดำเนินการ
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800 dark:text-white">
              {activeRepairsCount}
            </span>
            <span className="text-xs text-slate-500">เครื่องในร้าน</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
            <span>รอตรวจ {pendingCount} | ซ่อมอยู่ {diagnosingCount}</span>
          </div>
        </div>

        {/* Ready for Pickup */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              ซ่อมเสร็จพร้อมส่งมอบ
            </span>
            <div className="p-2 rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
              {readyPickupCount}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-500">รอส่งมอบลูกค้า</span>
          </div>
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400/90 font-medium">
            {readyPickupCount > 0 ? 'ส่ง LINE แจ้งลูกค้าให้มารับเครื่องได้ทันที' : 'ไม่มีเครื่องค้างส่งมอบ'}
          </p>
        </div>

        {/* Today's Revenue & Closed Bills */}
        <div
          onClick={onViewClosedTickets}
          className={`bg-white dark:bg-slate-800/90 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow ${
            onViewClosedTickets ? 'cursor-pointer group' : ''
          }`}
          title="คลิกเพื่อดูรายการที่ปิดบิลแล้ว / ส่งมอบแล้ว"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              รายได้ค่าซ่อมวันนี้
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800 dark:text-white">
              ฿{todayRevenue.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>ปิดงานส่งมอบแล้ว {completedTodayCount} เครื่องวันนี้</span>
            {onViewClosedTickets && (
              <span className="text-blue-600 dark:text-blue-400 font-medium group-hover:underline flex items-center gap-0.5">
                ดูประวัติปิดบิล <ArrowRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={onViewInventory}
          className="bg-white dark:bg-slate-800/90 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              อะไหล่ใกล้หมดสต็อก
            </span>
            <div className={`p-2 rounded-lg ${
              lowStockItems.length > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 animate-pulse' : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${
              lowStockItems.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'
            }`}>
              {lowStockItems.length}
            </span>
            <span className="text-xs text-slate-500">รายการที่ต้องสั่งเพิ่ม</span>
          </div>
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:underline">
            <span>ตรวจสอบคลังสต็อก</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </div>
      </div>

      {/* Priority Section: เครื่องที่ซ่อมเสร็จแล้ว พร้อมส่งมอบและแจ้งลูกค้า */}
      {readyTickets.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                เครื่องซ่อมเสร็จแล้ว พร้อมส่งมอบให้ลูกค้า ({readyTickets.length} รายการ)
              </h2>
            </div>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              สามารถกดแจ้งเตือน LINE ให้ลูกค้า หรือพิมพ์ใบเสร็จรับเงินได้ทันที
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {readyTickets.map(ticket => (
              <div
                key={ticket.id}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800/60 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-semibold text-slate-500">
                        {ticket.ticketNumber}
                      </span>
                      <h3 className="font-bold text-slate-800 dark:text-white text-base">
                        {ticket.customerName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        โทร: <span className="font-medium text-slate-700 dark:text-slate-300">{ticket.customerPhone}</span>
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-700">
                      พร้อมรับเครื่อง
                    </span>
                  </div>

                  <div className="mt-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-300">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {ticket.brand} {ticket.model}
                    </p>
                    <p className="text-slate-500 truncate mt-0.5">
                      {ticket.technicianNotes || ticket.problemDescription}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500 text-xs">ยอดชำระ:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-base">
                      ฿{ticket.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                  <button
                    onClick={() => onLineNotify(ticket)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>แจ้งเตือน LINE</span>
                  </button>
                  <button
                    onClick={() => onPrintTicket(ticket)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="พิมพ์ใบเสร็จ/ส่งมอบ"
                  >
                    <PrintIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSelectTicket(ticket)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-medium"
                    title="ดูรายละเอียด"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Recent Work & Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets Table (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                งานซ่อมล่าสุด
              </h2>
              <p className="text-xs text-slate-500">
                รายการที่รับเข้ามาและอัปเดตสถานะล่าสุดในระบบ
              </p>
            </div>
            <button
              onClick={onViewAllTickets}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              ดูทั้งหมด ({tickets.length})
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-y border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">เลขที่ใบรับ</th>
                  <th className="py-2.5 px-3">ลูกค้า / อุปกรณ์</th>
                  <th className="py-2.5 px-3">อาการเสีย</th>
                  <th className="py-2.5 px-3">สถานะ</th>
                  <th className="py-2.5 px-3 text-right">ยอดรวม</th>
                  <th className="py-2.5 px-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {recentTickets.map(ticket => {
                  const statusInfo = STATUS_CONFIG[ticket.status];
                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      onClick={() => onSelectTicket(ticket)}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {ticket.ticketNumber}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 dark:text-white">
                          {ticket.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {ticket.brand} {ticket.model}
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-slate-600 dark:text-slate-300">
                        {ticket.problemDescription}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800 dark:text-white whitespace-nowrap">
                        ฿{ticket.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onPrintTicket(ticket)}
                            className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            title="พิมพ์ใบรับซ่อม / QR Code"
                          >
                            <PrintIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onLineNotify(ticket)}
                            className="p-1 rounded text-emerald-600 hover:text-emerald-700"
                            title="แจ้ง LINE ลูกค้า"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
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

        {/* Right Column: Device Breakdown & Low Stock Alert */}
        <div className="space-y-6">
          {/* Device Type Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <h2 className="text-base font-bold text-slate-800 dark:text-white mb-1">
              สัดส่วนประเภทอุปกรณ์ที่รับซ่อม
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              จำแนกตามประเภทคอมพิวเตอร์และปริ้นเตอร์
            </p>

            <div className="space-y-3">
              {/* Printer */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Printer className="w-3.5 h-3.5 text-purple-500" />
                    เครื่องพิมพ์ (Printer)
                  </span>
                  <span className="text-slate-500">
                    {printerCount} เครื่อง ({Math.round((printerCount / totalCount) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(printerCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* Laptop */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Laptop className="w-3.5 h-3.5 text-blue-500" />
                    โน้ตบุ๊ก (Laptop)
                  </span>
                  <span className="text-slate-500">
                    {laptopCount} เครื่อง ({Math.round((laptopCount / totalCount) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(laptopCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* Computer Desktop */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Monitor className="w-3.5 h-3.5 text-cyan-500" />
                    คอมพิวเตอร์ PC (Desktop)
                  </span>
                  <span className="text-slate-500">
                    {computerCount} เครื่อง ({Math.round((computerCount / totalCount) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${(computerCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Warning List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  อะไหล่ที่ต้องสั่งเติม ({lowStockItems.length})
                </h3>
              </div>
              <button
                onClick={onViewInventory}
                className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                จัดการสต็อก
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                สต็อกอะไหล่และหมึกพิมพ์อยู่ในระดับเพียงพอทั้งหมด
              </p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.slice(0, 4).map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {item.itemCode} • ตู้ {item.locationShelf || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        เหลือ {item.stockQuantity} {item.unit}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        ขั้นต่ำ {item.minStockAlert}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
