import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { RepairTicket, ShopSettings, DEVICE_LABELS, GovDocumentType } from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { bahtText } from '../utils/bahtText';
import { getGovCreditDueStatus } from '../utils/govCredit';
import {
  X,
  Printer,
  QrCode,
  CheckCircle,
  Copy,
  ExternalLink,
  CreditCard,
  Building2,
  FileText,
  FileCheck,
  Receipt,
  ClipboardList,
  Calendar,
  Clock,
  ShieldCheck,
  CheckSquare,
  Scissors
} from 'lucide-react';
import { Barcode } from './Barcode';

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
  const [docType, setDocType] = useState<GovDocumentType>('work_order');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Set default document type based on ticket status & payment method
  useEffect(() => {
    if (ticket) {
      if (ticket.paymentMethod === 'gov_credit') {
        if (ticket.status === 'pending' || ticket.status === 'diagnosing') {
          setDocType('quotation');
        } else if (ticket.govCreditInfo?.billingStatus === 'paid' || ticket.isPaid) {
          setDocType('receipt');
        } else {
          setDocType('invoice');
        }
      } else {
        if (ticket.status === 'completed' && ticket.isPaid) {
          setDocType('receipt');
        } else {
          setDocType('work_order');
        }
      }

      // 1. Build public tracking URL
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

      // 2. Generate PromptPay QR Code
      const ppTarget = shopSettings.promptPayId || shopSettings.shopPhone || '0834268058';
      generatePromptPayQRDataUrl(ppTarget, ticket.totalAmount, { width: 160 })
        .then(url => setPromptPayQrUrl(url))
        .catch(err => console.error('PromptPay QR generate error:', err));
    }
  }, [ticket, shopSettings]);

  if (!isOpen || !ticket) return null;

  const trackingUrl = `${window.location.origin}/?track=${encodeURIComponent(ticket.ticketNumber)}`;
  const isGovCredit = ticket.paymentMethod === 'gov_credit';
  const totalInBahtText = bahtText(ticket.totalAmount || 0);

  // Document Numbering
  const docSeq = ticket.ticketNumber.replace(/^(REP|POS)-/i, '');
  const documentNumbers: Record<GovDocumentType, string> = {
    quotation: `QT-${docSeq}`,
    invoice: `INV-${docSeq}`,
    receipt: `REC-${docSeq}`,
    work_order: ticket.ticketNumber
  };

  const documentTitles: Record<GovDocumentType, { th: string; en: string; bg: string; subtitle: string }> = {
    quotation: {
      th: 'ใบเสนอราคา / ประมาณการค่าใช้จ่าย',
      en: 'QUOTATION',
      bg: 'bg-blue-800',
      subtitle: 'เอกสารเสนอราคาเพื่อขออนุมัติงบประมาณก่อนดำเนินการซ่อม (โรงเรียน/ส่วนราชการ)'
    },
    invoice: {
      th: isGovCredit ? 'ใบแจ้งหนี้ / ใบวางบิลงานซ่อมราชการ' : 'ใบแจ้งหนี้ / ใบวางบิล',
      en: 'INVOICE / BILLING NOTE',
      bg: 'bg-purple-900',
      subtitle: 'เอกสารส่งมอบงานและเรียกเก็บเงินตามข้อตกลงเครดิตราชการ'
    },
    receipt: {
      th: 'ใบเสร็จรับเงิน / ใบส่งมอบ',
      en: 'RECEIPT',
      bg: 'bg-emerald-800',
      subtitle: 'หลักฐานการรับชำระเงินและส่งมอบงานซ่อมเรียบร้อยแล้ว'
    },
    work_order: {
      th: 'ใบรับเครื่องซ่อม / WORK ORDER',
      en: 'JOB ORDER',
      bg: 'bg-slate-900',
      subtitle: 'หลักฐานการรับเครื่องเพื่อตรวจเช็คและซ่อมบำรุง'
    }
  };

  const currentDoc = documentTitles[docType];
  const activeDocNo = documentNumbers[docType];

  const dueStatus = ticket.govCreditInfo
    ? getGovCreditDueStatus(ticket.govCreditInfo.dueDate, ticket.govCreditInfo.billingStatus)
    : null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const todayThai = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print-modal-overlay">
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 print-modal-card">
        
        {/* Modal Toolbar (hidden in print) */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 rounded-t-2xl space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span>พิมพ์เอกสาร: {currentDoc.th}</span>
                  <span className="font-mono text-blue-600 font-bold">{activeDocNo}</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  {currentDoc.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Paper Format Selector */}
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
                  📄 A5 แนวตั้ง (148 × 210 มม.)
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
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition-all cursor-pointer text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์เอกสาร</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Document Type Selector (Quotation, Invoice, Receipt, Work Order) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-700/80">
            <span className="text-xs font-semibold text-slate-500 mr-1">เลือกประเภทเอกสาร:</span>
            
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
              <span>📄 ใบเสนอราคา (ขออนุมัติงบ)</span>
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
              <span>💼 ใบแจ้งหนี้ / ใบวางบิล</span>
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
              <span>🧾 ใบเสร็จรับเงิน</span>
            </button>

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
              <span>📋 ใบรับเครื่องซ่อม</span>
            </button>
          </div>
        </div>

        {/* Live URL Helper Bar (hidden in print) */}
        <div className="bg-blue-50 dark:bg-blue-950/40 px-4 py-2 border-b border-blue-100 dark:border-blue-900/40 flex flex-wrap items-center justify-between text-xs gap-2 print:hidden">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <QrCode className="w-4 h-4 shrink-0" />
            <span>ลิงก์เช็คสถานะสดสำหรับลูกค้า: </span>
            <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-[11px] truncate max-w-[280px]">
              {trackingUrl}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-medium cursor-pointer"
            >
              {copiedLink ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
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

        {/* Scrollable Printable Paper Preview Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/70 dark:bg-slate-950 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
          
          {/* ================= A5 FORMAT (148mm x 210mm) ================= */}
          {printFormat === 'a5' ? (
            <div className="flex flex-col items-center w-full">
              {/* Paper Dimension Visual Indicator for Screen */}
              <div className="mb-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1.5 shadow-xs print:hidden">
                <span>📄 สัดส่วนกระดาษ A5 แนวตั้ง (148 มม. × 210 มม.)</span>
              </div>

              <div
                id="printable-receipt-a5"
                className="a5-portrait-paper bg-white text-slate-900 w-[148mm] min-h-[210mm] max-w-full p-3.5 mx-auto shadow-2xl rounded-sm border border-slate-300 text-[8px] leading-tight flex flex-col justify-between font-sans print:shadow-none print:border-none print:w-[140mm] print:h-[202mm] print:min-h-[202mm] print:p-0 print:m-0"
              >
                {/* ================= MAIN RECEIPT SECTION ================= */}
                <div className="flex flex-col justify-between flex-1">
                  {/* 1. Header: Logo, Shop Info, Doc Number & Barcode */}
                  <div className="flex justify-between items-start border-b border-slate-400 pb-1">
                    <div className="flex items-start gap-2 max-w-[340px]">
                      {shopSettings.logoUrl && (
                        <img
                          src={shopSettings.logoUrl}
                          alt={shopSettings.shopName}
                          className="h-10 w-auto object-contain rounded border border-slate-200 p-0.5 shrink-0"
                        />
                      )}
                      <div>
                        <h1 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                          {shopSettings.shopName}
                        </h1>
                        <p className="text-[7.5px] text-slate-700 leading-snug">
                          {shopSettings.shopAddress}
                        </p>
                        <p className="text-[7.5px] text-slate-700 font-medium">
                          โทร. <span className="font-bold">{shopSettings.shopPhone}</span>
                          {shopSettings.shopLineId && <span> | LINE: <span className="font-bold">{shopSettings.shopLineId}</span></span>}
                        </p>
                        <p className="text-[7.5px] text-slate-800 font-medium">
                          เลขประจำตัวผู้เสียภาษี: <span className="font-mono font-bold">{shopSettings.taxId || '3930500607938'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[8.5px] font-bold text-slate-700">เลขที่</span>
                        <span className="font-mono font-black text-xs text-slate-900">{activeDocNo}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[7.5px] text-slate-600">วันที่</span>
                        <span className="text-[7.5px] font-medium text-slate-800">{todayThai}</span>
                      </div>
                      <div className="px-2.5 py-0.2 rounded-full border border-slate-800 text-slate-800 text-[7.5px] font-bold mb-0.5">
                        สำหรับลูกค้า
                      </div>
                      {/* Top Barcode for Document / Ticket Number */}
                      <div className="mt-0.5 flex flex-col items-end">
                        <Barcode value={activeDocNo} width={1.0} height={18} displayValue={false} className="h-4.5" />
                      </div>
                    </div>
                  </div>

                  {/* 2. Document Title Banner */}
                  <div className="my-1 py-0.5 border-y border-slate-400 bg-slate-100/90 text-center">
                    <h2 className="text-[10px] font-black tracking-wide text-slate-900 uppercase">
                      {docType === 'quotation'
                        ? 'ใบเสนอราคา / ประมาณการค่าใช้จ่าย (QUOTATION)'
                        : docType === 'invoice'
                        ? isGovCredit ? 'ใบแจ้งหนี้ / ใบวางบิลงานซ่อมราชการ' : 'ใบแจ้งหนี้ / ใบวางบิล (INVOICE)'
                        : docType === 'work_order'
                        ? 'ใบรับเครื่องซ่อม / บัตรส่งซ่อม (WORK ORDER)'
                        : 'บิลเงินสด / ใบเสร็จรับเงิน'}
                    </h2>
                  </div>

                  {/* 3. Customer Info & Bank/PromptPay with 3x3 cm QR Box */}
                  <div className="grid grid-cols-12 border border-slate-400 rounded-xs text-[7.5px] leading-tight">
                    {/* Left: Customer & Device Info (7 cols) */}
                    <div className="col-span-7 p-1 space-y-0.5 border-r border-dotted border-slate-400">
                      <div className="flex items-start">
                        <span className="font-bold text-slate-800 w-16 shrink-0">ชื่อลูกค้า:</span>
                        <span className="font-bold text-slate-900 truncate">{ticket.customerName}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold text-slate-700 w-16 shrink-0">ที่อยู่:</span>
                        <span className="text-slate-800 truncate">{ticket.customerAddress || '-'}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-semibold text-slate-700 w-16 shrink-0">โทรศัพท์:</span>
                        <span className="font-medium text-slate-800">{ticket.customerPhone}</span>
                        {ticket.customerLineId && <span className="ml-2 text-slate-500">LINE: {ticket.customerLineId}</span>}
                      </div>
                      <div className="flex items-center">
                        <span className="font-semibold text-slate-700 w-16 shrink-0">เลขผู้เสียภาษี:</span>
                        <span className="font-mono text-slate-800">{ticket.govCreditInfo?.taxId || '-'}</span>
                      </div>

                      {/* Device & Symptoms info */}
                      <div className="pt-0.5 mt-0.5 border-t border-slate-200 flex items-start text-[7px]">
                        <span className="font-bold text-blue-900 w-16 shrink-0">อุปกรณ์:</span>
                        <span className="text-slate-900 font-semibold truncate">
                          {DEVICE_LABELS[ticket.deviceType]?.label || ticket.deviceType} {ticket.brand} {ticket.model}
                          {ticket.serialNumber ? ` (S/N: ${ticket.serialNumber})` : ''}
                        </span>
                      </div>
                      <div className="flex items-start text-[7px]">
                        <span className="font-bold text-slate-800 w-16 shrink-0">อาการเสีย:</span>
                        <span className="text-slate-700 truncate">{ticket.problemDescription}</span>
                      </div>
                      {ticket.accessories && ticket.accessories.length > 0 && (
                        <div className="flex items-start text-[6.5px] text-slate-500">
                          <span className="w-16 shrink-0 font-medium">อุปกรณ์ติดมา:</span>
                          <span className="truncate">{ticket.accessories.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Bank Details & QR Codes: 2x2 cm Tracking QR & 3x3 cm PromptPay QR (5 cols) */}
                    <div className="col-span-5 p-1 flex items-center justify-between gap-1 bg-slate-50/60">
                      <div className="space-y-0.2 text-[7px] leading-tight">
                        <p className="font-bold text-slate-900">
                          บัญชีธนาคาร <span className="font-normal">{shopSettings.bankName || 'กสิกรไทย'}</span>
                        </p>
                        <p className="font-bold text-slate-900 truncate max-w-[85px]">
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
                            ticket.isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isGovCredit
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {ticket.isPaid ? '✓ ชำระเงินเรียบร้อย' : isGovCredit ? 'เครดิตราชการ' : 'สแกนชำระเงิน'}
                          </span>
                        </div>
                      </div>

                      {/* QR Codes Group: Tracking QR 2x2 cm + PromptPay QR 3x3 cm */}
                      <div className="shrink-0 flex items-end gap-1.5">
                        {/* Live Status Tracking QR: EXACTLY 2x2 cm (20mm x 20mm) */}
                        {qrCodeDataUrl && (
                          <div className="flex flex-col items-center">
                            <div className="w-[20mm] h-[20mm] p-0.5 bg-white border border-slate-300 rounded-xs shadow-2xs flex items-center justify-center">
                              <img
                                src={qrCodeDataUrl}
                                alt="Live Tracking QR 2x2"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-[6px] text-blue-900 font-bold mt-0.2">เช็คสถานะสด (2×2 ซม.)</span>
                          </div>
                        )}

                        {/* PromptPay QR Code: EXACTLY 3x3 cm (30mm x 30mm) */}
                        {promptPayQrUrl && (
                          <div className="flex flex-col items-center">
                            <div className="w-[30mm] h-[30mm] p-0.5 bg-white border border-slate-300 rounded-xs shadow-2xs flex items-center justify-center">
                              <img
                                src={promptPayQrUrl}
                                alt="PromptPay QR Code 3x3"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-[6px] text-emerald-900 font-bold mt-0.2">พร้อมเพย์ (3×3 ซม.)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. Items Table (Full-sheet, zero wasted gaps) */}
                  <div className="border border-slate-400 rounded-xs overflow-hidden text-[7.5px] my-1">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-200/90 text-slate-900 font-bold border-b border-slate-400 text-[7.5px]">
                        <tr>
                          <th className="py-0.5 px-1 w-7 text-center border-r border-dotted border-slate-400">ลำดับที่</th>
                          <th className="py-0.5 px-1.5 border-r border-dotted border-slate-400">รายการ</th>
                          <th className="py-0.5 px-1 w-12 text-center border-r border-dotted border-slate-400">จำนวน</th>
                          <th className="py-0.5 px-1 w-11 text-center border-r border-dotted border-slate-400">หน่วยนับ</th>
                          <th className="py-0.5 px-1 w-16 text-right border-r border-dotted border-slate-400">ราคาต่อหน่วย</th>
                          <th className="py-0.5 px-1.5 w-18 text-right">หลังหักส่วนลด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {/* Service / Labor Fee */}
                        <tr>
                          <td className="py-0.5 px-1 text-center text-slate-500 border-r border-dotted border-slate-300">1</td>
                          <td className="py-0.5 px-1.5 font-medium border-r border-dotted border-slate-300">
                            ค่าบริการตรวจเช็คและค่าแรงซ่อมบำรุง
                          </td>
                          <td className="py-0.5 px-1 text-center border-r border-dotted border-slate-300">1.00</td>
                          <td className="py-0.5 px-1 text-center border-r border-dotted border-slate-300">งาน/เครื่อง</td>
                          <td className="py-0.5 px-1 text-right font-mono border-r border-dotted border-slate-300">
                            ฿{(ticket.laborCost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-0.5 px-1.5 text-right font-mono font-semibold">
                            ฿{(ticket.laborCost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* Parts Used */}
                        {ticket.partsUsed?.map((part, idx) => (
                          <tr key={idx}>
                            <td className="py-0.5 px-1 text-center text-slate-500 border-r border-dotted border-slate-300">{idx + 2}</td>
                            <td className="py-0.5 px-1.5 font-medium border-r border-dotted border-slate-300 truncate max-w-[200px]">
                              {part.itemName} {part.itemCode && <span className="font-mono text-slate-400 text-[6.5px]">({part.itemCode})</span>}
                            </td>
                            <td className="py-0.5 px-1 text-center border-r border-dotted border-slate-300">
                              {Number(part.quantity || 1).toFixed(2)}
                            </td>
                            <td className="py-0.5 px-1 text-center border-r border-dotted border-slate-300">ชิ้น</td>
                            <td className="py-0.5 px-1 text-right font-mono border-r border-dotted border-slate-300">
                              ฿{Number(part.unitPrice || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-0.5 px-1.5 text-right font-mono font-semibold">
                              ฿{Number(part.totalPrice || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
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
                          หมายเหตุ: <span className="font-normal text-slate-700">{ticket.technicianNotes || 'ตรวจเช็คและซ่อมบำรุงตามมาตรฐาน'}</span>
                        </p>
                      </div>

                      {/* Shaded bar with Thai Baht text */}
                      <div className="p-1 rounded bg-slate-200/80 border border-slate-300 text-center font-bold text-[8px] text-slate-900 mt-1">
                        ตัวอักษร: ( {totalInBahtText} )
                      </div>
                    </div>

                    {/* Right: Calculations */}
                    <div className="col-span-5 space-y-0.2 border border-slate-300 rounded p-1 bg-slate-50/50">
                      <div className="flex justify-between text-slate-700">
                        <span>รวม</span>
                        <span className="font-mono">฿{((ticket.laborCost || 0) + (ticket.partsCost || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>ส่วนลดการค้า</span>
                        <span className="font-mono">{Number(ticket.discount || 0) > 0 ? `-฿${Number(ticket.discount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '0.00'}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>มูลค่าสินค้า</span>
                        <span className="font-mono">฿{(ticket.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>ภาษีมูลค่าเพิ่ม</span>
                        <span className="font-mono">0.00</span>
                      </div>
                      <div className="flex justify-between items-baseline font-black text-[9px] text-slate-950 pt-0.5 border-t-2 border-slate-800">
                        <span>รวมสุทธิ</span>
                        <span className="font-mono text-[11px] font-black text-blue-900">
                          ฿{(ticket.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 6. Warranty Terms */}
                  <div className="border border-slate-300 rounded p-1 bg-slate-50/40 text-[7px] leading-tight space-y-0.2 my-0.5">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>เงื่อนไขการรับประกันสินค้าและงานซ่อม:</span>
                      <span className="text-blue-900 font-bold">
                        🛡️ รับประกัน {(ticket.warrantyDays ?? 30) > 0 ? `${ticket.warrantyDays ?? 30} วัน` : 'ไม่มีประกัน'}
                        {ticket.warrantyExpiryDate && (ticket.warrantyDays ?? 30) > 0 ? ` (ถึง: ${ticket.warrantyExpiryDate})` : ''}
                      </span>
                    </div>
                    <p className="text-slate-700">1. การรับประกันการซ่อมสินค้าจะมีผลเมื่อมีเอกสารฉบับนี้มายืนยันกับทางร้านเท่านั้น</p>
                    <p className="text-slate-700">2. เมื่อสินค้าได้รับการซ่อมหรือแก้ไขโดยมิใช่การดำเนินการของทางร้าน ถือว่าการรับประกันสิ้นสุดทันที</p>
                    <p className="text-slate-700">3. ไม่รับประกันกรณีมีการใช้งานผิดประเภท ตกน้ำ ฟ้าผ่า หรือมีร่องรอยการแกะซ่อมจากที่อื่น</p>
                  </div>

                  {/* 7. Signatures */}
                  {docType === 'quotation' ? (
                    <div className="grid grid-cols-2 gap-3 text-center text-[7.5px] my-0.5 pt-0.5 border-t border-slate-300">
                      <div className="space-y-0.5">
                        <p className="font-bold text-blue-900">ผู้เสนอราคา (ทางร้าน)</p>
                        <div className="pt-1 text-slate-400">( ................................................................ )</div>
                        <p className="text-[7px] text-slate-600 font-medium">{shopSettings.shopName}</p>
                      </div>
                      <div className="space-y-0.5 text-left border border-blue-200 bg-blue-50/40 p-1 rounded">
                        <p className="font-bold text-blue-950 text-[7px]">[ &nbsp; ] ผู้อนุมัติสั่งจ้าง / ขออนุมัติงบประมาณ</p>
                        <div className="pt-1 text-center text-slate-400">( ................................................................ )</div>
                        <p className="text-[6.5px] text-slate-500 text-center">หัวหน้าหน่วยงาน / เจ้าหน้าที่พัสดุ</p>
                      </div>
                    </div>
                  ) : (
                    <div className="my-0.5 pt-0.5 border-t border-slate-300">
                      <div className="grid grid-cols-2 gap-4 text-center text-[7.5px]">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">ผู้รับสินค้า / ลูกค้า</p>
                          <div className="pt-1 text-slate-400">( ................................................................ )</div>
                          <p className="text-[7px] text-slate-700 font-medium">{ticket.customerName}</p>
                        </div>

                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">ผู้รับเงิน / ผู้ส่งมอบงาน</p>
                          <div className="pt-1 text-slate-400">( ........................ ร้านพัทลุงปริ้นเตอร์ ........................ )</div>
                          <p className="text-[7px] text-slate-700 font-medium">{ticket.technicianName || shopSettings.shopName}</p>
                        </div>
                      </div>
                      <p className="text-[6.5px] text-slate-500 text-center mt-0.5">
                        * ได้รับสินค้าตามรายการข้างต้นในสภาพที่เรียบร้อยและถูกต้องสมบูรณ์แล้ว
                      </p>
                    </div>
                  )}
                </div>

                {/* ================= TEAR-OFF CUSTOMER STUB (ส่วนท้ายใบเสร็จสำหรับตัด) ================= */}
                <div className="mt-1 pt-1">
                  {/* Perforated Cutting Line */}
                  <div className="relative my-1 text-center border-t-2 border-dashed border-slate-400">
                    <span className="absolute left-1/2 -top-2 -translate-x-1/2 bg-white px-2 text-[7px] font-bold text-slate-600 flex items-center gap-1 shadow-2xs">
                      <Scissors className="w-2.5 h-2.5 text-slate-700 inline" />
                      <span>ตัดตามรอยประ (หางบัตรสำหรับลูกค้า / บัตรรับเครื่อง / ส่วนรับประกัน)</span>
                    </span>
                  </div>

                  {/* Customer Claim Stub Box */}
                  <div className="border border-slate-400 rounded-xs p-1 bg-slate-50/80 text-[7px] leading-tight space-y-0.5">
                    <div className="flex justify-between items-center border-b border-slate-300 pb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-[8px] text-slate-900">{shopSettings.shopName}</span>
                        <span className="text-[6.5px] text-slate-600">โทร. {shopSettings.shopPhone}</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 font-bold text-[6.5px]">
                        หางบัตรรับเครื่อง & รับประกัน (Customer Stub)
                      </span>
                    </div>

                    <div className="grid grid-cols-12 gap-1 items-center">
                      {/* Left: Doc No, Barcode, Customer, Device (7 cols) */}
                      <div className="col-span-7 space-y-0.2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">เลขที่: <span className="font-mono">{activeDocNo}</span></span>
                          <Barcode value={activeDocNo} width={0.85} height={14} displayValue={false} className="h-3.5 inline" />
                        </div>
                        <p className="truncate"><span className="font-semibold text-slate-700">ลูกค้า:</span> <span className="font-bold">{ticket.customerName}</span> (โทร. {ticket.customerPhone})</p>
                        <p className="truncate"><span className="font-semibold text-slate-700">อุปกรณ์:</span> {ticket.brand} {ticket.model} {ticket.serialNumber ? `(S/N: ${ticket.serialNumber})` : ''}</p>
                        <p className="truncate text-slate-600"><span className="font-semibold text-slate-700">อาการ:</span> {ticket.problemDescription}</p>
                      </div>

                      {/* Right: Amount, Warranty, Tracking QR (5 cols) */}
                      <div className="col-span-5 flex items-center justify-between pl-1 border-l border-slate-300">
                        <div className="space-y-0.2">
                          <p className="font-bold text-slate-900">ยอดสุทธิ: <span className="text-blue-900 font-mono font-bold text-[8px]">฿{(ticket.totalAmount || 0).toLocaleString()}</span></p>
                          <p className="text-emerald-800 font-bold">{ticket.isPaid ? '✓ ชำระแล้ว' : 'รอชำระเงิน'}</p>
                          <p className="text-slate-700">
                            ประกัน: <span className="font-semibold">{(ticket.warrantyDays ?? 30) > 0 ? `${ticket.warrantyDays ?? 30} วัน` : 'ไม่มี'}</span>
                          </p>
                          <p className="text-[6px] text-slate-500">วันที่: {todayThai}</p>
                        </div>

                        {/* Tracking QR Code: Exactly 2x2 cm (20mm x 20mm) */}
                        {qrCodeDataUrl && (
                          <div className="flex flex-col items-center shrink-0 ml-1">
                            <div className="w-[20mm] h-[20mm] p-0.5 bg-white border border-slate-300 rounded-xs shadow-2xs flex items-center justify-center">
                              <img
                                src={qrCodeDataUrl}
                                alt="Tracking QR 2x2"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-[6px] text-blue-900 font-bold mt-0.5">เช็คสถานะสด 2×2</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[6px] text-slate-500 pt-0.5 border-t border-slate-200">
                      <span>* กรุณานำหางบัตรนี้มาแสดงเพื่อติดต่อรับเครื่องหรือรับบริการประกันงานซ่อม</span>
                      <span>{shopSettings.shopName}</span>
                    </div>
                  </div>
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
                <p className="font-bold text-xs mt-1">
                  {currentDoc.th}
                </p>
                <p className="font-bold text-sm text-blue-800">{activeDocNo}</p>
                <p className="text-[9px] text-slate-500">วันที่: {todayThai}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-1">
                <p><span className="font-bold">ลูกค้า:</span> {ticket.customerName}</p>
                <p><span className="font-bold">โทร:</span> {ticket.customerPhone}</p>
                {isGovCredit && ticket.govCreditInfo && (
                  <>
                    <p><span className="font-bold">หน่วยงาน:</span> {ticket.govCreditInfo.agencyName}</p>
                    {ticket.govCreditInfo.taxId && <p><span className="font-bold">เลขผู้เสียภาษี:</span> {ticket.govCreditInfo.taxId}</p>}
                    {ticket.govCreditInfo.disbursementNumber && (
                      <p><span className="font-bold">เลขที่ฎีกา:</span> {ticket.govCreditInfo.disbursementNumber}</p>
                    )}
                  </>
                )}
                <p><span className="font-bold">อุปกรณ์:</span> {ticket.brand} {ticket.model}</p>
                {ticket.serialNumber && <p><span className="font-bold">S/N:</span> {ticket.serialNumber}</p>}
                <p><span className="font-bold">อุปกรณ์ติดมา:</span> {ticket.accessories?.join(', ') || '-'}</p>
                <p><span className="font-bold">อาการเสีย:</span> {ticket.problemDescription}</p>
                <p><span className="font-bold">🛡️ ประกัน:</span> {(ticket.warrantyDays ?? 30) > 0 ? `รับประกัน ${ticket.warrantyDays ?? 30} วัน ${ticket.warrantyExpiryDate ? `(ถึง ${ticket.warrantyExpiryDate})` : ''}` : 'ไม่มีประกัน'}</p>
                {ticket.isWarrantyClaim && <p className="text-purple-700 font-bold">* งานเคลมประกันต่อเนื่อง (ฟรีค่าแรง)</p>}
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

              {/* PromptPay QR Code on Slip */}
              {promptPayQrUrl && (
                <div className="py-2 text-center flex flex-col items-center border-b border-dashed border-slate-400">
                  <img src={promptPayQrUrl} alt="PromptPay QR Code" className="w-24 h-24 mx-auto" />
                  <p className="text-[9px] font-bold mt-1 text-[#002D62]">สแกนชำระพร้อมเพย์</p>
                  <p className="text-[8px] text-slate-500">{shopSettings.promptPayId || '083-426-8058'}</p>
                </div>
              )}

              {/* Status Tracking QR Code on Slip */}
              <div className="py-2 text-center flex flex-col items-center">
                {qrCodeDataUrl && (
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-20 h-20 mx-auto" />
                )}
                <p className="text-[8px] font-bold mt-1 text-slate-700">สแกนตรวจเช็คสถานะงานซ่อม</p>
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
