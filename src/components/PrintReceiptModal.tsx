import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  RepairTicket,
  ShopSettings,
  DEVICE_LABELS,
  RepairDocumentType,
  STATUS_CONFIG
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
  PackageCheck
} from 'lucide-react';
import { Barcode } from './Barcode';

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: RepairTicket | null;
  shopSettings: ShopSettings;
  initialDocType?: RepairDocumentType;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  isOpen,
  onClose,
  ticket,
  shopSettings,
  initialDocType
}) => {
  const [printFormat, setPrintFormat] = useState<'a5' | 'slip'>('a5');
  const [docType, setDocType] = useState<RepairDocumentType>('work_order');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Set default document type based on prop, ticket status & payment method
  useEffect(() => {
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

      // 1. Build public tracking URL QR
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

      // 2. Generate PromptPay QR Code
      const ppTarget = shopSettings.promptPayId || shopSettings.shopPhone || '0834268058';
      generatePromptPayQRDataUrl(ppTarget, ticket.totalAmount, { width: 180 })
        .then(url => setPromptPayQrUrl(url))
        .catch(err => console.error('PromptPay QR generate error:', err));
    }
  }, [ticket, shopSettings, initialDocType]);

  if (!isOpen || !ticket) return null;

  const devices = getTicketDevices(ticket);
  const allParts = getTicketAllParts(ticket);
  const isMultiDevice = devices.length > 1;
  const trackingUrl = `${window.location.origin}/?track=${encodeURIComponent(ticket.ticketNumber)}`;
  const isGovCredit = ticket.paymentMethod === 'gov_credit';
  const totalInBahtText = bahtText(ticket.totalAmount || 0);

  // Document Numbering
  const docSeq = ticket.ticketNumber.replace(/^(REP|POS)-/i, '');
  const documentNumbers: Record<RepairDocumentType, string> = {
    quotation: `QT-${docSeq}`,
    invoice: `INV-${docSeq}`,
    receipt: `REC-${docSeq}`,
    work_order: ticket.ticketNumber,
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

  // Format all dates strictly in full Thai Buddhist Era format ("16 พฤศจิกายน 2569")
  const todayThaiFull = formatTodayThaiFull();
  const receivedThaiFull = formatThaiDateFull(ticket.receivedDate || ticket.createdAt, todayThaiFull);
  const deliveredThaiFull = formatThaiDateFull(ticket.deliveredDate || new Date(), todayThaiFull);
  const warrantyExpiryThaiFull = ticket.warrantyExpiryDate
    ? formatThaiDateFull(ticket.warrantyExpiryDate, '')
    : '';
  const dueDateThaiFull = ticket.govCreditInfo?.dueDate
    ? formatThaiDateFull(ticket.govCreditInfo.dueDate, '')
    : '';

  // Estimate line item density for smart A5 auto-fit vs clean multi-page flow
  const estimatedRowCount =
    (isMultiDevice ? devices.length * 2 : 1) + allParts.length;
  const isCompactMode = estimatedRowCount >= 4 && estimatedRowCount <= 7;
  const isMultiPageMode = estimatedRowCount > 7 || devices.length >= 3;

  const subtotalBeforeDiscount = (ticket.laborCost || 0) + (ticket.partsCost || 0);
  const discountValue = Number(ticket.discount || 0);
  const totalAmountValue = Number(ticket.totalAmount || 0);
  const warrantyDays = ticket.warrantyDays ?? 30;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    printWithCleanTitle(`${currentDoc.th}-${activeDocNo}`);
  };

  // Build unified item rows for the table (supports 1 or N devices cleanly)
  interface PrintLineItem {
    description: string;
    qty: number;
    unit: string;
    unitPrice: number;
    total: number;
  }

  const lineItems: PrintLineItem[] = [];
  if (isMultiDevice) {
    devices.forEach((dev, idx) => {
      if (dev.laborCost > 0 || dev.partsUsed.length === 0) {
        lineItems.push({
          description: `เครื่องที่ ${idx + 1}: ค่าบริการ/ค่าแรง (${dev.brand} ${dev.model})`,
          qty: 1,
          unit: 'เครื่อง',
          unitPrice: dev.laborCost || 0,
          total: dev.laborCost || 0
        });
      }
      dev.partsUsed.forEach(part => {
        lineItems.push({
          description: `เครื่องที่ ${idx + 1}: ${part.itemName}`,
          qty: Number(part.quantity || 1),
          unit: 'ชิ้น',
          unitPrice: Number(part.unitPrice || 0),
          total: Number(part.totalPrice || 0)
        });
      });
    });
  } else {
    lineItems.push({
      description:
        docType === 'delivery_note'
          ? `ค่าบริการซ่อมและตรวจเช็ค (${devices[0]?.brand || ticket.brand} ${devices[0]?.model || ticket.model})`
          : 'ค่าบริการตรวจเช็คและค่าแรงซ่อมบำรุง',
      qty: 1,
      unit: 'งาน',
      unitPrice: ticket.laborCost || 0,
      total: ticket.laborCost || 0
    });
    allParts.forEach(part => {
      lineItems.push({
        description: part.itemName,
        qty: Number(part.quantity || 1),
        unit: 'ชิ้น',
        unitPrice: Number(part.unitPrice || 0),
        total: Number(part.totalPrice || 0)
      });
    });
  }

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
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition-all cursor-pointer text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>ยืนยันพิมพ์เอกสาร</span>
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
            <div className="flex flex-col items-center w-full">
              <div className="mb-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold print:hidden">
                ตัวอย่างกระดาษ A5 แนวตั้ง (148 × 210 มม. | ขอบ ซ้าย-ขวา-บน 6 มม. / ล่าง 3.5 มม.)
              </div>

              <div
                id="printable-receipt-a5"
                className={`a5-portrait-paper shadow-2xl border border-slate-300 mx-auto flex flex-col justify-between ${
                  isCompactMode ? 'a5-compact' : ''
                } ${isMultiPageMode ? 'a5-multi-page' : ''}`}
              >
                {/* ================= TOP + MIDDLE CONTENT ================= */}
                <div className="space-y-2">
                  {/* 1. HEADER: Shop Info Left | Doc Number & Thai Date Right (NO TOP BARCODE, NO TOP LINE) */}
                  <div className="a5-doc-header flex justify-between items-start gap-2.5">
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
                        {shopSettings.taxId && (
                          <p className="text-[9pt] font-normal text-slate-800">
                            เลขประจำตัวผู้เสียภาษี: {shopSettings.taxId}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-0.5 leading-[1.5]">
                      <div className="text-[9pt] text-slate-900 font-normal">
                        เลขที่ <span className="font-mono text-[9.5pt] font-bold text-slate-950">{activeDocNo}</span>
                      </div>
                      {docType === 'delivery_note' && (
                        <div className="text-[9pt] font-normal text-slate-800">
                          อ้างอิงใบรับซ่อม: <span className="font-mono">{ticket.ticketNumber}</span>
                        </div>
                      )}
                      <div className="text-[9pt] font-normal text-slate-900">
                        {docType === 'delivery_note' ? `วันที่ส่งมอบ: ${deliveredThaiFull}` : `วันที่: ${todayThaiFull}`}
                      </div>
                      {docType !== 'delivery_note' && ticket.receivedDate && (
                        <div className="text-[9pt] font-normal text-slate-800">
                          วันที่รับ: {receivedThaiFull}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. DOCUMENT TITLE BANNER (NO TOP BORDER, BOTTOM LINE ONLY) */}
                  <div className="a5-doc-banner">
                    <h2 className="text-[10.5pt] font-bold tracking-wide text-slate-950">
                      {currentDoc.th}
                    </h2>
                  </div>

                  {/* 3. CUSTOMER + PAYMENT / PROMPTPAY QR BOX */}
                  <div className="grid grid-cols-12 border border-slate-500 text-[9pt] leading-[1.55]">
                    {/* Left: Customer & Primary Device Summary (6 cols) */}
                    <div className="col-span-6 p-2 border-r border-slate-400 space-y-1 min-w-0">
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
                      </div>
                      {isGovCredit && ticket.govCreditInfo?.taxId && (
                        <div className="font-normal text-slate-900">
                          <span>เลขภาษี: </span>
                          <span className="font-mono">{ticket.govCreditInfo.taxId}</span>
                        </div>
                      )}
                      {dueDateThaiFull && (
                        <div className="font-normal text-slate-900">
                          <span>ครบกำหนด: </span>
                          <span>{dueDateThaiFull}</span>
                        </div>
                      )}

                      {/* Single-device summary stays spacious inside customer box */}
                      {!isMultiDevice && devices[0] && (
                        <div className="pt-1.5 mt-1 border-t border-slate-300 space-y-1 font-normal text-slate-900">
                          <div className="break-words">
                            <span className="font-bold text-slate-950">อุปกรณ์: </span>
                            <span>
                              {DEVICE_LABELS[devices[0].deviceType]?.label || devices[0].deviceType} {devices[0].brand} {devices[0].model}
                              {devices[0].serialNumber ? ` (S/N: ${devices[0].serialNumber})` : ''}
                            </span>
                          </div>
                          <div className="break-words">
                            <span className="font-bold text-slate-950">
                              {docType === 'delivery_note' ? 'สรุปการซ่อม: ' : 'อาการเสีย: '}
                            </span>
                            <span>
                              {docType === 'delivery_note'
                                ? devices[0].technicianNotes || devices[0].problemDescription
                                : devices[0].problemDescription}
                            </span>
                          </div>
                          {devices[0].accessories && devices[0].accessories.length > 0 && (
                            <div className="break-words">
                              <span>อุปกรณ์ที่นำมาด้วย: </span>
                              <span>{devices[0].accessories.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Payment Channel & PromptPay QR (6 cols for relaxed wrapping) */}
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
                          <span className="text-[9pt] font-normal text-slate-900 mt-1">พร้อมเพย์</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multi-Device Summary List (when 1 ticket has N > 1 devices) */}
                  {isMultiDevice && (
                    <div className="border border-slate-500 text-[9pt] leading-[1.55]">
                      <div className="bg-slate-100 px-2.5 py-1 font-bold text-slate-950 border-b border-slate-400">
                        รายการอุปกรณ์ที่{docType === 'delivery_note' ? 'ส่งมอบคืน' : 'ส่งซ่อม'} ({devices.length} เครื่อง)
                      </div>
                      <div className="divide-y divide-slate-300">
                        {devices.map((dev, idx) => {
                          const devStatusLabel = STATUS_CONFIG[dev.status || ticket.status]?.label || '';
                          return (
                            <div key={dev.id || idx} className="px-2.5 py-1.5 font-normal text-slate-900">
                              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                                <span className="font-bold text-slate-950">
                                  {idx + 1}. {DEVICE_LABELS[dev.deviceType]?.label || dev.deviceType} {dev.brand} {dev.model}
                                  {dev.serialNumber ? ` (S/N: ${dev.serialNumber})` : ''}
                                </span>
                                {devStatusLabel && (
                                  <span className="text-[9pt] text-slate-700 shrink-0">
                                    [{devStatusLabel}]
                                  </span>
                                )}
                              </div>
                              <div className="break-words">
                                {docType === 'delivery_note'
                                  ? `ผลการซ่อม: ${dev.technicianNotes || dev.problemDescription}`
                                  : `อาการเสีย: ${dev.problemDescription}`}
                                {dev.accessories && dev.accessories.length > 0
                                  ? ` | อุปกรณ์ที่นำมาด้วย: ${dev.accessories.join(', ')}`
                                  : ''}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. ITEMS & AMOUNT TABLE (NO '฿' SYMBOL ANYWHERE) */}
                  <div className="border border-slate-500 text-[9pt] leading-[1.55]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-200 text-slate-950 font-bold border-b border-slate-500">
                        <tr>
                          <th className="py-1.5 px-1.5 w-[8%] text-center border-r border-slate-400">ที่</th>
                          <th className="py-1.5 px-2 w-[44%] border-r border-slate-400">รายการ</th>
                          <th className="py-1.5 px-1 w-[10%] text-center border-r border-slate-400">จำนวน</th>
                          <th className="py-1.5 px-1 w-[10%] text-center border-r border-slate-400">หน่วย</th>
                          <th className="py-1.5 px-2 w-[14%] text-right border-r border-slate-400">ราคา</th>
                          <th className="py-1.5 px-2 w-[14%] text-right">รวม (บาท)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 font-normal text-slate-900">
                        {lineItems.map((row, idx) => (
                          <tr key={idx} className="a5-keep-together">
                            <td className="py-1.5 px-1.5 text-center border-r border-slate-300">{idx + 1}</td>
                            <td className="py-1.5 px-2 border-r border-slate-300 break-words">
                              {row.description}
                            </td>
                            <td className="py-1.5 px-1 text-center border-r border-slate-300 tabular-nums">
                              {row.qty}
                            </td>
                            <td className="py-1.5 px-1 text-center border-r border-slate-300">
                              {row.unit}
                            </td>
                            <td className="py-1.5 px-2 text-right border-r border-slate-300 tabular-nums">
                              {formatMoneyPlain(row.unitPrice, 2)}
                            </td>
                            <td className="py-1.5 px-2 text-right text-slate-950 tabular-nums">
                              {formatMoneyPlain(row.total, 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 5. TOTALS & REMARKS (NO '฿' SYMBOL) */}
                  <div className="grid grid-cols-12 gap-2.5 text-[9pt] leading-[1.55] a5-keep-together">
                    <div className="col-span-7 flex flex-col justify-between gap-1.5">
                      <div className="text-slate-900 font-normal break-words">
                        <span className="font-bold text-slate-950">หมายเหตุ: </span>
                        <span>{ticket.technicianNotes || 'ตรวจเช็คและซ่อมบำรุงตามมาตรฐาน'}</span>
                      </div>
                      <div className="p-2 bg-slate-100 border border-slate-400 text-center font-bold text-slate-950">
                        ตัวอักษร: ( {totalInBahtText} )
                      </div>
                    </div>

                    <div className="col-span-5 border border-slate-500 p-2 bg-slate-50 space-y-1 tabular-nums font-normal">
                      <div className="flex justify-between text-slate-900">
                        <span>รวมเป็นเงิน</span>
                        <span>{formatMoneyPlain(subtotalBeforeDiscount, 2)}</span>
                      </div>
                      {discountValue > 0 && (
                        <div className="flex justify-between text-rose-700">
                          <span>ส่วนลด</span>
                          <span>-{formatMoneyPlain(discountValue, 2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-baseline font-bold text-[10pt] text-slate-950 pt-1 border-t-2 border-slate-800">
                        <span>
                          {docType === 'quotation' || docType === 'work_order'
                            ? 'ราคาประเมิน (บาท)'
                            : 'ยอดสุทธิ (บาท)'}
                        </span>
                        <span className="text-[10.5pt]">{formatMoneyPlain(totalAmountValue, 2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 6. WARRANTY TERMS & TRACKING QR CODE */}
                  <div className="a5-section-box bg-slate-50/70 text-[9pt] leading-[1.55] flex items-center justify-between gap-2.5 a5-keep-together">
                    <div className="flex-1 space-y-0.5 min-w-0 font-normal text-slate-900">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-300 pb-1 flex-wrap">
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
                        <span className="text-[9pt] text-slate-950 font-normal mt-1 whitespace-nowrap">
                          เช็คสถานะซ่อม
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ================= BOTTOM SECTION: ENLARGED SIGNATURES + CLEAN STUB ================= */}
                <div className="mt-auto pt-2.5 space-y-2 a5-keep-together">
                  {/* 7. SIGNATURES: Spacious, NO "ลงลายมือชื่อ", NO small helper text */}
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

                  {/* 8. TEAR-OFF STUB: ONLY Doc No, Barcode, Customer Name */}
                  <div className="pt-2 border-t-2 border-dashed border-slate-500">
                    <div className="border border-slate-500 px-3 py-2 flex items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="text-[9.5pt] font-bold text-slate-950">
                          เลขที่เอกสาร: <span className="font-mono">{activeDocNo}</span>
                        </div>
                        <div className="text-[9.5pt] font-bold text-slate-950 truncate">
                          ชื่อลูกค้า: {ticket.customerName}
                        </div>
                      </div>
                      <div className="shrink-0 bg-white px-1">
                        <Barcode
                          value={activeDocNo}
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
                {lineItems.map((row, i) => (
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
