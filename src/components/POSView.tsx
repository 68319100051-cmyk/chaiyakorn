import React, { useState, useMemo } from 'react';
import {
  InventoryItem,
  ShopSettings,
  POSCartItem,
  POSSaleRecord,
  InventoryCategory
} from '../types';
import {
  Search,
  Plus,
  Trash2,
  Minus,
  ShoppingCart,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Package,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  Printer,
  Sparkles,
  Tag
} from 'lucide-react';

interface POSViewProps {
  inventory: InventoryItem[];
  shopSettings: ShopSettings;
  salesHistory: POSSaleRecord[];
  onCompleteSale: (sale: POSSaleRecord) => Promise<void>;
  onSaveInventoryItem: (item: InventoryItem) => Promise<void>;
  onViewReceipt: (sale: POSSaleRecord) => void;
  generateNextReceiptNumber: () => string;
}

const CATEGORY_TABS: { key: 'all' | InventoryCategory; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'accessories', label: 'อุปกรณ์เสริม & หน้าร้าน' },
  { key: 'printer_ink', label: 'หมึกพิมพ์ & โทนเนอร์' },
  { key: 'computer_parts', label: 'อะไหล่คอมพิวเตอร์' },
  { key: 'printer_parts', label: 'อะไหล่ปริ้นเตอร์' },
  { key: 'consumables', label: 'วัสดุสิ้นเปลือง' }
];

