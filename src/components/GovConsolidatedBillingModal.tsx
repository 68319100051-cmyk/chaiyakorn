import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { RepairTicket, POSSaleRecord, ShopSettings, GovBillingStatus, GovDocumentType } from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { bahtText } from '../utils/bahtText';
import { dbService } from '../services/db';
import { getGovCreditDueStatus, CREDIT_DAYS_PRESETS } from '../utils/govCredit';
import { formatThaiDateFull, formatTodayThaiFull, formatMoneyPlain, printWithCleanTitle } from '../utils/printHelpers';
import { useA5FitToPage } from '../utils/useA5FitToPage';
import { getTicketAllParts } from '../utils/ticketDevices';
import {
  X,
  Printer,
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  QrCode,
  ArrowRight,
  FileCheck,
  Receipt,
  Wrench,
  Search,
  Calendar,
  AlertTriangle,
  Edit3,
  CreditCard,
  Save,
  Check,
  Info,
  DollarSign,
  Scissors
} from 'lucide-react';
import { Barcode } from './Barcode';

export interface ConsolidatedBillItem {
  source: 'pos' | 'repair';
  id: string;
  docNumber: string;
  date: string;
  rawDate: string;
  agencyName: string;
  taxId: string;
  department: string;
  orderNumber: string;
  contactPerson: string;
  contactPhone: string;
  creditDays: number;
  dueDate: string;
  billingStatus: GovBillingStatus;
  billedDate?: string;
  paidDate?: string;
  disbursementNumber?: string;
  disbursementDate?: string;
  transferRef?: string;
  notes?: string;
  itemsDescription: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
}

export interface ConsolidatedAgencyGroup {
  groupKey: string;
  taxId: string;
  agencyName: string;
  department: string;
  contactPerson: string;
  contactPhone: string;
  bills: ConsolidatedBillItem[];
  totalBills: number;
  totalSubtotal: number;
  totalDiscount: number;
  grandTotal: number;
  pendingCount: number;
  billedCount: number;
  paidCount: number;
  overdueCount: number;
}

interface GovConsolidatedBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: RepairTicket[];
  posSales: POSSaleRecord[];
  shopSettings: ShopSettings;
}

interface GovSheetChunk {
  sheetDocNo: string;
  sheetIndex: number;
  totalSheets: number;
  bills: ConsolidatedBillItem[];
  sheetSubtotal: number;
  sheetDiscount: number;
  sheetGrandTotal: number;
}

interface A5GovStatementSheetProps {
  shopSettings: ShopSettings;
  selectedGroup: ConsolidatedAgencyGroup;
  docType: GovDocumentType;
  activeDocTitle: string;
  todayThaiDate: string;
  chunk: GovSheetChunk;
  isSplitSheet: boolean;
  grandTotalAllSheets: number;
  promptPayQrUrl: string;
  selectedBillIds: Set<string>;
  toggleBillSelection: (id: string) => void;
  handleOpenDisbursementModal: (bill: ConsolidatedBillItem) => void;
  resetDeps: unknown[];
  onFitReport?: (sheetIndex: number, isOverflowing: boolean, measuredMm: number, fitLevel: number) => void;
}

