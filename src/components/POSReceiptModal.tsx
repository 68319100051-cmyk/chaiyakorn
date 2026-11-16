import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { POSSaleRecord, ShopSettings, GovDocumentType, POSCartItem } from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { bahtText } from '../utils/bahtText';
import { formatThaiDateFull, formatMoneyPlain, printWithCleanTitle } from '../utils/printHelpers';
import { useA5FitToPage } from '../utils/useA5FitToPage';
import {
  Printer,
  X,
  CheckCircle2,
  Receipt,
  Building2,
  QrCode,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { Barcode } from './Barcode';

interface POSReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: POSSaleRecord | null;
  shopSettings: ShopSettings;
}

interface POSSheetChunk {
  sheetDocNo: string;
  sheetIndex: number;
  totalSheets: number;
  items: POSCartItem[];
  sheetSubtotal: number;
}

interface A5POSSheetProps {
  sale: POSSaleRecord;
  shopSettings: ShopSettings;
  docType: GovDocumentType;
  activePosTitle: string;
  chunk: POSSheetChunk;
  isSplitSheet: boolean;
  isGovCredit: boolean;
  posCustomerLabel: string;
  formattedDate: string;
  govDueDateThai: string;
  paymentMethodLabel: string;
  showPromptPayQr: boolean;
  promptPayQrUrl: string;
  resetDeps: unknown[];
  onFitReport?: (sheetIndex: number, isOverflowing: boolean, measuredMm: number, fitLevel: number) => void;
}

