import React, { useState } from 'react';
import { DatabaseSchema, KhoSerial, TrangThaiSerial } from '../types';
import { db } from '../services/db';
import {
  Search,
  QrCode,
  Filter,
  Plus,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Trash2,
  Download,
  Calendar,
  Building,
  Tag,
} from 'lucide-react';
import { convertTableToCSV, downloadCSV } from '../services/googleSheets';

interface SerialManagementViewProps {
  data: DatabaseSchema;
  initialSearchQuery?: string;
}

export const SerialManagementView: React.FC<SerialManagementViewProps> = ({
  data,
  initialSearchQuery = '',
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [selectedSerial, setSelectedSerial] = useState<KhoSerial | null>(null);

  // New serial form modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSerialNum, setNewSerialNum] = useState('');
  const [newMaSP, setNewMaSP] = useState(data.SanPham[0]?.MaSP || '');
  const [newGiaNhap, setNewGiaNhap] = useState<number>(0);
  const [newNCC, setNewNCC] = useState(data.NCC[0]?.TenNhaCungCap || 'FPT');

  // Filtered serial list
  const filteredSerials = data.KhoSerial.filter((s) => {
    const sp = data.SanPham.find((p) => p.MaSP === s.MaSP);
    if (!sp) return false;

    if (statusFilter !== 'all' && s.TrangThai !== statusFilter) return false;
    if (brandFilter !== 'all' && sp.MaThuongHieu !== brandFilter) return false;

    const query = (searchTerm || '').toLowerCase();
    const matchSerial = String(s.SoSerial || '').toLowerCase().includes(query);
    const matchSpName = (sp.TenSanPham || '').toLowerCase().includes(query);
    const matchSpCode = (sp.MaSP || '').toLowerCase().includes(query);
    const matchNCC = (s.NCC || '').toLowerCase().includes(query);

    return matchSerial || matchSpName || matchSpCode || matchNCC;
  });

  // KPI Counts
  const totalInStock = data.KhoSerial.filter((s) => s.TrangThai === 'TrongKho').length;
  const totalSold = data.KhoSerial.filter((s) => s.TrangThai === 'DaBan').length;
  const totalWarranty = data.KhoSerial.filter((s) => s.TrangThai === 'BaoHanh').length;
  const totalLiquidation = data.KhoSerial.filter((s) => s.TrangThai === 'LoiThanhLy').length;

  const totalInventoryValue = data.KhoSerial
    .filter((s) => s.TrangThai === 'TrongKho')
    .reduce((sum, s) => sum + s.GiaNhap, 0);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const handleStatusChange = (soSerial: string, newStatus: TrangThaiSerial) => {
    db.updateSerialStatus(soSerial, newStatus);
    if (selectedSerial && selectedSerial.SoSerial === soSerial) {
      setSelectedSerial({ ...selectedSerial, TrangThai: newStatus });
    }
  };

  const handleAddSerialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSerialNum.trim()) return;

    const sp = data.SanPham.find((p) => p.MaSP === newMaSP);
    const gia = newGiaNhap || (sp ? sp.GiaNhapTrungBinh : 0);

    const newItem: KhoSerial = {
      SoSerial: newSerialNum.trim(),
      MaSP: newMaSP,
      MaPN: 'PN-THUCONG-' + Date.now().toString().slice(-4),
      NCC: newNCC,
      GiaNhap: gia,
      TrangThai: 'TrongKho',
      NgayNhap: new Date().toISOString().substring(0, 10),
    };

    db.getKhoSerial().unshift(newItem);
    db.saveToStorage();

    setShowAddModal(false);
    setNewSerialNum('');
  };

  const handleExportCSV = () => {
    const csv = convertTableToCSV(data.KhoSerial);
    downloadCSV('KhoSerial_Export', csv);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Quản Lý Kho Serial / IMEI
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Quản lý chi tiết trạng thái từng cá thể thiết bị đơn lẻ có trong hệ thống
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm Serial Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Glass Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Tổng máy trong kho
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totalInStock}
            </span>
            <span className="text-xs font-bold text-emerald-600">Sẵn sàng bán</span>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Giá trị tồn kho
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatVND(totalInventoryValue)}
            </span>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-l-4 border-l-amber-400 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Đang bảo hành
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600">{totalWarranty}</span>
            <span className="text-xs text-amber-600 font-semibold">Cần theo dõi</span>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Đã xuất bán
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {totalSold}
            </span>
            <span className="text-xs text-slate-400 font-medium">Đã giao khách</span>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {/* Filters Toolbar */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Gõ mã Serial / IMEI, tên SP, hoặc NCC..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
            >
              <option value="all">Trạng thái: Tất cả</option>
              <option value="TrongKho">Trong Kho</option>
              <option value="DaBan">Đã Bán</option>
              <option value="BaoHanh">Bảo Hành</option>
              <option value="LoiThanhLy">Lỗi Thanh Lý</option>
            </select>

            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
            >
              <option value="all">Thương hiệu: Tất cả</option>
              {data.ThuongHieu.map((th) => (
                <option key={th.MaThuongHieu} value={th.MaThuongHieu}>
                  {th.TenThuongHieu}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Mã Serial / IMEI</th>
                <th className="px-5 py-3">Sản Phẩm & Thương Hiệu</th>
                <th className="px-5 py-3">Nhà Cung Cấp</th>
                <th className="px-5 py-3">Ngày Nhập</th>
                <th className="px-5 py-3 text-right">Giá Nhập</th>
                <th className="px-5 py-3">Trạng Thái</th>
                <th className="px-5 py-3 text-center">Hành Động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredSerials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Không tìm thấy mã Serial/IMEI nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredSerials.map((s) => {
                  const sp = data.SanPham.find((p) => p.MaSP === s.MaSP);
                  const brand = data.ThuongHieu.find((b) => b.MaThuongHieu === sp?.MaThuongHieu);

                  return (
                    <tr
                      key={s.SoSerial}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {s.SoSerial}
                      </td>

                      <td className="px-5 py-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {sp ? sp.TenSanPham : s.MaSP}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Hãng: {brand ? brand.TenThuongHieu : 'Khác'} • BH:{' '}
                          {sp?.ThoiGianBaoHanhThang} tháng
                        </span>
                      </td>

                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{s.NCC}</td>

                      <td className="px-5 py-3 text-slate-500">{s.NgayNhap}</td>

                      <td className="px-5 py-3 text-right font-bold text-slate-800 dark:text-slate-200">
                        {formatVND(s.GiaNhap)}
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            s.TrangThai === 'TrongKho'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : s.TrangThai === 'DaBan'
                              ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                              : s.TrangThai === 'BaoHanh'
                              ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {s.TrangThai === 'TrongKho'
                            ? 'Trong Kho'
                            : s.TrangThai === 'DaBan'
                            ? 'Đã Bán'
                            : s.TrangThai === 'BaoHanh'
                            ? 'Bảo Hành'
                            : 'Lỗi Thanh Lý'}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => setSelectedSerial(s)}
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold text-xs"
                        >
                          Chi Tiết / Đổi Trạng Thái
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: View Detail & Edit Serial Status */}
      {selectedSerial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Chi Tiết Thẻ Serial / IMEI
                </h3>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedSerial.SoSerial}
                </span>
              </div>
              <button
                onClick={() => setSelectedSerial(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 block text-[10px]">Tên Sản Phẩm</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {data.SanPham.find((p) => p.MaSP === selectedSerial.MaSP)?.TenSanPham}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 block text-[10px]">Nhà Cung Cấp</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSerial.NCC}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 block text-[10px]">Mã Phiếu Nhập</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSerial.MaPN}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-400 block text-[10px]">Giá Nhập</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {formatVND(selectedSerial.GiaNhap)}
                </span>
              </div>

              {selectedSerial.MaDH && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 col-span-2">
                  <span className="text-slate-400 block text-[10px]">Hóa Đơn Bán & Khách Hàng</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Đơn: {selectedSerial.MaDH} • Mua ngày: {selectedSerial.Ngayban}
                  </span>
                </div>
              )}
            </div>

            {/* Change Status Action Buttons */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Cập nhật trạng thái Serial:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStatusChange(selectedSerial.SoSerial, 'TrongKho')}
                  className="py-2 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs"
                >
                  ✓ Đưa Về Trong Kho
                </button>

                <button
                  onClick={() => handleStatusChange(selectedSerial.SoSerial, 'BaoHanh')}
                  className="py-2 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs"
                >
                  ⚠ Chuyển Bảo Hành
                </button>

                <button
                  onClick={() => handleStatusChange(selectedSerial.SoSerial, 'DaBan')}
                  className="py-2 px-3 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
                >
                  🛒 Đánh Dấu Đã Bán
                </button>

                <button
                  onClick={() => handleStatusChange(selectedSerial.SoSerial, 'LoiThanhLy')}
                  className="py-2 px-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs"
                >
                  ✖ Báo Lỗi Thanh Lý
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedSerial(null)}
              className="w-full py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Add New Serial Manually */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddSerialSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base border-b border-slate-100 dark:border-slate-800 pb-2">
              Khai Báo Serial / IMEI Mới
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Chọn Sản Phẩm Quy Chuẩn *
                </label>
                <select
                  value={newMaSP}
                  onChange={(e) => setNewMaSP(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 font-semibold"
                >
                  {data.SanPham.map((sp) => (
                    <option key={sp.MaSP} value={sp.MaSP}>
                      {sp.TenSanPham} ({sp.MaSP})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Mã Serial / IMEI *</label>
                <input
                  type="text"
                  required
                  value={newSerialNum}
                  onChange={(e) => setNewSerialNum(e.target.value)}
                  placeholder="Ví dụ: APL-IP15-8839012"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Nhà Cung Cấp</label>
                <input
                  type="text"
                  value={newNCC}
                  onChange={(e) => setNewNCC(e.target.value)}
                  placeholder="Synnex FPT"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Giá Nhập (VNĐ)</label>
                <input
                  type="number"
                  value={newGiaNhap || ''}
                  onChange={(e) => setNewGiaNhap(Number(e.target.value))}
                  placeholder="Bỏ trống nếu lấy giá trung bình"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20"
              >
                Lưu Thêm Serial
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
