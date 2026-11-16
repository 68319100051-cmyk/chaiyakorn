import React, { useState, useEffect } from 'react';
import { ShopSettings } from '../types';
import { DEFAULT_GOV_ALERT_DAYS, normalizeGovAlertDays } from '../utils/govCredit';
import { X, Store, ShieldCheck, Check, CreditCard, Bell } from 'lucide-react';

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
  const [shopName, setShopName] = useState(settings.shopName);
  const [branch, setBranch] = useState(settings.branch || 'สำนักงานใหญ่');
  const [shopPhone, setShopPhone] = useState(settings.shopPhone);
  const [shopLineId, setShopLineId] = useState(settings.shopLineId);
  const [email, setEmail] = useState(settings.email || 'poi1800@gmail.com');
  const [facebook, setFacebook] = useState(settings.facebook || 'facebook.com/phatthalungprinter');
  const [shopAddress, setShopAddress] = useState(settings.shopAddress);
  const [taxId, setTaxId] = useState(settings.taxId || '0935562018892');
  const [promptPayId, setPromptPayId] = useState(settings.promptPayId || '0834268058');
  const [bankName, setBankName] = useState(settings.bankName || 'ธนาคารกสิกรไทย สาขาพัทลุง');
  const [bankAccountNumber, setBankAccountNumber] = useState(settings.bankAccountNumber || '083-4-26805-8');
  const [bankAccountName, setBankAccountName] = useState(settings.bankAccountName || 'พัทลุงปริ้นเตอร์ คอมพิวเตอร์');
  const [receiptFooterMessage, setReceiptFooterMessage] = useState(settings.receiptFooterMessage);
  const [warrantyTerms, setWarrantyTerms] = useState(settings.warrantyTerms);
  const [govAlertDaysInput, setGovAlertDaysInput] = useState(
    (settings.govAlertDays && settings.govAlertDays.length > 0 ? settings.govAlertDays : DEFAULT_GOV_ALERT_DAYS).join('/')
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setShopName(settings.shopName);
    setBranch(settings.branch || 'สำนักงานใหญ่');
    setShopPhone(settings.shopPhone);
    setShopLineId(settings.shopLineId);
    setEmail(settings.email || 'poi1800@gmail.com');
    setFacebook(settings.facebook || 'facebook.com/phatthalungprinter');
    setShopAddress(settings.shopAddress);
    setTaxId(settings.taxId || '0935562018892');
    setPromptPayId(settings.promptPayId || '0834268058');
    setBankName(settings.bankName || 'ธนาคารกสิกรไทย สาขาพัทลุง');
    setBankAccountNumber(settings.bankAccountNumber || '083-4-26805-8');
    setBankAccountName(settings.bankAccountName || 'พัทลุงปริ้นเตอร์ คอมพิวเตอร์');
    setReceiptFooterMessage(settings.receiptFooterMessage);
    setWarrantyTerms(settings.warrantyTerms);
    setGovAlertDaysInput(
      (settings.govAlertDays && settings.govAlertDays.length > 0 ? settings.govAlertDays : DEFAULT_GOV_ALERT_DAYS).join('/')
    );
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAlertDays = normalizeGovAlertDays(govAlertDaysInput);
    const updated: ShopSettings = {
      ...settings,
      shopName: shopName.trim(),
      branch: branch.trim(),
      shopPhone: shopPhone.trim(),
      shopLineId: shopLineId.trim(),
      email: email.trim() || undefined,
      facebook: facebook.trim() || undefined,
      shopAddress: shopAddress.trim(),
      taxId: taxId.trim() || undefined,
      promptPayId: promptPayId.trim() || undefined,
      bankName: bankName.trim() || undefined,
      bankAccountNumber: bankAccountNumber.trim() || undefined,
      bankAccountName: bankAccountName.trim() || undefined,
      receiptFooterMessage: receiptFooterMessage.trim(),
      warrantyTerms: warrantyTerms.trim(),
      govAlertDays: parsedAlertDays,
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={shopName}
                className="w-10 h-10 object-contain rounded-xl bg-white p-0.5 border border-slate-200"
              />
            ) : (
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
                <Store className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                ข้อมูลร้าน & บัญชีรับเงิน (พัทลุงปริ้นเตอร์ คอมพิวเตอร์)
              </h3>
              <p className="text-xs text-slate-500">
                ข้อมูลจะแสดงบนหัวบิล สลิปใบรับซ่อม และลิงก์ตรวจสถานะของลูกค้า
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
          {/* 1. General Profile */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-1.5">
              <Store className="w-4 h-4 text-blue-500" />
              <span>ข้อมูลสถานประกอบการ</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อร้าน (Store Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  สาขา (Branch)
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  placeholder="สำนักงานใหญ่"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  เบอร์โทรติดต่อร้าน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={shopPhone}
                  onChange={e => setShopPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  LINE ID
                </label>
                <input
                  type="text"
                  value={shopLineId}
                  onChange={e => setShopLineId(e.target.value)}
                  placeholder="poi1800"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  เลขประจำตัวผู้เสียภาษี
                </label>
                <input
                  type="text"
                  value={taxId}
                  onChange={e => setTaxId(e.target.value)}
                  placeholder="0935562018892"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  อีเมล (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="poi1800@gmail.com"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Facebook Page
                </label>
                <input
                  type="text"
                  value={facebook}
                  onChange={e => setFacebook(e.target.value)}
                  placeholder="facebook.com/phatthalungprinter"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ที่อยู่ร้านค้า (แสดงบนหัวบิลและสลิป)
                </label>
                <input
                  type="text"
                  value={shopAddress}
                  onChange={e => setShopAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* 2. Bank & PromptPay Accounts */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-1.5">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>ข้อมูลการชำระเงิน (พร้อมเพย์ / บัญชีธนาคาร)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  เบอร์พร้อมเพย์ (PromptPay ID)
                </label>
                <input
                  type="text"
                  value={promptPayId}
                  onChange={e => setPromptPayId(e.target.value)}
                  placeholder="0834268058"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ธนาคาร & สาขา
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="ธนาคารกสิกรไทย สาขาพัทลุง"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  เลขที่บัญชีธนาคาร
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={e => setBankAccountNumber(e.target.value)}
                  placeholder="083-4-26805-8"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* 3. Warranty & Footer */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              <span>เงื่อนไขการรับประกันและข้อความท้ายบิล</span>
            </h4>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                เงื่อนไขการรับประกันงานซ่อม (Warranty Terms)
              </label>
              <textarea
                rows={3}
                value={warrantyTerms}
                onChange={e => setWarrantyTerms(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 leading-relaxed font-sans"
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
          </div>

          {/* 4. Government Bill Alert Threshold Settings */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-1.5">
              <Bell className="w-4 h-4 text-amber-500" />
              <span>ระบบแจ้งเตือนบิลราชการ (เวลาประเทศไทย Asia/Bangkok)</span>
            </h4>

            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                จำนวนวันแจ้งเตือนล่วงหน้าก่อนครบกำหนด (คั่นด้วย / หรือ , เช่น 7/3/1)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={govAlertDaysInput}
                  onChange={e => setGovAlertDaysInput(e.target.value)}
                  placeholder="7/3/1"
                  className="w-40 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 font-mono font-bold text-slate-800 dark:text-white"
                />
                <span className="text-[11px] text-slate-500">
                  ค่าที่ใช้งาน: {normalizeGovAlertDays(govAlertDaysInput).join(', ')} วันก่อนครบกำหนด
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>บันทึกสำเร็จ</span>
                </>
              ) : (
                <span>บันทึกข้อมูลร้านค้า</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
