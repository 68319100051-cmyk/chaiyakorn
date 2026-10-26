import React, { useState, useMemo } from 'react';
import {
  InventoryItem,
  InventoryCategory,
  CATEGORY_LABELS
} from '../types';
import {
  Search,
  Plus,
  Package,
  AlertCircle,
  TrendingUp,
  Edit,
  Trash2,
  ArrowUpDown,
  X,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  onSaveItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAdjustStock: (itemId: string, diff: number) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  inventory,
  onSaveItem,
  onDeleteItem,
  onAdjustStock
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | InventoryCategory>('all');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Quick adjust stock modal state
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');

  // Form Fields
  const [itemCode, setItemCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('printer_parts');
  const [brand, setBrand] = useState('Epson');
  const [modelCompatibility, setModelCompatibility] = useState('');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(10);
  const [minStockAlert, setMinStockAlert] = useState<number>(3);
  const [unit, setUnit] = useState('ชิ้น');
  const [locationShelf, setLocationShelf] = useState('');
  const [notes, setNotes] = useState('');

  // Open add/edit modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setItemCode(`PRT-${Date.now().toString().slice(-4)}`);
    setName('');
    setCategory('printer_parts');
    setBrand('');
    setModelCompatibility('');
    setCostPrice(0);
    setSellingPrice(0);
    setStockQuantity(5);
    setMinStockAlert(2);
    setUnit('ชิ้น');
    setLocationShelf('P-01');
    setNotes('');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setItemCode(item.itemCode);
    setName(item.name);
    setCategory(item.category);
    setBrand(item.brand);
    setModelCompatibility(item.modelCompatibility || '');
    setCostPrice(item.costPrice);
    setSellingPrice(item.sellingPrice);
    setStockQuantity(item.stockQuantity);
    setMinStockAlert(item.minStockAlert);
    setUnit(item.unit);
    setLocationShelf(item.locationShelf || '');
    setNotes(item.notes || '');
    setIsFormModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !itemCode.trim()) {
      alert('กรุณากรอกรหัสสินค้าและชื่อสินค้า');
      return;
    }

    const now = new Date().toISOString();
    const itemData: InventoryItem = {
      id: editingItem ? editingItem.id : `inv-${Date.now()}`,
      itemCode: itemCode.trim().toUpperCase(),
      name: name.trim(),
      category,
      brand: brand.trim(),
      modelCompatibility: modelCompatibility.trim() || undefined,
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      stockQuantity: Number(stockQuantity) || 0,
      minStockAlert: Number(minStockAlert) || 2,
      unit: unit.trim() || 'ชิ้น',
      locationShelf: locationShelf.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: editingItem ? editingItem.createdAt : now,
      updatedAt: now
    };

    onSaveItem(itemData);
    setIsFormModalOpen(false);
  };

  const handleConfirmAdjust = () => {
    if (!adjustingItem) return;
    const diff = adjustType === 'in' ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);
    onAdjustStock(adjustingItem.id, diff);
    setAdjustingItem(null);
  };

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.itemCode.toLowerCase().includes(term) ||
        item.brand.toLowerCase().includes(term) ||
        (item.modelCompatibility && item.modelCompatibility.toLowerCase().includes(term));

      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [inventory, searchTerm, selectedCategory]);

  // Aggregate Metrics
  const totalStockValue = inventory.reduce((sum, i) => sum + i.sellingPrice * i.stockQuantity, 0);
  const totalCostValue = inventory.reduce((sum, i) => sum + i.costPrice * i.stockQuantity, 0);
  const lowStockCount = inventory.filter(i => i.stockQuantity <= i.minStockAlert).length;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span>คลังสินค้า & สต็อกอะไหล่</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold">
              {inventory.length} รายการ
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            จัดการอะไหล่คอมพิวเตอร์ อะไหล่ปริ้นเตอร์ หมึกพิมพ์ และสินค้าหน้าร้าน พร้อมตัดสต็อกอัตโนมัติเมื่องานซ่อมเสร็จ
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-cyan-700 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มอะไหล่ / สินค้าใหม่</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>จำนวนรายการสินค้าทั้งหมด</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">
            {inventory.length} <span className="text-xs font-normal text-slate-500">SKU</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>มูลค่าสต็อกรวม (ราคาขาย)</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            ฿{totalStockValue.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">ต้นทุนรวม ฿{totalCostValue.toLocaleString()}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>สินค้าใกล้หมดสต็อก</span>
            <AlertCircle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </div>
          <p className={`text-2xl font-bold mt-2 ${lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
            {lowStockCount} <span className="text-xs font-normal text-slate-500">รายการที่ต้องสั่งเพิ่ม</span>
          </p>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหารหัสสินค้า, ชื่ออะไหล่, ยี่ห้อ, รุ่นที่รองรับ (เช่น L3150, SSD, RAM, 003)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({inventory.length})
          </button>
          <button
            onClick={() => setSelectedCategory('printer_parts')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              selectedCategory === 'printer_parts'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            อะไหล่ปริ้นเตอร์
          </button>
          <button
            onClick={() => setSelectedCategory('printer_ink')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              selectedCategory === 'printer_ink'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            หมึกพิมพ์ & โทนเนอร์
          </button>
          <button
            onClick={() => setSelectedCategory('computer_parts')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              selectedCategory === 'computer_parts'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            อะไหล่คอมพิวเตอร์
          </button>
          <button
            onClick={() => setSelectedCategory('consumables')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              selectedCategory === 'consumables'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            ซับหมึก / วัสดุสิ้นเปลือง
          </button>
          <button
            onClick={() => setSelectedCategory('accessories')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              selectedCategory === 'accessories'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            อุปกรณ์เสริม & ขายหน้าร้าน
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3">รหัสสินค้า</th>
                <th className="py-3 px-3">ชื่อสินค้า / อะไหล่</th>
                <th className="py-3 px-3">หมวดหมู่ / ยี่ห้อ</th>
                <th className="py-3 px-3">รุ่นที่รองรับ</th>
                <th className="py-3 px-3 text-right">ราคาทุน</th>
                <th className="py-3 px-3 text-right">ราคาขาย</th>
                <th className="py-3 px-3 text-center">คงเหลือ</th>
                <th className="py-3 px-3 text-center">ที่เก็บ</th>
                <th className="py-3 px-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredInventory.map(item => {
                const isLowStock = item.stockQuantity <= item.minStockAlert;
                const isOutOfStock = item.stockQuantity <= 0;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {item.itemCode}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.name}
                      </div>
                      {item.notes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">{item.brand}</div>
                      <div className="text-[10px] text-slate-400">
                        {CATEGORY_LABELS[item.category]?.split('(')[0]}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {item.modelCompatibility || '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500 whitespace-nowrap">
                      ฿{item.costPrice.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      ฿{item.sellingPrice.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 animate-pulse'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {item.stockQuantity} {item.unit}
                        </span>
                        {isLowStock && (
                          <span className="text-[10px] text-rose-500 font-medium mt-0.5">
                            เตือนต่ำกว่า {item.minStockAlert}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {item.locationShelf || '-'}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setAdjustingItem(item);
                            setAdjustAmount(1);
                            setAdjustType('in');
                          }}
                          className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-semibold"
                          title="ปรับเพิ่ม/ลดจำนวนสต็อก"
                        >
                          +/- สต็อก
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`ต้องการลบรายการ ${item.name} ออกจากสต็อกหรือไม่?`)) {
                              onDeleteItem(item.id);
                            }
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Adjust Stock Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                ปรับยอดสต็อกอะไหล่
              </h3>
              <button
                onClick={() => setAdjustingItem(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200">{adjustingItem.name}</p>
              <p className="text-slate-500 mt-0.5">
                รหัส: {adjustingItem.itemCode} | ปัจจุบันคงเหลือ:{' '}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {adjustingItem.stockQuantity} {adjustingItem.unit}
                </span>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setAdjustType('in')}
                  className={`flex-1 py-2 font-bold text-center ${
                    adjustType === 'in'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  + รับเข้าสต็อก (Stock In)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('out')}
                  className={`flex-1 py-2 font-bold text-center ${
                    adjustType === 'out'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  - จ่ายออก/ปรับลด (Stock Out)
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  จำนวน ({adjustingItem.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-base"
                />
              </div>

              <div className="text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                ยอดใหม่หลังปรับ:{' '}
                <span className="font-bold text-blue-600">
                  {Math.max(
                    0,
                    adjustType === 'in'
                      ? adjustingItem.stockQuantity + adjustAmount
                      : adjustingItem.stockQuantity - adjustAmount
                  )}{' '}
                  {adjustingItem.unit}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjust}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                ยืนยันการปรับยอด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Inventory Item Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                {editingItem ? 'แก้ไขข้อมูลอะไหล่/สินค้า' : 'เพิ่มอะไหล่หรือสินค้าใหม่'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสสินค้า (Item Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น SSD-M2-500, INK-EPS-003"
                    value={itemCode}
                    onChange={e => setItemCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    หมวดหมู่สินค้า <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as InventoryCategory)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="printer_parts">อะไหล่ปริ้นเตอร์ (หัวพิมพ์/ลูกยาง/สายแพร)</option>
                    <option value="printer_ink">หมึกพิมพ์ / โทนเนอร์</option>
                    <option value="computer_parts">อะไหล่คอมพิวเตอร์ (CPU/RAM/SSD/PSU)</option>
                    <option value="consumables">ซับหมึก / วัสดุสิ้นเปลือง / ซิลิโคน</option>
                    <option value="accessories">อุปกรณ์ต่อพ่วง / สินค้าหน้าร้าน</option>
                    <option value="tools">เครื่องมือช่าง</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อสินค้า / ชื่ออะไหล่ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น หมึกแท้ Epson 003 สีดำ, RAM DDR4 8GB 3200"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ยี่ห้อ (Brand)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Epson, Canon, Kingston"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    รุ่นที่รองรับ (Model Compatibility)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น L3110 / L3150 / L3250"
                    value={modelCompatibility}
                    onChange={e => setModelCompatibility(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ราคาทุน (฿)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={costPrice}
                    onChange={e => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ราคาขาย / คิดค่าอะไหล่ (฿) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={sellingPrice}
                    onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    จำนวนคงเหลือเริ่มต้น <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockQuantity}
                    onChange={e => setStockQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    แจ้งเตือนเมื่อเหลือน้อยกว่า (Min Alert)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minStockAlert}
                    onChange={e => setMinStockAlert(parseInt(e.target.value) || 2)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    หน่วยนับ
                  </label>
                  <input
                    type="text"
                    placeholder="ชิ้น, ขวด, ตลับ, หลอด, กล่อง"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ตู้ / ชั้นวาง (Location)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น A-01, P-02, ลิ้นชัก 3"
                    value={locationShelf}
                    onChange={e => setLocationShelf(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    หมายเหตุ / ข้อมูลเพิ่มเติม
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ประกันศูนย์ 3 ปี, ของแท้ OEM"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  บันทึกสินค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
