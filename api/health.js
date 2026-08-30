const { google } = require('googleapis');

const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || "form-feedback-offline@vietndj-git-cms.iam.gserviceaccount.com";
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n');
const GOOGLE_SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || "1J9ZrjLxTba9R-wuet1n_J_hKcL0PVtQDD_ag65Ewx04";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8964853536:AAHuRNm_hY-YQtveBD1HlmthN4I5xpVzM8U";

module.exports = async (req, res) => {
  const checks = {
    google_sheets_auth: false,
    google_sheet_read: false,
    telegram_bot: false,
    timestamp: new Date().toISOString()
  };

  try {
    if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY) {
      const auth = new google.auth.JWT({
        email: GOOGLE_CLIENT_EMAIL,
        key: GOOGLE_PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      checks.google_sheets_auth = true;

      const meta = await sheets.spreadsheets.get({ spreadsheetId: GOOGLE_SPREADSHEET_ID });
      if (meta && meta.data) {
        checks.google_sheet_read = true;
      }
    }
  } catch (e) {
    checks.sheets_error = e.message;
  }

  try {
    if (TELEGRAM_BOT_TOKEN) {
      const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
      const tgData = await tgRes.json();
      if (tgData.ok) {
        checks.telegram_bot = true;
        checks.bot_name = tgData.result.username;
      }
    }
  } catch (e) {
    checks.telegram_error = e.message;
  }

  const allOk = checks.google_sheets_auth && checks.google_sheet_read && checks.telegram_bot;
  return res.status(allOk ? 200 : 500).json({
    status: allOk ? 'healthy' : 'degraded',
    checks
  });
};
