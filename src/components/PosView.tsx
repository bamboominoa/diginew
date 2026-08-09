import React, { useState, useEffect, useRef } from 'react';
import {
  DatabaseSchema,
  SanPham,
  KhoSerial,
  KhachHang,
  DonHang,
  ChiTietDonHang,
  HinhThucThanhToanType,
} from '../types';
import { db } from '../services/db';
import {
  Search,
  ShoppingCart,
  QrCode,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Building,
  Printer,
  Sparkles,
  RotateCw,
  AlertTriangle,
  X,
  Pencil,
  Flag,
  Check,
  ChevronDown,
} from 'lucide-react';

interface CartItem {
  sanPham: SanPham;
  soLuong: number;
  selectedSerials: string[];
  giaBan: number;
  giamGia: number;
  vatRate: number;
  enableVat: boolean;
  dvt: string;
  ghiChu: string;
}

interface PosViewProps {
  data: DatabaseSchema;
  activeUserName: string;
  onSaleComplete: (newOrder: DonHang, details: ChiTietDonHang[]) => void;
}

export const PosView: React.FC<PosViewProps> = ({ data, activeUserName, onSaleComplete }) => {
  // Top Search & Fast Product Picker state
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart & Sales Order Items state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [inlineSerialInputs, setInlineSerialInputs] = useState<{ [cartIndex: number]: string }>({});
  const [modalCustomSerial, setModalCustomSerial] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    data.KhachHang[0]?.MaKH || ''
  );
  const [discount, setDiscount] = useState<number>(0);
  const [customerPaid, setCustomerPaid] = useState<number>(0);
  const [paymentAccount, setPaymentAccount] = useState<string>('TienMat Quầy');
  const [paymentType, setPaymentType] = useState<HinhThucThanhToanType>('TienMat');
  const [orderNotes, setOrderNotes] = useState('');

  // Customer dropdown search & selection state
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Serial Selection Modal state
  const [serialModalProduct, setSerialModalProduct] = useState<{
    sanPham: SanPham;
    cartIndex: number;
  } | null>(null);

  // Inline New Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Inline Edit Customer Modal
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [editCustName, setEditCustName] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [editCustDebt, setEditCustDebt] = useState<number>(0);

  // POS Cart Draft Storage & Restore state
  const [draftRestoredTime, setDraftRestoredTime] = useState<string | null>(null);
  const isDraftInitialized = useRef(false);

  // On mount: Automatically restore existing draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pos_cart_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.cart) && parsed.cart.length > 0) {
          const restoredCart: CartItem[] = parsed.cart
            .map((dItem: any) => {
              const sp =
                data.SanPham.find(
                  (p) =>
                    p.MaSP &&
                    dItem.maSP &&
                    p.MaSP.toString().trim().toLowerCase() === dItem.maSP.toString().trim().toLowerCase()
                ) || dItem.sanPham;

              if (!sp || !sp.MaSP) return null;

              return {
                sanPham: sp,
                soLuong: Number(dItem.soLuong) || 1,
                selectedSerials: Array.isArray(dItem.selectedSerials) ? dItem.selectedSerials : [],
                giaBan: typeof dItem.giaBan === 'number' ? dItem.giaBan : sp.GiaBanNiemYet || 0,
                giamGia: Number(dItem.giamGia) || 0,
                vatRate: Number(dItem.vatRate) || 0,
                enableVat: !!dItem.enableVat,
                dvt: dItem.dvt || sp.DonViTinh || 'cái',
                ghiChu: dItem.ghiChu || '',
              };
            })
            .filter(Boolean) as CartItem[];

          if (restoredCart.length > 0) {
            setCart(restoredCart);
            if (parsed.selectedCustomerId !== undefined) setSelectedCustomerId(parsed.selectedCustomerId);
            if (typeof parsed.discount === 'number') setDiscount(parsed.discount);
            if (typeof parsed.customerPaid === 'number') setCustomerPaid(parsed.customerPaid);
            if (parsed.paymentAccount !== undefined) setPaymentAccount(parsed.paymentAccount);
            if (parsed.paymentType !== undefined) setPaymentType(parsed.paymentType);
            if (parsed.orderNotes !== undefined) setOrderNotes(parsed.orderNotes);

            const dateObj = parsed.savedAt ? new Date(parsed.savedAt) : new Date();
            const timeStr =
              dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
              ' ' +
              dateObj.toLocaleDateString('vi-VN');
            setDraftRestoredTime(timeStr);
          }
        }
      }
    } catch (err) {
      console.error('Lỗi khi đọc bản lưu tạm đơn hàng POS:', err);
    } finally {
      isDraftInitialized.current = true;
    }
  }, []);

  // Handler: Làm mới đơn / Xóa bản lưu tạm
  const handleResetDraft = () => {
    localStorage.removeItem('pos_cart_draft');
    setCart([]);
    setSelectedCustomerId(data.KhachHang[0]?.MaKH || '');
    setDiscount(0);
    setCustomerPaid(0);
    setPaymentAccount('TienMat Quầy');
    setPaymentType('TienMat');
    setOrderNotes('');
    setInlineSerialInputs({});
    setDraftRestoredTime(null);
  };

  // Auto-save cart changes to localStorage whenever cart/order details update
  useEffect(() => {
    // DO NOT save or remove draft until initial mount check finishes!
    if (!isDraftInitialized.current) {
      return;
    }

    if (cart.length > 0) {
      const draftPayload = {
        cart: cart.map((item) => ({
          maSP: item.sanPham.MaSP,
          sanPham: item.sanPham,
          soLuong: item.soLuong,
          selectedSerials: item.selectedSerials,
          giaBan: item.giaBan,
          giamGia: item.giamGia,
          vatRate: item.vatRate,
          enableVat: item.enableVat,
          dvt: item.dvt,
          ghiChu: item.ghiChu,
        })),
        selectedCustomerId,
        discount,
        customerPaid,
        paymentAccount,
        paymentType,
        orderNotes,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('pos_cart_draft', JSON.stringify(draftPayload));
    } else {
      localStorage.removeItem('pos_cart_draft');
    }
  }, [
    cart,
    selectedCustomerId,
    discount,
    customerPaid,
    paymentAccount,
    paymentType,
    orderNotes,
  ]);

  // Filter products for fast search dropdown & quick add
  const filteredProducts = data.SanPham.filter((p) => {
    if (p.TrangThaiKinhDoanh !== 'DangKinhDoanh') return false;
    if (selectedCategory !== 'all' && p.MaNhomHang !== selectedCategory) return false;

    if (!productSearchTerm.trim()) return true;
    const query = productSearchTerm.toLowerCase();
    const matchName = (p.TenSanPham || '').toLowerCase().includes(query);
    const matchCode = (p.MaSP || '').toLowerCase().includes(query);

    const matchSerial = (data.KhoSerial || []).some(
      (s) => s.MaSP === p.MaSP && s.TrangThai === 'TrongKho' && String(s.SoSerial || '').toLowerCase().includes(query)
    );

    return matchName || matchCode || matchSerial;
  });

  // Filter customers for dropdown search
  const filteredCustomersForSelect = data.KhachHang.filter((kh) => {
    if (!customerSearchQuery.trim()) return true;
    const q = customerSearchQuery.toLowerCase();
    return (
      String(kh.TenKhachHang || '').toLowerCase().includes(q) ||
      String(kh.SDT1 || '').includes(q) ||
      String(kh.MaKH || '').toLowerCase().includes(q) ||
      (kh.DiaChi && String(kh.DiaChi).toLowerCase().includes(q))
    );
  });

  // Selected Customer details & recent orders
  const selectedCustomer = data.KhachHang.find((c) => c.MaKH === selectedCustomerId);
  const recentCustomerOrders = selectedCustomer
    ? data.DonHang
        .filter((o) => o.MaKH === selectedCustomer.MaKH)
        .sort((a, b) => new Date(b.NgayBan).getTime() - new Date(a.NgayBan).getTime())
        .slice(0, 3)
    : [];

  // Handle adding product to cart
  const handleAddToCart = (product: SanPham) => {
    const existingIndex = cart.findIndex((item) => item.sanPham.MaSP === product.MaSP);

    // Get available serials for this product
    const availableSerials = data.KhoSerial.filter(
      (s) => s.MaSP === product.MaSP && s.TrangThai === 'TrongKho'
    );

    if (existingIndex !== -1) {
      const updatedCart = [...cart];
      const item = updatedCart[existingIndex];

      let newSerials = [...item.selectedSerials];
      if (product.QuanlySerial) {
        const remainingSerials = availableSerials.filter((s) => !newSerials.includes(s.SoSerial));
        if (remainingSerials.length > 0) {
          newSerials.push(remainingSerials[0].SoSerial);
        }
      }

      const finalQty = product.QuanlySerial ? newSerials.length : item.soLuong + 1;

      updatedCart[existingIndex] = {
        ...item,
        soLuong: finalQty,
        selectedSerials: newSerials,
      };
      setCart(updatedCart);
    } else {
      // New item
      let initialSerials: string[] = [];
      if (product.QuanlySerial && availableSerials.length > 0) {
        initialSerials.push(availableSerials[0].SoSerial);
      }

      const initialQty = product.QuanlySerial ? initialSerials.length : 1;

      setCart([
        ...cart,
        {
          sanPham: product,
          soLuong: initialQty,
          selectedSerials: initialSerials,
          giaBan: product.GiaBanNiemYet,
          giamGia: 0,
          vatRate: (product as any).VAT || 0,
          enableVat: ((product as any).VAT || 0) > 0,
          dvt: (product as any).DonViTinh || 'cái',
          ghiChu: '',
        },
      ]);
    }
  };

  const handleAddSerialToCartItem = (cartIndex: number, serialCode: string) => {
    const cleanSerial = serialCode.trim();
    if (!cleanSerial) return;

    const item = cart[cartIndex];
    if (item.selectedSerials.includes(cleanSerial)) {
      return; // Already added
    }

    const newSerials = [...item.selectedSerials, cleanSerial];
    const updatedCart = [...cart];
    updatedCart[cartIndex] = {
      ...item,
      selectedSerials: newSerials,
      soLuong: item.sanPham.QuanlySerial ? newSerials.length : Math.max(item.soLuong, newSerials.length),
    };
    setCart(updatedCart);
  };

  const handleRemoveSerialFromCartItem = (cartIndex: number, serialCode: string) => {
    const item = cart[cartIndex];
    const newSerials = item.selectedSerials.filter((s) => s !== serialCode);
    const updatedCart = [...cart];
    updatedCart[cartIndex] = {
      ...item,
      selectedSerials: newSerials,
      soLuong: item.sanPham.QuanlySerial ? newSerials.length : item.soLuong,
    };
    setCart(updatedCart);
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    const item = cart[index];
    if (newQty <= 0 && !item.sanPham.QuanlySerial) {
      setCart(cart.filter((_, i) => i !== index));
      return;
    }

    const availableSerials = data.KhoSerial.filter(
      (s) => s.MaSP === item.sanPham.MaSP && s.TrangThai === 'TrongKho'
    );

    let updatedSerials = [...item.selectedSerials];
    if (item.sanPham.QuanlySerial) {
      if (newQty < item.selectedSerials.length) {
        updatedSerials = updatedSerials.slice(0, newQty);
      } else if (newQty > item.selectedSerials.length) {
        const remaining = availableSerials.filter((s) => !updatedSerials.includes(s.SoSerial));
        while (updatedSerials.length < newQty && remaining.length > 0) {
          updatedSerials.push(remaining.shift()!.SoSerial);
        }
      }
      const updatedCart = [...cart];
      updatedCart[index] = {
        ...item,
        soLuong: updatedSerials.length,
        selectedSerials: updatedSerials,
      };
      setCart(updatedCart);
    } else {
      const updatedCart = [...cart];
      updatedCart[index] = {
        ...item,
        soLuong: newQty,
      };
      setCart(updatedCart);
    }
  };

  const handleUpdateGiaBan = (index: number, newPrice: number) => {
    const updatedCart = [...cart];
    updatedCart[index].giaBan = Math.max(0, newPrice);
    setCart(updatedCart);
  };

  const handleUpdateGiamGia = (index: number, newDiscount: number) => {
    const updatedCart = [...cart];
    updatedCart[index].giamGia = Math.max(0, newDiscount);
    setCart(updatedCart);
  };

  const handleUpdateDvt = (index: number, newDvt: string) => {
    const updatedCart = [...cart];
    updatedCart[index].dvt = newDvt;
    setCart(updatedCart);
  };

  const handleUpdateNote = (index: number, note: string) => {
    const updatedCart = [...cart];
    updatedCart[index].ghiChu = note;
    setCart(updatedCart);
  };

  const handleToggleVat = (index: number) => {
    const updatedCart = [...cart];
    updatedCart[index].enableVat = !updatedCart[index].enableVat;
    setCart(updatedCart);
  };

  const handleUpdateVatRate = (index: number, rate: number) => {
    const updatedCart = [...cart];
    updatedCart[index].vatRate = Math.max(0, rate);
    setCart(updatedCart);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Compute Cart Summary
  const rawSubtotal = cart.reduce((sum, item) => {
    const lineNet = Math.max(0, item.giaBan * item.soLuong - item.giamGia);
    return sum + lineNet;
  }, 0);

  const totalVat = cart.reduce((sum, item) => {
    if (!item.enableVat) return sum;
    const lineNet = Math.max(0, item.giaBan * item.soLuong - item.giamGia);
    return sum + lineNet * ((item.vatRate || 0) / 100);
  }, 0);

  const subtotal = rawSubtotal + totalVat;
  const totalPayable = Math.max(0, subtotal - discount);

  const customerOldDebt = selectedCustomer ? selectedCustomer.TongNoHienTai : 0;
  const newDebtAfterSale = customerOldDebt + Math.max(0, totalPayable - customerPaid);

  // Add new customer inline
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newId = 'KH' + (data.KhachHang.length + 1).toString().padStart(3, '0');
    const newCust: KhachHang = {
      MaKH: newId,
      TenKhachHang: newCustName.trim(),
      SDT1: newCustPhone.trim() || '0900000000',
      DiaChi: newCustAddress.trim() || 'Chưa cập nhật',
      NhomKhachHang: 'KhachLe',
      Local: 'TP. Hồ Chí Minh',
      TongNoHienTai: 0,
      TongChiTieu: 0,
      NgayTao: new Date().toISOString().substring(0, 10),
    };

    db.addKhachHang(newCust);
    setSelectedCustomerId(newId);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
  };

  // Update existing customer info inline
  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const updatedCust: KhachHang = {
      ...selectedCustomer,
      TenKhachHang: editCustName.trim(),
      SDT1: editCustPhone.trim(),
      DiaChi: editCustAddress.trim(),
      TongNoHienTai: editCustDebt >= 0 ? editCustDebt : selectedCustomer.TongNoHienTai,
    };

    db.updateKhachHang(updatedCust);
    setShowEditCustomerModal(false);
  };

  // Execute Sale Order
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm vào giỏ hàng!');
      return;
    }

    // Verify serial numbers for serial items
    for (const item of cart) {
      if (item.sanPham.QuanlySerial) {
        if (item.selectedSerials.length !== item.soLuong) {
          alert(
            `Sản phẩm "${item.sanPham.TenSanPham}" cần chọn đủ ${item.soLuong} số Serial/IMEI trước khi xuất bán!`
          );
          setSerialModalProduct({
            sanPham: item.sanPham,
            cartIndex: cart.indexOf(item),
          });
          return;
        }
      }
    }

    const orderId =
      'DH' +
      new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14) +
      '-' +
      Math.floor(100 + Math.random() * 900);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newOrder: DonHang = {
      MaDH: orderId,
      NgayBan: nowStr,
      MaKH: selectedCustomerId || 'KH003',
      TongTienHang: subtotal,
      GiamGia: discount,
      KhachPhaiTra: totalPayable,
      KhachThanhToan: customerPaid,
      NoTruoc: customerOldDebt,
      TongNoSau: newDebtAfterSale,
      ViNhanTien: paymentAccount,
      HinhThucThanhToan: paymentType,
      NhanVienBanHang: activeUserName,
      GhiChu: orderNotes,
    };

    const details: ChiTietDonHang[] = cart.map((item, idx) => {
      const lineNet = Math.max(0, item.giaBan * item.soLuong - item.giamGia);
      const lineVat = item.enableVat ? lineNet * ((item.vatRate || 0) / 100) : 0;
      return {
        MaChiTietDH: 'CT' + orderId.slice(-8) + idx,
        MaDH: orderId,
        MaSP: item.sanPham.MaSP,
        SoLuong: item.soLuong,
        SoSerial: item.selectedSerials,
        GiaBan: item.giaBan,
        ThanhTien: lineNet + lineVat,
        GhiChu: item.ghiChu,
      };
    });

    db.createSalesOrder(newOrder, details);

    // Callback to parent to show print modal
    onSaleComplete(newOrder, details);

    // Reset cart and draft
    localStorage.removeItem('pos_cart_draft');
    setCart([]);
    setDiscount(0);
    setCustomerPaid(0);
    setOrderNotes('');
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* CENTER / MAIN: POS Sales Order Workstation (Order Item Table) */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden min-w-0">

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
          
          {/* Top Search Header matching user screenshot */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-2 shrink-0 bg-white dark:bg-slate-900">
            {/* Label + Enter badge + Reset button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  TÌM SẢN PHẨM
                </span>
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded text-[10px] font-mono font-medium">
                  Enter
                </span>
                <span className="text-[11px] text-slate-400">để thêm nhanh</span>
                {draftRestoredTime && (
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-medium flex items-center gap-1">
                    <RotateCw className="w-3 h-3 animate-spin-slow" />
                    Đã khôi phục đơn lưu tạm ({draftRestoredTime})
                  </span>
                )}
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetDraft}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1.5 transition-colors bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/60 px-2.5 py-1 rounded-lg cursor-pointer"
                  title="Xóa toàn bộ giỏ hàng và làm mới đơn mới"
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
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value);
                    setIsSearchDropdownOpen(true);
                  }}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredProducts.length > 0) {
                      handleAddToCart(filteredProducts[0]);
                      setProductSearchTerm('');
                      setIsSearchDropdownOpen(false);
                    }
                  }}
                  placeholder="Nhập tên, mã SKU hoặc barcode..."
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-2xs"
                />
                {productSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearchTerm('');
                      setIsSearchDropdownOpen(false);
                    }}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Autocomplete Product Search Results Dropdown */}
              {isSearchDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsSearchDropdownOpen(false)}
                  />
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Không tìm thấy sản phẩm nào khớp "{productSearchTerm}"
                      </div>
                    ) : (
                      filteredProducts.map((p) => {
                        const inStockSerialsCount = data.KhoSerial.filter(
                          (s) => s.MaSP === p.MaSP && s.TrangThai === 'TrongKho'
                        ).length;

                        return (
                          <div
                            key={p.MaSP}
                            onClick={() => {
                              handleAddToCart(p);
                              setProductSearchTerm('');
                              setIsSearchDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-blue-50/60 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden flex items-center justify-center border border-slate-200/60 dark:border-slate-700">
                                {p.UrlHinhAnh ? (
                                  <img
                                    src={p.UrlHinhAnh}
                                    alt={p.TenSanPham}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <ShoppingCart className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                  {p.TenSanPham}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                  <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 rounded">
                                    {p.MaSP}
                                  </span>
                                  <span>ĐVT: {p.DonViTinh || 'cái'}</span>
                                  {p.QuanlySerial && (
                                    <span className="text-emerald-600 font-sans font-semibold">
                                      • Kho Serial: {inStockSerialsCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {formatVND(p.GiaBanNiemYet)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Table Container for POS Order Items */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800">
                <tr className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">SẢN PHẨM</th>
                  <th className="py-2.5 px-3 w-24 text-center">ĐVT</th>
                  <th className="py-2.5 px-3 w-32 text-center">SỐ LƯỢNG</th>
                  <th className="py-2.5 px-3 w-28 text-right">ĐƠN GIÁ</th>
                  <th className="py-2.5 px-3 w-28 text-right">GIẢM GIÁ</th>
                  <th className="py-2.5 px-3 w-32 text-right">THÀNH TIỀN</th>
                  <th className="py-2.5 px-3 w-24 text-center">VAT %</th>
                  <th className="py-2.5 px-3 w-24 text-center">BẢO HÀNH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <ShoppingCart className="w-10 h-10 stroke-1 text-slate-300" />
                        <p className="font-semibold text-slate-500 dark:text-slate-400">
                          Chưa có sản phẩm nào trong đơn bán
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Sử dụng ô tìm kiếm phía trên để thêm sản phẩm nhanh vào đơn
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, idx) => {
                    const lineNet = Math.max(0, item.giaBan * item.soLuong - item.giamGia);
                    const lineVat = item.enableVat ? lineNet * ((item.vatRate || 0) / 100) : 0;
                    const lineTotal = lineNet + lineVat;

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* # & Remove */}
                        <td className="py-3 px-3 text-center align-top pt-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-slate-400 font-medium group-hover:hidden">
                              {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(idx)}
                              title="Xóa sản phẩm"
                              className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors hidden group-hover:block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Product Title, SKU, Note, Serial Badge */}
                        <td className="py-3 px-3 align-top space-y-1.5">
                          <div className="font-bold text-slate-800 dark:text-slate-100 leading-snug">
                            {item.sanPham.TenSanPham}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800">
                              {item.sanPham.MaSP}
                            </span>

                            {item.sanPham.QuanlySerial && (
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <QrCode className="w-3 h-3" />
                                Quản lý Serial ({item.selectedSerials.length} serial)
                              </span>
                            )}
                          </div>

                          {/* Serial/IMEI Picker Bar matching user image */}
                          {item.sanPham.QuanlySerial && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1 bg-slate-50/80 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                              {/* Selected Serial Badges (Blue Pill with X button) */}
                              {item.selectedSerials.map((sCode) => (
                                <span
                                  key={sCode}
                                  className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-md font-mono font-semibold shadow-2xs shrink-0"
                                >
                                  <span>{sCode}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSerialFromCartItem(idx, sCode)}
                                    className="hover:bg-blue-700 rounded p-0.5 transition-colors focus:outline-none"
                                    title="Xóa Serial"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              ))}

                              {/* Direct text input for Serial/Imei */}
                              <input
                                type="text"
                                placeholder="Nhập Serial/Imei"
                                value={inlineSerialInputs[idx] || ''}
                                onChange={(e) =>
                                  setInlineSerialInputs({ ...inlineSerialInputs, [idx]: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && inlineSerialInputs[idx]?.trim()) {
                                    e.preventDefault();
                                    handleAddSerialToCartItem(idx, inlineSerialInputs[idx].trim());
                                    setInlineSerialInputs({ ...inlineSerialInputs, [idx]: '' });
                                  }
                                }}
                                className="text-xs px-2 py-1 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 rounded border border-transparent focus:border-slate-300 dark:focus:border-slate-600 transition-all min-w-[130px] flex-1"
                              />

                              {/* Blue "Chọn IMEI" Link */}
                              <button
                                type="button"
                                onClick={() => setSerialModalProduct({ sanPham: item.sanPham, cartIndex: idx })}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 shrink-0 px-1 py-0.5"
                              >
                                Chọn IMEI
                              </button>
                            </div>
                          )}

                          {/* Product Note Line Input */}
                          <input
                            type="text"
                            value={item.ghiChu || ''}
                            onChange={(e) => handleUpdateNote(idx, e.target.value)}
                            placeholder="Ghi chú sản phẩm..."
                            className="w-full max-w-[240px] border border-dashed border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:border-blue-400 bg-transparent"
                          />
                        </td>

                        {/* ĐVT Dropdown */}
                        <td className="py-3 px-3 align-top pt-3 text-center">
                          <select
                            value={item.dvt}
                            onChange={(e) => handleUpdateDvt(idx, e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value={item.sanPham.DonViTinh || 'cái'}>
                              {item.sanPham.DonViTinh || 'cái'}
                            </option>
                            <option value="Lọ">Lọ</option>
                            <option value="tấm">tấm</option>
                            <option value="cái">cái</option>
                            <option value="bộ">bộ</option>
                            <option value="hộp">hộp</option>
                            <option value="mét">mét</option>
                            <option value="kg">kg</option>
                          </select>
                        </td>

                        {/* SỐ LƯỢNG (- qty +) */}
                        <td className="py-3 px-3 align-top pt-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(idx, item.soLuong - 1)}
                                className="w-6 h-7 rounded bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold flex items-center justify-center transition-colors"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                readOnly={item.sanPham.QuanlySerial}
                                value={item.soLuong}
                                onChange={(e) =>
                                  handleUpdateQuantity(idx, Math.max(0, Number(e.target.value)))
                                }
                                className={`w-12 text-center border rounded-lg py-1 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                                  item.sanPham.QuanlySerial
                                    ? 'bg-blue-50 dark:bg-slate-800 border-blue-300 dark:border-slate-600 text-blue-700 dark:text-blue-400 cursor-not-allowed'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(idx, item.soLuong + 1)}
                                className="w-6 h-7 rounded bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold flex items-center justify-center transition-colors"
                              >
                                +
                              </button>
                            </div>

                            {item.sanPham.QuanlySerial && (
                              <span className="text-[9px] text-slate-400 font-medium">
                                = {item.selectedSerials.length} serial
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ĐƠN GIÁ */}
                        <td className="py-3 px-3 align-top pt-3 text-right">
                          <input
                            type="number"
                            value={item.giaBan}
                            onChange={(e) => handleUpdateGiaBan(idx, Number(e.target.value))}
                            className="w-24 text-right border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </td>

                        {/* GIẢM GIÁ */}
                        <td className="py-3 px-3 align-top pt-3 text-right">
                          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden w-24 bg-white dark:bg-slate-800 ml-auto">
                            <input
                              type="number"
                              value={item.giamGia}
                              onChange={(e) => handleUpdateGiamGia(idx, Number(e.target.value))}
                              className="w-full px-2 py-1 text-xs text-right font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
                            />
                            <span className="bg-slate-100 dark:bg-slate-700 px-1 text-[10px] text-slate-500 dark:text-slate-400 font-bold border-l border-slate-200 dark:border-slate-600 shrink-0">
                              đ
                            </span>
                          </div>
                        </td>

                        {/* THÀNH TIỀN */}
                        <td className="py-3 px-3 align-top pt-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatVND(lineTotal)}
                        </td>

                        {/* VAT % */}
                        <td className="py-3 px-3 align-top pt-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="checkbox"
                              checked={item.enableVat}
                              onChange={() => handleToggleVat(idx)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            <input
                              type="number"
                              disabled={!item.enableVat}
                              value={item.vatRate}
                              onChange={(e) => handleUpdateVatRate(idx, Number(e.target.value))}
                              className="w-10 text-center border border-slate-200 dark:border-slate-700 rounded py-0.5 text-xs font-semibold disabled:opacity-40 bg-white dark:bg-slate-800"
                            />
                            <span className="text-[10px] text-slate-400">%</span>
                          </div>
                        </td>

                        {/* BẢO HÀNH */}
                        <td className="py-3 px-3 align-top pt-3.5 text-center text-slate-500 dark:text-slate-400">
                          {item.sanPham.ThoiGianBaoHanh
                            ? `${item.sanPham.ThoiGianBaoHanh} tháng`
                            : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT: Customer Info & Checkout Receipt */}
      <div className="w-full lg:w-[420px] bg-white dark:bg-slate-900 flex flex-col h-full border-l border-slate-200 dark:border-slate-800 shadow-xl shrink-0">
        {/* Customer Header Section */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 space-y-2.5">
          {/* Title: Thông Tin Đơn Hàng */}
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Thông Tin Đơn Hàng</h3>

          {/* Subheader: Khách Hàng, Refresh, + Thêm mới */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Khách Hàng</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomerSearchQuery('');
                  setIsCustomerDropdownOpen(false);
                }}
                title="Làm mới danh sách"
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm mới</span>
              </button>
            </div>
          </div>

          {/* Search Box & Dropdown */}
          <div className="relative">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={customerSearchQuery}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  setIsCustomerDropdownOpen(true);
                }}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                placeholder="Tìm kiếm khách hàng (tên, SĐT, email, mã)..."
                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-2xs"
              />
              {customerSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerSearchQuery('');
                    setIsCustomerDropdownOpen(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown list of customers */}
            {isCustomerDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsCustomerDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredCustomersForSelect.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Không tìm thấy khách hàng nào khớp "{customerSearchQuery}"
                    </div>
                  ) : (
                    filteredCustomersForSelect.map((kh) => (
                      <div
                        key={kh.MaKH}
                        onClick={() => {
                          setSelectedCustomerId(kh.MaKH);
                          setIsCustomerDropdownOpen(false);
                          setCustomerSearchQuery('');
                        }}
                        className={`p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                          selectedCustomerId === kh.MaKH ? 'bg-blue-50/60 dark:bg-blue-950/40 font-medium' : ''
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {kh.TenKhachHang}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {kh.SDT1} • {kh.MaKH}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {kh.TongNoHienTai > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px] bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/50">
                              Nợ: {formatVND(kh.TongNoHienTai)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">0 đ</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Selected Customer Card Badge */}
          {selectedCustomer && (
            <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {selectedCustomer.TenKhachHang}
                </span>
                {selectedCustomer.TongNoHienTai > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/60 shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                    <span>
                      Nợ: <span className="underline decoration-amber-400 font-bold">{formatVND(selectedCustomer.TongNoHienTai)}</span>
                    </span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditCustName(selectedCustomer.TenKhachHang);
                    setEditCustPhone(selectedCustomer.SDT1);
                    setEditCustAddress(selectedCustomer.DiaChi);
                    setEditCustDebt(selectedCustomer.TongNoHienTai);
                    setShowEditCustomerModal(true);
                  }}
                  title="Sửa thông tin khách hàng"
                  className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId('')}
                  title="Bỏ chọn"
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Recent Purchase History Box */}
          {selectedCustomer && (
            <div className="bg-[#FFFBEB] dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Flag className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400 fill-amber-800 dark:fill-amber-400" />
                <span>Lịch sử mua gần đây ({recentCustomerOrders.length} đơn)</span>
              </div>

              {recentCustomerOrders.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Khách hàng chưa có lịch sử mua hàng</p>
              ) : (
                <div className="space-y-1.5 pt-0.5">
                  {recentCustomerOrders.map((ord, idx) => {
                    const debtRemaining = ord.KhachPhaiTra - ord.KhachThanhToan;
                    const isDebt = debtRemaining > 0;
                    let displayDate = '';
                    if (ord.NgayBan) {
                      const datePart = ord.NgayBan.split(' ')[0];
                      const parts = datePart.split('-');
                      if (parts.length === 3) {
                        const day = parseInt(parts[2], 10);
                        const month = parseInt(parts[1], 10);
                        const year = parts[0];
                        displayDate = `${day}/${month}/${year}`;
                      } else {
                        displayDate = ord.NgayBan;
                      }
                    }

                    return (
                      <div key={`${ord.MaDH}-${idx}`} className="flex items-center justify-between text-xs py-0.5">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] w-20 shrink-0">
                          {displayDate}
                        </span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono flex-1 text-left">
                          {ord.MaDH}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right mr-3">
                          {formatVND(ord.KhachPhaiTra)}
                        </span>
                        <div className="w-24 text-right shrink-0">
                          {isDebt ? (
                            <span className="text-rose-500 dark:text-rose-400 font-medium text-[11px]">
                              nợ {formatVND(debtRemaining)}
                            </span>
                          ) : (
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 inline-block font-bold" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Total Calculations & Payment Config */}
        <div className="flex-1 p-3.5 space-y-3 text-xs overflow-y-auto">
          <div className="space-y-2">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Tổng tiền hàng ({cart.length} món):</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatVND(rawSubtotal)}
              </span>
            </div>

            {totalVat > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Thuế VAT:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  +{formatVND(totalVat)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600 dark:text-slate-400">Chiết khấu / Giảm giá chung:</span>
              <input
                type="number"
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-28 text-right px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-between text-sm font-bold text-blue-600 dark:text-blue-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Khách Phải Trả:</span>
              <span>{formatVND(totalPayable)}</span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-slate-600 dark:text-slate-400">Khách Đưa / Trả:</span>
              <input
                type="number"
                value={customerPaid || ''}
                onChange={(e) => setCustomerPaid(Number(e.target.value) || 0)}
                placeholder={totalPayable.toString()}
                className="w-32 text-right px-2 py-1 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-emerald-600 dark:text-emerald-400 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Quick full pay button */}
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={() => setCustomerPaid(totalPayable)}
                className="text-[10px] text-blue-600 hover:underline font-semibold"
              >
                [Thu đủ {formatVND(totalPayable)}]
              </button>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Hình thức thanh toán:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPaymentType('TienMat');
                  setPaymentAccount('TienMat Quầy');
                }}
                className={`p-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
                  paymentType === 'TienMat'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Tiền Mặt</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentType('ChuyenKhoan');
                  setPaymentAccount('Techcombank');
                }}
                className={`p-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
                  paymentType === 'ChuyenKhoan'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Chuyển Khoản</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentType('CongNo');
                  setCustomerPaid(0);
                }}
                className={`p-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
                  paymentType === 'CongNo'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Ghi Công Nợ</span>
              </button>
            </div>
          </div>

          {/* Bank account picker if transfer */}
          {paymentType === 'ChuyenKhoan' && (
            <select
              value={paymentAccount}
              onChange={(e) => setPaymentAccount(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              <option value="Techcombank">Techcombank - 1903881230912</option>
              <option value="VCB">Vietcombank - 007100129381</option>
              <option value="MB Bank">MB Bank - 883019283012</option>
            </select>
          )}

          {/* Order Notes */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Ghi chú đơn hàng:
            </span>
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Nhập ghi chú cho đơn bán này..."
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="pt-1">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold flex justify-between">
              <span>Nợ cũ + Nợ mới:</span>
              <span>{formatVND(newDebtAfterSale)}</span>
            </div>
          </div>
        </div>

        {/* Submit Checkout Button */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Thanh Toán & In Hóa Đơn ({formatVND(totalPayable)})</span>
          </button>
        </div>
      </div>

      {/* MODAL: Select Specific Serial/IMEI */}
      {serialModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Chọn Serial / IMEI Xuất Bán
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1">
                  {serialModalProduct.sanPham.TenSanPham}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSerialModalProduct(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Currently selected serial tags in modal */}
            {cart[serialModalProduct.cartIndex]?.selectedSerials.length > 0 && (
              <div className="space-y-1 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Serial/IMEI đã chọn (Số lượng: {cart[serialModalProduct.cartIndex].selectedSerials.length}):
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {cart[serialModalProduct.cartIndex].selectedSerials.map((sCode) => (
                    <span
                      key={sCode}
                      className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-md font-mono font-medium shadow-xs"
                    >
                      <span>{sCode}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveSerialFromCartItem(serialModalProduct.cartIndex, sCode)
                        }
                        className="hover:bg-blue-700 rounded p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick manual entry inside modal */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập Serial/IMEI thủ công..."
                value={modalCustomSerial}
                onChange={(e) => setModalCustomSerial(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && modalCustomSerial.trim()) {
                    e.preventDefault();
                    handleAddSerialToCartItem(
                      serialModalProduct.cartIndex,
                      modalCustomSerial.trim()
                    );
                    setModalCustomSerial('');
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => {
                  if (modalCustomSerial.trim()) {
                    handleAddSerialToCartItem(
                      serialModalProduct.cartIndex,
                      modalCustomSerial.trim()
                    );
                    setModalCustomSerial('');
                  }
                }}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Thêm
              </button>
            </div>

            {/* List of Available Serials for this product */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Danh Sách Serial Trong Kho ({data.KhoSerial.filter((s) => s.MaSP === serialModalProduct.sanPham.MaSP && s.TrangThai === 'TrongKho').length}):
              </span>

              {data.KhoSerial.filter(
                (s) => s.MaSP === serialModalProduct.sanPham.MaSP && s.TrangThai === 'TrongKho'
              ).length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-center font-medium">
                  Không có sẵn Serial sẵn có trong kho. Bạn có thể nhập Serial/IMEI thủ công ở ô phía trên.
                </p>
              ) : (
                data.KhoSerial.filter(
                  (s) => s.MaSP === serialModalProduct.sanPham.MaSP && s.TrangThai === 'TrongKho'
                ).map((sItem) => {
                  const isSelected = cart[
                    serialModalProduct.cartIndex
                  ]?.selectedSerials.includes(sItem.SoSerial);

                  return (
                    <div
                      key={sItem.SoSerial}
                      onClick={() => {
                        const currentCartItem = cart[serialModalProduct.cartIndex];
                        let updated = [...currentCartItem.selectedSerials];
                        if (isSelected) {
                          updated = updated.filter((x) => x !== sItem.SoSerial);
                        } else {
                          updated.push(sItem.SoSerial);
                        }

                        const updatedCart = [...cart];
                        updatedCart[serialModalProduct.cartIndex] = {
                          ...currentCartItem,
                          selectedSerials: updated,
                          soLuong: updated.length, // Sync quantity directly with selected serial count!
                        };
                        setCart(updatedCart);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer text-xs font-mono transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <div>
                        <span>{sItem.SoSerial}</span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          Nhập ngày: {sItem.NgayNhap} • NCC: {sItem.NCC}
                        </span>
                      </div>

                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setSerialModalProduct(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Hoàn Tất ({cart[serialModalProduct.cartIndex]?.selectedSerials.length || 0} serials selected)
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Inline Add New Customer */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCustomer}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
              Thêm Khách Hàng Mới
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên khách hàng *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Minh"
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="0901234567"
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="123 Nguyễn Văn Cừ, Q.5"
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
              >
                Lưu Khách Hàng
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Inline Edit Customer */}
      {showEditCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateCustomer}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Sửa Thông Tin Khách Hàng
              </h3>
              <button
                type="button"
                onClick={() => setShowEditCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Mã khách hàng
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedCustomer.MaKH}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Tên khách hàng *
                </label>
                <input
                  type="text"
                  required
                  value={editCustName}
                  onChange={(e) => setEditCustName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={editCustPhone}
                  onChange={(e) => setEditCustPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={editCustAddress}
                  onChange={(e) => setEditCustAddress(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Tổng nợ hiện tại (đ)
                </label>
                <input
                  type="number"
                  value={editCustDebt}
                  onChange={(e) => setEditCustDebt(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-slate-100 font-bold text-amber-600"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditCustomerModal(false)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
              >
                Cập Nhật Khách Hàng
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

