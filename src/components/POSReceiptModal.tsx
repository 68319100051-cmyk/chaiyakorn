import React, { useRef, useState } from 'react';
import { POSSaleRecord, ShopSettings } from '../types';
import {
  Printer,
  X,
  CheckCircle2,
  Receipt,
  Store,
  Phone,
  Calendar,
  CreditCard,
  User,
  Share2
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
  const printContentRef = useRef<HTMLDivElement>(null);

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

  const paymentMethodLabel = {
    cash: 'เงินสด (Cash)',
    transfer: 'โอนเงิน (PromptPay / Transfer)',
    credit: 'บัตรเครดิต (Credit Card)'
  }[sale.paymentMethod];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span>ใบเสร็จรับเงินการขายหน้าร้าน</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                  {sale.receiptNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                บันทึกการขายสำเร็จ • ออกใบเสร็จและตัดสต็อกสินค้าเรียบร้อย
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper format toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setPaperSize('slip80')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
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
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  paperSize === 'a5'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                ขนาด A5
              </button>
            </div>

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
                ? 'w-full max-w-[340px] p-5 rounded-xl font-sans text-xs'
                : 'w-full max-w-[520px] p-8 rounded-2xl font-sans text-xs'
            }`}
          >
            {/* Header: Shop Information */}
            <div className="text-center space-y-1.5 border-b border-dashed border-slate-300 pb-4">
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
              <h1 className="text-base font-extrabold tracking-tight text-slate-900">
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
                <p className="text-[10px] text-slate-500">
                  เลขประจำตัวผู้เสียภาษี: {shopSettings.taxId}
                </p>
              )}
            </div>

            {/* Receipt Meta */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="text-center font-bold text-sm tracking-wider uppercase text-slate-800">
                ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ
              </div>
              <div className="flex justify-between text-slate-700 pt-1">
                <span>เลขที่ใบเสร็จ:</span>
                <span className="font-mono font-bold">{sale.receiptNumber}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>วันที่/เวลา:</span>
                <span>{formattedDate}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between text-slate-700">
                  <span>ลูกค้า:</span>
                  <span className="font-semibold">{sale.customerName} {sale.customerPhone ? `(${sale.customerPhone})` : ''}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>พนักงานขาย:</span>
                <span>{sale.cashierName || 'เจ้าหน้าที่ประจำร้าน'}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-slate-300">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                    <th className="pb-1.5 font-bold">รายการสินค้า</th>
                    <th className="pb-1.5 font-bold text-center w-12">จน.</th>
                    <th className="pb-1.5 font-bold text-right w-16">ราคา</th>
                    <th className="pb-1.5 font-bold text-right w-16">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-2 pr-1">
                        <div className="font-semibold text-slate-800 leading-tight">
                          {item.name}
                        </div>
                        {item.itemCode && (
                          <div className="font-mono text-[9px] text-slate-400">
                            {item.itemCode}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-center text-slate-700">
                        {item.quantity} {item.unit || 'ชิ้น'}
                      </td>
                      <td className="py-2 text-right text-slate-700">
                        {item.price.toLocaleString()}
                      </td>
                      <td className="py-2 text-right font-bold text-slate-900">
                        {item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculation & Summary */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-xs">
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

              <div className="flex justify-between items-baseline pt-2 border-t border-slate-300 text-base font-black text-slate-950">
                <span>ยอดสุทธิทั้งสิ้น:</span>
                <span className="text-lg">฿{sale.totalAmount.toLocaleString()}</span>
              </div>

              <div className="pt-2 text-[11px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>วิธีชำระเงิน:</span>
                  <span className="font-semibold text-slate-800">{paymentMethodLabel}</span>
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

            {/* Footer Notice */}
            <div className="pt-4 text-center text-[10px] text-slate-500 space-y-1">
              <p className="font-bold text-slate-700">
                {shopSettings.receiptFooterMessage || 'ขอบพระคุณที่ไว้วางใจใช้บริการ'}
              </p>
              <p className="text-[9px] text-slate-400">
                สินค้าซื้อแล้วกรุณาเก็บใบเสร็จเพื่อใช้เป็นหลักฐานการรับประกัน
              </p>
              <p className="font-mono text-[9px] text-slate-300 pt-1">
                Printed: {new Date().toISOString().replace('T', ' ').slice(0, 19)}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer (Hidden in Print) */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden bg-white dark:bg-slate-800 rounded-b-2xl">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>ยอดชำระ ฿{sale.totalAmount.toLocaleString()} ({paymentMethodLabel})</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ใบเสร็จ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
