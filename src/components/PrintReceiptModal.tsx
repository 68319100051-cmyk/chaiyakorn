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
  CheckSquare
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
                  ขนาด A5 (มาตรฐาน)
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-950/60 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          
          {/* ================= A5 FORMAT (148mm x 210mm) ================= */}
          {printFormat === 'a5' ? (
            <div
              id="printable-receipt-a5"
              className="bg-white text-slate-900 w-full max-w-[140mm] p-2.5 sm:p-3 mx-auto shadow-none print:shadow-none border border-slate-200 print:border-none text-[8.5px] leading-tight space-y-1.5 font-sans a5-printable-page"
            >
              {/* Header: Logo, Store Info & Title */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-1.5">
                <div className="flex items-start gap-2 max-w-[340px]">
                  {shopSettings.logoUrl && (
                    <img
                      src={shopSettings.logoUrl}
                      alt={shopSettings.shopName}
                      className="h-9 w-auto object-contain rounded border border-slate-200 p-0.5 shrink-0"
                    />
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
                  <span className={`inline-block px-2 py-0.5 rounded text-white font-black text-[9px] uppercase tracking-wider ${currentDoc.bg}`}>
                    {currentDoc.th}
                  </span>
                  <p className="font-mono font-bold text-xs text-blue-700 mt-0.5">
                    {activeDocNo}
                  </p>
                  <p className="text-[8px] text-slate-500">
                    วันที่: {todayThai}
                  </p>
                  {docType === 'quotation' && (
                    <p className="text-[7.5px] text-amber-800 font-semibold bg-amber-50 px-1 rounded mt-0.2">
                      * กำหนดยืนราคา 30 วัน
                    </p>
                  )}
                </div>
              </div>

              {/* Quotation Special Notice */}
              {docType === 'quotation' && (
                <div className="p-1 rounded bg-blue-50/70 border border-blue-200 text-[8px] text-blue-900">
                  <span className="font-bold">เรียน: </span>
                  <span>หัวหน้าหน่วยงาน / เจ้าหน้าที่พัสดุ / ผู้มีอำนาจ ({ticket.govCreditInfo?.agencyName || ticket.customerName})</span>
                  <span className="text-slate-600 ml-1">
                    — ขอเสนอราคาค่าบริการและอะไหล่สำหรับงานซ่อมบำรุงตามรายการด้านล่าง เพื่อประกอบการขออนุมัติจัดจ้าง
                  </span>
                </div>
              )}

              {/* Customer & Device Information (Side by side 2 columns) */}
              <div className="grid grid-cols-2 gap-1.5 text-[8.5px]">
                {/* Customer Box */}
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200 space-y-0.5">
                  <div className="font-bold text-[8px] text-blue-800 border-b border-slate-200 pb-0.5 flex items-center justify-between">
                    <span>ข้อมูลลูกค้า / หน่วยงาน</span>
                    {isGovCredit && (
                      <span className="text-[7.5px] bg-purple-100 text-purple-800 px-1 py-0.2 rounded font-bold">
                        เครดิตราชการ
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-[9.5px] text-slate-900">{ticket.customerName}</p>
                  <p className="text-slate-700">โทร: <span className="font-semibold">{ticket.customerPhone}</span> {ticket.customerLineId && <span className="text-slate-500">| LINE: {ticket.customerLineId}</span>}</p>
                  {ticket.customerAddress && <p className="text-slate-500 truncate text-[8px]">ที่อยู่: {ticket.customerAddress}</p>}
                  
                  {isGovCredit && ticket.govCreditInfo && (
                    <div className="pt-0.5 border-t border-slate-200 text-[8px] text-purple-950 space-y-0.2">
                      <p className="truncate"><span className="font-bold">หน่วยงาน:</span> {ticket.govCreditInfo.agencyName}</p>
                      <div className="flex justify-between gap-1">
                        {ticket.govCreditInfo.taxId && <span>เลขผู้เสียภาษี: <span className="font-mono font-bold">{ticket.govCreditInfo.taxId}</span></span>}
                        {ticket.govCreditInfo.department && <span className="truncate">{ticket.govCreditInfo.department}</span>}
                      </div>
                      <div className="flex justify-between gap-1 text-indigo-800 font-semibold">
                        {ticket.govCreditInfo.orderNumber && <span>PO: {ticket.govCreditInfo.orderNumber}</span>}
                        {ticket.govCreditInfo.disbursementNumber && (
                          <span className="font-bold">เลขที่ฎีกา: {ticket.govCreditInfo.disbursementNumber}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Device Box */}
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200 space-y-0.5">
                  <div className="font-bold text-[8px] text-blue-800 border-b border-slate-200 pb-0.5">
                    ข้อมูลอุปกรณ์ (Device)
                  </div>
                  <p className="font-bold text-[9.5px] text-slate-900">{ticket.brand} {ticket.model}</p>
                  <p className="text-slate-700">
                    ประเภท: <span className="font-semibold">{DEVICE_LABELS[ticket.deviceType]?.label || ticket.deviceType}</span>
                    {ticket.serialNumber && <span> | S/N: <span className="font-mono">{ticket.serialNumber}</span></span>}
                  </p>
                  <p className="text-slate-600 truncate text-[8px]">
                    อุปกรณ์ติดมา: <span className="font-medium">{ticket.accessories?.join(', ') || 'ไม่มี'}</span>
                  </p>
                  {docType === 'invoice' && ticket.govCreditInfo && (
                    <div className="pt-0.5 border-t border-slate-200 text-[8px] space-y-0.2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">เครดิต: {ticket.govCreditInfo.creditDays} วัน</span>
                        <span className="font-mono font-bold text-blue-800">ครบกำหนด: {ticket.govCreditInfo.dueDate || '-'}</span>
                      </div>
                      {dueStatus && (
                        <div className="text-right">
                          <span className={`text-[7.5px] px-1 py-0.2 rounded border ${dueStatus.badgeClass}`}>
                            {dueStatus.badgeLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Problem & Diagnosis */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-[8.5px] space-y-0.5">
                <div className="flex justify-between items-start gap-1">
                  <div className="flex-1 truncate">
                    <span className="font-bold text-slate-800">อาการเสีย/งาน: </span>
                    <span className="text-slate-700 font-medium">{ticket.problemDescription}</span>
                  </div>
                  {ticket.initialConditionNotes && (
                    <div className="text-slate-500 shrink-0 text-[8px]">
                      <span>สภาพ: {ticket.initialConditionNotes}</span>
                    </div>
                  )}
                </div>

                {ticket.technicianNotes && (
                  <div className="pt-0.5 border-t border-slate-200/80 text-blue-900 truncate">
                    <span className="font-bold">ผลการตรวจเช็ค: </span>
                    <span>{ticket.technicianNotes}</span>
                    <span className="text-slate-500 ml-1">({ticket.technicianName || 'ช่างประจำร้าน'})</span>
                  </div>
                )}
              </div>

              {/* Items & Parts Table */}
              <div className="border border-slate-200 rounded overflow-hidden text-[8.5px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-0.5 px-1.5 w-6 text-center">#</th>
                      <th className="py-0.5 px-1.5">รายการค่าบริการและอะไหล่</th>
                      <th className="py-0.5 px-1.5 text-center w-10">จำนวน</th>
                      <th className="py-0.5 px-1.5 text-right w-14">หน่วยละ</th>
                      <th className="py-0.5 px-1.5 text-right w-16">รวม (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-0.5 px-1.5 text-center text-slate-400">1</td>
                      <td className="py-0.5 px-1.5 font-medium">ค่าบริการตรวจเช็คและค่าแรงซ่อมบำรุง</td>
                      <td className="py-0.5 px-1.5 text-center">1</td>
                      <td className="py-0.5 px-1.5 text-right">฿{(ticket.laborCost || 0).toLocaleString()}</td>
                      <td className="py-0.5 px-1.5 text-right font-semibold">฿{(ticket.laborCost || 0).toLocaleString()}</td>
                    </tr>
                    {ticket.partsUsed?.map((part, i) => (
                      <tr key={i}>
                        <td className="py-0.5 px-1.5 text-center text-slate-400">{i + 2}</td>
                        <td className="py-0.5 px-1.5 font-medium truncate max-w-[200px]">
                          {part.itemName} {part.itemCode && <span className="font-mono text-slate-400 text-[8px]">({part.itemCode})</span>}
                        </td>
                        <td className="py-0.5 px-1.5 text-center">{part.quantity}</td>
                        <td className="py-0.5 px-1.5 text-right">฿{part.unitPrice.toLocaleString()}</td>
                        <td className="py-0.5 px-1.5 text-right font-semibold">฿{part.totalPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pricing Totals & QR Code / Payment Area (Side-by-side) */}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                {/* Left: QR Codes / Account Info */}
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-around gap-1.5">
                  <div className="flex flex-col items-center text-center">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="Tracking QR"
                        className="w-11 h-11 bg-white p-0.5 rounded border border-slate-300"
                      />
                    ) : (
                      <div className="w-11 h-11 bg-slate-200 rounded flex items-center justify-center text-[7px]">QR</div>
                    )}
                    <span className="text-[7.5px] font-bold text-blue-900 mt-0.5">
                      เช็คสถานะสด
                    </span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    {promptPayQrUrl ? (
                      <img
                        src={promptPayQrUrl}
                        alt="PromptPay QR"
                        className="w-11 h-11 bg-white p-0.5 rounded border border-slate-300"
                      />
                    ) : (
                      <div className="w-11 h-11 bg-slate-200 rounded flex items-center justify-center text-[7px]">QR</div>
                    )}
                    <span className="text-[7.5px] font-bold text-emerald-900 mt-0.5">
                      พร้อมเพย์
                    </span>
                  </div>

                  <div className="text-[7.5px] text-slate-600 leading-tight space-y-0.2 pl-1 border-l border-slate-200">
                    <p className="font-mono font-bold text-slate-800">{shopSettings.promptPayId || '083-426-8058'}</p>
                    <p className="text-slate-500 truncate max-w-[85px]">{shopSettings.bankAccountName || shopSettings.shopName}</p>
                    {shopSettings.bankAccountNumber && (
                      <p className="font-mono text-slate-400">{shopSettings.bankAccountNumber}</p>
                    )}
                  </div>
                </div>

                {/* Right: Pricing Totals */}
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-[8.5px] space-y-0.5">
                  <div className="flex justify-between text-slate-600">
                    <span>ค่าแรง/บริการ:</span>
                    <span className="font-medium">฿{(ticket.laborCost || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ค่าอะไหล่รวม:</span>
                    <span className="font-medium">฿{(ticket.partsCost || 0).toLocaleString()}</span>
                  </div>
                  {(Number(ticket.discount) || 0) > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold text-[8px]">
                      <span>ส่วนลดพิเศษ:</span>
                      <span>-฿{(Number(ticket.discount) || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline text-[9.5px] font-black text-slate-900 pt-0.5 border-t border-slate-300">
                    <span>ยอดสุทธิทั้งสิ้น:</span>
                    <span className="text-blue-700 text-xs">฿{(ticket.totalAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-right text-[8px] text-slate-600 font-semibold truncate">
                    ({totalInBahtText})
                  </div>
                  <div className="text-right text-[7.5px] text-slate-500 pt-0.2">
                    {isGovCredit
                      ? `เครดิตราชการ (${ticket.govCreditInfo?.billingStatus === 'paid' ? 'ชำระแล้ว' : ticket.govCreditInfo?.billingStatus === 'billed' ? 'รอเบิกเงินฎีกา' : 'รอวางบิล'})`
                      : ticket.isPaid
                      ? '✓ ชำระเงินเรียบร้อยแล้ว'
                      : 'ชำระเมื่อรับเครื่อง'}
                  </div>
                </div>
              </div>

              {/* Official Warranty Details */}
              <div className="text-[8px] bg-slate-50 px-1.5 py-1 rounded border border-slate-200 leading-tight flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 truncate">
                  <span className="font-bold text-slate-900">🛡️ รับประกันงานซ่อม:</span>
                  <span className="text-blue-800 font-bold">
                    {(ticket.warrantyDays ?? 30) > 0 ? `${ticket.warrantyDays ?? 30} วัน` : 'ไม่มีประกัน'}
                  </span>
                  {ticket.warrantyExpiryDate && (ticket.warrantyDays ?? 30) > 0 && (
                    <span className="text-slate-500 font-mono">
                      (ถึง: {ticket.warrantyExpiryDate})
                    </span>
                  )}
                  <span className="text-slate-500 text-[7.5px] ml-1">
                    * รับประกันเฉพาะอาการเสียเดิมและอะไหล่ที่เปลี่ยนตามใบเสร็จ
                  </span>
                </div>
                {ticket.isWarrantyClaim && (
                  <span className="font-bold text-purple-800 bg-purple-100 px-1 py-0.2 rounded text-[7.5px] shrink-0">
                    เคลมประกัน {ticket.originalTicketNumber ? `(#${ticket.originalTicketNumber})` : ''}
                  </span>
                )}
              </div>

              {/* Signatures Section strictly in 1 single horizontal row */}
              {docType === 'quotation' ? (
                /* QUOTATION SIGNATURES: Provider & Approving Authority */
                <div className="pt-1 border-t border-slate-300">
                  <div className="grid grid-cols-2 gap-2 text-center text-[8px] text-slate-700">
                    <div className="border border-slate-200 p-1.5 rounded space-y-1">
                      <p className="font-bold text-blue-900">ผู้เสนอราคา (ทางร้าน)</p>
                      <div className="border-b border-dotted border-slate-400 mx-2 pt-2"></div>
                      <p>(........................................................)</p>
                      <p className="text-[7.5px] text-slate-400">{shopSettings.shopName} | วันที่: {todayThai}</p>
                    </div>

                    <div className="border border-blue-200 bg-blue-50/30 p-1.5 rounded space-y-0.5 text-left">
                      <div className="flex items-center gap-1 font-bold text-blue-950 pb-0.5 border-b border-blue-200 text-[8px]">
                        <CheckSquare className="w-3 h-3 text-blue-700 shrink-0" />
                        <span>ส่วนผู้อนุมัติสั่งจ้าง / ขออนุมัติงบประมาณ</span>
                      </div>
                      <p className="text-[7.5px] text-slate-600">
                        [ &nbsp; ] อนุมัติให้ดำเนินการซ่อมตามราคาที่เสนอ
                      </p>
                      <div className="border-b border-dotted border-slate-400 mx-1 pt-1.5"></div>
                      <p className="text-center text-[7.5px] pt-0.5">(........................................................)</p>
                      <p className="text-[7px] text-slate-400 text-center">หัวหน้าหน่วยงาน / วันที่ ...... / ...... / ..........</p>
                    </div>
                  </div>
                </div>
              ) : isGovCredit ? (
                /* GOVERNMENT CREDIT SIGNATURES: Strictly 1 Single Horizontal Row with 3 Boxes */
                <div className="pt-1 border-t border-slate-300">
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[8px] text-slate-700">
                    <div className="border border-slate-200 p-1 rounded space-y-1">
                      <p className="font-bold text-[8px]">ผู้ส่งมอบงาน / ผู้วางบิล</p>
                      <div className="border-b border-dotted border-slate-400 mx-1.5 pt-2"></div>
                      <p>(................................................)</p>
                      <p className="text-[7px] text-slate-400 truncate">{shopSettings.shopName}</p>
                    </div>

                    <div className="border border-slate-200 p-1 rounded space-y-1">
                      <p className="font-bold text-[8px]">ผู้รับมอบงาน / ผู้ตรวจงาน</p>
                      <div className="border-b border-dotted border-slate-400 mx-1.5 pt-2"></div>
                      <p>(................................................)</p>
                      <p className="text-[7px] text-slate-400 truncate">{ticket.govCreditInfo?.agencyName || ticket.customerName}</p>
                    </div>

                    <div className="border border-slate-200 p-1 rounded space-y-1">
                      <p className="font-bold text-[8px]">กรรมการตรวจรับพัสดุ</p>
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
                    <p className="text-[8px] text-slate-600 font-bold">( {ticket.customerName} )</p>
                    <p className="text-[7.5px] text-slate-400">ลูกค้าผู้ส่งซ่อม / ผู้รับมอบเครื่อง</p>
                  </div>

                  <div className="border border-slate-200 p-1.5 rounded space-y-1">
                    <p className="font-medium">ลงชื่อ .....................................................</p>
                    <p className="text-[8px] text-slate-600 font-bold">( {ticket.technicianName || 'ช่างผู้รับผิดชอบ'} )</p>
                    <p className="text-[7.5px] text-slate-400">{shopSettings.shopName}</p>
                  </div>
                </div>
              )}
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