const A5GovStatementSheet: React.FC<A5GovStatementSheetProps> = ({
  shopSettings,
  selectedGroup,
  docType,
  activeDocTitle,
  todayThaiDate,
  chunk,
  isSplitSheet,
  grandTotalAllSheets,
  promptPayQrUrl,
  selectedBillIds,
  toggleBillSelection,
  handleOpenDisbursementModal,
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
    [...resetDeps, chunk.sheetDocNo, chunk.bills.length]
  );

  useEffect(() => {
    onFitReport?.(chunk.sheetIndex, isOverflowing, measuredContentMm, fitLevel);
  }, [chunk.sheetIndex, isOverflowing, measuredContentMm, fitLevel, onFitReport]);

  const sheetBahtText = useMemo(() => bahtText(chunk.sheetGrandTotal), [chunk.sheetGrandTotal]);
  const condenseLines = fitLevel >= 4;

  return (
    <div className="flex flex-col items-center w-full print:block">
      {isSplitSheet && (
        <div className="mb-1.5 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold print:hidden">
          ใบที่ {chunk.sheetIndex + 1} / {chunk.totalSheets} — เลขที่ {chunk.sheetDocNo}
        </div>
      )}

      <div
        ref={paperRef}
        id={chunk.sheetIndex === 0 ? 'gov-consolidated-statement' : `gov-consolidated-statement-${chunk.sheetIndex + 1}`}
        data-fit-level={fitLevel}
        data-overflowing={isOverflowing ? 'true' : 'false'}
        data-measured-mm={measuredContentMm}
        className={`a5-portrait-paper a5-fit-${fitLevel} shadow-2xl ring-1 ring-slate-300 print:ring-0 mx-auto flex flex-col justify-between`}
      >
        {/* TOP + MIDDLE: Header, Gov Info & Bills Table */}
        <div ref={topRef} className="a5-top-content">
          {/* Header: Shop Information (NO TOP BARCODE, NO TOP LINE, NEVER SHRINKS) */}
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
              <div className="text-[9pt] font-normal text-slate-900">
                เลขที่ <span className="font-mono text-[9.5pt] font-bold text-slate-950">{chunk.sheetDocNo}</span>
              </div>
              {isSplitSheet && (
                <div className="text-[9pt] font-bold text-slate-900">
                  แผ่นที่ {chunk.sheetIndex + 1}/{chunk.totalSheets}
                </div>
              )}
              <div className="text-[9pt] font-normal text-slate-900">
                วันที่: {todayThaiDate}
              </div>
            </div>
          </div>

          {/* Document Title Banner (NO TOP BORDER, BOTTOM LINE ONLY) */}
          <div className="a5-doc-banner a5-keep-together">
            <h2 className="text-[10.5pt] font-bold tracking-wide text-slate-950">
              {activeDocTitle}
              {isSplitSheet ? ` (ใบย่อย ${chunk.sheetIndex + 1}/${chunk.totalSheets})` : ''}
            </h2>
          </div>

          {/* Government Customer Information Box */}
          <div className="a5-section-box bg-slate-50/70 space-y-0.5 font-normal text-slate-900 a5-keep-together">
            <div className="flex justify-between gap-2 flex-wrap">
              <div className="break-words">
                <span className="font-bold text-slate-950">หน่วยงาน: </span>
                <span className="font-bold text-slate-950">{selectedGroup.agencyName}</span>
              </div>
              <div>
                <span>เลขภาษี 13 หลัก: </span>
                <span className="font-mono">{selectedGroup.taxId || '-'}</span>
              </div>
            </div>
            <div className="flex justify-between gap-2 flex-wrap">
              <div>
                <span>ฝ่าย/งาน: </span>
                <span>{selectedGroup.department || 'งานพัสดุ'}</span>
              </div>
              <div>
                <span>ผู้ติดต่อ: </span>
                <span>{selectedGroup.contactPerson || '-'} {selectedGroup.contactPhone ? `(${selectedGroup.contactPhone})` : ''}</span>
              </div>
            </div>
          </div>

          {/* Consolidated Bills Table (100% print width, NO '฿' SYMBOL ANYWHERE) */}
          <div className="a5-items-table border border-slate-500">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-200 border-b border-slate-500 text-slate-950 font-bold">
                <tr>
                  <th className="py-1.5 px-1 text-center w-[6%] print:hidden">เลือก</th>
                  <th className="py-1.5 px-1 text-center w-[7%] print:w-[7%] border-r border-slate-400">ที่</th>
                  <th className="py-1.5 px-1.5 w-[20%] print:w-[21%] border-r border-slate-400">วันที่</th>
                  <th className="py-1.5 px-1.5 w-[19%] print:w-[21%] border-r border-slate-400">เลขที่เอกสาร</th>
                  <th className="py-1.5 px-1.5 w-[26%] print:w-[34%] border-r border-slate-400">รายการ</th>
                  <th className="py-1.5 px-1.5 text-right w-[16%] print:w-[17%]">รวม (บาท)</th>
                  <th className="py-1.5 px-1 text-center w-[6%] print:hidden">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-normal text-slate-900">
                {chunk.bills.map((bill, idx) => {
                  const isIncluded = selectedBillIds.has(bill.id);
                  return (
                    <tr
                      key={bill.id}
                      className={`a5-keep-together ${isIncluded ? 'bg-white' : 'bg-slate-50/70 text-slate-400 print:hidden'}`}
                    >
                      <td className="py-1.5 px-1 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => toggleBillSelection(bill.id)}
                          className="cursor-pointer text-purple-600"
                        >
                          {isIncluded ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                      </td>
                      <td className="py-1.5 px-1 text-center border-r border-slate-300">{idx + 1}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 break-words">{bill.date}</td>
                      <td className="py-1.5 px-1.5 font-mono border-r border-slate-300 break-words">
                        {bill.docNumber}
                        {bill.disbursementNumber ? ` (${bill.disbursementNumber})` : ''}
                      </td>
                      <td className={`py-1.5 px-1.5 border-r border-slate-300 ${condenseLines ? 'truncate' : 'break-words'}`}>
                        {bill.itemsDescription}
                      </td>
                      <td className="py-1.5 px-1.5 text-right text-slate-950 tabular-nums">
                        {formatMoneyPlain(bill.totalAmount, 2)}
                      </td>
                      <td className="py-1.5 px-1 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => handleOpenDisbursementModal(bill)}
                          className="p-0.5 rounded hover:bg-slate-100 text-slate-500 hover:text-indigo-600"
                          title="แก้ไขฎีกา"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Totals & PromptPay Section */}
          <div className="a5-totals-box grid grid-cols-12 gap-2.5 a5-keep-together">
            <div className="a5-info-box-cell col-span-6 p-2 border border-slate-500 bg-slate-50 flex items-center justify-between gap-2">
              <div className="space-y-0.5 min-w-0 font-normal text-slate-900">
                <p className="font-bold text-slate-950">ธนาคาร{shopSettings.bankName || 'กสิกรไทย'}</p>
                <p className="font-bold text-slate-950 break-words">{shopSettings.bankAccountName || shopSettings.shopName}</p>
                <p>พร้อมเพย์ {shopSettings.promptPayId || '0834268058'}</p>
                {isSplitSheet && (
                  <p className="text-[9pt] text-slate-800">รวมทุกใบ {formatMoneyPlain(grandTotalAllSheets, 2)} บาท</p>
                )}
              </div>
              {promptPayQrUrl && (
                <div className="shrink-0 flex flex-col items-center">
                  <div className="w-[20mm] h-[20mm] p-0.5 bg-white border border-slate-400 flex items-center justify-center">
                    <img src={promptPayQrUrl} alt="PromptPay QR" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[9pt] font-normal text-slate-900 mt-0.5">พร้อมเพย์</span>
                </div>
              )}
            </div>

            <div className="a5-info-box-cell col-span-6 p-2 border border-slate-500 bg-slate-50 space-y-0.5 tabular-nums font-normal flex flex-col justify-between">
              <div className="space-y-0.5">
                <div className="flex justify-between text-slate-900">
                  <span>{isSplitSheet ? `รวมใบนี้ (${chunk.bills.length} บิล)` : `รวม (${chunk.bills.length} บิล)`}</span>
                  <span>{formatMoneyPlain(chunk.sheetSubtotal, 2)}</span>
                </div>
                {chunk.sheetDiscount > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>ส่วนลด</span>
                    <span>-{formatMoneyPlain(chunk.sheetDiscount, 2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1 border-t-2 border-slate-800 font-bold text-[10pt] text-slate-950">
                  <span>{isSplitSheet ? 'รวมสุทธิใบนี้ (บาท)' : 'รวมสุทธิ (บาท)'}</span>
                  <span className="text-[10.5pt]">{formatMoneyPlain(chunk.sheetGrandTotal, 2)}</span>
                </div>
              </div>
              <div className="text-right font-bold text-[9pt] text-slate-950">
                ({sheetBahtText})
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: ENLARGED SIGNATURES + CLEAN STUB (NEVER SHRINKS) */}
        <div ref={bottomRef} className="a5-bottom-content a5-keep-together">
          {docType === 'quotation' ? (
            <div className="grid grid-cols-2 gap-3 text-center text-[9pt]">
              <div className="a5-sign-box">
                <p className="font-bold text-slate-950">ผู้เสนอราคา</p>
                <div className="flex-1" />
                <p className="font-bold text-slate-950">( ร้านพัทลุงปริ้นเตอร์ )</p>
              </div>
              <div className="a5-sign-box">
                <p className="font-bold text-slate-950">ผู้อนุมัติ / หน่วยงาน</p>
                <div className="flex-1" />
                <p className="font-bold text-slate-950 truncate">( {selectedGroup.agencyName} )</p>
              </div>
            </div>
          ) : docType === 'receipt' ? (
            <div className="grid grid-cols-2 gap-3 text-center text-[9pt]">
              <div className="a5-sign-box">
                <p className="font-bold text-slate-950">ผู้จ่ายเงิน / เจ้าหน้าที่การเงิน</p>
                <div className="flex-1" />
                <p className="font-bold text-slate-950 truncate">( {selectedGroup.agencyName} )</p>
              </div>
              <div className="a5-sign-box">
                <p className="font-bold text-slate-950">ผู้รับเงิน</p>
                <div className="flex-1" />
                <p className="font-bold text-slate-950">( ร้านพัทลุงปริ้นเตอร์ )</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-center text-[9pt]">
              <div className="a5-sign-box">
                <p className="font-bold text-slate-950">ผู้วางบิล / ผู้ส่งมอบ</p>
                <div className="flex-1" />
                <p className="font-bold text-slate-950">( ร้านพัทลุงปริ้นเตอร์ )</p>
              </div>
              <div className="a5-sign-box">
                <p className="font-bold text-slate-950">ผู้รับวางบิล / พัสดุ</p>
                <div className="flex-1" />
                <p className="font-bold text-slate-950 truncate">( {selectedGroup.agencyName} )</p>
              </div>
              <div className="a5-sign-box">
                <p className="font-bold text-slate-950">กรรมการตรวจรับ</p>
                <div className="flex-1" />
                <p className="font-normal text-slate-950">( .................................... )</p>
              </div>
            </div>
          )}

          {/* Tear-off Stub: ONLY Doc No, Barcode, Customer/Agency Name */}
          <div className="pt-1.5 border-t-2 border-dashed border-slate-500">
            <div className="border border-slate-500 px-3 py-1.5 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="text-[9.5pt] font-bold text-slate-950">
                  เลขที่เอกสาร: <span className="font-mono">{chunk.sheetDocNo}</span>
                </div>
                <div className="text-[9.5pt] font-bold text-slate-950 truncate">
                  ชื่อลูกค้า: {selectedGroup.agencyName}
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

export const GovConsolidatedBillingModal: React.FC<GovConsolidatedBillingModalProps> = ({
  isOpen,
  onClose,
  tickets,
  posSales,
  shopSettings
}) => {
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>('');
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_billing' | 'billed' | 'paid' | 'overdue'>('all');
  const [docType, setDocType] = useState<GovDocumentType>('invoice');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  
  // Disbursement Record Modal / Drawer State
  const [isDisbursementModalOpen, setIsDisbursementModalOpen] = useState<boolean>(false);
  const [targetBillForEdit, setTargetBillForEdit] = useState<ConsolidatedBillItem | null>(null); // null = edit all active selected bills
  const [formDisbursementNumber, setFormDisbursementNumber] = useState<string>('');
  const [formDisbursementDate, setFormDisbursementDate] = useState<string>('');
  const [formBillingStatus, setFormBillingStatus] = useState<GovBillingStatus>('billed');
  const [formPaidDate, setFormPaidDate] = useState<string>('');
  const [formTransferRef, setFormTransferRef] = useState<string>('');
  const [formCreditDays, setFormCreditDays] = useState<number>(30);
  const [formDueDate, setFormDueDate] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [splitBillLimit, setSplitBillLimit] = useState<number>(6);
  const [singleOverflowInfo, setSingleOverflowInfo] = useState<{
    isOverflowing: boolean;
    measuredMm: number;
    fitLevel: number;
  }>({ isOverflowing: false, measuredMm: 0, fitLevel: 0 });
  const [splitOverflows, setSplitOverflows] = useState<Record<number, boolean>>({});
  const printAreaRef = useRef<HTMLDivElement>(null);

  // 1. Extract and normalize all Government Credit bills from POS and Repair Tickets
  const allGovBills = useMemo<ConsolidatedBillItem[]>(() => {
    const list: ConsolidatedBillItem[] = [];

    // From POS Sales
    for (const sale of posSales) {
      if (sale.paymentMethod === 'gov_credit') {
        const info = sale.govCreditInfo;
        const itemsDesc = sale.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
        list.push({
          source: 'pos',
          id: sale.id,
          docNumber: sale.receiptNumber,
          date: formatThaiDateFull(sale.createdAt),
          rawDate: sale.createdAt,
          agencyName: info?.agencyName || sale.customerName || 'ส่วนราชการ',
          taxId: (info?.taxId || '').replace(/[^0-9]/g, ''),
          department: info?.department || '',
          orderNumber: info?.orderNumber || '-',
          contactPerson: info?.contactPerson || '',
          contactPhone: info?.contactPhone || sale.customerPhone || '',
          creditDays: info?.creditDays || 30,
          dueDate: info?.dueDate || '',
          billingStatus: info?.billingStatus || 'pending_billing',
          billedDate: info?.billedDate,
          paidDate: info?.paidDate,
          disbursementNumber: info?.disbursementNumber,
          disbursementDate: info?.disbursementDate,
          transferRef: info?.transferRef,
          notes: info?.notes,
          itemsDescription: itemsDesc || 'พัสดุขายหน้าร้าน',
          subtotal: sale.subtotal,
          discount: sale.discount,
          totalAmount: sale.totalAmount
        });
      }
    }

    // From Repair Tickets
    for (const ticket of tickets) {
      if (ticket.paymentMethod === 'gov_credit') {
        const info = ticket.govCreditInfo;
        const partsDesc = getTicketAllParts(ticket).map(p => `${p.itemName} (x${p.quantity})`).join(', ');
        const serviceDesc = partsDesc
          ? `บริการซ่อม ${ticket.brand} ${ticket.model} (${partsDesc})`
          : `บริการตรวจเช็คและซ่อม ${ticket.brand} ${ticket.model} - ${ticket.problemDescription}`;

        list.push({
          source: 'repair',
          id: ticket.id,
          docNumber: ticket.ticketNumber,
          date: formatThaiDateFull(ticket.receivedDate || ticket.createdAt),
          rawDate: ticket.receivedDate || ticket.createdAt,
          agencyName: info?.agencyName || ticket.customerName || 'ส่วนราชการ',
          taxId: (info?.taxId || '').replace(/[^0-9]/g, ''),
          department: info?.department || '',
          orderNumber: info?.orderNumber || '-',
          contactPerson: info?.contactPerson || '',
          contactPhone: info?.contactPhone || ticket.customerPhone || '',
          creditDays: info?.creditDays || 30,
          dueDate: info?.dueDate || '',
          billingStatus: info?.billingStatus || (ticket.isPaid ? 'paid' : 'pending_billing'),
          billedDate: info?.billedDate,
          paidDate: info?.paidDate,
          disbursementNumber: info?.disbursementNumber,
          disbursementDate: info?.disbursementDate,
          transferRef: info?.transferRef,
          notes: info?.notes,
          itemsDescription: serviceDesc,
          subtotal: (ticket.laborCost || 0) + (ticket.partsCost || 0),
          discount: Number(ticket.discount) || 0,
          totalAmount: ticket.totalAmount
        });
      }
    }

    return list.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
  }, [posSales, tickets]);

  // Overall counts across all bills
  const globalCounts = useMemo(() => {
    let pending = 0;
    let billed = 0;
    let paid = 0;
    let overdue = 0;

    for (const b of allGovBills) {
      if (b.billingStatus === 'paid') {
        paid++;
      } else {
        const dueInfo = getGovCreditDueStatus(b.dueDate, b.billingStatus);
        if (dueInfo.isOverdue) {
          overdue++;
        }
        if (b.billingStatus === 'billed') {
          billed++;
        } else {
          pending++;
        }
      }
    }
    return { all: allGovBills.length, pending, billed, paid, overdue };
  }, [allGovBills]);

  // 2. Group bills by Tax ID (CRITICAL: "ถ้า เลขผู้เสียภาษี ในแต่ละบิล ตรงกัน ให้มารวมเป็นบิลเดียว และรวมยอดต่างๆของทุกบิลที่เลขตรงกัน")
  const groupedAgencies = useMemo<ConsolidatedAgencyGroup[]>(() => {
    const groupMap = new Map<string, ConsolidatedBillItem[]>();

    for (const bill of allGovBills) {
      const cleanTax = bill.taxId.trim();
      const key = cleanTax.length >= 5
        ? `tax-${cleanTax}`
        : `agency-${bill.agencyName.trim().toLowerCase()}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(bill);
    }

    const groups: ConsolidatedAgencyGroup[] = [];

    groupMap.forEach((bills, key) => {
      const primaryBill = bills[0];
      const totalSubtotal = bills.reduce((sum, b) => sum + b.subtotal, 0);
      const totalDiscount = bills.reduce((sum, b) => sum + b.discount, 0);
      const grandTotal = bills.reduce((sum, b) => sum + b.totalAmount, 0);

      const pendingCount = bills.filter(b => b.billingStatus === 'pending_billing').length;
      const billedCount = bills.filter(b => b.billingStatus === 'billed').length;
      const paidCount = bills.filter(b => b.billingStatus === 'paid').length;
      const overdueCount = bills.filter(b => {
        if (b.billingStatus === 'paid') return false;
        const d = getGovCreditDueStatus(b.dueDate, b.billingStatus);
        return d.isOverdue;
      }).length;

      groups.push({
        groupKey: key,
        taxId: primaryBill.taxId,
        agencyName: primaryBill.agencyName,
        department: primaryBill.department || bills.find(b => b.department)?.department || 'งานพัสดุ',
        contactPerson: primaryBill.contactPerson || bills.find(b => b.contactPerson)?.contactPerson || '',
        contactPhone: primaryBill.contactPhone || bills.find(b => b.contactPhone)?.contactPhone || '',
        bills,
        totalBills: bills.length,
        totalSubtotal,
        totalDiscount,
        grandTotal,
        pendingCount,
        billedCount,
        paidCount,
        overdueCount
      });
    });

    return groups.sort((a, b) => b.grandTotal - a.grandTotal);
  }, [allGovBills]);

  // Set default selected group
  useEffect(() => {
    if (groupedAgencies.length > 0) {
      if (!selectedGroupKey || !groupedAgencies.some(g => g.groupKey === selectedGroupKey)) {
        const firstKey = groupedAgencies[0].groupKey;
        setSelectedGroupKey(firstKey);
        setSelectedBillIds(new Set(groupedAgencies[0].bills.map(b => b.id)));
      }
    }
  }, [groupedAgencies, selectedGroupKey]);

  // When group changes, select all bills of that group by default
  const handleSelectGroup = (group: ConsolidatedAgencyGroup) => {
    setSelectedGroupKey(group.groupKey);
    setSelectedBillIds(new Set(group.bills.map(b => b.id)));
  };

  const selectedGroup = useMemo(() => {
    return groupedAgencies.find(g => g.groupKey === selectedGroupKey) || null;
  }, [groupedAgencies, selectedGroupKey]);

  // Filter bills inside selected group based on checkbox selection AND active statusFilter
  const activeStatementBills = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.bills.filter(b => {
      const isSelected = selectedBillIds.has(b.id);
      if (!isSelected) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'pending_billing') return b.billingStatus === 'pending_billing';
      if (statusFilter === 'billed') return b.billingStatus === 'billed';
      if (statusFilter === 'paid') return b.billingStatus === 'paid';
      if (statusFilter === 'overdue') {
        if (b.billingStatus === 'paid') return false;
        return getGovCreditDueStatus(b.dueDate, b.billingStatus).isOverdue;
      }
      return true;
    });
  }, [selectedGroup, selectedBillIds, statusFilter]);

  const statementSubtotal = activeStatementBills.reduce((sum, b) => sum + b.subtotal, 0);
  const statementDiscount = activeStatementBills.reduce((sum, b) => sum + b.discount, 0);
  const statementGrandTotal = activeStatementBills.reduce((sum, b) => sum + b.totalAmount, 0);
  const statementBahtText = useMemo(() => bahtText(statementGrandTotal), [statementGrandTotal]);

  // Generate PromptPay QR Code for the consolidated grand total
  useEffect(() => {
    if (statementGrandTotal > 0) {
      const target = shopSettings.promptPayId || shopSettings.shopPhone || '0834268058';
      generatePromptPayQRDataUrl(target, statementGrandTotal, { width: 180 })
        .then(url => setPromptPayQrUrl(url))
        .catch(err => console.error('Failed to generate PromptPay QR:', err));
    } else {
      setPromptPayQrUrl('');
    }
  }, [statementGrandTotal, shopSettings]);

  // Reset split mode when group/filter/docType changes
  useEffect(() => {
    setIsSplitMode(false);
    setSplitBillLimit(6);
    setSplitOverflows({});
  }, [selectedGroupKey, statusFilter, docType, selectedBillIds]);

  useEffect(() => {
    if (!isSplitMode) return;
    const anySplitOverflow = Object.values(splitOverflows).some(Boolean);
    if (anySplitOverflow && splitBillLimit > 1) {
      setSplitOverflows({});
      setSplitBillLimit(prev => Math.max(1, prev - 1));
    }
  }, [isSplitMode, splitOverflows, splitBillLimit]);

  const todayThaiDate = formatTodayThaiFull();
  const docSeq = (selectedGroup?.taxId || 'GOV').slice(-6) + '-' + new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const documentNumbers: Record<GovDocumentType, string> = {
    quotation: `QT-GOV-${docSeq}`,
    invoice: `INV-GOV-${docSeq}`,
    receipt: `REC-GOV-${docSeq}`,
    work_order: `BILL-GOV-${docSeq}`
  };
  const activeStatementDocNo = documentNumbers[docType] || documentNumbers.invoice;

  const sheetChunks: GovSheetChunk[] = useMemo(() => {
    if (!selectedGroup) return [];
    const previewBills = isSplitMode ? activeStatementBills : selectedGroup.bills;
    if (!isSplitMode) {
      return [
        {
          sheetDocNo: activeStatementDocNo,
          sheetIndex: 0,
          totalSheets: 1,
          bills: previewBills,
          sheetSubtotal: statementSubtotal,
          sheetDiscount: statementDiscount,
          sheetGrandTotal: statementGrandTotal
        }
      ];
    }

    const groups: ConsolidatedBillItem[][] = [];
    const perPage = Math.max(1, splitBillLimit);
    for (let i = 0; i < activeStatementBills.length; i += perPage) {
      groups.push(activeStatementBills.slice(i, i + perPage));
    }
    return groups.map((bills, idx) => ({
      sheetDocNo: `${activeStatementDocNo}-${idx + 1}`,
      sheetIndex: idx,
      totalSheets: groups.length,
      bills,
      sheetSubtotal: bills.reduce((sum, b) => sum + b.subtotal, 0),
      sheetDiscount: bills.reduce((sum, b) => sum + b.discount, 0),
      sheetGrandTotal: bills.reduce((sum, b) => sum + b.totalAmount, 0)
    }));
  }, [
    selectedGroup,
    isSplitMode,
    activeStatementBills,
    activeStatementDocNo,
    statementSubtotal,
    statementDiscount,
    statementGrandTotal,
    splitBillLimit
  ]);

  const handleSingleFitReport = useCallback(
    (_sheetIndex: number, isOverflowing: boolean, measuredMm: number, fitLevel: number) => {
      setSingleOverflowInfo({ isOverflowing, measuredMm, fitLevel });
    },
    []
  );

  const handleSplitFitReport = useCallback((sheetIndex: number, isOverflowing: boolean) => {
    setSplitOverflows(prev => {
      if (prev[sheetIndex] === isOverflowing) return prev;
      return { ...prev, [sheetIndex]: isOverflowing };
    });
  }, []);

  if (!isOpen) return null;

  const toggleBillSelection = (billId: string) => {
    setSelectedBillIds(prev => {
      const next = new Set(prev);
      if (next.has(billId)) {
        if (next.size > 1) {
          next.delete(billId);
        } else {
          alert('ต้องเลือกอย่างน้อย 1 รายการเพื่อรวมบิล');
        }
      } else {
        next.add(billId);
      }
      return next;
    });
  };

  const selectAllBillsInGroup = () => {
    if (selectedGroup) {
      setSelectedBillIds(new Set(selectedGroup.bills.map(b => b.id)));
    }
  };

  const isPrintBlocked = !isSplitMode && singleOverflowInfo.isOverflowing;

  const handlePrint = () => {
    if (isPrintBlocked) return;
    printWithCleanTitle(`${activeDocTitle.th}-${activeStatementDocNo}`);
  };

  // Open Disbursement Recording Modal
  const handleOpenDisbursementModal = (bill?: ConsolidatedBillItem) => {
    if (bill) {
      setTargetBillForEdit(bill);
      setFormDisbursementNumber(bill.disbursementNumber || '');
      setFormDisbursementDate(bill.disbursementDate || new Date().toISOString().split('T')[0]);
      setFormBillingStatus(bill.billingStatus);
      setFormPaidDate(bill.paidDate || (bill.billingStatus === 'paid' ? new Date().toISOString().split('T')[0] : ''));
      setFormTransferRef(bill.transferRef || '');
      setFormCreditDays(bill.creditDays || 30);
      setFormDueDate(bill.dueDate || '');
      setFormNotes(bill.notes || '');
    } else {
      // Batch mode for active bills
      if (activeStatementBills.length === 0) {
        alert('กรุณาเลือกบิลอย่างน้อย 1 รายการเพื่อบันทึกข้อมูล');
        return;
      }
      setTargetBillForEdit(null);
      // Pre-fill with common or latest data
      const sample = activeStatementBills[0];
      setFormDisbursementNumber(sample.disbursementNumber || '');
      setFormDisbursementDate(sample.disbursementDate || new Date().toISOString().split('T')[0]);
      setFormBillingStatus(sample.billingStatus === 'paid' ? 'paid' : 'billed');
      setFormPaidDate(sample.paidDate || '');
      setFormTransferRef(sample.transferRef || '');
      setFormCreditDays(sample.creditDays || 30);
      setFormDueDate(sample.dueDate || '');
      setFormNotes(sample.notes || '');
    }
    setIsDisbursementModalOpen(true);
  };

  // Save Disbursement Info to Database
  const handleSaveDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBills = targetBillForEdit ? [targetBillForEdit] : activeStatementBills;
    if (targetBills.length === 0) return;

    try {
      setIsUpdatingStatus(true);
      const extraPayload = {
        disbursementNumber: formDisbursementNumber.trim() || undefined,
        disbursementDate: formDisbursementDate.trim() || undefined,
        paidDate: formBillingStatus === 'paid' ? (formPaidDate.trim() || new Date().toISOString().split('T')[0]) : undefined,
        billedDate: (formBillingStatus === 'billed' || formBillingStatus === 'paid') ? new Date().toISOString().split('T')[0] : undefined,
        transferRef: formTransferRef.trim() || undefined,
        creditDays: formCreditDays || 30,
        dueDate: formDueDate.trim() || undefined,
        notes: formNotes.trim() || undefined
      };

      for (const bill of targetBills) {
        if (bill.source === 'pos') {
          await dbService.updatePOSSaleBillingStatus(bill.id, formBillingStatus, extraPayload);
        } else {
          await dbService.updateTicketBillingStatus(bill.id, formBillingStatus, extraPayload);
        }
      }

      setIsDisbursementModalOpen(false);
    } catch (err) {
      console.error('Failed to update disbursement information:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Batch update billing status for all currently active/selected bills in this group
  const handleBatchUpdateStatus = async (targetStatus: GovBillingStatus) => {
    if (activeStatementBills.length === 0) return;

    const label = targetStatus === 'billed' ? 'รอเบิกเงินฎีกา / วางบิลแล้ว' : targetStatus === 'paid' ? 'ชำระเงิน/เงินโอนเข้าแล้ว' : 'ค้างชำระ / รอวางบิล';
    const confirmed = window.confirm(`ต้องการปรับสถานะทั้ง ${activeStatementBills.length} บิล เป็น "${label}" หรือไม่?`);
    if (!confirmed) return;

    try {
      setIsUpdatingStatus(true);
      const now = new Date().toISOString().split('T')[0];
      for (const bill of activeStatementBills) {
        const extraPayload = targetStatus === 'paid'
          ? { paidDate: bill.paidDate || now }
          : targetStatus === 'billed'
          ? { billedDate: bill.billedDate || now }
          : {};

        if (bill.source === 'pos') {
          await dbService.updatePOSSaleBillingStatus(bill.id, targetStatus, extraPayload);
        } else {
          await dbService.updateTicketBillingStatus(bill.id, targetStatus, extraPayload);
        }
      }
    } catch (err) {
      console.error('Failed to batch update billing status:', err);
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Filter groups in sidebar by search and active status filter
  const filteredGroups = groupedAgencies.filter(g => {
    // 1. Search term filter
    const term = searchTerm.trim().toLowerCase();
    const matchSearch = !term || (
      g.agencyName.toLowerCase().includes(term) ||
      g.taxId.includes(term) ||
      g.department.toLowerCase().includes(term) ||
      g.bills.some(b => 
        b.docNumber.toLowerCase().includes(term) || 
        b.orderNumber.toLowerCase().includes(term) ||
        (b.disbursementNumber && b.disbursementNumber.toLowerCase().includes(term))
      )
    );

    if (!matchSearch) return false;

    // 2. Status filter
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending_billing') return g.pendingCount > 0;
    if (statusFilter === 'billed') return g.billedCount > 0;
    if (statusFilter === 'paid') return g.paidCount > 0;
    if (statusFilter === 'overdue') return g.overdueCount > 0;

    return true;
  });

  const documentTitles: Record<GovDocumentType, { th: string; en: string; badge: string; desc: string }> = {
    quotation: {
      th: 'ใบเสนอราคา',
      en: 'CONSOLIDATED QUOTATION',
      badge: 'bg-blue-800 text-white',
      desc: 'เอกสารเสนอราคารวมเพื่อขออนุมัติงบประมาณก่อนดำเนินการซ่อมและส่งมอบพัสดุ'
    },
    invoice: {
      th: 'ใบแจ้งหนี้',
      en: 'CONSOLIDATED INVOICE',
      badge: 'bg-purple-900 text-white',
      desc: 'เอกสารเรียกเก็บเงินตามระเบียบพัสดุราชการ รวมบิลตามเลขประจำตัวผู้เสียภาษี'
    },
    receipt: {
      th: 'ใบเสร็จรับเงิน',
      en: 'CONSOLIDATED RECEIPT',
      badge: 'bg-emerald-800 text-white',
      desc: 'เอกสารใบเสร็จรับเงินอย่างเป็นทางการเมื่อเงินโอนเข้าหรือเบิกจ่ายเงินฎีกาเรียบร้อย'
    },
    work_order: {
      th: 'ใบวางบิล',
      en: 'BILLING STATEMENT',
      badge: 'bg-slate-800 text-white',
      desc: 'หลักฐานการส่งมอบงานและรับพัสดุราชการ'
    }
  };

  const activeDocTitle = documentTitles[docType] || documentTitles.invoice;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print-modal-overlay">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-6xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 print-modal-card overflow-hidden">
        
        {/* Top Header Toolbar (Hidden in Print) */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/90 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span>ระบบรวมบิลวางบิลราชการ</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                  {groupedAgencies.length} หน่วยงาน • รวม {allGovBills.length} บิล
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                รวมบิลขายหน้าร้านและงานซ่อมที่เลขผู้เสียภาษีตรงกัน เพื่อออกใบเสนอราคา ใบแจ้งหนี้ หรือใบเสร็จรับเงิน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold">
              📄 A5 แนวตั้ง (148 × 210 มม.)
            </span>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!selectedGroup || activeStatementBills.length === 0 || isPrintBlocked}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all ${
                !selectedGroup || activeStatementBills.length === 0 || isPrintBlocked
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20 active:scale-95 cursor-pointer'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>
                {isSplitMode
                  ? `พิมพ์${activeDocTitle.th} (${sheetChunks.length} ใบ)`
                  : `พิมพ์${activeDocTitle.th} (A5 แนวตั้ง)`}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Status Filter Tabs (Hidden in Print) */}
        <div className="px-4 py-2.5 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs print:hidden">
          <span className="text-slate-400 font-semibold text-[11px] uppercase mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-purple-500" />
            <span>สถานะเครดิต:</span>
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({globalCounts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending_billing')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'pending_billing'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>ค้างชำระ / รอวางบิล ({globalCounts.pending})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('billed')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'billed'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>รอเบิกเงินฎีกา / วางบิลแล้ว ({globalCounts.billed})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ชำระแล้ว / เงินโอนเข้า ({globalCounts.paid})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('overdue')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>🚨 เกินกำหนดชำระ ({globalCounts.overdue})</span>
          </button>
        </div>

        {/* Modal Main Workspace */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden print:overflow-visible print:bg-white">
          
          {/* ================= LEFT SIDEBAR: LIST OF AGENCIES GROUPED BY TAX ID ================= */}
          <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col print:hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อหน่วยงาน, เลขผู้เสียภาษี, เลขที่ฎีกา..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* List of Groups */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredGroups.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs px-4 space-y-1">
                  <Building2 className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-semibold">ไม่พบบิลในเงื่อนไขนี้</p>
                  <p className="text-[11px] text-slate-400">
                    ลองเปลี่ยนแถบสถานะเครดิต หรือค้นหาด้วยชื่ออื่น
                  </p>
                </div>
              ) : (
                filteredGroups.map(group => {
                  const isSelected = group.groupKey === selectedGroupKey;
                  return (
                    <div
                      key={group.groupKey}
                      onClick={() => handleSelectGroup(group)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 dark:border-purple-600 ring-2 ring-purple-500/20 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {group.agencyName}
                          </h4>
                          {group.taxId ? (
                            <p className="font-mono text-[11px] text-purple-700 dark:text-purple-300 font-bold mt-0.5">
                              เลขผู้เสียภาษี: {group.taxId}
                            </p>
                          ) : (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 italic mt-0.5">
                              ไม่ได้ระบุเลขผู้เสียภาษี (รวมตามชื่อหน่วยงาน)
                            </p>
                          )}
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {group.department && `${group.department} • `}รวม {group.totalBills} บิล
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-purple-600 translate-x-0.5' : 'text-slate-400'}`} />
                      </div>

                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                        <div className="flex items-center gap-1 text-[10px] flex-wrap">
                          {group.overdueCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold animate-pulse">
                              เกินกำหนด {group.overdueCount}
                            </span>
                          )}
                          {group.pendingCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                              รอ {group.pendingCount}
                            </span>
                          )}
                          {group.billedCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                              ฎีกา {group.billedCount}
                            </span>
                          )}
                          {group.paidCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                              ชำระ {group.paidCount}
                            </span>
                          )}
                        </div>

                        <span className="font-black text-sm text-purple-700 dark:text-purple-300">
                          ฿{group.grandTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ================= RIGHT WORKSPACE: CONSOLIDATED STATEMENT PREVIEW & CONTROLS ================= */}
          <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950/60 overflow-hidden print:overflow-visible print:bg-white">
            {selectedGroup ? (
              <>
                {/* Control Bar: Document Type, Selection & Action Buttons (Hidden in Print) */}
                <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
                  
                  {/* Left: Document Type Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 hidden sm:inline">ประเภทเอกสาร:</span>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setDocType('invoice')}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                          docType === 'invoice'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        ใบแจ้งหนี้
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocType('quotation')}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                          docType === 'quotation'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        ใบเสนอราคา
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocType('receipt')}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                          docType === 'receipt'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        ใบเสร็จรับเงิน
                      </button>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={selectAllBillsInGroup}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                    >
                      เลือกทุกบิล ({selectedGroup.bills.length})
                    </button>

                    {/* Record Disbursement Voucher Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenDisbursementModal()}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>บันทึกเลขที่ฎีกา / รับเงิน</span>
                    </button>

                    {/* Quick status change buttons */}
                    <button
                      type="button"
                      onClick={() => handleBatchUpdateStatus('billed')}
                      disabled={isUpdatingStatus || activeStatementBills.length === 0}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                      title="ปรับสถานะเป็น รอเบิกเงินฎีกา / วางบิลแล้ว"
                    >
                      ✓ วางบิลแล้ว
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBatchUpdateStatus('paid')}
                      disabled={isUpdatingStatus || activeStatementBills.length === 0}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                      title="ปรับสถานะเป็น ชำระเงิน / เงินโอนเข้าแล้ว"
                    >
                      ✓ ชำระแล้ว
                    </button>
                  </div>
                </div>

                {/* Printable Document Paper Area */}
                <div className="flex-1 overflow-y-auto overflow-x-auto w-full p-2 sm:p-6 bg-slate-200/75 dark:bg-slate-950 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
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
                            กรุณาเลือกแยกเป็นหลายใบ หรือลดจำนวนบิลที่เลือกด้านล่าง
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsSplitMode(true)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>แยกเป็นหลายใบ ({activeStatementDocNo}-1, -2, ...)</span>
                        </button>
                      </div>
                    </div>
                  ) : isSplitMode ? (
                    <div className="mb-3 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center gap-2 print:hidden">
                      <Layers className="w-3.5 h-3.5" />
                      <span>โหมดแยกพิมพ์ {sheetChunks.length} ใบ A5 ({activeStatementDocNo}-1 ถึง -{sheetChunks.length}) • ทุกใบมีช่องเซ็นครบ</span>
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

                  <div
                    ref={printAreaRef}
                    className={isSplitMode ? 'a5-split-stack flex flex-col items-center gap-6 w-full print:block' : 'w-full flex flex-col items-center print:block'}
                  >
                    {sheetChunks.map(chunk => (
                      <A5GovStatementSheet
                        key={`${chunk.sheetDocNo}-${chunk.sheetIndex}`}
                        shopSettings={shopSettings}
                        selectedGroup={selectedGroup}
                        docType={docType}
                        activeDocTitle={activeDocTitle.th}
                        todayThaiDate={todayThaiDate}
                        chunk={chunk}
                        isSplitSheet={isSplitMode}
                        grandTotalAllSheets={statementGrandTotal}
                        promptPayQrUrl={promptPayQrUrl}
                        selectedBillIds={selectedBillIds}
                        toggleBillSelection={toggleBillSelection}
                        handleOpenDisbursementModal={handleOpenDisbursementModal}
                        resetDeps={[
                          selectedGroup.groupKey,
                          docType,
                          statusFilter,
                          activeStatementBills.length,
                          promptPayQrUrl
                        ]}
                        onFitReport={isSplitMode ? handleSplitFitReport : handleSingleFitReport}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
                กรุณาเลือกหน่วยงานทางด้านซ้ายเพื่อดูใบวางบิลรวม
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL: RECORD DISBURSEMENT VOUCHER & PAYMENT DETAILS ================= */}
      {isDisbursementModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                    {targetBillForEdit ? `บันทึกข้อมูลฎีกา: ${targetBillForEdit.docNumber}` : `บันทึกข้อมูลฎีกาสำหรับ ${activeStatementBills.length} บิลที่เลือก`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    บันทึกเลขที่ฎีกาเบิกจ่าย วันที่เงินโอนเข้า และปรับปรุงสถานะการเงิน
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDisbursementModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDisbursement} className="space-y-3.5 text-xs">
              {/* Disbursement Number */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  เลขที่ฎีกาเบิกจ่าย (Disbursement Voucher No.)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ฎีกาที่ 128/2569 หรือ ฎีกา กค 0405/2569"
                  value={formDisbursementNumber}
                  onChange={e => setFormDisbursementNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono"
                />
              </div>

              {/* Status & Disbursement Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    สถานะการวางบิล
                  </label>
                  <select
                    value={formBillingStatus}
                    onChange={e => setFormBillingStatus(e.target.value as GovBillingStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-semibold"
                  >
                    <option value="pending_billing">1. ค้างชำระ / รอวางบิล</option>
                    <option value="billed">2. วางบิลแล้ว / รอเบิกเงินฎีกา</option>
                    <option value="paid">3. ชำระแล้ว / เงินโอนเข้าเรียบร้อย</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    วันที่ทำเรื่องฎีกา
                  </label>
                  <input
                    type="date"
                    value={formDisbursementDate}
                    onChange={e => setFormDisbursementDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Paid Date & Transfer Ref (Show if paid or being marked as paid) */}
              <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                <div>
                  <label className="block font-semibold text-emerald-900 dark:text-emerald-300 mb-1">
                    วันที่เงินโอนเข้า / รับเงิน
                  </label>
                  <input
                    type="date"
                    value={formPaidDate}
                    onChange={e => setFormPaidDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-900 dark:text-emerald-300 mb-1">
                    เลขที่อ้างอิงโอนเงิน / เลขที่เช็ค
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น KTB-998822 หรือ เช็ค ธ.กรุงไทย"
                    value={formTransferRef}
                    onChange={e => setFormTransferRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Credit Terms & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    เครดิตเทอม
                  </label>
                  <select
                    value={formCreditDays}
                    onChange={e => {
                      const days = Number(e.target.value);
                      setFormCreditDays(days);
                      if (days > 0) {
                        const d = new Date();
                        d.setDate(d.getDate() + days);
                        setFormDueDate(d.toISOString().split('T')[0]);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  >
                    {CREDIT_DAYS_PRESETS.map(p => (
                      <option key={p.days} value={p.days}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    วันครบกำหนดชำระ (Due Date)
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  หมายเหตุโครงการ / บันทึกเพิ่มเติม
                </label>
                <input
                  type="text"
                  placeholder="เช่น งบประมาณประจำปี 2569 โครงการปรับปรุงห้องปฏิบัติการคอมพิวเตอร์"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsDisbursementModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
