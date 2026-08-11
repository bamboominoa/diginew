import React, { useState, useEffect } from 'react';
import { DatabaseSchema, DonHang, ChiTietDonHang, NguoiDung } from './types';
import { db } from './services/db';
import { startAutoPullTimer, pullDataFromGoogleSheets } from './services/googleSheets';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './components/DashboardView';
import { PosView } from './components/PosView';
import { SerialManagementView } from './components/SerialManagementView';
import { ProductsManagementView } from './components/ProductsManagementView';
import { PurchasesView } from './components/PurchasesView';
import { SalesInvoicesView } from './components/SalesInvoicesView';
import { StockCardsView } from './components/StockCardsView';
import { CustomersView } from './components/CustomersView';
import { SuppliersView } from './components/SuppliersView';
import { SheetsSyncView } from './components/SheetsSyncView';
import { UsersView } from './components/UsersView';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { AiAssistantModal } from './components/AiAssistantModal';

export default function App() {
  const [data, setData] = useState<DatabaseSchema>(db.getFullDatabase());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [activeUser, setActiveUser] = useState<NguoiDung>(
    data.NguoiDung[0] || {
      MaUID: 'ND001',
      TenNguoiDung: 'admin',
      MatKhau: '123456',
      VaiTro: 'Admin',
      QuyenHan: ['ALL'],
      NgayTao: '2025-01-01',
    }
  );

  // Global search input in TopHeader
  const [globalSearch, setGlobalSearch] = useState('');

  // AI Assistant Modal state
  const [showAiModal, setShowAiModal] = useState(false);

  // Print Invoice Modal state after POS sale or order inspection
  const [printModalData, setPrintModalData] = useState<{
    order: DonHang;
    details: ChiTietDonHang[];
  } | null>(null);

  // Auto Sync Toast Notification
  const [syncToast, setSyncToast] = useState<string | null>(null);

  useEffect(() => {
    // Start background auto-pull from Google Sheets (and immediate load on page refresh)
    startAutoPullTimer(15000);

    const handleSynced = (e: Event) => {
      const customEv = e as CustomEvent;
      const time = customEv.detail?.timestamp || new Date().toLocaleTimeString('vi-VN');
      setSyncToast(`⚡ Đã tự động cập nhật toàn bộ dữ liệu mới lên Google Sheets (${time})`);
      setTimeout(() => setSyncToast(null), 3500);
    };

    const handleRemoteUpdated = (e: Event) => {
      const customEv = e as CustomEvent;
      const time = customEv.detail?.timestamp || new Date().toLocaleTimeString('vi-VN');
      setSyncToast(`🔄 Đã cập nhật dữ liệu mới nhất từ thiết bị khác (${time})`);
      setTimeout(() => setSyncToast(null), 3500);
    };

    const handleSheetsPulled = (e: Event) => {
      const customEv = e as CustomEvent;
      const time = customEv.detail?.timestamp || new Date().toLocaleTimeString('vi-VN');
      const newCount = customEv.detail?.newCount || 0;
      const updatedCount = customEv.detail?.updatedCount || 0;
      const parts = [];
      if (newCount > 0) parts.push(`${newCount} hàng mới`);
      if (updatedCount > 0) parts.push(`${updatedCount} hàng chỉnh sửa`);
      
      setSyncToast(`📥 Đã tự động cập nhật ${parts.join(' & ')} từ Google Sheets vào WebApp! (${time})`);
      setTimeout(() => setSyncToast(null), 4000);
    };

    window.addEventListener('google-sheets-synced', handleSynced);
    window.addEventListener('db-remote-updated', handleRemoteUpdated);
    window.addEventListener('google-sheets-pulled', handleSheetsPulled);

    // Connect to Real-time SSE Stream for Instant Google Sheets Row Edits across all devices
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/sheets/events');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.tableName && payload.item) {
            db.mergeFromGoogleSheets({
              [payload.tableName]: [payload.item],
            });
            const time = new Date().toLocaleTimeString('vi-VN');
            const itemKey = payload.item.TenSP || payload.item.MaSP || payload.item.MaDH || payload.item.MaKH || payload.item.MaCauHinh || payload.tableName;
            setSyncToast(`⚡ Google Sheets vừa sửa/thêm dòng [${itemKey}] ở Tab ${payload.tableName} (${time})`);
            setTimeout(() => setSyncToast(null), 4000);
          }
        } catch (err) {
          console.error('Lỗi nhận dữ liệu SSE Google Sheets:', err);
        }
      };
    } catch (e) {
      console.warn('SSE EventSource không hỗ trợ hoặc lỗi kết nối');
    }

    return () => {
      window.removeEventListener('google-sheets-synced', handleSynced);
      window.removeEventListener('db-remote-updated', handleRemoteUpdated);
      window.removeEventListener('google-sheets-pulled', handleSheetsPulled);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Subscribe to Database Changes
  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setData({ ...db.getFullDatabase() });
    });
    return () => unsubscribe();
  }, []);

  // Handle sale completion from POS view
  const handleSaleComplete = (newOrder: DonHang, details: ChiTietDonHang[]) => {
    setPrintModalData({ order: newOrder, details });
  };

  // Global search handler (jumps directly to Serial/IMEI management view)
  const handleGlobalSearchSubmit = (query: string) => {
    setGlobalSearch(query);
    setActiveTab('serials');
  };

  // Manual refresh button handler: pull latest data directly from Google Sheets
  const handleRefreshSheets = async () => {
    setSyncToast('🔄 Đang tải dữ liệu mới từ Google Sheets...');
    let webhookUrl = (localStorage.getItem('GOOGLE_SHEETS_WEBHOOK_URL') || '').trim();
    if (!webhookUrl) {
      const settingObj = data.Setting?.find((s) => s.MaCauHinh === 'WEBHOOK_URL');
      if (settingObj?.GiaTri) webhookUrl = String(settingObj.GiaTri).trim();
    }
    if (!webhookUrl || !webhookUrl.startsWith('http') || webhookUrl.includes('...')) {
      setSyncToast('⚠️ Chưa cấu hình Webhook URL Google Sheets. Vui lòng vào Tab Google Sheets để nhập URL!');
      setTimeout(() => setSyncToast(null), 4000);
      return;
    }
    try {
      const res = await pullDataFromGoogleSheets(webhookUrl);
      if (res.success && res.data) {
        const { newCount, updatedCount } = db.mergeFromGoogleSheets(res.data);
        setSyncToast(`✅ Đã tải dữ liệu từ Google Sheets! (+${newCount} mới, ~${updatedCount} cập nhật)`);
      } else {
        setSyncToast(`⚠️ Google Sheets: ${res.message || 'Không có dữ liệu trả về'}`);
      }
    } catch (err: any) {
      setSyncToast(`❌ Lỗi tải từ Google Sheets: ${err?.message || 'Không thể kết nối'}`);
    }
    setTimeout(() => setSyncToast(null), 4000);
  };

  return (
    <div className="flex h-screen w-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header */}
        <TopHeader
          currentTab={activeTab}
          setCurrentTab={setActiveTab}
          activeUser={activeUser}
          setActiveUser={setActiveUser}
          allUsers={data.NguoiDung || []}
          onSearchSubmit={handleGlobalSearchSubmit}
          onOpenAiAssistant={() => setShowAiModal(true)}
          onRefreshSheets={handleRefreshSheets}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />

        {/* Dynamic Main View */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-slate-950">
          {activeTab === 'dashboard' && (
            <DashboardView data={data} onNavigate={(tab) => setActiveTab(tab)} />
          )}

          {activeTab === 'pos' && (
            <PosView
              data={data}
              activeUserName={activeUser.TenNguoiDung}
              onSaleComplete={handleSaleComplete}
            />
          )}

          {activeTab === 'serials' && (
            <SerialManagementView data={data} initialSearchQuery={globalSearch} />
          )}

          {activeTab === 'products' && <ProductsManagementView data={data} />}

          {activeTab === 'purchases' && (
            <PurchasesView data={data} activeUserName={activeUser.TenNguoiDung} />
          )}

          {activeTab === 'orders' && <SalesInvoicesView data={data} />}

          {activeTab === 'stockcards' && <StockCardsView data={data} />}

          {activeTab === 'customers' && <CustomersView data={data} />}

          {activeTab === 'suppliers' && <SuppliersView data={data} />}

          {activeTab === 'sheets' && <SheetsSyncView data={data} />}

          {activeTab === 'users' && (
            <UsersView
              data={data}
              activeUser={activeUser}
              onSwitchUser={(user) => setActiveUser(user)}
            />
          )}
        </main>
      </div>

      {/* MODAL: AI Assistant */}
      {showAiModal && (
        <AiAssistantModal
          data={data}
          onClose={() => setShowAiModal(false)}
          onNavigateToSerial={(q) => {
            setGlobalSearch(q);
            setActiveTab('serials');
            setShowAiModal(false);
          }}
        />
      )}

      {/* MODAL: Invoice Receipt Print Modal */}
      {printModalData && (
        <InvoicePrintModal
          order={printModalData.order}
          details={printModalData.details}
          customer={data.KhachHang.find((c) => c.MaKH === printModalData.order.MaKH)}
          onClose={() => setPrintModalData(null)}
        />
      )}

      {/* FLOATING TOAST: Auto Google Sheets Sync Notification */}
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-sky-500/40 flex items-center gap-2.5 text-xs font-semibold animate-bounce-short">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span>{syncToast}</span>
        </div>
      )}
    </div>
  );
}
