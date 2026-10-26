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
  CreditCard
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
  const [printFormat, setPrintFormat] = useState<'a5' | 'slip'>('a5');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (ticket) {
      // Build public tracking URL
      const trackingUrl = `${window.location.origin}/?track=${encodeURIComponent(ticket.ticketNumber)}`;
      QRCode.toDataURL(
        trackingUrl,
        {
          width: 160,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print-modal-overlay">
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 print-modal-card">
        
        {/* Modal Toolbar (hidden in print) */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-t-2xl print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white">
                พิมพ์ใบรับซ่อม (ขนาด A5) - {ticket.ticketNumber}
              </h2>
              <p className="text-[11px] text-slate-500">
                ขึ้นเฉพาะรายการนี้รายการเดียว พร้อม QR Code สแกนเช็คสถานะเรียลไทม์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle: Default A5 */}
            <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('a5')}
                className={`px-3 py-1.5 font-bold transition-colors ${
                  printFormat === 'a5'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                ขนาด A5 (แนะนำ)
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('slip')}
                className={`px-3 py-1.5 font-bold transition-colors ${
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
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ (Print A5)</span>
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
        <div className="px-4 py-2 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs print:hidden">
          <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 truncate max-w-md">
            <QrCode className="w-4 h-4 shrink-0 text-blue-600" />
            <span className="font-semibold">ลิงก์ติดตามงานสด (สแกนจาก QR):</span>
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
              <span>ทดสอบหน้าลูกค้า</span>
            </a>
          </div>
        </div>

        {/* Scrollable Printable Paper Preview Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-950/60 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          
          {/* ================= A5 FORMAT (148mm x 210mm) ================= */}
          {printFormat === 'a5' ? (
            <div
              id="printable-receipt-a5"
              className="bg-white text-slate-900 w-full max-w-[620px] p-5 sm:p-6 rounded-xl shadow-lg border border-slate-200 print:shadow-none print:border-none print:w-full print:p-0 print:rounded-none text-[11px] leading-tight space-y-3 font-sans"
            >
              {/* Header: Logo, Store Info & Title */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-2.5">
                <div className="flex items-start gap-2.5 max-w-[390px]">
                  {shopSettings.logoUrl && (
                    <img
                      src={shopSettings.logoUrl}
                      alt={shopSettings.shopName}
                      className="h-12 w-auto object-contain rounded border border-slate-200 p-0.5 shrink-0"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">
                        {shopSettings.shopName}
                      </h1>
                      {shopSettings.branch && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 font-bold text-slate-700">
                          {shopSettings.branch}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                      {shopSettings.shopAddress}
                    </p>
                    <p className="text-[10px] text-slate-700 font-medium mt-0.5">
                      โทร: <span className="font-bold">{shopSettings.shopPhone}</span> | LINE: <span className="font-bold">{shopSettings.shopLineId}</span>
                      {shopSettings.taxId && <span> | เลขผู้เสียภาษี: <span className="font-mono">{shopSettings.taxId}</span></span>}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-0.5 rounded bg-slate-900 text-white font-black text-xs uppercase tracking-wider">
                    {ticket.status === 'completed' ? 'ใบเสร็จรับเงิน / ส่งมอบ' : 'ใบรับเครื่องซ่อม / WORK ORDER'}
                  </span>
                  <p className="font-mono font-bold text-sm text-blue-700 mt-1">
                    {ticket.ticketNumber}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    วันที่รับ: {ticket.receivedDate}
                  </p>
                </div>
              </div>

              {/* Customer & Device Information (2-Columns Side by Side) */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {/* Customer Box */}
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-0.5">
                  <span className="font-bold text-slate-800 uppercase tracking-wider block text-[9px] text-blue-800 border-b border-slate-200 pb-0.5">
                    ข้อมูลลูกค้า (Customer)
                  </span>
                  <p className="font-bold text-xs text-slate-900 pt-0.5">{ticket.customerName}</p>
                  <p className="text-slate-700">เบอร์โทร: <span className="font-semibold">{ticket.customerPhone}</span></p>
                  {ticket.customerLineId && <p className="text-slate-600">LINE: {ticket.customerLineId}</p>}
                  {ticket.customerAddress && <p className="text-slate-500 truncate">ที่อยู่: {ticket.customerAddress}</p>}
                </div>

                {/* Device Box */}
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-0.5">
                  <span className="font-bold text-slate-800 uppercase tracking-wider block text-[9px] text-blue-800 border-b border-slate-200 pb-0.5">
                    ข้อมูลอุปกรณ์ (Device)
                  </span>
                  <p className="font-bold text-xs text-slate-900 pt-0.5">{ticket.brand} {ticket.model}</p>
                  <p className="text-slate-700">
                    ประเภท: <span className="font-semibold">{DEVICE_LABELS[ticket.deviceType]?.label || ticket.deviceType}</span>
                    {ticket.serialNumber && <span> | S/N: <span className="font-mono">{ticket.serialNumber}</span></span>}
                  </p>
                  <p className="text-slate-600 truncate">
                    อุปกรณ์ติดมา: <span className="font-medium">{ticket.accessories?.join(', ') || 'ไม่มี'}</span>
                  </p>
                </div>
              </div>

              {/* Problem & Diagnosis */}
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[10px] space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <span className="font-bold text-slate-800">อาการเสียที่ระบุ: </span>
                    <span className="text-slate-700 font-medium">{ticket.problemDescription}</span>
                  </div>
                  {ticket.initialConditionNotes && (
                    <div className="text-slate-500 shrink-0">
                      <span>สภาพ: </span><span>{ticket.initialConditionNotes}</span>
                    </div>
                  )}
                </div>

                {ticket.technicianNotes && (
                  <div className="pt-1 border-t border-slate-200/80 text-blue-900">
                    <span className="font-bold">ผลการตรวจเช็ค / การซ่อม: </span>
                    <span>{ticket.technicianNotes}</span>
                    <span className="text-slate-500 ml-1">({ticket.technicianName || 'ช่างประจำร้าน'})</span>
                  </div>
                )}
              </div>

              {/* Items & Parts for THIS ticket ONLY */}
              <div className="border border-slate-200 rounded-lg overflow-hidden text-[10px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-1 px-2 w-8">#</th>
                      <th className="py-1 px-2">รายการค่าบริการและอะไหล่ (เฉพาะใบสั่งนี้)</th>
                      <th className="py-1 px-2 text-center w-14">จำนวน</th>
                      <th className="py-1 px-2 text-right w-16">หน่วยละ</th>
                      <th className="py-1 px-2 text-right w-20">รวม (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-1 px-2 text-slate-400">1</td>
                      <td className="py-1 px-2 font-medium">ค่าบริการตรวจเช็คและค่าแรงซ่อมบำรุง</td>
                      <td className="py-1 px-2 text-center">1</td>
                      <td className="py-1 px-2 text-right">฿{ticket.laborCost.toLocaleString()}</td>
                      <td className="py-1 px-2 text-right font-semibold">฿{ticket.laborCost.toLocaleString()}</td>
                    </tr>
                    {ticket.partsUsed?.map((part, i) => (
                      <tr key={i}>
                        <td className="py-1 px-2 text-slate-400">{i + 2}</td>
                        <td className="py-1 px-2 font-medium">
                          {part.itemName} <span className="font-mono text-slate-400">({part.itemCode})</span>
                        </td>
                        <td className="py-1 px-2 text-center">{part.quantity}</td>
                        <td className="py-1 px-2 text-right">฿{part.unitPrice.toLocaleString()}</td>
                        <td className="py-1 px-2 text-right font-semibold">฿{part.totalPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Subtotal, QR Code & Bank Accounts (Compact Layout) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Left: QR Code & Payment Details */}
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code ตรวจสอบสถานะ"
                      className="w-16 h-16 bg-white p-0.5 rounded border border-slate-300 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center text-[8px]">QR</div>
                  )}
                  <div className="text-[9px] leading-tight space-y-0.5">
                    <span className="font-bold text-slate-900 block text-[10px] text-blue-900 flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-blue-600 inline" />
                      สแกนเช็คสถานะสด 24 ชม.
                    </span>
                    <p className="text-slate-500">สแกนดูคิวซ่อมและยอดเงินแบบเรียลไทม์</p>
                    <div className="pt-0.5 text-slate-700">
                      <span className="font-bold">พร้อมเพย์:</span> {shopSettings.promptPayId || '083-426-8058'}
                      <br />
                      <span className="font-bold">ธ.กสิกรไทย:</span> {shopSettings.bankAccountNumber || '083-4-26805-8'}
                    </div>
                  </div>
                </div>

                {/* Right: Pricing Totals */}
                <div className="space-y-1 text-[10px] p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>ค่าแรง/บริการ:</span>
                    <span className="font-medium">฿{(ticket.laborCost || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ค่าอะไหล่รวม:</span>
                    <span className="font-medium">฿{(ticket.partsCost || 0).toLocaleString()}</span>
                  </div>
                  {(Number(ticket.discount) || 0) > 0 && (
                    <>
                      <div className="flex justify-between text-slate-500 pt-0.5 border-t border-slate-200 text-[9px]">
                        <span>รวมก่อนหักส่วนลด:</span>
                        <span>฿{((ticket.laborCost || 0) + (ticket.partsCost || 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>ส่วนลดพิเศษ:</span>
                        <span>-฿{(Number(ticket.discount) || 0).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-xs font-black text-slate-900 pt-1 border-t border-slate-300">
                    <span>ยอดสุทธิทั้งสิ้น:</span>
                    <span className="text-blue-700 text-sm">฿{(ticket.totalAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-right text-[9px] text-slate-500">
                    สถานะ: <span className="font-bold text-slate-800">{ticket.isPaid ? 'ชำระเงินเรียบร้อยแล้ว' : 'ชำระเมื่อมารับเครื่อง'}</span>
                  </div>
                </div>
              </div>

              {/* Warranty Conditions (3 items matching raancom) */}
              <div className="text-[9px] text-slate-600 leading-tight border-t border-slate-200 pt-1.5 space-y-0.5">
                <span className="font-bold text-slate-800">เงื่อนไขการรับซ่อม: </span>
                <span>1. กรุณานำใบรับเครื่องมาแสดงทุกครั้งที่ติดต่อรับเครื่อง | 2. ไม่ติดต่อรับคืนภายใน 90 วัน ทางร้านขอสงวนสิทธิ์ในการจัดการตามระเบียบ | 3. ทางร้านไม่รับผิดชอบข้อมูลในฮาร์ดดิสก์ ลูกค้าควรสำรองข้อมูลก่อนส่งซ่อม</span>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-3 text-center text-[10px] text-slate-700">
                <div>
                  <div className="border-b border-slate-400 w-36 mx-auto mb-1 h-6"></div>
                  <p className="font-medium">ลงชื่อ .....................................................</p>
                  <p className="text-[9px] text-slate-500">( {ticket.customerName} )</p>
                  <p className="text-[9px] text-slate-400">ลูกค้าผู้ส่งซ่อม</p>
                </div>

                <div>
                  <div className="border-b border-slate-400 w-36 mx-auto mb-1 h-6"></div>
                  <p className="font-medium">ลงชื่อ .....................................................</p>
                  <p className="text-[9px] text-slate-500">( {ticket.technicianName || 'พนักงาน/ช่างผู้รับเครื่อง'} )</p>
                  <p className="text-[9px] text-slate-400">{shopSettings.shopName}</p>
                </div>
              </div>
            </div>
          ) : (
            /* ================= 80MM POS THERMAL SLIP ================= */
            <div
              id="printable-receipt-slip"
              className="bg-white text-slate-900 w-[80mm] p-3 rounded-xl shadow-lg border border-slate-200 font-mono text-[11px] print:shadow-none print:border-none print:w-full print:p-1"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                {shopSettings.logoUrl && (
                  <img
                    src={shopSettings.logoUrl}
                    alt={shopSettings.shopName}
                    className="h-10 w-auto object-contain mx-auto mb-1"
                  />
                )}
                <h1 className="font-bold text-xs">{shopSettings.shopName}</h1>
                <p className="text-[9px] text-slate-600 mt-0.5">{shopSettings.shopAddress}</p>
                <p className="text-[9px] text-slate-600">โทร {shopSettings.shopPhone} | LINE: {shopSettings.shopLineId}</p>
                <p className="font-bold text-xs mt-1">ใบรับเครื่องซ่อม / สลิป</p>
                <p className="font-bold text-sm text-blue-800">{ticket.ticketNumber}</p>
                <p className="text-[9px] text-slate-500">วันที่: {ticket.receivedDate}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-1">
                <p><span className="font-bold">ลูกค้า:</span> {ticket.customerName}</p>
                <p><span className="font-bold">โทร:</span> {ticket.customerPhone}</p>
                <p><span className="font-bold">อุปกรณ์:</span> {ticket.brand} {ticket.model}</p>
                {ticket.serialNumber && <p><span className="font-bold">S/N:</span> {ticket.serialNumber}</p>}
                <p><span className="font-bold">อุปกรณ์ติดมา:</span> {ticket.accessories?.join(', ') || '-'}</p>
                <p><span className="font-bold">อาการเสีย:</span> {ticket.problemDescription}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span>ค่าบริการ/แรง:</span>
                  <span>฿{(ticket.laborCost || 0).toLocaleString()}</span>
                </div>
                {ticket.partsUsed?.map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate max-w-[130px]">{p.itemName}:</span>
                    <span>฿{(p.totalPrice || 0).toLocaleString()}</span>
                  </div>
                ))}
                {(Number(ticket.discount) || 0) > 0 && (
                  <>
                    <div className="flex justify-between text-slate-500 pt-1 border-t border-dotted border-slate-300 text-[9px]">
                      <span>รวมก่อนลด:</span>
                      <span>฿{((ticket.laborCost || 0) + (ticket.partsCost || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>ส่วนลด:</span>
                      <span>-฿{(Number(ticket.discount) || 0).toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                  <span>ยอดสุทธิ:</span>
                  <span>฿{(ticket.totalAmount || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="py-2 text-center flex flex-col items-center">
                {qrCodeDataUrl && (
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-24 h-24 mx-auto" />
                )}
                <p className="text-[9px] font-bold mt-1">สแกน QR ตรวจสถานะงานซ่อมสด</p>
              </div>

              <div className="text-[8px] text-center text-slate-500 border-t border-dashed border-slate-400 pt-1.5">
                <p>{shopSettings.receiptFooterMessage || 'ขอบคุณที่ใช้บริการ'}</p>
                <p className="mt-0.5">โปรดนำสลิปนี้มาแสดงเมื่อมารับเครื่อง</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
