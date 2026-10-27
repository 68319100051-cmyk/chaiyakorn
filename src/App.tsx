import React, { useState, useEffect } from 'react';
import { RepairTicket, InventoryItem, ShopSettings, RepairStatus, UsedPart, POSSaleRecord } from './types';
import { dbService } from './services/db';
import { testConnection } from './firebase/config';
import { INITIAL_SHOP_SETTINGS } from './utils/mockSeedData';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { RepairTickets } from './components/RepairTickets';
import { InventoryManager } from './components/InventoryManager';
import { POSView } from './components/POSView';
import { POSReceiptModal } from './components/POSReceiptModal';
import { DailyReportView } from './components/DailyReportView';
import { CustomerPublicPortal } from './components/CustomerPublicPortal';
import { TicketFormModal } from './components/TicketFormModal';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { LineNotificationModal } from './components/LineNotificationModal';
import { ShopSettingsModal } from './components/ShopSettingsModal';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets' | 'inventory' | 'pos' | 'reports'>('dashboard');
  
  // Dedicated Customer Portal State (True separation between Customer & Admin)
  const [customerTicketNumber, setCustomerTicketNumber] = useState<string | null>(null);

  // Data States
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [posSales, setPosSales] = useState<POSSaleRecord[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings>(INITIAL_SHOP_SETTINGS);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

  // Modals State
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<RepairTicket | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [ticketToPrint, setTicketToPrint] = useState<RepairTicket | null>(null);

  const [isPOSReceiptOpen, setIsPOSReceiptOpen] = useState(false);
  const [selectedSaleToPrint, setSelectedSaleToPrint] = useState<POSSaleRecord | null>(null);

  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [ticketToLine, setTicketToLine] = useState<RepairTicket | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Check URL query parameters on initial mount (e.g. ?track=REP-20261026-001)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackParam = params.get('track');
    if (trackParam && trackParam.trim()) {
      setCustomerTicketNumber(trackParam.trim());
    }
  }, []);

  // Initialize Database & Real-time Listeners
  useEffect(() => {
    // Test initial connection
    testConnection().then(connected => {
      setIsCloudConnected(connected);
    });

    // Seed data if empty
    dbService.initializeAndSeed();

    // Subscribe to Firestore updates
    const unsubTickets = dbService.subscribeTickets(list => {
      setTickets(list);
    });

    const unsubInventory = dbService.subscribeInventory(items => {
      setInventory(items);
    });

    const unsubSettings = dbService.subscribeSettings(settings => {
      setShopSettings(settings);
    });

    const unsubPOS = dbService.subscribePOSSales(sales => {
      setPosSales(sales);
    });

    return () => {
      unsubTickets();
      unsubInventory();
      unsubSettings();
      unsubPOS();
    };
  }, []);

  // POS Operations
  const handleCompleteSale = async (sale: POSSaleRecord) => {
    setPosSales(prev => [sale, ...prev.filter(s => s.id !== sale.id)]);
    await dbService.savePOSSale(sale);
  };

  const handleViewPOSReceipt = (sale: POSSaleRecord) => {
    setSelectedSaleToPrint(sale);
    setIsPOSReceiptOpen(true);
  };

  // Ticket Operations
  const handleOpenNewTicket = () => {
    setTicketToEdit(null);
    setIsTicketFormOpen(true);
  };

  const handleOpenEditTicket = (ticket: RepairTicket) => {
    setTicketToEdit(ticket);
    setIsTicketFormOpen(true);
  };

  const handleSaveTicket = async (ticket: RepairTicket, previousParts: UsedPart[]) => {
    // Optimistic update immediately so the new or updated ticket shows right away
    setTickets(prev => {
      const idx = prev.findIndex(t => t.id === ticket.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = ticket;
        return copy;
      }
      return [ticket, ...prev];
    });

    try {
      await dbService.saveTicket(ticket, previousParts);
    } catch (err) {
      console.error('Failed to save ticket in dbService:', err);
    }
    setIsTicketFormOpen(false);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    await dbService.deleteTicket(ticketId);
  };

  const handleUpdateStatus = async (ticketId: string, status: RepairStatus) => {
    await dbService.updateTicketStatus(ticketId, status);
  };

  const handleUpdateTicketDiscount = async (ticketId: string, newDiscount: number) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const subtotal = (ticket.laborCost || 0) + (ticket.partsCost || 0);
    const validDiscount = Math.max(0, Math.min(newDiscount, subtotal));
    const newTotal = Math.max(0, subtotal - validDiscount);
    await dbService.updateTicketStatus(ticketId, ticket.status, {
      discount: validDiscount,
      totalAmount: newTotal
    });
  };

  const handlePrintTicket = (ticket: RepairTicket) => {
    setTicketToPrint(ticket);
    setIsPrintModalOpen(true);
  };

  const handleLineNotify = (ticket: RepairTicket) => {
    setTicketToLine(ticket);
    setIsLineModalOpen(true);
  };

  const handleMarkLineNotified = async (ticketId: string) => {
    await dbService.updateTicketStatus(ticketId, undefined as any, {
      lineNotified: true,
      lastLineNotifiedAt: new Date().toISOString()
    });
  };

  // When admin clicks to view the Customer QR Live portal for a ticket
  const handleOpenTrackingFromTicket = (ticket: RepairTicket) => {
    setCustomerTicketNumber(ticket.ticketNumber);
    const newUrl = `${window.location.pathname}?track=${encodeURIComponent(ticket.ticketNumber)}`;
    window.history.pushState({ track: ticket.ticketNumber }, '', newUrl);
  };

  // Exit customer mode back to Admin
  const handleSwitchToAdmin = () => {
    const confirmed = window.confirm('ต้องการเปลี่ยนกลับไปยังหน้าจัดการหลังร้าน (Admin Dashboard) หรือไม่?');
    if (confirmed) {
      setCustomerTicketNumber(null);
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  // Inventory Operations
  const handleSaveInventoryItem = async (item: InventoryItem) => {
    await dbService.saveInventoryItem(item);
  };

  const handleDeleteInventoryItem = async (itemId: string) => {
    await dbService.deleteInventoryItem(itemId);
  };

  const handleAdjustStock = async (itemId: string, diff: number) => {
    await dbService.adjustStock(itemId, diff);
  };

  // Settings Operations
  const handleSaveSettings = async (settings: ShopSettings) => {
    await dbService.saveSettings(settings);
  };

  // Badge counts
  const activeTicketsCount = tickets.filter(
    t => t.status !== 'completed' && t.status !== 'cancelled'
  ).length;

  const lowStockCount = inventory.filter(
    i => i.stockQuantity <= i.minStockAlert
  ).length;

  // =========================================================================
  // IF CUSTOMER SCANNED QR CODE (track query parameter present):
  // RENDER PURELY THE CUSTOMER PORTAL — NO ADMIN NAVBAR, NO ADMIN BUTTONS!
  // =========================================================================
  if (customerTicketNumber) {
    return (
      <CustomerPublicPortal
        ticketNumber={customerTicketNumber}
        shopSettings={shopSettings}
        onSwitchToAdmin={handleSwitchToAdmin}
      />
    );
  }

  // =========================================================================
  // OTHERWISE: RENDER FULL ADMIN DASHBOARD SYSTEM
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Admin Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewTicket={handleOpenNewTicket}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeTicketsCount={activeTicketsCount}
        lowStockCount={lowStockCount}
        shopName={shopSettings.shopName}
        logoUrl={shopSettings.logoUrl}
        onPreviewCustomer={() => {
          if (tickets.length > 0) {
            handleOpenTrackingFromTicket(tickets[0]);
          } else {
            alert('ยังไม่มีข้อมูลงานซ่อมในระบบ กรุณาเปิดใบรับซ่อมก่อน');
          }
        }}
      />

      {/* Main Admin Content Area (Hidden during printing so only the ticket prints) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:hidden">
        {activeTab === 'dashboard' && (
          <Dashboard
            tickets={tickets}
            inventory={inventory}
            posSales={posSales}
            onNewTicket={handleOpenNewTicket}
            onOpenPOS={() => setActiveTab('pos')}
            onSelectTicket={handleOpenEditTicket}
            onPrintTicket={handlePrintTicket}
            onLineNotify={handleLineNotify}
            onViewAllTickets={() => setActiveTab('tickets')}
            onViewInventory={() => setActiveTab('inventory')}
          />
        )}

        {activeTab === 'tickets' && (
          <RepairTickets
            tickets={tickets}
            onNewTicket={handleOpenNewTicket}
            onEditTicket={handleOpenEditTicket}
            onDeleteTicket={handleDeleteTicket}
            onUpdateStatus={handleUpdateStatus}
            onUpdateDiscount={handleUpdateTicketDiscount}
            onPrintTicket={handlePrintTicket}
            onLineNotify={handleLineNotify}
            onOpenTracking={handleOpenTrackingFromTicket}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManager
            inventory={inventory}
            onSaveItem={handleSaveInventoryItem}
            onDeleteItem={handleDeleteInventoryItem}
            onAdjustStock={handleAdjustStock}
          />
        )}

        {activeTab === 'pos' && (
          <POSView
            inventory={inventory}
            shopSettings={shopSettings}
            salesHistory={posSales}
            onCompleteSale={handleCompleteSale}
            onSaveInventoryItem={handleSaveInventoryItem}
            onViewReceipt={handleViewPOSReceipt}
            generateNextReceiptNumber={() => dbService.generateNextPOSReceiptNumber(posSales)}
          />
        )}

        {activeTab === 'reports' && (
          <DailyReportView
            tickets={tickets}
            posSales={posSales}
            shopSettings={shopSettings}
            onSelectTicket={handleOpenEditTicket}
            onPrintTicket={handlePrintTicket}
            onViewPOSReceipt={handleViewPOSReceipt}
          />
        )}
      </main>

      {/* Admin Footer (hidden in print) */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-4 text-center text-xs text-slate-500 print:hidden">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <span>{shopSettings.shopName}</span>
          <span className="hidden sm:inline">•</span>
          <span>ระบบบริหารจัดการร้านซ่อมคอมพิวเตอร์และปริ้นเตอร์ (Admin Portal)</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Cloud Firestore เชื่อมต่อแล้ว
          </span>
        </div>
      </footer>

      {/* Modals */}
      <TicketFormModal
        isOpen={isTicketFormOpen}
        onClose={() => setIsTicketFormOpen(false)}
        onSave={handleSaveTicket}
        ticketToEdit={ticketToEdit}
        inventory={inventory}
        allTickets={tickets}
        generateNextTicketNumber={() => dbService.generateNextTicketNumber(tickets)}
      />

      <PrintReceiptModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        ticket={ticketToPrint}
        shopSettings={shopSettings}
      />

      <POSReceiptModal
        isOpen={isPOSReceiptOpen}
        onClose={() => setIsPOSReceiptOpen(false)}
        sale={selectedSaleToPrint}
        shopSettings={shopSettings}
      />

      <LineNotificationModal
        isOpen={isLineModalOpen}
        onClose={() => setIsLineModalOpen(false)}
        ticket={ticketToLine}
        shopSettings={shopSettings}
        onMarkNotified={handleMarkLineNotified}
      />

      <ShopSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={shopSettings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
