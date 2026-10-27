import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RepairTicket, POSSaleRecord, ShopSettings, GovBillingStatus } from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { bahtText } from '../utils/bahtText';
import { dbService } from '../services/db';
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
  Search
} from 'lucide-react';

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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
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
          itemsDescription: serviceDesc,
          subtotal: (ticket.laborCost || 0) + (ticket.partsCost || 0),
          discount: Number(ticket.discount) || 0,
          totalAmount: ticket.totalAmount
        });
      }
    }

    return list.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
  }, [posSales, tickets]);

  // 2. Group bills by Tax ID (CRITICAL: "ถ้า เลขผู้เสียภาษี ในแต่ละบิล ตรงกัน ให้มารวมเป็นบิลเดียว และรวมยอดต่างๆของทุกบิลที่เลขตรงกัน")
  const groupedAgencies = useMemo<ConsolidatedAgencyGroup[]>(() => {
    const groupMap = new Map<string, ConsolidatedBillItem[]>();

    for (const bill of allGovBills) {
      // Grouping key: If Tax ID exists and is at least 5 digits, group strictly by Tax ID!
      // Otherwise fallback to cleaned Agency Name
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
      // Representative agency info (from latest bill)
      const primaryBill = bills[0];
      const totalSubtotal = bills.reduce((sum, b) => sum + b.subtotal, 0);
      const totalDiscount = bills.reduce((sum, b) => sum + b.discount, 0);
      const grandTotal = bills.reduce((sum, b) => sum + b.totalAmount, 0);

      const pendingCount = bills.filter(b => b.billingStatus === 'pending_billing').length;
      const billedCount = bills.filter(b => b.billingStatus === 'billed').length;
      const paidCount = bills.filter(b => b.billingStatus === 'paid').length;

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
        paidCount
      });
    });

    // Sort by grand total or pending bills
    return groups.sort((a, b) => b.grandTotal - a.grandTotal);
  }, [allGovBills]);

  // Set default selected group
  useEffect(() => {
    if (groupedAgencies.length > 0) {
      if (!selectedGroupKey || !groupedAgencies.some(g => g.groupKey === selectedGroupKey)) {
        const firstKey = groupedAgencies[0].groupKey;
        setSelectedGroupKey(firstKey);
        // Select all bills in this group by default
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

  // Filter bills inside selected group based on checkbox selection
  const activeStatementBills = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.bills.filter(b => selectedBillIds.has(b.id));
  }, [selectedGroup, selectedBillIds]);

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

  // Batch update billing status for all currently active/selected bills in this group
  const handleBatchUpdateStatus = async (targetStatus: GovBillingStatus) => {
    if (activeStatementBills.length === 0) return;

    const label = targetStatus === 'billed' ? 'วางบิลแล้ว' : targetStatus === 'paid' ? 'ชำระเงิน/เบิกจ่ายแล้ว' : 'รอวางบิล';
    const confirmed = window.confirm(`ต้องการปรับสถานะทั้ง ${activeStatementBills.length} บิล เป็น "${label}" หรือไม่?`);
    if (!confirmed) return;

    try {
      setIsUpdatingStatus(true);
      for (const bill of activeStatementBills) {
        if (bill.source === 'pos') {
          await dbService.updatePOSSaleBillingStatus(bill.id, targetStatus);
        } else {
          await dbService.updateTicketBillingStatus(bill.id, targetStatus);
        }
      }
    } catch (err) {
      console.error('Failed to batch update billing status:', err);
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Filter groups in sidebar by search
  const filteredGroups = groupedAgencies.filter(g => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      g.agencyName.toLowerCase().includes(term) ||
      g.taxId.includes(term) ||
      g.department.toLowerCase().includes(term) ||
      g.bills.some(b => b.docNumber.toLowerCase().includes(term) || b.orderNumber.toLowerCase().includes(term))
    );
  });

  const todayThaiDate = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const statementDocNo = `BILL-${(selectedGroup?.taxId || 'GOV').slice(-6)}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

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
                รวมบิลขายหน้าร้านและงานซ่อมที่เลขประจำตัวผู้เสียภาษีตรงกัน เพื่อออกใบวางบิลรวมฉบับเดียว
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!selectedGroup || activeStatementBills.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบวางบิลรวม (A4)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
                  placeholder="ค้นหาชื่อหน่วยงาน หรือเลขผู้เสียภาษี..."
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
                  <p className="font-semibold">ไม่พบข้อมูลเครดิตราชการ</p>
                  <p className="text-[11px] text-slate-400">
                    เมื่อทำรายการขาย POS หรือเปิดใบรับซ่อม ให้เลือกวิธีชำระเป็น "เครดิตราชการ" และกรอกเลขผู้เสียภาษี
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
                        <div className="flex items-center gap-1 text-[10px]">
                          {group.pendingCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                              รอ {group.pendingCount}
                            </span>
                          )}
                          {group.billedCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                              วางแล้ว {group.billedCount}
                            </span>
                          )}
                          {group.paidCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                              ชำระแล้ว {group.paidCount}
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

          {/* ================= RIGHT WORKSPACE: CONSOLIDATED STATEMENT PREVIEW & BATCH CONTROLS ================= */}
          <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950/60 overflow-hidden">
            {selectedGroup ? (
              <>
                {/* Control Bar: Select Bills to include & Batch Status Actions (Hidden in Print) */}
                <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllBillsInGroup}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                    >
                      เลือกทุกบิล ({selectedGroup.bills.length})
                    </button>
                    <span className="text-xs text-slate-500">
                      เลือกแล้ว {activeStatementBills.length} จาก {selectedGroup.bills.length} บิล
                    </span>
                  </div>

                  {/* Batch Status Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleBatchUpdateStatus('billed')}
                      disabled={isUpdatingStatus || activeStatementBills.length === 0}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      ✓ มาร์คว่า "วางบิลแล้ว"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBatchUpdateStatus('paid')}
                      disabled={isUpdatingStatus || activeStatementBills.length === 0}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      ✓ มาร์คว่า "ชำระเงินแล้ว"
                    </button>
                  </div>
                </div>

                {/* Printable Document Paper Area */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex justify-center print:p-0 print:overflow-visible">
                  <div
                    ref={printAreaRef}
                    id="gov-consolidated-statement-print"
                    className="bg-white text-slate-900 w-full max-w-[760px] p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:max-w-none text-xs font-sans leading-tight space-y-4"
                  >
                    {/* Header: Shop Information */}
                    <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
                      <div className="flex items-start gap-3 max-w-[460px]">
                        {shopSettings.logoUrl ? (
                          <img
                            src={shopSettings.logoUrl}
                            alt={shopSettings.shopName}
                            className="w-14 h-14 object-contain rounded border border-slate-200 p-0.5 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-xl shrink-0">
                            GOV
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                              {shopSettings.shopName}
                            </h1>
                            {shopSettings.branch && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-bold text-slate-700">
                                {shopSettings.branch}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                            {shopSettings.shopAddress}
                          </p>
                          <p className="text-[11px] text-slate-700 font-medium mt-0.5">
                            โทร: <span className="font-bold">{shopSettings.shopPhone}</span> | LINE: <span className="font-bold">{shopSettings.shopLineId}</span>
                            {shopSettings.taxId && (
                              <span> | เลขประจำตัวผู้เสียภาษี: <span className="font-mono font-bold">{shopSettings.taxId}</span></span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block px-3 py-1 rounded bg-purple-900 text-white font-extrabold text-xs uppercase tracking-wider">
                          ใบแจ้งหนี้ / ใบวางบิลรวม (หน่วยงานราชการ)
                        </span>
                        <p className="font-mono font-bold text-sm text-purple-900 mt-1.5">
                          {statementDocNo}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          วันที่ออกเอกสาร: {todayThaiDate}
                        </p>
                      </div>
                    </div>

                    {/* Government Customer Information Box */}
                    <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 space-y-1.5 text-xs text-purple-950">
                      <div className="flex items-center justify-between border-b border-purple-200 pb-1">
                        <span className="font-bold text-sm text-purple-950 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-purple-700" />
                          <span>เรียน ส่วนราชการ / หน่วยงานผู้ขอรับบริการ:</span>
                        </span>
                        <span className="text-[11px] font-bold text-purple-900 bg-purple-200/60 px-2 py-0.5 rounded">
                          รวม {activeStatementBills.length} รายการบิล
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-0.5">
                        <div className="flex justify-between sm:justify-start sm:gap-2">
                          <span className="font-semibold text-slate-600">ชื่อหน่วยงาน:</span>
                          <span className="font-extrabold text-purple-950">{selectedGroup.agencyName}</span>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-2">
                          <span className="font-semibold text-slate-600">เลขประจำตัวผู้เสียภาษี 13 หลัก:</span>
                          <span className="font-mono font-extrabold text-purple-900 bg-white px-2 py-0.2 rounded border border-purple-200">
                            {selectedGroup.taxId || 'ไม่ได้ระบุ'}
                          </span>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-2">
                          <span className="font-semibold text-slate-600">ฝ่าย / งานพัสดุ:</span>
                          <span>{selectedGroup.department || 'งานพัสดุ / บริหารทั่วไป'}</span>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-2">
                          <span className="font-semibold text-slate-600">ผู้สั่งจ้าง / ติดต่อ:</span>
                          <span>{selectedGroup.contactPerson || '-'} {selectedGroup.contactPhone ? `(${selectedGroup.contactPhone})` : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Consolidated Bills Table */}
                    <div className="border border-slate-300 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                          <tr>
                            <th className="py-2 px-2.5 text-center w-8 print:hidden">เลือก</th>
                            <th className="py-2 px-2 text-center w-8">#</th>
                            <th className="py-2 px-2.5 w-24">วันที่</th>
                            <th className="py-2 px-2.5 w-32">เลขที่เอกสารอ้างอิง</th>
                            <th className="py-2 px-2.5 w-28">เลขที่ใบสั่งซื้อ (PO)</th>
                            <th className="py-2 px-3">รายการพัสดุ / บริการซ่อมบำรุง</th>
                            <th className="py-2 px-3 text-right w-24">จำนวนเงิน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[11px]">
                          {selectedGroup.bills.map((bill, idx) => {
                            const isIncluded = selectedBillIds.has(bill.id);
                            return (
                              <tr
                                key={bill.id}
                                className={`transition-colors ${isIncluded ? 'bg-white' : 'bg-slate-50/70 text-slate-400 print:hidden'}`}
                              >
                                <td className="py-2 px-2.5 text-center print:hidden">
                                  <button
                                    type="button"
                                    onClick={() => toggleBillSelection(bill.id)}
                                    className="cursor-pointer text-purple-600"
                                  >
                                    {isIncluded ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                                  </button>
                                </td>
                                <td className="py-2 px-2 text-center font-bold text-slate-500">
                                  {idx + 1}
                                </td>
                                <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap">
                                  {bill.date}
                                </td>
                                <td className="py-2 px-2.5 font-mono font-bold text-purple-900 whitespace-nowrap">
                                  <div className="flex items-center gap-1">
                                    {bill.source === 'pos' ? (
                                      <Receipt className="w-3 h-3 text-emerald-600 inline" />
                                    ) : (
                                      <Wrench className="w-3 h-3 text-blue-600 inline" />
                                    )}
                                    <span>{bill.docNumber}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-2.5 font-mono font-bold text-blue-800 whitespace-nowrap">
                                  {bill.orderNumber}
                                </td>
                                <td className="py-2 px-3 text-slate-800 leading-snug">
                                  {bill.itemsDescription}
                                </td>
                                <td className="py-2 px-3 text-right font-extrabold text-slate-900 whitespace-nowrap">
                                  ฿{bill.totalAmount.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary Totals & BahtText Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Left: PromptPay QR for Combined Grand Total */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                        {promptPayQrUrl ? (
                          <img
                            src={promptPayQrUrl}
                            alt="PromptPay QR Code"
                            className="w-20 h-20 bg-white p-1 rounded-lg border border-slate-300 shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-slate-200 rounded-lg flex items-center justify-center text-xs">QR</div>
                        )}
                        <div className="text-[10px] space-y-0.5 leading-tight">
                          <span className="font-bold text-[#002D62] block text-[11px] flex items-center gap-1">
                            <QrCode className="w-3.5 h-3.5 inline text-[#002D62]" />
                            <span>สแกนชำระพร้อมเพย์ยอดรวม</span>
                          </span>
                          <p className="text-slate-600">
                            บัญชี: <span className="font-bold text-slate-800">{shopSettings.bankAccountName || shopSettings.shopName}</span>
                          </p>
                          <p className="text-slate-600 font-mono">
                            พร้อมเพย์: <span className="font-bold text-slate-800">{shopSettings.promptPayId || '083-426-8058'}</span>
                          </p>
                          <p className="text-[11px] font-black text-purple-900 pt-0.5">
                            ยอดรวม: ฿{statementGrandTotal.toLocaleString()} บาท
                          </p>
                        </div>
                      </div>

                      {/* Right: Consolidated Calculations */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>รวมยอดเงินก่อนลด ({activeStatementBills.length} บิล):</span>
                          <span>฿{statementSubtotal.toLocaleString()}</span>
                        </div>
                        {statementDiscount > 0 && (
                          <div className="flex justify-between text-rose-600 font-semibold">
                            <span>รวมส่วนลดพิเศษ:</span>
                            <span>-฿{statementDiscount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-300 font-extrabold text-slate-900">
                          <span className="text-sm">ยอดสุทธิที่ต้องวางบิลทั้งสิ้น:</span>
                          <span className="text-lg font-black text-purple-900">฿{statementGrandTotal.toLocaleString()}</span>
                        </div>
                        <div className="pt-1 border-t border-slate-200 text-center font-bold text-purple-950 text-xs">
                          ( {statementBahtText} )
                        </div>
                      </div>
                    </div>

                    {/* Official Government 3-Signoff Boxes */}
                    <div className="pt-4 border-t-2 border-slate-800 space-y-3">
                      <div className="font-bold text-slate-800 text-center uppercase tracking-wider text-xs">
                        หลักฐานการวางบิลและตรวจรับพัสดุ (สำหรับหน่วยงานราชการ)
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="text-center p-2.5 rounded-xl border border-slate-300 space-y-5">
                          <p className="font-bold text-slate-800">ผู้วางบิล / ผู้ส่งมอบงาน</p>
                          <div className="border-b border-dotted border-slate-400 mx-6"></div>
                          <p className="text-slate-500 text-[10px]">
                            (............................................................)
                            <br />
                            วันที่ ...... / ...... / ..........
                            <br />
                            <span className="font-medium text-slate-700">{shopSettings.shopName}</span>
                          </p>
                        </div>

                        <div className="text-center p-2.5 rounded-xl border border-slate-300 space-y-5">
                          <p className="font-bold text-slate-800">ผู้รับวางบิล / เจ้าหน้าที่พัสดุ</p>
                          <div className="border-b border-dotted border-slate-400 mx-6"></div>
                          <p className="text-slate-500 text-[10px]">
                            (............................................................)
                            <br />
                            วันที่ ...... / ...... / ..........
                            <br />
                            <span className="font-medium text-slate-700">{selectedGroup.agencyName}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-center p-2.5 rounded-xl border border-slate-300 space-y-4 max-w-md mx-auto">
                        <p className="font-bold text-slate-800">ผู้มีอำนาจอนุมัติเบิกจ่าย / ผู้บังคับบัญชา</p>
                        <div className="border-b border-dotted border-slate-400 mx-10"></div>
                        <p className="text-slate-500 text-[10px]">
                          (............................................................)
                          <br />
                          วันที่ ...... / ...... / ..........
                        </p>
                      </div>
                    </div>

                    {/* Document Footer */}
                    <div className="pt-2 text-center text-[10px] text-slate-500 border-t border-dashed border-slate-300 mt-2">
                      <p className="font-semibold text-slate-700">
                        {shopSettings.receiptFooterMessage || 'ขอขอบพระคุณที่ให้ความไว้วางใจเลือกใช้บริการ'}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        เอกสารนี้ออกโดยระบบบริหารจัดการร้าน พัทลุงปริ้นเตอร์ คอมพิวเตอร์ เพื่อใช้ประกอบการเบิกจ่ายตามระเบียบพัสดุราชการ
                      </p>
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
    </div>
  );
};
