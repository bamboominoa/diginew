import React, { useState } from 'react';
import { DatabaseSchema, NCC } from '../types';
import { db } from '../services/db';
import { Building, Search, Plus, Phone, MapPin, Download, Edit2 } from 'lucide-react';
import { convertTableToCSV, downloadCSV } from '../services/googleSheets';
import { getFormattedNow, sortByDateDescending } from '../utils/dateUtils';
import { generateNextId } from '../utils/idUtils';

interface SuppliersViewProps {
  data: DatabaseSchema;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<NCC | null>(null);

  const [maNCC, setMaNCC] = useState('');
  const [tenNCC, setTenNCC] = useState('');
  const [sdt, setSdt] = useState('');
  const [diaChi, setDiaChi] = useState('');

  // Pay Supplier debt modal
  const [payModalSupplier, setPayModalSupplier] = useState<NCC | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const filteredSuppliers = data.NCC.filter((c) => {
    const q = (searchTerm || '').toLowerCase();
    return (
      (c.TenNhaCungCap || '').toLowerCase().includes(q) ||
      (c.MaNCC || '').toLowerCase().includes(q) ||
      (c.SDT || '').includes(q)
    );
  });

  const totalSupplierDebt = data.NCC.reduce((sum, c) => sum + c.TongNoNCC, 0);

  const handleOpenModal = (c?: NCC) => {
    if (c) {
      setEditingSupplier(c);
      setMaNCC(c.MaNCC);
      setTenNCC(c.TenNhaCungCap);
      setSdt(c.SDT);
      setDiaChi(c.DiaChi);
    } else {
      setEditingSupplier(null);
      setMaNCC(generateNextId('NCC', data.NCC, 'MaNCC', 5));
      setTenNCC('');
      setSdt('');
      setDiaChi('');
    }
    setShowModal(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenNCC.trim()) return;

    const newSupplier: NCC = {
      MaNCC: maNCC,
      TenNhaCungCap: tenNCC.trim(),
      SDT: sdt.trim() || '028 1234 5678',
      DiaChi: diaChi.trim() || 'Việt Nam',
      TongNoNCC: editingSupplier ? editingSupplier.TongNoNCC : 0,
      TongNhapNCC: editingSupplier ? editingSupplier.TongNhapNCC : 0,
      NgayTao: editingSupplier ? editingSupplier.NgayTao : getFormattedNow(),
    };

    if (editingSupplier) {
      const idx = db.getNCC().findIndex((x) => x.MaNCC === maNCC);
      if (idx !== -1) db.getNCC()[idx] = newSupplier;
    } else {
      db.addNCC(newSupplier);
    }

    db.saveToStorage();
    setShowModal(false);
  };

  const handlePaySupplierDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalSupplier || payAmount <= 0) return;

    db.recordSupplierDebtPayment(payModalSupplier.MaNCC, payAmount);
    setPayModalSupplier(null);
    setPayAmount(0);
    alert('Đã ghi nhận trả nợ cho Nhà Cung Cấp thành công!');
  };

  const handleExportCSV = () => {
    const csv = convertTableToCSV(data.NCC);
    downloadCSV('DanhSach_NhaCungCap_Export', csv);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Nhà Cung Cấp & Công Nợ Mua Hàng
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Quản lý các hãng phân phối, theo dõi tổng tiền nhập hàng và dư nợ cần thanh toán cho NCC
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
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm Nhà Cung Cấp</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Tổng Nhà Cung Cấp
          </p>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {data.NCC.length} Đối Tác
          </span>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-l-4 border-l-rose-500 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-1">
            Tổng Nợ Store Phải Trả Cho NCC
          </p>
          <span className="text-2xl font-bold text-rose-600">
            {formatVND(totalSupplierDebt)}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên NCC, số điện thoại..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Mã NCC</th>
                <th className="px-5 py-3">Tên Nhà Cung Cấp</th>
                <th className="px-5 py-3">Điện Thoại</th>
                <th className="px-5 py-3">Địa Chỉ</th>
                <th className="px-5 py-3 text-right">Tổng Nhập Hàng</th>
                <th className="px-5 py-3 text-right">Nợ Cần Trả NCC</th>
                <th className="px-5 py-3 text-center">Hành Động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {sortByDateDescending(filteredSuppliers, (c) => c.NgayTao).map((c) => (
                <tr
                  key={c.MaNCC}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-5 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {c.MaNCC}
                  </td>

                  <td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-100">
                    {c.TenNhaCungCap}
                  </td>

                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{c.SDT}</td>

                  <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{c.DiaChi}</td>

                  <td className="px-5 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                    {formatVND(c.TongNhapNCC)}
                  </td>

                  <td className="px-5 py-3 text-right font-bold text-rose-600">
                    {formatVND(c.TongNoNCC)}
                  </td>

                  <td className="px-5 py-3 text-center space-x-2">
                    {c.TongNoNCC > 0 && (
                      <button
                        onClick={() => {
                          setPayModalSupplier(c);
                          setPayAmount(c.TongNoNCC);
                        }}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold shadow-xs"
                      >
                        Trả Nợ NCC
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenModal(c)}
                      className="p-1 text-slate-400 hover:text-indigo-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Save Supplier */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSupplier}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base border-b border-slate-100 dark:border-slate-800 pb-2">
              {editingSupplier ? 'Sửa Thông Tin NCC' : 'Thêm Nhà Cung Cấp Mới'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên Nhà Cung Cấp *</label>
                <input
                  type="text"
                  required
                  value={tenNCC}
                  onChange={(e) => setTenNCC(e.target.value)}
                  placeholder="Ví dụ: FPT Synnex"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Số Điện Thoại</label>
                <input
                  type="text"
                  value={sdt}
                  onChange={(e) => setSdt(e.target.value)}
                  placeholder="028 3910 2910"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Địa Chỉ Văn Phòng</label>
                <input
                  type="text"
                  value={diaChi}
                  onChange={(e) => setDiaChi(e.target.value)}
                  placeholder="Tòa nhà FPT, Q.7, TP.HCM"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Lưu Nhà Cung Cấp
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Pay Supplier Debt */}
      {payModalSupplier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handlePaySupplierDebt}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base border-b border-slate-100 dark:border-slate-800 pb-2">
              Thanh Toán Tiền Cho Nhà Cung Cấp
            </h3>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs">
              <span className="block font-bold">{payModalSupplier.TenNhaCungCap}</span>
              <span>Tổng nợ store cần trả: {formatVND(payModalSupplier.TongNoNCC)}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Số Tiền Trả NCC (VNĐ) *</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 text-rose-600 font-bold text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayModalSupplier(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Xác Nhận Chuyển Trả
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
