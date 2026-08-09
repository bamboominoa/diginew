import React, { useState } from 'react';
import { DatabaseSchema, SanPham, ThuongHieu, NhomHang } from '../types';
import { db } from '../services/db';
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
      setFormMaSP('SP' + (data.SanPham.length + 1).toString().padStart(3, '0'));
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
      NgayTao: editingProduct ? editingProduct.NgayTao : new Date().toISOString().substring(0, 10),
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
      MaNhomHang: 'NH' + (data.NhomHang.length + 1).toString().padStart(3, '0'),
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
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
                {filteredProducts.map((p) => {
                  const nhom = data.NhomHang.find((n) => n.MaNhomHang === p.MaNhomHang);
                  const brand = data.ThuongHieu.find((b) => b.MaThuongHieu === p.MaThuongHieu);
                  const serialInStock = data.KhoSerial.filter(
                    (s) => s.MaSP === p.MaSP && s.TrangThai === 'TrongKho'
                  ).length;

                  return (
                    <tr
                      key={p.MaSP}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
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
                            onClick={() => handleOpenProductModal(p)}
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
                const preferredNcc = nccList[0] || {
                  MaNCC: 'NCC011',
                  TenNhaCungCap: 'Phúc Thành Phát',
                  SDT: '0901234567',
                };

                return (
                  <div className="py-2 space-y-4">
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 bg-white dark:bg-slate-900 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-[#fef3c7] dark:bg-amber-950/60 text-[#d97706] dark:text-amber-400 font-bold text-[11px] rounded-full shrink-0">
                          Ưa thích
                        </span>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                            {preferredNcc.TenNhaCungCap}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 font-medium">
                            {preferredNcc.MaNCC} · 1 lần mua · gần nhất 06/08/2026
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] text-slate-400 font-medium text-right">
                          Giá nhập gần nhất
                        </div>
                        <div className="font-extrabold text-slate-800 dark:text-slate-100 text-base text-right mt-0.5">
                          {formatVND(p.GiaNhapTrungBinh || 500000)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB CONTENT: ĐƠN ĐẶT MUA */}
              {detailTab === 'orders' && (() => {
                const orders = nhapHangHistory.length > 0 ? nhapHangHistory : [
                  {
                    MaNH: 'PM028',
                    MaNCC: nccList[0]?.MaNCC || 'NCC011',
                    NgayNhap: '06/08/2026',
                    TongTienHang: p.GiaNhapTrungBinh || 500000,
                    TrangThai: 'Đã nhập kho',
                    SoLuong: 1,
                  }
                ];

                return (
                  <div className="space-y-4 py-1 text-xs">
                    {/* Filter controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Tìm phiếu mua, NCC..."
                          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <select className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer">
                        <option>Trạng thái: Tất cả</option>
                        <option>Đã nhập kho</option>
                      </select>

                      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 shadow-2xs">
                        <ListFilter className="w-4 h-4 text-slate-400 shrink-0" />
                        <select
                          value={detailSortBy}
                          onChange={(e) => setDetailSortBy(e.target.value as any)}
                          className="bg-transparent text-xs font-normal text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
                        >
                          <option value="date">Thời gian tạo / ngày chứng từ</option>
                          <option value="code">Mã</option>
                          <option value="doc">Chứng từ</option>
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

                      <button
                        type="button"
                        className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        <Filter className="w-4 h-4" />
                      </button>
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
                              <th className="py-3 px-4 text-center">NGÀY</th>
                              <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {orders.map((item, idx) => {
                              const supplierName = nccList.find((ncc) => ncc.MaNCC === item.MaNCC)?.TenNhaCungCap || 'Phúc Thành Phát';
                              return (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                                  <td className="py-3.5 px-4 font-normal text-slate-800 dark:text-slate-200 font-mono">
                                    {item.MaNH}
                                  </td>
                                  <td className="py-3.5 px-4 font-normal text-slate-800 dark:text-slate-200">
                                    {supplierName}
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-normal text-slate-800 dark:text-slate-200">
                                    {(item as any).SoLuong || 1}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-normal text-slate-800 dark:text-slate-200">
                                    {formatVND(item.TongTienHang)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center text-slate-500 font-normal">
                                    {item.NgayNhap}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-normal rounded-full text-[11px]">
                                      {(item as any).TrangThai || 'Đã nhập kho'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-normal">
                        {orders.length} kết quả
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB CONTENT: LỊCH SỬ NHẬP/XUẤT */}
              {detailTab === 'history' && (() => {
                const historyList = [
                  {
                    Ma: 'MV852',
                    Ngay: '06/08/2026',
                    Loai: 'Nhập mua',
                    SlNhap: 1,
                    SlXuat: 0,
                    DonGia: p.GiaNhapTrungBinh || 500000,
                    ChungTu: 'PM028',
                  },
                  {
                    Ma: 'MV850',
                    Ngay: '06/08/2026',
                    Loai: 'Nhập thủ công',
                    SlNhap: 5,
                    SlXuat: 0,
                    DonGia: p.GiaNhapTrungBinh || 500000,
                    ChungTu: '',
                  },
                ];

                return (
                  <div className="space-y-4 py-1 text-xs">
                    {/* Filter controls row 1 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Tìm mã phiếu, chứng từ..."
                          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <select className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer">
                        <option>Loại: Tất cả</option>
                        <option>Nhập mua</option>
                        <option>Nhập thủ công</option>
                      </select>

                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-3.5 py-2 text-xs font-medium text-slate-400">
                        <span>dd/mm/yyyy</span>
                        <Calendar className="w-3.5 h-3.5 ml-1" />
                        <span className="mx-1">-</span>
                        <span>dd/mm/yyyy</span>
                        <Calendar className="w-3.5 h-3.5 ml-1" />
                      </div>
                    </div>

                    {/* Filter controls row 2 */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                        <span>Sắp xếp theo</span>
                        <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                      </div>

                      <button
                        type="button"
                        className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Table Box */}
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <th className="py-3 px-4">MÃ</th>
                              <th className="py-3 px-4">NGÀY</th>
                              <th className="py-3 px-4">LOẠI</th>
                              <th className="py-3 px-4 text-center">SL NHẬP</th>
                              <th className="py-3 px-4 text-center">SL XUẤT</th>
                              <th className="py-3 px-4 text-right">ĐƠN GIÁ</th>
                              <th className="py-3 px-4 font-mono">CHỨNG TỪ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {historyList.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                                <td className="py-3.5 px-4 font-normal text-slate-800 dark:text-slate-200 font-mono">
                                  {item.Ma}
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 font-normal">
                                  {item.Ngay}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-normal rounded-full text-[11px]">
                                    {item.Loai}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center font-normal text-slate-800 dark:text-slate-200">
                                  {item.SlNhap}
                                </td>
                                <td className="py-3.5 px-4 text-center font-normal text-slate-800 dark:text-slate-200">
                                  {item.SlXuat}
                                </td>
                                <td className="py-3.5 px-4 text-right font-normal text-slate-800 dark:text-slate-200">
                                  {formatVND(item.DonGia)}
                                </td>
                                <td className="py-3.5 px-4 font-mono font-normal text-slate-700 dark:text-slate-300">
                                  {item.ChungTu || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-normal">
                        {historyList.length} kết quả
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