const A5POSSheet: React.FC<A5POSSheetProps> = ({
  sale,
  shopSettings,
  docType,
  activePosTitle,
  chunk,
  isSplitSheet,
  isGovCredit,
  posCustomerLabel,
  formattedDate,
  govDueDateThai,
  paymentMethodLabel,
  showPromptPayQr,
  promptPayQrUrl,
  resetDeps,
  onFitReport
}) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { fitLevel, isOverflowing, measuredContentMm } = useA5FitToPage(
    paperRef,
    topRef,
    bottomRef,
    true,
    [...resetDeps, chunk.sheetDocNo, chunk.items.length]
  );

  useEffect(() => {
    onFitReport?.(chunk.sheetIndex, isOverflowing, measuredContentMm, fitLevel);
  }, [chunk.sheetIndex, isOverflowing, measuredContentMm, fitLevel, onFitReport]);

  const displaySubtotal = isSplitSheet ? chunk.sheetSubtotal : sale.subtotal;
  const displayDiscount = isSplitSheet ? 0 : sale.discount;
  const displayTotal = isSplitSheet ? chunk.sheetSubtotal : sale.totalAmount;

  return (
    <div className="flex flex-col items-center w-full print:block">
      {isSplitSheet && (
        <div className="mb-1.5 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold print:hidden">
          ใบที่ {chunk.sheetIndex + 1} / {chunk.totalSheets} — เลขที่ {chunk.sheetDocNo}
        </div>
      )}

      <div
        ref={paperRef}
        id={chunk.sheetIndex === 0 ? 'pos-receipt-print-area' : `pos-receipt-print-area-${chunk.sheetIndex + 1}`}
        data-fit-level={fitLevel}
        data-overflowing={isOverflowing ? 'true' : 'false'}
        data-measured-mm={measuredContentMm}
        className={`a5-portrait-paper a5-fit-${fitLevel} shadow-2xl ring-1 ring-slate-300 print:ring-0 mx-auto flex flex-col justify-between`}
      >
        {/* ================= MAIN CONTENT ================= */}
        <div ref={topRef} className="a5-top-content">
          {/* 1. Header: Logo, Shop Info | Doc Number & Thai Date (NO TOP BARCODE, NO TOP LINE, NEVER SHRINKS) */}
          <div className="a5-doc-header flex justify-between items-start gap-2.5 a5-keep-together">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              {shopSettings.logoUrl && (
                <img
                  src={shopSettings.logoUrl}
                  alt={shopSettings.shopName}
                  className="h-12 w-auto max-w-[88px] object-contain shrink-0"
                />
              )}
              <div className="min-w-0 leading-[1.45]">
                <h1 className="text-[11.5pt] font-bold text-slate-950 leading-[1.3]">
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

            <div className="text-right shrink-0 space-y-0.5 leading-[1.45] whitespace-nowrap">
              <div className="text-[9pt] font-normal text-slate-900">
                เลขที่ <span className="font-mono text-[9.5pt] font-bold text-slate-950">{chunk.sheetDocNo}</span>
              </div>
              {isSplitSheet && (
                <div className="text-[9pt] font-bold text-slate-900">
                  แผ่นที่ {chunk.sheetIndex + 1}/{chunk.totalSheets}
                </div>
              )}
              <div className="text-[9pt] font-normal text-slate-900">
                วันที่: {formattedDate}
              </div>
            </div>
          </div>

          {/* 2. Document Title Banner (NO TOP BORDER, BOTTOM LINE ONLY) */}
          <div className="a5-doc-banner a5-keep-together">
            <h2 className="text-[10.5pt] font-bold tracking-wide text-slate-950">
              {activePosTitle}
              {isSplitSheet ? ` (ใบย่อย ${chunk.sheetIndex + 1}/${chunk.totalSheets})` : ''}
            </h2>
          </div>

          {/* 3. Customer Info & Payment / PromptPay QR */}
          <div className="a5-info-box grid grid-cols-12 border border-slate-500 a5-keep-together">
            <div className="a5-info-box-cell col-span-6 p-2 space-y-0.5 border-r border-slate-400 min-w-0 font-normal text-slate-900">
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
                {sale.govCreditInfo?.taxId && (
                  <span> | เลขภาษี: <span className="font-mono">{sale.govCreditInfo.taxId}</span></span>
                )}
              </div>
              <div className="pt-0.5 mt-0.5 border-t border-slate-300">
                <span>ชำระโดย: </span>
                <span>{paymentMethodLabel}</span>
              </div>
              {isGovCredit && sale.govCreditInfo && (
                <div className="space-y-0.5">
                  {sale.govCreditInfo.orderNumber && <div>PO: {sale.govCreditInfo.orderNumber}</div>}
                  {govDueDateThai && <div>ครบกำหนดชำระ: {govDueDateThai}</div>}
                </div>
              )}
            </div>

            <div className="a5-info-box-cell col-span-6 p-2 flex items-center justify-between gap-2 bg-slate-50/70 min-w-0">
              <div className="space-y-0.5 font-normal text-slate-900 min-w-0">
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
                  <span className="text-[9pt] font-normal text-slate-900 mt-0.5">พร้อมเพย์</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Items Table (NO '฿' SYMBOL ANYWHERE) */}
          <div className="a5-items-table border border-slate-500">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-200 text-slate-950 font-bold border-b border-slate-500">
                <tr>
                  <th className="py-1.5 px-1 w-[8%] text-center border-r border-slate-400">ที่</th>
                  <th className="py-1.5 px-2 w-[44%] border-r border-slate-400">รายการสินค้า</th>
                  <th className="py-1.5 px-1 w-[10%] text-center border-r border-slate-400">จำนวน</th>
                  <th className="py-1.5 px-1 w-[10%] text-center border-r border-slate-400">หน่วย</th>
                  <th className="py-1.5 px-1.5 w-[14%] text-right border-r border-slate-400">ราคา</th>
                  <th className="py-1.5 px-1.5 w-[14%] text-right">รวม (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-normal text-slate-900">
                {chunk.items.map((item, idx) => (
                  <tr key={idx} className="a5-keep-together">
                    <td className="py-1.5 px-1 text-center border-r border-slate-300">{idx + 1}</td>
                    <td className="py-1.5 px-2 border-r border-slate-300 break-words">
                      {item.name}
                    </td>
                    <td className="py-1.5 px-1 text-center border-r border-slate-300 tabular-nums">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 px-1 text-center border-r border-slate-300">
                      {item.unit || 'ชิ้น'}
                    </td>
                    <td className="py-1.5 px-1.5 text-right border-r border-slate-300 tabular-nums">
                      {formatMoneyPlain(item.price, 2)}
                    </td>
                    <td className="py-1.5 px-1.5 text-right text-slate-950 tabular-nums">
                      {formatMoneyPlain(item.total, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. Totals & Notes Section */}
          <div className="a5-totals-box grid grid-cols-12 gap-2.5 a5-keep-together">
            <div className="col-span-7 flex flex-col justify-between gap-1">
              <div className="text-slate-900 font-normal break-words">
                <span className="font-bold text-slate-950">หมายเหตุ: </span>
                <span>
                  {sale.notes || 'ตรวจนับสินค้าถูกต้องเรียบร้อย'}
                  {isSplitSheet ? ` | ยอดรวมทั้งบิล ${formatMoneyPlain(sale.totalAmount, 2)} บาท` : ''}
                </span>
              </div>
              <div className="p-1.5 bg-slate-100 border border-slate-400 text-center font-bold text-slate-950">
                ตัวอักษร: ( {bahtText(displayTotal)} )
              </div>
            </div>

            <div className="col-span-5 border border-slate-500 p-2 bg-slate-50 space-y-0.5 tabular-nums font-normal">
              <div className="flex justify-between text-slate-900">
                <span>{isSplitSheet ? 'รวมใบนี้' : 'รวมเป็นเงิน'}</span>
                <span>{formatMoneyPlain(displaySubtotal, 2)}</span>
              </div>
              {displayDiscount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>ส่วนลด</span>
                  <span>-{formatMoneyPlain(displayDiscount, 2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline font-bold text-[10pt] text-slate-950 pt-1 border-t-2 border-slate-800">
                <span>{docType === 'quotation' ? 'ราคาประเมิน (บาท)' : isSplitSheet ? 'รวมใบนี้ (บาท)' : 'รวมสุทธิ (บาท)'}</span>
                <span className="text-[10.5pt]">{formatMoneyPlain(displayTotal, 2)}</span>
              </div>
              {!isSplitSheet && sale.paymentMethod === 'cash' && (
                <div className="flex justify-between text-[9pt] text-slate-800 pt-0.5 border-t border-slate-300">
                  <span>รับ: {formatMoneyPlain(sale.amountReceived || sale.totalAmount, 2)}</span>
                  <span>ทอน: {formatMoneyPlain(sale.change || 0, 2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 6. Warranty Terms (Concise & Readable) */}
          <div className="a5-section-box bg-slate-50/70 space-y-0.5 font-normal text-slate-900 a5-keep-together">
            <p className="font-bold text-slate-950 border-b border-slate-300 pb-0.5">
              เงื่อนไขการรับประกัน:
            </p>
            <p>1. การรับประกันมีผลเมื่อนำเอกสารฉบับนี้มายืนยันกับทางร้านเท่านั้น</p>
            <p>2. หากสินค้าถูกแก้ไขหรือซ่อมจากภายนอก การรับประกันสิ้นสุดทันที</p>
            <p>3. ไม่รับประกันกรณีมีการใช้งานผิดประเภท ตกหล่น หรือโดนความชื้น</p>
          </div>
        </div>

        {/* ================= BOTTOM SECTION: ENLARGED SIGNATURES + CLEAN STUB (NEVER SHRINKS) ================= */}
        <div ref={bottomRef} className="a5-bottom-content a5-keep-together">
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
          <div className="pt-1.5 border-t-2 border-dashed border-slate-500">
            <div className="border border-slate-500 px-3 py-1.5 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="text-[9.5pt] font-bold text-slate-950">
                  เลขที่เอกสาร: <span className="font-mono">{chunk.sheetDocNo}</span>
                </div>
                <div className="text-[9.5pt] font-bold text-slate-950 truncate">
                  ชื่อลูกค้า: {posCustomerLabel}
                </div>
              </div>
              <div className="shrink-0 bg-white px-1">
                <Barcode
                  value={chunk.sheetDocNo}
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
};

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

  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitRowLimit, setSplitRowLimit] = useState(7);
  const [singleOverflowInfo, setSingleOverflowInfo] = useState<{
    isOverflowing: boolean;
    measuredMm: number;
    fitLevel: number;
  }>({ isOverflowing: false, measuredMm: 0, fitLevel: 0 });
  const [splitOverflows, setSplitOverflows] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setIsSplitMode(false);
    setSplitRowLimit(7);
    setSingleOverflowInfo({ isOverflowing: false, measuredMm: 0, fitLevel: 0 });
    setSplitOverflows({});

    if (sale) {
      if (sale.paymentMethod === 'gov_credit') {
        setPaperSize('a5');
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

  useEffect(() => {
    setIsSplitMode(false);
    setSplitRowLimit(7);
    setSplitOverflows({});
  }, [docType]);

  useEffect(() => {
    if (!isSplitMode) return;
    const anySplitOverflow = Object.values(splitOverflows).some(Boolean);
    if (anySplitOverflow && splitRowLimit > 1) {
      setSplitOverflows({});
      setSplitRowLimit(prev => Math.max(1, prev - 1));
    }
  }, [isSplitMode, splitOverflows, splitRowLimit]);

  const isGovCredit = sale?.paymentMethod === 'gov_credit';

  const activePosTitle = isGovCredit
    ? docType === 'quotation'
      ? 'ใบเสนอราคา'
      : docType === 'receipt'
      ? 'ใบเสร็จรับเงิน'
      : 'ใบส่งของ'
    : 'ใบเสร็จรับเงิน';

  const activePosDocNo = sale
    ? isGovCredit && docType === 'quotation'
      ? `QT-${sale.receiptNumber.replace(/^POS-/i, '')}`
      : isGovCredit && docType === 'invoice'
      ? `INV-${sale.receiptNumber.replace(/^POS-/i, '')}`
      : sale.receiptNumber
    : '';

  const sheetChunks: POSSheetChunk[] = useMemo(() => {
    if (!sale) return [];
    if (!isSplitMode) {
      return [
        {
          sheetDocNo: activePosDocNo,
          sheetIndex: 0,
          totalSheets: 1,
          items: sale.items,
          sheetSubtotal: sale.subtotal
        }
      ];
    }

    const groups: POSCartItem[][] = [];
    const perPage = Math.max(1, splitRowLimit);
    for (let i = 0; i < sale.items.length; i += perPage) {
      groups.push(sale.items.slice(i, i + perPage));
    }

    return groups.map((items, idx) => ({
      sheetDocNo: `${activePosDocNo}-${idx + 1}`,
      sheetIndex: idx,
      totalSheets: groups.length,
      items,
      sheetSubtotal: items.reduce((sum, item) => sum + Number(item.total || 0), 0)
    }));
  }, [sale, isSplitMode, activePosDocNo, splitRowLimit]);

  const handleSingleFitReport = useCallback(
    (_sheetIndex: number, isOverflowing: boolean, measuredMm: number, fitLevel: number) => {
      setSingleOverflowInfo({ isOverflowing, measuredMm, fitLevel });
    },
    []
  );

  const handleSplitFitReport = useCallback(
    (sheetIndex: number, isOverflowing: boolean) => {
      setSplitOverflows(prev => {
        if (prev[sheetIndex] === isOverflowing) return prev;
        return { ...prev, [sheetIndex]: isOverflowing };
      });
    },
    []
  );

  if (!isOpen || !sale) return null;

  const isPrintBlocked = paperSize === 'a5' && !isSplitMode && singleOverflowInfo.isOverflowing;

  const handlePrint = () => {
    if (isPrintBlocked) return;
    printWithCleanTitle(`${activePosTitle}-${activePosDocNo}`);
  };

  const formattedDate = formatThaiDateFull(sale.createdAt);
  const govDueDateThai = sale.govCreditInfo?.dueDate ? formatThaiDateFull(sale.govCreditInfo.dueDate) : '';
  const posCustomerLabel = sale.govCreditInfo?.agencyName || sale.customerName || 'ลูกค้าทั่วไป';

  const paymentMethodLabelMap: Record<string, string> = {
    cash: 'เงินสด',
    transfer: 'โอนเงินพร้อมเพย์',
    credit: 'บัตรเครดิต',
    gov_credit: 'เครดิตราชการ'
  };
  const activePaymentLabel = paymentMethodLabelMap[sale.paymentMethod] || sale.paymentMethod;

  const resetDeps = [
    sale.id,
    docType,
    paperSize,
    sale.items.length,
    showPromptPayQr,
    promptPayQrUrl,
    sale.notes
  ];

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
                A5 แนวตั้ง (148 × 210 มม.)
              </button>
            </div>

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
            <div className="flex flex-col items-center w-full print:block">
              {!isSplitMode && singleOverflowInfo.isOverflowing ? (
                <div
                  role="alert"
                  className="mb-3 w-full max-w-[148mm] p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-500 text-rose-950 dark:text-rose-100 shadow-lg space-y-2.5 print:hidden"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-sm text-rose-700 dark:text-rose-300">
                        รายการเยอะเกินไปสำหรับ A5 หน้าเดียว
                      </p>
                      <p className="text-rose-800 dark:text-rose-200">
                        เนื้อหาสูงจริง {singleOverflowInfo.measuredMm} มม. (เกินพื้นที่ A5 198.5 มม. แม้ปรับระยะห่างและลดฟอนต์เป็น 9pt แล้ว)
                        กรุณาเลือกแยกเป็นหลายใบ หรือปิดเพื่อกลับไปแก้ไขรายการ
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsSplitMode(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>แยกเป็นหลายใบ ({activePosDocNo}-1, -2, ...)</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200 hover:bg-rose-100 font-bold text-xs cursor-pointer"
                    >
                      กลับไปแก้รายการ
                    </button>
                  </div>
                </div>
              ) : isSplitMode ? (
                <div className="mb-3 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center gap-2 print:hidden">
                  <Layers className="w-3.5 h-3.5" />
                  <span>โหมดแยกพิมพ์ {sheetChunks.length} ใบ A5 ({activePosDocNo}-1 ถึง -{sheetChunks.length}) • ทุกใบมีช่องเซ็นครบ</span>
                  <button
                    type="button"
                    onClick={() => setIsSplitMode(false)}
                    className="underline ml-1 text-blue-700 dark:text-blue-300 cursor-pointer"
                  >
                    ดูแบบรวมใบเดียว
                  </button>
                </div>
              ) : (
                <div className="mb-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold print:hidden">
                  ตัวอย่าง A5 หน้าเดียว (148 × 210 มม. | พอดี 1 หน้า • ความสูงจริง {singleOverflowInfo.measuredMm || '-'} / 198.5 มม. • ระดับย่อ {singleOverflowInfo.fitLevel}/4)
                </div>
              )}

              <div className={isSplitMode ? 'a5-split-stack flex flex-col items-center gap-6 w-full print:block' : 'w-full flex flex-col items-center print:block'}>
                {sheetChunks.map(chunk => (
                  <A5POSSheet
                    key={`${chunk.sheetDocNo}-${chunk.sheetIndex}`}
                    sale={sale}
                    shopSettings={shopSettings}
                    docType={docType}
                    activePosTitle={activePosTitle}
                    chunk={chunk}
                    isSplitSheet={isSplitMode}
                    isGovCredit={!!isGovCredit}
                    posCustomerLabel={posCustomerLabel}
                    formattedDate={formattedDate}
                    govDueDateThai={govDueDateThai}
                    paymentMethodLabel={activePaymentLabel}
                    showPromptPayQr={showPromptPayQr}
                    promptPayQrUrl={promptPayQrUrl}
                    resetDeps={resetDeps}
                    onFitReport={isSplitMode ? handleSplitFitReport : handleSingleFitReport}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* ================= 80MM THERMAL SLIP FORMAT (NO '฿' SYMBOL, THAI FULL DATE) ================= */
            <div
              ref={printContentRef}
              id="pos-receipt-print-area"
              className="bg-white text-slate-950 shadow-xl border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 w-full max-w-[350px] p-4 rounded-xl text-[9pt] leading-[1.55]"
            >
              <div className="slip-doc-header text-center space-y-1 border-b border-dashed border-slate-400 pb-2">
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
              ยอดชำระ ฿{sale.totalAmount.toLocaleString()} ({activePaymentLabel})
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
              disabled={isPrintBlocked}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${
                isPrintBlocked
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 active:scale-95 cursor-pointer'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{isSplitMode ? `สั่งพิมพ์ทั้งหมด (${sheetChunks.length} ใบ)` : 'สั่งพิมพ์เอกสาร'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
