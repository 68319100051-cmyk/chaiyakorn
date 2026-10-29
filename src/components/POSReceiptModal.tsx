import React, { useRef, useState, useEffect } from 'react';
import { POSSaleRecord, ShopSettings, GovDocumentType } from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { getGovCreditDueStatus } from '../utils/govCredit';
import { bahtText } from '../utils/bahtText';
import {
  Printer,
  X,
  CheckCircle2,
  Receipt,
  Building2,
  QrCode,
  FileText,
  Calendar,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface POSReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: POSSaleRecord | null;
  shopSettings: ShopSettings;
}

export const POSReceiptModal: React.FC<POSReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  shopSettings
}) => {
  const [paperSize, setPaperSize] = useState<'slip80' | 'a5'>('a5');
  const [docType, setDocType] = useState<GovDocumentType>('invoice');
  const [showPromptPayQr, setShowPromptPayQr] = useState<boolean>(true);
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string>('');
  const printContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sale) {
      if (sale.paymentMethod === 'gov_credit') {
        setPaperSize('a5'); // Default to full A5 for gov credit documents
        if (sale.govCreditInfo?.billingStatus === 'paid') {
          setDocType('receipt');
        } else {
          setDocType('invoice');
        }
      }
      const promptPayTarget = shopSettings.promptPayId || shopSettings.shopPhone || '0834268058';
      generatePromptPayQRDataUrl(promptPayTarget, sale.totalAmount, { width: 220 })
        .then(url => setPromptPayQrUrl(url))
        .catch(err => console.error('Failed to generate PromptPay QR:', err));
    }
  }, [sale, shopSettings]);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(sale.createdAt).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const isGovCredit = sale.paymentMethod === 'gov_credit';

  const paymentMethodLabel: Record<string, string> = {
    cash: 'เงินสด (Cash)',
    transfer: 'โอนเงิน (PromptPay / Transfer)',
    credit: 'บัตรเครดิต (Credit Card)',
    gov_credit: 'เครดิตราชการ / วางบิล (Government Credit)'
  };

  const govStatusLabel: Record<string, { label: string; color: string }> = {
    pending_billing: { label: 'รอวางบิล / เอกสารเบิกจ่าย', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    billed: { label: 'วางบิลแล้ว (รอดำเนินการเบิกจ่าย)', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    paid: { label: 'ชำระเงิน/เบิกจ่ายเรียบร้อย', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isGovCredit
                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400'
                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
            }`}>
              {isGovCredit ? <Building2 className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span>{isGovCredit ? 'ใบส่งของ / ใบวางบิลเครดิตราชการ' : 'ใบเสร็จรับเงินการขายหน้าร้าน'}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  isGovCredit
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {sale.receiptNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {isGovCredit ? 'รายการเครดิตสำหรับหน่วยงานราชการ/โรงเรียน' : 'บันทึกการขายสำเร็จ • ออกใบเสร็จและตัดสต็อกเรียบร้อย'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Government Document Type Toggle */}
            {isGovCredit && (
              <div className="flex items-center bg-purple-50 dark:bg-purple-950/60 p-1 rounded-xl text-xs font-semibold border border-purple-200 dark:border-purple-800">
                <button
                  type="button"
                  onClick={() => setDocType('invoice')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    docType === 'invoice'
                      ? 'bg-purple-600 text-white font-bold shadow-xs'
                      : 'text-purple-700 dark:text-purple-300 hover:text-purple-900'
                  }`}
                >
                  ใบแจ้งหนี้/วางบิล
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('quotation')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    docType === 'quotation'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-blue-700 dark:text-blue-300 hover:text-blue-900'
                  }`}
                >
                  ใบเสนอราคา
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('receipt')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    docType === 'receipt'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-emerald-700 dark:text-emerald-300 hover:text-emerald-900'
                  }`}
                >
                  ใบเสร็จรับเงิน
                </button>
              </div>
            )}

            {/* Paper format toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setPaperSize('slip80')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  paperSize === 'slip80'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                สลิป 80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('a5')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  paperSize === 'a5'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                ขนาด A5 (เต็มแผ่น)
              </button>
            </div>

            {/* PromptPay QR Toggle */}
            <button
              type="button"
              onClick={() => setShowPromptPayQr(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                showPromptPayQr
                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-500'
              }`}
              title="เปิด/ปิด การแสดง QR Code พร้อมเพย์บนใบเสร็จ"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">QR พร้อมเพย์</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-950/60 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {paperSize === 'a5' ? (
            /* ================= A5 FORMAT (148mm x 210mm) ================= */
            <div
              ref={printContentRef}
              id="pos-receipt-print-area"
              className="bg-white text-slate-900 w-full max-w-[140mm] p-2.5 sm:p-3 mx-auto shadow-none print:shadow-none border border-slate-200 print:border-none text-[8.5px] leading-tight space-y-1.5 font-sans a5-printable-page"
            >
              {/* Header: Shop Information */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-1.5">
                <div className="flex items-start gap-2 max-w-[340px]">
                  {shopSettings.logoUrl ? (
                    <img
                      src={shopSettings.logoUrl}
                      alt={shopSettings.shopName}
                      className="h-9 w-auto object-contain rounded border border-slate-200 p-0.5 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                      POS
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1">
                      <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none">
                        {shopSettings.shopName}
                      </h1>
                      {shopSettings.branch && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-slate-100 font-bold text-slate-700">
                          {shopSettings.branch}
                        </span>
                      )}
                    </div>
                    <p className="text-[8px] text-slate-600 mt-0.5 leading-snug">
                      {shopSettings.shopAddress}
                    </p>
                    <p className="text-[8px] text-slate-700 font-medium mt-0.2">
                      โทร: <span className="font-bold">{shopSettings.shopPhone}</span> | LINE: <span className="font-bold">{shopSettings.shopLineId}</span>
                      {shopSettings.taxId && <span> | เลขผู้เสียภาษี: <span className="font-mono">{shopSettings.taxId}</span></span>}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`inline-block px-2 py-0.5 rounded text-white font-black text-[9px] uppercase tracking-wider ${
                    isGovCredit
                      ? docType === 'quotation'
                        ? 'bg-blue-600'
                        : docType === 'receipt'
                        ? 'bg-emerald-600'
                        : 'bg-purple-600'
                      : 'bg-slate-800'
                  }`}>
                    {isGovCredit
                      ? docType === 'quotation'
                        ? 'ใบเสนอราคา (POS)'
                        : docType === 'receipt'
                        ? 'ใบเสร็จรับเงิน (POS)'
                        : 'ใบส่งของ / ใบวางบิล'
                      : 'ใบเสร็จรับเงิน (POS)'}
                  </span>
                  <p className="font-mono font-bold text-xs text-blue-700 mt-0.5">
                    {isGovCredit && docType === 'quotation'
                      ? `QT-${sale.receiptNumber.replace(/^POS-/i, '')}`
                      : isGovCredit && docType === 'invoice'
                      ? `INV-${sale.receiptNumber.replace(/^POS-/i, '')}`
                      : sale.receiptNumber}
                  </p>
                  <p className="text-[8px] text-slate-500">
                    วันที่: {formattedDate}
                  </p>
                  {isGovCredit && docType === 'quotation' && (
                    <p className="text-[7.5px] text-amber-800 font-semibold bg-amber-50 px-1 rounded mt-0.2">
                      * กำหนดยืนราคา 30 วัน
                    </p>
                  )}
                </div>
              </div>

              {/* Customer / Government Credit Information Box */}
              {isGovCredit && sale.govCreditInfo ? (() => {
                const dueStatus = getGovCreditDueStatus(sale.govCreditInfo.dueDate, sale.govCreditInfo.billingStatus);
                return (
                  <div className="p-1.5 rounded bg-purple-50/70 border border-purple-200 text-purple-950 text-[8px] space-y-0.5">
                    <div className="flex items-center justify-between border-b border-purple-200 pb-0.5">
                      <span className="font-bold text-[8.5px] text-purple-950 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-purple-700 inline" />
                        <span>เรียน ส่วนราชการ / หน่วยงานผู้ขอรับบริการ:</span>
                      </span>
                      <span className="text-[7.5px] bg-purple-200/60 text-purple-900 px-1.5 py-0.2 rounded font-bold">
                        เครดิตราชการ {sale.govCreditInfo.creditDays} วัน
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5">
                      <div className="truncate"><span className="font-semibold text-slate-600">หน่วยงาน:</span> <span className="font-bold text-purple-950">{sale.govCreditInfo.agencyName}</span></div>
                      <div><span className="font-semibold text-slate-600">เลขผู้เสียภาษี:</span> <span className="font-mono font-bold text-purple-900">{sale.govCreditInfo.taxId || 'ไม่ได้ระบุ'}</span></div>
                      <div className="truncate"><span className="font-semibold text-slate-600">ฝ่าย/งาน:</span> <span>{sale.govCreditInfo.department || 'งานพัสดุ'}</span></div>
                      <div>
                        {sale.govCreditInfo.orderNumber && <span className="mr-1">PO: <span className="font-mono font-bold text-blue-800">{sale.govCreditInfo.orderNumber}</span></span>}
                        {sale.govCreditInfo.disbursementNumber && <span className="font-bold text-indigo-700">ฎีกา: {sale.govCreditInfo.disbursementNumber}</span>}
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-0.5 border-t border-purple-200/60">
                      <span>ผู้ติดต่อ: {sale.govCreditInfo.contactPerson || '-'} {sale.govCreditInfo.contactPhone ? `(${sale.govCreditInfo.contactPhone})` : ''}</span>
                      <span className={`px-1 py-0.2 rounded text-[7px] font-semibold border ${dueStatus.badgeClass}`}>
                        {dueStatus.badgeLabel} (ครบกำหนด: {sale.govCreditInfo.dueDate || '-'})
                      </span>
                    </div>
                  </div>
                );
              })() : (
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-[8.5px] flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800">ข้อมูลลูกค้า: </span>
                    <span className="text-slate-900 font-semibold">{sale.customerName || 'ลูกค้าทั่วไป (หน้าร้าน)'}</span>
                    {sale.customerPhone && <span className="text-slate-600 ml-1.5">โทร: {sale.customerPhone}</span>}
                  </div>
                  <div className="text-slate-500 text-[8px]">
                    พนักงานขาย: <span className="font-medium text-slate-700">{sale.cashierName || 'เจ้าหน้าที่ประจำร้าน'}</span>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="border border-slate-200 rounded overflow-hidden text-[8.5px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-0.5 px-1.5 w-6 text-center">#</th>
                      <th className="py-0.5 px-1.5">รายการสินค้า / พัสดุ</th>
                      <th className="py-0.5 px-1.5 text-center w-12">จำนวน</th>
                      <th className="py-0.5 px-1.5 text-right w-16">ราคา/หน่วย</th>
                      <th className="py-0.5 px-1.5 text-right w-18">รวม (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-0.5 px-1.5 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-0.5 px-1.5 font-medium truncate max-w-[200px]">
                          {item.name} {item.itemCode && <span className="font-mono text-slate-400 text-[8px]">({item.itemCode})</span>}
                        </td>
                        <td className="py-0.5 px-1.5 text-center">{item.quantity} {item.unit || 'ชิ้น'}</td>
                        <td className="py-0.5 px-1.5 text-right">฿{item.price.toLocaleString()}</td>
                        <td className="py-0.5 px-1.5 text-right font-semibold">฿{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pricing Totals & QR Code / Payment Area (Side-by-side) */}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                {/* Left: PromptPay QR / Payment Info */}
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-around gap-1.5">
                  {showPromptPayQr && promptPayQrUrl ? (
                    <div className="flex flex-col items-center text-center">
                      <img
                        src={promptPayQrUrl}
                        alt="PromptPay QR Code"
                        className="w-11 h-11 bg-white p-0.5 rounded border border-slate-300"
                      />
                      <span className="text-[7.5px] font-bold text-emerald-900 mt-0.5">
                        พร้อมเพย์
                      </span>
                    </div>
                  ) : null}

                  <div className="text-[7.5px] text-slate-600 leading-tight space-y-0.2 pl-1 border-l border-slate-200">
                    <p className="font-mono font-bold text-slate-800">{shopSettings.promptPayId || '083-426-8058'}</p>
                    <p className="text-slate-500 truncate max-w-[90px]">{shopSettings.bankAccountName || shopSettings.shopName}</p>
                    {shopSettings.bankAccountNumber && (
                      <p className="font-mono text-slate-400">{shopSettings.bankName || 'ธ.กสิกรไทย'}: {shopSettings.bankAccountNumber}</p>
                    )}
                    <p className="text-blue-900 font-semibold pt-0.2">ช่องทาง: {paymentMethodLabel[sale.paymentMethod] || sale.paymentMethod}</p>
                  </div>
                </div>

                {/* Right: Pricing Totals */}
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-[8.5px] space-y-0.5">
                  <div className="flex justify-between text-slate-600">
                    <span>รวมเป็นเงิน ({sale.items.reduce((sum, i) => sum + i.quantity, 0)} ชิ้น):</span>
                    <span className="font-medium">฿{sale.subtotal.toLocaleString()}</span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold text-[8px]">
                      <span>ส่วนลดพิเศษ:</span>
                      <span>-฿{sale.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline text-[9.5px] font-black text-slate-900 pt-0.5 border-t border-slate-300">
                    <span>ยอดสุทธิทั้งสิ้น:</span>
                    <span className="text-blue-700 text-xs font-black">฿{sale.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="text-right text-[8px] text-slate-600 font-semibold truncate">
                    ({bahtText(sale.totalAmount)})
                  </div>
                  {sale.paymentMethod === 'cash' && (
                    <div className="flex justify-between text-[7.5px] text-slate-500 pt-0.2 border-t border-slate-200">
                      <span>รับเงิน: ฿{(sale.amountReceived || sale.totalAmount).toLocaleString()}</span>
                      <span className="font-bold text-emerald-700">ทอน: ฿{(sale.change || 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures Section strictly in 1 single horizontal row */}
              {isGovCredit ? (
                /* GOVERNMENT CREDIT SIGNATURES: 1 Single Horizontal Row with 3 Boxes */
                <div className="pt-1 border-t border-slate-300">
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[8px] text-slate-700">
                    <div className="border border-slate-200 p-1 rounded space-y-1">
                      <p className="font-bold text-[8px]">ผู้ส่งมอบพัสดุ / บริการ</p>
                      <div className="border-b border-dotted border-slate-400 mx-1.5 pt-2"></div>
                      <p>(................................................)</p>
                      <p className="text-[7px] text-slate-400 truncate">{shopSettings.shopName}</p>
                    </div>

                    <div className="border border-slate-200 p-1 rounded space-y-1">
                      <p className="font-bold text-[8px]">ผู้รับมอบพัสดุ / เจ้าหน้าที่พัสดุ</p>
                      <div className="border-b border-dotted border-slate-400 mx-1.5 pt-2"></div>
                      <p>(................................................)</p>
                      <p className="text-[7px] text-slate-400 truncate">{sale.govCreditInfo?.agencyName || sale.customerName}</p>
                    </div>

                    <div className="border border-slate-200 p-1 rounded space-y-1">
                      <p className="font-bold text-[8px]">ประธานกรรมการตรวจรับ</p>
                      <div className="border-b border-dotted border-slate-400 mx-1.5 pt-2"></div>
                      <p>(................................................)</p>
                      <p className="text-[7px] text-slate-400">วันที่ ...... / ...... / ..........</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* STANDARD SIGNATURES: 1 Single Row with 2 Boxes */
                <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-300 text-center text-[8.5px] text-slate-700">
                  <div className="border border-slate-200 p-1.5 rounded space-y-1">
                    <p className="font-medium">ลงชื่อ .....................................................</p>
                    <p className="text-[8px] text-slate-600 font-bold">( {sale.customerName || 'ลูกค้าผู้ซื้อสินค้า'} )</p>
                    <p className="text-[7.5px] text-slate-400">ผู้รับสินค้า / บริการ</p>
                  </div>

                  <div className="border border-slate-200 p-1.5 rounded space-y-1">
                    <p className="font-medium">ลงชื่อ .....................................................</p>
                    <p className="text-[8px] text-slate-600 font-bold">( {sale.cashierName || 'พนักงานขายประจำร้าน'} )</p>
                    <p className="text-[7.5px] text-slate-400">{shopSettings.shopName}</p>
                  </div>
                </div>
              )}

              {/* Footer Notice */}
              <div className="pt-1 text-center text-[7.5px] text-slate-500 border-t border-dashed border-slate-300">
                <p className="font-semibold text-slate-700">
                  {shopSettings.receiptFooterMessage || 'ขอบพระคุณที่ไว้วางใจใช้บริการ'}
                </p>
                <p className="text-[7px] text-slate-400">
                  {isGovCredit
                    ? 'เอกสารนี้ใช้เป็นหลักฐานประกอบการเบิกจ่ายตามระเบียบพัสดุราชการ (A5 Portrait Format)'
                    : 'สินค้าซื้อแล้วกรุณาเก็บใบเสร็จเพื่อใช้เป็นหลักฐานการรับประกัน (A5 Portrait Format)'}
                </p>
              </div>
            </div>
          ) : (
            /* ================= 80MM THERMAL SLIP FORMAT ================= */
            <div
              ref={printContentRef}
              id="pos-receipt-print-area"
              className="bg-white text-slate-900 shadow-xl border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 w-full max-w-[350px] p-4 rounded-xl font-sans text-xs"
            >
              {/* Header: Shop Information */}
              <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-2">
                {shopSettings.logoUrl ? (
                  <img
                    src={shopSettings.logoUrl}
                    alt={shopSettings.shopName}
                    className="w-12 h-12 mx-auto object-contain mb-1"
                  />
                ) : (
                  <div className="w-10 h-10 mx-auto rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg mb-1">
                    POS
                  </div>
                )}
                <h1 className="text-sm font-extrabold tracking-tight text-slate-900 leading-tight">
                  {shopSettings.shopName}
                </h1>
                {shopSettings.branch && (
                  <p className="text-[10px] text-slate-600">สาขา: {shopSettings.branch}</p>
                )}
                <p className="text-[10px] text-slate-600 leading-tight">
                  {shopSettings.shopAddress}
                </p>
                <p className="text-[10px] text-slate-700 font-semibold">
                  โทร: {shopSettings.shopPhone}
                  {shopSettings.shopLineId && ` • LINE: ${shopSettings.shopLineId}`}
                </p>
                {shopSettings.taxId && (
                  <p className="text-[9px] text-slate-500 font-mono">
                    เลขประจำตัวผู้เสียภาษี: {shopSettings.taxId}
                  </p>
                )}
              </div>

              {/* Document Title & Meta */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[10px]">
                <div className="text-center font-bold text-xs tracking-wide uppercase text-slate-900">
                  {isGovCredit ? (
                    docType === 'quotation' ? (
                      <span className="text-blue-900 font-extrabold">ใบเสนอราคา (QUOTATION)</span>
                    ) : docType === 'receipt' ? (
                      <span className="text-emerald-900 font-extrabold">ใบเสร็จรับเงิน (OFFICIAL RECEIPT)</span>
                    ) : (
                      <span className="text-purple-900 font-extrabold">ใบส่งของ / ใบแจ้งหนี้ (INVOICE)</span>
                    )
                  ) : (
                    'ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ'
                  )}
                </div>

                <div className="flex justify-between text-slate-700 pt-0.5">
                  <span>เลขที่เอกสาร:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {isGovCredit && docType === 'quotation'
                      ? `QT-${sale.receiptNumber.replace(/^POS-/i, '')}`
                      : isGovCredit && docType === 'invoice'
                      ? `INV-${sale.receiptNumber.replace(/^POS-/i, '')}`
                      : sale.receiptNumber}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>วันที่ทำรายการ:</span>
                  <span>{formattedDate}</span>
                </div>

                {sale.customerName && !isGovCredit && (
                  <div className="flex justify-between text-slate-700">
                    <span>ลูกค้า:</span>
                    <span className="font-semibold">
                      {sale.customerName} {sale.customerPhone ? `(${sale.customerPhone})` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="py-2 border-b border-dashed border-slate-300">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase">
                      <th className="pb-1 font-bold">รายการสินค้า</th>
                      <th className="pb-1 font-bold text-center w-8">จน.</th>
                      <th className="pb-1 font-bold text-right w-14">หน่วย</th>
                      <th className="pb-1 font-bold text-right w-14">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="py-1 pr-1">
                          <div className="font-semibold text-slate-800 leading-tight">
                            {item.name}
                          </div>
                        </td>
                        <td className="py-1 text-center text-slate-700">
                          {item.quantity}
                        </td>
                        <td className="py-1 text-right text-slate-700">
                          {item.price.toLocaleString()}
                        </td>
                        <td className="py-1 text-right font-bold text-slate-900">
                          {item.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculation & Summary */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>รวมเป็นเงิน:</span>
                  <span>฿{sale.subtotal.toLocaleString()}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>ส่วนลด:</span>
                    <span>-฿{sale.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1 border-t border-slate-300 font-black text-slate-950">
                  <span>ยอดสุทธิทั้งสิ้น:</span>
                  <span className="text-sm text-blue-900 font-extrabold">฿{sale.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* PromptPay QR */}
              {showPromptPayQr && promptPayQrUrl && (
                <div className="my-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-1">
                  <img
                    src={promptPayQrUrl}
                    alt="PromptPay QR Code"
                    className="w-24 h-24 mx-auto bg-white p-1 rounded border border-slate-300"
                  />
                  <p className="text-[9px] font-mono font-bold text-slate-700">
                    พร้อมเพย์: {shopSettings.promptPayId || '083-426-8058'}
                  </p>
                </div>
              )}

              {/* Footer Notice */}
              <div className="pt-2 text-center text-[9px] text-slate-500 border-t border-dashed border-slate-300 mt-1">
                <p className="font-bold text-slate-700">
                  {shopSettings.receiptFooterMessage || 'ขอบพระคุณที่ไว้วางใจใช้บริการ'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer (Hidden in Print) */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden bg-white dark:bg-slate-800 rounded-b-2xl">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>
              ยอดชำระ ฿{sale.totalAmount.toLocaleString()} ({paymentMethodLabel[sale.paymentMethod]})
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์เอกสาร</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
