
/**
 * XEENAPS PKM - TRANSLATION SERVICE (LINGVA ENGINE)
 * Menggunakan Lingva API dengan sistem Marker [[XTn]] untuk preservasi tag HTML (<span>, <b>, <br/>).
 */

function fetchTranslation(text, targetLang) {
  if (!text) return "";

  // 1. EKSTRAKSI TAG & PENGGANTIAN DENGAN MARKER
  // Kita menyimpan tag asli dalam array dan menggantinya dengan placeholder unik [[XTn]]
  const preservedTags = [];
  const processedText = text.replace(/<[^>]+>/g, function(match) {
    const placeholder = "[[XT" + preservedTags.length + "]]";
    preservedTags.push(match);
    return placeholder;
  });

  // 2. DAFTAR INSTANCE LINGVA (Google Translate Proxy)
  const instances = [
    "https://lingva.ml/api/v1/auto/",
    "https://lingva.garudalinux.org/api/v1/auto/",
    "https://lingva.lunar.icu/api/v1/auto/"
  ];

  let translatedContent = "";
  let isSuccess = false;
  let lastError = "";

  // 3. PROSES REQUEST KE LINGVA
  for (let baseUrl of instances) {
    try {
      // Lingva menggunakan format: /api/v1/:source/:target/:query
      const url = baseUrl + targetLang + "/" + encodeURIComponent(processedText);
      const response = UrlFetchApp.fetch(url, { 
        method: "get",
        muteHttpExceptions: true,
        timeout: 20000 // 20 detik timeout
      });

      if (response.getResponseCode() === 200) {
        const json = JSON.parse(response.getContentText());
        if (json.translation) {
          translatedContent = json.translation;
          isSuccess = true;
          break;
        }
      }
      lastError = "Response code: " + response.getResponseCode();
    } catch (e) {
      lastError = e.toString();
    }
  }

  if (!isSuccess) {
    throw new Error("Translation failed via Lingva Proxy: " + lastError);
  }

  // 4. RESTORASI TAG (Penyusunan Kembali)
  // Mengembalikan tag asli berdasarkan marker yang ditemukan di hasil terjemahan
  let finalResult = translatedContent;
  
  // Terkadang Google Translate menambahkan spasi di sekitar bracket, kita bersihkan
  // Misal: "[[ XT0 ]]" kembali menjadi "[[XT0]]"
  finalResult = finalResult.replace(/\[\[\s*XT(\d+)\s*\]\]/g, "[[XT$1]]");

  preservedTags.forEach((tag, index) => {
    const marker = "[[XT" + index + "]]";
    // Menggunakan split/join untuk replace all occurrences jika marker muncul lebih dari sekali (jarang terjadi)
    finalResult = finalResult.split(marker).join(tag);
  });

  return finalResult;
}
