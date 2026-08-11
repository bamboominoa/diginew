import {
  DatabaseSchema,
  Setting,
  ThuongHieu,
  NhomHang,
  SanPham,
  KhoSerial,
  StockCard,
  KhachHang,
  NCC,
  DonHang,
  ChiTietDonHang,
  NhapHang,
  ChiTietNhapHang,
  NguoiDung,
  TrangThaiSerial,
} from '../types';
import { INITIAL_DATABASE } from '../data/initialData';
import { autoSyncToGoogleSheets, setPreviousSnapshot } from './googleSheets';
import { getFormattedNow, formatDateTime } from '../utils/dateUtils';
import { generateNextId } from '../utils/idUtils';

const STORAGE_KEY = 'POS_SERIAL_DATABASE_V2';

function migrateAndSanitizeDatabase(parsed: any, isInitialDefault = false): DatabaseSchema {
  const initialCopy: DatabaseSchema = JSON.parse(JSON.stringify(INITIAL_DATABASE));
  if (!parsed || typeof parsed !== 'object') return initialCopy;

  const rawSanPham: SanPham[] = Array.isArray(parsed.SanPham) ? parsed.SanPham : (isInitialDefault ? initialCopy.SanPham : []);
  const rawKhachHang: KhachHang[] = Array.isArray(parsed.KhachHang) ? parsed.KhachHang : (isInitialDefault ? initialCopy.KhachHang : []);
  const rawNCC: NCC[] = Array.isArray(parsed.NCC) ? parsed.NCC : (isInitialDefault ? initialCopy.NCC : []);
  const rawDonHang: DonHang[] = Array.isArray(parsed.DonHang) ? parsed.DonHang : (isInitialDefault ? initialCopy.DonHang : []);
  const rawNhapHang: NhapHang[] = Array.isArray(parsed.NhapHang) ? parsed.NhapHang : (Array.isArray(parsed.PhieuNhap) ? parsed.PhieuNhap : (isInitialDefault ? initialCopy.NhapHang : []));
  const rawStockCards: StockCard[] = Array.isArray(parsed.StockCards) ? parsed.StockCards : (isInitialDefault ? initialCopy.StockCards : []);
  const rawChiTietDH: ChiTietDonHang[] = Array.isArray(parsed.ChiTietDonHang) ? parsed.ChiTietDonHang : (isInitialDefault ? initialCopy.ChiTietDonHang : []);
  const rawChiTietNH: ChiTietNhapHang[] = Array.isArray(parsed.ChiTietNhapHang) ? parsed.ChiTietNhapHang : (isInitialDefault ? initialCopy.ChiTietNhapHang : []);
  const rawKhoSerial: KhoSerial[] = Array.isArray(parsed.KhoSerial) ? parsed.KhoSerial : (isInitialDefault ? initialCopy.KhoSerial : []);
  const rawNguoiDung: NguoiDung[] = Array.isArray(parsed.NguoiDung) ? parsed.NguoiDung : (isInitialDefault ? initialCopy.NguoiDung : []);

  // Build ID Mapping Maps if any ID is in old format
  const mapSP = new Map<string, string>();
  const mapKH = new Map<string, string>();
  const mapNCC = new Map<string, string>();
  const mapDH = new Map<string, string>();
  const mapNH = new Map<string, string>();

  // Sanitize SanPham
  const seenSP = new Set<string>();
  const sanPham: SanPham[] = [];
  rawSanPham.forEach((sp, idx) => {
    let newId = sp.MaSP;
    if (!newId || !/^SP\d{5}$/.test(newId) || seenSP.has(newId)) {
      let counter = idx + 1;
      newId = `SP${String(counter).padStart(5, '0')}`;
      while (seenSP.has(newId)) {
        counter++;
        newId = `SP${String(counter).padStart(5, '0')}`;
      }
    }
    seenSP.add(newId);
    if (sp.MaSP) mapSP.set(sp.MaSP, newId);
    sanPham.push({ ...sp, MaSP: newId });
  });

  // Sanitize KhachHang
  const seenKH = new Set<string>();
  const khachHang: KhachHang[] = [];
  rawKhachHang.forEach((kh, idx) => {
    let newId = kh.MaKH;
    if (!newId || !/^KH\d{5}$/.test(newId) || seenKH.has(newId)) {
      let counter = idx + 1;
      newId = `KH${String(counter).padStart(5, '0')}`;
      while (seenKH.has(newId)) {
        counter++;
        newId = `KH${String(counter).padStart(5, '0')}`;
      }
    }
    seenKH.add(newId);
    if (kh.MaKH) mapKH.set(kh.MaKH, newId);
    khachHang.push({ ...kh, MaKH: newId });
  });

  // Sanitize NCC
  const seenNCC = new Set<string>();
  const ncc: NCC[] = [];
  rawNCC.forEach((n, idx) => {
    let newId = n.MaNCC;
    if (!newId || !/^NCC\d{5}$/.test(newId) || seenNCC.has(newId)) {
      let counter = idx + 1;
      newId = `NCC${String(counter).padStart(5, '0')}`;
      while (seenNCC.has(newId)) {
        counter++;
        newId = `NCC${String(counter).padStart(5, '0')}`;
      }
    }
    seenNCC.add(newId);
    if (n.MaNCC) mapNCC.set(n.MaNCC, newId);
    ncc.push({ ...n, MaNCC: newId });
  });

  // Sanitize DonHang
  const seenDH = new Set<string>();
  const donHang: DonHang[] = [];
  rawDonHang.forEach((dh, idx) => {
    let newId = dh.MaDH;
    if (!newId || !/^DH\d{5}$/.test(newId) || seenDH.has(newId)) {
      let counter = idx + 1;
      newId = `DH${String(counter).padStart(5, '0')}`;
      while (seenDH.has(newId)) {
        counter++;
        newId = `DH${String(counter).padStart(5, '0')}`;
      }
    }
    seenDH.add(newId);
    if (dh.MaDH) mapDH.set(dh.MaDH, newId);
    const updatedMaKH = mapKH.get(dh.MaKH) || (dh.MaKH && /^KH\d{5}$/.test(dh.MaKH) ? dh.MaKH : 'KH00001');
    donHang.push({ ...dh, MaDH: newId, MaKH: updatedMaKH });
  });

  // Sanitize NhapHang
  const seenNH = new Set<string>();
  const nhapHang: NhapHang[] = [];
  rawNhapHang.forEach((nh, idx) => {
    let newId = nh.MaNH;
    if (!newId || !/^NH\d{5}$/.test(newId) || seenNH.has(newId)) {
      let counter = idx + 1;
      newId = `NH${String(counter).padStart(5, '0')}`;
      while (seenNH.has(newId)) {
        counter++;
        newId = `NH${String(counter).padStart(5, '0')}`;
      }
    }
    seenNH.add(newId);
    if (nh.MaNH) mapNH.set(nh.MaNH, newId);
    const updatedMaNCC = mapNCC.get(nh.MaNCC) || (nh.MaNCC && /^NCC\d{5}$/.test(nh.MaNCC) ? nh.MaNCC : 'NCC00001');
    nhapHang.push({ ...nh, MaNH: newId, MaNCC: updatedMaNCC });
  });

  // Sanitize ChiTietDonHang
  const seenCTDH = new Set<string>();
  const chiTietDonHang: ChiTietDonHang[] = [];
  rawChiTietDH.forEach((ct, idx) => {
    const updatedMaDH = mapDH.get(ct.MaDH) || ct.MaDH;
    const updatedMaSP = mapSP.get(ct.MaSP) || ct.MaSP;
    let newMaCT = ct.MaChiTietDH;
    if (!newMaCT || !/^CTDH\d{5}$/.test(newMaCT) || seenCTDH.has(newMaCT)) {
      let counter = idx + 1;
      newMaCT = `CTDH${String(counter).padStart(5, '0')}`;
      while (seenCTDH.has(newMaCT)) {
        counter++;
        newMaCT = `CTDH${String(counter).padStart(5, '0')}`;
      }
    }
    seenCTDH.add(newMaCT);
    chiTietDonHang.push({ ...ct, MaChiTietDH: newMaCT, MaDH: updatedMaDH, MaSP: updatedMaSP });
  });

  // Sanitize ChiTietNhapHang
  const seenCTNH = new Set<string>();
  const chiTietNhapHang: ChiTietNhapHang[] = [];
  rawChiTietNH.forEach((ct, idx) => {
    const updatedMaNH = mapNH.get(ct.MaNH) || ct.MaNH;
    const updatedMaSP = mapSP.get(ct.MaSP) || ct.MaSP;
    let newMaCT = ct.MaChiTietNH;
    if (!newMaCT || !/^CTNH\d{5}$/.test(newMaCT) || seenCTNH.has(newMaCT)) {
      let counter = idx + 1;
      newMaCT = `CTNH${String(counter).padStart(5, '0')}`;
      while (seenCTNH.has(newMaCT)) {
        counter++;
        newMaCT = `CTNH${String(counter).padStart(5, '0')}`;
      }
    }
    seenCTNH.add(newMaCT);
    chiTietNhapHang.push({ ...ct, MaChiTietNH: newMaCT, MaNH: updatedMaNH, MaSP: updatedMaSP });
  });

  // Sanitize StockCards
  const seenTK = new Set<string>();
  const stockCards: StockCard[] = [];
  rawStockCards.forEach((sc: any, idx) => {
    const updatedMaSP = mapSP.get(sc.MaSP) || sc.MaSP;
    let updatedMaChungTu = sc.MaChungTu;
    if (mapDH.has(sc.MaChungTu)) updatedMaChungTu = mapDH.get(sc.MaChungTu)!;
    if (mapNH.has(sc.MaChungTu)) updatedMaChungTu = mapNH.get(sc.MaChungTu)!;

    let newMaTK = sc.MaTheKho;
    if (!newMaTK || !/^TK\d{5}$/.test(newMaTK) || seenTK.has(newMaTK)) {
      let counter = idx + 1;
      newMaTK = `TK${String(counter).padStart(5, '0')}`;
      while (seenTK.has(newMaTK)) {
        counter++;
        newMaTK = `TK${String(counter).padStart(5, '0')}`;
      }
    }
    seenTK.add(newMaTK);

    const loai = sc.LoaiGiaoDich || sc.LoaiPhieu || 'XuatBan';
    const changeQty = Number(sc.SoLuongThayDoi ?? sc.SoLuong ?? 0);
    const tonQty = Number(sc.SoLuongTonSauGiaoDich ?? sc.TonSauGiaoDich ?? 0);
    const nv = sc.NhanVienThucHien || sc.NguoiThucHien || '';

    stockCards.push({
      ...sc,
      MaTheKho: newMaTK,
      MaSP: updatedMaSP,
      MaChungTu: updatedMaChungTu,
      LoaiGiaoDich: loai,
      LoaiPhieu: loai,
      SoLuongThayDoi: changeQty,
      SoLuong: changeQty,
      SoLuongTonSauGiaoDich: tonQty,
      TonSauGiaoDich: tonQty,
      NhanVienThucHien: nv,
      NguoiThucHien: nv,
    });
  });

  // Sanitize KhoSerial
  const khoSerial: KhoSerial[] = rawKhoSerial.map((s) => {
    const updatedMaSP = mapSP.get(s.MaSP) || s.MaSP;
    const updatedMaPN = mapNH.get(s.MaPN) || s.MaPN;
    const updatedMaDH = s.MaDH ? (mapDH.get(s.MaDH) || s.MaDH) : undefined;
    const updatedMaKH = s.MaKH ? (mapKH.get(s.MaKH) || s.MaKH) : undefined;

    return {
      ...s,
      MaSP: updatedMaSP,
      MaPN: updatedMaPN,
      MaDH: updatedMaDH,
      MaKH: updatedMaKH,
    };
  });

  // Sanitize NguoiDung
  const seenUIDs = new Set<string>();
  const nguoiDung: NguoiDung[] = [];
  rawNguoiDung.forEach((u, idx) => {
    let newId = u.MaUID;
    if (!newId || !/^UID\d{5}$/.test(newId) || seenUIDs.has(newId)) {
      let counter = idx + 1;
      newId = `UID${String(counter).padStart(5, '0')}`;
      while (seenUIDs.has(newId)) {
        counter++;
        newId = `UID${String(counter).padStart(5, '0')}`;
      }
    }
    seenUIDs.add(newId);
    nguoiDung.push({ ...u, MaUID: newId });
  });

  return {
    Setting: Array.isArray(parsed.Setting) ? parsed.Setting : (isInitialDefault ? initialCopy.Setting : []),
    ThuongHieu: Array.isArray(parsed.ThuongHieu) ? parsed.ThuongHieu : (isInitialDefault ? initialCopy.ThuongHieu : []),
    NhomHang: Array.isArray(parsed.NhomHang) ? parsed.NhomHang : (isInitialDefault ? initialCopy.NhomHang : []),
    SanPham: sanPham,
    KhoSerial: khoSerial,
    StockCards: stockCards,
    KhachHang: khachHang,
    NCC: ncc,
    DonHang: donHang,
    ChiTietDonHang: chiTietDonHang,
    NhapHang: nhapHang,
    ChiTietNhapHang: chiTietNhapHang,
    NguoiDung: nguoiDung,
  };
}

