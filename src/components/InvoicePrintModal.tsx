import React from 'react';
import { DonHang, ChiTietDonHang, KhachHang } from '../types';
import { Printer, Download, CheckCircle2 } from 'lucide-react';
import { formatDateTime } from '../utils/dateUtils';

interface InvoicePrintModalProps {
  order: DonHang;
  details: ChiTietDonHang[];
  customer?: KhachHang;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  order,
  details,
  customer,
  onClose,
}) => {
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Hóa Đơn Bán Hàng Xuất Kho</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
            ✕
          </button>
        </div>

        {/* PRINTABLE RECEIPT CONTAINER */}
        <div id="printable-receipt" className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 font-sans">
          {/* Receipt Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              CỬA HÀNG THIẾT BỊ CÔNG NGHỆ PRO
            </h2>
            <p className="text-xs text-slate-500">ĐC: 123 Đường Ba Tháng Hai, Quận 10, TP.HCM</p>
            <p className="text-xs text-slate-500">Hotline: 0909.123.456 • Website: store.vn</p>
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 pt-2">
              HÓA ĐƠN BÁN HÀNG
            </h3>
            <p className="text-[11px] font-mono text-slate-400">Mã đơn: #{order.MaDH}</p>
          </div>

          {/* Customer & Order Metadata */}
          <div className="text-xs space-y-1 text-slate-600 border-b border-slate-100 pb-3">
            <div className="flex justify-between">
              <span>Khách hàng:</span>
              <strong className="text-slate-800">{customer?.TenKhachHang || order.MaKH}</strong>
            </div>

            <div className="flex justify-between">
              <span>SĐT khách:</span>
              <span>{customer?.SDT1 || '—'}</span>
            </div>

            <div className="flex justify-between">
              <span>Thời gian xuất:</span>
              <span>{formatDateTime(order.NgayBan)}</span>
            </div>

            <div className="flex justify-between">
              <span>NV bán hàng:</span>
              <span>{order.NhanVienBanHang}</span>
            </div>
          </div>

          {/* Table of items */}
          <div className="space-y-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                  <th className="py-1">Sản phẩm</th>
                  <th className="py-1 text-center">SL</th>
                  <th className="py-1 text-right">Đơn giá</th>
                  <th className="py-1 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {details.map((d, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-1">
                      <span className="font-semibold block text-slate-800">{d.MaSP}</span>
                      {d.SoSerial && (Array.isArray(d.SoSerial) ? d.SoSerial.length > 0 : Boolean(d.SoSerial)) && (
                        <span className="text-[9px] font-mono text-emerald-600 block">
                          S/N: {Array.isArray(d.SoSerial) ? d.SoSerial.join(', ') : String(d.SoSerial)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-center font-bold">{d.SoLuong}</td>
                    <td className="py-2 text-right">{formatVND(d.GiaBan)}</td>
                    <td className="py-2 text-right font-bold text-slate-800">
                      {formatVND(d.ThanhTien)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Calculations */}
          <div className="border-t border-dashed border-slate-300 pt-3 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Tổng tiền hàng:</span>
              <span>{formatVND(order.TongTienHang)}</span>
            </div>

            {order.GiamGia > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Chiết khấu giảm giá:</span>
                <span className="text-rose-600">-{formatVND(order.GiamGia)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-sm text-indigo-600 pt-1 border-t border-slate-100">
              <span>Khách phải trả:</span>
              <span>{formatVND(order.KhachPhaiTra)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Khách đã thanh toán:</span>
              <span className="font-bold text-emerald-600">
                {formatVND(order.KhachThanhToan)}
              </span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Hình thức:</span>
              <span>{order.HinhThucThanhToan} ({order.ViNhanTien})</span>
            </div>

            <div className="flex justify-between font-bold text-amber-600 bg-amber-50 p-2 rounded-lg mt-2">
              <span>Dư nợ khách sau đơn:</span>
              <span>{formatVND(order.TongNoSau)}</span>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            Cảm ơn quý khách đã mua hàng! Hàng mua được bảo hành theo đúng tiêu chuẩn Serial/IMEI.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
          >
            Đóng
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>In Hóa Đơn Khách</span>
          </button>
        </div>
      </div>
    </div>
  );
};
