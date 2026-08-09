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

const STORAGE_KEY = 'POS_SERIAL_DATABASE_V1';

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
    const initialCopy: DatabaseSchema = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          const rawDonHang: DonHang[] = Array.isArray(parsed.DonHang) ? parsed.DonHang : initialCopy.DonHang;
          const rawNhapHang: NhapHang[] = Array.isArray(parsed.NhapHang) ? parsed.NhapHang : (Array.isArray(parsed.PhieuNhap) ? parsed.PhieuNhap : initialCopy.NhapHang);

          // Deduplicate MaDH
          const seenMaDH = new Set<string>();
          const sanitizedDonHang = rawDonHang.map((order, idx) => {
            if (!order.MaDH || seenMaDH.has(order.MaDH)) {
              const uniqueId = `${order.MaDH || 'DH' + Date.now()}-${idx + 1}`;
              seenMaDH.add(uniqueId);
              return { ...order, MaDH: uniqueId };
            }
            seenMaDH.add(order.MaDH);
            return order;
          });

          // Deduplicate MaNH
          const seenMaNH = new Set<string>();
          const sanitizedNhapHang = rawNhapHang.map((receipt, idx) => {
            if (!receipt.MaNH || seenMaNH.has(receipt.MaNH)) {
              const uniqueId = `${receipt.MaNH || 'NH' + Date.now()}-${idx + 1}`;
              seenMaNH.add(uniqueId);
              return { ...receipt, MaNH: uniqueId };
            }
            seenMaNH.add(receipt.MaNH);
            return receipt;
          });

          return {
            Setting: Array.isArray(parsed.Setting) ? parsed.Setting : initialCopy.Setting,
            ThuongHieu: Array.isArray(parsed.ThuongHieu) ? parsed.ThuongHieu : initialCopy.ThuongHieu,
            NhomHang: Array.isArray(parsed.NhomHang) ? parsed.NhomHang : initialCopy.NhomHang,
            SanPham: Array.isArray(parsed.SanPham) ? parsed.SanPham : initialCopy.SanPham,
            KhoSerial: Array.isArray(parsed.KhoSerial) ? parsed.KhoSerial : initialCopy.KhoSerial,
            StockCards: Array.isArray(parsed.StockCards) ? parsed.StockCards : initialCopy.StockCards,
            KhachHang: Array.isArray(parsed.KhachHang) ? parsed.KhachHang : initialCopy.KhachHang,
            NCC: Array.isArray(parsed.NCC) ? parsed.NCC : initialCopy.NCC,
            DonHang: sanitizedDonHang,
            ChiTietDonHang: Array.isArray(parsed.ChiTietDonHang) ? parsed.ChiTietDonHang : initialCopy.ChiTietDonHang,
            NhapHang: sanitizedNhapHang,
            ChiTietNhapHang: Array.isArray(parsed.ChiTietNhapHang) ? parsed.ChiTietNhapHang : initialCopy.ChiTietNhapHang,
            NguoiDung: Array.isArray(parsed.NguoiDung) ? parsed.NguoiDung : initialCopy.NguoiDung,
          };
        }
      }
    } catch (e) {
      console.error('Failed to load database from LocalStorage:', e);
    }
    return initialCopy;
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
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

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
          serialObj.Ngayban = order.NgayBan.substring(0, 10);
        }
      });

      // Compute stock after sale
      const currentInStockSerials = this.data.KhoSerial.filter(
        (s) => s.MaSP === det.MaSP && s.TrangThai === 'TrongKho'
      ).length;

      // Add Stock Card audit entry
      const newStockCard: StockCard = {
        MaTheKho: 'TK' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 10),
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
      customer.NgayMuaGanNhat = order.NgayBan.substring(0, 10);
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

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
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
            NgayNhap: receipt.NgayNhap.substring(0, 10),
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
        MaTheKho: 'TK' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 10),
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

  // --- 13. Import/Merge data from Google Sheets ---
  public mergeFromGoogleSheets(remoteData: Partial<DatabaseSchema>): void {
    if (!remoteData || typeof remoteData !== 'object') return;

    const keys: (keyof DatabaseSchema)[] = [
      'Setting',
      'ThuongHieu',
      'NhomHang',
      'SanPham',
      'KhoSerial',
      'StockCards',
      'KhachHang',
      'NCC',
      'DonHang',
      'ChiTietDonHang',
      'NhapHang',
      'ChiTietNhapHang',
      'NguoiDung',
    ];

    keys.forEach((key) => {
      const remoteItems = remoteData[key];
      if (Array.isArray(remoteItems) && remoteItems.length > 0) {
        // Replace local array with imported Google Sheets array
        (this.data[key] as any) = remoteItems;
      }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    setPreviousSnapshot(this.data);
    this.notifyListeners();
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'DB_MUTATED', timestamp: Date.now() });
    }
  }
}

export const db = new DatabaseService();
