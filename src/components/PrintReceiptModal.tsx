import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { RepairTicket, ShopSettings, STATUS_CONFIG, DEVICE_LABELS } from '../types';
import {
  X,
  Printer,
  QrCode,
  CheckCircle,
  Copy,
  ExternalLink,
  FileText
} from 'lucide-react';

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: RepairTicket | null;
  shopSettings: ShopSettings;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  isOpen,
  onClose,
  ticket,
  shopSettings
}) => {
  const [printFormat, setPrintFormat] = useState<'a4' | 'slip'>('a4');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (ticket) {
      // Build public tracking URL
      const trackingUrl = `${window.location.origin}/?track=${encodeURIComponent(ticket.ticketNumber)}`;
      QRCode.toDataURL(
        trackingUrl,
        {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        },
        (err, url) => {
          if (!err && url) {
            setQrCodeDataUrl(url);
          }
        }
      );
    }
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  const trackingUrl = `${window.location.origin}/?track=${encodeURIComponent(ticket.ticketNumber)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      {/* Container - hide on print when other print elements exist */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
        
        {/* Modal Toolbar (hidden in print) */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 rounded-t-2xl print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              พิมพ์ใบรับซ่อม & ใบเสร็จ (มี QR Code เช็คสถานะ)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-3 py-1.5 font-semibold transition-colors ${
                  printFormat === 'a4'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                ขนาด A4 / ครึ่ง A4
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('slip')}
                className={`px-3 py-1.5 font-semibold transition-colors ${
                  printFormat === 'slip'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                สลิปความร้อน 80mm
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ (Print)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tracking link bar (hidden in print) */}
        <div className="px-4 py-2 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs print:hidden">
          <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 truncate max-w-lg">
            <QrCode className="w-4 h-4 shrink-0 text-blue-600" />
            <span className="font-semibold">ลิงก์ติดตามงานสำหรับลูกค้า:</span>
            <span className="font-mono text-slate-600 dark:text-slate-400 truncate">{trackingUrl}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 font-medium"
            >
              {copiedLink ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
            </button>
            <a
              href={trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดดูหน้าลูกค้า</span>
            </a>
          </div>
        </div>

        {/* Scrollable Printable Paper Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950/60 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          
          {/* ================= A4 FORMAT ================= */}
          {printFormat === 'a4' ? (
            <div
              id="printable-receipt-a4"
              className="bg-white text-slate-900 w-full max-w-[800px] p-8 rounded-xl shadow-lg border border-slate-200 print:shadow-none print:border-none print:w-full print:p-6 print:rounded-none"
            >
              {/* Header: Shop Info + Title */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                <div className="flex items-start gap-3.5 max-w-lg">
                  {shopSettings.logoUrl && (
                    <img
                      src={shopSettings.logoUrl}
                      alt={shopSettings.shopName}
                      className="h-16 w-auto object-contain rounded border border-slate-200 p-0.5 shrink-0"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-black text-slate-900 tracking-tight">
                        {shopSettings.shopName}
                      </h1>
                      {shopSettings.branch && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                          {shopSettings.branch}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {shopSettings.shopAddress}
                    </p>
                    <p className="text-xs text-slate-700 font-medium mt-1">
                      โทร: <span className="font-bold">{shopSettings.shopPhone}</span> | LINE: <span className="font-bold">{shopSettings.shopLineId}</span>
                      {shopSettings.taxId && <span> | เลขประจำตัวผู้เสียภาษี: <span className="font-mono">{shopSettings.taxId}</span></span>}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-extrabold text-sm tracking-wider uppercase">
                    {ticket.status === 'completed' ? 'ใบเสร็จรับเงิน / ใบส่งมอบเครื่อง' : 'ใบรับเครื่องซ่อม / WORK ORDER'}
                  </span>
                  <p className="font-mono font-bold text-base text-blue-700 mt-1.5">
                    {ticket.ticketNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    วันที่: {new Date(ticket.createdAt).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                  </p>
                </div>
              </div>

              {/* Customer & Device 2-Columns */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
                {/* Customer Box */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    ข้อมูลลูกค้า (Customer Details)
                  </span>
                  <p className="font-bold text-sm text-slate-900">{ticket.customerName}</p>
                  <p className="text-slate-700 mt-0.5">เบอร์โทรศัพท์: <span className="font-semibold">{ticket.customerPhone}</span></p>
                  {ticket.customerLineId && <p className="text-slate-600">LINE ID: {ticket.customerLineId}</p>}
                  {ticket.customerAddress && <p className="text-slate-600">ที่อยู่: {ticket.customerAddress}</p>}
                </div>

                {/* Device Box */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    ข้อมูลอุปกรณ์ (Device Details)
                  </span>
                  <p className="font-bold text-sm text-slate-900">
                    {ticket.brand} {ticket.model}
                  </p>
                  <p className="text-slate-700 mt-0.5">
                    ประเภท: <span className="font-semibold">{DEVICE_LABELS[ticket.deviceType]?.label || ticket.deviceType}</span>
                    {ticket.serialNumber && <span> | S/N: <span className="font-mono font-semibold">{ticket.serialNumber}</span></span>}
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    อุปกรณ์ที่ติดมาด้วย: <span className="font-medium">{ticket.accessories?.join(', ') || 'ไม่มี'}</span>
                  </p>
                </div>
              </div>

              {/* Problem Description & Diagnosis */}
              <div className="py-3 border-b border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <span className="font-bold text-slate-700">อาการเสียที่ลูกค้าระบุ:</span>
                    <p className="bg-slate-50 p-2 rounded border border-slate-200 mt-0.5 font-medium text-slate-800">
                      {ticket.problemDescription}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">สภาพตัวเครื่อง:</span>
                    <p className="bg-slate-50 p-2 rounded border border-slate-200 mt-0.5 text-slate-600">
                      {ticket.initialConditionNotes || 'ปกติ'}
                    </p>
                  </div>
                </div>

                {ticket.technicianNotes && (
                  <div>
                    <span className="font-bold text-slate-700">ผลการตรวจเช็คและการซ่อมของช่าง:</span>
                    <p className="bg-blue-50/60 p-2 rounded border border-blue-200 mt-0.5 font-medium text-blue-900">
                      {ticket.technicianNotes} (ช่างผู้รับผิดชอบ: {ticket.technicianName || 'ช่างประจำร้าน'})
                    </p>
                  </div>
                )}
              </div>

              {/* Parts & Pricing Table */}
              <div className="py-4 border-b border-slate-200 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-slate-800 text-slate-800 font-bold uppercase text-[11px]">
                      <th className="py-1.5">ลำดับ</th>
                      <th className="py-1.5">รายการค่าบริการและอะไหล่ที่เปลี่ยน</th>
                      <th className="py-1.5 text-center">จำนวน</th>
                      <th className="py-1.5 text-right">ราคา/หน่วย</th>
                      <th className="py-1.5 text-right">รวมเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 text-slate-500">1</td>
                      <td className="py-2 font-medium">ค่าบริการตรวจเช็คและค่าแรงซ่อมบำรุง</td>
                      <td className="py-2 text-center">1</td>
                      <td className="py-2 text-right">฿{ticket.laborCost.toLocaleString()}</td>
                      <td className="py-2 text-right font-semibold">฿{ticket.laborCost.toLocaleString()}</td>
                    </tr>
                    {ticket.partsUsed?.map((part, i) => (
                      <tr key={i}>
                        <td className="py-2 text-slate-500">{i + 2}</td>
                        <td className="py-2 font-medium">
                          {part.itemName} <span className="font-mono text-slate-400">({part.itemCode})</span>
                        </td>
                        <td className="py-2 text-center">{part.quantity}</td>
                        <td className="py-2 text-right">฿{part.unitPrice.toLocaleString()}</td>
                        <td className="py-2 text-right font-semibold">฿{part.totalPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Subtotals & QR Code Side-by-Side */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-200">
                  {/* Left: QR Code for Customer Live Status */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code สำหรับตรวจเช็คสถานะ"
                        className="w-20 h-20 bg-white p-1 rounded-md border border-slate-300 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-slate-200 rounded flex items-center justify-center text-[10px]">
                        กำลังโหลด QR
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-xs text-slate-900 block flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5 text-blue-600 inline" />
                        สแกน QR ตรวจสถานะงานซ่อม
                      </span>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                        ลูกค้าสามารถใช้กล้องมือถือสแกนเพื่อเช็คขั้นตอนการซ่อม ยอดเงิน และแจ้งรับเครื่องได้แบบเรียลไทม์ 24 ชม.
                      </p>
                    </div>
                  </div>

                  {/* Right: Totals Calculation */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>ค่าแรงรวม:</span>
                      <span className="font-medium">฿{ticket.laborCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>ค่าอะไหล่รวม:</span>
                      <span className="font-medium">฿{ticket.partsCost.toLocaleString()}</span>
                    </div>
                    {ticket.discount > 0 && (
                      <div className="flex justify-between text-rose-600 font-medium">
                        <span>ส่วนลดพิเศษ:</span>
                        <span>-฿{ticket.discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1.5 border-t border-slate-300">
                      <span>ยอดสุทธิทั้งสิ้น:</span>
                      <span className="text-blue-700">฿{ticket.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      สถานะการชำระเงิน: <span className="font-bold text-slate-800">{ticket.isPaid ? 'ชำระเงินเรียบร้อยแล้ว' : 'ยังไม่ชำระ (ชำระเมื่อรับเครื่อง)'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warranty Terms */}
              <div className="py-3 text-[11px] text-slate-600 leading-relaxed border-b border-slate-200">
                <span className="font-bold text-slate-800">เงื่อนไขการรับประกันและข้อตกลง: </span>
                {shopSettings.warrantyTerms || 'รับประกันงานซ่อมและอะไหล่เดิม 90 วัน นับจากวันที่รับเครื่อง (ไม่ครอบคลุมกรณีตกน้ำ ฟ้าผ่า ไฟกระชาก หรือแกะสติกเกอร์รับประกัน)'}
                <p className="mt-1 text-slate-500 italic">
                  * โปรดนำใบรับซ่อมฉบับนี้มาแสดงเมื่อมารับเครื่อง หากไม่มารับเครื่องภายใน 60 วัน ทางร้านขอสงวนสิทธิ์ในการจัดการตามระเบียบร้าน
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 pb-2 text-center text-xs text-slate-700">
                <div>
                  <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-10"></div>
                  <p className="font-medium">ลงชื่อ ...........................................................</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">( {ticket.customerName} )</p>
                  <p className="text-[11px] text-slate-500">ลูกค้าผู้ส่งซ่อม</p>
                </div>

                <div>
                  <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-10"></div>
                  <p className="font-medium">ลงชื่อ ...........................................................</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">( {ticket.technicianName || 'ผู้มีอำนาจลงนาม / ช่างผู้รับเครื่อง'} )</p>
                  <p className="text-[11px] text-slate-500">ร้าน {shopSettings.shopName}</p>
                </div>
              </div>
            </div>
          ) : (
            /* ================= 80MM POS THERMAL SLIP ================= */
            <div
              id="printable-receipt-slip"
              className="bg-white text-slate-900 w-[80mm] p-4 rounded-xl shadow-lg border border-slate-200 font-mono text-xs print:shadow-none print:border-none print:w-full print:p-2"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                {shopSettings.logoUrl && (
                  <img
                    src={shopSettings.logoUrl}
                    alt={shopSettings.shopName}
                    className="h-10 w-auto object-contain mx-auto mb-1"
                  />
                )}
                <h1 className="font-bold text-sm">{shopSettings.shopName}</h1>
                <p className="text-[10px] text-slate-600 mt-0.5">{shopSettings.shopAddress}</p>
                <p className="text-[10px] text-slate-600">โทร {shopSettings.shopPhone} | LINE: {shopSettings.shopLineId}</p>
                <p className="font-bold text-xs mt-1">ใบรับเครื่องซ่อม / สลิป</p>
                <p className="font-bold text-sm text-blue-800">{ticket.ticketNumber}</p>
                <p className="text-[10px] text-slate-500">วันที่: {ticket.receivedDate}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1">
                <p><span className="font-bold">ลูกค้า:</span> {ticket.customerName}</p>
                <p><span className="font-bold">โทร:</span> {ticket.customerPhone}</p>
                <p><span className="font-bold">อุปกรณ์:</span> {ticket.brand} {ticket.model}</p>
                {ticket.serialNumber && <p><span className="font-bold">S/N:</span> {ticket.serialNumber}</p>}
                <p><span className="font-bold">อุปกรณ์ติดมา:</span> {ticket.accessories?.join(', ') || '-'}</p>
                <p><span className="font-bold">อาการเสีย:</span> {ticket.problemDescription}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>ค่าบริการ/แรง:</span>
                  <span>฿{ticket.laborCost.toLocaleString()}</span>
                </div>
                {ticket.partsUsed?.map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate max-w-[140px]">{p.itemName}:</span>
                    <span>฿{p.totalPrice.toLocaleString()}</span>
                  </div>
                ))}
                {ticket.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>ส่วนลด:</span>
                    <span>-฿{ticket.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
                  <span>ยอดสุทธิ:</span>
                  <span>฿{ticket.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="py-3 text-center flex flex-col items-center">
                {qrCodeDataUrl && (
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-28 h-28 mx-auto" />
                )}
                <p className="text-[10px] font-bold mt-1">สแกน QR ตรวจสถานะงานซ่อม</p>
                <p className="text-[9px] text-slate-500">www.fixpro.service/?track={ticket.ticketNumber}</p>
              </div>

              <div className="text-[9px] text-center text-slate-500 border-t border-dashed border-slate-400 pt-2">
                <p>{shopSettings.receiptFooterMessage || 'ขอบคุณที่ใช้บริการ'}</p>
                <p className="mt-1">โปรดนำสลิปนี้มาแสดงเมื่อมารับเครื่อง</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
