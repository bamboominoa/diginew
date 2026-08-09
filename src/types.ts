/**
 * Data models for 13 core tables in the Sales & Serial Inventory System
 */

// 0. Setting (Connection & System Configuration)
export interface Setting {
  MaCauHinh: string; // PK e.g. WEBHOOK_URL, WEBAPP_DOMAIN, AUTO_SYNC, STORE_NAME, SECRET_TOKEN
  TenCauHinh: string; // Human readable name e.g. "Google Apps Script Webhook URL"
  GiaTri: string; // Config value e.g. "https://script.google.com/macros/s/.../exec"
  LoaiCauHinh: string; // Group/Category e.g. "GoogleSheets", "System", "Store", "Security"
  GhiChu?: string; // Description / Notes
  ThoiGianCapNhat?: string; // Timestamp of last update
}

// 1. ThuongHieu (Brands)
export interface ThuongHieu {
  MaThuongHieu: string; // PK
  TenThuongHieu: string; // Apple, Dell, Hikvision, Sony, Asus, Samsung, Dahua, Lenovo...
}

// 2. NhomHang (Product Groups)
export interface NhomHang {
  MaNhomHang: string; // PK
  TenNhomHang: string; // Laptop, Camera, Phụ kiện, Thiết bị Mạng...
}

// 3. SanPham (Product & SKU)
export interface SanPham {
  MaSP: string; // PK
  TenSanPham: string;
  MaNhomHang: string; // FK
  MaThuongHieu: string; // FK
  GiaNhapTrungBinh: number;
  GiaBanNiemYet: number;
  ThoiGianBaoHanhThang: number;
  QuanlySerial: boolean;
  LoaiSanPham?: 'HangHoa' | 'DichVu';
  TrangThaiKinhDoanh: 'DangKinhDoanh' | 'NgungKinhDoanh';
  UrlHinhAnh: string;
  NgayTao: string;
}

// 4. KhoSerial (Serial / IMEI Detail Items)
export type TrangThaiSerial = 'TrongKho' | 'DaBan' | 'BaoHanh' | 'LoiThanhLy';

export interface KhoSerial {
  SoSerial: string; // PK - Serial/IMEI
  MaSP: string; // FK
  MaPN: string; // FK (MaNH)
  NCC: string; // Ten or MaNCC
  GiaNhap: number;
  TrangThai: TrangThaiSerial;
  NgayNhap: string;
  MaDH?: string | null; // FK
  MaKH?: string | null; // FK
  Ngayban?: string | null;
}

// 5. StockCards (Thẻ kho - Inventory Audit Movement Log)
export type LoaiGiaoDichStockCard = 'NhapKho' | 'XuatBan' | 'TraHangNCC' | 'KiemKeLech';

export interface StockCard {
  MaTheKho: string; // PK
  NgayGio: string;
  MaSP: string; // FK
  LoaiGiaoDich: LoaiGiaoDichStockCard;
  MaChungTu: string; // MaNH or MaDH or MaKK
  SoLuongThayDoi: number; // + or -
  SoLuongTonSauGiaoDich: number;
  SoSerial: string | string[]; // Single or multiple serials
  NhanVienThucHien: string;
}

// 6. KhachHang (Customers & CRM)
export type NhomKhachHangType = 'KhachLe' | 'KhachVIP' | 'KhachThietKe' | 'DaiLy';

export interface KhachHang {
  MaKH: string; // PK
  TenKhachHang: string;
  SDT1: string;
  SDT2?: string;
  DiaChi: string;
  NhomKhachHang: NhomKhachHangType;
  Local: string; // Khu vực (e.g. TP.HCM, Hà Nội, Đà Nẵng...)
  TongNoHienTai: number;
  TongChiTieu: number;
  NgayMuaGanNhat?: string;
  NgayTao: string;
  GhiChu?: string;
  UrlHinhAnh?: string;
}

// 7. NCC (Suppliers)
export interface NCC {
  MaNCC: string; // PK
  TenNhaCungCap: string;
  SDT: string;
  DiaChi: string;
  TongNoNCC: number;
  TongNhapNCC: number;
  NgayTao: string;
}

// 8. DonHang (Sales Invoices)
export type HinhThucThanhToanType = 'TienMat' | 'ChuyenKhoan' | 'CongNo';

export interface DonHang {
  MaDH: string; // PK
  NgayBan: string;
  MaKH: string; // FK
  TongTienHang: number;
  GiamGia: number;
  KhachPhaiTra: number;
  KhachThanhToan: number;
  NoTruoc: number;
  TongNoSau: number;
  ViNhanTien: string; // TienMat Quầy, VCB, Techcombank, MB Bank...
  HinhThucThanhToan: HinhThucThanhToanType;
  NhanVienBanHang: string;
  GhiChu?: string;
}

// 9. ChiTietDonHang (Sales Invoice Details)
export interface ChiTietDonHang {
  MaChiTietDH: string; // PK
  MaDH: string; // FK
  MaSP: string; // FK
  SoLuong: number;
  SoSerial: string[]; // List of sold serial numbers
  GiaBan: number;
  ThanhTien: number;
}

// 10. NhapHang (Purchase Receipts)
export interface NhapHang {
  MaNH: string; // PK
  NgayNhap: string;
  MaNCC: string; // FK
  TongTienHang: number;
  GiamGiaNCC: number;
  TongPhaiTra: number;
  DaThanhToan: number;
  NoCuNCC: number;
  NoMoiNCC: number;
  ViChiTien: string;
  HinhThucThanhToan: HinhThucThanhToanType;
  NhanVienNhan: string;
  GhiChu?: string;
}

// 11. ChiTietNhapHang (Purchase Receipt Details)
export interface ChiTietNhapHang {
  MaChiTietNH: string; // PK
  MaNH: string; // FK
  MaSP: string; // FK
  SoLuong: number;
  GiaNhap: number;
  SoSerialNhap: string[]; // List of imported serial numbers
  ThanhTien: number;
}

// 12. NguoiDung (Users & Roles)
export type VaiTroType = 'Admin' | 'QuanLy' | 'BanHang' | 'Kho';

export interface NguoiDung {
  MaUID: string; // PK
  TenNguoiDung: string;
  MatKhau: string;
  VaiTro: VaiTroType;
  QuyenHan: string[];
  NgayTao: string;
}

// System State interface for full database backup / sync
export interface DatabaseSchema {
  Setting: Setting[];
  ThuongHieu: ThuongHieu[];
  NhomHang: NhomHang[];
  SanPham: SanPham[];
  KhoSerial: KhoSerial[];
  StockCards: StockCard[];
  KhachHang: KhachHang[];
  NCC: NCC[];
  DonHang: DonHang[];
  ChiTietDonHang: ChiTietDonHang[];
  NhapHang: NhapHang[];
  ChiTietNhapHang: ChiTietNhapHang[];
  NguoiDung: NguoiDung[];
}

export type ViewTab =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'serials'
  | 'purchases'
  | 'sales'
  | 'stockcards'
  | 'customers'
  | 'suppliers'
  | 'sheets_sync'
  | 'users';
