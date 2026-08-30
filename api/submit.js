// ============================================================================
// Vercel Serverless Function: Đăng Ký Hậu Cần & Cẩm Nang Lớp Offline Ecopark (19-20/09)
// Google Sheets API (Service Account) + Telegram Bot NOVA-CORE + Persistent Storage
// ============================================================================
const https = require('https');
const { google } = require('googleapis');

// === CẤU HÌNH ===
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8964853536:AAHuRNm_hY-YQtveBD1HlmthN4I5xpVzM8U";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "2050406425";

// Google Sheets API - Service Account
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || "form-feedback-offline@vietndj-git-cms.iam.gserviceaccount.com";
const GOOGLE_SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || "1KiRikBLzoZTin14c14-kZiZfXotp2JEZnYKWFcDtFhw";
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "Danh Sách Học Viên";

// GitHub Persistent Storage (Optional backup)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPO = process.env.GITHUB_REPO || "vietndj/don-ban-ve-ecopark";
const GITHUB_PATH = "data/submissions.json";

// Google Sheets Client Singleton
let _sheetsClient = null;
function getGoogleSheetsClient() {
  if (_sheetsClient) return _sheetsClient;
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) return null;
  try {
    const auth = new google.auth.JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    _sheetsClient = google.sheets({ version: 'v4', auth });
    return _sheetsClient;
  } catch (e) {
    console.error('Google Sheets auth error:', e.message);
    return null;
  }
}

async function appendToGoogleSheet(item) {
  const sheets = getGoogleSheetsClient();
  if (!sheets || !GOOGLE_SPREADSHEET_ID) {
    console.warn('Google Sheets not configured or credentials missing');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const rowValues = [
      item.responseId,                                // Cột A: Mã Đăng Ký
      item.submittedAt,                               // Cột B: Thời Gian Gửi
      item.fullName,                                  // Cột C: Họ Và Tên
      item.phone,                                     // Cột D: Số Điện Thoại / Zalo
      item.city || 'Chưa rõ',                         // Cột E: Tỉnh / Thành Phố
      item.lodging || 'Tự túc chỗ ở',                 // Cột F: Nhu Cầu Lưu Trú
      item.checkinTime || 'Chưa chọn',                // Cột G: Thời Gian Nhận Phòng
      item.dinner || 'Tự túc ăn tối',                 // Cột H: Bữa Tối Thân Mật (19/09)
      item.lunch || 'Tự túc ăn trưa',                 // Cột I: Đăng Ký Ăn Trưa Tại Lớp
      item.tourPlan || 'Không tham quan',             // Cột J: Tham Quan Ngày 21/09
      item.notes || 'Không có ghi chú',               // Cột K: Ghi Chú & Lời Nhắn
      'Chờ liên hệ'                                   // Cột L: Trạng Thái Xử Lý
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SPREADSHEET_ID,
      range: `${GOOGLE_SHEET_NAME}!A:L`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowValues] }
    });

    return { success: true };
  } catch (e) {
    console.error('Google Sheets append error:', e.message);
    return { success: false, reason: e.message };
  }
}

// Bắn thông báo về Telegram Bot NOVA-CORE
async function dispatchToTelegram(item) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`;
    const excelDownloadUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/export?format=xlsx`;
    
    const text =
      `🏡 <b>HỌC VIÊN ĐĂNG KÝ VỀ ECOPARK (19-20/09)!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Họ và tên:</b> <b>${item.fullName || 'Chưa nhập'}</b>\n` +
      `📞 <b>Zalo / SĐT:</b> <a href="https://zalo.me/${item.phone}"><b>${item.phone || 'Chưa để SĐT'}</b></a>\n` +
      `📍 <b>Xuất phát từ:</b> <b>${item.city || 'Chưa rõ'}</b>\n\n` +
      `🏠 <b>Chỗ ở:</b> <code>${item.lodging || 'Tự túc'}</code>\n` +
      `⏰ <b>Check-in:</b> ${item.checkinTime || 'Chưa chọn'}\n` +
      `🍖 <b>Bữa tối thân mật (19/09):</b> ${item.dinner || 'Tự túc'}\n` +
      `🍱 <b>Ăn trưa tại lớp:</b> ${item.lunch || 'Tự do'}\n` +
      `☕ <b>Tham quan / Cafe:</b> ${item.tourPlan || 'Không'}\n` +
      (item.notes ? `\n💬 <b>Ghi chú riêng:</b>\n<i>"${item.notes}"</i>\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 <a href="${sheetUrl}"><b>Mở Google Sheet Quản Lý</b></a> | <a href="${excelDownloadUrl}"><b>📥 Tải File Excel (.xlsx)</b></a>\n` +
      `👩‍💼 <i>Em Chi liên hệ Zalo xác nhận mã phòng sớm nhé!</i>\n` +
      `⏰ <i>${item.submittedAt}</i>`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });
  } catch (e) {
    console.error('Telegram dispatch error:', e.message);
  }
}

// Handler
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`;
    return res.status(200).json({
      success: true,
      status: 'healthy',
      message: 'Hệ thống Đăng ký Ecopark đang hoạt động ổn định',
      googleSheetUrl: sheetUrl
    });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const count = Math.floor(Math.random() * 900) + 100;
      const responseId = `ECO-2026-${String(count).padStart(3, '0')}`;

      const newSub = {
        responseId,
        submittedAt: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        fullName: body.fullName || 'Ẩn danh',
        phone: body.phone || '',
        city: body.city || '',
        lodging: body.lodging || 'Tự túc chỗ ở',
        checkinTime: body.checkinTime || 'Sáng Thứ Bảy (19/09)',
        dinner: body.dinner || 'Có tham gia cùng lớp (~200k - 250k)',
        lunch: body.lunch || 'Đặt cơm suất giao tận lớp (~55k - 65k)',
        tourPlan: body.tourPlan || 'Trở về tỉnh / Có lịch trình riêng',
        notes: body.notes || ''
      };

      // Ghi Google Sheets & Bắn Telegram song song
      const sheetsPromise = appendToGoogleSheet(newSub).catch(e => console.error('Sheets:', e.message));
      const telegramPromise = dispatchToTelegram(newSub).catch(e => console.error('Telegram:', e.message));

      await Promise.allSettled([sheetsPromise, telegramPromise]);

      return res.status(200).json({
        success: true,
        message: 'Đăng ký thành công! Em Chi sẽ liên hệ gửi mã phòng và tài liệu qua Zalo cho anh/chị.',
        data: newSub,
        googleSheetUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`
      });
    } catch (e) {
      console.error('Submit API error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }
};
