import React, { useState, useMemo } from 'react';
import { RepairTicket, ShopSettings, STATUS_CONFIG, DEVICE_LABELS, POSSaleRecord } from '../types';
import {
  Calendar,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Package,
  Wrench,
  Search,
  Printer as PrintIcon,
  Download,
  Filter,
  ArrowRight,
  ShieldAlert,
  Tag,
  ShoppingCart,
  Receipt,
  Building2
} from 'lucide-react';

interface DailyReportViewProps {
  tickets: RepairTicket[];
  posSales?: POSSaleRecord[];
  shopSettings: ShopSettings;
  onSelectTicket: (ticket: RepairTicket) => void;
  onPrintTicket: (ticket: RepairTicket) => void;
  onViewPOSReceipt?: (sale: POSSaleRecord) => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  tickets,
  posSales = [],
  shopSettings,
  onSelectTicket,
  onPrintTicket,
  onViewPOSReceipt
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'daily' | 'history'>('daily');

  // Filter tickets for the selected day
  const dailyCompletedTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchDelivered = t.deliveredDate === selectedDate;
      const matchCompleted = t.completedDate === selectedDate;
      const matchUpdated = t.updatedAt?.startsWith(selectedDate) && t.status === 'completed';
      return matchDelivered || matchCompleted || matchUpdated;
    });
  }, [tickets, selectedDate]);

  const dailyReceivedTickets = useMemo(() => {
    return tickets.filter(t => t.receivedDate === selectedDate || t.createdAt?.startsWith(selectedDate));
  }, [tickets, selectedDate]);

  // Filter POS sales for the selected day
  const dailyPOSSales = useMemo(() => {
    return (posSales || []).filter(s => s.createdAt?.startsWith(selectedDate));
  }, [posSales, selectedDate]);

  // Financial calculations for the selected day
  const dailyLaborRevenue = dailyCompletedTickets.reduce((sum, t) => sum + (t.laborCost || 0), 0);
  const dailyPartsRevenue = dailyCompletedTickets.reduce((sum, t) => sum + (t.partsCost || 0), 0);
  const dailyDiscounts = dailyCompletedTickets.reduce((sum, t) => sum + (Number(t.discount) || 0), 0);
  const dailyRepairRevenue = dailyCompletedTickets
    .filter(t => t.isPaid)
    .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

  const dailyPOSRevenue = dailyPOSSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const dailyTotalRevenue = dailyRepairRevenue + dailyPOSRevenue;

  // Payment method breakdown
  const cashTotal =
    dailyCompletedTickets
      .filter(t => t.paymentMethod === 'cash' && t.isPaid)
      .reduce((sum, t) => sum + t.totalAmount, 0) +
    dailyPOSSales
      .filter(s => s.paymentMethod === 'cash')
      .reduce((sum, s) => sum + s.totalAmount, 0);

  const transferTotal =
    dailyCompletedTickets
      .filter(t => t.paymentMethod === 'transfer' && t.isPaid)
      .reduce((sum, t) => sum + t.totalAmount, 0) +
    dailyPOSSales
      .filter(s => s.paymentMethod === 'transfer')
      .reduce((sum, s) => sum + s.totalAmount, 0);

  const govCreditTotal =
    dailyCompletedTickets
      .filter(t => t.paymentMethod === 'gov_credit')
      .reduce((sum, t) => sum + t.totalAmount, 0) +
    dailyPOSSales
      .filter(s => s.paymentMethod === 'gov_credit')
      .reduce((sum, s) => sum + s.totalAmount, 0);

  const govCreditPending =
    dailyCompletedTickets
      .filter(t => t.paymentMethod === 'gov_credit' && t.govCreditInfo?.billingStatus !== 'paid')
      .reduce((sum, t) => sum + t.totalAmount, 0) +
    dailyPOSSales
      .filter(s => s.paymentMethod === 'gov_credit' && s.govCreditInfo?.billingStatus !== 'paid')
      .reduce((sum, s) => sum + s.totalAmount, 0);

  const govCreditPaid =
    dailyCompletedTickets
      .filter(t => t.paymentMethod === 'gov_credit' && t.govCreditInfo?.billingStatus === 'paid')
      .reduce((sum, t) => sum + t.totalAmount, 0) +
    dailyPOSSales
      .filter(s => s.paymentMethod === 'gov_credit' && s.govCreditInfo?.billingStatus === 'paid')
      .reduce((sum, s) => sum + s.totalAmount, 0);

  // Searchable Historical Repair Logs
  const historyFilteredTickets = useMemo(() => {
    const term = historySearchTerm.trim().toLowerCase();
    if (!term) return tickets;

    return tickets.filter(t => {
      return (
        t.ticketNumber.toLowerCase().includes(term) ||
        t.customerName.toLowerCase().includes(term) ||
        t.customerPhone.includes(term) ||
        t.brand.toLowerCase().includes(term) ||
        t.model.toLowerCase().includes(term) ||
        (t.serialNumber && t.serialNumber.toLowerCase().includes(term)) ||
        t.problemDescription.toLowerCase().includes(term)
      );
    });
  }, [tickets, historySearchTerm]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['TicketNumber,Date,Customer,Phone,Device,Brand,Model,SN,Status,Labor,Parts,Discount,Total,Paid'];
    const rows = dailyCompletedTickets.map(t =>
      `"${t.ticketNumber}","${t.receivedDate}","${t.customerName}","${t.customerPhone}","${t.deviceType}","${t.brand}","${t.model}","${t.serialNumber || ''}","${t.status}",${t.laborCost || 0},${t.partsCost || 0},${t.discount || 0},${t.totalAmount || 0},"${t.isPaid ? 'Paid' : 'Unpaid'}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fixpro-daily-report-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span>สรุปยอดขายและประวัติการซ่อม</span>
          </h1>
          <p className="text-xs text-slate-500">
            ดูสถิติรายรับ ค่าแรง ค่าอะไหล่ประจำวัน และค้นหาประวัติการซ่อมย้อนหลังของลูกค้าทุกราย
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'daily'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            สรุปยอดขายรายวัน
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            ค้นหาประวัติการซ่อมทั้งหมด ({tickets.length})
          </button>
        </div>
      </div>

      {activeTab === 'daily' ? (
        /* ================= DAILY REPORT VIEW ================= */
        <div className="space-y-6">
          {/* Date Picker Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                เลือกวันที่ต้องการดูรายงาน:
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                วันนี้
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ส่งออก CSV</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
              >
                <PrintIcon className="w-3.5 h-3.5" />
                <span>พิมพ์รายงาน</span>
              </button>
            </div>
          </div>

          {/* Revenue Breakdown KPI Cards (5 Cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold">ยอดรับชำระสุทธิ</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                ฿{dailyTotalRevenue.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                ปิดงานส่งมอบ {dailyCompletedTickets.length} เครื่อง
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold">รายได้ค่าแรง/บริการ</span>
                <Wrench className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mt-2">
                ฿{dailyLaborRevenue.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                กำไรจากค่าแรงช่าง
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold">รายได้ค่าอะไหล่</span>
                <Package className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mt-2">
                ฿{dailyPartsRevenue.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                จากรายการอะไหล่
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-rose-200 dark:border-rose-900/60 shadow-sm bg-rose-50/20 dark:bg-rose-950/20">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-rose-600 dark:text-rose-400">ส่วนลดที่ให้ลูกค้า</span>
                <Tag className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
                ฿{dailyDiscounts.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                ลดพิเศษให้ลูกค้า
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold">เครื่องรับเข้าใหม่</span>
                <Calendar className="w-4 h-4 text-cyan-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-cyan-600 dark:text-cyan-400 mt-2">
                {dailyReceivedTickets.length} <span className="text-xs font-normal text-slate-500">เครื่อง</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                เปิดใบรับซ่อมวันนี้
              </p>
            </div>
          </div>

          {/* Payment Method Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">
              ช่องทางการรับชำระเงินประจำวันที่ {selectedDate}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                <span className="text-slate-500">โอนเงินธนาคาร / QR พร้อมเพย์:</span>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  ฿{transferTotal.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                <span className="text-slate-500">เงินสด (Cash):</span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ฿{cashTotal.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
                <div className="flex items-center justify-between text-purple-900 dark:text-purple-300">
                  <span className="font-semibold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>เครดิตราชการ / วางบิล:</span>
                  </span>
                </div>
                <p className="text-lg font-extrabold text-purple-700 dark:text-purple-300 mt-0.5">
                  ฿{govCreditTotal.toLocaleString()}
                </p>
                <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
                  รอเบิกจ่าย ฿{govCreditPending.toLocaleString()} • ได้รับแล้ว ฿{govCreditPaid.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                <span className="text-slate-500">ส่วนลดที่ให้ลูกค้า:</span>
                <p className="text-lg font-bold text-rose-600 mt-0.5">
                  -฿{dailyDiscounts.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Completed Jobs Table for Selected Day */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                  รายการส่งมอบเครื่องและรับเงินประจำวัน ({dailyCompletedTickets.length} รายการ)
                </h3>
                <p className="text-xs text-slate-500">
                  เครื่องที่ส่งมอบและเก็บเงินในวันที่ {selectedDate}
                </p>
              </div>
            </div>

            {dailyCompletedTickets.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                ไม่มีรายการปิดงานหรือส่งมอบเครื่องในวันที่เลือก
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">เลขที่ใบรับ</th>
                      <th className="py-2.5 px-3">ลูกค้า</th>
                      <th className="py-2.5 px-3">อุปกรณ์</th>
                      <th className="py-2.5 px-3">งานที่ทำ</th>
                      <th className="py-2.5 px-3 text-right">ค่าแรง</th>
                      <th className="py-2.5 px-3 text-right">ค่าอะไหล่</th>
                      <th className="py-2.5 px-3 text-right">ส่วนลด</th>
                      <th className="py-2.5 px-3 text-right">ยอดสุทธิ</th>
                      <th className="py-2.5 px-3 text-center">วิธีชำระ</th>
                      <th className="py-2.5 px-3 text-center">พิมพ์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {dailyCompletedTickets.map(t => (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                        onClick={() => onSelectTicket(t)}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {t.ticketNumber}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-white">
                          {t.customerName}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {t.brand} {t.model}
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate text-slate-600 dark:text-slate-300">
                          {t.technicianNotes || t.problemDescription}
                        </td>
                        <td className="py-3 px-3 text-right">฿{(t.laborCost || 0).toLocaleString()}</td>
                        <td className="py-3 px-3 text-right">฿{(t.partsCost || 0).toLocaleString()}</td>
                        <td className="py-3 px-3 text-right">
                          {(Number(t.discount) || 0) > 0 ? (
                            <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                              -฿{(Number(t.discount) || 0).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-blue-900 dark:text-white">
                          ฿{(t.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-700">
                            {t.paymentMethod === 'transfer' ? 'โอนเงิน' : 'เงินสด'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => onPrintTicket(t)}
                            className="p-1 rounded text-slate-500 hover:text-slate-800"
                            title="พิมพ์ใบเสร็จ"
                          >
                            <PrintIcon className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* POS Retail Sales Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>บิลขายหน้าร้าน (POS) ประจำวันที่ {selectedDate} ({dailyPOSSales.length} รายการ)</span>
              </h3>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                รวมยอดขายหน้าร้าน: ฿{dailyPOSRevenue.toLocaleString()}
              </span>
            </div>

            {dailyPOSSales.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                ไม่มีรายการขายหน้าร้าน (POS) ในวันที่เลือก
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">เลขที่ใบเสร็จ</th>
                      <th className="py-2.5 px-3">เวลา</th>
                      <th className="py-2.5 px-3">ลูกค้า</th>
                      <th className="py-2.5 px-3">รายการสินค้า</th>
                      <th className="py-2.5 px-3 text-right">ยอดรวม</th>
                      <th className="py-2.5 px-3 text-right">ส่วนลด</th>
                      <th className="py-2.5 px-3 text-right">ยอดสุทธิ</th>
                      <th className="py-2.5 px-3 text-center">วิธีชำระ</th>
                      <th className="py-2.5 px-3 text-center">ใบเสร็จ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {dailyPOSSales.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {s.receiptNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {new Date(s.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-white">
                          {s.customerName || 'ลูกค้าทั่วไป'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {s.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                        </td>
                        <td className="py-3 px-3 text-right">฿{s.subtotal.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-rose-500 font-semibold">
                          {s.discount > 0 ? `-฿${s.discount.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-emerald-700 dark:text-emerald-400">
                          ฿{s.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {s.paymentMethod === 'gov_credit' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 inline-flex items-center gap-0.5">
                              <Building2 className="w-3 h-3" />
                              <span>เครดิตราชการ</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-700">
                              {s.paymentMethod === 'transfer' ? 'โอนเงิน' : s.paymentMethod === 'credit' ? 'บัตรเครดิต' : 'เงินสด'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {onViewPOSReceipt && (
                            <button
                              onClick={() => onViewPOSReceipt(s)}
                              className="p-1 rounded text-slate-500 hover:text-slate-800"
                              title="พิมพ์ใบเสร็จ"
                            >
                              <PrintIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= ALL REPAIR HISTORY SEARCH VIEW ================= */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาประวัติย้อนหลังด้วยชื่อลูกค้า, เบอร์โทร, เลขที่ใบรับ, Serial Number, อาการเสีย..."
                value={historySearchTerm}
                onChange={e => setHistorySearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">เลขที่ใบรับ</th>
                    <th className="py-2.5 px-3">วันที่รับ</th>
                    <th className="py-2.5 px-3">ลูกค้า / เบอร์โทร</th>
                    <th className="py-2.5 px-3">อุปกรณ์ / Serial</th>
                    <th className="py-2.5 px-3">อาการ & งานซ่อม</th>
                    <th className="py-2.5 px-3">สถานะ</th>
                    <th className="py-2.5 px-3 text-right">ยอดเงิน</th>
                    <th className="py-2.5 px-3 text-center">ดูงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {historyFilteredTickets.map(t => {
                    const statusInfo = STATUS_CONFIG[t.status];
                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                        onClick={() => onSelectTicket(t)}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {t.ticketNumber}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                          {t.receivedDate}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {t.customerName}
                          </div>
                          <div className="text-[11px] text-slate-500">{t.customerPhone}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {t.brand} {t.model}
                          </div>
                          {t.serialNumber && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              SN: {t.serialNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate text-slate-600 dark:text-slate-300">
                          {t.technicianNotes || t.problemDescription}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ฿{t.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => onPrintTicket(t)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600"
                            title="พิมพ์ใบรับซ่อม"
                          >
                            <PrintIcon className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