export const POSView: React.FC<POSViewProps> = ({
  inventory,
  shopSettings,
  salesHistory,
  onCompleteSale,
  onSaveInventoryItem,
  onViewReceipt,
  generateNextReceiptNumber
}) => {
  // Cart State
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | InventoryCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Checkout & Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cashierName, setCashierName] = useState('พนักงานหน้าร้าน');
  const [discountInput, setDiscountInput] = useState('0');
  const [discountMode, setDiscountMode] = useState<'baht' | 'percent'>('baht');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'credit'>('cash');
  const [cashReceivedInput, setCashReceivedInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Custom Product Entry Modal
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customCategory, setCustomCategory] = useState<InventoryCategory>('accessories');
  const [customBrand, setCustomBrand] = useState('ทั่วไป');
  const [customPrice, setCustomPrice] = useState('');
  const [customCost, setCustomCost] = useState('');
  const [customUnit, setCustomUnit] = useState('ชิ้น');
  const [customInitialStock, setCustomInitialStock] = useState('10');
  const [customCartQty, setCustomCartQty] = useState('1');

  // Sales History Tab/Drawer
  const [showHistory, setShowHistory] = useState(false);

  // Filter products from inventory
  const filteredProducts = useMemo(() => {
    return inventory.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.itemCode.toLowerCase().includes(term) ||
        item.brand.toLowerCase().includes(term);
      return matchCat && matchSearch;
    });
  }, [inventory, selectedCategory, searchTerm]);

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountVal = parseFloat(discountInput) || 0;
  const calculatedDiscount =
    discountMode === 'percent'
      ? Math.round((subtotal * Math.min(100, Math.max(0, discountVal))) / 100)
      : Math.min(subtotal, Math.max(0, discountVal));

  const totalAmount = Math.max(0, subtotal - calculatedDiscount);
  const cashReceived = parseFloat(cashReceivedInput) || 0;
  const change = Math.max(0, cashReceived - totalAmount);

  // Add Item from Inventory to Cart
  const handleAddToCart = (item: InventoryItem) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(c => c.inventoryItemId === item.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        const currentQty = copy[existingIdx].quantity;
        const newQty = currentQty + 1;
        copy[existingIdx].quantity = newQty;
        copy[existingIdx].total = newQty * copy[existingIdx].price;
        return copy;
      } else {
        const newItem: POSCartItem = {
          id: `cart-${Date.now()}-${item.id}`,
          inventoryItemId: item.id,
          itemCode: item.itemCode,
          name: item.name,
          category: item.category,
          price: item.sellingPrice,
          costPrice: item.costPrice || 0,
          quantity: 1,
          unit: item.unit || 'ชิ้น',
          total: item.sellingPrice,
          isCustomItem: false
        };
        return [newItem, ...prev];
      }
    });
  };

  // Update Cart Item Quantity
  const handleUpdateQty = (cartId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.id === cartId) {
            const nextQty = Math.max(1, item.quantity + delta);
            return {
              ...item,
              quantity: nextQty,
              total: nextQty * item.price
            };
          }
          return item;
        })
        .filter(item => item.quantity > 0);
    });
  };

  // Remove from Cart
  const handleRemoveItem = (cartId: string) => {
    setCart(prev => prev.filter(c => c.id !== cartId));
  };

  // Open Custom Item Modal
  const handleOpenCustomModal = () => {
    const nextCode = `ITEM-${Date.now().toString().slice(-5)}`;
    setCustomCode(nextCode);
    setCustomName('');
    setCustomPrice('');
    setCustomCost('');
    setCustomCategory('accessories');
    setCustomBrand('ทั่วไป');
    setCustomUnit('ชิ้น');
    setCustomInitialStock('10');
    setCustomCartQty('1');
    setIsCustomModalOpen(true);
  };

  // Save Custom Item to Inventory & Add to Cart immediately
  const handleSaveCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      alert('กรุณากรอกชื่อสินค้า');
      return;
    }
    const sellPrice = parseFloat(customPrice) || 0;
    if (sellPrice <= 0) {
      alert('กรุณาระบุราคาขายที่มากกว่า 0 บาท');
      return;
    }

    const costPrice = parseFloat(customCost) || Math.round(sellPrice * 0.7);
    const cartQty = Math.max(1, parseInt(customCartQty, 10) || 1);
    const initialStock = Math.max(cartQty, parseInt(customInitialStock, 10) || cartQty);
    const itemId = `inv-${Date.now()}`;
    const code = customCode.trim() || `ITEM-${Date.now().toString().slice(-5)}`;

    // 1. Create new Inventory Item to permanently persist into inventory stock
    const newInventoryItem: InventoryItem = {
      id: itemId,
      itemCode: code,
      name: customName.trim(),
      category: customCategory,
      brand: customBrand.trim() || 'ทั่วไป',
      costPrice,
      sellingPrice: sellPrice,
      stockQuantity: initialStock, // registered in stock
      minStockAlert: 2,
      unit: customUnit.trim() || 'ชิ้น',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // Save directly into inventory (Firestore & local cache)
      await onSaveInventoryItem(newInventoryItem);

      // 2. Add into Cart
      const newCartItem: POSCartItem = {
        id: `cart-${Date.now()}`,
        inventoryItemId: itemId,
        itemCode: code,
        name: customName.trim(),
        category: customCategory,
        price: sellPrice,
        costPrice,
        quantity: cartQty,
        unit: customUnit.trim() || 'ชิ้น',
        total: sellPrice * cartQty,
        isCustomItem: true
      };

      setCart(prev => [newCartItem, ...prev]);
      setIsCustomModalOpen(false);
    } catch (err) {
      console.error('Failed to save custom item:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกสินค้าใหม่ กรุณาลองอีกครั้ง');
    }
  };

  // Complete Sale & Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('กรุณาเลือกหรือคีย์สินค้าลงตะกร้าก่อนทำรายการชำระเงิน');
      return;
    }

    if (paymentMethod === 'cash' && cashReceivedInput.trim() && cashReceived < totalAmount) {
      alert(`จำนวนเงินสดที่รับมา (฿${cashReceived.toLocaleString()}) น้อยกว่ายอดที่ต้องชำระ (฿${totalAmount.toLocaleString()})`);
      return;
    }

    const receiptNumber = generateNextReceiptNumber();
    const finalAmountReceived = paymentMethod === 'cash'
      ? (cashReceived >= totalAmount ? cashReceived : totalAmount)
      : totalAmount;
    const finalChange = paymentMethod === 'cash' ? Math.max(0, finalAmountReceived - totalAmount) : 0;

    const saleRecord: POSSaleRecord = {
      id: `sale-${Date.now()}`,
      receiptNumber,
      items: cart,
      subtotal,
      discount: calculatedDiscount,
      discountMode,
      totalAmount,
      paymentMethod,
      amountReceived: finalAmountReceived,
      change: finalChange,
      customerName: customerName.trim() || 'ลูกค้าทั่วไป (หน้าร้าน)',
      customerPhone: customerPhone.trim() || '',
      cashierName: cashierName.trim() || 'เจ้าหน้าที่ประจำร้าน',
      createdAt: new Date().toISOString()
    };

    try {
      setIsSubmitting(true);
      await onCompleteSale(saleRecord);

      // Reset cart and checkout fields
      setCart([]);
      setDiscountInput('0');
      setCashReceivedInput('');
      setCustomerName('');
      setCustomerPhone('');

      // Open receipt modal immediately
      onViewReceipt(saleRecord);
    } catch (err) {
      console.error('Failed to checkout:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกการขาย กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Today sales calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = salesHistory.filter(s => s.createdAt.startsWith(todayStr));
  const todayTotalRevenue = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>ระบบขายหน้าร้าน (POS)</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                พร้อมตัดสต็อกอัตโนมัติ
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              {shopSettings.shopName} • ขายสินค้า ตัดสต็อก คีย์สินค้าเพิ่มเอง และออกใบเสร็จรับเงิน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Custom Product Entry Button */}
          <button
            type="button"
            onClick={handleOpenCustomModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>คีย์สินค้าใหม่ลงสต็อก</span>
          </button>

          {/* Sales History Toggle */}
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold text-xs transition-colors cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span>ประวัติขายวันนี้ ({todaySales.length})</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Catalog / Right Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Product Catalog & Search (7 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Search & Categories Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาสินค้า / อะไหล่ / หมึกพิมพ์ (ชื่อ, รหัส, ยี่ห้อ)..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORY_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === tab.key
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map(item => {
              const inCartQty = cart.find(c => c.inventoryItemId === item.id)?.quantity || 0;
              const isOutOfStock = item.stockQuantity <= 0;

              return (
                <div
                  key={item.id}
                  onClick={() => handleAddToCart(item)}
                  className={`group relative bg-white dark:bg-slate-800 p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between hover:shadow-md hover:border-emerald-500/50 ${
                    inCartQty > 0
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {/* In Cart Counter Badge */}
                  {inCartQty > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md animate-in zoom-in-75">
                      {inCartQty}
                    </span>
                  )}

                  <div>
                    {/* Item Code & Stock Pill */}
                    <div className="flex items-center justify-between gap-1 text-[10px] mb-1.5">
                      <span className="font-mono text-slate-400 truncate max-w-[80px]">
                        {item.itemCode}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md font-semibold truncate ${
                          isOutOfStock
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                            : item.stockQuantity <= item.minStockAlert
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {isOutOfStock ? 'หมด' : `เหลือ ${item.stockQuantity} ${item.unit || 'ชิ้น'}`}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white line-clamp-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {item.name}
                    </h3>

                    {/* Brand */}
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {item.brand}
                    </p>
                  </div>

                  {/* Price & Add Action */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        ฿{item.sellingPrice.toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-700 space-y-3">
              <Package className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                ไม่พบสินค้าในสต็อกตรงกับคำค้นหา
              </p>
              <button
                type="button"
                onClick={handleOpenCustomModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>คีย์สินค้าใหม่ลงสต็อกและขายทันที</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Cart & Cashier Checkout (5 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
          {/* Cart Header */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                รายการขาย ({cart.reduce((s, c) => s + c.quantity, 0)} ชิ้น)
              </h2>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                ล้างตะกร้า
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="p-3 max-h-[360px] overflow-y-auto space-y-2">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs">ยังไม่มีสินค้าในบิลขาย</p>
                <p className="text-[11px] text-slate-400">
                  คลิกเลือกสินค้าจากรายการทางซ้าย หรือกดปุ่ม "คีย์สินค้าใหม่"
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0 pr-1">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span>฿{item.price.toLocaleString()} / {item.unit || 'ชิ้น'}</span>
                      {item.isCustomItem && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                          สินค้าคีย์ใหม่
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-bold text-xs text-slate-800 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.id, 1)}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Total & Delete */}
                  <div className="text-right shrink-0 min-w-[65px]">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      ฿{item.total.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-slate-400 hover:text-rose-500 text-[10px] transition-colors mt-0.5"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer & Discount Controls */}
          <div className="p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
            {/* Customer Name / Phone (Optional) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  ชื่อลูกค้า (เว้นว่างได้)
                </label>
                <input
                  type="text"
                  placeholder="ลูกค้าทั่วไป"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  เบอร์โทร
                </label>
                <input
                  type="text"
                  placeholder="08X-XXX-XXXX"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Discount selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  ส่วนลดให้ลูกค้า
                </label>
                <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded text-[10px]">
                  <button
                    type="button"
                    onClick={() => setDiscountMode('baht')}
                    className={`px-1.5 py-0.5 rounded ${
                      discountMode === 'baht' ? 'bg-white dark:bg-slate-800 font-bold text-blue-600' : 'text-slate-500'
                    }`}
                  >
                    บาท (฿)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountMode('percent')}
                    className={`px-1.5 py-0.5 rounded ${
                      discountMode === 'percent' ? 'bg-white dark:bg-slate-800 font-bold text-blue-600' : 'text-slate-500'
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={discountInput}
                  onChange={e => setDiscountInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-right"
                />
                {/* Presets */}
                {['20', '50', '100'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setDiscountMode('baht');
                      setDiscountInput(val);
                    }}
                    className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-[10px] font-semibold"
                  >
                    ฿{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                ช่องทางชำระเงิน
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-xs font-semibold transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Banknote className="w-4 h-4 mb-0.5" />
                  <span>เงินสด</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-xs font-semibold transition-all ${
                    paymentMethod === 'transfer'
                      ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <QrCode className="w-4 h-4 mb-0.5" />
                  <span>โอน / สแกน</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-xs font-semibold transition-all ${
                    paymentMethod === 'credit'
                      ? 'bg-purple-50 dark:bg-purple-950/80 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mb-0.5" />
                  <span>บัตรเครดิต</span>
                </button>
              </div>
            </div>

            {/* Cash Input & Change Helper (If Cash selected) */}
            {paymentMethod === 'cash' && (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">รับเงินสดมา:</span>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">฿</span>
                    <input
                      type="number"
                      placeholder={String(totalAmount)}
                      value={cashReceivedInput}
                      onChange={e => setCashReceivedInput(e.target.value)}
                      className="w-full pl-6 pr-2 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-xs font-bold text-right"
                    />
                  </div>
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex items-center gap-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setCashReceivedInput(String(totalAmount))}
                    className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold"
                  >
                    พอดี
                  </button>
                  {[100, 500, 1000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashReceivedInput(String(amt))}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300"
                    >
                      ฿{amt}
                    </button>
                  ))}
                </div>

                {/* Real-time Change Indicator */}
                {cashReceived >= totalAmount && totalAmount > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-700 dark:text-emerald-300 pt-1 border-t border-emerald-200 dark:border-emerald-800/60">
                    <span>เงินทอนลูกค้า:</span>
                    <span className="text-base font-black">฿{change.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* PromptPay Info (If Transfer selected) */}
            {paymentMethod === 'transfer' && (
              <div className="bg-blue-50/70 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>พร้อมเพย์ / โอนธนาคาร:</span>
                  <span className="font-mono">{shopSettings.promptPayId || shopSettings.bankAccountNumber || shopSettings.shopPhone}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {shopSettings.bankName || 'ธนาคารกสิกรไทย สาขาพัทลุง'} • {shopSettings.bankAccountName || shopSettings.shopName}
                </p>
              </div>
            )}
          </div>

          {/* Pricing Totals & Final Checkout Button */}
          <div className="p-4 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>ยอดรวมสินค้า:</span>
                <span>฿{subtotal.toLocaleString()}</span>
              </div>
              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>ส่วนลด:</span>
                  <span>-฿{calculatedDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
                <span className="font-bold text-sm">ยอดชำระสุทธิ:</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ฿{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>กำลังบันทึกบิล...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  <span>บันทึกการขาย & พิมพ์ใบเสร็จ (฿{totalAmount.toLocaleString()})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Custom Product Modal (ถ้าคีย์เพิ่มเองให้เข้าไปอยู่ในสต็อกด้วยเลย) */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                    คีย์สินค้าด่วน & เพิ่มลงสต็อกร้าน
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    สินค้าจะถูกบันทึกลงคลังสต็อกร้านถาวรและใส่ลงตะกร้าทันที
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomItem} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  ชื่อสินค้า / อะไหล่ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สายชาร์จ Type-C, เม้าส์ไร้สาย, หมึกเติม, ฯลฯ"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    รหัสสินค้า
                  </label>
                  <input
                    type="text"
                    value={customCode}
                    onChange={e => setCustomCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="accessories">อุปกรณ์เสริม & หน้าร้าน</option>
                    <option value="printer_ink">หมึกพิมพ์ & โทนเนอร์</option>
                    <option value="computer_parts">อะไหล่คอมพิวเตอร์</option>
                    <option value="printer_parts">อะไหล่ปริ้นเตอร์</option>
                    <option value="consumables">วัสดุสิ้นเปลือง</option>
                    <option value="tools">เครื่องมือช่าง</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ราคาขาย (บาท) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="0.00"
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ราคาทุน (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="คำนวณอัตโนมัติ"
                    value={customCost}
                    onChange={e => setCustomCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    หน่วย
                  </label>
                  <input
                    type="text"
                    value={customUnit}
                    onChange={e => setCustomUnit(e.target.value)}
                    placeholder="ชิ้น"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    สต็อกตั้งต้น
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customInitialStock}
                    onChange={e => setCustomInitialStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ใส่ลงบิลนี้
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customCartQty}
                    onChange={e => setCustomCartQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center font-bold text-blue-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  บันทึกลงสต็อกร้าน & ใส่ในบิล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales History Drawer / Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-800 dark:text-white">
                  ประวัติบิลขายหน้าร้านวันนี้ ({todaySales.length} รายการ • รวม ฿{todayTotalRevenue.toLocaleString()})
                </h3>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {todaySales.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  ยังไม่มีรายการขายหน้าร้านในวันนี้
                </div>
              ) : (
                todaySales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {sale.receiptNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(sale.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        {sale.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        ลูกค้า: {sale.customerName || 'ลูกค้าทั่วไป'} • วิธี: {sale.paymentMethod}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">
                        ฿{sale.totalAmount.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => onViewReceipt(sale)}
                        className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
                        title="ดูและพิมพ์ใบเสร็จซ้ำ"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
