import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini AI Client lazily or securely
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    return new GoogleGenAI({ apiKey });
  };

  // Health API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // AI Assistant endpoint for inventory insights & Serial tracking queries
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { prompt, contextData } = req.body;
      const ai = getGeminiClient();

      const systemInstruction = `Bạn là trợ lý AI chuyên gia quản lý kho, bán hàng và serial/IMEI cho doanh nghiệp bán lẻ thiết bị công nghệ. 
Trả lời ngắn gọn, chính xác bằng tiếng Việt, đưa ra lời khuyên hoặc phân tích số liệu dựa trên dữ liệu được cung cấp.`;

      const fullPrompt = `${prompt}\n\nDữ liệu kho hàng hiện tại:\n${JSON.stringify(contextData, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      res.status(500).json({ error: error.message || 'Lỗi xử lý AI' });
    }
  });

  // Google Sheets Webhook Proxy endpoint (helps avoid browser CORS restrictions)
  app.post('/api/sheets/proxy', async (req, res) => {
    try {
      const { webhookUrl, payload } = req.body;
      if (!webhookUrl) {
        return res.status(400).json({ error: 'Thiếu webhookUrl' });
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      res.json({ success: response.ok, rawResponse: text });
    } catch (err: any) {
      console.error('Sheets Proxy Error:', err);
      res.status(500).json({ error: err.message || 'Lỗi proxy Google Sheets' });
    }
  });

  // Real-time SSE Connections list for multi-device sync
  let sseClients: express.Response[] = [];

  // Webhook endpoint called by Google Apps Script when a row is edited on Google Sheets
  app.post('/api/sheets/webhook-update', (req, res) => {
    try {
      const { tableName, item, action } = req.body || {};
      if (!tableName || !item) {
        return res.status(400).json({ error: 'Thiếu tableName hoặc item' });
      }

      const eventData = {
        tableName,
        item,
        action: action || 'row_updated',
        timestamp: new Date().toISOString(),
      };

      console.log(`📥 [Google Sheets Trigger] Dòng mới/chỉnh sửa tại tab "${tableName}":`, item);

      // Broadcast event to all connected devices via SSE
      const sseMsg = `data: ${JSON.stringify(eventData)}\n\n`;
      sseClients.forEach((client) => {
        try {
          client.write(sseMsg);
        } catch (e) {
          // Client disconnected
        }
      });

      res.json({ success: true, message: 'Đã nhận dữ liệu chỉnh sửa từ Sheets và phát tới các thiết bị.' });
    } catch (err: any) {
      console.error('Webhook Update Error:', err);
      res.status(500).json({ error: err.message || 'Lỗi xử lý webhook' });
    }
  });

  // Server-Sent Events endpoint for WebApp clients to receive instant row updates
  app.get('/api/sheets/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (res.flushHeaders) res.flushHeaders();

    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter((c) => c !== res);
    });
  });

  // Vite Development / Static Production serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
