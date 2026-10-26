import React, { useState, useEffect } from 'react';
import { RepairTicket, ShopSettings, STATUS_CONFIG, DEVICE_LABELS } from '../types';
import { dbService } from '../services/db';
import {
  Wrench,
  CheckCircle2,
  Clock,
  Package,
  Phone,
  MessageCircle,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';

interface CustomerPublicPortalProps {
  ticketNumber: string;
  shopSettings: ShopSettings;
  onSwitchToAdmin: () => void;
}

export const CustomerPublicPortal: React.FC<CustomerPublicPortalProps> = ({
  ticketNumber,
  shopSettings,
  onSwitchToAdmin
}) => {
  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  // Subscribe to REAL-TIME updates for this single ticket
  useEffect(() => {
    setLoading(true);
    const unsubscribe = dbService.subscribeSingleTicket(ticketNumber, (liveTicket) => {
      setTicket(liveTicket);
      setLoading(false);
      setLastUpdatedTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    });

    return () => {
      unsubscribe();
    };
  }, [ticketNumber]);

  // Stepper logic
  const steps = [
    { key: 'pending', title: 'รับเครื่องเข้าซ่อม', desc: 'ออกใบรับและตรวจสภาพ' },
    { key: 'diagnosing', title: 'ตรวจเช็คอาการ', desc: 'ช่างกำลังวิเคราะห์สาเหตุ' },
    { key: 'waiting_parts', title: 'ดำเนินการซ่อม / รออะไหล่', desc: 'เปลี่ยนอะไหล่และปรับจูน' },
    { key: 'ready_pickup', title: 'ซ่อมเสร็จเรียบร้อย', desc: 'ผ่านการทดสอบ พร้อมให้รับ' },
    { key: 'completed', title: 'ส่งมอบเครื่องแล้ว', desc: 'รับเครื่องและเริ่มประกัน' }
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
  const isReadyForPickup = ticket?.status === 'ready_pickup' || ticket?.status === 'repaired';
  const isCompleted = ticket?.status === 'completed';
  const isCancelled = ticket?.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Customer Header - Clean & Focused */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {shopSettings.logoUrl ? (
              <img
                src={shopSettings.logoUrl}
                alt={shopSettings.shopName}
                className="w-10 h-10 object-contain rounded-xl bg-white p-0.5 shadow-md shadow-blue-500/20 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-black text-base">
                FP
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                {shopSettings.shopName}
              </h1>
              <p className="text-[11px] text-slate-400">
                ระบบตรวจสอบสถานะงานซ่อมออนไลน์ • โทร {shopSettings.shopPhone}
              </p>
            </div>
          </div>

          {/* Real-time Indicator Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline">อัปเดตสดเรียลไทม์</span>
            <span className="sm:hidden">Live</span>
          </div>
        </div>
      </header>

      {/* Main Single-Ticket Content Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {loading ? (
          <div className="bg-slate-800/80 rounded-2xl p-12 text-center border border-slate-700 space-y-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold text-slate-300">กำลังเชื่อมต่อข้อมูลงานซ่อมแบบเรียลไทม์...</p>
            <p className="text-xs text-slate-500">เลขที่ใบรับ: {ticketNumber}</p>
          </div>
        ) : !ticket ? (
          <div className="bg-slate-800/80 rounded-2xl p-8 text-center border border-slate-700 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">ไม่พบข้อมูลงานซ่อม</h2>
              <p className="text-xs text-slate-400 mt-1">
                ไม่พบรหัสงานซ่อม <span className="font-mono text-blue-400 font-bold">{ticketNumber}</span> ในระบบ
              </p>
              <p className="text-xs text-slate-400 mt-1">
                โปรดตรวจสอบความถูกต้องของ QR Code หรือติดต่อทางร้านโดยตรง
              </p>
            </div>
            <div className="pt-2">
              <a
                href={`tel:${shopSettings.shopPhone}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                <Phone className="w-4 h-4" />
                <span>โทรติดต่อร้าน: {shopSettings.shopPhone}</span>
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Real-time Update Toast Bar */}
            {lastUpdatedTime && (
              <div className="text-center text-[11px] text-slate-400">
                สถานะล่าสุดเมื่อ {lastUpdatedTime} น. (ระบบซิงก์อัตโนมัติเมื่อช่างอัปเดต)
              </div>
            )}

            {/* Ready for Pickup Celebration Banner */}
            {isReadyForPickup && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-xl shadow-emerald-500/20 space-y-3 border border-emerald-400/40 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/20 shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/25 uppercase tracking-wider">
                      ซ่อมเสร็จเรียบร้อยแล้ว
                    </span>
                    <h2 className="text-lg sm:text-xl font-extrabold mt-1">
                      เครื่องของท่านพร้อมส่งมอบแล้วครับ!
                    </h2>
                    <p className="text-xs text-emerald-100 mt-0.5 leading-relaxed">
                      ช่างได้ดำเนินการซ่อมและทดสอบระบบผ่านเรียบร้อย ท่านสามารถนำใบรับซ่อมหรือแสดงหน้านี้เพื่อรับเครื่องได้ทันที
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-emerald-500/40 flex items-center justify-between text-xs">
                  <span className="text-emerald-100 font-medium">ยอดชำระที่ต้องชำระเมื่อรับเครื่อง:</span>
                  <span className="text-2xl font-black text-white">
                    ฿{ticket.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Main Status & Stepper Card */}
            <div className="bg-slate-800/90 rounded-2xl p-5 sm:p-6 border border-slate-700/80 shadow-lg space-y-6">
              {/* Ticket header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-700/80 pb-4">
                <div>
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {ticket.ticketNumber}
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white mt-1.5">
                    {ticket.brand} {ticket.model}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ประเภท: <span className="text-slate-200 font-medium">{DEVICE_LABELS[ticket.deviceType]?.label || ticket.deviceType}</span>
                    {ticket.serialNumber && <span> • S/N: <span className="font-mono">{ticket.serialNumber}</span></span>}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${STATUS_CONFIG[ticket.status].bg} ${STATUS_CONFIG[ticket.status].text} ${STATUS_CONFIG[ticket.status].border}`}
                  >
                    {STATUS_CONFIG[ticket.status].label}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    รับเข้า: {ticket.receivedDate}
                  </p>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  ขั้นตอนความคืบหน้างานซ่อม
                </h3>

                <div className="space-y-3">
                  {steps.map((st, idx) => {
                    const isDone = currentStep >= idx;
                    const isCurrent = currentStep === idx;

                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                          isCurrent
                            ? 'bg-blue-950/60 border border-blue-500/50 shadow-md'
                            : isDone
                            ? 'bg-slate-900/40 text-slate-300'
                            : 'opacity-50 text-slate-500'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                            isDone
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-700 text-slate-400'
                          } ${isCurrent ? 'ring-2 ring-blue-400 animate-pulse' : ''}`}
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs font-bold ${isCurrent ? 'text-blue-300' : isDone ? 'text-white' : 'text-slate-400'}`}>
                              {st.title}
                            </p>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 animate-pulse">
                                สถานะปัจจุบัน
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {st.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Repair & Diagnosis Details Card */}
            <div className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700/80 shadow-lg space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-blue-400" />
                <span>รายละเอียดการตรวจเช็คและการแก้ไข</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400">อาการเสียที่แจ้งไว้:</span>
                  <p className="mt-1 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-200 font-medium leading-relaxed">
                    {ticket.problemDescription}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400">บันทึกผลการตรวจเช็คของช่าง:</span>
                  <p className="mt-1 p-3 rounded-xl bg-blue-950/40 border border-blue-900/50 text-blue-200 font-medium leading-relaxed">
                    {ticket.technicianNotes || 'ช่างกำลังดำเนินการตรวจเช็คและทดสอบอุปกรณ์'}
                  </p>
                </div>

                {ticket.accessories && ticket.accessories.length > 0 && (
                  <div>
                    <span className="text-slate-400">อุปกรณ์ที่ฝากไว้กับร้าน:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {ticket.accessories.map((acc, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-700/70 text-slate-300">
                          {acc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing & Replaced Parts Card */}
            <div className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700/80 shadow-lg space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>สรุปค่าบริการและอะไหล่</span>
              </h3>

              {ticket.partsUsed && ticket.partsUsed.length > 0 && (
                <div className="border border-slate-700 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-900/80 px-3 py-2 text-slate-400 font-semibold text-[11px] flex justify-between">
                    <span>รายการอะไหล่ที่เปลี่ยน</span>
                    <span>ราคา</span>
                  </div>
                  <div className="divide-y divide-slate-700/60">
                    {ticket.partsUsed.map((p, idx) => (
                      <div key={idx} className="px-3 py-2 flex justify-between items-center text-[11px]">
                        <span className="text-slate-200">{p.itemName} ({p.quantity} ชิ้น)</span>
                        <span className="font-semibold text-white">฿{p.totalPrice.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Calculation */}
              <div className="pt-2 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>ค่าบริการ/แรงตรวจเช็ค:</span>
                  <span>฿{(ticket.laborCost || 0).toLocaleString()}</span>
                </div>
                {(ticket.partsCost || 0) > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>ค่าอะไหล่รวม:</span>
                    <span>฿{(ticket.partsCost || 0).toLocaleString()}</span>
                  </div>
                )}
                {(Number(ticket.discount) || 0) > 0 && (
                  <>
                    <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-700/60 text-[11px]">
                      <span>รวมค่าแรงและอะไหล่:</span>
                      <span>฿{((ticket.laborCost || 0) + (ticket.partsCost || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-400 font-semibold bg-rose-950/40 px-2 py-1 rounded border border-rose-900/60">
                      <span>✓ ส่วนลดพิเศษจากทางร้าน:</span>
                      <span>-฿{(Number(ticket.discount) || 0).toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="pt-2 border-t border-slate-700 flex justify-between items-baseline">
                  <span className="font-bold text-sm text-white">ยอดสุทธิที่ต้องชำระ:</span>
                  <span className="text-xl font-black text-blue-400">
                    ฿{(ticket.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="text-right text-[11px]">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full font-bold ${
                      ticket.isPaid
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-amber-950 text-amber-300 border border-amber-700'
                    }`}
                  >
                    {ticket.isPaid ? '✓ ชำระเงินเรียบร้อยแล้ว' : 'ยังไม่ชำระ (ชำระเมื่อรับเครื่อง)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Shop Contact & Action Buttons */}
            <div className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700/80 shadow-lg space-y-3">
              <div>
                <h3 className="font-bold text-sm text-white">{shopSettings.shopName}</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {shopSettings.shopAddress}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  รับประกันงานซ่อม 90 วันตามเงื่อนไขทางร้าน
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <a
                  href={`tel:${shopSettings.shopPhone}`}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md shadow-blue-500/20 active:scale-95"
                >
                  <Phone className="w-4 h-4" />
                  <span>โทรหาร้าน</span>
                </a>

                {shopSettings.shopLineId && (
                  <a
                    href={`https://line.me/R/ti/p/~${shopSettings.shopLineId.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs transition-colors shadow-md shadow-emerald-500/20 active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>แอดไลน์ร้าน</span>
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Customer Footer - Discreet Admin Gateway */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500 space-y-2">
        <p>
          {shopSettings.shopName} • ตรวจสอบสถานะงานซ่อมแบบเรียลไทม์ 24 ชม.
        </p>
        <div>
          <button
            onClick={onSwitchToAdmin}
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors py-1 px-2 rounded hover:bg-slate-800/60"
          >
            <Lock className="w-3 h-3" />
            <span>เข้าสู่ระบบจัดการสำหรับเจ้าหน้าที่ร้าน (Admin)</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
