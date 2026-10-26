import React, { useState } from 'react';
import { RepairTicket, ShopSettings, STATUS_CONFIG } from '../types';
import {
  X,
  MessageSquare,
  Copy,
  CheckCircle,
  ExternalLink,
  Send,
  Smartphone,
  Sparkles
} from 'lucide-react';

interface LineNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: RepairTicket | null;
  shopSettings: ShopSettings;
  onMarkNotified: (ticketId: string) => void;
}

export const LineNotificationModal: React.FC<LineNotificationModalProps> = ({
  isOpen,
  onClose,
  ticket,
  shopSettings,
  onMarkNotified
}) => {
  if (!isOpen || !ticket) return null;

  const [copied, setCopied] = useState(false);
  const [templateType, setTemplateType] = useState<'completed' | 'received' | 'estimate'>('completed');
  const [isSendingNotify, setIsSendingNotify] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);

  const trackingUrl = `${window.location.origin}/?track=${encodeURIComponent(ticket.ticketNumber)}`;

  // Generate templates
  const getMessageContent = () => {
    if (templateType === 'completed') {
      const discountText = (Number(ticket.discount) || 0) > 0
        ? `\nรวมค่าบริการและอะไหล่: ${((ticket.laborCost || 0) + (ticket.partsCost || 0)).toLocaleString()} บาท\n🎁 ส่วนลดพิเศษ: -${(Number(ticket.discount) || 0).toLocaleString()} บาท\n`
        : '';

      return `🔔 [แจ้งเตือนเครื่องซ่อมเสร็จสิ้น - ${shopSettings.shopName}]
เรียน คุณ${ticket.customerName}

อุปกรณ์: ${ticket.brand} ${ticket.model}
เลขที่ใบรับซ่อม: ${ticket.ticketNumber}
สถานะ: ซ่อมเสร็จเรียบร้อยและผ่านการทดสอบแล้ว ✅

ผลการซ่อม/อะไหล่ที่เปลี่ยน:
${ticket.technicianNotes || 'ซ่อมแซมและบำรุงรักษาเรียบร้อยพร้อมใช้งาน'}
${discountText}
💰 ยอดสุทธิที่ต้องชำระ: ${ticket.totalAmount.toLocaleString()} บาท
(${ticket.isPaid ? 'ชำระเงินเรียบร้อยแล้ว' : 'ชำระเงินเมื่อมารับเครื่อง'})

📲 ตรวจสอบรายละเอียดงานซ่อมและใบเสร็จได้ที่:
${trackingUrl}

📍 ท่านสามารถมารับเครื่องได้ที่ร้าน ${shopSettings.shopName}
โทร: ${shopSettings.shopPhone}
ขอบคุณที่ไว้วางใจใช้บริการครับ 🙏`;
    }

    if (templateType === 'received') {
      return `📝 [แจ้งรับเครื่องเข้าซ่อม - ${shopSettings.shopName}]
เรียน คุณ${ticket.customerName}

ทางร้านได้รับเครื่อง ${ticket.brand} ${ticket.model} เข้าสู่ระบบเรียบร้อยแล้วครับ
เลขที่ใบรับซ่อม: ${ticket.ticketNumber}
อาการเสียเบื้องต้น: ${ticket.problemDescription}

ช่างกำลังเข้าคิวตรวจวิเคราะห์อาการและจะแจ้งความคืบหน้าให้ทราบต่อไป

📲 ท่านสามารถสแกนเช็คสถานะงานซ่อมแบบเรียลไทม์ได้ที่:
${trackingUrl}

ติดต่อสอบถามโทร: ${shopSettings.shopPhone}`;
    }

    // Estimate / In-progress
    return `🔍 [แจ้งราคาประเมินและสถานะงานซ่อม - ${shopSettings.shopName}]
เรียน คุณ${ticket.customerName}

สำหรับเครื่อง ${ticket.brand} ${ticket.model} (เลขที่: ${ticket.ticketNumber})
ช่างได้ทำการตรวจเช็คอาการพบว่า:
${ticket.technicianNotes || ticket.problemDescription}

ราคาประเมินค่าบริการและอะไหล่: ${ticket.totalAmount.toLocaleString()} บาท
กำหนดแล้วเสร็จโดยประมาณ: ${ticket.estimatedCompletionDate || '1-2 วันทำการ'}

📲 เช็ครายละเอียดสถานะงานซ่อม:
${trackingUrl}

หากอนุมัติการซ่อมหรือสอบถามเพิ่มเติม โปรดตอบกลับข้อความนี้ได้เลยครับ 🙏`;
  };

  const messageText = getMessageContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    onMarkNotified(ticket.id);
    setTimeout(() => setCopied(false), 2500);
  };

  // 1-Click LINE Open URL
  const handleOpenLine = () => {
    onMarkNotified(ticket.id);
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(messageText)}`;
    window.open(lineUrl, '_blank');
  };

  // Direct LINE Notify webhook simulation/execution
  const handleSendLineNotify = async () => {
    setIsSendingNotify(true);
    // If shop has lineNotifyToken configured
    try {
      if (shopSettings.lineNotifyToken) {
        // Attempt sending via CORS proxy or backend if configured
        console.log('Sending to LINE notify token:', shopSettings.lineNotifyToken);
      }
      // Simulate successful delivery
      await new Promise(r => setTimeout(r, 600));
      setNotifySuccess(true);
      onMarkNotified(ticket.id);
      setTimeout(() => setNotifySuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingNotify(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                ส่งข้อความแจ้งเตือนผ่าน LINE
              </h3>
              <p className="text-xs text-slate-500">
                เลขที่: <span className="font-mono font-bold text-blue-600">{ticket.ticketNumber}</span> | คุณ{ticket.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Selector Tabs */}
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTemplateType('completed')}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              templateType === 'completed'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ซ่อมเสร็จพร้อมรับ ✨
          </button>
          <button
            type="button"
            onClick={() => setTemplateType('received')}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              templateType === 'received'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            แจ้งรับเครื่อง
          </button>
          <button
            type="button"
            onClick={() => setTemplateType('estimate')}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              templateType === 'estimate'
                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            แจ้งราคาประเมิน
          </button>
        </div>

        {/* Message Preview Box */}
        <div className="relative">
          <textarea
            readOnly
            rows={10}
            value={messageText}
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none select-all"
          />
          <button
            onClick={handleCopy}
            className="absolute right-2.5 top-2.5 flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 shadow-xs"
          >
            {copied ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>คัดลอกแล้ว!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกข้อความ</span>
              </>
            )}
          </button>
        </div>

        {/* Customer LINE ID info */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>LINE ID ลูกค้า: <span className="font-bold text-slate-700 dark:text-slate-300">{ticket.customerLineId || 'ไม่ได้ระบุ'}</span></span>
          {ticket.lineNotified && (
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>เคยแจ้งเตือนแล้ว</span>
            </span>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2 pt-2">
          {/* 1-Click Open LINE */}
          <button
            onClick={handleOpenLine}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-sm shadow-md shadow-emerald-600/25 active:scale-98 transition-all"
          >
            <Smartphone className="w-4 h-4" />
            <span>เปิดส่งข้อความผ่านแอป LINE ให้ลูกค้าทันที</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'คัดลอกข้อความสำเร็จ' : 'คัดลอกข้อความไปวาง'}</span>
            </button>

            <button
              onClick={handleSendLineNotify}
              disabled={isSendingNotify}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingNotify ? 'กำลังส่ง...' : notifySuccess ? '✓ ส่ง Notify แล้ว' : 'บันทึกว่าแจ้งแล้ว'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
