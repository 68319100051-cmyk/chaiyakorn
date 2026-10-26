import React, { useState, useEffect } from 'react';
import { RepairTicket, ShopSettings, STATUS_CONFIG, DEVICE_LABELS } from '../types';
import { dbService } from '../services/db';
import {
  Search,
  CheckCircle2,
  Clock,
  Wrench,
  Package,
  Phone,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Printer,
  Laptop,
  Monitor,
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface CustomerTrackingViewProps {
  initialTicketNumber?: string;
  shopSettings: ShopSettings;
}

export const CustomerTrackingView: React.FC<CustomerTrackingViewProps> = ({
  initialTicketNumber = '',
  shopSettings
}) => {
  const [searchQuery, setSearchQuery] = useState(initialTicketNumber);
  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Auto load if initial ticket number provided in URL
  useEffect(() => {
    if (initialTicketNumber) {
      setSearchQuery(initialTicketNumber);
      handleSearch(initialTicketNumber);
    }
  }, [initialTicketNumber]);

  const handleSearch = async (queryToUse?: string) => {
    const q = (queryToUse !== undefined ? queryToUse : searchQuery).trim();
    if (!q) return;

    setLoading(true);
    setSearched(true);
    try {
      const result = await dbService.getTicketForTracking(q);
      setTicket(result);
    } catch (e) {
      console.error('Error fetching tracking info:', e);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  // Mask customer phone for public privacy: 089-112-XXXX
  const maskPhone = (phone?: string) => {
    if (!phone) return '';
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) {
      return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 8)}XX`;
    }
    return phone;
  };

  // Stepper logic
  const steps = [
    { key: 'pending', title: '1. รับเครื่องเข้าซ่อม', desc: 'ออกใบรับซ่อมและตรวจสภาพเบื้องต้น' },
    { key: 'diagnosing', title: '2. ตรวจเช็คอาการ', desc: 'ช่างกำลังตรวจวิเคราะห์สาเหตุและทดสอบ' },
    { key: 'waiting_parts_or_repair', title: '3. ดำเนินการซ่อม / รออะไหล่', desc: 'เปลี่ยนอะไหล่และแก้ไขระบบ' },
    { key: 'ready_pickup', title: '4. ซ่อมเสร็จเรียบร้อย', desc: 'ผ่านการทดสอบ พร้อมให้ลูกค้ามารับ' },
    { key: 'completed', title: '5. ส่งมอบเครื่อง & รับประกัน', desc: 'ลูกค้าตรวจรับเครื่องและเปิดระบบประกัน' }
  ];

  const getCurrentStepIndex = (status?: RepairTicket['status']) => {
    if (!status) return 0;
    if (status === 'pending') return 0;
    if (status === 'diagnosing') return 1;
    if (status === 'waiting_parts') return 2;
    if (status === 'repaired') return 3;
    if (status === 'ready_pickup') return 3;
    if (status === 'completed') return 4;
    return 0;
  };

  const currentStep = ticket ? getCurrentStepIndex(ticket.status) : 0;
  const isCancelled = ticket?.status === 'cancelled';
  const isReadyForPickup = ticket?.status === 'ready_pickup' || ticket?.status === 'repaired';

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* Hero Tracking Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ระบบตรวจสอบสถานะงานซ่อมเรียลไทม์ (24 ชม.)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          เช็คสถานะการซ่อมคอมพิวเตอร์ & ปริ้นเตอร์
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          สแกนผ่าน QR Code จากใบรับซ่อม หรือกรอกเลขที่ใบรับ / เบอร์โทรศัพท์ เพื่อดูความคืบหน้าแบบสดๆ
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-6">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="กรอกเลขที่ใบรับซ่อม (เช่น REP-20261026-001) หรือเบอร์โทรศัพท์..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            {loading ? 'กำลังตรวจสอบ...' : 'ค้นหาสถานะ'}
          </button>
        </form>

        {/* Quick sample chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span>ตัวอย่างทดสอบคลิกได้ทันที:</span>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('REP-20261026-001');
              handleSearch('REP-20261026-001');
            }}
            className="font-mono text-blue-600 dark:text-blue-400 font-semibold hover:underline bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded"
          >
            REP-20261026-001 (ซ่อมเสร็จพร้อมรับ)
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('REP-20261026-003');
              handleSearch('REP-20261026-003');
            }}
            className="font-mono text-purple-600 dark:text-purple-400 font-semibold hover:underline bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded"
          >
            REP-20261026-003 (รออะไหล่)
          </button>
        </div>
      </div>

      {/* Result Section */}
      {searched && !ticket && !loading && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-500 mx-auto flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            ไม่พบข้อมูลงานซ่อมตามรหัสที่ระบุ
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            กรุณาตรวจสอบความถูกต้องของเลขที่ใบรับซ่อม (เช่น REP-20261026-001) หรือเบอร์โทรศัพท์ที่ใช้ส่งซ่อม
          </p>
          <div className="mt-4">
            <a
              href={`tel:${shopSettings.shopPhone}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>ติดต่อสอบถามร้าน: {shopSettings.shopPhone}</span>
            </a>
          </div>
        </div>
      )}

      {/* Ticket Details View */}
      {ticket && (
        <div className="space-y-6">
          {/* Main Status Alert Card */}
          <div
            className={`rounded-2xl p-5 sm:p-6 border shadow-sm ${
              isReadyForPickup
                ? 'bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 border-emerald-300 dark:border-emerald-800'
                : isCancelled
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-700">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950">
                    {ticket.ticketNumber}
                  </span>
                  <span className="text-xs text-slate-500">
                    รับเครื่องเมื่อ: {ticket.receivedDate}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">
                  {ticket.brand} {ticket.model}
                </h2>
                <p className="text-xs text-slate-500">
                  ลูกค้า: <span className="font-semibold text-slate-700 dark:text-slate-300">{ticket.customerName}</span> ({maskPhone(ticket.customerPhone)})
                </p>
              </div>

              {/* Status Badge */}
              <div className="text-left sm:text-right">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_CONFIG[ticket.status].bg} ${STATUS_CONFIG[ticket.status].text} ${STATUS_CONFIG[ticket.status].border}`}
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {STATUS_CONFIG[ticket.status].label}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  {STATUS_CONFIG[ticket.status].desc}
                </p>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="pt-6 pb-2">
              <div className="relative">
                {/* Connecting Line */}
                <div className="absolute top-4 left-4 right-4 h-1 bg-slate-200 dark:bg-slate-700 -z-0 hidden sm:block">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                  />
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                  {steps.map((st, idx) => {
                    const isDone = currentStep >= idx;
                    const isCurrent = currentStep === idx;

                    return (
                      <div key={idx} className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shrink-0 ${
                            isDone
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                          } ${isCurrent ? 'ring-4 ring-emerald-200 dark:ring-emerald-900' : ''}`}
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div>
                          <p
                            className={`text-xs font-bold ${
                              isDone
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {st.title}
                          </p>
                          <p className="text-[10px] text-slate-500 hidden sm:block mt-0.5">
                            {st.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Big Alert when Ready for Pickup */}
            {isReadyForPickup && (
              <div className="mt-5 p-4 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">
                      เครื่องซ่อมเสร็จเรียบร้อยแล้ว พร้อมส่งมอบ!
                    </h3>
                    <p className="text-xs text-emerald-100">
                      ท่านสามารถนำใบรับซ่อมหรือแสดงหน้านี้เพื่อมารับเครื่องได้ที่ร้านในเวลาทำการ
                    </p>
                  </div>
                </div>

                <div className="text-right whitespace-nowrap">
                  <span className="text-xs text-emerald-100">ยอดชำระ:</span>
                  <p className="text-2xl font-black">
                    ฿{ticket.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Details 2 Columns: Repair Notes & Financials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Technician Notes & Diagnosis */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-500" />
                <span>รายละเอียดการซ่อมและการตรวจเช็ค</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-500">อาการเสียที่ระบุ:</span>
                  <p className="text-slate-800 dark:text-slate-200 mt-0.5 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 font-medium">
                    {ticket.problemDescription}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-slate-500">บันทึกการแก้ไขของช่าง:</span>
                  <p className="text-blue-900 dark:text-blue-300 mt-0.5 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/60 font-medium leading-relaxed">
                    {ticket.technicianNotes || 'ช่างกำลังดำเนินการตรวจเช็คเครื่อง'}
                  </p>
                </div>

                {ticket.accessories?.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-500">อุปกรณ์ที่ฝากไว้กับทางร้าน:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ticket.accessories.map((acc, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {acc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary & Replaced Parts */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-500" />
                <span>สรุปค่าใช้จ่ายและอะไหล่ที่เปลี่ยน</span>
              </h3>

              <div className="space-y-2 text-xs">
                {ticket.partsUsed?.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                        <tr>
                          <th className="py-1.5 px-2.5">อะไหล่ที่เปลี่ยน</th>
                          <th className="py-1.5 px-2 text-center">จำนวน</th>
                          <th className="py-1.5 px-2.5 text-right">ราคา</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {ticket.partsUsed.map((p, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-2.5 text-slate-800 dark:text-slate-200 font-medium">
                              {p.itemName}
                            </td>
                            <td className="py-1.5 px-2 text-center">{p.quantity}</td>
                            <td className="py-1.5 px-2.5 text-right font-semibold">
                              ฿{p.totalPrice.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[11px]">ไม่มีอะไหล่ที่ต้องเปลี่ยน / เป็นค่าแรงบริการ</p>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>ค่าบริการ/แรง:</span>
                    <span>฿{ticket.laborCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>ค่าอะไหล่รวม:</span>
                    <span>฿{ticket.partsCost.toLocaleString()}</span>
                  </div>
                  {ticket.discount > 0 && (
                    <div className="flex justify-between text-rose-500 font-medium">
                      <span>ส่วนลด:</span>
                      <span>-฿{ticket.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>ยอดสุทธิทั้งสิ้น:</span>
                    <span className="text-blue-600 dark:text-blue-400 text-base">
                      ฿{ticket.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right text-[11px]">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-semibold ${
                        ticket.isPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {ticket.isPaid ? '✓ ชำระเงินเรียบร้อยแล้ว' : 'ยังไม่ชำระ (ชำระเมื่อมารับเครื่อง)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shop Contact Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base">{shopSettings.shopName}</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                {shopSettings.shopAddress}
              </p>
              <p className="text-xs text-slate-300 mt-1">
                เปิดให้บริการ จันทร์-เสาร์ 08:30 - 18:00 น.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`tel:${shopSettings.shopPhone}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>โทรติดต่อร้าน ({shopSettings.shopPhone})</span>
              </a>

              {shopSettings.shopLineId && (
                <a
                  href={`https://line.me/R/ti/p/~${shopSettings.shopLineId.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>LINE: {shopSettings.shopLineId}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
