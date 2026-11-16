import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  RepairTicket,
  RepairDeviceItem,
  ShopSettings,
  DEVICE_LABELS,
  RepairDocumentType
} from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { bahtText } from '../utils/bahtText';
import {
  formatThaiDateFull,
  formatTodayThaiFull,
  formatMoneyPlain,
  printWithCleanTitle
} from '../utils/printHelpers';
import { getTicketDevices, getTicketAllParts } from '../utils/ticketDevices';
import { useA5FitToPage } from '../utils/useA5FitToPage';
import {
  X,
  Printer,
  QrCode,
  CheckCircle,
  Copy,
  ExternalLink,
  FileText,
  FileCheck,
  Receipt,
  ClipboardList,
  PackageCheck,
  AlertTriangle,
  Layers,
  Edit3
} from 'lucide-react';
import { Barcode } from './Barcode';

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: RepairTicket | null;
  shopSettings: ShopSettings;
  initialDocType?: RepairDocumentType;
  onEditTicket?: (ticket: RepairTicket) => void;
}

interface PrintLineItem {
  description: string;
  subDescription?: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface A5SheetChunk {
  sheetDocNo: string;
  sheetIndex: number;
  totalSheets: number;
  devicesSlice: RepairDeviceItem[];
  rows: PrintLineItem[];
  sheetSubtotal: number;
}

interface A5RepairSheetProps {
  ticket: RepairTicket;
  shopSettings: ShopSettings;
  docType: RepairDocumentType;
  docTitle: string;
  chunk: A5SheetChunk;
  isMultiDeviceTicket: boolean;
  isSplitSheet: boolean;
  grandSubtotal: number;
  grandDiscount: number;
  grandTotal: number;
  receivedThaiFull: string;
  deliveredThaiFull: string;
  todayThaiFull: string;
  warrantyExpiryThaiFull: string;
  dueDateThaiFull: string;
  qrCodeDataUrl: string;
  promptPayQrUrl: string;
  resetDeps: unknown[];
  onFitReport?: (sheetIndex: number, isOverflowing: boolean, measuredMm: number, fitLevel: number) => void;
}

const A5RepairSheet: React.FC<A5RepairSheetProps> = ({
  ticket,
  shopSettings,
  docType,
  docTitle,
  chunk,
  isMultiDeviceTicket,
  isSplitSheet,
  grandSubtotal,
  grandDiscount,
  grandTotal,
  receivedThaiFull,
  deliveredThaiFull,
  todayThaiFull,
  warrantyExpiryThaiFull,
  dueDateThaiFull,
  qrCodeDataUrl,
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
    [...resetDeps, chunk.sheetDocNo, chunk.rows.length]
  );

  useEffect(() => {
    onFitReport?.(chunk.sheetIndex, isOverflowing, measuredContentMm, fitLevel);
  }, [chunk.sheetIndex, isOverflowing, measuredContentMm, fitLevel, onFitReport]);

  const isGovCredit = ticket.paymentMethod === 'gov_credit';
  const warrantyDays = ticket.warrantyDays ?? 30;
  const condenseLines = fitLevel >= 4;

  const displaySubtotal = isSplitSheet ? chunk.sheetSubtotal : grandSubtotal;
  const displayDiscount = isSplitSheet ? 0 : grandDiscount;
  const displayTotal = isSplitSheet ? chunk.sheetSubtotal : grandTotal;
  const totalInBahtText = bahtText(displayTotal || 0);

  return (
    <div className="flex flex-col items-center w-full print:block">
      {isSplitSheet && (
        <div className="mb-1.5 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold print:hidden">
          ใบที่ {chunk.sheetIndex + 1} / {chunk.totalSheets} — เลขที่ {chunk.sheetDocNo}
        </div>
      )}

      <div
        ref={paperRef}
        id={chunk.sheetIndex === 0 ? 'printable-receipt-a5' : `printable-receipt-a5-${chunk.sheetIndex + 1}`}
        data-fit-level={fitLevel}
        data-overflowing={isOverflowing ? 'true' : 'false'}
        data-measured-mm={measuredContentMm}
        className={`a5-portrait-paper a5-fit-${fitLevel} shadow-2xl ring-1 ring-slate-300 print:ring-0 mx-auto flex flex-col justify-between`}
      >
        {/* ================= TOP + MIDDLE CONTENT ================= */}
        <div ref={topRef} className="a5-top-content">
          {/* 1. HEADER: Shop Info Left | Doc Number & Thai Date Right (NEVER shrinks, NO top line) */}
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
                {shopSettings.taxId && (
                  <p className="text-[9pt] font-normal text-slate-800">
                    เลขประจำตัวผู้เสียภาษี: {shopSettings.taxId}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right shrink-0 space-y-0.5 leading-[1.45] whitespace-nowrap">
              <div className="text-[9pt] text-slate-900 font-normal">
                เลขที่ <span className="font-mono text-[9.5pt] font-bold text-slate-950">{chunk.sheetDocNo}</span>
              </div>
              {isSplitSheet && (
                <div className="text-[9pt] font-bold text-slate-900">
                  แผ่นที่ {chunk.sheetIndex + 1}/{chunk.totalSheets}
                </div>
              )}
              {docType === 'delivery_note' && (
                <div className="text-[9pt] font-normal text-slate-800">
                  อ้างอิง: <span className="font-mono">{ticket.ticketNumber}</span>
                </div>
              )}
              <div className="text-[9pt] font-normal text-slate-900">
                {docType === 'delivery_note' ? `ส่งมอบ: ${deliveredThaiFull}` : `วันที่: ${todayThaiFull}`}
              </div>
              {docType !== 'delivery_note' && ticket.receivedDate && (
                <div className="text-[9pt] font-normal text-slate-800">
                  วันที่รับ: {receivedThaiFull}
                </div>
              )}
            </div>
          </div>

          {/* 2. DOCUMENT TITLE BANNER (NO TOP BORDER, BOTTOM LINE ONLY) */}
          <div className="a5-doc-banner a5-keep-together">
            <h2 className="text-[10.5pt] font-bold tracking-wide text-slate-950">
              {docTitle}
              {isSplitSheet ? ` (ใบย่อย ${chunk.sheetIndex + 1}/${chunk.totalSheets})` : ''}
            </h2>
          </div>

          {/* 3. CUSTOMER + PAYMENT / PROMPTPAY QR BOX */}
          <div className="a5-info-box grid grid-cols-12 border border-slate-500 a5-keep-together">
            {/* Left: Customer Info (6 cols) */}
            <div className="a5-info-box-cell col-span-6 p-2 border-r border-slate-400 space-y-0.5 min-w-0">
              <div className="break-words">
                <span className="font-bold text-slate-950">ลูกค้า: </span>
                <span className="font-bold text-slate-950">{ticket.customerName}</span>
              </div>
              {ticket.customerAddress && (
                <div className="break-words font-normal text-slate-900">
                  <span>ที่อยู่: </span>
                  <span>{ticket.customerAddress}</span>
                </div>
              )}
              <div className="font-normal text-slate-900">
                <span>โทร: </span>
                <span>{ticket.customerPhone}</span>
                {isGovCredit && ticket.govCreditInfo?.taxId && (
                  <span> | เลขภาษี: <span className="font-mono">{ticket.govCreditInfo.taxId}</span></span>
                )}
              </div>
              {dueDateThaiFull && (
                <div className="font-normal text-slate-900">
                  <span>ครบกำหนด: </span>
                  <span>{dueDateThaiFull}</span>
                </div>
              )}
              {isMultiDeviceTicket && fitLevel < 3 && (
                <div className="pt-0.5 mt-0.5 border-t border-slate-300 font-normal text-slate-900">
                  <span className="font-bold text-slate-950">อุปกรณ์ในใบนี้: </span>
                  <span>{chunk.devicesSlice.length} เครื่อง</span>
                </div>
              )}
            </div>

            {/* Right: Payment Channel & PromptPay QR (6 cols; QR NEVER shrinks) */}
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
                <p className="font-bold text-slate-950 pt-0.5">
                  {ticket.isPaid ? 'ชำระเงินแล้ว' : isGovCredit ? 'เครดิตราชการ' : 'รอชำระเงิน'}
                </p>
              </div>

              {promptPayQrUrl && (
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

            {/* Single-device summary spans full 136mm width below Customer+QR so long text takes half the vertical height */}
            {!isMultiDeviceTicket && chunk.devicesSlice[0] && (
              <div className="a5-info-box-cell col-span-12 px-2 py-1.5 border-t border-slate-400 space-y-0.5 font-normal text-slate-900 min-w-0">
                <div className="break-words">
                  <span className="font-bold text-slate-950">อุปกรณ์: </span>
                  <span>
                    {DEVICE_LABELS[chunk.devicesSlice[0].deviceType]?.label || chunk.devicesSlice[0].deviceType}{' '}
                    {chunk.devicesSlice[0].brand} {chunk.devicesSlice[0].model}
                    {chunk.devicesSlice[0].serialNumber ? ` (S/N: ${chunk.devicesSlice[0].serialNumber})` : ''}
                  </span>
                  {chunk.devicesSlice[0].accessories && chunk.devicesSlice[0].accessories.length > 0 && (
                    <span> | ติดมาด้วย: {chunk.devicesSlice[0].accessories.join(', ')}</span>
                  )}
                </div>
                <div className="break-words">
                  <span className="font-bold text-slate-950">
                    {docType === 'delivery_note' ? 'สรุปการซ่อม: ' : 'อาการเสีย: '}
                  </span>
                  <span>
                    {docType === 'delivery_note'
                      ? chunk.devicesSlice[0].technicianNotes || chunk.devicesSlice[0].problemDescription
                      : chunk.devicesSlice[0].problemDescription}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. SINGLE UNIFIED ITEMS & AMOUNT TABLE (All devices + parts combined cleanly) */}
          <div className="a5-items-table border border-slate-500">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-200 text-slate-950 font-bold border-b border-slate-500">
                <tr>
                  <th className="py-1.5 px-1 w-[7%] text-center border-r border-slate-400">ที่</th>
                  <th className="py-1.5 px-2 w-[45%] border-r border-slate-400">รายการ</th>
                  <th className="py-1.5 px-1 w-[10%] text-center border-r border-slate-400">จำนวน</th>
                  <th className="py-1.5 px-1 w-[10%] text-center border-r border-slate-400">หน่วย</th>
                  <th className="py-1.5 px-1.5 w-[14%] text-right border-r border-slate-400">ราคา</th>
                  <th className="py-1.5 px-1.5 w-[14%] text-right">รวม (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-normal text-slate-900">
                {chunk.rows.map((row, idx) => (
                  <tr key={idx} className="a5-keep-together">
                    <td className="py-1.5 px-1 text-center border-r border-slate-300 align-top">{idx + 1}</td>
                    <td className="py-1.5 px-2 border-r border-slate-300 break-words align-top">
                      <div className={`font-medium text-slate-950 ${condenseLines ? 'truncate' : ''}`}>{row.description}</div>
                      {row.subDescription && (
                        <div className={`text-slate-700 ${condenseLines ? 'truncate' : 'break-words'}`}>
                          {row.subDescription}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-1 text-center border-r border-slate-300 tabular-nums align-top">
                      {row.qty}
                    </td>
                    <td className="py-1.5 px-1 text-center border-r border-slate-300 align-top">
                      {row.unit}
                    </td>
                    <td className="py-1.5 px-1.5 text-right border-r border-slate-300 tabular-nums align-top">
                      {formatMoneyPlain(row.unitPrice, 2)}
                    </td>
                    <td className="py-1.5 px-1.5 text-right text-slate-950 tabular-nums align-top">
                      {formatMoneyPlain(row.total, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. TOTALS & REMARKS (NO '฿' SYMBOL) */}
          <div className="a5-totals-box grid grid-cols-12 gap-2.5 a5-keep-together">
            <div className="col-span-7 flex flex-col justify-between gap-1">
              <div className="text-slate-900 font-normal break-words">
                <span className="font-bold text-slate-950">หมายเหตุ: </span>
                <span>
                  {ticket.technicianNotes || 'ตรวจเช็คและซ่อมบำรุงตามมาตรฐาน'}
                  {isSplitSheet ? ` | ยอดรวมทั้งเอกสาร ${formatMoneyPlain(grandTotal, 2)} บาท` : ''}
                </span>
              </div>
              <div className="p-1.5 bg-slate-100 border border-slate-400 text-center font-bold text-slate-950">
                ตัวอักษร: ( {totalInBahtText} )
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
                <span>
                  {docType === 'quotation' || docType === 'work_order'
                    ? isSplitSheet
                      ? 'ราคาประเมินใบนี้'
                      : 'ราคาประเมิน (บาท)'
                    : isSplitSheet
                    ? 'ยอดสุทธิใบนี้'
                    : 'ยอดสุทธิ (บาท)'}
                </span>
                <span className="text-[10.5pt]">{formatMoneyPlain(displayTotal, 2)}</span>
              </div>
            </div>
          </div>

          {/* 6. WARRANTY TERMS & TRACKING QR CODE (QR NEVER shrinks) */}
          <div className="a5-section-box bg-slate-50/70 flex items-center justify-between gap-2.5 a5-keep-together">
            <div className="flex-1 space-y-0.5 min-w-0 font-normal text-slate-900">
              <div className="flex items-center justify-between gap-2 border-b border-slate-300 pb-0.5 flex-wrap">
                <span className="font-bold text-slate-950">เงื่อนไขการรับประกัน:</span>
                <span>
                  {warrantyDays > 0
                    ? `รับประกัน ${warrantyDays} วัน${warrantyExpiryThaiFull ? ` (ถึง ${warrantyExpiryThaiFull})` : ''}`
                    : 'ไม่มีการรับประกัน'}
                </span>
              </div>
              <p>1. การรับประกันมีผลเมื่อนำเอกสารฉบับนี้มายืนยันกับทางร้านเท่านั้น</p>
              <p>2. หากเครื่องถูกซ่อมหรือแก้ไขจากภายนอก การรับประกันสิ้นสุดทันที</p>
              <p>3. ไม่รับประกันกรณีใช้งานผิดประเภท ตกหล่น หรือโดนความชื้น</p>
            </div>

            {qrCodeDataUrl && (
              <div className="shrink-0 flex flex-col items-center pl-2.5 border-l border-slate-400">
                <div className="w-[19mm] h-[19mm] p-0.5 bg-white border border-slate-400 flex items-center justify-center">
                  <img
                    src={qrCodeDataUrl}
                    alt="Tracking QR"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[9pt] text-slate-950 font-normal mt-0.5 whitespace-nowrap">
                  เช็คสถานะซ่อม
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ================= BOTTOM SECTION: ENLARGED SIGNATURES + CLEAN STUB (NEVER SHRINKS) ================= */}
        <div ref={bottomRef} className="a5-bottom-content a5-keep-together">
          {docType === 'quotation' ? (
            <div className="grid grid-cols-2 gap-3 text-center text-[9pt]">
              <div className="a5-sign-box">
                <p className="font-bold text-slate-950">ผู้เสนอราคา</p>
                <div className="flex-1" />
                <p className="font-bold text-slate-950">( ร้านพัทลุงปริ้นเตอร์ )</p>
              </div>
              <div className="a5-sign-box">
                <p className="font-bold text-slate-950">ผู้อนุมัติ / ลูกค้า</p>
                <div className="flex-1" />
                <p className="font-bold text-slate-950">( {ticket.customerName} )</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-center text-[9pt]">
              <div className="a5-sign-box">
                <p className="font-bold text-slate-950">
                  {docType === 'delivery_note' ? 'ผู้รับมอบสินค้า / ลูกค้า' : 'ผู้รับสินค้า / ลูกค้า'}
                </p>
                <div className="flex-1" />
                <p className="font-bold text-slate-950">( {ticket.customerName} )</p>
              </div>

              <div className="a5-sign-box">
                <p className="font-bold text-slate-950">
                  {docType === 'delivery_note' ? 'ผู้ส่งมอบสินค้า' : 'ผู้รับเงิน / ช่างผู้รับผิดชอบ'}
                </p>
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
                  ชื่อลูกค้า: {ticket.customerName}
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

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  isOpen,
  onClose,
  ticket,
  shopSettings,
  initialDocType,
  onEditTicket
}) => {
  const [printFormat, setPrintFormat] = useState<'a5' | 'slip'>('a5');
  const [docType, setDocType] = useState<RepairDocumentType>('work_order');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Split-mode states when content exceeds 1 A5 page even after fit level 4
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitRowBudget, setSplitRowBudget] = useState(3);
  const [singleOverflowInfo, setSingleOverflowInfo] = useState<{
    isOverflowing: boolean;
    measuredMm: number;
    fitLevel: number;
  }>({ isOverflowing: false, measuredMm: 0, fitLevel: 0 });
  const [splitOverflows, setSplitOverflows] = useState<Record<number, boolean>>({});

  // Set default document type & reset split states when ticket changes
  useEffect(() => {
    setIsSplitMode(false);
    setSplitRowBudget(3);
    setSingleOverflowInfo({ isOverflowing: false, measuredMm: 0, fitLevel: 0 });
    setSplitOverflows({});

    if (ticket) {
      if (initialDocType) {
        setDocType(initialDocType);
      } else if (ticket.paymentMethod === 'gov_credit') {
        if (ticket.status === 'pending' || ticket.status === 'diagnosing') {
          setDocType('quotation');
        } else if (ticket.govCreditInfo?.billingStatus === 'paid' || ticket.isPaid) {
          setDocType('receipt');
        } else {
          setDocType('invoice');
        }
      } else if (ticket.status === 'completed' && ticket.isPaid) {
        setDocType('receipt');
      } else if (ticket.status === 'repaired' || ticket.status === 'ready_pickup') {
        setDocType('delivery_note');
      } else {
        setDocType('work_order');
      }

      const trackingUrl = `${window.location.origin}/?track=${encodeURIComponent(ticket.ticketNumber)}`;
      QRCode.toDataURL(
        trackingUrl,
        {
          width: 180,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        },
        (err, url) => {
          if (!err && url) setQrCodeDataUrl(url);
        }
      );

      const ppTarget = shopSettings.promptPayId || shopSettings.shopPhone || '0834268058';
      generatePromptPayQRDataUrl(ppTarget, ticket.totalAmount, { width: 180 })
        .then(url => setPromptPayQrUrl(url))
        .catch(err => console.error('PromptPay QR generate error:', err));
    }
  }, [ticket, shopSettings, initialDocType]);

  // Reset split mode if user switches docType
  useEffect(() => {
    setIsSplitMode(false);
    setSplitRowBudget(3);
    setSplitOverflows({});
  }, [docType]);

  // Auto-reduce splitRowBudget if any split sheet still overflows at its current chunk size
  useEffect(() => {
    if (!isSplitMode) return;
    const anySplitOverflow = Object.values(splitOverflows).some(Boolean);
    if (anySplitOverflow && splitRowBudget > 1) {
      setSplitOverflows({});
      setSplitRowBudget(prev => Math.max(1, prev - 1));
    }
  }, [isSplitMode, splitOverflows, splitRowBudget]);

  const devices = useMemo(() => (ticket ? getTicketDevices(ticket) : []), [ticket]);
  const allParts = useMemo(() => (ticket ? getTicketAllParts(ticket) : []), [ticket]);
  const isMultiDevice = devices.length > 1;

  const docSeq = ticket ? ticket.ticketNumber.replace(/^(REP|POS)-/i, '') : '';
  const documentNumbers: Record<RepairDocumentType, string> = {
    quotation: `QT-${docSeq}`,
    invoice: `INV-${docSeq}`,
    receipt: `REC-${docSeq}`,
    work_order: ticket?.ticketNumber || '',
    delivery_note: `DN-${docSeq}`
  };

  const documentTitles: Record<RepairDocumentType, { th: string; subtitle: string }> = {
    quotation: {
      th: 'ใบเสนอราคา',
      subtitle: 'เอกสารเสนอราคาเพื่อขออนุมัติงบประมาณก่อนดำเนินการซ่อม'
    },
    invoice: {
      th: 'ใบแจ้งหนี้',
      subtitle: 'เอกสารส่งมอบงานและเรียกเก็บเงิน'
    },
    receipt: {
      th: 'ใบเสร็จรับเงิน',
      subtitle: 'หลักฐานการรับชำระเงินและส่งมอบงานซ่อม'
    },
    work_order: {
      th: 'ใบรับเครื่องซ่อม',
      subtitle: 'หลักฐานการรับเครื่องเพื่อตรวจเช็คและซ่อมบำรุง'
    },
    delivery_note: {
      th: 'ใบส่งมอบของ',
      subtitle: 'ใบส่งมอบเครื่องคืนลูกค้าและรับรองงานซ่อม'
    }
  };

  const currentDoc = documentTitles[docType];
  const activeDocNo = documentNumbers[docType];

  // Build rows for a device or whole ticket (single unified table for multi-device!)
  const buildDeviceRows = useCallback(
    (dev: RepairDeviceItem, idxInTicket: number): PrintLineItem[] => {
      const rows: PrintLineItem[] = [];
      const devLabel = DEVICE_LABELS[dev.deviceType]?.label || dev.deviceType;
      const symptomText =
        docType === 'delivery_note'
          ? dev.technicianNotes || dev.problemDescription
          : dev.problemDescription;
      const accText =
        dev.accessories && dev.accessories.length > 0
          ? ` | ติดมา: ${dev.accessories.join(', ')}`
          : '';
      const snText = dev.serialNumber ? ` (${dev.serialNumber})` : '';

      if (dev.laborCost > 0 || dev.partsUsed.length === 0) {
        rows.push({
          description: `${idxInTicket + 1}. ${dev.brand} ${dev.model}${snText}`,
          subDescription: `${docType === 'delivery_note' ? 'ผลซ่อม' : 'อาการ'}: ${symptomText}${accText}`,
          qty: 1,
          unit: 'เครื่อง',
          unitPrice: dev.laborCost || 0,
          total: dev.laborCost || 0
        });
      }

      dev.partsUsed.forEach((part, pIdx) => {
        rows.push({
          description: `${idxInTicket + 1}. อะไหล่: ${part.itemName}`,
          subDescription:
            pIdx === 0 && dev.laborCost <= 0
              ? `${devLabel} ${dev.brand} ${dev.model} | ${symptomText}${accText}`
              : undefined,
          qty: Number(part.quantity || 1),
          unit: 'ชิ้น',
          unitPrice: Number(part.unitPrice || 0),
          total: Number(part.totalPrice || 0)
        });
      });

      return rows;
    },
    [docType]
  );

  const allLineItems: PrintLineItem[] = useMemo(() => {
    if (!ticket) return [];
    if (isMultiDevice) {
      return devices.flatMap((dev, idx) => buildDeviceRows(dev, idx));
    }
    const rows: PrintLineItem[] = [
      {
        description:
          docType === 'delivery_note'
            ? `ค่าบริการซ่อมและตรวจเช็ค (${devices[0]?.brand || ticket.brand} ${devices[0]?.model || ticket.model})`
            : 'ค่าบริการตรวจเช็คและค่าแรงซ่อมบำรุง',
        qty: 1,
        unit: 'งาน',
        unitPrice: ticket.laborCost || 0,
        total: ticket.laborCost || 0
      }
    ];
    allParts.forEach(part => {
      rows.push({
        description: part.itemName,
        qty: Number(part.quantity || 1),
        unit: 'ชิ้น',
        unitPrice: Number(part.unitPrice || 0),
        total: Number(part.totalPrice || 0)
      });
    });
    return rows;
  }, [ticket, isMultiDevice, devices, buildDeviceRows, docType, allParts]);

  // Build either 1 unified sheet or split chunks (-1, -2, ...)
  const sheetChunks: A5SheetChunk[] = useMemo(() => {
    if (!ticket) return [];

    if (!isSplitMode) {
      const subtotal = allLineItems.reduce((sum, r) => sum + r.total, 0);
      return [
        {
          sheetDocNo: activeDocNo,
          sheetIndex: 0,
          totalSheets: 1,
          devicesSlice: devices,
          rows: allLineItems,
          sheetSubtotal: subtotal
        }
      ];
    }

    if (isMultiDevice) {
      // Split cleanly by devices, respecting splitRowBudget weight per sheet
      const groups: { devicesSlice: RepairDeviceItem[]; rows: PrintLineItem[] }[] = [];
      let curDevices: RepairDeviceItem[] = [];
      let curRows: PrintLineItem[] = [];
      let curWeight = 0;

      devices.forEach((dev, idx) => {
        const devRows = buildDeviceRows(dev, idx);
        const textExtra = Math.floor(
          ((dev.problemDescription?.length || 0) + (dev.accessories?.join(', ').length || 0)) / 90
        );
        const devWeight = devRows.length + Math.min(2, textExtra);

        if (curDevices.length > 0 && curWeight + devWeight > splitRowBudget) {
          groups.push({ devicesSlice: curDevices, rows: curRows });
          curDevices = [dev];
          curRows = devRows;
          curWeight = devWeight;
        } else {
          curDevices.push(dev);
          curRows.push(...devRows);
          curWeight += devWeight;
        }
      });
      if (curDevices.length > 0) {
        groups.push({ devicesSlice: curDevices, rows: curRows });
      }

      return groups.map((g, i) => ({
        sheetDocNo: `${activeDocNo}-${i + 1}`,
        sheetIndex: i,
        totalSheets: groups.length,
        devicesSlice: g.devicesSlice,
        rows: g.rows,
        sheetSubtotal: g.rows.reduce((sum, r) => sum + r.total, 0)
      }));
    }

    // Single device with too many line items -> split by line items
    const rowGroups: PrintLineItem[][] = [];
    const perPage = Math.max(1, splitRowBudget);
    for (let i = 0; i < allLineItems.length; i += perPage) {
      rowGroups.push(allLineItems.slice(i, i + perPage));
    }
    return rowGroups.map((rows, i) => ({
      sheetDocNo: `${activeDocNo}-${i + 1}`,
      sheetIndex: i,
      totalSheets: rowGroups.length,
      devicesSlice: devices,
      rows,
      sheetSubtotal: rows.reduce((sum, r) => sum + r.total, 0)
    }));
  }, [ticket, isSplitMode, allLineItems, activeDocNo, devices, isMultiDevice, buildDeviceRows, splitRowBudget]);

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

  if (!isOpen || !ticket) return null;

  const trackingUrl = `${window.location.origin}/?track=${encodeURIComponent(ticket.ticketNumber)}`;
  const todayThaiFull = formatTodayThaiFull();
  const receivedThaiFull = formatThaiDateFull(ticket.receivedDate || ticket.createdAt, todayThaiFull);
  const deliveredThaiFull = formatThaiDateFull(ticket.deliveredDate || new Date(), todayThaiFull);
  const warrantyExpiryThaiFull = ticket.warrantyExpiryDate
    ? formatThaiDateFull(ticket.warrantyExpiryDate, '')
    : '';
  const dueDateThaiFull = ticket.govCreditInfo?.dueDate
    ? formatThaiDateFull(ticket.govCreditInfo.dueDate, '')
    : '';

  const subtotalBeforeDiscount = (ticket.laborCost || 0) + (ticket.partsCost || 0);
  const discountValue = Number(ticket.discount || 0);
  const totalAmountValue = Number(ticket.totalAmount || 0);
  const warrantyDays = ticket.warrantyDays ?? 30;

  const isPrintBlocked =
    printFormat === 'a5' && !isSplitMode && singleOverflowInfo.isOverflowing;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    if (isPrintBlocked) return;
    printWithCleanTitle(`${currentDoc.th}-${activeDocNo}`);
  };

  const handleBackToEdit = () => {
    onClose();
    if (onEditTicket) {
      onEditTicket(ticket);
    }
  };

  const resetDeps = [
    ticket.id,
    docType,
    printFormat,
    devices.length,
    allParts.length,
    ticket.customerName,
    ticket.customerAddress,
    ticket.problemDescription,
    ticket.technicianNotes,
    qrCodeDataUrl,
    promptPayQrUrl
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print-modal-overlay">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 print-modal-card">
        {/* Modal Toolbar (Hidden in Print) */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 rounded-t-2xl space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>ตัวอย่างก่อนพิมพ์: {currentDoc.th}</span>
                  <span className="font-mono text-blue-600 font-bold">{activeDocNo}</span>
                </h2>
                <p className="text-xs text-slate-500">{currentDoc.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPrintFormat('a5')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    printFormat === 'a5'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  A5 แนวตั้ง (148 × 210 มม.)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat('slip')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    printFormat === 'slip'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  สลิป 80mm
                </button>
              </div>

              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrintBlocked}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold shadow-sm transition-all text-xs ${
                  isPrintBlocked
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                }`}
                title={isPrintBlocked ? 'กรุณาเลือกแยกเป็นหลายใบ หรือกลับไปแก้รายการก่อนพิมพ์' : 'ยืนยันพิมพ์เอกสาร'}
              >
                <Printer className="w-4 h-4" />
                <span>{isSplitMode ? `พิมพ์ทั้งหมด (${sheetChunks.length} ใบ)` : 'ยืนยันพิมพ์เอกสาร'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Document Type Selector */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-700/80">
            <span className="text-xs font-semibold text-slate-500 mr-1">ประเภทเอกสาร:</span>

            <button
              type="button"
              onClick={() => setDocType('work_order')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                docType === 'work_order'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>ใบรับเครื่องซ่อม</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType('delivery_note')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                docType === 'delivery_note'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-teal-50'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>ใบส่งมอบของ</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType('receipt')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                docType === 'receipt'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-emerald-50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>ใบเสร็จรับเงิน</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType('quotation')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                docType === 'quotation'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-blue-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ใบเสนอราคา</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType('invoice')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                docType === 'invoice'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-purple-50'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>ใบแจ้งหนี้</span>
            </button>
          </div>
        </div>

        {/* Tracking URL Helper Bar (Hidden in Print) */}
        <div className="bg-blue-50 dark:bg-blue-950/40 px-4 py-2 border-b border-blue-100 dark:border-blue-900/40 flex flex-wrap items-center justify-between text-xs gap-2 print:hidden">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <QrCode className="w-4 h-4 shrink-0" />
            <span>ลิงก์เช็คสถานะซ่อม:</span>
            <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-[11px] truncate max-w-[260px]">
              {trackingUrl}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-medium cursor-pointer"
            >
              {copiedLink ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
            </button>

            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดหน้าลูกค้า</span>
            </a>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto overflow-x-auto w-full p-2 sm:p-6 bg-slate-200/75 dark:bg-slate-950 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
          {printFormat === 'a5' ? (
            <div className="flex flex-col items-center w-full print:block">
              {/* Fit Status / Overflow Alert Banner (Hidden in Print) */}
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
                        ระบบไม่อนุญาตให้ล้นหรือตัดข้อมูลทิ้ง กรุณาเลือกแยกเป็นหลายใบ หรือกลับไปแก้รายการ
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
                      <span>แยกเป็นหลายใบ ({activeDocNo}-1, -2, ...)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBackToEdit}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200 hover:bg-rose-100 font-bold text-xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>กลับไปแก้รายการ</span>
                    </button>
                  </div>
                </div>
              ) : isSplitMode ? (
                <div className="mb-3 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center gap-2 print:hidden">
                  <Layers className="w-3.5 h-3.5" />
                  <span>โหมดแยกพิมพ์ {sheetChunks.length} ใบ A5 ({activeDocNo}-1 ถึง -{sheetChunks.length}) • ทุกใบมีช่องเซ็นครบ</span>
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
                  <A5RepairSheet
                    key={`${chunk.sheetDocNo}-${chunk.sheetIndex}`}
                    ticket={ticket}
                    shopSettings={shopSettings}
                    docType={docType}
                    docTitle={currentDoc.th}
                    chunk={chunk}
                    isMultiDeviceTicket={isMultiDevice}
                    isSplitSheet={isSplitMode}
                    grandSubtotal={subtotalBeforeDiscount}
                    grandDiscount={discountValue}
                    grandTotal={totalAmountValue}
                    receivedThaiFull={receivedThaiFull}
                    deliveredThaiFull={deliveredThaiFull}
                    todayThaiFull={todayThaiFull}
                    warrantyExpiryThaiFull={warrantyExpiryThaiFull}
                    dueDateThaiFull={dueDateThaiFull}
                    qrCodeDataUrl={qrCodeDataUrl}
                    promptPayQrUrl={promptPayQrUrl}
                    resetDeps={resetDeps}
                    onFitReport={isSplitMode ? handleSplitFitReport : handleSingleFitReport}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* ================= 80MM POS THERMAL SLIP ================= */
            <div
              id="printable-receipt-slip"
              className="bg-white text-slate-950 w-[80mm] p-3 rounded-xl shadow-lg border border-slate-200 text-[9pt] leading-[1.55] print:shadow-none print:border-none print:w-full print:p-1"
            >
              <div className="slip-doc-header text-center pb-2 border-b border-dashed border-slate-500">
                {shopSettings.logoUrl && (
                  <img
                    src={shopSettings.logoUrl}
                    alt={shopSettings.shopName}
                    className="h-10 w-auto object-contain mx-auto mb-1"
                  />
                )}
                <h1 className="font-bold text-[10.5pt]">{shopSettings.shopName}</h1>
                <p className="text-[9pt] font-normal text-slate-800">{shopSettings.shopAddress}</p>
                <p className="text-[9pt] font-normal text-slate-900">โทร {shopSettings.shopPhone}</p>
                <p className="font-bold text-[10pt] mt-1">{currentDoc.th}</p>
                <p className="font-mono font-bold text-[9.5pt]">{activeDocNo}</p>
                <p className="text-[9pt] font-normal text-slate-800">วันที่: {todayThaiFull}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-500 space-y-1 text-[9pt] font-normal">
                <p><span className="font-bold">ลูกค้า:</span> <span className="font-bold">{ticket.customerName}</span></p>
                <p>โทร: {ticket.customerPhone}</p>
                {devices.map((dev, idx) => (
                  <div key={dev.id || idx} className="pt-0.5">
                    <p>
                      <span className="font-bold">{isMultiDevice ? `เครื่อง ${idx + 1}:` : 'อุปกรณ์:'}</span> {dev.brand} {dev.model}
                      {dev.serialNumber ? ` (S/N: ${dev.serialNumber})` : ''}
                    </p>
                    <p>อาการ: {dev.problemDescription}</p>
                  </div>
                ))}
                <p>
                  ประกัน:{' '}
                  {warrantyDays > 0
                    ? `${warrantyDays} วัน${warrantyExpiryThaiFull ? ` (ถึง ${warrantyExpiryThaiFull})` : ''}`
                    : 'ไม่มีประกัน'}
                </p>
                <p>ผู้รับผิดชอบ: ร้านพัทลุงปริ้นเตอร์</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-500 space-y-1 text-[9pt] tabular-nums font-normal">
                {allLineItems.map((row, i) => (
                  <div key={i} className="flex justify-between gap-2">
                    <span className="truncate">{row.description}</span>
                    <span className="shrink-0">{formatMoneyPlain(row.total, 2)}</span>
                  </div>
                ))}
                {discountValue > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>ส่วนลด</span>
                    <span>-{formatMoneyPlain(discountValue, 2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[10pt] pt-1 border-t border-slate-400">
                  <span>
                    {docType === 'quotation' || docType === 'work_order' ? 'ราคาประเมิน (บาท)' : 'ยอดสุทธิ (บาท)'}
                  </span>
                  <span>{formatMoneyPlain(totalAmountValue, 2)}</span>
                </div>
              </div>

              {promptPayQrUrl && (
                <div className="py-2 text-center flex flex-col items-center border-b border-dashed border-slate-500">
                  <img src={promptPayQrUrl} alt="PromptPay QR" className="w-24 h-24 mx-auto" />
                  <p className="text-[9pt] font-normal mt-1">พร้อมเพย์ {shopSettings.promptPayId || '0834268058'}</p>
                </div>
              )}

              {qrCodeDataUrl && (
                <div className="py-2 text-center flex flex-col items-center">
                  <img src={qrCodeDataUrl} alt="Tracking QR" className="w-20 h-20 mx-auto" />
                  <p className="text-[9pt] font-normal mt-1">เช็คสถานะซ่อม</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
