import React, { useState } from 'react';
import { DatabaseSchema } from '../types';
import { Sparkles, Send, Bot, User, X, RefreshCw } from 'lucide-react';

interface AiAssistantModalProps {
  data: DatabaseSchema;
  onClose: () => void;
  onNavigateToSerial?: (query: string) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  data,
  onClose,
  onNavigateToSerial,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Tôi là Trợ Lý AI Chuyên Gia Kho & Serial. Bạn có thể hỏi tôi về vị trí Serial/IMEI, dự báo mặt hàng sắp hết kho, phân tích công nợ hoặc tìm nhanh thông tin thiết bị.',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (promptText?: string) => {
    const textToSend = promptText || inputPrompt;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInputPrompt('');

    setLoading(true);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          contextData: {
            TongSoSanPham: data.SanPham.length,
            TongSoSerial: data.KhoSerial.length,
            KhoSerialTrongKho: data.KhoSerial.filter((s) => s.TrangThai === 'TrongKho').length,
            KhoSerialDaBan: data.KhoSerial.filter((s) => s.TrangThai === 'DaBan').length,
            KhoSerialBaoHanh: data.KhoSerial.filter((s) => s.TrangThai === 'BaoHanh').length,
            DanhSachSanPhamSummary: data.SanPham.map((p) => ({
              MaSP: p.MaSP,
              Ten: p.TenSanPham,
              GiaNiemYet: p.GiaBanNiemYet,
              GiaNhapTB: p.GiaNhapTrungBinh,
              TonSerial: data.KhoSerial.filter((s) => s.MaSP === p.MaSP && s.TrangThai === 'TrongKho')
                .length,
            })),
            DanhSachSerialChiTiet: data.KhoSerial.map((s) => ({
              SoSerial: s.SoSerial,
              MaSP: s.MaSP,
              TrangThai: s.TrangThai,
              NCC: s.NCC,
              MaDH: s.MaDH,
            })),
            TongNoKhachHang: data.KhachHang.reduce((sum, c) => sum + c.TongNoHienTai, 0),
            TongNoNhaCungCap: data.NCC.reduce((sum, c) => sum + c.TongNoHienTai, 0),
          },
        }),
      });

      const json = await res.json();
      if (json.text) {
        setMessages((prev) => [...prev, { role: 'assistant', content: json.text }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Cần thiết lập GEMINI_API_KEY trong file .env để kích hoạt AI.' },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Lỗi kết nối AI: ' + err.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl h-[600px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-sm">Trợ Lý AI Quản Lý Kho & Serial</h3>
              <p className="text-[10px] text-indigo-200">Powered by Gemini AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg text-white font-bold">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Question Chips */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto text-[11px] scrollbar-none shrink-0">
          <button
            onClick={() =>
              handleSendMessage('Phân tích mặt hàng nào có nguy cơ thiếu hàng tồn kho nhất?')
            }
            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-slate-700 dark:text-slate-300 hover:border-indigo-500 whitespace-nowrap"
          >
            🔍 Mặt hàng nào sắp hết kho?
          </button>

          <button
            onClick={() => handleSendMessage('Tổng hợp tình hình công nợ khách hàng và NCC hiện tại')}
            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-slate-700 dark:text-slate-300 hover:border-indigo-500 whitespace-nowrap"
          >
            💰 Tổng hợp công nợ?
          </button>

          <button
            onClick={() =>
              handleSendMessage('Kiểm tra danh sách Serial/IMEI đang ở trạng thái Bảo Hành')
            }
            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-slate-700 dark:text-slate-300 hover:border-indigo-500 whitespace-nowrap"
          >
            🛡️ Serial đang bảo hành?
          </button>
        </div>

        {/* Chat History Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-3 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white font-medium rounded-tr-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none whitespace-pre-wrap'
                }`}
              >
                {msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 items-center text-slate-400 text-xs italic">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>Gemini AI đang truy vấn dữ liệu kho...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2 shrink-0">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Đặt câu hỏi cho Trợ Lý AI..."
            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !inputPrompt.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md shadow-indigo-500/20"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
