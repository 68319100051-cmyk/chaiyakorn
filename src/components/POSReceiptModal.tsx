import React, { useRef, useState, useEffect } from 'react';
import { POSSaleRecord, ShopSettings } from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import {
  Printer,
  X,
  CheckCircle2,
  Receipt,
  Building2,
  QrCode,
  FileText
} from 'lucide-react';

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
  const [paperSize, setPaperSize] = useState<'slip80' | 'a5'>('slip80');
  const [showPromptPayQr, setShowPromptPayQr] = useState<boolean>(true);
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string>('');
  const printContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sale) {
      const promptPayTarget = shopSettings.promptPayId || shopSettings.shopPhone || '0834268058';
      generatePromptPayQRDataUrl(promptPayTarget, sale.totalAmount, { width: 220 })
        .then(url => setPromptPayQrUrl(url))
        .catch(err => console.error('Failed to generate PromptPay QR:', err));
    }
  }, [sale, shopSettings]);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(sale.createdAt).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const isGovCredit = sale.paymentMethod === 'gov_credit';

  const paymentMethodLabel: Record<string, string> = {
    cash: 'เงินสด (Cash)',
    transfer: 'โอนเงิน (PromptPay / Transfer)',
    credit: 'บัตรเครดิต (Credit Card)',
    gov_credit: 'เครดิตราชการ / วางบิล (Government Credit)'
  };

  const govStatusLabel: Record<string, { label: string; color: string }> = {
    pending_billing: { label: 'รอวางบิล / เอกสารเบิกจ่าย', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    billed: { label: 'วางบิลแล้ว (รอดำเนินการเบิกจ่าย)', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    paid: { label: 'ชำระเงิน/เบิกจ่ายเรียบร้อย', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
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
                <span>{isGovCredit ? 'ใบส่งของ / ใบวางบิลเครดิตราชการ' : 'ใบเสร็จรับเงินการขายหน้าร้าน'}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  isGovCredit
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {sale.receiptNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {isGovCredit ? 'รายการเครดิตสำหรับหน่วยงานราชการ/โรงเรียน' : 'บันทึกการขายสำเร็จ • ออกใบเสร็จและตัดสต็อกเรียบร้อย'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
                ขนาด A5 (เต็มแผ่น)
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 dark:bg-slate-900/60 flex justify-center">
          {/* Printable Receipt Paper Container */}
          <div
            ref={printContentRef}
            id="pos-receipt-print-area"
            className={`bg-white text-slate-900 shadow-xl border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 ${
              paperSize === 'slip80'
                ? 'w-full max-w-[350px] p-5 rounded-xl font-sans text-xs'
                : 'w-full max-w-[620px] p-7 rounded-2xl font-sans text-xs'
            }`}
          >
            {/* Header: Shop Information */}
            <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
              {shopSettings.logoUrl ? (
                <img
                  src={shopSettings.logoUrl}
                  alt={shopSettings.shopName}
                  className="w-14 h-14 mx-auto object-contain mb-1"
                />
              ) : (
                <div className="w-12 h-12 mx-auto rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl mb-1">
                  POS
                </div>
              )}
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">
                {shopSettings.shopName}
              </h1>
              {shopSettings.branch && (
                <p className="text-[11px] text-slate-600">สาขา: {shopSettings.branch}</p>
              )}
              <p className="text-[11px] text-slate-600 leading-tight">
                {shopSettings.shopAddress}
              </p>
              <p className="text-[11px] text-slate-700 font-semibold">
                โทร: {shopSettings.shopPhone}
                {shopSettings.shopLineId && ` • LINE: ${shopSettings.shopLineId}`}
              </p>
              {shopSettings.taxId && (
                <p className="text-[10px] text-slate-500 font-mono">
                  เลขประจำตัวผู้เสียภาษี: {shopSettings.taxId}
                </p>
              )}
            </div>

            {/* Document Title & Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="text-center font-bold text-sm tracking-wide uppercase text-slate-900">
                {isGovCredit
                  ? 'ใบส่งของ / ใบแจ้งหนี้ / ใบวางบิล (หน่วยงานราชการ)'
                  : 'ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ'}
              </div>

              <div className="flex justify-between text-slate-700 pt-1">
                <span>เลขที่เอกสาร:</span>
                <span className="font-mono font-bold text-slate-900">{sale.receiptNumber}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>วันที่ทำรายการ:</span>
                <span>{formattedDate}</span>
              </div>

              {/* Normal Customer Information */}
              {sale.customerName && !isGovCredit && (
                <div className="flex justify-between text-slate-700">
                  <span>ลูกค้า:</span>
                  <span className="font-semibold">
                    {sale.customerName} {sale.customerPhone ? `(${sale.customerPhone})` : ''}
                  </span>
                </div>
              )}

              {/* GOVERNMENT CREDIT DETAILS SECTION */}
              {isGovCredit && sale.govCreditInfo && (
                <div className="mt-2 p-2.5 rounded-lg bg-purple-50/70 border border-purple-200 text-purple-950 space-y-1">
                  <div className="flex items-center gap-1 font-bold text-xs text-purple-900 border-b border-purple-200 pb-1 mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>ข้อมูลส่วนราชการ / หน่วยงานผู้ขอเครดิต</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">หน่วยงาน:</span>
                    <span className="font-bold text-purple-950 text-right">{sale.govCreditInfo.agencyName}</span>
                  </div>
                  {sale.govCreditInfo.taxId && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">เลขผู้เสียภาษี:</span>
                      <span className="font-mono font-semibold">{sale.govCreditInfo.taxId}</span>
                    </div>
                  )}
                  {sale.govCreditInfo.department && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">ฝ่าย/งานพัสดุ:</span>
                      <span className="font-medium">{sale.govCreditInfo.department}</span>
                    </div>
                  )}
                  {sale.govCreditInfo.orderNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">เลขที่ใบสั่งซื้อ (PO):</span>
                      <span className="font-mono font-bold text-blue-800">{sale.govCreditInfo.orderNumber}</span>
                    </div>
                  )}
                  {sale.govCreditInfo.contactPerson && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">ผู้สั่งซื้อ/ติดต่อ:</span>
                      <span className="font-medium">
                        {sale.govCreditInfo.contactPerson} {sale.govCreditInfo.contactPhone ? `(${sale.govCreditInfo.contactPhone})` : ''}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-purple-200/60 font-semibold text-[10px]">
                    <span>ระยะเวลาเครดิต:</span>
                    <span className="text-purple-900">{sale.govCreditInfo.creditDays} วัน (ครบกำหนด: {sale.govCreditInfo.dueDate || '-'})</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>สถานะการวางบิล:</span>
                    <span className="font-bold text-purple-900">
                      {govStatusLabel[sale.govCreditInfo.billingStatus]?.label || 'รอวางบิล'}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>พนักงานขาย:</span>
                <span>{sale.cashierName || 'เจ้าหน้าที่ประจำร้าน'}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                    <th className="pb-1 font-bold">รายการสินค้า</th>
                    <th className="pb-1 font-bold text-center w-10">จน.</th>
                    <th className="pb-1 font-bold text-right w-16">หน่วยละ</th>
                    <th className="pb-1 font-bold text-right w-16">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1.5 pr-1">
                        <div className="font-semibold text-slate-800 leading-tight">
                          {item.name}
                        </div>
                        {item.itemCode && (
                          <div className="font-mono text-[9px] text-slate-400">
                            {item.itemCode}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 text-center text-slate-700">
                        {item.quantity} {item.unit || 'ชิ้น'}
                      </td>
                      <td className="py-1.5 text-right text-slate-700">
                        {item.price.toLocaleString()}
                      </td>
                      <td className="py-1.5 text-right font-bold text-slate-900">
                        {item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculation & Summary */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>รวมเป็นเงิน ({sale.items.reduce((sum, i) => sum + i.quantity, 0)} ชิ้น):</span>
                <span>฿{sale.subtotal.toLocaleString()}</span>
              </div>

              {sale.discount > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>ส่วนลดพิเศษ:</span>
                  <span>-฿{sale.discount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-300 text-sm font-black text-slate-950">
                <span>ยอดสุทธิทั้งสิ้น:</span>
                <span className="text-base text-blue-900 font-extrabold">฿{sale.totalAmount.toLocaleString()}</span>
              </div>

              <div className="pt-1.5 text-[11px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>ช่องทางชำระเงิน:</span>
                  <span className="font-semibold text-slate-800">{paymentMethodLabel[sale.paymentMethod] || sale.paymentMethod}</span>
                </div>

                {sale.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between">
                      <span>รับเงินสดมา:</span>
                      <span>฿{(sale.amountReceived || sale.totalAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>เงินทอน:</span>
                      <span>฿{(sale.change || 0).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* PROMPTPAY QR CODE SECTION */}
            {showPromptPayQr && (
              <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#002D62] text-white text-[10px] font-bold tracking-wider uppercase">
                  <span>THAI QR PAYMENT • พร้อมเพย์</span>
                </div>

                {promptPayQrUrl ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={promptPayQrUrl}
                      alt="PromptPay QR Code"
                      className="w-32 h-32 sm:w-36 sm:h-36 bg-white p-1 rounded-lg border border-slate-300 shadow-xs"
                    />
                    <div className="mt-1.5 text-[10px] text-slate-600 leading-tight">
                      <p className="font-bold text-slate-800">
                        {shopSettings.bankAccountName || shopSettings.shopName}
                      </p>
                      <p className="font-mono text-slate-500">
                        พร้อมเพย์: <span className="font-bold text-slate-700">{shopSettings.promptPayId || shopSettings.shopPhone || '083-426-8058'}</span>
                      </p>
                      {shopSettings.bankAccountNumber && (
                        <p className="text-[9px] text-slate-400">
                          {shopSettings.bankName || 'ธ.กสิกรไทย'}: {shopSettings.bankAccountNumber}
                        </p>
                      )}
                      <p className="text-[11px] font-black text-blue-900 mt-0.5">
                        ยอดสแกนชำระ: ฿{sale.totalAmount.toLocaleString()} บาท
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-slate-200 rounded-lg mx-auto flex items-center justify-center text-xs text-slate-400">
                    กำลังสร้าง QR...
                  </div>
                )}
              </div>
            )}

            {/* GOVERNMENT OFFICIAL SIGNATURES BLOCK (FOR GOV CREDIT / A5) */}
            {isGovCredit && (
              <div className="pt-3 border-t-2 border-slate-800 text-[10px] space-y-4">
                <div className="font-bold text-slate-800 text-center uppercase tracking-wider text-[11px]">
                  หลักฐานการส่งมอบและตรวจรับพัสดุ (สำหรับหน่วยงานราชการ)
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="text-center p-2 rounded-lg border border-slate-200 space-y-5">
                    <p className="font-semibold text-slate-700">ผู้ส่งมอบพัสดุ / บริการ</p>
                    <div className="border-b border-dotted border-slate-400 mx-4"></div>
                    <p className="text-slate-500 text-[9px]">
                      (......................................................)
                      <br />
                      วันที่ ...... / ...... / ..........
                    </p>
                  </div>

                  <div className="text-center p-2 rounded-lg border border-slate-200 space-y-5">
                    <p className="font-semibold text-slate-700">ผู้รับมอบพัสดุ / เจ้าหน้าที่พัสดุ</p>
                    <div className="border-b border-dotted border-slate-400 mx-4"></div>
                    <p className="text-slate-500 text-[9px]">
                      (......................................................)
                      <br />
                      วันที่ ...... / ...... / ..........
                    </p>
                  </div>
                </div>

                <div className="text-center p-2 rounded-lg border border-slate-200 space-y-4 max-w-sm mx-auto">
                  <p className="font-semibold text-slate-700">ประธานกรรมการตรวจรับพัสดุ / ผู้มีอำนาจ</p>
                  <div className="border-b border-dotted border-slate-400 mx-8"></div>
                  <p className="text-slate-500 text-[9px]">
                    (......................................................)
                    <br />
                    วันที่ ...... / ...... / ..........
                  </p>
                </div>
              </div>
            )}

            {/* Footer Notice */}
            <div className="pt-3 text-center text-[10px] text-slate-500 space-y-0.5 border-t border-dashed border-slate-300 mt-2">
              <p className="font-bold text-slate-700">
                {shopSettings.receiptFooterMessage || 'ขอบพระคุณที่ไว้วางใจใช้บริการ'}
              </p>
              <p className="text-[9px] text-slate-400">
                {isGovCredit
                  ? 'เอกสารนี้ใช้เป็นหลักฐานประกอบการเบิกจ่ายตามระเบียบพัสดุราชการ'
                  : 'สินค้าซื้อแล้วกรุณาเก็บใบเสร็จเพื่อใช้เป็นหลักฐานการรับประกัน'}
              </p>
              <p className="font-mono text-[8px] text-slate-300 pt-0.5">
                Printed: {new Date().toISOString().replace('T', ' ').slice(0, 19)}
              </p>
            </div>
          </div>
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
