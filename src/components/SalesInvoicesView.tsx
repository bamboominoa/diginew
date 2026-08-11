import React, { useState } from 'react';
import { DatabaseSchema, DonHang, ChiTietDonHang } from '../types';
import { Search, Printer, Download, Eye, DollarSign, Calendar } from 'lucide-react';
import { InvoicePrintModal } from './InvoicePrintModal';
import { convertTableToCSV, downloadCSV } from '../services/googleSheets';
import { formatDateTime, sortByDateDescending } from '../utils/dateUtils';

interface SalesInvoicesViewProps {
  data: DatabaseSchema;
}

export const SalesInvoicesView: React.FC<SalesInvoicesViewProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<{
    order: DonHang;
    details: ChiTietDonHang[];
  } | null>(null);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const filteredOrders = data.DonHang.filter((dh) => {
    const q = (searchTerm || '').toLowerCase();
    const cust = (data.KhachHang || []).find((c) => c.MaKH === dh.MaKH);

    return (
      (dh.MaDH || '').toLowerCase().includes(q) ||
      (cust && (cust.TenKhachHang || '').toLowerCase().includes(q)) ||
      (dh.NhanVienBanHang || '').toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    const csv = convertTableToCSV(data.DonHang);
    downloadCSV('DanhSach_DonHang_Export', csv);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Lịch Sử Đơn Bán Hàng & Hóa Đơn
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Xem lại lịch sử giao dịch bán ra, in hóa đơn xuất kho và tra cứu số Serial đã bàn giao
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Xuất CSV</span>
        </button>
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
              placeholder="Tìm theo Mã Đơn, Khách Hàng, Nhân Viên..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-400 font-semibold">{filteredOrders.length} Hóa Đơn</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Mã Đơn</th>
                <th className="px-5 py-3">Thời Gian</th>
                <th className="px-5 py-3">Khách Hàng</th>
                <th className="px-5 py-3 text-right">Phải Trả</th>
                <th className="px-5 py-3 text-right">Khách Đã Trả</th>
                <th className="px-5 py-3">Thanh Toán</th>
                <th className="px-5 py-3">NV Bán</th>
                <th className="px-5 py-3 text-center">Hành Động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {sortByDateDescending(filteredOrders, (dh) => dh.NgayBan).map((dh, idx) => {
                const cust = data.KhachHang.find((c) => c.MaKH === dh.MaKH);

                return (
                  <tr
                    key={`${dh.MaDH}-${idx}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {dh.MaDH}
                    </td>

                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-medium">
                      {formatDateTime(dh.NgayBan)}
                    </td>

                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {cust ? cust.TenKhachHang : dh.MaKH}
                    </td>

                    <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatVND(dh.KhachPhaiTra)}
                    </td>

                    <td className="px-5 py-3 text-right font-semibold text-emerald-600">
                      {formatVND(dh.KhachThanhToan)}
                    </td>

                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800">
                        {dh.HinhThucThanhToan}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{dh.NhanVienBanHang}</td>

                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => {
                          const details = data.ChiTietDonHang.filter((d) => d.MaDH === dh.MaDH);
                          setSelectedOrderForPrint({ order: dh, details });
                        }}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold text-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Xem & In Hóa Đơn
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Print Modal */}
      {selectedOrderForPrint && (
        <InvoicePrintModal
          order={selectedOrderForPrint.order}
          details={selectedOrderForPrint.details}
          customer={data.KhachHang.find((c) => c.MaKH === selectedOrderForPrint.order.MaKH)}
          onClose={() => setSelectedOrderForPrint(null)}
        />
      )}
    </div>
  );
};
