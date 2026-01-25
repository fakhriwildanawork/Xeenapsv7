
/**
 * XEENAPS PKM - UTILITIES
 */

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Mengambil API Key dari spreadsheet KEYS
 * Berdasarkan permintaan: Sheet ApiKeys, Kolom B (index 2)
 */
function getKeysFromSheet(sheetName, colIndex) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.KEYS);
    const sheet = ss.getSheetByName(sheetName);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    // colIndex 2 = Kolom B
    return sheet.getRange(2, 2, lastRow - 1, 1).getValues().map(r => r[0]).filter(k => k);
  } catch (e) { return []; }
}

/**
 * Mengambil URL Model dari spreadsheet AI_CONFIG
 * Berdasarkan permintaan: Cari "GEMINI" di Kolom A, ambil URL di Kolom B
 */
function getProviderModel(providerName) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.AI_CONFIG);
    // Asumsi sheet bernama 'AI_CONFIG' atau sheet pertama
    const sheet = ss.getSheets()[0]; 
    const data = sheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toUpperCase() === providerName.toUpperCase()) {
        const rawUrl = data[i][1] ? data[i][1].trim() : "";
        // Jika URL lengkap seperti yang diberikan user, kita ekstrak nama modelnya saja untuk SDK
        // Contoh: https://.../models/gemini-flash-latest:generateContent -> gemini-flash-latest
        const modelMatch = rawUrl.match(/\/models\/([^:]+)/);
        return { 
          model: modelMatch ? modelMatch[1] : (rawUrl || getDefaultModel(providerName)),
          fullUrl: rawUrl 
        };
      }
    }
  } catch (e) {}
  return { model: getDefaultModel(providerName) };
}

function getDefaultModel(provider) {
  const p = provider.toUpperCase();
  if (p === 'GEMINI') return 'gemini-1.5-flash-latest';
  if (p === 'GROQ') return 'llama-3.3-70b-versatile';
  return '';
}

function getScrapingAntKey() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.KEYS);
    const sheet = ss.getSheetByName("Scraping");
    return sheet ? sheet.getRange("A1").getValue().toString().trim() : null;
  } catch (e) { return null; }
}
