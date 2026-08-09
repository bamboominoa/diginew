import React, { useState } from 'react';
import { DatabaseSchema, Setting } from '../types';
import {
  generateGoogleAppsScript,
  syncDataToGoogleSheetsWebhook,
  pullDataFromGoogleSheets,
  downloadAllDatabaseCSV,
} from '../services/googleSheets';
import { db } from '../services/db';
import {
  Database,
  Cloud,
  Code,
  Copy,
  Check,
  Download,
  RefreshCw,
  Zap,
  Settings as SettingsIcon,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Sliders,
  Table,
} from 'lucide-react';

interface SheetsSyncViewProps {
  data: DatabaseSchema;
}

export const SheetsSyncView: React.FC<SheetsSyncViewProps> = ({ data }) => {
  const [webhookUrl, setWebhookUrl] = useState(
    localStorage.getItem('GOOGLE_SHEETS_WEBHOOK_URL') || ''
  );
  const [isCopied, setIsCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Setting table management state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showAddSettingModal, setShowAddSettingModal] = useState<boolean>(false);
  const [newKey, setNewKey] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('GoogleSheets');
  const [newNote, setNewNote] = useState<string>('');

  const scriptCode = generateGoogleAppsScript();

  const settingsList = data.Setting || [];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(scriptCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    const url = webhookUrl.trim();
    localStorage.setItem('GOOGLE_SHEETS_WEBHOOK_URL', url);
    
    // Update or add WEBHOOK_URL in Setting table
    db.updateSetting({
      MaCauHinh: 'WEBHOOK_URL',
      TenCauHinh: 'Google Apps Script Webhook URL',
      GiaTri: url,
      LoaiCauHinh: 'GoogleSheets',
      GhiChu: 'URL nhận và đồng bộ dữ liệu 2 chiều với Google Sheets',
      ThoiGianCapNhat: new Date().toLocaleString('vi-VN'),
    });

    setSyncMessage('Đã lưu URL Google Webhook App và cập nhật vào Bảng Setting!');
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleTriggerPushNow = async () => {
    if (!webhookUrl.trim()) {
      alert('Vui lòng nhập Webhook URL triển khai từ Google Apps Script!');
      return;
    }

    setIsSyncing(true);
    setSyncMessage('Đang đồng bộ toàn bộ 13 bảng dữ liệu (Bao gồm Sheet Setting) lên Google Sheets...');

    const fullSyncPayload = { ...data, action: 'full_sync' };
    const res = await syncDataToGoogleSheetsWebhook(webhookUrl.trim(), fullSyncPayload);

    setIsSyncing(false);
    if (res.success) {
      setSyncMessage('✅ Đồng bộ toàn bộ dữ liệu thành công lên Google Sheets!');
    } else {
      setSyncMessage(`❌ Thất bại: ${res.message}`);
    }
  };

  const handleTriggerPullNow = async () => {
    if (!webhookUrl.trim()) {
      alert('Vui lòng nhập Webhook URL triển khai từ Google Apps Script!');
      return;
    }

    setIsPulling(true);
    setSyncMessage('Đang kết nối tới Google Sheets để tải dữ liệu 13 bảng về WebApp...');

    const res = await pullDataFromGoogleSheets(webhookUrl.trim());

    setIsPulling(false);
    if (res.success && res.data) {
      const { newCount, updatedCount } = db.mergeFromGoogleSheets(res.data);
      if (newCount > 0 || updatedCount > 0) {
        const detailParts = [];
        if (newCount > 0) detailParts.push(`${newCount} dòng mới`);
        if (updatedCount > 0) detailParts.push(`${updatedCount} dòng chỉnh sửa`);
        setSyncMessage(`✅ Tự động cập nhật thành công ${detailParts.join(' & ')} từ Google Sheets về WebApp!`);
      } else {
        setSyncMessage('✅ Dữ liệu trên WebApp và Google Sheets đã đồng bộ khớp hoàn toàn (Không có dòng mới).');
      }
    } else {
      setSyncMessage(`❌ Thất bại: ${res.message}`);
    }
  };

  const handleStartEditSetting = (item: Setting) => {
    setEditingKey(item.MaCauHinh);
    setEditValue(item.GiaTri);
  };

  const handleSaveEditSetting = (item: Setting) => {
    db.updateSetting({
      ...item,
      GiaTri: editValue,
      ThoiGianCapNhat: new Date().toLocaleString('vi-VN'),
    });
    setEditingKey(null);
    setSyncMessage(`Đã cập nhật cấu hình [${item.MaCauHinh}] thành công!`);
    setTimeout(() => setSyncMessage(null), 2500);
  };

  const handleDeleteSetting = (key: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa cấu hình [${key}] khỏi Sheet Setting?`)) {
      db.deleteSetting(key);
    }
  };

  const handleCreateSetting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newName.trim()) {
      alert('Vui lòng nhập Mã cấu hình và Tên cấu hình!');
      return;
    }

    const keyClean = newKey.trim().toUpperCase().replace(/\s+/g, '_');
    db.addSetting({
      MaCauHinh: keyClean,
      TenCauHinh: newName.trim(),
      GiaTri: newValue.trim(),
      LoaiCauHinh: newCategory,
      GhiChu: newNote.trim(),
      ThoiGianCapNhat: new Date().toLocaleString('vi-VN'),
    });

    setNewKey('');
    setNewName('');
    setNewValue('');
    setNewNote('');
    setShowAddSettingModal(false);
    setSyncMessage(`Đã thêm cấu hình mới [${keyClean}] vào Sheet Setting!`);
    setTimeout(() => setSyncMessage(null), 3000);
  };

  // Sheet list specification overview
  const sheetsSpec = [
    { name: 'Setting', label: 'Cấu hình kết nối Webhook, Domain & Hệ thống', color: 'bg-sky-500 text-white', count: settingsList.length },
    { name: 'ThuongHieu', label: 'Danh mục Thương hiệu sản phẩm', color: 'bg-slate-700 text-white', count: data.ThuongHieu?.length || 0 },
    { name: 'NhomHang', label: 'Danh mục Nhóm hàng hóa', color: 'bg-slate-700 text-white', count: data.NhomHang?.length || 0 },
    { name: 'SanPham', label: 'Danh sách Sản phẩm SKU & Tồn kho', color: 'bg-slate-700 text-white', count: data.SanPham?.length || 0 },
    { name: 'KhoSerial', label: 'Kho Quản lý Mã Serial / IMEI', color: 'bg-blue-600 text-white', count: data.KhoSerial?.length || 0 },
    { name: 'StockCards', label: 'Thẻ kho ghi nhận Nhập / Xuất', color: 'bg-slate-700 text-white', count: data.StockCards?.length || 0 },
    { name: 'KhachHang', label: 'Danh sách Khách hàng & Công nợ', color: 'bg-slate-700 text-white', count: data.KhachHang?.length || 0 },
    { name: 'NCC', label: 'Danh sách Nhà cung cấp', color: 'bg-slate-700 text-white', count: data.NCC?.length || 0 },
    { name: 'DonHang', label: 'Hóa đơn Đơn bán hàng POS', color: 'bg-emerald-600 text-white', count: data.DonHang?.length || 0 },
    { name: 'ChiTietDonHang', label: 'Chi tiết sản phẩm bán ra', color: 'bg-slate-700 text-white', count: data.ChiTietDonHang?.length || 0 },
    { name: 'NhapHang', label: 'Phiếu Nhập kho hàng mới', color: 'bg-indigo-600 text-white', count: data.NhapHang?.length || 0 },
    { name: 'ChiTietNhapHang', label: 'Chi tiết sản phẩm nhập kho', color: 'bg-slate-700 text-white', count: data.ChiTietNhapHang?.length || 0 },
    { name: 'NguoiDung', label: 'Danh sách Tài khoản người dùng', color: 'bg-slate-700 text-white', count: data.NguoiDung?.length || 0 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Đồng Bộ Google Sheets 2 Chiều</span>
            <span className="text-xs bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2.5 py-0.5 rounded-full font-mono font-semibold border border-sky-300 dark:border-sky-800">
              Sheet Setting Included
            </span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Kết nối ứng dụng với tệp Google Sheets cá nhân để lưu trữ dự phòng, báo cáo Excel tự động và truy xuất mọi nơi
          </p>
        </div>

        <button
          onClick={() => downloadAllDatabaseCSV(data)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/20 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Tải Trọn Bộ File CSV (.ZIP/Multiple)</span>
        </button>
      </div>

      {/* Sync Status Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-sky-950 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Trạng Thái: Sẵn Sàng Đồng Bộ
          </div>
          <h3 className="text-xl font-bold">Tự Động Xuất 13 Bảng Dữ Liệu Lên Google Sheets</h3>
          <p className="text-xs text-indigo-200 max-w-2xl leading-relaxed">
            Hệ thống tự động tạo và cập nhật 13 Tab dữ liệu bao gồm Tab <strong className="text-sky-300">Setting</strong> (lưu thông tin Webhook URL, Domain, Secret Token), Kho Serial, Đơn Bán Hàng, Phếu Nhập, Thẻ Kho, Khách Hàng, Nhà Cung Cấp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleTriggerPushNow}
            disabled={isSyncing || isPulling}
            className="px-5 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 flex items-center gap-2 text-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang Đẩy Dữ Liệu...' : 'Đẩy Lên Sheets'}</span>
          </button>

          <button
            onClick={handleTriggerPullNow}
            disabled={isSyncing || isPulling}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 text-xs transition-all cursor-pointer"
          >
            <Download className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
            <span>{isPulling ? 'Đang Tải Dữ Liệu...' : 'Kéo Từ Sheets Về Web'}</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 rounded-xl text-xs font-bold animate-fadeIn">
          {syncMessage}
        </div>
      )}

      {/* SECTION: SHEET SETTING CONFIGURATION MANAGER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-xl border border-sky-200 dark:border-sky-800">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <span>Cấu Hình Bảng <code className="bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded font-mono">Setting</code> Trao Đổi Kết Nối</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các biến thông số lưu tại Tab <strong className="text-slate-700 dark:text-slate-300">Setting</strong> trên Google Sheets để định danh Webhook, Tên Cửa Hàng, Khóa Bảo Mật
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddSettingModal(true)}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Cấu Hình Mới</span>
          </button>
        </div>

        {/* Setting Items Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Mã Cấu Hình (Key)</th>
                <th className="py-3 px-4">Tên Cấu Hình</th>
                <th className="py-3 px-4">Giá Trị (Value)</th>
                <th className="py-3 px-4">Loại</th>
                <th className="py-3 px-4">Ghi Chú</th>
                <th className="py-3 px-4">Thời Gian Cập Nhật</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {settingsList.map((st) => {
                const isEditing = editingKey === st.MaCauHinh;
                return (
                  <tr key={st.MaCauHinh} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {st.MaCauHinh}
                    </td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-semibold">
                      {st.TenCauHinh}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 max-w-xs">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-2.5 py-1 border border-sky-400 rounded-lg text-xs font-mono bg-white dark:bg-slate-800 focus:outline-none"
                        />
                      ) : (
                        <div className="truncate text-ellipsis" title={String(st.GiaTri ?? '')}>
                          {st.GiaTri || '—'}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-semibold">
                        {st.LoaiCauHinh}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {st.GhiChu || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {st.ThoiGianCapNhat || '—'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEditSetting(st)}
                            className="p-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                            title="Lưu thay đổi"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="p-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                            title="Hủy"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditSetting(st)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa giá trị"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!['WEBHOOK_URL', 'WEBAPP_DOMAIN'].includes(st.MaCauHinh) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSetting(st.MaCauHinh)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Xóa cấu hình"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIG & CODE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Apps Script Generator */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Code className="w-4 h-4" />
              <span>Bước 1: Mã Nguồn Google Apps Script</span>
            </div>

            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mt-1">
              Sao Chép Mã Vào Tệp Google Sheets Của Bạn
            </h3>

            <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1.5 my-3">
              <li>Mở tệp Google Sheets mới hoặc tệp có sẵn của bạn.</li>
              <li>Vào menu <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
              <li>Dán đoạn mã dưới đây vào file <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Code.gs</code>.</li>
              <li>Bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Triển khai dưới dạng ứng dụng web (Web App)</strong> (Quyền: <i>Anyone</i>).</li>
              <li><strong className="text-amber-600 dark:text-amber-400">⚡ Bật tự động đẩy từng dòng về WebApp:</strong> Ở bên trái chọn <strong>Bộ kích hoạt (Triggers ⏰)</strong> &gt; <strong>+ Thêm bộ kích hoạt</strong> &gt; Chọn hàm <code className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1 rounded">onSheetEditTrigger</code> &gt; Sự kiện: <strong>Khi chỉnh sửa (On edit)</strong>.</li>
            </ol>

            <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-950 text-slate-200 p-3 font-mono text-[11px] h-48 overflow-y-auto">
              <pre>{scriptCode}</pre>
            </div>
          </div>

          <button
            onClick={handleCopyCode}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'Đã Sao Chép Code!' : 'Sao Chép Mã Google Apps Script'}</span>
          </button>
        </div>

        {/* Step 2: Webhook URL Input */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>Bước 2: Cấu Hình URL Webhook Web App</span>
            </div>

            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mt-1">
              Nhập URL Triển Khai Vào Hệ Thống
            </h3>

            <p className="text-xs text-slate-500 my-3 leading-relaxed">
              Dán URL ứng dụng Web do Google cấp sau khi bạn nhấn Triển khai (có dạng: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-[11px]">https://script.google.com/macros/s/.../exec</code>)
            </p>

            <form onSubmit={handleSaveWebhook} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Google Webhook Web App URL:
                </label>
                <input
                  type="url"
                  required
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20 cursor-pointer transition-colors"
              >
                Lưu Cấu Hình Kết Nối
              </button>
            </form>
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Tự động Đồng bộ & Bảo vệ Đơn hàng (Smart Upsert)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
              Hệ thống tự động đồng bộ ngay sau khi bấm hoàn thành đơn hàng/nhập kho. Cơ chế <strong>Smart Upsert</strong> khớp theo Mã Đơn/Mã Serial giúp cập nhật chính xác, không ghi đè mất đơn cũ và tự động đồng bộ tức thì tới các thiết bị khác!
            </p>
          </div>
        </div>
      </div>

      {/* OVERVIEW OF ALL 13 SHEETS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Table className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
            Danh Sách 13 Tab Cấu Trúc Bảng Dữ Liệu Trên Google Sheets
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sheetsSpec.map((s, idx) => (
            <div
              key={s.name}
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                s.name === 'Setting'
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 ring-2 ring-sky-500/20'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 font-bold font-mono text-slate-900 dark:text-slate-100">
                  <span>{idx + 1}.</span>
                  <span className={s.name === 'Setting' ? 'text-sky-600 dark:text-sky-400' : ''}>
                    {s.name}
                  </span>
                  {s.name === 'Setting' && (
                    <span className="text-[10px] bg-sky-600 text-white px-1.5 py-0.2 rounded font-sans font-bold">
                      Master Config
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {s.label}
                </div>
              </div>

              <span className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                {s.count} dòng
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: ADD NEW SETTING ITEM */}
      {showAddSettingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-sky-600" />
                <span>Thêm Thông Số Cấu Hình Vào Sheet Setting</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSettingModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSetting} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Mã Cấu Hình (Key) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: STORE_HOTLINE, NOTIFY_EMAIL..."
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Tên Cấu Hình *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hotline chăm sóc khách hàng..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Giá Trị (Value)
                </label>
                <input
                  type="text"
                  placeholder="Nhập giá trị thiết lập..."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Loại Cấu Hình
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="GoogleSheets">GoogleSheets</option>
                    <option value="System">System</option>
                    <option value="Store">Store</option>
                    <option value="Security">Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Ghi Chú
                  </label>
                  <input
                    type="text"
                    placeholder="Mô tả công dụng..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSettingModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  Lưu Vào Bảng Setting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