class DatabaseService {
  private data: DatabaseSchema;
  private listeners: (() => void)[] = [];
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.data = this.loadFromStorage();
    setPreviousSnapshot(this.data);
    this.setupCrossTabSync();
  }

  private setupCrossTabSync(): void {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.broadcastChannel = new BroadcastChannel('POS_SERIAL_CROSS_DEVICE_SYNC');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data && event.data.type === 'DB_MUTATED') {
              console.log('⚡ [CrossTabSync] Nhận sự kiện cập nhật dữ liệu từ thiết bị/màn hình khác!');
              this.data = this.loadFromStorage();
              setPreviousSnapshot(this.data);
              this.notifyListeners();
              window.dispatchEvent(
                new CustomEvent('db-remote-updated', {
                  detail: { timestamp: new Date().toLocaleTimeString('vi-VN') },
                })
              );
            }
          };
        }

        window.addEventListener('storage', (e) => {
          if (e.key === STORAGE_KEY) {
            console.log('⚡ [StorageSync] Dữ liệu vừa thay đổi trên tab khác!');
            this.data = this.loadFromStorage();
            setPreviousSnapshot(this.data);
            this.notifyListeners();
            window.dispatchEvent(
              new CustomEvent('db-remote-updated', {
                detail: { timestamp: new Date().toLocaleTimeString('vi-VN') },
              })
            );
          }
        });
      } catch (err) {
        console.warn('Cross-tab sync channel warning:', err);
      }
    }
  }

  private loadFromStorage(): DatabaseSchema {
    try {
      let stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const oldV1 = localStorage.getItem('POS_SERIAL_DATABASE_V1');
        if (oldV1) stored = oldV1;
      }

      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          const sanitized = migrateAndSanitizeDatabase(parsed);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
          return sanitized;
        }
      }
    } catch (e) {
      console.error('Failed to load database from LocalStorage:', e);
    }
    const initial = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  public resetToDefaultDatabase(): DatabaseSchema {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    this.saveToStorage();
    return this.data;
  }

  public saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.notifyListeners();
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'DB_MUTATED', timestamp: Date.now() });
      }
      autoSyncToGoogleSheets(this.data);
    } catch (e) {
      console.error('Failed to save database to LocalStorage:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  public resetToSampleData(): void {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    this.saveToStorage();
  }

  public getFullDatabase(): DatabaseSchema {
    return this.data;
  }

  public setFullDatabase(newData: DatabaseSchema): void {
    this.data = newData;
    this.saveToStorage();
  }

  // --- 0. Setting ---
  public getSetting(): Setting[] {
    return this.data.Setting || [];
  }
  public addSetting(item: Setting): void {
    if (!this.data.Setting) this.data.Setting = [];
    this.data.Setting.push(item);
    this.saveToStorage();
  }
  public updateSetting(item: Setting): void {
    if (!this.data.Setting) this.data.Setting = [];
    const idx = this.data.Setting.findIndex((x) => x.MaCauHinh === item.MaCauHinh);
    if (idx !== -1) {
      this.data.Setting[idx] = item;
    } else {
      this.data.Setting.push(item);
    }
    this.saveToStorage();
  }
  public deleteSetting(ma: string): void {
    if (!this.data.Setting) return;
    this.data.Setting = this.data.Setting.filter((x) => x.MaCauHinh !== ma);
    this.saveToStorage();
  }

  // --- 1. ThuongHieu ---
  public getThuongHieu(): ThuongHieu[] {
    return this.data.ThuongHieu;
  }
  public addThuongHieu(item: ThuongHieu): void {
    this.data.ThuongHieu.push(item);
    this.saveToStorage();
  }
  public updateThuongHieu(item: ThuongHieu): void {
    const idx = this.data.ThuongHieu.findIndex((x) => x.MaThuongHieu === item.MaThuongHieu);
    if (idx !== -1) {
      this.data.ThuongHieu[idx] = item;
      this.saveToStorage();
    }
  }
  public deleteThuongHieu(ma: string): void {
    this.data.ThuongHieu = this.data.ThuongHieu.filter((x) => x.MaThuongHieu !== ma);
    this.saveToStorage();
  }

  // --- 2. NhomHang ---
  public getNhomHang(): NhomHang[] {
    return this.data.NhomHang;
  }
  public addNhomHang(item: NhomHang): void {
    this.data.NhomHang.push(item);
    this.saveToStorage();
  }
  public updateNhomHang(item: NhomHang): void {
    const idx = this.data.NhomHang.findIndex((x) => x.MaNhomHang === item.MaNhomHang);
    if (idx !== -1) {
      this.data.NhomHang[idx] = item;
      this.saveToStorage();
    }
  }
  public deleteNhomHang(ma: string): void {
    this.data.NhomHang = this.data.NhomHang.filter((x) => x.MaNhomHang !== ma);
    this.saveToStorage();
  }

  // --- 3. SanPham ---
  public getSanPham(): SanPham[] {
    return this.data.SanPham;
  }
  public addSanPham(item: SanPham): void {
    this.data.SanPham.push(item);
    this.saveToStorage();
  }
  public updateSanPham(item: SanPham): void {
    const idx = this.data.SanPham.findIndex((x) => x.MaSP === item.MaSP);
    if (idx !== -1) {
      this.data.SanPham[idx] = item;
      this.saveToStorage();
    }
  }
  public deleteSanPham(ma: string): void {
    this.data.SanPham = this.data.SanPham.filter((x) => x.MaSP !== ma);
    this.saveToStorage();
  }

  // --- 4. KhoSerial ---
  public getKhoSerial(): KhoSerial[] {
    return this.data.KhoSerial;
  }
  public getAvailableSerialsForProduct(maSP: string): KhoSerial[] {
    return this.data.KhoSerial.filter((s) => s.MaSP === maSP && s.TrangThai === 'TrongKho');
  }
  public updateSerialStatus(soSerial: string, status: TrangThaiSerial, note?: string): void {
    const serial = this.data.KhoSerial.find((s) => s.SoSerial === soSerial);
    if (serial) {
      serial.TrangThai = status;
      this.saveToStorage();
    }
  }

  // --- 5. StockCards ---
  public getStockCards(): StockCard[] {
    return this.data.StockCards;
  }

  // --- 6. KhachHang ---
  public getKhachHang(): KhachHang[] {
    return this.data.KhachHang;
  }
  public addKhachHang(item: KhachHang): void {
    this.data.KhachHang.push(item);
    this.saveToStorage();
  }
  public updateKhachHang(item: KhachHang): void {
    const idx = this.data.KhachHang.findIndex((x) => x.MaKH === item.MaKH);
    if (idx !== -1) {
      this.data.KhachHang[idx] = item;
      this.saveToStorage();
    }
  }
  public recordCustomerDebtPayment(maKH: string, amountPaid: number): void {
    const customer = this.data.KhachHang.find((c) => c.MaKH === maKH);
    if (customer) {
      customer.TongNoHienTai = Math.max(0, customer.TongNoHienTai - amountPaid);
      this.saveToStorage();
    }
  }

  // --- 7. NCC ---
  public getNCC(): NCC[] {
    return this.data.NCC;
  }
  public addNCC(item: NCC): void {
    this.data.NCC.push(item);
    this.saveToStorage();
  }
  public updateNCC(item: NCC): void {
    const idx = this.data.NCC.findIndex((x) => x.MaNCC === item.MaNCC);
    if (idx !== -1) {
      this.data.NCC[idx] = item;
      this.saveToStorage();
    }
  }
  public recordSupplierDebtPayment(maNCC: string, amountPaid: number): void {
    const supplier = this.data.NCC.find((s) => s.MaNCC === maNCC);
    if (supplier) {
      supplier.TongNoNCC = Math.max(0, supplier.TongNoNCC - amountPaid);
      this.saveToStorage();
    }
  }

  // --- 8 & 9. DonHang & ChiTietDonHang (POS Sale Transaction) ---
  public getDonHang(): DonHang[] {
    return this.data.DonHang;
  }
  public getChiTietDonHang(maDH?: string): ChiTietDonHang[] {
    if (maDH) {
      return this.data.ChiTietDonHang.filter((c) => c.MaDH === maDH);
    }
    return this.data.ChiTietDonHang;
  }

  public createSalesOrder(order: DonHang, details: ChiTietDonHang[]): void {
    // 1. Add order
    this.data.DonHang.unshift(order);

    // 2. Add order details
    this.data.ChiTietDonHang.push(...details);

    // 3. Process Serial changes & stock cards
    const now = getFormattedNow();

    details.forEach((det) => {
      const sp = this.data.SanPham.find((p) => p.MaSP === det.MaSP);
      const serialList = det.SoSerial || [];

      // Update Serial items in KhoSerial if product manages serial
      serialList.forEach((sNum) => {
        const serialObj = this.data.KhoSerial.find((s) => s.SoSerial === sNum);
        if (serialObj) {
          serialObj.TrangThai = 'DaBan';
          serialObj.MaDH = order.MaDH;
          serialObj.MaKH = order.MaKH;
          serialObj.Ngayban = order.NgayBan;
        }
      });

      // Compute stock after sale
      const currentInStockSerials = this.data.KhoSerial.filter(
        (s) => s.MaSP === det.MaSP && s.TrangThai === 'TrongKho'
      ).length;

      // Add Stock Card audit entry
      const newStockCard: StockCard = {
        MaTheKho: generateNextId('TK', this.data.StockCards, 'MaTheKho', 5),
        NgayGio: now,
        MaSP: det.MaSP,
        LoaiGiaoDich: 'XuatBan',
        MaChungTu: order.MaDH,
        SoLuongThayDoi: -det.SoLuong,
        SoLuongTonSauGiaoDich: currentInStockSerials,
        SoSerial: serialList.length > 0 ? serialList : ['Kông quản lý serial'],
        NhanVienThucHien: order.NhanVienBanHang,
      };
      this.data.StockCards.unshift(newStockCard);
    });

    // 4. Update Customer stats & Debt
    const customer = this.data.KhachHang.find((c) => c.MaKH === order.MaKH);
    if (customer) {
      customer.TongChiTieu += order.KhachPhaiTra;
      customer.TongNoHienTai += Math.max(0, order.KhachPhaiTra - order.KhachThanhToan);
      customer.NgayMuaGanNhat = order.NgayBan;
    }

    this.saveToStorage();
  }

  // --- 10 & 11. NhapHang & ChiTietNhapHang (Purchase Order Transaction) ---
  public getNhapHang(): NhapHang[] {
    return this.data.NhapHang;
  }
  public getChiTietNhapHang(maNH?: string): ChiTietNhapHang[] {
    if (maNH) {
      return this.data.ChiTietNhapHang.filter((c) => c.MaNH === maNH);
    }
    return this.data.ChiTietNhapHang;
  }

  public createPurchaseReceipt(receipt: NhapHang, details: ChiTietNhapHang[]): void {
    // 1. Add receipt
    this.data.NhapHang.unshift(receipt);

    // 2. Add receipt details
    this.data.ChiTietNhapHang.push(...details);

    const now = getFormattedNow();
    const supplier = this.data.NCC.find((s) => s.MaNCC === receipt.MaNCC);
    const nccName = supplier ? supplier.TenNhaCungCap : 'NCC';

    // 3. Process new Serial items & stock cards
    details.forEach((det) => {
      const serialList = det.SoSerialNhap || [];

      serialList.forEach((sNum) => {
        if (sNum && sNum.trim().length > 0) {
          // Add to KhoSerial
          const newSerial: KhoSerial = {
            SoSerial: sNum.trim(),
            MaSP: det.MaSP,
            MaPN: receipt.MaNH,
            NCC: nccName,
            GiaNhap: det.GiaNhap,
            TrangThai: 'TrongKho',
            NgayNhap: receipt.NgayNhap,
            MaDH: null,
            MaKH: null,
            Ngayban: null,
          };
          // Replace or push
          const existingIdx = this.data.KhoSerial.findIndex((x) => x.SoSerial === sNum.trim());
          if (existingIdx !== -1) {
            this.data.KhoSerial[existingIdx] = newSerial;
          } else {
            this.data.KhoSerial.push(newSerial);
          }
        }
      });

      // Calculate stock after purchase
      const currentInStockSerials = this.data.KhoSerial.filter(
        (s) => s.MaSP === det.MaSP && s.TrangThai === 'TrongKho'
      ).length;

      const newStockCard: StockCard = {
        MaTheKho: generateNextId('TK', this.data.StockCards, 'MaTheKho', 5),
        NgayGio: now,
        MaSP: det.MaSP,
        LoaiGiaoDich: 'NhapKho',
        MaChungTu: receipt.MaNH,
        SoLuongThayDoi: det.SoLuong,
        SoLuongTonSauGiaoDich: currentInStockSerials,
        SoSerial: serialList.length > 0 ? serialList : ['Không quản lý serial'],
        NhanVienThucHien: receipt.NhanVienNhan,
      };
      this.data.StockCards.unshift(newStockCard);
    });

    // 4. Update Supplier Stats & Debt
    if (supplier) {
      supplier.TongNhapNCC += receipt.TongPhaiTra;
      supplier.TongNoNCC += Math.max(0, receipt.TongPhaiTra - receipt.DaThanhToan);
    }

    this.saveToStorage();
  }

  // --- 12. NguoiDung ---
  public getNguoiDung(): NguoiDung[] {
    return this.data.NguoiDung;
  }
  public addNguoiDung(item: NguoiDung): void {
    this.data.NguoiDung.push(item);
    this.saveToStorage();
  }
  public updateNguoiDung(item: NguoiDung): void {
    const idx = this.data.NguoiDung.findIndex((x) => x.MaUID === item.MaUID);
    if (idx !== -1) {
      this.data.NguoiDung[idx] = item;
      this.saveToStorage();
    }
  }
  public deleteNguoiDung(maUID: string): void {
    this.data.NguoiDung = this.data.NguoiDung.filter((x) => x.MaUID !== maUID);
    this.saveToStorage();
  }

  // --- 13. Import/Merge data from Google Sheets (Incremental Upsert or Full Replace) ---
  public replaceFromGoogleSheets(remoteData: Partial<DatabaseSchema>): void {
    if (!remoteData || typeof remoteData !== 'object') return;
    const sanitized = migrateAndSanitizeDatabase(remoteData);
    this.data = sanitized;
    this.saveToStorage();
    setPreviousSnapshot(this.data);
    this.notifyListeners();
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'DB_MUTATED', timestamp: Date.now() });
    }
  }

  public mergeFromGoogleSheets(remoteData: Partial<DatabaseSchema>): { newCount: number; updatedCount: number } {
    let totalNew = 0;
    let totalUpdated = 0;

    if (!remoteData || typeof remoteData !== 'object') {
      return { newCount: 0, updatedCount: 0 };
    }

    const sanitizedRemote = migrateAndSanitizeDatabase(remoteData);

    const pkMap: Record<keyof DatabaseSchema, string> = {
      Setting: 'MaCauHinh',
      ThuongHieu: 'MaThuongHieu',
      NhomHang: 'MaNhomHang',
      SanPham: 'MaSP',
      KhoSerial: 'SoSerial',
      StockCards: 'MaTheKho',
      KhachHang: 'MaKH',
      NCC: 'MaNCC',
      DonHang: 'MaDH',
      ChiTietDonHang: 'MaChiTietDH',
      NhapHang: 'MaNH',
      ChiTietNhapHang: 'MaChiTietNH',
      NguoiDung: 'MaUID',
    };

    const normalizeArrayField = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed.map(String);
          } catch {}
        }
        if (trimmed.includes(';')) return trimmed.split(';').map((s) => s.trim()).filter(Boolean);
        if (trimmed.includes(',')) return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
        return [trimmed];
      }
      return [String(val)];
    };

    const keys = Object.keys(pkMap) as (keyof DatabaseSchema)[];

    keys.forEach((key) => {
      const remoteItems = sanitizedRemote[key];
      if (!Array.isArray(remoteItems) || remoteItems.length === 0) return;

      const pkField = pkMap[key];
      const localArray = (this.data[key] || []) as any[];

      remoteItems.forEach((rItem: any) => {
        if (!rItem) return;

        // Clean & normalize fields
        if (key === 'KhoSerial' && rItem.SoSerial !== undefined && rItem.SoSerial !== null) {
          rItem.SoSerial = String(rItem.SoSerial);
        } else if (key === 'StockCards' && rItem.SoSerial) {
          rItem.SoSerial = normalizeArrayField(rItem.SoSerial);
        } else if (key === 'ChiTietDonHang' && rItem.SoSerial) {
          rItem.SoSerial = normalizeArrayField(rItem.SoSerial);
        } else if (key === 'ChiTietNhapHang' && rItem.SoSerialNhap) {
          rItem.SoSerialNhap = normalizeArrayField(rItem.SoSerialNhap);
        } else if (key === 'Setting') {
          rItem.GiaTri = String(rItem.GiaTri ?? '');
        }

        // Numeric conversions if remote item values came as strings
        if (rItem.GiaBan !== undefined && typeof rItem.GiaBan === 'string') rItem.GiaBan = Number(rItem.GiaBan) || 0;
        if (rItem.GiaNhap !== undefined && typeof rItem.GiaNhap === 'string') rItem.GiaNhap = Number(rItem.GiaNhap) || 0;
        if (rItem.SoLuong !== undefined && typeof rItem.SoLuong === 'string') rItem.SoLuong = Number(rItem.SoLuong) || 0;
        if (rItem.ThanhTien !== undefined && typeof rItem.ThanhTien === 'string') rItem.ThanhTien = Number(rItem.ThanhTien) || 0;
        if (rItem.TongTienHang !== undefined && typeof rItem.TongTienHang === 'string') rItem.TongTienHang = Number(rItem.TongTienHang) || 0;
        if (rItem.KhachPhaiTra !== undefined && typeof rItem.KhachPhaiTra === 'string') rItem.KhachPhaiTra = Number(rItem.KhachPhaiTra) || 0;
        if (rItem.KhachThanhToan !== undefined && typeof rItem.KhachThanhToan === 'string') rItem.KhachThanhToan = Number(rItem.KhachThanhToan) || 0;

        // Key identification
        let itemPk = rItem[pkField];
        if (itemPk === undefined && key === 'NguoiDung') {
          itemPk = rItem.MaNguoiDung || rItem.MaUID;
          rItem.MaUID = itemPk;
        }

        if (itemPk === undefined || itemPk === null || itemPk === '') return; // invalid row without PK

        const strPk = String(itemPk).trim();
        const existingIdx = localArray.findIndex((lItem) => {
          const lPk = lItem[pkField] ?? (key === 'NguoiDung' ? lItem.MaUID : undefined);
          return lPk !== undefined && lPk !== null && String(lPk).trim() === strPk;
        });

        if (existingIdx >= 0) {
          // Merge existing row with remote row updates
          const oldJson = JSON.stringify(localArray[existingIdx]);
          localArray[existingIdx] = { ...localArray[existingIdx], ...rItem };
          const newJson = JSON.stringify(localArray[existingIdx]);
          if (oldJson !== newJson) {
            totalUpdated++;
          }
        } else {
          // New row added in Google Sheets!
          localArray.push(rItem);
          totalNew++;
        }
      });
    });

    if (totalNew > 0 || totalUpdated > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      setPreviousSnapshot(this.data);
      this.notifyListeners();
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'DB_MUTATED', timestamp: Date.now() });
      }
    }

    return { newCount: totalNew, updatedCount: totalUpdated };
  }
}

export const db = new DatabaseService();
