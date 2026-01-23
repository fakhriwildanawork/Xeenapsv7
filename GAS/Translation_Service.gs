
/**
 * XEENAPS PKM - TRANSLATION SERVICE
 * Menggunakan LibreTranslate dengan mode format: html untuk menjaga integritas styling <span>, <b>, dll.
 */

function fetchTranslation(text, targetLang) {
  // Daftar public instance LibreTranslate sebagai cadangan
  const instances = [
    "https://libretranslate.de/translate",
    "https://translate.astian.org/translate",
    "https://translate.terraprint.co/translate"
  ];

  const payload = {
    q: text,
    source: "auto",
    target: targetLang,
    format: "html" // Kunci utama preservasi styling
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  let lastError = "";
  for (let url of instances) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() === 200) {
        const result = JSON.parse(response.getContentText());
        return result.translatedText;
      }
      lastError = "Instance " + url + " returned " + response.getResponseCode();
    } catch (e) {
      lastError = e.toString();
    }
  }

  throw new Error("Translation failed on all instances: " + lastError);
}
