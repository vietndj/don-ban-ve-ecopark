// ============================================================================
// Vercel Serverless Function: Đón Bạn Về Lớp & Xác Nhận Hậu Cần Green Hub Long Biên
// Tích hợp Bot Telegram của offline.fedu.vn (@offlineKhoaVideo_bot) + Google Sheets
// ============================================================================
const https = require('https');
const { google } = require('googleapis');

// === CẤU HÌNH TELEGRAM BOT OFFLINE.FEDU.VN ===
// Đảm bảo LUÔN gửi vào bot của offline.fedu.vn (@offlineKhoaVideo_bot)
const OFFLINE_BOT_TOKEN = "7991600422:AAHNmZ9ixcQtf_pTVQewadrnYZ0apOEvxgk";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "2050406425";

// Google Sheets API - Service Account
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || "form-feedback-offline@vietndj-git-cms.iam.gserviceaccount.com";
const GOOGLE_SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || "1KiRikBLzoZTin14c14-kZiZfXotp2JEZnYKWFcDtFhw";
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "Danh Sách Học Viên";

const DEFAULT_GOOGLE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDTkXmjGxkiIuCC\nD3z0pKQE0lIJewMjIWfu5oPT12wxOB7SNZw+PHURG4suLaKD7lNAYGe9J4AB3reu\nTc0u7lbYoLsydxRa3WQ8NALYcEldWc7NnQvtd7bz6VEbPfKwjCLE5btg7B30FKKw\nFz26wnmvaBDOudopx6dI69GHa2Paj0BRTj2JZ92OjU1OPb+ONULe2UGBnuxLSK8N\nu3qIM1ooQFB2D2irtXoPvD6DJmO6HmjIjoO2rSrWqusX9qwVwnbfMDL7BmeG/0rZ\nE3QI+VjU6geWyUJ/XVWgUVtM8EA9IihM1DkDif2yatPfJ3E6iv5TDYOsHo3rQXWt\nob1fHk7rAgMBAAECggEAGPmk4tDJnEKCv0fFx/mBlUIgxha77ZM9ejHDIShekMbf\nuI/0lFI9vZnDSd3AQBPLxx86T9WQYmggxdZQYPhozyTWRGRTRlC5SvQW2+cRehAm\nfhZKeKt3sP57gRxEgHvihNzbzFrDRHOFKwVrV5cqlz7RMR42d1Um1dBkyTgvrvag\nLXUrgqhPfN8U9ILSJDFXJF2o0bSJuiqhLiWWshp4rF857ngg2HDVO14Mp7Mk85tb\nKOsUr+UUEuPMtTP1jJrO2m3shesTSeVG1J81bDtoeXUDHaloYTmoGyMMjwje0lou\nCIiXmlHQF3z9UVYa3WgwF03vQ+542MacOnTa6jlZxQKBgQD0ZZO0ohr4rSwyJn0O\n9ce7B3GfJR4RKg/xRoNGaYPlIrfYgKEU4GirWTtFhL0UlsFVWBZJqSYt6j7Antvo\nFWfWsO7nn8ptbgWWwgHGtzFjAs7AKjzcbdf8SFJRG/kizSvQffuDxXAZSxU5c3lb\n2fEowhYkuFZw+ep3noCYJaZDDQKBgQDdnOWiq3JY1oHJwEV9uCDqm6JtyTVY2Rth\nDRi1DF1V2yoveAStanTfpfdRYp09HMS83fkCWMgPcDlJdi/m18pfJrOOK4xpYT3Y\nOkaA6i6l3QsQAly2/EJp6XzGYyYCFMhzewrNM9zT5fu4jgNqawGFgWnG5F7YSh8W\nPuAciSg71wKBgBPA1gRmicmJraXMCJWZ9e++9UcIp/p5LNqyeU/KnXd6q+Na2iom\nzS70Ql8nEGVGng+40+xWOJjDcxj8fgevGzp2CIk+GA1qNBdwTNZz3hEDnBRaFZs3\nYZqpecXGfgd7D8yFMjv/TEUvFWMUWz26Ssyhi0qif5IYEQRkEj655EtNAoGAN4jE\nxuHd0sNWXN9wypNktEXyCz77vlsRkF1+zofdr9EvHhweV/KwfQcTFfL3YkQeTRH2\n/46N+8hsoqsaT+fNj9Cb+EmTcyjqHZBk8JM+w1PEHOvqnfRTFEVtfi2EbcsVfFLe\nHxQbB4K/dL0pv/Y2uGT4w92gouTYK3PwJ1Z7nZsCgYA1lXF3fW+0sDX7A8AgaDQ3\nAVlY6JMYbOUGI4qEHmAcdycykGeMAafBxicmbrWGEa6QF6pZ8m+9RQUH9cfASd4X\nY6mNtQ5COwZ/6hD6JIL2n/Fk/Kl+pRjjctfcZMPwam9hn6FDybCwuDP5RjD1xg40\nrnev+mxuY6JF6giGE0oJbw==\n-----END PRIVATE KEY-----\n";

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Google Sheets Client Singleton
let _sheetsClient = null;
function getGoogleSheetsClient() {
  if (_sheetsClient) return _sheetsClient;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || DEFAULT_GOOGLE_PRIVATE_KEY).replace(/\\n/g, '\n');
  if (!GOOGLE_CLIENT_EMAIL || !privateKey) return null;
  try {
    const auth = new google.auth.JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: privateKey,
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
      item.lodging || 'Khách sạn gần Green Hub',      // Cột F: Nhu Cầu Lưu Trú
      item.checkinTime || 'Sáng Thứ Bảy - Trước 08h30',// Cột G: Thời Gian Đến / Check-in
      item.dinner || 'Có tham gia buffet nướng BBQ',  // Cột H: Bữa Tối Thân Mật (T7)
      item.lunch || 'Buffet line trưa tại lớp',       // Cột I: Ăn Trưa Tại Lớp
      item.familyPlan || 'Đi một mình',               // Cột J: Kế Hoạch / Bé đi cùng
      item.notes || 'Không có ghi chú',               // Cột K: Ghi Chú & Lời Nhắn
      'Đã chốt - Chờ đón tiếp'                        // Cột L: Trạng Thái Xử Lý
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

// Bắn thông báo về Telegram Bot của offline.fedu.vn (@offlineKhoaVideo_bot)
// Với icon và format phân biệt rõ ràng: ĐÂY LÀ ĐƠN HẬU CẦN CỦA HỌC VIÊN ĐÃ CHỐT SALE
async function dispatchToTelegram(item) {
  // Gom các bot token cần gửi: Luôn có bot của offline.fedu.vn
  const tokens = Array.from(new Set([
    OFFLINE_BOT_TOKEN,
    process.env.TELEGRAM_BOT_TOKEN
  ].filter(Boolean)));
  const chatId = process.env.TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID;
  if (tokens.length === 0 || !chatId) return;

  try {
    const cleanPhone = (item.phone || '').replace(/[^\d+]/g, '');
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`;
    
    // Icon và tiêu đề nổi bật: 🌿🚗 [ĐÓN TIẾP GREEN HUB] HỌC VIÊN ĐÃ CHỐT SALE
    // Giúp phân biệt ngay lập tức với đơn lead mới từ offline.fedu.vn
    const text =
      `🌿🚗 <b>[ĐÓN TIẾP GREEN HUB] HỌC VIÊN ĐÃ CHỐT XÁC NHẬN HẬU CẦN!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 <b>Phân loại:</b> 🟢 <b>ĐÃ CHỐT SALE • ĐIỀN FORM ĐÓN TIẾP</b>\n` +
      `👤 <b>Họ và tên:</b> <b>${escapeHtml(item.fullName)}</b>\n` +
      `📞 <b>Zalo / SĐT:</b> <a href="https://zalo.me/${cleanPhone}"><b>${escapeHtml(item.phone)}</b></a> | <a href="tel:${cleanPhone}">Gọi trực tiếp</a>\n` +
      `📍 <b>Xuất phát từ:</b> <b>${escapeHtml(item.city || 'Chưa rõ')}</b>\n\n` +
      `🏠 <b>Lưu trú:</b> <code>${escapeHtml(item.lodging || 'Tự túc')}</code>\n` +
      `⏰ <b>Giờ đến dự kiến:</b> ${escapeHtml(item.checkinTime || 'Chưa chọn')}\n` +
      `🥩 <b>Buffet nướng BBQ (Tối T7):</b> ${escapeHtml(item.dinner || 'Tự túc')}\n` +
      `🥗 <b>Buffet line 2 ngày trưa:</b> ${escapeHtml(item.lunch || 'Tự do')}\n` +
      `👶 <b>Bé / Người đi cùng:</b> ${escapeHtml(item.familyPlan || 'Đi một mình')}\n` +
      (item.notes ? `\n💬 <b>Ghi chú riêng gửi Em Chi:</b>\n<i>"${escapeHtml(item.notes)}"</i>\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🌿 <b>Địa điểm học:</b> Green Hub - Không Gian Xanh Long Biên\n` +
      `📍 <b>Địa chỉ:</b> 38 TT1, Khu đô thị Quân đội Thạch Bàn, Long Biên, Hà Nội\n` +
      `🔗 <b>Fanpage:</b> <a href="https://www.facebook.com/greenhubkhonggianxanhlongbien/?locale=vi_VN">Không Gian Xanh Greenhub</a>\n` +
      `📊 <a href="${sheetUrl}"><b>Mở Google Sheet Quản Lý Hậu Cần</b></a>\n` +
      `👩‍💼 <i>Em Chi liên hệ Zalo gửi tài liệu và cẩm nang đón tiếp anh/chị nhé!</i>\n` +
      `⏰ <i>${escapeHtml(item.submittedAt)}</i>`;

    await Promise.allSettled(
      tokens.map(token =>
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        })
      )
    );
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
      venue: 'Green Hub - Không Gian Xanh Long Biên',
      message: 'Hệ thống Xác nhận Lịch trình & Hậu cần Green Hub đang hoạt động ổn định',
      googleSheetUrl: sheetUrl
    });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const count = Math.floor(Math.random() * 900) + 100;
      const responseId = `GREENHUB-${String(count).padStart(3, '0')}`;

      const newSub = {
        responseId,
        submittedAt: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        fullName: (body.fullName || 'Ẩn danh').trim(),
        phone: (body.phone || '').trim(),
        city: (body.city || '').trim(),
        lodging: body.lodging || 'Khách sạn gần Green Hub (400k – 500k/đêm)',
        checkinTime: body.checkinTime || 'Sáng Thứ Bảy - Trước 08h30',
        dinner: body.dinner || 'Có tham gia buffet nướng BBQ tối Thứ Bảy cùng lớp',
        lunch: body.lunch || 'Buffet line tự chọn cả 2 bữa trưa tại Green Hub',
        familyPlan: body.familyPlan || 'Đi một mình',
        notes: (body.notes || '').trim()
      };

      // Ghi Google Sheets & Bắn Telegram bot offline.fedu.vn song song
      const sheetsPromise = appendToGoogleSheet(newSub).catch(e => console.error('Sheets:', e.message));
      const telegramPromise = dispatchToTelegram(newSub).catch(e => console.error('Telegram:', e.message));

      await Promise.allSettled([sheetsPromise, telegramPromise]);

      return res.status(200).json({
        success: true,
        message: 'Xác nhận thành công! Em Chi sẽ liên hệ gửi cẩm nang chỉ đường Green Hub và tài liệu qua Zalo cho anh/chị.',
        data: newSub,
        googleSheetUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`
      });
    } catch (e) {
      console.error('Submit API error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }
};
