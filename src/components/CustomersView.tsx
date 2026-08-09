import React, { useState } from 'react';
import { DatabaseSchema, KhachHang } from '../types';
import { db } from '../services/db';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  DollarSign,
  Download,
  CreditCard,
  Edit2,
  Trash2,
} from 'lucide-react';
import { convertTableToCSV, downloadCSV } from '../services/googleSheets';

interface CustomersViewProps {
  data: DatabaseSchema;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Customer modal
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<KhachHang | null>(null);

  const [maKH, setMaKH] = useState('');
  const [tenKH, setTenKH] = useState('');
  const [sdt, setSdt] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [nhomKH, setNhomKH] = useState<'KhachLe' | 'DaiLy' | 'VIP'>('KhachLe');
  const [localCity, setLocalCity] = useState('TP. Hồ Chí Minh');

  // Debt payment collection modal
  const [payModalCustomer, setPayModalCustomer] = useState<KhachHang | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payAccount, setPayAccount] = useState('TienMat Quầy');

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const filteredCustomers = data.KhachHang.filter((c) => {
    if (selectedGroup !== 'all' && c.NhomKhachHang !== selectedGroup) return false;

    const q = (searchTerm || '').toLowerCase();
    return (
      (c.TenKhachHang || '').toLowerCase().includes(q) ||
      (c.MaKH || '').toLowerCase().includes(q) ||
      (c.SDT1 || '').includes(q) ||
      (c.DiaChi || '').toLowerCase().includes(q)
    );
  });

  const totalCustomerDebt = data.KhachHang.reduce((sum, c) => sum + c.TongNoHienTai, 0);

  const handleOpenModal = (c?: KhachHang) => {
    if (c) {
      setEditingCustomer(c);
      setMaKH(c.MaKH);
      setTenKH(c.TenKhachHang);
      setSdt(c.SDT1);
      setDiaChi(c.DiaChi);
      setNhomKH(c.NhomKhachHang);
      setLocalCity(c.Local);
    } else {
      setEditingCustomer(null);
      setMaKH('KH' + (data.KhachHang.length + 1).toString().padStart(3, '0'));
      setTenKH('');
      setSdt('');
      setDiaChi('');
      setNhomKH('KhachLe');
      setLocalCity('TP. Hồ Chí Minh');
    }
    setShowModal(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenKH.trim()) return;

    const newCust: KhachHang = {
      MaKH: maKH,
      TenKhachHang: tenKH.trim(),
      SDT1: sdt.trim() || '0900000000',
      DiaChi: diaChi.trim() || 'Chưa cập nhật',
      NhomKhachHang: nhomKH,
      Local: localCity,
      TongNoHienTai: editingCustomer ? editingCustomer.TongNoHienTai : 0,
      TongChiTieu: editingCustomer ? editingCustomer.TongChiTieu : 0,
      NgayTao: editingCustomer ? editingCustomer.NgayTao : new Date().toISOString().substring(0, 10),
    };

    if (editingCustomer) {
      const idx = db.getKhachHang().findIndex((x) => x.MaKH === maKH);
      if (idx !== -1) db.getKhachHang()[idx] = newCust;
    } else {
      db.addKhachHang(newCust);
    }

    db.saveToStorage();
    setShowModal(false);
  };

  const handleCollectDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalCustomer || payAmount <= 0) return;

    db.recordCustomerDebtPayment(payModalCustomer.MaKH, payAmount);
    setPayModalCustomer(null);
    setPayAmount(0);
    alert('Đã ghi nhận thu nợ thành công!');
  };

  const handleExportCSV = () => {
    const csv = convertTableToCSV(data.KhachHang);
    downloadCSV('DanhSach_KhachHang_Export', csv);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Khách Hàng & Sổ Nợ (CRM)
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Quản lý hồ sơ đối tác khách hàng, phân hạng VIP/Đại lý và thu nợ đọng công nợ
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
            <span>+ Thêm Khách Hàng</span>
          </button>
        </div>
      </div>

      {/* Summary Glass Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Tổng Khách Hàng
          </p>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {data.KhachHang.length} Đối Tác
          </span>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-l-4 border-l-amber-500 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">
            Tổng Công Nợ Khách Phải Trả Store
          </p>
          <span className="text-2xl font-bold text-amber-600">
            {formatVND(totalCustomerDebt)}
          </span>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Khách VIP & Đại Lý
          </p>
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {data.KhachHang.filter((c) => c.NhomKhachHang !== 'KhachLe').length} Đối Tác Lớn
          </span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên khách hàng, số điện thoại hoặc địa chỉ..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
          >
            <option value="all">Nhóm: Tất cả</option>
            <option value="KhachLe">Khách Lẻ</option>
            <option value="DaiLy">Đại Lý</option>
            <option value="VIP">Khách VIP</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Mã KH</th>
                <th className="px-5 py-3">Tên Khách Hàng</th>
                <th className="px-5 py-3">Điện Thoại</th>
                <th className="px-5 py-3">Địa Chỉ</th>
                <th className="px-5 py-3">Phân Nhóm</th>
                <th className="px-5 py-3 text-right">Tổng Mua Hàng</th>
                <th className="px-5 py-3 text-right">Nợ Hiện Tại</th>
                <th className="px-5 py-3 text-center">Hành Động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredCustomers.map((c) => (
                <tr
                  key={c.MaKH}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-5 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {c.MaKH}
                  </td>

                  <td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-100">
                    {c.TenKhachHang}
                  </td>

                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{c.SDT1}</td>

                  <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{c.DiaChi}</td>

                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.NhomKhachHang === 'VIP'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : c.NhomKhachHang === 'DaiLy'
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {c.NhomKhachHang}
                    </span>
                  </td>

                  <td className="px-5 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                    {formatVND(c.TongChiTieu)}
                  </td>

                  <td className="px-5 py-3 text-right font-bold text-amber-600">
                    {formatVND(c.TongNoHienTai)}
                  </td>

                  <td className="px-5 py-3 text-center space-x-2">
                    {c.TongNoHienTai > 0 && (
                      <button
                        onClick={() => {
                          setPayModalCustomer(c);
                          setPayAmount(c.TongNoHienTai);
                        }}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold shadow-xs"
                      >
                        Thu Nợ
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

      {/* MODAL: Save Customer */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base border-b border-slate-100 dark:border-slate-800 pb-2">
              {editingCustomer ? 'Sửa Thông Tin Khách Hàng' : 'Thêm Khách Hàng Mới'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên Khách Hàng *</label>
                <input
                  type="text"
                  required
                  value={tenKH}
                  onChange={(e) => setTenKH(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Minh"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Số Điện Thoại</label>
                <input
                  type="text"
                  value={sdt}
                  onChange={(e) => setSdt(e.target.value)}
                  placeholder="0901234567"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Địa Chỉ Gia Hàng</label>
                <input
                  type="text"
                  value={diaChi}
                  onChange={(e) => setDiaChi(e.target.value)}
                  placeholder="123 Nguyễn Văn Cừ, Q.5"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Phân Nhóm</label>
                  <select
                    value={nhomKH}
                    onChange={(e) => setNhomKH(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 font-semibold"
                  >
                    <option value="KhachLe">Khách Lẻ</option>
                    <option value="DaiLy">Đại Lý</option>
                    <option value="VIP">Khách VIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Tỉnh / Thành</label>
                  <input
                    type="text"
                    value={localCity}
                    onChange={(e) => setLocalCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
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
                Lưu Khách Hàng
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Collect Debt */}
      {payModalCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCollectDebt}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base border-b border-slate-100 dark:border-slate-800 pb-2">
              Thu Tiền Nợ Đọng Khách Hàng
            </h3>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
              <span className="block font-bold">{payModalCustomer.TenKhachHang}</span>
              <span>Tổng nợ hiện tại: {formatVND(payModalCustomer.TongNoHienTai)}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Số Tiền Khách Trả (VNĐ) *</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 text-emerald-600 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Ví Nhận Tiền</label>
                <select
                  value={payAccount}
                  onChange={(e) => setPayAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="TienMat Quầy">Quỹ Tiền Mặt Tại Quầy</option>
                  <option value="Techcombank">Techcombank Corporate</option>
                  <option value="Vietcombank">Vietcombank Corporate</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayModalCustomer(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Xác Nhận Thu Nợ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
