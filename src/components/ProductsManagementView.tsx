import React, { useState } from 'react';
import { DatabaseSchema, SanPham, ThuongHieu, NhomHang } from '../types';
import { db } from '../services/db';
import { getFormattedNow, formatDateTime, sortByDateDescending } from '../utils/dateUtils';
import { generateNextId } from '../utils/idUtils';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Edit3,
  Trash2,
  QrCode,
  Tag,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Download,
  Eye,
  X,
  ShieldCheck,
  Box,
  Filter,
  ArrowDown,
  ArrowUp,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  ListFilter,
  Star,
  Phone,
  Truck,
  ShoppingCart,
  Building2,
  ArrowRight,
  History,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { convertTableToCSV, downloadCSV } from '../services/googleSheets';

interface ProductsManagementViewProps {
  data: DatabaseSchema;
}

export const ProductsManagementView: React.FC<ProductsManagementViewProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'brands'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Product Form Modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SanPham | null>(null);
  const [viewingDetailProduct, setViewingDetailProduct] = useState<SanPham | null>(null);
  const [detailTab, setDetailTab] = useState<'detail' | 'supplier' | 'orders' | 'history'>('detail');
  const [detailSortBy, setDetailSortBy] = useState<'date' | 'code' | 'doc'>('date');
  const [detailSortOrder, setDetailSortOrder] = useState<'asc' | 'desc'>('desc');

  // Supplier Tab states
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [favSupplierMap, setFavSupplierMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('FAV_PRODUCT_SUPPLIERS');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Orders Tab states
  const [ordersSearchTerm, setOrdersSearchTerm] = useState('');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('all');

  // History Tab states
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');

  // Form Fields
  const [formMaSP, setFormMaSP] = useState('');
  const [formTenSP, setFormTenSP] = useState('');
  const [formNhom, setFormNhom] = useState('');
  const [formThuongHieu, setFormThuongHieu] = useState('');
  const [formGiaNiemYet, setFormGiaNiemYet] = useState<number>(0);
  const [formGiaNhap, setFormGiaNhap] = useState<number>(0);
  const [formBaoHanh, setFormBaoHanh] = useState<number>(12);
  const [formQuanLySerial, setFormQuanLySerial] = useState(true);
  const [formLoaiSanPham, setFormLoaiSanPham] = useState<'HangHoa' | 'DichVu'>('HangHoa');
  const [formTrangThaiKinhDoanh, setFormTrangThaiKinhDoanh] = useState<'DangKinhDoanh' | 'NgungKinhDoanh'>('DangKinhDoanh');
  const [formUrlImage, setFormUrlImage] = useState('');
  const [formTonKhoMin, setFormTonKhoMin] = useState<number>(2);

  // Brand Modal state
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');

  // Category Modal state
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Open product modal for add or edit
  const handleOpenProductModal = (product?: SanPham) => {
    if (product) {
      setEditingProduct(product);
      setFormMaSP(product.MaSP);
      setFormTenSP(product.TenSanPham);
      setFormNhom(product.MaNhomHang);
      setFormThuongHieu(product.MaThuongHieu);
      setFormGiaNiemYet(product.GiaBanNiemYet);
      setFormGiaNhap(product.GiaNhapTrungBinh);
      setFormBaoHanh(product.ThoiGianBaoHanhThang);
      setFormQuanLySerial(product.QuanlySerial);
      setFormLoaiSanPham(product.LoaiSanPham || 'HangHoa');
      setFormTrangThaiKinhDoanh(product.TrangThaiKinhDoanh || 'DangKinhDoanh');
      setFormUrlImage(product.UrlHinhAnh || '');
      setFormTonKhoMin(2);
    } else {
      setEditingProduct(null);
      setFormMaSP(generateNextId('SP', data.SanPham, 'MaSP', 5));
      setFormTenSP('');
      setFormNhom(data.NhomHang[0]?.MaNhomHang || '');
      setFormThuongHieu(data.ThuongHieu[0]?.MaThuongHieu || '');
      setFormGiaNiemYet(0);
      setFormGiaNhap(0);
      setFormBaoHanh(12);
      setFormQuanLySerial(true);
      setFormLoaiSanPham('HangHoa');
      setFormTrangThaiKinhDoanh('DangKinhDoanh');
      setFormUrlImage('');
      setFormTonKhoMin(2);
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTenSP.trim()) return;

    const updatedItem: SanPham = {
      MaSP: formMaSP,
      TenSanPham: formTenSP.trim(),
      MaNhomHang: formNhom,
      MaThuongHieu: formThuongHieu,
      GiaBanNiemYet: formGiaNiemYet,
      GiaNhapTrungBinh: formGiaNhap,
      ThoiGianBaoHanhThang: formBaoHanh,
      QuanlySerial: formLoaiSanPham === 'DichVu' ? false : formQuanLySerial,
      LoaiSanPham: formLoaiSanPham,
      TrangThaiKinhDoanh: formTrangThaiKinhDoanh,
      UrlHinhAnh: formUrlImage.trim(),
      NgayTao: editingProduct ? editingProduct.NgayTao : getFormattedNow(),
    };

    if (editingProduct) {
      db.updateSanPham(updatedItem);
    } else {
      db.addSanPham(updatedItem);
    }

    setShowProductModal(false);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    const newBrand: ThuongHieu = {
      MaThuongHieu: 'TH' + (data.ThuongHieu.length + 1).toString().padStart(3, '0'),
      TenThuongHieu: brandName.trim(),
    };

    db.getThuongHieu().push(newBrand);
    db.saveToStorage();
    setShowBrandModal(false);
    setBrandName('');
    setBrandDesc('');
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const newCat: NhomHang = {
      MaNhomHang: generateNextId('NH', data.NhomHang, 'MaNhomHang', 3),
      TenNhomHang: catName.trim(),
    };

    db.getNhomHang().push(newCat);
    db.saveToStorage();
    setShowCatModal(false);
    setCatName('');
    setCatDesc('');
  };

  const filteredProducts = data.SanPham.filter((p) => {
    if (selectedCategory !== 'all' && p.MaNhomHang !== selectedCategory) return false;
    if (selectedBrand !== 'all' && p.MaThuongHieu !== selectedBrand) return false;
    if (selectedType !== 'all' && (p.LoaiSanPham || 'HangHoa') !== selectedType) return false;

    const q = (searchTerm || '').toLowerCase();
    return (p.TenSanPham || '').toLowerCase().includes(q) || (p.MaSP || '').toLowerCase().includes(q);
  });

  const handleExportCSV = () => {
    const csv = convertTableToCSV(data.SanPham);
    downloadCSV('DanhSach_SanPham_Export', csv);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Danh Mục Sản Phẩm & Nhóm Hàng
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Quản lý mã hàng SKU, cấu hình kiểm soát Serial/IMEI, thương hiệu và nhóm hàng
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
            onClick={() => handleOpenProductModal()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo Sản Phẩm Mới</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'products'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Sản Phẩm ({data.SanPham.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Nhóm Hàng ({data.NhomHang.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('brands')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'brands'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Thương Hiệu ({data.ThuongHieu.length})</span>
        </button>
      </div>

      {/* TAB 1: PRODUCTS TABLE */}
      {activeTab === 'products' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          {/* Filters Bar */}
          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên SP hoặc mã SKU..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
              >
                <option value="all">Loại: Tất cả</option>
                <option value="HangHoa">Hàng Hóa</option>
                <option value="DichVu">Dịch Vụ</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
              >
                <option value="all">Nhóm Hàng: Tất cả</option>
                {data.NhomHang.map((nh) => (
                  <option key={nh.MaNhomHang} value={nh.MaNhomHang}>
                    {nh.TenNhomHang}
                  </option>
                ))}
              </select>

              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
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

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Mã SKU</th>
                  <th className="px-5 py-3">Tên Sản Phẩm</th>
                  <th className="px-5 py-3">Nhóm / Hãng</th>
                  <th className="px-5 py-3 text-right">Giá Niêm Yết</th>
                  <th className="px-5 py-3 text-right">Giá Nhập TB</th>
                  <th className="px-5 py-3 text-center">Tồn Serial Kho</th>
                  <th className="px-5 py-3 text-center">Cấu Hình Serial</th>
                  <th className="px-5 py-3 text-center">Thao Tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {sortByDateDescending(filteredProducts, (p) => p.NgayTao).map((p, idx) => {
                  const nhom = data.NhomHang.find((n) => n.MaNhomHang === p.MaNhomHang);
                  const brand = data.ThuongHieu.find((b) => b.MaThuongHieu === p.MaThuongHieu);
                  const serialInStock = data.KhoSerial.filter(
                    (s) => s.MaSP === p.MaSP && s.TrangThai === 'TrongKho'
                  ).length;

                  return (
                    <tr
                      key={`${p.MaSP}-${idx}`}
                      onClick={() => setViewingDetailProduct(p)}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        <button
                          onClick={() => setViewingDetailProduct(p)}
                          className="hover:underline text-blue-600 dark:text-blue-400 font-bold"
                          title="Xem chi tiết sản phẩm"
                        >
                          {p.MaSP}
                        </button>
                      </td>

                      <td className="px-5 py-3">
                        <div
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => setViewingDetailProduct(p)}
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden flex items-center justify-center group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                            {p.UrlHinhAnh ? (
                              <img
                                src={p.UrlHinhAnh}
                                alt={p.TenSanPham}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-600 dark:text-blue-400 text-xs group-hover:underline">
                                {p.MaSP}
                              </span>
                              {p.LoaiSanPham === 'DichVu' ? (
                                <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded-md border border-purple-200 dark:border-purple-800 shrink-0">
                                  Dịch vụ
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-md border border-blue-200 dark:border-blue-800 shrink-0">
                                  Hàng hóa
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {p.TenSanPham}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Bảo hành: {p.ThoiGianBaoHanhThang} tháng
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                          {nhom ? nhom.TenNhomHang : '—'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {brand ? brand.TenThuongHieu : '—'}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                        {formatVND(p.GiaBanNiemYet)}
                      </td>

                      <td className="px-5 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">
                        {formatVND(p.GiaNhapTrungBinh)}
                      </td>

                      <td className="px-5 py-3 text-center">
                        {p.LoaiSanPham === 'DichVu' ? (
                          <span className="font-semibold text-[11px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-full border border-purple-200/60 dark:border-purple-800/60">
                            Dịch vụ
                          </span>
                        ) : (
                          <span
                            className={`font-mono font-bold px-2.5 py-1 rounded-full text-xs ${
                              serialInStock <= (p.TonKhoToiThieu || 2)
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {serialInStock} cái
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-center">
                        {p.LoaiSanPham === 'DichVu' ? (
                          <span className="text-[10px] font-semibold text-slate-400">
                            Khong dùng Serial
                          </span>
                        ) : p.QuanlySerial ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            <QrCode className="w-3 h-3" />
                            Quản lý Serial
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">
                            Hàng hàng loạt
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingDetailProduct(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProductModal(p);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCatModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Nhóm Hàng</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.NhomHang.map((nh) => {
              const productCount = data.SanPham.filter(
                (p) => p.MaNhomHang === nh.MaNhomHang
              ).length;

              return (
                <div
                  key={nh.MaNhomHang}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                      {nh.MaNhomHang}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                      {productCount} Sản phẩm
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    {nh.TenNhomHang}
                  </h3>

                  <p className="text-xs text-slate-500">{nh.MoTa}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BRANDS */}
      {activeTab === 'brands' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowBrandModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Thương Hiệu</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.ThuongHieu.map((th) => {
              const productCount = data.SanPham.filter(
                (p) => p.MaThuongHieu === th.MaThuongHieu
              ).length;

              return (
                <div
                  key={th.MaThuongHieu}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                      {th.MaThuongHieu}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                      {productCount} Sản phẩm
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    {th.TenThuongHieu}
                  </h3>

                  <p className="text-xs text-slate-500">{th.MoTa}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Product Form */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base border-b border-slate-100 dark:border-slate-800 pb-2">
              {editingProduct ? 'Cập Nhật Sản Phẩm' : 'Tạo Sản Phẩm Mới'}
            </h3>

            {/* Top Product Type Selector: HÀNG HÓA / DỊCH VỤ */}
            <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFormLoaiSanPham('HangHoa')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
                  formLoaiSanPham === 'HangHoa'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                HÀNG HÓA
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormLoaiSanPham('DichVu');
                  setFormQuanLySerial(false);
                }}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
                  formLoaiSanPham === 'DichVu'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                DỊCH VỤ
              </button>
            </div>

            {/* Status & Serial Card matching screenshot */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 space-y-3.5">
              {/* TRẠNG THÁI */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  TRẠNG THÁI
                </span>
                <select
                  value={formTrangThaiKinhDoanh}
                  onChange={(e) =>
                    setFormTrangThaiKinhDoanh(e.target.value as 'DangKinhDoanh' | 'NgungKinhDoanh')
                  }
                  className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl text-xs border border-emerald-200/60 dark:border-emerald-800/60 focus:outline-none cursor-pointer"
                >
                  <option value="DangKinhDoanh">Đang kinh doanh</option>
                  <option value="NgungKinhDoanh">Ngừng kinh doanh</option>
                </select>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80" />

              {/* SERIAL / IMEI */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    SERIAL / IMEI
                  </div>
                  <div className="text-[11px] text-slate-400 italic">
                    QL sản phẩm có mã riêng
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (formLoaiSanPham !== 'DichVu') {
                      setFormQuanLySerial(!formQuanLySerial);
                    }
                  }}
                  disabled={formLoaiSanPham === 'DichVu'}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    formQuanLySerial && formLoaiSanPham !== 'DichVu'
                      ? 'bg-blue-600 justify-end'
                      : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  } ${formLoaiSanPham === 'DichVu' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="w-4 h-4 bg-white rounded-full shadow-md transition-transform" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Mã SKU *</label>
                <input
                  type="text"
                  required
                  value={formMaSP}
                  onChange={(e) => setFormMaSP(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên {formLoaiSanPham === 'DichVu' ? 'Dịch Vụ' : 'Sản Phẩm'} *</label>
                <input
                  type="text"
                  required
                  value={formTenSP}
                  onChange={(e) => setFormTenSP(e.target.value)}
                  placeholder={formLoaiSanPham === 'DichVu' ? 'Ví dụ: Dịch vụ lắp đặt Camera...' : 'Ví dụ: iPhone 15 Pro Max...'}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Nhóm Hàng *</label>
                <select
                  value={formNhom}
                  onChange={(e) => setFormNhom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 font-semibold"
                >
                  {data.NhomHang.map((nh) => (
                    <option key={nh.MaNhomHang} value={nh.MaNhomHang}>
                      {nh.TenNhomHang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Thương Hiệu *</label>
                <select
                  value={formThuongHieu}
                  onChange={(e) => setFormThuongHieu(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 font-semibold"
                >
                  {data.ThuongHieu.map((th) => (
                    <option key={th.MaThuongHieu} value={th.MaThuongHieu}>
                      {th.TenThuongHieu}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Giá Niêm Yết (VNĐ)</label>
                <input
                  type="number"
                  value={formGiaNiemYet || ''}
                  onChange={(e) => setFormGiaNiemYet(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 font-bold text-indigo-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Giá Nhập / Giá Vốn (VNĐ)</label>
                <input
                  type="number"
                  value={formGiaNhap || ''}
                  onChange={(e) => setFormGiaNhap(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Thời Gian Bảo Hành (Tháng)</label>
                <input
                  type="number"
                  value={formBaoHanh}
                  onChange={(e) => setFormBaoHanh(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {formLoaiSanPham !== 'DichVu' && (
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Cảnh Báo Tồn Tối Thiểu</label>
                  <input
                    type="number"
                    value={formTonKhoMin}
                    onChange={(e) => setFormTonKhoMin(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              )}

              <div className="col-span-2">
                <label className="block text-slate-600 font-medium mb-1">URL Hình Ảnh</label>
                <input
                  type="text"
                  value={formUrlImage}
                  onChange={(e) => setFormUrlImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20"
              >
                Lưu Sản Phẩm
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Product Detail View (Matching User Screenshot) */}
      {viewingDetailProduct && (() => {
        const p = viewingDetailProduct;
        const khoSerialList = data?.KhoSerial || [];
        const serialInStock = khoSerialList.filter(
          (s) => s.MaSP === p.MaSP && s.TrangThai === 'TrongKho'
        ).length;
        const nhomHangList = data?.NhomHang || [];
        const nhomHang = nhomHangList.find((n) => n.MaNhomHang === p.MaNhomHang);
        
        const nhapHangList = data?.NhapHang || [];
        const chiTietNHList = data?.ChiTietNhapHang || [];
        const nccList = data?.NCC || [];

        const nhapHangHistory = nhapHangList.filter((nh) =>
          chiTietNHList.some((ct) => ct.MaNH === nh.MaNH && ct.MaSP === p.MaSP)
        );

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] w-full max-w-3xl lg:max-w-4xl p-7 shadow-2xl space-y-5 my-8 relative animate-in fade-in zoom-in-95 duration-150">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-[#0091ea] rounded-[18px] flex items-center justify-center text-white shrink-0 shadow-xs">
                    <Box className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                      {p.TenSanPham}
                    </h2>
                    <p className="text-[13px] font-normal text-slate-400 mt-0.5">
                      Mã: {p.MaSP}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingDetailProduct(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-7 text-[12.5px] pt-1">
                <button
                  type="button"
                  onClick={() => setDetailTab('detail')}
                  className={`pb-2.5 transition-colors relative cursor-pointer font-medium ${
                    detailTab === 'detail'
                      ? 'text-[#0091ea]'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Chi tiết
                  {detailTab === 'detail' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0091ea] rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('supplier')}
                  className={`pb-2.5 transition-colors relative cursor-pointer font-medium ${
                    detailTab === 'supplier'
                      ? 'text-[#0091ea]'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  NCC ưa thích
                  {detailTab === 'supplier' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0091ea] rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('orders')}
                  className={`pb-2.5 transition-colors relative cursor-pointer font-medium ${
                    detailTab === 'orders'
                      ? 'text-[#0091ea]'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Đơn đặt mua
                  {detailTab === 'orders' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0091ea] rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('history')}
                  className={`pb-2.5 transition-colors relative cursor-pointer font-medium ${
                    detailTab === 'history'
                      ? 'text-[#0091ea]'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Lịch sử nhập/xuất
                  {detailTab === 'history' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0091ea] rounded-full" />
                  )}
                </button>
              </div>

              {/* TAB CONTENT: CHI TIẾT */}
              {detailTab === 'detail' && (
                <div className="space-y-5">
                  {/* Image & Basic Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-28 h-28 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-center">
                      {p.UrlHinhAnh ? (
                        <img
                          src={p.UrlHinhAnh}
                          alt={p.TenSanPham}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Package className="w-10 h-10 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2 text-xs pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Nhóm hàng</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {nhomHang ? nhomHang.TenNhomHang : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Đơn vị</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">cái</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Trạng thái</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {p.LoaiSanPham === 'DichVu'
                            ? 'Dịch vụ'
                            : serialInStock <= (p.TonKhoToiThieu || 2)
                            ? 'Sắp hết'
                            : 'Đang kinh doanh'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 6 Metric Cards Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Card 1 */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4 shadow-3xs">
                      <div className="text-xs text-slate-400 font-medium mb-1.5">Giá vốn</div>
                      <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {formatVND(p.GiaNhapTrungBinh)}
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4 shadow-3xs">
                      <div className="text-xs text-slate-400 font-medium mb-1.5">Giá bán</div>
                      <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {formatVND(p.GiaBanNiemYet)}
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4 shadow-3xs">
                      <div className="text-xs text-slate-400 font-medium mb-1.5">Lợi nhuận/SP</div>
                      <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {formatVND(p.GiaBanNiemYet - p.GiaNhapTrungBinh)}
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4 shadow-3xs">
                      <div className="text-xs text-slate-400 font-medium mb-1.5">Tồn hiện tại</div>
                      <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {p.LoaiSanPham === 'DichVu' ? '—' : serialInStock}
                      </div>
                    </div>

                    {/* Card 5 */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4 shadow-3xs">
                      <div className="text-xs text-slate-400 font-medium mb-1.5">Min / Max</div>
                      <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {p.TonKhoToiThieu || 10} / 500
                      </div>
                    </div>

                    {/* Card 6 */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4 shadow-3xs">
                      <div className="text-xs text-slate-400 font-medium mb-1.5">Giá trị tồn</div>
                      <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {p.LoaiSanPham === 'DichVu' ? '0 đ' : formatVND(serialInStock * p.GiaNhapTrungBinh)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: NCC ƯA THÍCH */}
              {detailTab === 'supplier' && (() => {
                const ctForProduct = chiTietNHList.filter((ct) => ct.MaSP === p.MaSP);
                
                // Group purchases by supplier
                const statsMap: Record<string, { orderCount: number; totalQty: number; lastPrice: number; lastDate: string }> = {};
                ctForProduct.forEach((ct) => {
                  const nh = nhapHangList.find((item) => item.MaNH === ct.MaNH);
                  if (nh) {
                    const maNCC = nh.MaNCC || 'NCC_DEFAULT';
                    if (!statsMap[maNCC]) {
                      statsMap[maNCC] = { orderCount: 0, totalQty: 0, lastPrice: ct.DonGia || 0, lastDate: nh.NgayNhap || '' };
                    }
                    statsMap[maNCC].orderCount += 1;
                    statsMap[maNCC].totalQty += ct.SoLuong || 1;
                    statsMap[maNCC].lastPrice = ct.DonGia || statsMap[maNCC].lastPrice;
                    statsMap[maNCC].lastDate = nh.NgayNhap || statsMap[maNCC].lastDate;
                  }
                });

                // Check favored supplier in state / map or fallback to highest order count supplier
                const currentFavMaNCC = favSupplierMap[p.MaSP] || Object.keys(statsMap)[0] || nccList[0]?.MaNCC || 'NCC00001';
                const favSupplier = nccList.find((n) => n.MaNCC === currentFavMaNCC) || nccList[0] || {
                  MaNCC: currentFavMaNCC,
                  TenNhaCungCap: 'Chưa chọn NCC',
                  SDT: '---',
                };

                const favStats = statsMap[favSupplier.MaNCC] || {
                  orderCount: 0,
                  totalQty: 0,
                  lastPrice: p.GiaNhapTrungBinh || 0,
                  lastDate: 'Chưa có giao dịch',
                };

                // Filter supplier list by search term
                const filteredNccList = nccList.filter(
                  (n) =>
                    n.TenNhaCungCap.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                    n.MaNCC.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                    (n.SDT && n.SDT.includes(supplierSearchTerm))
                );

                return (
                  <div className="py-2 space-y-4">
                    {/* Featured Favorite Supplier Card */}
                    <div className="border border-amber-200/80 dark:border-amber-900/60 rounded-3xl p-5 bg-gradient-to-r from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 font-bold">
                          <Star className="w-6 h-6 fill-current" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold text-[11px] rounded-full">
                              NCC Ưa Thích Nhất
                            </span>
                            <span className="text-xs font-mono text-slate-400 font-semibold">{favSupplier.MaNCC}</span>
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mt-1">
                            {favSupplier.TenNhaCungCap}
                          </h3>
                          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                            {favSupplier.SDT && (
                              <span className="flex items-center gap-1 font-medium">
                                <Phone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                {favSupplier.SDT}
                              </span>
                            )}
                            <span>· {favStats.orderCount} lượt nhập</span>
                            <span>· Tổng SL: {favStats.totalQty}</span>
                            <span>· Gần nhất: {favStats.lastDate && favStats.lastDate !== 'Chưa có giao dịch' ? formatDateTime(favStats.lastDate) : 'Chưa có giao dịch'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col justify-between items-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200/60 dark:border-slate-800">
                        <div className="text-left md:text-right">
                          <div className="text-[11px] text-slate-400 font-medium">Giá nhập gần nhất</div>
                          <div className="font-extrabold text-indigo-600 dark:text-indigo-400 text-base mt-0.5">
                            {formatVND(favStats.lastPrice)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* All Suppliers List to Select or Change Favorite */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                          Danh sách Nhà Cung Cấp Hệ Thống ({filteredNccList.length})
                        </h4>

                        <div className="relative w-full sm:w-64">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={supplierSearchTerm}
                            onChange={(e) => setSupplierSearchTerm(e.target.value)}
                            placeholder="Tìm NCC theo tên, mã, SĐT..."
                            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                        {filteredNccList.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs">
                            Không tìm thấy nhà cung cấp phù hợp
                          </div>
                        ) : (
                          filteredNccList.map((ncc) => {
                            const isFav = ncc.MaNCC === currentFavMaNCC;
                            const st = statsMap[ncc.MaNCC] || { orderCount: 0, totalQty: 0, lastPrice: 0, lastDate: 'Chưa mua' };

                            return (
                              <div
                                key={ncc.MaNCC}
                                className={`p-3.5 flex items-center justify-between gap-3 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                                  isFav ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                      isFav
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}
                                  >
                                    <Building2 className="w-4 h-4" />
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800 dark:text-slate-100">
                                        {ncc.TenNhaCungCap}
                                      </span>
                                      <span className="font-mono text-[10px] text-slate-400">({ncc.MaNCC})</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      {ncc.SDT ? `SĐT: ${ncc.SDT} · ` : ''}
                                      Đã mua {st.orderCount} đơn ({st.totalQty} SP)
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {st.lastPrice > 0 && (
                                    <div className="text-right hidden sm:block">
                                      <div className="text-[10px] text-slate-400">Giá mua gần nhất</div>
                                      <div className="font-bold text-slate-700 dark:text-slate-300">
                                        {formatVND(st.lastPrice)}
                                      </div>
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFavSupplierMap((prev) => {
                                        const updated = { ...prev, [p.MaSP]: ncc.MaNCC };
                                        localStorage.setItem('FAV_PRODUCT_SUPPLIERS', JSON.stringify(updated));
                                        return updated;
                                      });
                                    }}
                                    className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 text-xs ${
                                      isFav
                                        ? 'bg-amber-500 text-white font-bold shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 hover:text-amber-700'
                                    }`}
                                  >
                                    <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                                    <span>{isFav ? 'Đang ưa thích' : 'Chọn ưa thích'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB CONTENT: ĐƠN ĐẶT MUA */}
              {detailTab === 'orders' && (() => {
                const ctForProduct = chiTietNHList.filter((ct) => ct.MaSP === p.MaSP);
                const rawOrders = ctForProduct.map((ct) => {
                  const nh = nhapHangList.find((item) => item.MaNH === ct.MaNH);
                  const ncc = nccList.find((n) => n.MaNCC === nh?.MaNCC);
                  return {
                    MaCTNH: ct.MaCTNH,
                    MaNH: ct.MaNH,
                    MaNCC: nh?.MaNCC || 'NCC00001',
                    TenNCC: ncc?.TenNhaCungCap || nh?.MaNCC || 'Nhà cung cấp',
                    SoLuong: ct.SoLuong || 1,
                    DonGia: ct.DonGia || p.GiaNhapTrungBinh || 0,
                    ThanhTien: ct.ThanhTien || (ct.SoLuong || 1) * (ct.DonGia || 0),
                    NgayNhap: nh?.NgayNhap || '---',
                    TrangThai: nh?.ConNo && nh.ConNo > 0 ? 'Còn nợ' : 'Đã nhập kho',
                    GhiChu: nh?.GhiChu || '',
                  };
                });

                // Filter
                let filteredOrders = rawOrders.filter((ord) => {
                  const matchesSearch =
                    ordersSearchTerm === '' ||
                    ord.MaNH.toLowerCase().includes(ordersSearchTerm.toLowerCase()) ||
                    ord.TenNCC.toLowerCase().includes(ordersSearchTerm.toLowerCase()) ||
                    ord.GhiChu.toLowerCase().includes(ordersSearchTerm.toLowerCase());

                  const matchesStatus =
                    ordersStatusFilter === 'all' || ord.TrangThai === ordersStatusFilter;

                  return matchesSearch && matchesStatus;
                });

                // Sort
                filteredOrders.sort((a, b) => {
                  if (detailSortBy === 'code') {
                    return detailSortOrder === 'asc'
                      ? a.MaNH.localeCompare(b.MaNH)
                      : b.MaNH.localeCompare(a.MaNH);
                  }
                  if (detailSortBy === 'doc') {
                    return detailSortOrder === 'asc'
                      ? a.ThanhTien - b.ThanhTien
                      : b.ThanhTien - a.ThanhTien;
                  }
                  // default date
                  return detailSortOrder === 'asc'
                    ? a.NgayNhap.localeCompare(b.NgayNhap)
                    : b.NgayNhap.localeCompare(a.NgayNhap);
                });

                const totalOrdersQty = filteredOrders.reduce((sum, o) => sum + o.SoLuong, 0);
                const totalOrdersValue = filteredOrders.reduce((sum, o) => sum + o.ThanhTien, 0);

                return (
                  <div className="space-y-4 py-1 text-xs">
                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 rounded-2xl">
                        <div className="text-[11px] text-slate-400">Tổng Số Đơn Nhập</div>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                          {filteredOrders.length} đơn
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 rounded-2xl">
                        <div className="text-[11px] text-slate-400">Tổng SL Đặt Mua</div>
                        <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                          {totalOrdersQty} cái
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 rounded-2xl">
                        <div className="text-[11px] text-slate-400">Tổng Giá Trị Đặt</div>
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {formatVND(totalOrdersValue)}
                        </div>
                      </div>
                    </div>

                    {/* Filter controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={ordersSearchTerm}
                          onChange={(e) => setOrdersSearchTerm(e.target.value)}
                          placeholder="Tìm phiếu mua, NCC, ghi chú..."
                          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <select
                        value={ordersStatusFilter}
                        onChange={(e) => setOrdersStatusFilter(e.target.value)}
                        className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="all">Trạng thái: Tất cả</option>
                        <option value="Đã nhập kho">Đã nhập kho</option>
                        <option value="Còn nợ">Còn nợ</option>
                      </select>

                      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 shadow-2xs">
                        <ListFilter className="w-4 h-4 text-slate-400 shrink-0" />
                        <select
                          value={detailSortBy}
                          onChange={(e) => setDetailSortBy(e.target.value as any)}
                          className="bg-transparent text-xs font-normal text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
                        >
                          <option value="date">Ngày nhập</option>
                          <option value="code">Mã phiếu</option>
                          <option value="doc">Thành tiền</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setDetailSortOrder(detailSortOrder === 'asc' ? 'desc' : 'asc')}
                          className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
                          title={detailSortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                        >
                          {detailSortOrder === 'asc' ? (
                            <ArrowUp className="w-4 h-4 text-[#0091ea]" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-[#0091ea]" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Table Box */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <th className="py-3 px-4">MÃ PHIẾU</th>
                              <th className="py-3 px-4">NCC</th>
                              <th className="py-3 px-4 text-center">SL ĐẶT</th>
                              <th className="py-3 px-4 text-right">ĐƠN GIÁ</th>
                              <th className="py-3 px-4 text-right">THÀNH TIỀN</th>
                              <th className="py-3 px-4 text-center">NGÀY</th>
                              <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredOrders.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                  Chưa có đơn đặt mua nào cho sản phẩm này.
                                </td>
                              </tr>
                            ) : (
                              filteredOrders.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                                  <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                    {item.MaNH}
                                  </td>
                                  <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                                    {item.TenNCC}
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                                    {item.SoLuong}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                                    {formatVND(item.DonGia)}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                                    {formatVND(item.ThanhTien)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center text-slate-500 font-normal">
                                    {formatDateTime(item.NgayNhap)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span
                                      className={`px-2.5 py-1 font-medium rounded-full text-[11px] ${
                                        item.TrangThai === 'Còn nợ'
                                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                      }`}
                                    >
                                      {item.TrangThai}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-normal flex items-center justify-between">
                        <span>{filteredOrders.length} đơn đặt mua</span>
                        <span>Tổng lượng: {totalOrdersQty} SP</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB CONTENT: LỊCH SỬ NHẬP/XUẤT */}
              {detailTab === 'history' && (() => {
                // 1. Imports from ChiTietNhapHang
                const ctForProduct = chiTietNHList.filter((ct) => ct.MaSP === p.MaSP);
                const importLogs = ctForProduct.map((ct) => {
                  const nh = nhapHangList.find((n) => n.MaNH === ct.MaNH);
                  const ncc = nccList.find((n) => n.MaNCC === nh?.MaNCC);
                  return {
                    id: ct.MaCTNH || `${ct.MaNH}-${ct.MaSP}`,
                    date: nh?.NgayNhap || '---',
                    type: 'Nhập mua',
                    typeCat: 'nhap',
                    qtyIn: ct.SoLuong || 1,
                    qtyOut: 0,
                    price: ct.DonGia || p.GiaNhapTrungBinh || 0,
                    docNo: ct.MaNH,
                    partner: ncc?.TenNhaCungCap || nh?.MaNCC || 'Nhà cung cấp',
                    serials: ct.DanhSachSerial || [],
                  };
                });

                // 2. Exports from ChiTietHoaDon
                const hoaDonList = data?.HoaDon || [];
                const chiTietHDList = data?.ChiTietHoaDon || [];
                const ctSales = chiTietHDList.filter((ct) => ct.MaSP === p.MaSP);
                const exportLogs = ctSales.map((ct) => {
                  const hd = hoaDonList.find((h) => h.MaHD === ct.MaHD);
                  return {
                    id: ct.MaCTHD || `${ct.MaHD}-${ct.MaSP}`,
                    date: hd?.NgayTao || '---',
                    type: 'Xuất bán',
                    typeCat: 'xuat',
                    qtyIn: 0,
                    qtyOut: ct.SoLuong || 1,
                    price: ct.DonGia || p.GiaBanNiemYet || 0,
                    docNo: ct.MaHD,
                    partner: hd?.MaKhachHang || 'Khách bán lẻ',
                    serials: ct.DanhSachSerial || [],
                  };
                });

                // 3. Stock card movements
                const theKhoList = data?.TheKho || [];
                const tkLogs = theKhoList
                  .filter((tk) => tk.MaSP === p.MaSP)
                  .map((tk) => {
                    const isPos = tk.SoLuongThayDoi > 0;
                    return {
                      id: tk.MaTheKho,
                      date: tk.ThoiGian || '---',
                      type: tk.LoaiGiaoDich || (isPos ? 'Nhập kho' : 'Xuất kho'),
                      typeCat: isPos ? 'nhap' : 'xuat',
                      qtyIn: isPos ? tk.SoLuongThayDoi : 0,
                      qtyOut: !isPos ? Math.abs(tk.SoLuongThayDoi) : 0,
                      price: p.GiaNhapTrungBinh || 0,
                      docNo: tk.MaChungTu || tk.MaTheKho,
                      partner: tk.GhiChu || 'Điều chỉnh kho',
                      serials: [],
                    };
                  });

                // Combine logs
                const combinedLogs = [...importLogs, ...exportLogs, ...tkLogs];

                // Filter
                let filteredLogs = combinedLogs.filter((log) => {
                  const matchesSearch =
                    historySearchTerm === '' ||
                    log.docNo.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                    log.partner.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                    log.type.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                    log.serials.some((s) => s.toLowerCase().includes(historySearchTerm.toLowerCase()));

                  const matchesType =
                    historyTypeFilter === 'all' || log.typeCat === historyTypeFilter;

                  let matchesDate = true;
                  if (historyDateFrom) {
                    matchesDate = matchesDate && log.date >= historyDateFrom;
                  }
                  if (historyDateTo) {
                    matchesDate = matchesDate && log.date <= historyDateTo;
                  }

                  return matchesSearch && matchesType && matchesDate;
                });

                // Sort by date
                filteredLogs.sort((a, b) =>
                  historySortOrder === 'asc'
                    ? a.date.localeCompare(b.date)
                    : b.date.localeCompare(a.date)
                );

                const totalQtyIn = filteredLogs.reduce((sum, l) => sum + l.qtyIn, 0);
                const totalQtyOut = filteredLogs.reduce((sum, l) => sum + l.qtyOut, 0);
                const netBalance = totalQtyIn - totalQtyOut;

                return (
                  <div className="space-y-4 py-1 text-xs">
                    {/* Summary KPI Bar */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 p-3 rounded-2xl">
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>Tổng Nhập</span>
                        </div>
                        <div className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                          +{totalQtyIn} cái
                        </div>
                      </div>

                      <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 p-3 rounded-2xl">
                        <div className="text-[11px] text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Tổng Xuất</span>
                        </div>
                        <div className="text-base font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                          -{totalQtyOut} cái
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 p-3 rounded-2xl">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          Thay Đổi Ròng
                        </div>
                        <div
                          className={`text-base font-bold mt-0.5 ${
                            netBalance >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-amber-600'
                          }`}
                        >
                          {netBalance >= 0 ? `+${netBalance}` : netBalance} cái
                        </div>
                      </div>
                    </div>

                    {/* Filter controls row 1 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={historySearchTerm}
                          onChange={(e) => setHistorySearchTerm(e.target.value)}
                          placeholder="Tìm mã phiếu, đối tác, serial..."
                          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <select
                        value={historyTypeFilter}
                        onChange={(e) => setHistoryTypeFilter(e.target.value)}
                        className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="all">Loại: Tất cả</option>
                        <option value="nhap">Loại: Nhập kho</option>
                        <option value="xuat">Loại: Xuất kho</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50"
                      >
                        <span>Thời gian: {historySortOrder === 'desc' ? 'Mới nhất' : 'Cũ nhất'}</span>
                        {historySortOrder === 'desc' ? (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
                        )}
                      </button>
                    </div>

                    {/* Table Box */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <th className="py-3 px-4">NGÀY GIAO DỊCH</th>
                              <th className="py-3 px-4">LOẠI GIAO DỊCH</th>
                              <th className="py-3 px-4 text-center">SL NHẬP</th>
                              <th className="py-3 px-4 text-center">SL XUẤT</th>
                              <th className="py-3 px-4 text-right">ĐƠN GIÁ</th>
                              <th className="py-3 px-4 font-mono">CHỨNG TỪ</th>
                              <th className="py-3 px-4">ĐỐI TÁC / GHI CHÚ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredLogs.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                  Chưa có lịch sử nhập/xuất nào cho sản phẩm này.
                                </td>
                              </tr>
                            ) : (
                              filteredLogs.map((item, idx) => {
                                const isNhap = item.typeCat === 'nhap';
                                return (
                                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                                      {formatDateTime(item.date)}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span
                                        className={`px-2.5 py-0.5 font-semibold rounded-full text-[11px] ${
                                          isNhap
                                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                                        }`}
                                      >
                                        {item.type}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                      {item.qtyIn > 0 ? `+${item.qtyIn}` : '-'}
                                    </td>
                                    <td className="py-3.5 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                                      {item.qtyOut > 0 ? `-${item.qtyOut}` : '-'}
                                    </td>
                                    <td className="py-3.5 px-4 text-right font-medium text-slate-800 dark:text-slate-200">
                                      {formatVND(item.price)}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                      {item.docNo || '—'}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                      <div>{item.partner}</div>
                                      {item.serials && item.serials.length > 0 && (
                                        <div className="flex gap-1 mt-0.5 flex-wrap">
                                          {item.serials.slice(0, 3).map((s, i) => (
                                            <span
                                              key={i}
                                              className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500 rounded"
                                            >
                                              {s}
                                            </span>
                                          ))}
                                          {item.serials.length > 3 && (
                                            <span className="text-[10px] text-slate-400">
                                              +{item.serials.length - 3} serial
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-normal flex items-center justify-between">
                        <span>{filteredLogs.length} dòng bản ghi</span>
                        <span>
                          Tổng nhập: +{totalQtyIn} | Tổng xuất: -{totalQtyOut}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${p.TenSanPham}"?`)) {
                      db.deleteSanPham(p.MaSP);
                      setViewingDetailProduct(null);
                    }
                  }}
                  className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 font-semibold text-xs transition-colors px-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingDetailProduct(null)}
                    className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Đóng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const target = p;
                      setViewingDetailProduct(null);
                      handleOpenProductModal(target);
                    }}
                    className="px-5 py-2.5 bg-[#0091ea] hover:bg-[#0081d5] text-white rounded-2xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Chỉnh sửa</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL: Brand Form */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveBrand}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base border-b border-slate-100 dark:border-slate-800 pb-2">
              Thêm Thương Hiệu
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên Thương Hiệu *</label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Ví dụ: Lenovo, Asus, Samsung..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Mô Tả</label>
                <input
                  type="text"
                  value={brandDesc}
                  onChange={(e) => setBrandDesc(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBrandModal(false)}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-xs text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Lưu Thương Hiệu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Category Form */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCategory}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base border-b border-slate-100 dark:border-slate-800 pb-2">
              Thêm Nhóm Hàng
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên Nhóm Hàng *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ví dụ: Laptop Gaming, Phụ Kiện, Smartwatch..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Mô Tả</label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-xs text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Lưu Nhóm Hàng
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
