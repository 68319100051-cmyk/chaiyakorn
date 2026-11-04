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
  AlertTriangle,
  Scissors
} from 'lucide-react';
import { Barcode } from './Barcode';

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
                📄 A5 แนวตั้ง (148 × 210 มม.)
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
        <div className="flex-1 overflow-y-auto overflow-x-auto w-full p-2 sm:p-6 bg-slate-200/70 dark:bg-slate-950 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
          {paperSize === 'a5' ? (
            /* ================= A5 FORMAT (148mm x 210mm) ================= */
            <div className="flex flex-col items-center w-full">
              {/* Paper Dimension Visual Indicator for Screen */}
              <div className="mb-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1.5 shadow-xs print:hidden">
                <span>📄 สัดส่วนกระดาษ A5 แนวตั้ง (148 มม. × 210 มม.)</span>
              </div>

              <div
                ref={printContentRef}
                id="pos-receipt-print-area"
                className="a5-portrait-paper bg-white text-slate-900 w-[148mm] min-h-[210mm] max-w-full p-3.5 mx-auto shadow-2xl rounded-sm border border-slate-300 text-[8px] leading-tight flex flex-col justify-between font-sans print:shadow-none print:border-none print:w-[140mm] print:h-[202mm] print:min-h-[202mm] print:p-0 print:m-0"
              >
                {/* ================= MAIN RECEIPT SECTION ================= */}
                <div className="flex flex-col justify-between flex-1">
                  {/* 1. Header: Logo, Shop Info, Doc Number & Barcode */}
                  <div className="flex justify-between items-start border-b border-slate-400 pb-1.5">
                    <div className="flex items-start gap-2.5 flex-1 mr-2">
                      {shopSettings.logoUrl ? (
                        <img
                          src={shopSettings.logoUrl}
                          alt={shopSettings.shopName}
                          className="h-13 sm:h-14 w-auto max-w-[100px] object-contain rounded border border-slate-200 p-0.5 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-blue-700 text-white flex items-center justify-center font-black text-sm shrink-0">
                          POS
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <h1 className="text-base sm:text-[17px] font-black text-slate-900 tracking-tight leading-tight">
                          {shopSettings.shopName}
                        </h1>
                        <p className="text-[8.5px] text-slate-800 leading-snug">
                          {shopSettings.shopAddress}
                        </p>
                        <p className="text-[8.5px] text-slate-800 font-medium">
                          โทร. <span className="font-bold text-slate-900">{shopSettings.shopPhone}</span>
                          {shopSettings.shopLineId && <span> | LINE: <span className="font-bold text-slate-900">{shopSettings.shopLineId}</span></span>}
                        </p>
                        <p className="text-[8.5px] text-slate-900 font-medium">
                          เลขประจำตัวผู้เสียภาษี: <span className="font-mono font-bold text-[9px]">{shopSettings.taxId || '3930500607938'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[8.5px] font-bold text-slate-700">เลขที่</span>
                        <span className="font-mono font-black text-xs text-slate-900">
                          {isGovCredit && docType === 'quotation'
                            ? `QT-${sale.receiptNumber.replace(/^POS-/i, '')}`
                            : isGovCredit && docType === 'invoice'
                            ? `INV-${sale.receiptNumber.replace(/^POS-/i, '')}`
                            : sale.receiptNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[7.5px] text-slate-600">วันที่</span>
                        <span className="text-[7.5px] font-medium text-slate-800">{formattedDate}</span>
                      </div>
                      <div className="px-2.5 py-0.2 rounded-full border border-slate-800 text-slate-800 text-[7.5px] font-bold mb-0.5">
                        สำหรับลูกค้า
                      </div>
                      {/* Top Barcode for POS Receipt Number */}
                      <div className="mt-0.5 flex flex-col items-end">
                        <Barcode
                          value={
                            isGovCredit && docType === 'quotation'
                              ? `QT-${sale.receiptNumber.replace(/^POS-/i, '')}`
                              : isGovCredit && docType === 'invoice'
                              ? `INV-${sale.receiptNumber.replace(/^POS-/i, '')}`
                              : sale.receiptNumber
                          }
                          width={1.0}
                          height={18}
                          displayValue={false}
                          className="h-4.5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Document Title Banner */}
                  <div className="my-1 py-0.5 border-y border-slate-400 bg-slate-100/90 text-center">
                    <h2 className="text-[10px] font-black tracking-wide text-slate-900 uppercase">
                      {isGovCredit
                        ? docType === 'quotation'
                          ? 'ใบเสนอราคา (POS QUOTATION)'
                          : docType === 'receipt'
                          ? 'ใบเสร็จรับเงิน (POS RECEIPT)'
                          : 'ใบส่งของ / ใบแจ้งหนี้ / ใบวางบิล'
                        : 'บิลเงินสด / ใบเสร็จรับเงิน'}
                    </h2>
                  </div>

                  {/* 3. Customer Info & Bank/PromptPay with 3x3 cm QR Box */}
                  <div className="grid grid-cols-12 border border-slate-400 rounded-xs text-[7.5px] leading-tight">
                    {/* Left: Customer Info (7 cols) */}
                    <div className="col-span-7 p-1 space-y-0.5 border-r border-dotted border-slate-400">
                      <div className="flex items-start">
                        <span className="font-bold text-slate-800 w-16 shrink-0">ชื่อลูกค้า:</span>
                        <span className="font-bold text-slate-900 truncate">
                          {sale.govCreditInfo?.agencyName || sale.customerName || 'ลูกค้าทั่วไป (หน้าร้าน)'}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold text-slate-700 w-16 shrink-0">ที่อยู่:</span>
                        <span className="text-slate-800 truncate">{sale.govCreditInfo?.department || '-'}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-semibold text-slate-700 w-16 shrink-0">โทรศัพท์:</span>
                        <span className="font-medium text-slate-800">{sale.customerPhone || '-'}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-semibold text-slate-700 w-16 shrink-0">เลขผู้เสียภาษี:</span>
                        <span className="font-mono text-slate-800">{sale.govCreditInfo?.taxId || '-'}</span>
                      </div>

                      <div className="pt-0.5 mt-0.5 border-t border-slate-200 flex items-center justify-between text-[7px]">
                        <span className="text-slate-600">พนักงานขาย: <span className="font-bold text-slate-800">{sale.cashierName || 'เจ้าหน้าที่ประจำร้าน'}</span></span>
                        <span className="text-slate-600">ชำระโดย: <span className="font-bold text-blue-900">{paymentMethodLabel[sale.paymentMethod] || sale.paymentMethod}</span></span>
                      </div>

                      {isGovCredit && sale.govCreditInfo && (
                        <div className="pt-0.5 border-t border-slate-200 text-[6.5px] text-purple-950 flex items-center justify-between">
                          <span>PO: {sale.govCreditInfo.orderNumber || '-'}</span>
                          {sale.govCreditInfo.disbursementNumber && <span>ฎีกา: {sale.govCreditInfo.disbursementNumber}</span>}
                          <span>ครบกำหนด: {sale.govCreditInfo.dueDate || '-'}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Bank Details & EXACT 3x3 cm QR Code (5 cols) */}
                    <div className="col-span-5 p-1 flex items-center justify-between gap-1 bg-slate-50/60">
                      <div className="space-y-0.2 text-[7px] leading-tight">
                        <p className="font-bold text-slate-900">
                          บัญชีธนาคาร <span className="font-normal">{shopSettings.bankName || 'กสิกรไทย'}</span>
                        </p>
                        <p className="font-bold text-slate-900 truncate max-w-[100px]">
                          ชื่อบัญชี <span className="font-normal">{shopSettings.bankAccountName || shopSettings.shopName}</span>
                        </p>
                        {shopSettings.bankAccountNumber && (
                          <p className="font-mono text-slate-700 text-[6.5px]">เลขที่: {shopSettings.bankAccountNumber}</p>
                        )}
                        <p className="font-bold text-slate-900 pt-0.5">
                          พร้อมเพย์ <span className="font-mono font-bold text-blue-900">{shopSettings.promptPayId || '0834268058'}</span>
                        </p>
                        <div className="pt-0.5">
                          <span className={`inline-block px-1 py-0.2 rounded font-bold text-[6.5px] ${
                            sale.paymentMethod === 'cash' || sale.paymentMethod === 'transfer'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {sale.paymentMethod === 'cash'
                              ? '✓ ชำระเงินสดแล้ว'
                              : sale.paymentMethod === 'transfer'
                              ? '✓ ชำระโอนพร้อมเพย์'
                              : 'เครดิตราชการ'}
                          </span>
                        </div>
                      </div>

                      {/* QR Code strictly 3x3 cm (30mm x 30mm) as requested */}
                      <div className="shrink-0 flex flex-col items-center">
                        {showPromptPayQr && promptPayQrUrl ? (
                          <div className="w-[30mm] h-[30mm] p-0.5 bg-white border border-slate-300 rounded-xs shadow-2xs flex items-center justify-center">
                            <img
                              src={promptPayQrUrl}
                              alt="PromptPay QR Code 3x3"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-[30mm] h-[30mm] bg-slate-100 border border-slate-300 flex items-center justify-center text-[7px] text-slate-400">
                            QR 3x3cm
                          </div>
                        )}
                        <span className="text-[6px] text-slate-400 mt-0.2">ขนาด 3×3 ซม.</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Items Table (Full-sheet, minimal empty gap) */}
                  <div className="border border-slate-400 rounded-xs overflow-hidden text-[7.5px] my-1">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-200/90 text-slate-900 font-bold border-b border-slate-400 text-[7.5px]">
                        <tr>
                          <th className="py-0.5 px-1 w-7 text-center border-r border-dotted border-slate-400">ลำดับที่</th>
                          <th className="py-0.5 px-1.5 border-r border-dotted border-slate-400">รายการสินค้า / พัสดุ</th>
                          <th className="py-0.5 px-1 w-12 text-center border-r border-dotted border-slate-400">จำนวน</th>
                          <th className="py-0.5 px-1 w-11 text-center border-r border-dotted border-slate-400">หน่วยนับ</th>
                          <th className="py-0.5 px-1 w-16 text-right border-r border-dotted border-slate-400">ราคาต่อหน่วย</th>
                          <th className="py-0.5 px-1.5 w-18 text-right">หลังหักส่วนลด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {sale.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-0.5 px-1 text-center text-slate-500 border-r border-dotted border-slate-300">{idx + 1}</td>
                            <td className="py-0.5 px-1.5 font-medium border-r border-dotted border-slate-300 truncate max-w-[210px]">
                              {item.name} {item.itemCode && <span className="font-mono text-slate-400 text-[6.5px]">({item.itemCode})</span>}
                            </td>
                            <td className="py-0.5 px-1 text-center border-r border-dotted border-slate-300">
                              {Number(item.quantity).toFixed(2)}
                            </td>
                            <td className="py-0.5 px-1 text-center border-r border-dotted border-slate-300">
                              {item.unit || 'ชิ้น'}
                            </td>
                            <td className="py-0.5 px-1 text-right font-mono border-r border-dotted border-slate-300">
                              ฿{Number(item.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-0.5 px-1.5 text-right font-mono font-semibold">
                              ฿{Number(item.total).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 5. Totals & Notes Section */}
                  <div className="grid grid-cols-12 gap-1.5 text-[7.5px]">
                    {/* Left: Remarks & Baht text bar */}
                    <div className="col-span-7 flex flex-col justify-between">
                      <div className="space-y-0.2">
                        <p className="font-bold text-slate-800">
                          หมายเหตุ: <span className="font-normal text-slate-700">{sale.notes || 'ตรวจนับสินค้าถูกต้องเรียบร้อย'}</span>
                        </p>
                      </div>

                      {/* Shaded bar with Thai Baht text */}
                      <div className="p-1 rounded bg-slate-200/80 border border-slate-300 text-center font-bold text-[8px] text-slate-900 mt-1">
                        ตัวอักษร: ( {bahtText(sale.totalAmount)} )
                      </div>
                    </div>

                    {/* Right: Calculations */}
                    <div className="col-span-5 space-y-0.2 border border-slate-300 rounded p-1 bg-slate-50/50">
                      <div className="flex justify-between text-slate-700">
                        <span>รวม ({sale.items.reduce((sum, i) => sum + i.quantity, 0)} ชิ้น)</span>
                        <span className="font-mono">฿{sale.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>ส่วนลดการค้า</span>
                        <span className="font-mono">{sale.discount > 0 ? `-฿${sale.discount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '0.00'}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>มูลค่าสินค้า</span>
                        <span className="font-mono">฿{sale.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>ภาษีมูลค่าเพิ่ม</span>
                        <span className="font-mono">0.00</span>
                      </div>
                      <div className="flex justify-between items-baseline font-black text-[9px] text-slate-950 pt-0.5 border-t-2 border-slate-800">
                        <span>{docType === 'quotation' ? 'ราคาประเมินเบื้องต้น' : 'รวมสุทธิ'}</span>
                        <span className="font-mono text-[11px] font-black text-blue-900">
                          ฿{sale.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {sale.paymentMethod === 'cash' && (
                        <div className="flex justify-between text-[6.5px] text-slate-500 pt-0.5 border-t border-slate-200 font-mono">
                          <span>รับเงิน: ฿{(sale.amountReceived || sale.totalAmount).toLocaleString()}</span>
                          <span className="font-bold text-emerald-800">ทอน: ฿{(sale.change || 0).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 6. Warranty Terms */}
                  <div className="border border-slate-300 rounded p-1.5 bg-slate-50/60 text-[7px] leading-tight space-y-0.5 my-0.5">
                    <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-0.5">
                      <span className="font-extrabold text-[7.5px] text-slate-950">เงื่อนไขการรับประกัน:</span>
                      <span className="text-blue-900 font-bold">
                        🛡️ สินค้าคุณภาพมาตรฐาน
                      </span>
                    </div>
                    <p className="text-slate-800">1. การรับประกันการซ่อมสินค้าจะมีผลเมื่อมีเอกสารฉบับนี้มายืนยันกับทางร้านเท่านั้น</p>
                    <p className="text-slate-800">2. เมื่อสินค้าได้รับการซ่อมหรือแก้ไขโดยมิใช่การดำเนินการของทางร้าน ถือว่าการรับประกันสิ้นสุดทันที</p>
                    <p className="text-slate-800">3. ไม่รับประกันกรณีมีการใช้งานผิดประเภท</p>
                  </div>

                  {/* 7. Signatures */}
                  {isGovCredit ? (
                    <div className="my-0.5 pt-0.5 border-t border-slate-300">
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[7.5px] text-slate-700">
                        <div className="border border-slate-200 p-1 rounded space-y-0.5">
                          <p className="font-bold text-[7.5px]">ผู้ส่งมอบพัสดุ / บริการ</p>
                          <div className="pt-1 text-slate-400">( ................................................ )</div>
                          <p className="text-[6.5px] text-slate-500 truncate">{shopSettings.shopName}</p>
                        </div>

                        <div className="border border-slate-200 p-1 rounded space-y-0.5">
                          <p className="font-bold text-[7.5px]">ผู้รับมอบพัสดุ / เจ้าหน้าที่พัสดุ</p>
                          <div className="pt-1 text-slate-400">( ................................................ )</div>
                          <p className="text-[6.5px] text-slate-500 truncate">{sale.govCreditInfo?.agencyName || sale.customerName}</p>
                        </div>

                        <div className="border border-slate-200 p-1 rounded space-y-0.5">
                          <p className="font-bold text-[7.5px]">ประธานกรรมการตรวจรับ</p>
                          <div className="pt-1 text-slate-400">( ................................................ )</div>
                          <p className="text-[6.5px] text-slate-500">วันที่ ...... / ...... / ..........</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="my-1 pt-0.5 border-t border-slate-300">
                      <div className="grid grid-cols-2 gap-3 text-center text-[8px]">
                        {/* Customer Signature Box - Enlarged */}
                        <div className="border border-slate-300 rounded p-1.5 bg-slate-50/60 flex flex-col justify-between min-h-[54px]">
                          <p className="font-bold text-slate-900 text-[8.5px]">ผู้รับสินค้า / บริการ (ลงลายมือชื่อ)</p>
                          <div className="py-2">
                            <div className="border-b border-dotted border-slate-400 w-44 mx-auto"></div>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-800 font-bold">( {sale.customerName || 'ลูกค้าผู้ซื้อสินค้า'} )</p>
                            <p className="text-[7px] text-slate-500 mt-0.5">วันที่ ...... / ...... / ..........</p>
                          </div>
                        </div>

                        {/* Shop / Cashier Signature Box - Enlarged */}
                        <div className="border border-slate-300 rounded p-1.5 bg-slate-50/60 flex flex-col justify-between min-h-[54px]">
                          <p className="font-bold text-slate-900 text-[8.5px]">ผู้รับเงิน / พนักงานขาย</p>
                          <div className="py-2">
                            <div className="border-b border-dotted border-slate-400 w-44 mx-auto"></div>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-800 font-bold">( {sale.cashierName || shopSettings.shopName} )</p>
                            <p className="text-[7px] text-slate-500 mt-0.5">วันที่ ...... / ...... / ..........</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-[6.5px] text-slate-500 text-center mt-0.5">
                        * ได้รับสินค้าตามรายการข้างต้นในสภาพที่เรียบร้อยและถูกต้องสมบูรณ์แล้ว
                      </p>
                    </div>
                  )}
                </div>

                {/* ================= TEAR-OFF CUSTOMER STUB (ส่วนท้ายใบเสร็จสำหรับตัด) ================= */}
                <div className="mt-1 pt-0.5">
                  {/* Perforated Cutting Line */}
                  <div className="relative my-1 text-center border-t-2 border-dashed border-slate-400">
                    <span className="absolute left-1/2 -top-2 -translate-x-1/2 bg-white px-2 text-[7px] font-bold text-slate-600 flex items-center gap-1 shadow-2xs">
                      <Scissors className="w-2.5 h-2.5 text-slate-700 inline" />
                      <span>ตัดตามรอยประ (หางบัตรสำหรับลูกค้า / ใบเสร็จรับสินค้าส่วนตัด)</span>
                    </span>
                  </div>

                  {/* Customer Stub Box */}
                  <div className="border border-slate-400 rounded-xs p-1 bg-slate-50/80 text-[7px] leading-tight space-y-0.5">
                    <div className="flex justify-between items-center border-b border-slate-300 pb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-[8px] text-slate-900">{shopSettings.shopName}</span>
                        <span className="text-[6.5px] text-slate-600">โทร. {shopSettings.shopPhone}</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 font-bold text-[6.5px]">
                        หางบัตรสำหรับลูกค้า (Customer Stub)
                      </span>
                    </div>

                    <div className="grid grid-cols-12 gap-1 items-center">
                      {/* Left: Doc No, Enlarged Barcode (~2x), Customer, Items count (7 cols) */}
                      <div className="col-span-7 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-[8px]">
                            เลขที่: <span className="font-mono font-black">{sale.receiptNumber}</span>
                          </span>
                        </div>
                        {/* Barcode enlarged ~2x (height 28px vs 14px, width 1.35 vs 0.85) */}
                        <div className="py-0.5 px-1 bg-white rounded-xs border border-slate-300 inline-block">
                          <Barcode value={sale.receiptNumber} width={1.35} height={28} displayValue={false} className="h-7 max-w-full inline-block" />
                        </div>
                        <p className="truncate text-[7.5px]">
                          <span className="font-semibold text-slate-700">ลูกค้า:</span> <span className="font-bold">{sale.customerName || 'ลูกค้าทั่วไป'}</span> {sale.customerPhone && `(โทร. ${sale.customerPhone})`}
                        </p>
                        <p className="truncate text-[7px] text-slate-600">
                          <span className="font-semibold text-slate-700">รายการ:</span> {sale.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                        </p>
                      </div>

                      {/* Right: Amount, Payment method, Date (5 cols) */}
                      <div className="col-span-5 flex items-center justify-between pl-1 border-l border-slate-300">
                        <div className="space-y-0.2">
                          <p className="font-bold text-slate-900">
                            {docType === 'quotation' ? 'ราคาประเมินเบื้องต้น:' : 'ยอดสุทธิ:'}{' '}
                            <span className="text-blue-900 font-mono font-bold text-[8px]">฿{sale.totalAmount.toLocaleString()}</span>
                          </p>
                          <p className="text-emerald-800 font-bold">
                            ช่องทาง: {paymentMethodLabel[sale.paymentMethod] || sale.paymentMethod}
                          </p>
                          <p className="text-[6px] text-slate-500">วันที่: {formattedDate}</p>
                          <p className="text-[6px] text-slate-500">แคชเชียร์: {sale.cashierName || 'เจ้าหน้าที่'}</p>
                        </div>

                        {/* PromptPay QR Code (Compact for Stub) */}
                        {promptPayQrUrl && (
                          <div className="flex flex-col items-center shrink-0 ml-1">
                            <img src={promptPayQrUrl} alt="PromptPay QR" className="w-7 h-7 p-0.5 bg-white border border-slate-300 rounded-xs" />
                            <span className="text-[5.5px] text-slate-500">พร้อมเพย์</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[6px] text-slate-500 pt-0.5 border-t border-slate-200">
                      <span>* กรุณาเก็บหางบัตรนี้ไว้เป็นหลักฐานการซื้อสินค้าและรับประกัน</span>
                      <span>{shopSettings.shopName}</span>
                    </div>
                  </div>
                </div>
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
