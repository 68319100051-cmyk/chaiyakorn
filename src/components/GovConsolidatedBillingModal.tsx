import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RepairTicket, POSSaleRecord, ShopSettings, GovBillingStatus, GovDocumentType } from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { bahtText } from '../utils/bahtText';
import { dbService } from '../services/db';
import { getGovCreditDueStatus, CREDIT_DAYS_PRESETS } from '../utils/govCredit';
import { formatThaiDateFull, formatTodayThaiFull, formatMoneyPlain } from '../utils/printHelpers';
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

  const handlePrint = () => {
    window.print();
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

  const todayThaiDate = formatTodayThaiFull();

  // Consolidated document sequence & titles
  const docSeq = (selectedGroup?.taxId || 'GOV').slice(-6) + '-' + new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const documentNumbers: Record<GovDocumentType, string> = {
    quotation: `QT-GOV-${docSeq}`,
    invoice: `INV-GOV-${docSeq}`,
    receipt: `REC-GOV-${docSeq}`,
    work_order: `BILL-GOV-${docSeq}`
  };

  const documentTitles: Record<GovDocumentType, { th: string; en: string; badge: string; desc: string }> = {
    quotation: {
      th: 'ใบเสนอราคารวม (หน่วยงานราชการ/สถานศึกษา)',
      en: 'CONSOLIDATED QUOTATION',
      badge: 'bg-blue-800 text-white',
      desc: 'เอกสารเสนอราคารวมเพื่อขออนุมัติงบประมาณก่อนดำเนินการซ่อมและส่งมอบพัสดุ'
    },
    invoice: {
      th: 'ใบแจ้งหนี้ / ใบวางบิลรวม (หน่วยงานราชการ)',
      en: 'CONSOLIDATED INVOICE / BILLING NOTE',
      badge: 'bg-purple-900 text-white',
      desc: 'เอกสารเรียกเก็บเงินตามระเบียบพัสดุราชการ รวมบิลตามเลขประจำตัวผู้เสียภาษี'
    },
    receipt: {
      th: 'ใบเสร็จรับเงินรวม (หน่วยงานราชการ)',
      en: 'CONSOLIDATED OFFICIAL RECEIPT',
      badge: 'bg-emerald-800 text-white',
      desc: 'เอกสารใบเสร็จรับเงินอย่างเป็นทางการเมื่อเงินโอนเข้าหรือเบิกจ่ายเงินฎีกาเรียบร้อย'
    },
    work_order: {
      th: 'ใบวางบิล / ใบส่งมอบงานรวม',
      en: 'BILLING STATEMENT & WORK ORDER',
      badge: 'bg-slate-800 text-white',
      desc: 'หลักฐานการส่งมอบงานและรับพัสดุราชการ'
    }
  };

  const activeDocTitle = documentTitles[docType] || documentTitles.invoice;
  const activeStatementDocNo = documentNumbers[docType] || documentNumbers.invoice;

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
                <span>ระบบรวมบิลวางบิลราชการ (ตามเลขผู้เสียภาษี)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                  {groupedAgencies.length} หน่วยงาน • รวม {allGovBills.length} บิล
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                รวมบิลขายหน้าร้านและงานซ่อมที่เลขผู้เสียภาษีตรงกัน เพื่อออกใบเสนอราคา ใบแจ้งหนี้ หรือใบเสร็จรวม
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
              disabled={!selectedGroup || activeStatementBills.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์{docType === 'quotation' ? 'ใบเสนอราคา' : docType === 'receipt' ? 'ใบเสร็จรับเงิน' : 'ใบวางบิล'} (A5 แนวตั้ง)</span>
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
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
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
          <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950/60 overflow-hidden">
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
                        ใบแจ้งหนี้ / ใบวางบิล
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
                        ใบเสนอราคา (ขออนุมัติงบ)
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
                        ใบเสร็จรับเงินรวม
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
                  <div className="mb-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold print:hidden">
                    ตัวอย่างกระดาษ A5 แนวตั้ง (148 × 210 มม. | ขอบ ซ้าย-ขวา-บน 6 มม. / ล่าง 3.5 มม.)
                  </div>

                  <div
                    ref={printAreaRef}
                    id="gov-consolidated-statement"
                    className={`a5-portrait-paper shadow-2xl border border-slate-300 mx-auto flex flex-col justify-between ${
                      selectedGroup.bills.length >= 6 && selectedGroup.bills.length <= 10 ? 'a5-compact' : ''
                    } ${selectedGroup.bills.length > 10 ? 'a5-multi-page' : ''}`}
                  >
                    {/* TOP + MIDDLE: Header, Gov Info & Bills Table */}
                    <div className="space-y-1.5">
                      {/* Header: Shop Information (NO TOP BARCODE) */}
                      <div className="flex justify-between items-start gap-2 border-b-2 border-slate-800 pb-1.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {shopSettings.logoUrl && (
                            <img
                              src={shopSettings.logoUrl}
                              alt={shopSettings.shopName}
                              className="h-14 w-auto max-w-[96px] object-contain shrink-0"
                            />
                          )}
                          <div className="min-w-0 leading-snug">
                            <h1 className="text-[13pt] font-extrabold text-slate-950 leading-tight">
                              {shopSettings.shopName}
                            </h1>
                            <p className="text-[9.5pt] text-slate-800 leading-snug">
                              {shopSettings.shopAddress}
                            </p>
                            <p className="text-[9.5pt] text-slate-900 font-semibold">
                              โทร. {shopSettings.shopPhone}
                              {shopSettings.shopLineId ? ` | LINE: ${shopSettings.shopLineId}` : ''}
                            </p>
                            {shopSettings.taxId && (
                              <p className="text-[9pt] text-slate-800">
                                เลขประจำตัวผู้เสียภาษี: {shopSettings.taxId}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-0.5">
                          <div className="text-[10pt] font-bold text-slate-900">
                            เลขที่ <span className="font-mono text-[10.5pt] font-extrabold text-slate-950">{activeStatementDocNo}</span>
                          </div>
                          <div className="text-[9.5pt] font-medium text-slate-900">
                            วันที่: {todayThaiDate}
                          </div>
                        </div>
                      </div>

                      {/* Document Title Banner */}
                      <div className="py-1 border-y border-slate-700 bg-slate-100 text-center">
                        <h2 className="text-[11pt] font-extrabold tracking-wide text-slate-950">
                          {activeDocTitle.th}
                        </h2>
                      </div>

                      {/* Government Customer Information Box */}
                      <div className="border border-slate-500 p-1.5 bg-slate-50/70 space-y-0.5 text-[10pt] leading-snug">
                        <div className="flex justify-between gap-2 flex-wrap">
                          <div>
                            <span className="font-bold text-slate-900">หน่วยงาน: </span>
                            <span className="font-extrabold text-slate-950">{selectedGroup.agencyName}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800">เลขภาษี 13 หลัก: </span>
                            <span className="font-mono font-bold text-slate-950">{selectedGroup.taxId || '-'}</span>
                          </div>
                        </div>
                        <div className="flex justify-between gap-2 flex-wrap text-[9.5pt]">
                          <div>
                            <span className="font-semibold text-slate-800">ฝ่าย/งาน: </span>
                            <span>{selectedGroup.department || 'งานพัสดุ'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800">ผู้ติดต่อ: </span>
                            <span>{selectedGroup.contactPerson || '-'} {selectedGroup.contactPhone ? `(${selectedGroup.contactPhone})` : ''}</span>
                          </div>
                        </div>
                      </div>

                      {/* Consolidated Bills Table (NO '฿' SYMBOL ANYWHERE) */}
                      <div className="border border-slate-500 text-[9.5pt]">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-200 border-b border-slate-500 text-slate-950 font-extrabold">
                            <tr>
                              <th className="py-1 px-1 text-center w-[7%] print:hidden">เลือก</th>
                              <th className="py-1 px-1 text-center w-[7%] border-r border-slate-400">ที่</th>
                              <th className="py-1 px-1 w-[21%] border-r border-slate-400">วันที่</th>
                              <th className="py-1 px-1 w-[20%] border-r border-slate-400">เลขที่เอกสาร</th>
                              <th className="py-1 px-1 w-[28%] border-r border-slate-400">รายการ</th>
                              <th className="py-1 px-1.5 text-right w-[17%]">รวม (บาท)</th>
                              <th className="py-1 px-1 text-center w-[7%] print:hidden">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300">
                            {selectedGroup.bills.map((bill, idx) => {
                              const isIncluded = selectedBillIds.has(bill.id);
                              return (
                                <tr
                                  key={bill.id}
                                  className={`a5-keep-together ${isIncluded ? 'bg-white' : 'bg-slate-50/70 text-slate-400 print:hidden'}`}
                                >
                                  <td className="py-1 px-1 text-center print:hidden">
                                    <button
                                      type="button"
                                      onClick={() => toggleBillSelection(bill.id)}
                                      className="cursor-pointer text-purple-600"
                                    >
                                      {isIncluded ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                                    </button>
                                  </td>
                                  <td className="py-1 px-1 text-center border-r border-slate-300">{idx + 1}</td>
                                  <td className="py-1 px-1 border-r border-slate-300 break-words">{bill.date}</td>
                                  <td className="py-1 px-1 font-mono font-bold border-r border-slate-300 break-words">
                                    {bill.docNumber}
                                    {bill.disbursementNumber ? ` (${bill.disbursementNumber})` : ''}
                                  </td>
                                  <td className="py-1 px-1 border-r border-slate-300 break-words">{bill.itemsDescription}</td>
                                  <td className="py-1 px-1.5 text-right font-bold text-slate-950 tabular-nums">
                                    {formatMoneyPlain(bill.totalAmount, 2)}
                                  </td>
                                  <td className="py-1 px-1 text-center print:hidden">
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
                      <div className="grid grid-cols-12 gap-2 text-[10pt] a5-keep-together">
                        <div className="col-span-6 p-1.5 border border-slate-500 bg-slate-50 flex items-center justify-between gap-2">
                          <div className="text-[9.5pt] space-y-0.5 leading-snug min-w-0">
                            <p className="font-bold text-slate-950">ธนาคาร{shopSettings.bankName || 'กสิกรไทย'}</p>
                            <p className="text-slate-900 break-words">{shopSettings.bankAccountName || shopSettings.shopName}</p>
                            <p className="font-bold text-slate-950">พร้อมเพย์ {shopSettings.promptPayId || '0834268058'}</p>
                          </div>
                          {promptPayQrUrl && (
                            <div className="shrink-0 flex flex-col items-center">
                              <div className="w-[22mm] h-[22mm] p-0.5 bg-white border border-slate-400 flex items-center justify-center">
                                <img src={promptPayQrUrl} alt="PromptPay QR" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-[9pt] font-bold text-slate-900 mt-0.5">พร้อมเพย์</span>
                            </div>
                          )}
                        </div>

                        <div className="col-span-6 p-1.5 border border-slate-500 bg-slate-50 space-y-0.5 tabular-nums flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between text-slate-900">
                              <span>รวม ({activeStatementBills.length} บิล)</span>
                              <span>{formatMoneyPlain(statementSubtotal, 2)}</span>
                            </div>
                            {statementDiscount > 0 && (
                              <div className="flex justify-between text-rose-700 font-bold">
                                <span>ส่วนลด</span>
                                <span>-{formatMoneyPlain(statementDiscount, 2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-baseline pt-1 border-t-2 border-slate-800 font-extrabold text-[11pt] text-slate-950">
                              <span>รวมสุทธิ (บาท)</span>
                              <span className="text-[12pt]">{formatMoneyPlain(statementGrandTotal, 2)}</span>
                            </div>
                          </div>
                          <div className="text-right font-bold text-[9.5pt] text-slate-950">
                            ({statementBahtText})
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM SECTION: ENLARGED SIGNATURES + CLEAN STUB */}
                    <div className="mt-auto pt-2 space-y-2 a5-keep-together">
                      {docType === 'quotation' ? (
                        <div className="grid grid-cols-2 gap-3 text-center text-[10pt]">
                          <div className="border border-slate-500 p-2 flex flex-col justify-between min-h-[82px]">
                            <p className="font-bold text-slate-950">ผู้เสนอราคา</p>
                            <div className="flex-1" />
                            <p className="font-bold text-slate-950">( ร้านพัทลุงปริ้นเตอร์ )</p>
                          </div>
                          <div className="border border-slate-500 p-2 flex flex-col justify-between min-h-[82px]">
                            <p className="font-bold text-slate-950">ผู้อนุมัติ / หน่วยงาน</p>
                            <div className="flex-1" />
                            <p className="font-bold text-slate-950 truncate">( {selectedGroup.agencyName} )</p>
                          </div>
                        </div>
                      ) : docType === 'receipt' ? (
                        <div className="grid grid-cols-2 gap-3 text-center text-[10pt]">
                          <div className="border border-slate-500 p-2 flex flex-col justify-between min-h-[82px]">
                            <p className="font-bold text-slate-950">ผู้จ่ายเงิน / เจ้าหน้าที่การเงิน</p>
                            <div className="flex-1" />
                            <p className="font-bold text-slate-950 truncate">( {selectedGroup.agencyName} )</p>
                          </div>
                          <div className="border border-slate-500 p-2 flex flex-col justify-between min-h-[82px]">
                            <p className="font-bold text-slate-950">ผู้รับเงิน</p>
                            <div className="flex-1" />
                            <p className="font-bold text-slate-950">( ร้านพัทลุงปริ้นเตอร์ )</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 text-center text-[9.5pt]">
                          <div className="border border-slate-500 p-2 flex flex-col justify-between min-h-[80px]">
                            <p className="font-bold text-slate-950">ผู้วางบิล / ผู้ส่งมอบ</p>
                            <div className="flex-1" />
                            <p className="font-bold text-slate-950">( ร้านพัทลุงปริ้นเตอร์ )</p>
                          </div>
                          <div className="border border-slate-500 p-2 flex flex-col justify-between min-h-[80px]">
                            <p className="font-bold text-slate-950">ผู้รับวางบิล / พัสดุ</p>
                            <div className="flex-1" />
                            <p className="font-bold text-slate-950 truncate">( {selectedGroup.agencyName} )</p>
                          </div>
                          <div className="border border-slate-500 p-2 flex flex-col justify-between min-h-[80px]">
                            <p className="font-bold text-slate-950">กรรมการตรวจรับ</p>
                            <div className="flex-1" />
                            <p className="font-bold text-slate-950">( .................................... )</p>
                          </div>
                        </div>
                      )}

                      {/* Tear-off Stub: ONLY Doc No, Barcode, Customer/Agency Name */}
                      <div className="pt-1.5 border-t-2 border-dashed border-slate-500">
                        <div className="border border-slate-500 px-3 py-2 flex items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="text-[10.5pt] font-extrabold text-slate-950">
                              เลขที่เอกสาร: <span className="font-mono">{activeStatementDocNo}</span>
                            </div>
                            <div className="text-[10.5pt] font-bold text-slate-950 truncate">
                              ชื่อลูกค้า: {selectedGroup.agencyName}
                            </div>
                          </div>
                          <div className="shrink-0 bg-white px-1">
                            <Barcode
                              value={activeStatementDocNo}
                              width={1.35}
                              height={34}
                              displayValue={false}
                              className="h-[34px] max-w-[200px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
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
