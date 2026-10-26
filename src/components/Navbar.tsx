import React from 'react';
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  Package,
  FileText,
  Search,
  Plus,
  Settings,
  CloudCheck,
  Smartphone
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'tickets' | 'inventory' | 'reports' | 'tracking';
  setActiveTab: (tab: 'dashboard' | 'tickets' | 'inventory' | 'reports' | 'tracking') => void;
  onNewTicket: () => void;
  onOpenSettings: () => void;
  activeTicketsCount: number;
  lowStockCount: number;
  shopName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNewTicket,
  onOpenSettings,
  activeTicketsCount,
  lowStockCount,
  shopName
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                  FixPro
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800 font-medium">
                  Cloud Live
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                {shopName || 'ระบบจัดการร้านซ่อมคอมฯ & ปริ้นเตอร์'}
              </p>
            </div>
          </div>

          {/* Navigation Items */}
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

            <button
              onClick={() => setActiveTab('tracking')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'tracking'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              หน้าเช็คสถานะลูกค้า (QR)
            </button>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNewTicket}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/25 hover:from-blue-600 hover:to-cyan-600 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">เปิดใบรับซ่อมใหม่</span>
              <span className="sm:hidden">รับซ่อม</span>
            </button>

            <button
              onClick={onOpenSettings}
              title="ตั้งค่าร้านค้า & ข้อมูลออกบิล"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile secondary navigation */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded ${
              activeTab === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>แดชบอร์ด</span>
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded relative ${
              activeTab === 'tickets' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>งานซ่อม</span>
            {activeTicketsCount > 0 && (
              <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded relative ${
              activeTab === 'inventory' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>สต็อก</span>
            {lowStockCount > 0 && (
              <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded ${
              activeTab === 'reports' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ยอดขาย</span>
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded ${
              activeTab === 'tracking' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>เช็คสถานะ</span>
          </button>
        </div>
      </div>
    </header>
  );
};
