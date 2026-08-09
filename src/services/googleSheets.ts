import { DatabaseSchema } from '../types';

export interface SheetSyncConfig {
  webhookUrl: string;
  spreadsheetId: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
}

const SYNC_CONFIG_KEY = 'POS_SHEETS_SYNC_CONFIG_V1';

export function getSheetSyncConfig(): SheetSyncConfig {
  try {
    const stored = localStorage.getItem(SYNC_CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load sheet sync config', e);
  }
  return {
    webhookUrl: '',
    spreadsheetId: '',
    autoSync: false,
    lastSyncedAt: null,
  };
}

export function saveSheetSyncConfig(config: SheetSyncConfig): void {
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Convert a table array to a CSV string with headers
 */
export function convertTableToCSV<T extends Record<string, any>>(data: T[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((item) =>
    headers
      .map((header) => {
        let val = item[header];
        if (Array.isArray(val)) {
          val = val.join('; ');
        }
        if (val === null || val === undefined) val = '';
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Download a CSV file for a given table name
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateGoogleAppsScript(): string {
  return generateGoogleAppsScriptCode();
}

export async function syncDataToGoogleSheetsWebhook(
  webhookUrl: string,
  dbData: DatabaseSchema
): Promise<{ success: boolean; message: string }> {
  return syncWithGoogleSheetsWebhook(webhookUrl, dbData);
}

export function downloadAllDatabaseCSV(dbData: DatabaseSchema): void {
  const keys: (keyof DatabaseSchema)[] = [
    'Setting',
    'ThuongHieu',
    'NhomHang',
    'SanPham',
    'KhoSerial',
    'StockCards',
    'DonHang',
    'ChiTietDonHang',
    'NhapHang',
    'ChiTietNhapHang',
    'KhachHang',
    'NCC',
    'NguoiDung',
  ];

  keys.forEach((key) => {
    const tableData = dbData[key] || [];
    const csv = convertTableToCSV(tableData as Record<string, any>[]);
    if (csv) {
      downloadCSV(`Backup_${key}`, csv);
    }
  });
}

/**
 * Generates ready-to-use Google Apps Script code for 13 tables with Incremental Delta Upsert support
 */
export function generateGoogleAppsScriptCode(): string {
  return `/**
 * Google Apps Script Webhook cho Webapp Quản Lý Bán Hàng & Kho Serial
 * Dán code này vào Google Sheets -> Extensions (Tiện ích mở rộng) -> Apps Script
 * Sau đó Deploy as Web App (Anyone / Tất cả mọi người) để lấy Webhook URL!
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Không tìm thấy dữ liệu POST' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Mapping Khóa Chính (Primary Keys) cho 13 Bảng để Cập Nhật/Thêm Mới (Upsert) mà không làm mất đơn cũ
    var pkMap = {
      'Setting': 'MaCauHinh',
      'ThuongHieu': 'MaThuongHieu',
      'NhomHang': 'MaNhomHang',
      'SanPham': 'MaSP',
      'KhoSerial': 'SoSerial',
      'StockCards': 'MaTheKho',
      'KhachHang': 'MaKH',
      'NCC': 'MaNCC',
      'DonHang': 'MaDH',
      'ChiTietDonHang': 'MaChiTietDH',
      'NhapHang': 'MaNH',
      'ChiTietNhapHang': 'MaChiTietNH',
      'NguoiDung': 'MaUID'
    };

    var tables = Object.keys(pkMap);

    tables.forEach(function(tableName) {
      var items = data[tableName];
      if (items && Array.isArray(items) && items.length > 0) {
        var sheet = ss.getSheetByName(tableName);
        var pkName = pkMap[tableName];

        // 1. Tạo Sheet mới nếu chưa có
        if (!sheet) {
          sheet = ss.insertSheet(tableName);
          var headers = Object.keys(items[0]);
          sheet.appendRow(headers);
          var headerRange = sheet.getRange(1, 1, 1, headers.length);
          headerRange.setBackground(tableName === 'Setting' ? '#0369A1' : '#1E293B');
          headerRange.setFontColor('#FFFFFF');
          headerRange.setFontWeight('bold');
          sheet.setFrozenRows(1);
        }

        // Lấy danh sách cột hiện tại
        var lastCol = sheet.getLastColumn();
        if (lastCol === 0) {
          var headers = Object.keys(items[0]);
          sheet.appendRow(headers);
          lastCol = headers.length;
        }
        var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

        // Bổ sung các cột mới nếu payload có thuộc tính mới
        var sampleKeys = Object.keys(items[0]);
        sampleKeys.forEach(function(k) {
          if (currentHeaders.indexOf(k) === -1) {
            currentHeaders.push(k);
            sheet.getRange(1, currentHeaders.length).setValue(k)
              .setBackground(tableName === 'Setting' ? '#0369A1' : '#1E293B')
              .setFontColor('#FFFFFF').setFontWeight('bold');
          }
        });

        var pkColIdx = currentHeaders.indexOf(pkName);

        // NẾU LÀ YÊU CẦU LÀM SẠCH VÀ ĐẶT LẠI (full_sync)
        if (data.action === 'clear_and_reset') {
          var lastRow = sheet.getLastRow();
          if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, currentHeaders.length).clearContent();
          }
          var rowsToInsert = items.map(function(item) {
            return currentHeaders.map(function(h) {
              var val = item[h];
              if (Array.isArray(val)) return val.join('; ');
              return val === null || val === undefined ? '' : val;
            });
          });
          if (rowsToInsert.length > 0) {
            sheet.getRange(2, 1, rowsToInsert.length, currentHeaders.length).setValues(rowsToInsert);
          }
        } 
        // CHẾ ĐỘ MẶC ĐỊNH: SMART UPSERT (Cập nhật dòng cũ nếu trùng khóa chính, Thêm dòng mới vào cuối)
        else {
          var lastRow = sheet.getLastRow();
          var existingPkValues = [];
          if (lastRow > 1 && pkColIdx !== -1) {
            var rawPkRange = sheet.getRange(2, pkColIdx + 1, lastRow - 1, 1).getValues();
            existingPkValues = rawPkRange.map(function(r) { return String(r[0]); });
          }

          items.forEach(function(item) {
            var rowValues = currentHeaders.map(function(h) {
              var val = item[h];
              if (Array.isArray(val)) return val.join('; ');
              return val === null || val === undefined ? '' : val;
            });

            var itemPkValue = item[pkName] ? String(item[pkName]) : '';
            var existingRowIndex = pkColIdx !== -1 ? existingPkValues.indexOf(itemPkValue) : -1;

            if (existingRowIndex !== -1) {
              // Dòng đã có -> Cập nhật đè đúng vị trí dòng cũ
              sheet.getRange(existingRowIndex + 2, 1, 1, currentHeaders.length).setValues([rowValues]);
            } else {
              // Dòng mới -> Nối thêm vào cuối bảng
              sheet.appendRow(rowValues);
              existingPkValues.push(itemPkValue);
            }
          });
        }

        sheet.autoResizeColumns(1, currentHeaders.length);
      }
    });

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Cập nhật Google Sheets thành công!' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var pkMap = {
      'Setting': 'MaCauHinh',
      'ThuongHieu': 'MaThuongHieu',
      'NhomHang': 'MaNhomHang',
      'SanPham': 'MaSP',
      'KhoSerial': 'SoSerial',
      'StockCards': 'MaTheKho',
      'DonHang': 'MaDH',
      'ChiTietDonHang': 'MaChiTietDH',
      'NhapHang': 'MaNH',
      'ChiTietNhapHang': 'MaChiTietNH',
      'KhachHang': 'MaKH',
      'NCC': 'MaNCC',
      'NguoiDung': 'MaNguoiDung'
    };

    var result = {};
    var tables = Object.keys(pkMap);

    tables.forEach(function(tableName) {
      var sheet = ss.getSheetByName(tableName);
      if (sheet) {
        var values = sheet.getDataRange().getValues();
        if (values.length > 1) {
          var headers = values[0];
          var rows = [];
          for (var i = 1; i < values.length; i++) {
            var rowObj = {};
            var hasData = false;
            for (var j = 0; j < headers.length; j++) {
              if (headers[j]) {
                var val = values[i][j];
                rowObj[headers[j]] = val;
                if (val !== "" && val !== null && val !== undefined) hasData = true;
              }
            }
            if (hasData) {
              rows.push(rowObj);
            }
          }
          result[tableName] = rows;
        } else {
          result[tableName] = [];
        }
      } else {
        result[tableName] = [];
      }
    });

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result, timestamp: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Tự động tạo Menu tùy chỉnh trên thanh công cụ của Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ Quản Lý POS Serial')
    .addItem('🔄 Kiểm Tra Trạng Thái Kết Nối', 'checkConnection')
    .addItem('📋 Kiểm Tra Bảng Setting', 'showSettingInfo')
    .addToUi();
}

function checkConnection() {
  var ui = SpreadsheetApp.getUi();
  ui.alert('Thành Công', 'Kết nối Google Apps Script Webhook hoạt động bình thường!', ui.ButtonSet.OK);
}

function showSettingInfo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Setting');
  var ui = SpreadsheetApp.getUi();
  if (sheet) {
    ui.alert('Thành Công', 'Đã tìm thấy Sheet [Setting] lưu trữ cấu hình hệ thống!', ui.ButtonSet.OK);
  } else {
    ui.alert('Thông Báo', 'Chưa có Sheet Setting. Vui lòng bấm [Đẩy Dữ Liệu Ngay] từ Webapp!', ui.ButtonSet.OK);
  }
}
`;
}

/**
 * Computes delta (added or modified records) between previous database snapshot and current state
 */
export function computeDatabaseDelta(
  prevDb: DatabaseSchema | null,
  currDb: DatabaseSchema
): Partial<DatabaseSchema> & { action?: string } {
  if (!prevDb) {
    return { ...currDb, action: 'full_sync' };
  }

  const delta: any = { action: 'upsert' };
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

  let hasChanges = false;

  keys.forEach((key) => {
    const prevList = (prevDb[key] || []) as any[];
    const currList = (currDb[key] || []) as any[];

    const prevMap = new Map<string, string>();
    prevList.forEach((item: any) => {
      const id =
        item.MaDH ||
        item.MaNH ||
        item.SoSerial ||
        item.MaSP ||
        item.MaCauHinh ||
        item.MaChiTietDH ||
        item.MaChiTietNH ||
        item.MaTheKho ||
        item.MaKH ||
        item.MaNCC ||
        item.MaUID ||
        item.MaThuongHieu ||
        item.MaNhomHang;
      if (id) {
        prevMap.set(String(id), JSON.stringify(item));
      }
    });

    const changedItems: any[] = [];
    currList.forEach((item: any) => {
      const id =
        item.MaDH ||
        item.MaNH ||
        item.SoSerial ||
        item.MaSP ||
        item.MaCauHinh ||
        item.MaChiTietDH ||
        item.MaChiTietNH ||
        item.MaTheKho ||
        item.MaKH ||
        item.MaNCC ||
        item.MaUID ||
        item.MaThuongHieu ||
        item.MaNhomHang;
      const strVal = JSON.stringify(item);
      if (!id || !prevMap.has(String(id)) || prevMap.get(String(id)) !== strVal) {
        changedItems.push(item);
      }
    });

    if (changedItems.length > 0) {
      delta[key] = changedItems;
      hasChanges = true;
    }
  });

  return hasChanges ? delta : {};
}

/**
 * Send database payload (full or incremental delta) to user's Google Apps Script Webhook URL
 */
export async function syncWithGoogleSheetsWebhook(
  webhookUrl: string,
  payloadData: any
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payloadData),
    });

    const resText = await response.text();
    let resJson;
    try {
      resJson = JSON.parse(resText);
    } catch {
      resJson = null;
    }

    if (response.ok || (resJson && resJson.status === 'success')) {
      const cfg = getSheetSyncConfig();
      cfg.lastSyncedAt = new Date().toLocaleString('vi-VN');
      saveSheetSyncConfig(cfg);
      return { success: true, message: 'Đã đồng bộ thành công lên Google Sheets!' };
    } else {
      return {
        success: false,
        message: resJson?.error || 'Có lỗi khi truyền dữ liệu tới Google Sheets App Script.',
      };
    }
  } catch (err: any) {
    console.error('Webhook sync failed:', err);
    return {
      success: false,
      message: 'Không thể kết nối đến Webhook Google Sheets. Vui lòng kiểm tra lại URL.',
    };
  }
}

let autoSyncTimer: any = null;
let previousDbSnapshot: DatabaseSchema | null = null;

/**
 * Sets previous snapshot for delta calculation
 */
export function setPreviousSnapshot(snapshot: DatabaseSchema): void {
  previousDbSnapshot = JSON.parse(JSON.stringify(snapshot));
}

/**
 * Automatically triggers Incremental Delta Google Sheets Webhook sync when database changes (sales, purchase, products, settings)
 * Sends only modified/added rows (delta) to handle tens of thousands of rows efficiently
 */
export function autoSyncToGoogleSheets(dbData: DatabaseSchema): void {
  let webhookUrl = localStorage.getItem('GOOGLE_SHEETS_WEBHOOK_URL') || '';
  if (!webhookUrl) {
    const settingObj = dbData.Setting?.find((s) => s.MaCauHinh === 'WEBHOOK_URL');
    if (settingObj && settingObj.GiaTri && String(settingObj.GiaTri).startsWith('http')) {
      webhookUrl = String(settingObj.GiaTri);
    }
  }

  // Check if webhook URL is configured
  if (!webhookUrl || !webhookUrl.startsWith('http') || webhookUrl.includes('...')) {
    previousDbSnapshot = JSON.parse(JSON.stringify(dbData));
    return;
  }

  // Check if AUTO_SYNC is disabled in Setting
  const autoSyncSetting = dbData.Setting?.find((s) => s.MaCauHinh === 'AUTO_SYNC');
  if (autoSyncSetting && String(autoSyncSetting.GiaTri ?? '').toUpperCase() === 'FALSE') {
    previousDbSnapshot = JSON.parse(JSON.stringify(dbData));
    return;
  }

  // Calculate Incremental Delta (Only changed or new rows)
  const deltaPayload = computeDatabaseDelta(previousDbSnapshot, dbData);

  // If no records changed (only 'action' key in object), return
  if (Object.keys(deltaPayload).length <= 1) {
    previousDbSnapshot = JSON.parse(JSON.stringify(dbData));
    return;
  }

  if (autoSyncTimer) {
    clearTimeout(autoSyncTimer);
  }

  autoSyncTimer = setTimeout(async () => {
    try {
      console.log('⚡ [Incremental AutoSync] Gửi duy nhất các dòng biến động lên Google Sheets Webhook:', deltaPayload);
      const result = await syncWithGoogleSheetsWebhook(webhookUrl, deltaPayload);
      if (result.success) {
        console.log('✅ [Incremental AutoSync] Đồng bộ biến động thành công!');
        previousDbSnapshot = JSON.parse(JSON.stringify(dbData));
        window.dispatchEvent(
          new CustomEvent('google-sheets-synced', {
            detail: {
              timestamp: new Date().toLocaleTimeString('vi-VN'),
              isDelta: true,
              changedTables: Object.keys(deltaPayload).filter((k) => k !== 'action'),
            },
          })
        );
      } else {
        console.warn('⚠️ [Incremental AutoSync] Google Sheets Webhook:', result.message);
      }
    } catch (err) {
      console.error('❌ [Incremental AutoSync] Lỗi tự động đồng bộ:', err);
    }
  }, 400);
}

/**
 * Pulls current data from Google Sheets via GET webhook request
 */
export async function pullDataFromGoogleSheets(
  webhookUrl: string
): Promise<{ success: boolean; data?: Partial<DatabaseSchema>; message: string }> {
  if (!webhookUrl || !webhookUrl.trim() || !webhookUrl.startsWith('http')) {
    return { success: false, message: 'Chưa cấu hình URL Google Sheets Webhook hợp lệ!' };
  }

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: 'GET',
    });

    if (!response.ok) {
      return { success: false, message: `Lỗi kết nối HTTP (${response.status})` };
    }

    const resJson = await response.json();
    if (resJson && resJson.status === 'success' && resJson.data) {
      return {
        success: true,
        data: resJson.data,
        message: 'Lấy dữ liệu từ Google Sheets về WebApp thành công!',
      };
    } else {
      return {
        success: false,
        message: resJson?.error || resJson?.message || 'Không thể lấy dữ liệu từ Google Sheets. Bạn đã Cập nhật triển khai Apps Script mới nhất chưa?',
      };
    }
  } catch (err: any) {
    console.error('Failed to pull data from Google Sheets:', err);
    return {
      success: false,
      message: 'Không thể kết nối đến Webhook Google Sheets: ' + (err?.message || 'Lỗi mạng hoặc CORS'),
    };
  }
}
