import React, { useState } from 'react';
import { DatabaseSchema, StockCard } from '../types';
import { Search, History, ArrowDownLeft, ArrowUpRight, ShieldAlert, Download } from 'lucide-react';
import { convertTableToCSV, downloadCSV } from '../services/googleSheets';
import { formatDateTime, sortByDateDescending } from '../utils/dateUtils';

interface StockCardsViewProps {
  data: DatabaseSchema;
}

const getSerialsString = (serials: any): string => {
  if (!serials) return '';
  if (Array.isArray(serials)) {
    return serials.filter((s) => s && s !== 'Không quản lý serial' && s !== 'Kông quản lý serial').join(', ');
  }
  if (typeof serials === 'string') {
    if (serials.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(serials);
        if (Array.isArray(parsed)) {
          return parsed.filter((s) => s && s !== 'Không quản lý serial' && s !== 'Kông quản lý serial').join(', ');
        }
      } catch {}
    }
    return serials === 'Không quản lý serial' || serials === 'Kông quản lý serial' ? '' : serials;
  }
  return String(serials);
};

export const StockCardsView: React.FC<StockCardsViewProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredCards = data.StockCards.filter((sc) => {
    if (typeFilter !== 'all' && sc.LoaiPhieu !== typeFilter) return false;

    const q = (searchTerm || '').toLowerCase();
    const sp = (data.SanPham || []).find((p) => p.MaSP === sc.MaSP);

    return (
      (sc.MaTheKho || '').toLowerCase().includes(q) ||
      (sc.MaChungTu || '').toLowerCase().includes(q) ||
      (sc.MaSP || '').toLowerCase().includes(q) ||
      (sp && (sp.TenSanPham || '').toLowerCase().includes(q)) ||
      (sc.SoSerial && (Array.isArray(sc.SoSerial) ? sc.SoSerial : [sc.SoSerial]).some((s) => String(s || '').toLowerCase().includes(q)))
    );
  });

  const handleExportCSV = () => {
    const csv = convertTableToCSV(data.StockCards);
    downloadCSV('NhatKy_TheKho_Export', csv);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Nhật Ký Thẻ Kho & Biến Động Tồn Kho
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Sổ cái ghi nhận tự động mọi giao dịch Nhập kho, Bán ra, Bảo hành, Kiểm kê thiết bị
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Xuất CSV Nhật Ký</span>
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Gõ mã phiếu, SKU, tên sản phẩm hoặc mã Serial..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
          >
            <option value="all">Loại Thao Tác: Tất Cả</option>
            <option value="NhapKho">Nhập Kho</option>
            <option value="XuatBan">Xuất Bán</option>
            <option value="BaoHanh">Bảo Hành</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Mã Giao Dịch</th>
                <th className="px-5 py-3">Thời Gian</th>
                <th className="px-5 py-3">Sản Phẩm Biến Động</th>
                <th className="px-5 py-3">Loại Thao Tác</th>
                <th className="px-5 py-3 text-center">Số Lượng</th>
                <th className="px-5 py-3 text-center">Tồn Sau GD</th>
                <th className="px-5 py-3">Mã Serial / IMEI Liên Quan</th>
                <th className="px-5 py-3">Thực Hiện Bởi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {sortByDateDescending(filteredCards, (sc) => sc.NgayGio).map((sc, idx) => {
                const sp = data.SanPham.find((p) => p.MaSP === sc.MaSP);

                return (
                  <tr
                    key={`${sc.MaTheKho}-${idx}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {sc.MaTheKho || sc.MaChungTu}
                    </td>

                    <td className="px-5 py-3 text-slate-500 font-medium">{formatDateTime(sc.NgayGio)}</td>

                    <td className="px-5 py-3">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        {sp ? sp.TenSanPham : sc.MaSP}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{sc.MaSP}</span>
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          sc.LoaiPhieu === 'NhapKho'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : sc.LoaiPhieu === 'XuatBan'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {sc.LoaiPhieu === 'NhapKho' ? (
                          <ArrowDownLeft className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {sc.LoaiPhieu}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-center font-bold">
                      <span
                        className={
                          sc.LoaiPhieu === 'NhapKho' ? 'text-emerald-600' : 'text-indigo-600'
                        }
                      >
                        {sc.LoaiPhieu === 'NhapKho' ? `+${sc.SoLuong}` : `-${sc.SoLuong}`}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {sc.TonSauGiaoDich}
                    </td>

                    <td className="px-5 py-3 font-mono text-[11px]">
                      {(() => {
                        const serialStr = getSerialsString(sc.SoSerial);
                        return serialStr ? (
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            {serialStr}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Không có Serial</span>
                        );
                      })()}
                    </td>

                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{sc.NguoiThucHien}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
