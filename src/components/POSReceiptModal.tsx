import React, { useRef, useState, useEffect } from 'react';
import { POSSaleRecord, ShopSettings, GovDocumentType } from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { bahtText } from '../utils/bahtText';
import { formatThaiDateFull, formatMoneyPlain, printWithCleanTitle } from '../utils/printHelpers';
import {
  Printer,
  X,
  CheckCircle2,
  Receipt,
  Building2,
  QrCode
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

  const isGovCredit = sale.paymentMethod === 'gov_credit';

  const activePosTitle = isGovCredit
    ? docType === 'quotation'
      ? 'ใบเสนอราคา'
      : docType === 'receipt'
      ? 'ใบเสร็จรับเงิน'
      : 'ใบส่งของ'
    : 'ใบเสร็จรับเงิน';

  const activePosDocNo =
    isGovCredit && docType === 'quotation'
      ? `QT-${sale.receiptNumber.replace(/^POS-/i, '')}`
      : isGovCredit && docType === 'invoice'
      ? `INV-${sale.receiptNumber.replace(/^POS-/i, '')}`
      : sale.receiptNumber;

  const handlePrint = () => {
    printWithCleanTitle(`${activePosTitle}-${activePosDocNo}`);
  };

  const formattedDate = formatThaiDateFull(sale.createdAt);
  const govDueDateThai = sale.govCreditInfo?.dueDate ? formatThaiDateFull(sale.govCreditInfo.dueDate) : '';

  const paymentMethodLabel: Record<string, string> = {
    cash: 'เงินสด',
    transfer: 'โอนเงินพร้อมเพย์',
    credit: 'บัตรเครดิต',
    gov_credit: 'เครดิตราชการ'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print-modal-overlay">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 print-modal-card">
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
                <span>{activePosTitle}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  isGovCredit
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {activePosDocNo}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {isGovCredit ? 'รายการเครดิตสำหรับหน่วยงานราชการและสถานศึกษา' : 'บันทึกการขายสำเร็จ • ออกใบเสร็จและตัดสต็อกเรียบร้อย'}
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
                  ใบส่งของ
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
        <div className="flex-1 overflow-y-auto overflow-x-auto w-full p-2 sm:p-6 bg-slate-200/75 dark:bg-slate-950 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
          {paperSize === 'a5' ? (
            /* ================= A5 FORMAT (148mm x 210mm) ================= */
            (() => {
              const posCustomerLabel = sale.govCreditInfo?.agencyName || sale.customerName || 'ลูกค้าทั่วไป';
              const isCompact = sale.items.length >= 4 && sale.items.length <= 7;
              const isMultiPage = sale.items.length > 7;

              return (
                <div className="flex flex-col items-center w-full">
                  <div className="mb-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold print:hidden">
                    ตัวอย่างกระดาษ A5 แนวตั้ง (148 × 210 มม. | ขอบ ซ้าย-ขวา-บน 6 มม. / ล่าง 3.5 มม.)
                  </div>

                  <div
                    ref={printContentRef}
                    id="pos-receipt-print-area"
                    className={`a5-portrait-paper shadow-2xl border border-slate-300 mx-auto flex flex-col justify-between ${
                      isCompact ? 'a5-compact' : ''
                    } ${isMultiPage ? 'a5-multi-page' : ''}`}
                  >
                    {/* ================= MAIN CONTENT ================= */}
                    <div className="space-y-2">
                      {/* 1. Header: Logo, Shop Info | Doc Number & Thai Date (NO TOP BARCODE) */}
                      <div className="flex justify-between items-start gap-2.5 border-b-2 border-slate-800 pb-2">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {shopSettings.logoUrl && (
                            <img
                              src={shopSettings.logoUrl}
                              alt={shopSettings.shopName}
                              className="h-12 w-auto max-w-[88px] object-contain shrink-0"
                            />
                          )}
                          <div className="min-w-0 leading-[1.5]">
                            <h1 className="text-[11.5pt] font-bold text-slate-950 leading-[1.35]">
                              {shopSettings.shopName}
                            </h1>
                            <p className="text-[9pt] font-normal text-slate-800">
                              {shopSettings.shopAddress}
                            </p>
                            <p className="text-[9pt] font-normal text-slate-900">
                              โทร. {shopSettings.shopPhone}
                              {shopSettings.shopLineId ? ` | LINE: ${shopSettings.shopLineId}` : ''}
                            </p>
                            <p className="text-[9pt] font-normal text-slate-800">
                              เลขประจำตัวผู้เสียภาษี: {shopSettings.taxId || '3930500607938'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-0.5 leading-[1.5]">
                          <div className="text-[9pt] font-normal text-slate-900">
                            เลขที่ <span className="font-mono text-[9.5pt] font-bold text-slate-950">{activePosDocNo}</span>
                          </div>
                          <div className="text-[9pt] font-normal text-slate-900">
                            วันที่: {formattedDate}
                          </div>
                        </div>
                      </div>

                      {/* 2. Document Title Banner (NO TOP BORDER, BOTTOM LINE ONLY) */}
                      <div className="a5-doc-banner">
                        <h2 className="text-[10.5pt] font-bold tracking-wide text-slate-950">
                          {activePosTitle}
                        </h2>
                      </div>

                      {/* 3. Customer Info & Payment / PromptPay QR */}
                      <div className="grid grid-cols-12 border border-slate-500 text-[9pt] leading-[1.55]">
                        <div className="col-span-6 p-2 space-y-1 border-r border-slate-400 min-w-0 font-normal text-slate-900">
                          <div className="break-words">
                            <span className="font-bold text-slate-950">ลูกค้า: </span>
                            <span className="font-bold text-slate-950">{posCustomerLabel}</span>
                          </div>
                          {sale.govCreditInfo?.department && (
                            <div className="break-words">
                              <span>หน่วยงาน: </span>
                              <span>{sale.govCreditInfo.department}</span>
                            </div>
                          )}
                          <div>
                            <span>โทร: </span>
                            <span>{sale.customerPhone || '-'}</span>
                          </div>
                          {sale.govCreditInfo?.taxId && (
                            <div>
                              <span>เลขภาษี: </span>
                              <span className="font-mono">{sale.govCreditInfo.taxId}</span>
                            </div>
                          )}
                          <div className="pt-1 mt-1 border-t border-slate-300">
                            <span>ชำระโดย: </span>
                            <span>{paymentMethodLabel[sale.paymentMethod] || sale.paymentMethod}</span>
                          </div>
                          {isGovCredit && sale.govCreditInfo && (
                            <div className="space-y-0.5">
                              {sale.govCreditInfo.orderNumber && <div>PO: {sale.govCreditInfo.orderNumber}</div>}
                              {govDueDateThai && <div>ครบกำหนดชำระ: {govDueDateThai}</div>}
                            </div>
                          )}
                        </div>

                        <div className="col-span-6 p-2 flex items-center justify-between gap-2 bg-slate-50/70 min-w-0">
                          <div className="space-y-1 text-[9pt] leading-[1.55] font-normal text-slate-900 min-w-0">
                            <p className="font-bold text-slate-950">
                              ธนาคาร{shopSettings.bankName || 'กสิกรไทย'}
                            </p>
                            <p className="font-bold text-slate-950 break-words">
                              {shopSettings.bankAccountName || shopSettings.shopName}
                            </p>
                            {shopSettings.bankAccountNumber && (
                              <p className="font-mono text-slate-900">
                                {shopSettings.bankAccountNumber}
                              </p>
                            )}
                            <p className="text-slate-900">
                              พร้อมเพย์ {shopSettings.promptPayId || '0834268058'}
                            </p>
                          </div>

                          {showPromptPayQr && promptPayQrUrl && (
                            <div className="shrink-0 flex flex-col items-center">
                              <div className="w-[21mm] h-[21mm] p-0.5 bg-white border border-slate-400 flex items-center justify-center">
                                <img
                                  src={promptPayQrUrl}
                                  alt="PromptPay QR"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <span className="text-[9pt] font-normal text-slate-900 mt-1">พร้อมเพย์</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4. Items Table (NO '฿' SYMBOL ANYWHERE) */}
                      <div className="border border-slate-500 text-[9pt] leading-[1.55]">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-200 text-slate-950 font-bold border-b border-slate-500">
                            <tr>
                              <th className="py-1.5 px-1.5 w-[8%] text-center border-r border-slate-400">ที่</th>
                              <th className="py-1.5 px-2 w-[44%] border-r border-slate-400">รายการสินค้า</th>
                              <th className="py-1.5 px-1 w-[10%] text-center border-r border-slate-400">จำนวน</th>
                              <th className="py-1.5 px-1 w-[10%] text-center border-r border-slate-400">หน่วย</th>
                              <th className="py-1.5 px-2 w-[14%] text-right border-r border-slate-400">ราคา</th>
                              <th className="py-1.5 px-2 w-[14%] text-right">รวม (บาท)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300 font-normal text-slate-900">
                            {sale.items.map((item, idx) => (
                              <tr key={idx} className="a5-keep-together">
                                <td className="py-1.5 px-1.5 text-center border-r border-slate-300">{idx + 1}</td>
                                <td className="py-1.5 px-2 border-r border-slate-300 break-words">
                                  {item.name}
                                </td>
                                <td className="py-1.5 px-1 text-center border-r border-slate-300 tabular-nums">
                                  {item.quantity}
                                </td>
                                <td className="py-1.5 px-1 text-center border-r border-slate-300">
                                  {item.unit || 'ชิ้น'}
                                </td>
                                <td className="py-1.5 px-2 text-right border-r border-slate-300 tabular-nums">
                                  {formatMoneyPlain(item.price, 2)}
                                </td>
                                <td className="py-1.5 px-2 text-right text-slate-950 tabular-nums">
                                  {formatMoneyPlain(item.total, 2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* 5. Totals & Notes Section */}
                      <div className="grid grid-cols-12 gap-2.5 text-[9pt] leading-[1.55] a5-keep-together">
                        <div className="col-span-7 flex flex-col justify-between gap-1.5">
                          <div className="text-slate-900 font-normal break-words">
                            <span className="font-bold text-slate-950">หมายเหตุ: </span>
                            <span>{sale.notes || 'ตรวจนับสินค้าถูกต้องเรียบร้อย'}</span>
                          </div>
                          <div className="p-2 bg-slate-100 border border-slate-400 text-center font-bold text-slate-950">
                            ตัวอักษร: ( {bahtText(sale.totalAmount)} )
                          </div>
                        </div>

                        <div className="col-span-5 border border-slate-500 p-2 bg-slate-50 space-y-1 tabular-nums font-normal">
                          <div className="flex justify-between text-slate-900">
                            <span>รวมเป็นเงิน</span>
                            <span>{formatMoneyPlain(sale.subtotal, 2)}</span>
                          </div>
                          {sale.discount > 0 && (
                            <div className="flex justify-between text-rose-700">
                              <span>ส่วนลด</span>
                              <span>-{formatMoneyPlain(sale.discount, 2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-baseline font-bold text-[10pt] text-slate-950 pt-1 border-t-2 border-slate-800">
                            <span>{docType === 'quotation' ? 'ราคาประเมิน (บาท)' : 'รวมสุทธิ (บาท)'}</span>
                            <span className="text-[10.5pt]">{formatMoneyPlain(sale.totalAmount, 2)}</span>
                          </div>
                          {sale.paymentMethod === 'cash' && (
                            <div className="flex justify-between text-[9pt] text-slate-800 pt-0.5 border-t border-slate-300">
                              <span>รับ: {formatMoneyPlain(sale.amountReceived || sale.totalAmount, 2)}</span>
                              <span>ทอน: {formatMoneyPlain(sale.change || 0, 2)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 6. Warranty Terms (Concise & Readable) */}
                      <div className="a5-section-box bg-slate-50/70 text-[9pt] leading-[1.55] space-y-0.5 font-normal text-slate-900 a5-keep-together">
                        <p className="font-bold text-slate-950 border-b border-slate-300 pb-1">
                          เงื่อนไขการรับประกัน:
                        </p>
                        <p>1. การรับประกันมีผลเมื่อนำเอกสารฉบับนี้มายืนยันกับทางร้านเท่านั้น</p>
                        <p>2. หากสินค้าถูกแก้ไขหรือซ่อมจากภายนอก การรับประกันสิ้นสุดทันที</p>
                        <p>3. ไม่รับประกันกรณีมีการใช้งานผิดประเภท ตกหล่น หรือโดนความชื้น</p>
                      </div>
                    </div>

                    {/* ================= BOTTOM SECTION: ENLARGED SIGNATURES + CLEAN STUB ================= */}
                    <div className="mt-auto pt-2.5 space-y-2 a5-keep-together">
                      {isGovCredit ? (
                        <div className="grid grid-cols-3 gap-2 text-center text-[9pt]">
                          <div className="a5-sign-box">
                            <p className="font-bold text-slate-950">ผู้ส่งมอบสินค้า</p>
                            <div className="flex-1" />
                            <p className="font-bold text-slate-950">( ร้านพัทลุงปริ้นเตอร์ )</p>
                          </div>
                          <div className="a5-sign-box">
                            <p className="font-bold text-slate-950">ผู้รับมอบสินค้า</p>
                            <div className="flex-1" />
                            <p className="font-bold text-slate-950 truncate">( {posCustomerLabel} )</p>
                          </div>
                          <div className="a5-sign-box">
                            <p className="font-bold text-slate-950">ประธานตรวจรับ</p>
                            <div className="flex-1" />
                            <p className="font-normal text-slate-950">( .................................... )</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 text-center text-[9pt]">
                          <div className="a5-sign-box">
                            <p className="font-bold text-slate-950">ผู้รับสินค้า / ลูกค้า</p>
                            <div className="flex-1" />
                            <p className="font-bold text-slate-950">( {posCustomerLabel} )</p>
                          </div>

                          <div className="a5-sign-box">
                            <p className="font-bold text-slate-950">ผู้รับเงิน / พนักงานขาย</p>
                            <div className="flex-1" />
                            <p className="font-bold text-slate-950">( ร้านพัทลุงปริ้นเตอร์ )</p>
                          </div>
                        </div>
                      )}

                      {/* Tear-off Stub: ONLY Doc No, Barcode, Customer Name */}
                      <div className="pt-2 border-t-2 border-dashed border-slate-500">
                        <div className="border border-slate-500 px-3 py-2 flex items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="text-[9.5pt] font-bold text-slate-950">
                              เลขที่เอกสาร: <span className="font-mono">{activePosDocNo}</span>
                            </div>
                            <div className="text-[9.5pt] font-bold text-slate-950 truncate">
                              ชื่อลูกค้า: {posCustomerLabel}
                            </div>
                          </div>
                          <div className="shrink-0 bg-white px-1">
                            <Barcode
                              value={activePosDocNo}
                              width={1.3}
                              height={32}
                              displayValue={false}
                              className="h-[32px] max-w-[190px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            /* ================= 80MM THERMAL SLIP FORMAT (NO '฿' SYMBOL, THAI FULL DATE) ================= */
            <div
              ref={printContentRef}
              id="pos-receipt-print-area"
              className="bg-white text-slate-950 shadow-xl border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 w-full max-w-[350px] p-4 rounded-xl text-[9pt] leading-[1.55]"
            >
              <div className="text-center space-y-1 border-b border-dashed border-slate-400 pb-2">
                {shopSettings.logoUrl && (
                  <img
                    src={shopSettings.logoUrl}
                    alt={shopSettings.shopName}
                    className="w-12 h-12 mx-auto object-contain mb-1"
                  />
                )}
                <h1 className="text-[10.5pt] font-bold text-slate-950 leading-tight">
                  {shopSettings.shopName}
                </h1>
                <p className="text-[9pt] font-normal text-slate-800">{shopSettings.shopAddress}</p>
                <p className="text-[9pt] font-normal text-slate-900">
                  โทร: {shopSettings.shopPhone}
                  {shopSettings.shopLineId && ` | LINE: ${shopSettings.shopLineId}`}
                </p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[9pt] font-normal">
                <div className="text-center font-bold text-[10pt] text-slate-950">
                  {activePosTitle}
                </div>
                <div className="flex justify-between">
                  <span>เลขที่เอกสาร:</span>
                  <span className="font-mono font-bold">{activePosDocNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>วันที่:</span>
                  <span>{formattedDate}</span>
                </div>
                {sale.customerName && (
                  <div className="flex justify-between">
                    <span>ลูกค้า:</span>
                    <span className="font-bold">{sale.customerName}</span>
                  </div>
                )}
              </div>

              <div className="py-2 border-b border-dashed border-slate-400">
                <table className="w-full text-left text-[9pt]">
                  <thead>
                    <tr className="border-b border-slate-400 text-slate-950">
                      <th className="pb-1 font-bold">รายการ</th>
                      <th className="pb-1 font-bold text-center w-10">จน.</th>
                      <th className="pb-1 font-bold text-right w-16">รวม (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 tabular-nums font-normal">
                    {sale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1 pr-1">{item.name}</td>
                        <td className="py-1 text-center">{item.quantity}</td>
                        <td className="py-1 text-right">{formatMoneyPlain(item.total, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[9pt] tabular-nums font-normal">
                <div className="flex justify-between">
                  <span>รวมเป็นเงิน:</span>
                  <span>{formatMoneyPlain(sale.subtotal, 2)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>ส่วนลด:</span>
                    <span>-{formatMoneyPlain(sale.discount, 2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1 border-t border-slate-400 font-bold text-[10pt]">
                  <span>ยอดสุทธิ (บาท):</span>
                  <span>{formatMoneyPlain(sale.totalAmount, 2)}</span>
                </div>
              </div>

              {showPromptPayQr && promptPayQrUrl && (
                <div className="my-2 text-center space-y-1">
                  <img
                    src={promptPayQrUrl}
                    alt="PromptPay QR"
                    className="w-24 h-24 mx-auto bg-white p-1 border border-slate-300"
                  />
                  <p className="text-[9pt] font-normal">พร้อมเพย์ {shopSettings.promptPayId || '0834268058'}</p>
                </div>
              )}
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
