import React from 'react';
import { DatabaseSchema, ViewTab } from '../types';
import { formatDateTime, sortByDateDescending } from '../utils/dateUtils';
import {
  DollarSign,
  TrendingUp,
  QrCode,
  Users,
  Building2,
  Package,
  ArrowUpRight,
  ShieldAlert,
  ShoppingCart,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardViewProps {
  data: DatabaseSchema;
  setCurrentTab?: (tab: any) => void;
  onNavigate?: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ data, setCurrentTab, onNavigate }) => {
  const navigate = (tab: string) => {
    const targetTab = tab === 'sales' ? 'orders' : tab;
    if (setCurrentTab) setCurrentTab(targetTab);
    if (onNavigate) onNavigate(targetTab);
  };
  // Calculations
  const totalRevenue = data.DonHang.reduce((sum, dh) => sum + dh.KhachPhaiTra, 0);

  // Compute profit: Sales Price - Average Import Price
  let totalCostOfGoods = 0;
  data.ChiTietDonHang.forEach((ct) => {
    const sp = data.SanPham.find((p) => p.MaSP === ct.MaSP);
    const giaNhap = sp ? sp.GiaNhapTrungBinh : 0;
    totalCostOfGoods += giaNhap * ct.SoLuong;
  });
  const estimatedProfit = Math.max(0, totalRevenue - totalCostOfGoods);

  const totalSerialsInStock = data.KhoSerial.filter((s) => s.TrangThai === 'TrongKho').length;
  const totalSerialsSold = data.KhoSerial.filter((s) => s.TrangThai === 'DaBan').length;
  const totalSerialsWarranty = data.KhoSerial.filter((s) => s.TrangThai === 'BaoHanh').length;
  const totalSerialsLiquidation = data.KhoSerial.filter((s) => s.TrangThai === 'LoiThanhLy').length;

  const totalCustomerDebt = data.KhachHang.reduce((sum, kh) => sum + kh.TongNoHienTai, 0);
  const totalSupplierDebt = data.NCC.reduce((sum, ncc) => sum + ncc.TongNoNCC, 0);

  // Chart data: Serial status breakdown
  const serialPieData = [
    { name: 'Trong Kho', value: totalSerialsInStock, color: '#10B981' },
    { name: 'Đã Bán', value: totalSerialsSold, color: '#3B82F6' },
    { name: 'Bảo Hành', value: totalSerialsWarranty, color: '#F59E0B' },
    { name: 'Thanh Lý / Lỗi', value: totalSerialsLiquidation, color: '#EF4444' },
  ];

  // Revenue by Sales Order
  const revenueBarData = data.DonHang.slice(0, 7).map((dh) => ({
    name: dh.MaDH.replace('DH2026', ''),
    DoanhThu: dh.KhachPhaiTra,
    ThanhToan: dh.KhachThanhToan,
  }));

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Tổng Quan Hoạt Động & Kho Serial
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Thống kê doanh thu, tình trạng kho máy serial, công nợ khách hàng và nhà cung cấp
          </p>
        </div>

        <button
          onClick={() => navigate('pos')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Bán Hàng Mới (POS)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tổng Doanh Thu</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 block">
              {formatVND(totalRevenue)}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3" /> Từ {data.DonHang.length} đơn hàng đã xuất
            </span>
          </div>
        </div>

        {/* Lợi Nhuận Ước Tính */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Lợi Nhuận Gộp</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 block">
              {formatVND(estimatedProfit)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">
              Biên lợi nhuận ~{((estimatedProfit / (totalRevenue || 1)) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Serial Trong Kho */}
        <div
          onClick={() => navigate('serials')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs cursor-pointer hover:border-emerald-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Máy/Serial Tồn Kho</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 block">
              {totalSerialsInStock} <span className="text-xs font-normal text-slate-500">cơ sở</span>
            </span>
            <span className="text-[11px] text-amber-600 font-medium mt-1 block">
              {totalSerialsWarranty} máy đang bảo hành
            </span>
          </div>
        </div>

        {/* Nợ Khách Hàng */}
        <div
          onClick={() => navigate('customers')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs cursor-pointer hover:border-amber-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Công Nợ Khách Hàng</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 block">
              {formatVND(totalCustomerDebt)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">
              Nợ NCC: {formatVND(totalSupplierDebt)}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doanh thu theo đơn */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Doanh Thu Đơn Hàng Gần Đây
            </h3>
            <button
              onClick={() => navigate('sales')}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Xem tất cả đơn
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueBarData}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `${v / 1e6}M`} />
                <Tooltip
                  formatter={(value: any) => formatVND(Number(value))}
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderColor: '#334155',
                    color: '#FFF',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="DoanhThu" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Tổng tiền" />
                <Bar dataKey="ThanhToan" fill="#10B981" radius={[4, 4, 0, 0]} name="Đã thu" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Phân bổ trạng thái Kho Serial */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
              Phân Bổ Serial / IMEI Kho
            </h3>
            <p className="text-xs text-slate-500 mb-4">Tổng cộng: {data.KhoSerial.length} máy</p>

            <div className="h-44 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serialPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {serialPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {totalSerialsInStock}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Sẵn sàng bán</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            {serialPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {item.value} máy
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Serial Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Hóa Đơn Mới Xuất</span>
            </h3>
            <button
              onClick={() => navigate('sales')}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Quản lý đơn
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortByDateDescending(data.DonHang, (dh) => dh.NgayBan).slice(0, 4).map((dh, idx) => {
              const kh = data.KhachHang.find((c) => c.MaKH === dh.MaKH);

              return (
                <div key={`${dh.MaDH}-${idx}`} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
                      {dh.MaDH} - {kh ? kh.TenKhachHang : 'Khách lẻ'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(dh.NgayBan)} • {dh.HinhThucThanhToan}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 block">
                      {formatVND(dh.KhachPhaiTra)}
                    </span>
                    {dh.TongNoSau > 0 && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        Nợ: {formatVND(dh.TongNoSau)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Serial Health & Warranty Alerts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Cảnh Báo Serial / Bảo Hành</span>
            </h3>
            <button
              onClick={() => navigate('serials')}
              className="text-xs text-emerald-600 hover:underline font-medium"
            >
              Kiểm tra serial
            </button>
          </div>

          <div className="space-y-2.5">
            {data.KhoSerial.filter((s) => s.TrangThai === 'BaoHanh' || s.TrangThai === 'LoiThanhLy')
              .length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Tất cả máy trong kho đều hoàn toàn bình thường.
              </p>
            ) : (
              data.KhoSerial.filter(
                (s) => s.TrangThai === 'BaoHanh' || s.TrangThai === 'LoiThanhLy'
              ).map((s) => {
                const sp = data.SanPham.find((p) => p.MaSP === s.MaSP);

                return (
                  <div
                    key={s.SoSerial}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {s.SoSerial}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                        {sp ? sp.TenSanPham : s.MaSP}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        s.TrangThai === 'BaoHanh'
                          ? 'bg-amber-100 text-amber-700 border-amber-300'
                          : 'bg-rose-100 text-rose-700 border-rose-300'
                      }`}
                    >
                      {s.TrangThai === 'BaoHanh' ? 'Đang Bảo Hành' : 'Lỗi Thanh Lý'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
