import React from 'react';
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  Package,
  FileText,
  Plus,
  Settings,
  Smartphone,
  Eye,
  ShoppingCart
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'tickets' | 'inventory' | 'pos' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'tickets' | 'inventory' | 'pos' | 'reports') => void;
  onNewTicket: () => void;
  onOpenSettings: () => void;
  activeTicketsCount: number;
  lowStockCount: number;
  shopName: string;
  logoUrl?: string;
  onPreviewCustomer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNewTicket,
  onOpenSettings,
  activeTicketsCount,
  lowStockCount,
  shopName,
  logoUrl,
  onPreviewCustomer
}) => {
  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Brand Logo & Shop Name */}
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0"
              onClick={() => setActiveTab('dashboard')}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={shopName}
                  className="w-9 h-9 sm:w-11 sm:h-11 object-contain rounded-xl bg-white p-0.5 shadow-md shadow-blue-500/20 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                  <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-extrabold text-sm sm:text-base md:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent truncate max-w-[130px] sm:max-w-xs">
                    {shopName}
                  </span>
                  <span className="hidden xs:inline-block text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 rounded-full bg-blue-950 text-blue-400 border border-blue-800 font-bold uppercase shrink-0">
                    Admin
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate max-w-[160px] sm:max-w-xs">
                  พัทลุง • 083-426-8058
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                แดชบอร์ด
              </button>

              <button
                onClick={() => setActiveTab('tickets')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === 'tickets'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                จัดการงานซ่อม
                {activeTicketsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-slate-950">
                    {activeTicketsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === 'inventory'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Package className="w-4 h-4" />
                คลังสต็อก & อะไหล่
                {lowStockCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                    {lowStockCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('pos')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'pos'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                ขายหน้าร้าน (POS)
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                สรุปยอด & ประวัติ
              </button>
            </nav>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Quick Preview Customer View */}
              <button
                onClick={onPreviewCustomer}
                title="ดูตัวอย่างหน้าลูกค้าเมื่อสแกน QR Code (Live Tracking Portal)"
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 hover:bg-emerald-900/50 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">หน้าลูกค้า (QR)</span>
                <span className="sm:hidden text-[10px]">QR ลูกค้า</span>
              </button>

              {/* Quick New Ticket Action */}
              <button
                onClick={onNewTicket}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/25 hover:from-blue-600 hover:to-cyan-600 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">เปิดใบรับซ่อม</span>
                <span className="sm:hidden">รับซ่อม</span>
              </button>

              {/* Shop Settings */}
              <button
                onClick={onOpenSettings}
                title="ตั้งค่าร้านค้า & ข้อมูลออกบิล"
                className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modern Docked Bottom Navigation Bar for Mobile (Thumb-Friendly) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 shadow-2xl px-1 py-1 flex items-center justify-around print:hidden pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-blue-400 font-bold bg-blue-950/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">แดชบอร์ด</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all relative cursor-pointer ${
            activeTab === 'tickets'
              ? 'text-blue-400 font-bold bg-blue-950/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <ClipboardList className="w-5 h-5 mb-0.5" />
            {activeTicketsCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 min-w-4 text-[9px] font-bold rounded-full bg-amber-500 text-slate-950 text-center">
                {activeTicketsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight">งานซ่อม</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all relative cursor-pointer ${
            activeTab === 'inventory'
              ? 'text-blue-400 font-bold bg-blue-950/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Package className="w-5 h-5 mb-0.5" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 min-w-4 text-[9px] font-bold rounded-full bg-rose-500 text-white text-center">
                {lowStockCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight">สต็อก</span>
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'pos'
              ? 'text-emerald-400 font-bold bg-emerald-950/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-5 h-5 mb-0.5 text-emerald-400" />
          <span className="text-[10px] leading-tight">ขาย POS</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'text-blue-400 font-bold bg-blue-950/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">สรุปบิล</span>
        </button>
      </nav>
    </>
  );
};
