import React, { useState } from 'react';
import { DatabaseSchema, NguoiDung } from '../types';
import { db } from '../services/db';
import { getFormattedNow } from '../utils/dateUtils';
import { generateNextId } from '../utils/idUtils';
import { Users, UserCheck, Shield, Plus, Lock } from 'lucide-react';

interface UsersViewProps {
  data: DatabaseSchema;
  activeUser: NguoiDung;
  onSwitchUser: (user: NguoiDung) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ data, activeUser, onSwitchUser }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [tenDangNhap, setTenDangNhap] = useState('');
  const [hoTen, setHoTen] = useState('');
  const [vaiTro, setVaiTro] = useState<'Admin' | 'BanHang' | 'Kho'>('BanHang');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenDangNhap.trim() || !hoTen.trim()) return;

    const newUser: NguoiDung = {
      MaUID: generateNextId('UID', data.NguoiDung, 'MaUID', 5),
      TenNguoiDung: hoTen.trim(),
      MatKhau: '123456',
      VaiTro: vaiTro,
      QuyenHan: ['POS', 'Kho'],
      NgayTao: getFormattedNow(),
    };

    db.getNguoiDung().push(newUser);
    db.saveToStorage();
    setShowAddModal(false);
    setTenDangNhap('');
    setHoTen('');
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Quản Lý Nhân Viên & Quyền Hạn
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Danh sách nhân viên bán hàng, thủ kho và phân quyền phân vai sử dụng phần mềm
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Thêm Nhân Viên Mới</span>
        </button>
      </div>

      {/* Grid of Users */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.NguoiDung.map((user, idx) => {
          const isActive = user.MaUID === activeUser.MaUID;

          return (
            <div
              key={`${user.MaUID}-${idx}`}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs space-y-3 transition-all ${
                isActive
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400">
                  {user.MaUID}
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    user.VaiTro === 'Admin'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : user.VaiTro === 'Kho'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {user.VaiTro === 'Admin'
                    ? 'Quản Trị Hệ Thống'
                    : user.VaiTro === 'Kho'
                    ? 'Thủ Kho Thiết Bị'
                    : 'Nhân Viên Bán Hàng'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base border border-indigo-200 dark:border-indigo-800">
                  {(user.TenNguoiDung || 'NV').slice(0, 2).toUpperCase()}
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {user.TenNguoiDung}
                  </h3>
                  <span className="text-xs text-slate-400">ID: {user.MaUID}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  Đang Hoạt Động
                </span>

                {isActive ? (
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    ★ Đang Đăng Nhập
                  </span>
                ) : (
                  <button
                    onClick={() => onSwitchUser(user)}
                    className="text-xs font-bold text-slate-600 hover:text-indigo-600 hover:underline"
                  >
                    Chuyển Tài Khoản
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Add New User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddUser}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base border-b border-slate-100 dark:border-slate-800 pb-2">
              Thêm Tài Khoản Nhân Viên
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Họ Và Tên Nhân Viên *</label>
                <input
                  type="text"
                  required
                  value={hoTen}
                  onChange={(e) => setHoTen(e.target.value)}
                  placeholder="Ví dụ: Lê Thị Hoàng Anh"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên Đăng Nhập *</label>
                <input
                  type="text"
                  required
                  value={tenDangNhap}
                  onChange={(e) => setTenDangNhap(e.target.value)}
                  placeholder="hoanganh"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Vai Trò Quyền Hạn</label>
                <select
                  value={vaiTro}
                  onChange={(e) => setVaiTro(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 font-semibold"
                >
                  <option value="NhanVienBanHang">Nhân Viên Bán Hàng (POS)</option>
                  <option value="ThuKho">Thủ Kho (Quản lý Serial & Kho)</option>
                  <option value="QuanTri">Quản Trị Hệ Thống (Toàn Quyền)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Tạo Nhân Viên
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
