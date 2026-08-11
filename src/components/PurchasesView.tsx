import React, { useState, useRef, useEffect } from 'react';
import { DatabaseSchema, NhapHang, ChiTietNhapHang } from '../types';
import { formatDateTime, sortByDateDescending, getFormattedNow } from '../utils/dateUtils';
import { generateNextId } from '../utils/idUtils';
import { db } from '../services/db';
import {
  ArrowLeft,
  Search,
  LayoutGrid,
  Plus,
  QrCode,
  Printer,
  Eye,
  Info,
  Trash2,
  Calendar,
  Pencil,
  FileText,
  Download,
  CheckCircle2,
  ShoppingCart,
  RotateCw,
  Check,
  X,
} from 'lucide-react';
import { convertTableToCSV, downloadCSV } from '../services/googleSheets';

interface PurchasesViewProps {
  data: DatabaseSchema;
  activeUserName: string;
}

interface ImportCartItem {
  maSP: string;
  tenSP: string;
  urlHinhAnh?: string;
  dvt: string;
  soLuong: number;
  donGiaNhap: number;
  giamGia: number;
  serials: string[];
  ghiChu: string;
  quanLySerial?: boolean;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ data, activeUserName }) => {
  // Mode: 'create' (POS-style goods receipt as in screenshot) or 'history' (receipts log table)
  const [viewMode, setViewMode] = useState<'create' | 'history'>('history');

  // Supplier selection - default unselected/empty so user clicks to choose
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  // Search and auto-complete
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Quick Add Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState(385000);

  // Cart of products to import - Starts empty for new receipts
  const [importCart, setImportCart] = useState<ImportCartItem[]>([]);

  // Sidebar Form values
  const [ngayNhap, setNgayNhap] = useState<string>(getFormattedNow());
  const [giamGiaReceipt, setGiamGiaReceipt] = useState<number>(0);
  const [chiPhiNhapTraNCC, setChiPhiNhapTraNCC] = useState<number>(0);
  const [phiVanChuyen, setPhiVanChuyen] = useState<number>(0);
  const [selectedBank, setSelectedBank] = useState<string>('Ví Cường Tin');
  const [daThanhToan, setDaThanhToan] = useState<number>(0);
  const [ghiChuReceipt, setGhiChuReceipt] = useState<string>('');

  // Purchase Import Draft Storage & Restore state
  const [draftRestoredTime, setDraftRestoredTime] = useState<string | null>(null);
  const isDraftInitialized = useRef(false);

  // On mount: Automatically restore existing import draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('purchases_import_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          ((Array.isArray(parsed.importCart) && parsed.importCart.length > 0) ||
            parsed.selectedSupplierId ||
            (parsed.ghiChuReceipt && parsed.ghiChuReceipt.trim()))
        ) {
          if (Array.isArray(parsed.importCart)) {
            const restoredCart: ImportCartItem[] = parsed.importCart.map((dItem: any) => {
              const sp =
                data.SanPham.find(
                  (p) =>
                    p.MaSP &&
                    dItem.maSP &&
                    p.MaSP.toString().trim().toLowerCase() === dItem.maSP.toString().trim().toLowerCase()
                ) || {
                  MaSP: dItem.maSP,
                  TenSanPham: dItem.tenSP,
                  UrlHinhAnh: dItem.urlHinhAnh,
                  DonViTinh: dItem.dvt,
                  GiaNhapTrungBinh: dItem.donGiaNhap,
                  QuanlySerial: !!dItem.quanLySerial,
                };

              return {
                maSP: dItem.maSP || sp.MaSP,
                tenSP: dItem.tenSP || sp.TenSanPham || 'Sản phẩm',
                urlHinhAnh: dItem.urlHinhAnh || sp.UrlHinhAnh || '',
                dvt: dItem.dvt || sp.DonViTinh || 'Cái',
                soLuong: Number(dItem.soLuong) || 1,
                donGiaNhap: typeof dItem.donGiaNhap === 'number' ? dItem.donGiaNhap : sp.GiaNhapTrungBinh || 0,
                giamGia: Number(dItem.giamGia) || 0,
                serials: Array.isArray(dItem.serials) ? dItem.serials : [],
                ghiChu: dItem.ghiChu || '',
                quanLySerial: dItem.quanLySerial ?? sp.QuanlySerial,
              };
            });

            setImportCart(restoredCart);
          }

          if (parsed.selectedSupplierId !== undefined) setSelectedSupplierId(parsed.selectedSupplierId);
          if (parsed.ngayNhap) setNgayNhap(parsed.ngayNhap);
          if (typeof parsed.giamGiaReceipt === 'number') setGiamGiaReceipt(parsed.giamGiaReceipt);
          if (typeof parsed.chiPhiNhapTraNCC === 'number') setChiPhiNhapTraNCC(parsed.chiPhiNhapTraNCC);
          if (typeof parsed.phiVanChuyen === 'number') setPhiVanChuyen(parsed.phiVanChuyen);
          if (parsed.selectedBank) setSelectedBank(parsed.selectedBank);
          if (typeof parsed.daThanhToan === 'number') setDaThanhToan(parsed.daThanhToan);
          if (parsed.ghiChuReceipt !== undefined) setGhiChuReceipt(parsed.ghiChuReceipt);

          setDraftRestoredTime(formatDateTime(parsed.savedAt || new Date()));
          setViewMode('create');
        }
      }
    } catch (err) {
      console.error('Lỗi khi đọc bản lưu tạm nhập kho:', err);
    } finally {
      isDraftInitialized.current = true;
    }
  }, []);

  // Handler: Làm mới phiếu / Xóa bản lưu tạm
  const handleResetDraft = () => {
    localStorage.removeItem('purchases_import_draft');
    setImportCart([]);
    setSelectedSupplierId('');
    setNgayNhap(getFormattedNow());
    setGiamGiaReceipt(0);
    setChiPhiNhapTraNCC(0);
    setPhiVanChuyen(0);
    setDaThanhToan(0);
    setGhiChuReceipt('');
    setDraftRestoredTime(null);
  };

  // Auto-save import form changes to localStorage whenever state updates
  useEffect(() => {
    // DO NOT save or remove draft until initial mount check finishes!
    if (!isDraftInitialized.current) {
      return;
    }

    if (importCart.length > 0 || selectedSupplierId || (ghiChuReceipt && ghiChuReceipt.trim())) {
      const draftPayload = {
        importCart,
        selectedSupplierId,
        ngayNhap,
        giamGiaReceipt,
        chiPhiNhapTraNCC,
        phiVanChuyen,
        selectedBank,
        daThanhToan,
        ghiChuReceipt,
        savedAt: getFormattedNow(),
      };
      localStorage.setItem('purchases_import_draft', JSON.stringify(draftPayload));
    } else {
      localStorage.removeItem('purchases_import_draft');
    }
  }, [
    importCart,
    selectedSupplierId,
    ngayNhap,
    giamGiaReceipt,
    chiPhiNhapTraNCC,
    phiVanChuyen,
    selectedBank,
    daThanhToan,
    ghiChuReceipt,
  ]);

  // Helper to start/reset new receipt form
  const handleStartNewReceipt = () => {
    handleResetDraft();
    setViewMode('create');
  };

  // Receipt details view modal for history mode
  const [selectedReceipt, setSelectedReceipt] = useState<{
    receipt: NhapHang;
    details: ChiTietNhapHang[];
  } | null>(null);

  // Format currency helpers
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  // Keyboard shortcut F3 to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Selected supplier object
  const selectedSupplier = data.NCC.find((c) => c.MaNCC === selectedSupplierId);

  // Filter products for search autocomplete
  const searchResults = data.SanPham.filter((p) => {
    if (!searchTerm.trim()) return false;
    const q = searchTerm.toLowerCase();
    return (
      (p.TenSanPham || '').toLowerCase().includes(q) ||
      (p.MaSP || '').toLowerCase().includes(q)
    );
  }).slice(0, 8);

  // Cart operations
  const handleAddProductToCart = (sp: typeof data.SanPham[0]) => {
    const existingIdx = importCart.findIndex((item) => item.maSP === sp.MaSP);
    if (existingIdx >= 0) {
      const updated = [...importCart];
      updated[existingIdx].soLuong += 1;
      setImportCart(updated);
    } else {
      setImportCart([
        ...importCart,
        {
          maSP: sp.MaSP,
          tenSP: sp.TenSanPham,
          urlHinhAnh: sp.UrlHinhAnh,
          dvt: 'Cái',
          soLuong: 1,
          donGiaNhap: sp.GiaNhapTrungBinh || 0,
          giamGia: 0,
          serials: [],
          ghiChu: '',
          quanLySerial: sp.QuanlySerial,
        },
      ]);
    }
    setSearchTerm('');
    setShowSearchDropdown(false);
  };

  const updateCartItem = (index: number, field: keyof ImportCartItem, value: any) => {
    const updated = [...importCart];
    updated[index] = { ...updated[index], [field]: value };
    setImportCart(updated);
  };

  const removeCartItem = (index: number) => {
    setImportCart(importCart.filter((_, i) => i !== index));
  };

  const addSerialToItem = (itemIdx: number, serial: string) => {
    const cleanSerial = serial.trim();
    if (!cleanSerial) return;
    const updated = [...importCart];
    const currentSerials = updated[itemIdx].serials || [];
    if (!currentSerials.includes(cleanSerial)) {
      const newSerials = [...currentSerials, cleanSerial];
      updated[itemIdx].serials = newSerials;
      // If serial count exceeds qty, bump qty
      if (newSerials.length > updated[itemIdx].soLuong) {
        updated[itemIdx].soLuong = newSerials.length;
      }
      setImportCart(updated);
    }
  };

  const removeSerialFromItem = (itemIdx: number, serialIdx: number) => {
    const updated = [...importCart];
    updated[itemIdx].serials = updated[itemIdx].serials.filter((_, i) => i !== serialIdx);
    setImportCart(updated);
  };

  // Calculations
  const tongTienHang = importCart.reduce(
    (sum, item) => sum + item.soLuong * item.donGiaNhap - (item.giamGia || 0),
    0
  );

  const canTraNCC = Math.max(
    0,
    tongTienHang - giamGiaReceipt + phiVanChuyen + chiPhiNhapTraNCC
  );

  const conNoNCC = Math.max(0, canTraNCC - daThanhToan);

  // Quick Add new product on the fly
  const handleQuickCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;
    const newMaSP = generateNextId('SP', data.SanPham, 'MaSP', 5);
    const newSp = {
      MaSP: newMaSP,
      TenSanPham: newProductName,
      MaNhomHang: 'NH002',
      MaThuongHieu: 'TH003',
      GiaNhapTrungBinh: newProductPrice,
      GiaBanNiemYet: Math.round(newProductPrice * 1.3),
      ThoiGianBaoHanhThang: 12,
      QuanlySerial: true,
      TrangThaiKinhDoanh: 'DangKinhDoanh' as const,
      UrlHinhAnh: 'https://images.unsplash.com/photo-1557862921-37829c790f19?w=500',
      NgayTao: getFormattedNow(),
    };
    db.addSanPham(newSp);
    handleAddProductToCart(newSp);
    setShowAddProductModal(false);
    setNewProductName('');
  };

  // Submit Receipt (Complete / Draft)
  const savePurchaseReceipt = (status: 'Hoàn thành' | 'Phiếu tạm') => {
    if (!selectedSupplierId) {
      alert('Vui lòng chọn Nhà Cung Cấp!');
      return;
    }

    if (importCart.length === 0) {
      alert('Vui lòng thêm ít nhất 1 sản phẩm vào phiếu nhập!');
      return;
    }

    const supplierId = selectedSupplierId;
    const ncc = data.NCC.find((c) => c.MaNCC === supplierId);
    const oldDebt = ncc ? ncc.TongNoNCC : 0;
    const newDebt = oldDebt + conNoNCC;
    const nowStr = getFormattedNow();
    const newMaNH = generateNextId('NH', data.NhapHang, 'MaNH', 5);

    const newNH: NhapHang = {
      MaNH: newMaNH,
      NgayNhap: nowStr,
      MaNCC: supplierId,
      TongTienHang: tongTienHang,
      GiamGiaNCC: giamGiaReceipt,
      TongPhaiTra: canTraNCC,
      DaThanhToan: daThanhToan,
      NoCuNCC: oldDebt,
      NoMoiNCC: newDebt,
      ViChiTien: selectedBank,
      HinhThucThanhToan: 'ChuyenKhoan',
      NhanVienNhan: activeUserName,
      GhiChu: ghiChuReceipt || (status === 'Phiếu tạm' ? 'Phiếu tạm lưu giữ' : ''),
    };

    let currentCtnhList = [...data.ChiTietNhapHang];
    const details: ChiTietNhapHang[] = importCart.map((item) => {
      const maCtnh = generateNextId('CTNH', currentCtnhList, 'MaChiTietNH', 5);
      currentCtnhList.push({ MaChiTietNH: maCtnh } as any);
      return {
        MaChiTietNH: maCtnh,
        MaNH: newMaNH,
        MaSP: item.maSP,
        SoLuong: item.soLuong,
        GiaNhap: item.donGiaNhap,
        SoSerialNhap: item.serials,
        ThanhTien: item.soLuong * item.donGiaNhap - item.giamGia,
      };
    });

    db.createPurchaseReceipt(newNH, details);

    alert(
      status === 'Hoàn thành'
        ? 'Đã hoàn thành nhập hàng thành công! Kho Serial và Thẻ kho đã được tự động cập nhật.'
        : 'Đã lưu tạm phiếu nhập hàng!'
    );

    // Reset cart, draft and supplier
    localStorage.removeItem('purchases_import_draft');
    setDraftRestoredTime(null);
    setImportCart([]);
    setSelectedSupplierId('');
    setDaThanhToan(0);
    setGhiChuReceipt('');
    setViewMode('history');
  };

  const handleExportCSV = () => {
    const csv = convertTableToCSV(data.NhapHang);
    downloadCSV('DanhSach_PhieuNhap_Export', csv);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-y-auto lg:overflow-hidden">
      {/* 1. TOP NAVBAR / HEADER (Only rendered when creating a new receipt) */}
      {viewMode === 'create' && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between gap-4 shrink-0 shadow-2xs z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('history')}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Xem Lịch Sử Nhập Hàng"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Danh sách phiếu nhập</span>
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
              Nhập hàng kho mới
            </h1>
          </div>

          {/* Top Right Utility Tools */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddProductModal(true)}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo SP mới</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="In phiếu"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('history')}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Lịch sử nhập kho"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. CREATE / POS-STYLE GOODS RECEIPT INTERFACE */}
      {viewMode === 'create' ? (
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
          {/* LEFT AREA: ITEMS TABLE & SERIAL MANAGEMENT */}
          <div className="flex-1 overflow-y-auto p-4 min-w-0 space-y-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
              {/* TOP SEARCH HEADER MATCHING POS VIEW SCREENSHOT */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-2 shrink-0 bg-white dark:bg-slate-900">
                {/* Label + Enter badge + Draft pill + Reset button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      TÌM SẢN PHẨM
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded text-[10px] font-mono font-medium">
                      Enter
                    </span>
                    <span className="text-[11px] text-slate-400">để thêm nhanh</span>
                    {draftRestoredTime && (
                      <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/90 dark:border-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-[11px] font-medium flex items-center gap-1.5">
                        <RotateCw className="w-3 h-3 text-blue-500 animate-spin-slow" />
                        <span>Đã khôi phục đơn lưu tạm ({draftRestoredTime})</span>
                      </span>
                    )}
                  </div>

                  {importCart.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetDraft}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1.5 transition-colors bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/60 px-2.5 py-1 rounded-lg cursor-pointer"
                      title="Xóa toàn bộ phiếu nhập và làm mới đơn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Làm mới đơn</span>
                    </button>
                  )}
                </div>

                {/* Fast Product Search Bar */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowSearchDropdown(true);
                      }}
                      onFocus={() => setShowSearchDropdown(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchResults.length > 0) {
                          handleAddProductToCart(searchResults[0]);
                          setSearchTerm('');
                          setShowSearchDropdown(false);
                        }
                      }}
                      placeholder="Nhập tên, mã SKU hoặc barcode..."
                      className="w-full pl-9 pr-20 py-2.5 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-2xs"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setShowSearchDropdown(false);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAddProductModal(true)}
                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        title="Tạo sản phẩm mới"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Autocomplete Product Search Results Dropdown */}
                  {showSearchDropdown && searchResults.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setShowSearchDropdown(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {searchResults.map((sp, idx) => (
                          <div
                            key={`${sp.MaSP}-${idx}`}
                            onClick={() => {
                              handleAddProductToCart(sp);
                              setSearchTerm('');
                              setShowSearchDropdown(false);
                            }}
                            className="p-2.5 flex items-center justify-between hover:bg-blue-50/80 dark:hover:bg-slate-800/60 cursor-pointer text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={sp.UrlHinhAnh || 'https://images.unsplash.com/photo-1557862921-37829c790f19?w=100'}
                                alt={sp.TenSanPham}
                                className="w-9 h-9 object-cover rounded-md border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                              <div>
                                <div className="font-bold text-blue-600 dark:text-blue-400 text-xs">
                                  {sp.MaSP}
                                </div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs mt-0.5">
                                  {sp.TenSanPham}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-blue-600 dark:text-blue-400">
                                {formatVND(sp.GiaNhapTrungBinh || 0)}
                              </div>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                {sp.QuanlySerial ? 'Quản lý Serial/IMEI' : 'Hàng tiêu chuẩn'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-2 text-center w-8"></th>
                      <th className="py-2.5 px-2 w-10 text-center">STT</th>
                      <th className="py-2.5 px-3 w-48">Mã hàng</th>
                      <th className="py-2.5 px-3">Tên hàng</th>
                      <th className="py-2.5 px-3 text-center w-16">ĐVT</th>
                      <th className="py-2.5 px-3 text-center w-24">Số lượng</th>
                      <th className="py-2.5 px-3 text-right w-28">Đơn giá</th>
                      <th className="py-2.5 px-3 text-right w-24">Giảm giá</th>
                      <th className="py-2.5 px-3 text-right w-28">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {importCart.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 italic">
                          Chưa có sản phẩm nào trong phiếu. Sử dụng thanh tìm kiếm (F3) ở trên để thêm sản phẩm!
                        </td>
                      </tr>
                    ) : (
                      importCart.map((item, idx) => (
                        <React.Fragment key={idx}>
                          <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            {/* Delete icon */}
                            <td className="py-3 px-2 text-center">
                              <button
                                onClick={() => removeCartItem(idx)}
                                className="text-slate-300 hover:text-rose-500 transition-colors"
                                title="Xóa hàng khỏi phiếu"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>

                            {/* STT */}
                            <td className="py-3 px-2 text-center text-slate-500 font-medium">
                              {idx + 1}
                            </td>

                            {/* Mã hàng (Blue link text with Product Code) */}
                            <td className="py-3 px-3">
                              <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer block truncate">
                                {item.maSP}
                              </span>
                            </td>

                            {/* Tên hàng + image + MaSP + TenSP + note */}
                            <td className="py-3 px-3">
                              <div className="flex items-start gap-2.5">
                                <img
                                  src={
                                    item.urlHinhAnh ||
                                    'https://images.unsplash.com/photo-1557862921-37829c790f19?w=100'
                                  }
                                  alt={item.tenSP}
                                  className="w-10 h-10 object-cover rounded-md border border-slate-200 dark:border-slate-700 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-blue-600 dark:text-blue-400 font-bold text-xs hover:underline cursor-pointer">
                                    {item.maSP}
                                  </div>
                                  <div className="font-semibold text-slate-800 dark:text-slate-100 leading-tight text-xs mt-0.5">
                                    {item.tenSP}
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                                    <Pencil className="w-3 h-3 text-slate-400 shrink-0" />
                                    <input
                                      type="text"
                                      value={item.ghiChu || ''}
                                      onChange={(e) => updateCartItem(idx, 'ghiChu', e.target.value)}
                                      placeholder="Ghi chú..."
                                      className="bg-transparent border-none p-0 text-[11px] text-slate-500 focus:outline-none placeholder-slate-400 w-full"
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* ĐVT */}
                            <td className="py-3 px-3 text-center text-blue-600 dark:text-blue-400 font-medium">
                              {item.dvt || 'Cái'}
                            </td>

                            {/* Số lượng */}
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min={1}
                                value={item.soLuong}
                                onChange={(e) => updateCartItem(idx, 'soLuong', Math.max(1, Number(e.target.value)))}
                                className="w-16 px-2 py-1 text-center border border-slate-200 dark:border-slate-700 rounded-md font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
                              />
                            </td>

                            {/* Đơn giá */}
                            <td className="py-3 px-3 text-right">
                              <input
                                type="number"
                                value={item.donGiaNhap}
                                onChange={(e) => updateCartItem(idx, 'donGiaNhap', Number(e.target.value))}
                                className="w-24 px-2 py-1 text-right border border-slate-200 dark:border-slate-700 rounded-md font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
                              />
                            </td>

                            {/* Giảm giá */}
                            <td className="py-3 px-3 text-right">
                              <input
                                type="number"
                                value={item.giamGia || 0}
                                onChange={(e) => updateCartItem(idx, 'giamGia', Number(e.target.value))}
                                className="w-20 px-2 py-1 text-right border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
                              />
                            </td>

                            {/* Thành tiền */}
                            <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                              {formatVND(item.soLuong * item.donGiaNhap - (item.giamGia || 0))}
                            </td>
                          </tr>

                          {/* Subrow for Serial / IMEI Input & Chips */}
                          <tr className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                            <td></td>
                            <td colSpan={8} className="py-2.5 px-4 space-y-2">
                              <div className="flex items-center gap-2 max-w-sm">
                                <div className="flex items-center flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 focus-within:border-blue-500">
                                  {/* Custom barcode icon lines */}
                                  <div className="flex items-center gap-0.5 mr-2 text-slate-400">
                                    <span className="w-0.5 h-3.5 bg-slate-400 rounded-xs" />
                                    <span className="w-1 h-3.5 bg-slate-400 rounded-xs" />
                                    <span className="w-0.5 h-3.5 bg-slate-400 rounded-xs" />
                                    <span className="w-1 h-3.5 bg-slate-400 rounded-xs" />
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Nhập số Serial/Imei"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ',') {
                                        e.preventDefault();
                                        const val = (e.currentTarget.value || '').trim();
                                        if (val) {
                                          addSerialToItem(idx, val);
                                          e.currentTarget.value = '';
                                        }
                                      }
                                    }}
                                    className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 focus:outline-none placeholder-slate-400 font-mono"
                                  />
                                </div>
                              </div>

                              {/* Serial Chips */}
                              {item.serials && item.serials.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  {item.serials.map((s, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="inline-flex items-center gap-1 bg-blue-50/90 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-semibold text-[11px] px-2 py-0.5 rounded-md shadow-2xs"
                                    >
                                      <span className="font-mono">{s}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeSerialFromItem(idx, sIdx)}
                                        className="text-blue-400 hover:text-rose-500 font-bold ml-1"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: SUPPLIER & INVOICE DETAILS */}
          <div className="w-full lg:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 space-y-4 overflow-y-auto shrink-0 shadow-xs">
            {/* Selected Supplier Badge / Card */}
            {selectedSupplier ? (
              <div className="flex items-center justify-between p-3 bg-blue-50/80 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 rounded-xl">
                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                  {selectedSupplier.TenNhaCungCap}
                </span>
                <button
                  onClick={() => setSelectedSupplierId('')}
                  className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-rose-500 hover:text-white text-slate-500 flex items-center justify-center text-xs font-bold transition-colors"
                  title="Chọn nhà cung cấp khác"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Chọn Nhà Cung Cấp *</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Chọn Nhà Cung Cấp --</option>
                  {data.NCC.map((c) => (
                    <option key={c.MaNCC} value={c.MaNCC}>
                      {c.TenNhaCungCap}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Details Form Grid */}
            <div className="space-y-3 text-xs border-b border-slate-100 dark:border-slate-800 pb-3">
              {/* Thời gian */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Thời gian</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                  <span>{ngayNhap}</span>
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* Mã phiếu nhập */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Mã phiếu nhập</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Mã phiếu tự động
                </span>
              </div>

              {/* Mã đặt hàng nhập */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Mã đặt hàng nhập</span>
                <span className="text-slate-400 italic">Chưa chọn</span>
              </div>

              {/* Trạng thái */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Trạng thái</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Phiếu tạm
                </span>
              </div>

              {/* Tổng tiền hàng */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  Tổng tiền hàng <Info className="w-3 h-3 text-slate-400" />
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {formatVND(tongTienHang)}
                </span>
              </div>

              {/* Giảm giá */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Giảm giá</span>
                <input
                  type="number"
                  value={giamGiaReceipt}
                  onChange={(e) => setGiamGiaReceipt(Number(e.target.value))}
                  className="w-24 text-right px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              {/* Chi phí nhập trả NCC */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Chi phí nhập trả NCC</span>
                <input
                  type="number"
                  value={chiPhiNhapTraNCC}
                  onChange={(e) => setChiPhiNhapTraNCC(Number(e.target.value))}
                  className="w-24 text-right px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 focus:outline-none"
                />
              </div>

              {/* Phí vận chuyển */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Phí vận chuyển</span>
                <input
                  type="number"
                  value={phiVanChuyen}
                  onChange={(e) => setPhiVanChuyen(Number(e.target.value))}
                  className="w-24 text-right px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 focus:outline-none"
                />
              </div>

              {/* Cần trả nhà cung cấp */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Cần trả nhà cung cấp
                </span>
                <span className="font-bold text-blue-600 text-base">
                  {formatVND(canTraNCC)}
                </span>
              </div>
            </div>

            {/* Ví / Ngân hàng thanh toán */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 block">
                Ví / Ngân hàng thanh toán:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Vietcombank HKD',
                  'Ví Cường Tin',
                  'HDBank - Quên',
                  'Agribank 12345',
                  'VPbank',
                ].map((bank) => {
                  const isSelected = selectedBank === bank;
                  return (
                    <button
                      type="button"
                      key={bank}
                      onClick={() => setSelectedBank(bank)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected
                            ? 'bg-blue-600 dark:bg-blue-400'
                            : 'border border-slate-300 dark:border-slate-600'
                        }`}
                      />
                      <span>{bank}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Đã thanh toán & Quick shortcuts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Đã thanh toán</span>
                <input
                  type="number"
                  value={daThanhToan}
                  onChange={(e) => setDaThanhToan(Number(e.target.value))}
                  className="w-32 text-right px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-emerald-600 bg-white dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[500000, 1000000, 2000000, 5000000].map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => setDaThanhToan(amt)}
                    className="py-1 px-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {formatNumber(amt)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDaThanhToan(canTraNCC)}
                  className="col-span-2 py-1 px-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-bold text-blue-600 dark:text-blue-400 transition-colors"
                >
                  Đúng số tiền
                </button>
              </div>
            </div>

            {/* Còn nợ NCC & Ghi chú */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Còn nợ NCC
                </span>
                <span className="text-base font-bold text-rose-600">
                  {formatVND(conNoNCC)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 cursor-pointer hover:underline text-blue-600 dark:text-blue-400">
                  Chi phí nhập khác →
                </span>
                <span className="font-bold">0</span>
              </div>

              <textarea
                value={ghiChuReceipt}
                onChange={(e) => setGhiChuReceipt(e.target.value)}
                placeholder="Ghi chú"
                rows={3}
                className="w-full p-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => savePurchaseReceipt('Phiếu tạm')}
                className="flex-1 py-2.5 border border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                Lưu tạm
              </button>

              <button
                type="button"
                onClick={() => savePurchaseReceipt('Hoàn thành')}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-blue-500/20"
              >
                Hoàn thành
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 3. HISTORY MODE: PAST PURCHASES TABLE LOG */
        <div className="flex-1 p-3 sm:p-6 space-y-4 overflow-y-auto min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Lịch Sử Nhập Kho
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Danh sách tất cả các phiếu nhập hàng từ nhà cung cấp và kiểm đếm Serial/IMEI
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất CSV</span>
              </button>

              <button
                onClick={handleStartNewReceipt}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Lập Phiếu Nhập Mới</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo mã phiếu nhập, nhà cung cấp, nhân viên..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Mã Phiếu</th>
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4">Nhà Cung Cấp</th>
                    <th className="py-3 px-4 text-right">Tổng Tiền Hàng</th>
                    <th className="py-3 px-4 text-right">Đã Thanh Toán</th>
                    <th className="py-3 px-4 text-center">Phương Thức</th>
                    <th className="py-3 px-4">Nơi Chi</th>
                    <th className="py-3 px-4 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortByDateDescending(data.NhapHang, (pn) => pn.NgayNhap).map((pn, idx) => {
                    const ncc = data.NCC.find((c) => c.MaNCC === pn.MaNCC);
                    return (
                      <tr key={`${pn.MaNH}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">
                          {pn.MaNH}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                          {formatDateTime(pn.NgayNhap)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {ncc ? ncc.TenNhaCungCap : pn.MaNCC}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatVND(pn.TongTienHang)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          {formatVND(pn.DaThanhToan)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            {pn.HinhThucThanhToan || 'ChuyenKhoan'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {pn.ViChiTien}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              const details = data.ChiTietNhapHang.filter(
                                (d) => d.MaNH === pn.MaNH
                              );
                              setSelectedReceipt({ receipt: pn, details });
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Receipt Details in History Mode */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Chi Tiết Phiếu Nhập: {selectedReceipt.receipt.MaNH}
                </h3>
                <p className="text-xs text-slate-500">{formatDateTime(selectedReceipt.receipt.NgayNhap)}</p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nhà Cung Cấp:</span>
                <span className="font-bold">
                  {data.NCC.find((c) => c.MaNCC === selectedReceipt.receipt.MaNCC)?.TenNhaCungCap}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng Tiền Hàng:</span>
                <span className="font-bold text-blue-600">
                  {formatVND(selectedReceipt.receipt.TongTienHang)}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {selectedReceipt.details.map((d, idx) => {
                const sp = data.SanPham.find((p) => p.MaSP === d.MaSP);
                return (
                  <div
                    key={d.MaChiTietNH || d.MaNH + '-' + idx}
                    className="p-3 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1"
                  >
                    <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>{sp ? sp.TenSanPham : d.MaSP}</span>
                      <span>{formatVND(d.ThanhTien)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Số lượng: {d.SoLuong} | Đơn giá nhập: {formatVND(d.GiaNhap)}
                    </div>
                    {d.SoSerialNhap && (Array.isArray(d.SoSerialNhap) ? d.SoSerialNhap.length > 0 : Boolean(d.SoSerialNhap)) && (
                      <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                        Serials: {Array.isArray(d.SoSerialNhap) ? d.SoSerialNhap.join(', ') : String(d.SoSerialNhap)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Quick Create Product on the fly */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleQuickCreateProduct}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base border-b border-slate-100 dark:border-slate-800 pb-2">
              Thêm Nhanh Sản Phẩm Mới
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Tên Sản Phẩm *
                </label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Ví dụ: Camera wifi Ezviz H6C..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Giá Nhập Đơn Vị (VND)
                </label>
                <input
                  type="number"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20"
              >
                Lưu & Thêm Vào Phiếu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
