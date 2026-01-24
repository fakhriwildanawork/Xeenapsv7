
/**
 * XEENAPS PKM - DEEPSEEK AI SERVICE
 * Key rotation from spreadsheet KEYS, sheet 'Deepseek', column 2, starting from row 2.
 */

function callDeepseekService(prompt) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.KEYS);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.DEEPSEEK);
  if (!sheet) return { status: 'error', message: 'Deepseek sheet not found.' };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { status: 'error', message: 'No Deepseek keys found.' };

  // Get all keys from column 2
  const keys = sheet.getRange(2, 2, lastRow - 1, 1).getValues().map(r => r[0]).filter(k => k);

  for (let key of keys) {
    try {
      const url = "https://api.deepseek.com/v1/chat/completions";
      const payload = {
        model: "deepseek-chat",
        messages: [
          { 
            role: "system", 
            content: "You are a professional presentation architect. Your output must be a JSON array of slides. Each slide must have: title, layout (choose: 'HERO', 'SPLIT', 'GRID', 'BIG_TEXT'), content (array of bullet points or cards)." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      };

      const options = {
        method: "post",
        contentType: "application/json",
        headers: { "Authorization": "Bearer " + key },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const res = UrlFetchApp.fetch(url, options);
      const resData = JSON.parse(res.getContentText());

      if (resData.choices && resData.choices.length > 0) {
        return { status: 'success', data: resData.choices[0].message.content };
      }
    } catch (e) {
      console.warn("Deepseek key failed, trying next... Error: " + e.toString());
    }
  }

  return { status: 'error', message: 'Deepseek service exhausted all keys or failed.' };
}
