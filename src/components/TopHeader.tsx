import React, { useState } from 'react';
import { ViewTab, NguoiDung } from '../types';
import {
  Search,
  ShoppingCart,
  Truck,
  Sparkles,
  User,
  FileSpreadsheet,
  QrCode,
  RotateCcw,
} from 'lucide-react';

interface TopHeaderProps {
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  activeUser: NguoiDung;
  setActiveUser?: (user: NguoiDung) => void;
  allUsers?: NguoiDung[];
  onOpenAiModal?: () => void;
  onOpenAiAssistant?: () => void;
  onQuickSerialSearch?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
  onRefreshSheets?: () => void;
  onResetData?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  setCurrentTab,
  activeUser,
  setActiveUser,
  allUsers = [],
  onOpenAiModal,
  onOpenAiAssistant,
  onQuickSerialSearch,
  onSearchSubmit,
  onRefreshSheets,
  onResetData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (onSearchSubmit) onSearchSubmit(searchQuery.trim());
      else if (onQuickSerialSearch) onQuickSerialSearch(searchQuery.trim());
      if (setCurrentTab) setCurrentTab('serials');
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Global Quick Search */}
      <form onSubmit={handleSearchSubmit} className="relative w-80 max-w-full">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tra cứu nhanh Serial / IMEI / Tên SP..."
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all"
        />
      </form>

      {/* Quick Action Center */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setCurrentTab && setCurrentTab('pos')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>+ Bán Hàng Mới</span>
        </button>

        <button
          onClick={() => setCurrentTab && setCurrentTab('purchases')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-800/60 transition-colors"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>+ Nhập Kho</span>
        </button>

        <button
          onClick={() => setCurrentTab && setCurrentTab('serials')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800/60 transition-colors"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Tra Serial/IMEI</span>
        </button>

        <button
          onClick={() => {
            if (onOpenAiModal) onOpenAiModal();
            else if (onOpenAiAssistant) onOpenAiAssistant();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Trợ Lý AI</span>
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Google Sheets status shortcut */}
        <button
          onClick={() => setCurrentTab && setCurrentTab('sheets')}
          title="Mở quản lý Google Sheets"
          className="p-2 text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
        </button>

        {/* Refresh Google Sheets data button */}
        <button
          onClick={() => {
            if (onRefreshSheets) onRefreshSheets();
            else if (onResetData) onResetData();
          }}
          title="Tải lại dữ liệu từ Google Sheets"
          className="p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Active User Switcher */}
        <div className="relative group">
          <div className="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 hover:bg-slate-200/70 transition-colors">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {(activeUser?.TenNguoiDung || 'A').charAt(0)}
            </div>
            <div className="text-left">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block leading-none">
                {(activeUser?.TenNguoiDung || 'User').split(' ')[0]}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-none mt-0.5">
                {activeUser?.VaiTro || 'Admin'}
              </span>
            </div>
          </div>

          {/* User selector dropdown */}
          <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl hidden group-hover:block p-1.5 z-30">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
              Chuyển Tài Khoản
            </div>
            {(allUsers || []).map((usr) => (
              <button
                key={usr.MaUID}
                onClick={() => setActiveUser && setActiveUser(usr)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  usr.MaUID === activeUser.MaUID
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{usr.TenNguoiDung}</span>
                <span className="text-[10px] text-slate-400">{usr.VaiTro}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
