import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RepairTicket, POSSaleRecord, ShopSettings, GovBillingStatus, GovDocumentType } from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { bahtText } from '../utils/bahtText';
import { dbService } from '../services/db';
import { getGovCreditDueStatus, CREDIT_DAYS_PRESETS } from '../utils/govCredit';
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
          date: new Date(sale.createdAt).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
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
        const partsDesc = (ticket.partsUsed || []).map(p => `${p.itemName} (x${p.quantity})`).join(', ');
        const serviceDesc = partsDesc
          ? `บริการซ่อม ${ticket.brand} ${ticket.model} (${partsDesc})`
          : `บริการตรวจเช็คและซ่อม ${ticket.brand} ${ticket.model} - ${ticket.problemDescription}`;

        list.push({
          source: 'repair',
          id: ticket.id,
          docNumber: ticket.ticketNumber,
          date: new Date(ticket.receivedDate || ticket.createdAt).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
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

  const todayThaiDate = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

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
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/70 dark:bg-slate-950 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
                  {/* Paper Dimension Visual Indicator for Screen */}
                  <div className="mb-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1.5 shadow-xs print:hidden">
                    <span>📄 สัดส่วนกระดาษ A5 แนวตั้ง (148 มม. × 210 มม.)</span>
                  </div>

                  <div
                    ref={printAreaRef}
                    id="gov-consolidated-statement"
                    className="a5-portrait-paper bg-white text-slate-900 w-[148mm] min-h-[210mm] max-w-full p-4 mx-auto shadow-2xl rounded-sm border border-slate-300 text-[8.5px] leading-tight flex flex-col justify-between font-sans print:shadow-none print:border-none print:w-[140mm] print:h-[202mm] print:min-h-[202mm] print:p-0 print:m-0"
                  >
                    {/* TOP HALF: Header, Gov Info & Bills Table */}
                    <div className="space-y-1.5">
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
                          <div className={`w-9 h-9 rounded text-white flex items-center justify-center font-bold text-xs shrink-0 ${
                            docType === 'quotation' ? 'bg-blue-700' : docType === 'receipt' ? 'bg-emerald-700' : 'bg-purple-700'
                          }`}>
                            {docType === 'quotation' ? 'QT' : docType === 'receipt' ? 'REC' : 'GOV'}
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
                            {shopSettings.taxId && (
                              <span> | เลขผู้เสียภาษี: <span className="font-mono font-bold">{shopSettings.taxId}</span></span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end">
                        <span className={`inline-block px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider ${activeDocTitle.badge}`}>
                          {activeDocTitle.th}
                        </span>
                        <p className="font-mono font-bold text-xs text-purple-900 mt-0.5">
                          {activeStatementDocNo}
                        </p>
                        <p className="text-[8px] text-slate-500">
                          วันที่: {todayThaiDate}
                        </p>
                        <div className="px-2 py-0.2 rounded-full border border-slate-800 text-slate-800 text-[7px] font-bold my-0.5">
                          สำหรับหน่วยงาน / ลูกค้า
                        </div>
                        <Barcode value={activeStatementDocNo} width={1.0} height={18} displayValue={false} className="h-4.5" />
                        {docType === 'quotation' && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[7.5px] font-bold">
                            กำหนดยืนราคา 30 วัน
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Government Customer Information Box */}
                    <div className="bg-purple-50/70 p-1.5 rounded border border-purple-200 space-y-0.5 text-[8px] text-purple-950">
                      <div className="flex items-center justify-between border-b border-purple-200 pb-0.5">
                        <span className="font-bold text-[8.5px] text-purple-950 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-purple-700 inline" />
                          <span>เรียน ส่วนราชการ / หน่วยงานผู้ขอรับบริการ:</span>
                        </span>
                        <span className="text-[7.5px] font-bold text-purple-900 bg-purple-200/60 px-1.5 py-0.2 rounded">
                          รวม {activeStatementBills.length} รายการบิล
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5">
                        <div className="flex justify-between sm:justify-start sm:gap-1 truncate">
                          <span className="font-semibold text-slate-600">หน่วยงาน:</span>
                          <span className="font-bold text-purple-950 truncate">{selectedGroup.agencyName}</span>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-1">
                          <span className="font-semibold text-slate-600">เลขผู้เสียภาษี 13 หลัก:</span>
                          <span className="font-mono font-bold text-purple-900">
                            {selectedGroup.taxId || 'ไม่ได้ระบุ'}
                          </span>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-1 truncate">
                          <span className="font-semibold text-slate-600">ฝ่าย/งาน:</span>
                          <span className="truncate">{selectedGroup.department || 'งานพัสดุ / บริหารทั่วไป'}</span>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-1 truncate">
                          <span className="font-semibold text-slate-600">ผู้ติดต่อ:</span>
                          <span className="truncate">{selectedGroup.contactPerson || '-'} {selectedGroup.contactPhone ? `(${selectedGroup.contactPhone})` : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Consolidated Bills Table */}
                    <div className="border border-slate-300 rounded overflow-hidden">
                      <table className="w-full text-left text-[8px]">
                        <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                          <tr>
                            <th className="py-0.5 px-1.5 text-center w-6 print:hidden">เลือก</th>
                            <th className="py-0.5 px-1 text-center w-6">#</th>
                            <th className="py-0.5 px-1.5 w-16">วันที่</th>
                            <th className="py-0.5 px-1.5 w-24">เลขที่เอกสาร</th>
                            <th className="py-0.5 px-1.5 w-20">เลข PO / ฎีกา</th>
                            <th className="py-0.5 px-2">รายการพัสดุ / บริการซ่อม</th>
                            <th className="py-0.5 px-1.5 text-center w-16">กำหนดชำระ</th>
                            <th className="py-0.5 px-2 text-right w-16">จำนวนเงิน</th>
                            <th className="py-0.5 px-1 text-center w-8 print:hidden">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[8px]">
                          {selectedGroup.bills.map((bill, idx) => {
                            const isIncluded = selectedBillIds.has(bill.id);
                            const dueStatus = getGovCreditDueStatus(bill.dueDate, bill.billingStatus);
                            return (
                              <tr
                                key={bill.id}
                                className={`transition-colors ${isIncluded ? 'bg-white' : 'bg-slate-50/70 text-slate-400 print:hidden'}`}
                              >
                                <td className="py-0.5 px-1.5 text-center print:hidden">
                                  <button
                                    type="button"
                                    onClick={() => toggleBillSelection(bill.id)}
                                    className="cursor-pointer text-purple-600"
                                  >
                                    {isIncluded ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3 text-slate-400" />}
                                  </button>
                                </td>
                                <td className="py-0.5 px-1 text-center font-bold text-slate-500">
                                  {idx + 1}
                                </td>
                                <td className="py-0.5 px-1.5 text-slate-700 whitespace-nowrap">
                                  {bill.date}
                                </td>
                                <td className="py-0.5 px-1.5 font-mono font-bold text-purple-900 whitespace-nowrap">
                                  <div className="flex items-center gap-0.5">
                                    {bill.source === 'pos' ? (
                                      <Receipt className="w-2.5 h-2.5 text-emerald-600 inline" />
                                    ) : (
                                      <Wrench className="w-2.5 h-2.5 text-blue-600 inline" />
                                    )}
                                    <span>{bill.docNumber}</span>
                                  </div>
                                </td>
                                <td className="py-0.5 px-1.5 font-mono text-blue-800 whitespace-nowrap">
                                  <div>
                                    <span className="font-bold">{bill.orderNumber || '-'}</span>
                                    {bill.disbursementNumber && (
                                      <div className="text-[7.5px] text-indigo-700 font-semibold">
                                        ฎีกา: {bill.disbursementNumber}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-0.5 px-2 text-slate-800 leading-tight">
                                  <div className="truncate max-w-[150px]">{bill.itemsDescription}</div>
                                </td>
                                <td className="py-0.5 px-1.5 text-center whitespace-nowrap">
                                  <span className={`inline-block px-1 py-0.2 rounded text-[7px] font-semibold border ${dueStatus.badgeClass}`}>
                                    {dueStatus.badgeLabel}
                                  </span>
                                </td>
                                <td className="py-0.5 px-2 text-right font-extrabold text-slate-900 whitespace-nowrap">
                                  ฿{bill.totalAmount.toLocaleString()}
                                </td>
                                <td className="py-0.5 px-1 text-center print:hidden">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDisbursementModal(bill)}
                                    className="p-0.5 rounded hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                                    title="แก้ไขฎีกา/กำหนดชำระ"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* BOTTOM HALF: Totals, Signatures & Footer */}
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-200">
                    {/* Summary Totals & PromptPay Section (Side-by-side) */}
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      {/* Left: PromptPay QR for Combined Grand Total (3x3 cm) */}
                      <div className="p-1.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-around gap-1.5">
                        <div className="flex flex-col items-center shrink-0">
                          {promptPayQrUrl ? (
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
                        <div className="text-[7.5px] space-y-0.2 leading-tight pl-1 border-l border-slate-200">
                          <span className="font-bold text-[#002D62] block text-[8px] flex items-center gap-0.5">
                            <QrCode className="w-2.5 h-2.5 inline text-[#002D62]" />
                            <span>พร้อมเพย์ยอดรวม</span>
                          </span>
                          <p className="font-mono font-bold text-slate-800">{shopSettings.promptPayId || '083-426-8058'}</p>
                          <p className="text-slate-500 truncate max-w-[90px]">{shopSettings.bankAccountName || shopSettings.shopName}</p>
                          {shopSettings.bankAccountNumber && (
                            <p className="text-slate-400 font-mono">{shopSettings.bankAccountNumber}</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Consolidated Calculations */}
                      <div className="p-1.5 rounded bg-slate-50 border border-slate-200 space-y-0.5 text-[8.5px]">
                        <div className="flex justify-between text-slate-600">
                          <span>รวมยอดเงินก่อนลด ({activeStatementBills.length} บิล):</span>
                          <span>฿{statementSubtotal.toLocaleString()}</span>
                        </div>
                        {statementDiscount > 0 && (
                          <div className="flex justify-between text-rose-600 font-bold text-[8px]">
                            <span>ส่วนลดพิเศษ:</span>
                            <span>-฿{statementDiscount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline pt-0.5 border-t border-slate-300 font-black text-slate-900">
                          <span className="text-[9px]">
                            {docType === 'quotation' ? 'ยอดเสนอราคารวม:' : docType === 'receipt' ? 'ยอดเงินชำระสุทธิ:' : 'ยอดสุทธิวางบิลทั้งสิ้น:'}
                          </span>
                          <span className="text-xs font-black text-purple-900">฿{statementGrandTotal.toLocaleString()}</span>
                        </div>
                        <div className="pt-0.2 text-right font-bold text-purple-950 text-[8px] truncate">
                          ({statementBahtText})
                        </div>
                      </div>
                    </div>

                    {/* Official Signoff Blocks (Strictly 1 single horizontal row) */}
                    {docType === 'quotation' ? (
                      /* Quotation Signoff Box: Supplier & Approving Authority (1 Row) */
                      <div className="pt-1 border-t border-slate-300">
                        <div className="grid grid-cols-2 gap-2 text-center text-[8px] text-slate-700">
                          <div className="border border-slate-200 p-1.5 rounded space-y-1">
                            <p className="font-bold text-blue-900">ผู้เสนอราคา / ผู้ส่งมอบงาน</p>
                            <div className="border-b border-dotted border-slate-400 mx-2 pt-2"></div>
                            <p>(........................................................)</p>
                            <p className="text-[7.5px] text-slate-400">{shopSettings.shopName} | วันที่: {todayThaiDate}</p>
                          </div>

                          <div className="border border-blue-200 bg-blue-50/30 p-1.5 rounded space-y-0.5 text-left">
                            <div className="flex items-center gap-1 font-bold text-blue-950 pb-0.5 border-b border-blue-200 text-[8px]">
                              <CheckSquare className="w-3 h-3 text-blue-700 shrink-0" />
                              <span>ส่วนผู้อนุมัติสั่งจ้าง / ขออนุมัติงบประมาณ</span>
                            </div>
                            <p className="text-[7.5px] text-slate-600">
                              [ &nbsp; ] อนุมัติให้ดำเนินการจัดซื้อ/จ้างตามเสนอ
                            </p>
                            <div className="border-b border-dotted border-slate-400 mx-1 pt-1.5"></div>
                            <p className="text-center text-[7.5px] pt-0.5">(........................................................)</p>
                            <p className="text-[7px] text-slate-400 text-center">ผู้อำนวยการ / หัวหน้าหน่วยงาน | วันที่ ...... / ...... / ..........</p>
                          </div>
                        </div>
                      </div>
                    ) : docType === 'receipt' ? (
                      /* Receipt Signoff Box: Payment Confirmation & Receiver (1 Row) */
                      <div className="pt-1 border-t border-slate-300">
                        <div className="grid grid-cols-2 gap-3 text-center text-[8px] text-slate-700">
                          <div className="border border-slate-200 p-1.5 rounded space-y-1">
                            <p className="font-bold text-slate-800">ผู้รับเงิน / แคชเชียร์</p>
                            <div className="border-b border-dotted border-slate-400 mx-3 pt-2"></div>
                            <p>(........................................................)</p>
                            <p className="text-[7.5px] text-slate-400">{shopSettings.shopName} | วันที่: {todayThaiDate}</p>
                          </div>

                          <div className="border border-slate-200 p-1.5 rounded space-y-1">
                            <p className="font-bold text-slate-800">ผู้จ่ายเงิน / เจ้าหน้าที่การเงินหน่วยงาน</p>
                            <div className="border-b border-dotted border-slate-400 mx-3 pt-2"></div>
                            <p>(........................................................)</p>
                            <p className="text-[7.5px] text-slate-400 truncate">{selectedGroup.agencyName}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Standard Invoice / Billing Note: Strictly 1 Single Horizontal Row with 3 Boxes */
                      <div className="pt-1 border-t border-slate-300">
                        <div className="grid grid-cols-3 gap-1.5 text-center text-[8px] text-slate-700">
                          <div className="border border-slate-200 p-1 rounded space-y-1">
                            <p className="font-bold text-[8px]">ผู้วางบิล / ผู้ส่งมอบงาน</p>
                            <div className="border-b border-dotted border-slate-400 mx-1.5 pt-2"></div>
                            <p>(................................................)</p>
                            <p className="text-[7px] text-slate-400 truncate">{shopSettings.shopName}</p>
                          </div>

                          <div className="border border-slate-200 p-1 rounded space-y-1">
                            <p className="font-bold text-[8px]">ผู้รับวางบิล / เจ้าหน้าที่พัสดุ</p>
                            <div className="border-b border-dotted border-slate-400 mx-1.5 pt-2"></div>
                            <p>(................................................)</p>
                            <p className="text-[7px] text-slate-400 truncate">{selectedGroup.agencyName}</p>
                          </div>

                          <div className="border border-slate-200 p-1 rounded space-y-1">
                            <p className="font-bold text-[8px]">กรรมการตรวจรับพัสดุ</p>
                            <div className="border-b border-dotted border-slate-400 mx-1.5 pt-2"></div>
                            <p>(................................................)</p>
                            <p className="text-[7px] text-slate-400">วันที่ ...... / ...... / ..........</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Document Footer */}
                    <div className="pt-0.5 text-center text-[7px] text-slate-500 border-t border-dashed border-slate-300">
                      <p className="font-semibold text-slate-700">
                        {shopSettings.receiptFooterMessage || 'ขอขอบพระคุณที่ให้ความไว้วางใจเลือกใช้บริการ'}
                      </p>
                      <p className="text-[6.5px] text-slate-400">
                        เอกสารนี้ออกโดยระบบเพื่อใช้ประกอบการเบิกจ่ายตามระเบียบพัสดุราชการ (A5 Portrait Format)
                      </p>
                    </div>

                    {/* Perforated Cutting Line */}
                    <div className="relative my-1 text-center border-t-2 border-dashed border-slate-400">
                      <span className="absolute left-1/2 -top-2 -translate-x-1/2 bg-white px-2 text-[7px] font-bold text-slate-600 flex items-center gap-1 shadow-2xs">
                        <Scissors className="w-2.5 h-2.5 text-slate-700 inline" />
                        <span>ตัดตามรอยประ (หางบัตรสรุปยอดวางบิลสำหรับหน่วยงาน / ทะเบียนคุมฎีกา)</span>
                      </span>
                    </div>

                    {/* Government Claim Stub Box */}
                    <div className="border border-slate-400 rounded-xs p-1 bg-slate-50/80 text-[7px] leading-tight space-y-0.5">
                      <div className="flex justify-between items-center border-b border-slate-300 pb-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-[8px] text-slate-900">{shopSettings.shopName}</span>
                          <span className="text-[6.5px] text-slate-600">โทร. {shopSettings.shopPhone}</span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 font-bold text-[6.5px]">
                          หางบัตรสรุปยอดวางบิลรวม (Statement Stub)
                        </span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 items-center">
                        <div className="col-span-7 space-y-0.2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">
                              เลขที่: <span className="font-mono">{activeStatementDocNo}</span>
                            </span>
                            <Barcode value={activeStatementDocNo} width={0.85} height={14} displayValue={false} className="h-3.5 inline" />
                          </div>
                          <p className="truncate">
                            <span className="font-semibold text-slate-700">หน่วยงาน:</span> <span className="font-bold">{selectedGroup.agencyName}</span>
                          </p>
                          <p className="truncate text-slate-600">
                            <span className="font-semibold text-slate-700">จำนวน:</span> {activeStatementBills.length} บิลรายการ (เครดิตเทอม {selectedGroup.bills[0]?.creditDays || 30} วัน)
                          </p>
                        </div>

                        <div className="col-span-5 flex items-center justify-between pl-1 border-l border-slate-300">
                          <div className="space-y-0.2">
                            <p className="font-bold text-slate-900">
                              ยอดสุทธิ: <span className="text-purple-900 font-mono font-bold text-[8px]">฿{statementGrandTotal.toLocaleString()}</span>
                            </p>
                            <p className="text-slate-600">
                              สถานะ: <span className="font-bold text-blue-900">{docType === 'quotation' ? 'เสนอราคา' : docType === 'receipt' ? 'รับชำระแล้ว' : 'วางบิลแล้ว'}</span>
                            </p>
                            <p className="text-[6px] text-slate-500">วันที่: {todayThaiDate}</p>
                          </div>

                          {promptPayQrUrl && (
                            <div className="flex flex-col items-center shrink-0 ml-1">
                              <img src={promptPayQrUrl} alt="PromptPay QR" className="w-7 h-7 p-0.5 bg-white border border-slate-300 rounded-xs" />
                              <span className="text-[5.5px] text-slate-500">พร้อมเพย์</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[6px] text-slate-500 pt-0.5 border-t border-slate-200">
                        <span>* ส่วนหางบัตรสำหรับงานพัสดุและการเงินใช้แนบฎีกาเบิกจ่ายเงินงบประมาณ</span>
                        <span>{shopSettings.shopName}</span>
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
