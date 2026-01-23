
/**
 * XEENAPS PKM - PRESENTATION REGISTRY MODULE
 */

/**
 * Mendapatkan presentasi yang terkait dengan suatu collectionId
 */
function getPresentationsByCollection(collectionId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.LIBRARY);
    let sheet = ss.getSheetByName("Presentations");
    if (!sheet) {
      setupPresentationRegistry();
      return [];
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colIdsIdx = headers.indexOf('collectionIds');
    
    const results = [];
    const jsonFields = ['collectionIds', 'presenters', 'themeConfig'];

    for (let i = 1; i < data.length; i++) {
      let rowCollectionIds = [];
      try {
        rowCollectionIds = JSON.parse(data[i][colIdsIdx] || '[]');
      } catch (e) {
        rowCollectionIds = [];
      }

      if (rowCollectionIds.includes(collectionId)) {
        let presentation = {};
        headers.forEach((h, j) => {
          let val = data[i][j];
          if (jsonFields.includes(h)) {
            try {
              val = JSON.parse(val || (h === 'presenters' ? '[]' : '{}'));
            } catch (e) {
              val = h === 'presenters' ? [] : {};
            }
          }
          presentation[h] = val;
        });
        results.push(presentation);
      }
    }
    return results;
  } catch (e) {
    console.error("Error fetching related presentations: " + e.toString());
    return [];
  }
}

/**
 * Menyimpan presentasi baru ke registry dan mengonversi file ke Google Slides
 */
function handleSavePresentation(body) {
  try {
    const { presentation, pptxFileData } = body;
    
    // 1. Sharding Aware: Tentukan target penyimpanan
    const storageTarget = getViableStorageTarget(CONFIG.STORAGE.THRESHOLD);
    if (!storageTarget) throw new Error("Storage full on all nodes.");

    // 2. Simpan file PPTX fisik
    const fileName = `${presentation.title}.pptx`;
    const blob = Utilities.newBlob(Utilities.base64Decode(pptxFileData), 'application/vnd.openxmlformats-officedocument.presentationml.presentation', fileName);
    
    let pptxFileId;
    if (storageTarget.isLocal) {
      const folder = DriveApp.getFolderById(storageTarget.folderId);
      pptxFileId = folder.createFile(blob).getId();
    } else {
      const res = UrlFetchApp.fetch(storageTarget.url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ action: 'saveFileDirect', fileName: fileName, mimeType: blob.getContentType(), fileData: pptxFileData, folderId: storageTarget.folderId })
      });
      pptxFileId = JSON.parse(res.getContentText()).fileId;
    }

    // 3. Konversi ke Google Slides
    // Di GAS, cara terbaik konversi adalah menggunakan Drive API v2/v3 insert/create dengan convert: true
    const resource = {
      title: presentation.title,
      mimeType: MimeType.GOOGLE_SLIDES,
      parents: [{ id: storageTarget.folderId }]
    };
    
    const convertedFile = Drive.Files.create(resource, blob);
    presentation.gSlidesId = convertedFile.id;

    // 4. Catat ke Spreadsheet Registry Master
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.LIBRARY);
    let sheet = ss.getSheetByName("Presentations");
    if (!sheet) {
      setupPresentationRegistry();
      sheet = ss.getSheetByName("Presentations");
    }

    const headers = CONFIG.SCHEMAS.PRESENTATIONS;
    const rowData = headers.map(h => {
      const val = presentation[h];
      return (Array.isArray(val) || (typeof val === 'object' && val !== null)) ? JSON.stringify(val) : (val !== undefined ? val : '');
    });

    sheet.appendRow(rowData);
    return { status: 'success', data: presentation };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Setup tabel Presentations
 */
function setupPresentationRegistry() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.LIBRARY);
  let sheet = ss.getSheetByName("Presentations");
  if (!sheet) {
    sheet = ss.insertSheet("Presentations");
    const headers = CONFIG.SCHEMAS.PRESENTATIONS;
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  }
}
