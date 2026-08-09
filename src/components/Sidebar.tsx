import React from 'react';
import { ViewTab } from '../types';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  QrCode,
  Truck,
  FileText,
  History,
  Users,
  Building2,
  FileSpreadsheet,
  UserCheck,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  currentTab?: string;
  activeTab?: string;
  setCurrentTab?: (tab: any) => void;
  setActiveTab?: (tab: any) => void;
  totalSerialsInStock?: number;
  totalCustomerDebt?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeTab,
  setCurrentTab,
  setActiveTab,
  totalSerialsInStock,
  totalCustomerDebt,
}) => {
  const selectedTab = activeTab || currentTab || 'dashboard';

  const handleTabChange = (tab: string) => {
    if (setActiveTab) setActiveTab(tab);
    if (setCurrentTab) setCurrentTab(tab);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Tổng Quan', icon: LayoutDashboard },
    { id: 'pos', label: 'Bán Hàng POS', icon: ShoppingCart, highlight: true },
    {
      id: 'serials',
      label: 'Kho Serial / IMEI',
      icon: QrCode,
      badge: totalSerialsInStock,
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200',
    },
    { id: 'products', label: 'Sản Phẩm & SKU', icon: Package },
    { id: 'purchases', label: 'Nhập Hàng Kho', icon: Truck },
    { id: 'orders', label: 'Hóa Đơn Bán', icon: FileText },
    { id: 'stockcards', label: 'Thẻ Kho (Audit)', icon: History },
    {
      id: 'customers',
      label: 'Khách Hàng CRM',
      icon: Users,
      badge: totalCustomerDebt && totalCustomerDebt > 0 ? `${(totalCustomerDebt / 1e6).toFixed(1)}M` : undefined,
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200',
    },
    { id: 'suppliers', label: 'Nhà Cung Cấp', icon: Building2 },
    {
      id: 'sheets',
      label: 'Google Sheets',
      icon: FileSpreadsheet,
      accent: true,
    },
    { id: 'users', label: 'Người Dùng & Quyền', icon: UserCheck },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* App Branding */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-bold text-xl">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-slate-100 text-base leading-tight tracking-tight">
            POS & Serial Pro
          </h1>
          <p className="text-xs text-slate-400">Quản Lý Kho & Bán Hàng</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
          Chức năng chính
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = selectedTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : item.highlight
                  ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300'
                  : item.accent
                  ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? 'text-white'
                      : item.highlight
                      ? 'text-blue-400'
                      : item.accent
                      ? 'text-emerald-400'
                      : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                    item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Google Sheets Sync Quick Badge Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50">
        <button
          onClick={() => handleTabChange('sheets')}
          className="w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-300 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="flex-1 text-left truncate">
            <span className="font-medium text-slate-200 block">Dữ Liệu Google Sheet</span>
            <span className="text-[10px] text-slate-400">12 Bảng Chuẩn Khóa PK/FK</span>
          </div>
        </button>
      </div>
    </aside>
  );
};
