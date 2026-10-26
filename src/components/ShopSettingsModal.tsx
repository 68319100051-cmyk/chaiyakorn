import React, { useState } from 'react';
import { ShopSettings } from '../types';
import { X, Settings, Store, Phone, MessageSquare, ShieldCheck, FileText, Check } from 'lucide-react';

interface ShopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
  onSave: (settings: ShopSettings) => void;
}

export const ShopSettingsModal: React.FC<ShopSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave
}) => {
  if (!isOpen) return null;

  const [shopName, setShopName] = useState(settings.shopName);
  const [shopPhone, setShopPhone] = useState(settings.shopPhone);
  const [shopLineId, setShopLineId] = useState(settings.shopLineId);
  const [shopAddress, setShopAddress] = useState(settings.shopAddress);
  const [taxId, setTaxId] = useState(settings.taxId || '');
  const [receiptFooterMessage, setReceiptFooterMessage] = useState(settings.receiptFooterMessage);
  const [warrantyTerms, setWarrantyTerms] = useState(settings.warrantyTerms);
  const [lineNotifyToken, setLineNotifyToken] = useState(settings.lineNotifyToken || '');
  const [lineNotifyEnabled, setLineNotifyEnabled] = useState(settings.lineNotifyEnabled);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ShopSettings = {
      ...settings,
      shopName: shopName.trim(),
      shopPhone: shopPhone.trim(),
      shopLineId: shopLineId.trim(),
      shopAddress: shopAddress.trim(),
      taxId: taxId.trim() || undefined,
      receiptFooterMessage: receiptFooterMessage.trim(),
      warrantyTerms: warrantyTerms.trim(),
      lineNotifyToken: lineNotifyToken.trim() || undefined,
      lineNotifyEnabled,
      updatedAt: new Date().toISOString()
    };
    onSave(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                ตั้งค่าข้อมูลร้าน & เงื่อนไขออกบิล
              </h3>
              <p className="text-xs text-slate-500">
                ข้อมูลที่จะแสดงบนหัวใบรับซ่อม ใบเสร็จ และข้อความแจ้งเตือนลูกค้า
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ชื่อร้าน (Shop Name) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                เบอร์โทรติดต่อร้าน <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={shopPhone}
                onChange={e => setShopPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                LINE Official Account / ID
              </label>
              <input
                type="text"
                value={shopLineId}
                onChange={e => setShopLineId(e.target.value)}
                placeholder="@fixpro_service"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ที่อยู่ร้าน (แสดงบนหัวบิลและแผนที่)
            </label>
            <textarea
              rows={2}
              value={shopAddress}
              onChange={e => setShopAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 leading-relaxed"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              เลขประจำตัวผู้เสียภาษี (ถ้ามี)
            </label>
            <input
              type="text"
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
              placeholder="0-1055-XXXXX-XX-X"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              เงื่อนไขการรับประกันงานซ่อม (Warranty Terms)
            </label>
            <textarea
              rows={2}
              value={warrantyTerms}
              onChange={e => setWarrantyTerms(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ข้อความท้ายใบเสร็จ (Receipt Footer)
            </label>
            <input
              type="text"
              value={receiptFooterMessage}
              onChange={e => setReceiptFooterMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 space-y-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              การเชื่อมต่อ LINE Notify Token (ไม่บังคับ)
            </span>
            <p className="text-[11px] text-slate-500">
              หากต้องการส่งแจ้งเตือนเข้ากลุ่มไลน์ช่างอัตโนมัติเมื่อมีเครื่องเข้าซ่อมหรือซ่อมเสร็จ
            </p>
            <input
              type="password"
              placeholder="ใส่ LINE Notify Token จาก notify-bot.line.me"
              value={lineNotifyToken}
              onChange={e => setLineNotifyToken(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>บันทึกสำเร็จ</span>
                </>
              ) : (
                <span>บันทึกการตั้งค่า</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
