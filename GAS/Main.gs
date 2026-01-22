
/**
 * XEENAPS PKM - MAIN ROUTER
 */

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    // ACTION: checkQuota (GET support for easy pinging/monitoring)
    if (action === 'checkQuota') {
      const quota = Drive.About.get({fields: 'storageQuota'}).storageQuota;
      const remaining = parseInt(quota.limit) - parseInt(quota.usage);
      return createJsonResponse({ status: 'success', remaining: remaining });
    }

    if (action === 'getLibrary') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "25");
      const search = e.parameter.search || "";
      const type = e.parameter.type || "All";
      const path = e.parameter.path || "";
      const sortKey = e.parameter.sortKey || "createdAt";
      const sortDir = e.parameter.sortDir || "desc";
      
      const result = getPaginatedItems(CONFIG.SPREADSHEETS.LIBRARY, "Collections", page, limit, search, type, path, sortKey, sortDir);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }
    if (action === 'getAiConfig') return createJsonResponse({ status: 'success', data: getProviderModel('GEMINI') });
    return createJsonResponse({ status: 'error', message: 'Invalid action: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch(e) {
    return createJsonResponse({ status: 'error', message: 'Malformed JSON request' });
  }
  
  const action = body.action;
  
  try {
    if (action === 'setupDatabase') return createJsonResponse(setupDatabase());
    
    // ACTION: checkQuota (POST support for Master-Slave communication)
    if (action === 'checkQuota') {
      const quota = Drive.About.get({fields: 'storageQuota'}).storageQuota;
      const remaining = parseInt(quota.limit) - parseInt(quota.usage);
      return createJsonResponse({ status: 'success', remaining: remaining });
    }

    // ACTION: saveJsonFile
    if (action === 'saveJsonFile') {
      const folderId = body.folderId || CONFIG.FOLDERS.MAIN_LIBRARY;
      const folder = DriveApp.getFolderById(folderId);
      const blob = Utilities.newBlob(body.content, 'application/json', body.fileName);
      const file = folder.createFile(blob);
      return createJsonResponse({ status: 'success', fileId: file.getId() });
    }

    // ACTION: saveFileDirect
    if (action === 'saveFileDirect') {
      const folderId = body.folderId || CONFIG.FOLDERS.MAIN_LIBRARY;
      const folder = DriveApp.getFolderById(folderId);
      const blob = Utilities.newBlob(Utilities.base64Decode(body.fileData), body.mimeType, body.fileName);
      const file = folder.createFile(blob);
      return createJsonResponse({ status: 'success', fileId: file.getId() });
    }

    // ACTION: deleteRemoteFiles (Support for Sharding Deletion)
    if (action === 'deleteRemoteFiles') {
      const fileIds = body.fileIds || [];
      fileIds.forEach(id => {
        if (id) permanentlyDeleteFile(id);
      });
      return createJsonResponse({ status: 'success' });
    }
    
    if (action === 'saveItem') {
      const item = body.item;
      const extractedText = body.extractedText || "";
      const isFileUpload = (body.file && body.file.fileData);
      
      // Determine required threshold based on method
      const threshold = isFileUpload ? CONFIG.STORAGE.THRESHOLD : CONFIG.STORAGE.CRITICAL_THRESHOLD;
      const storageTarget = getViableStorageTarget(threshold);

      // STORAGE GUARD: If no storage (Master or any Slaves) has enough space
      if (!storageTarget) {
        if (isFileUpload) {
          return createJsonResponse({ 
            status: 'error', 
            title: 'REGISTERING FAILED', 
            message: 'Your Storage tidak cukup, daftarkan storage baru atau gunakan metode save link atau identifier' 
          });
        } else {
          return createJsonResponse({ 
            status: 'error', 
            title: 'REGISTERING FAILED', 
            message: 'Your Storage is critical (below 2GB). Please register a new storage node to continue.' 
          });
        }
      }

      item.storageNodeUrl = storageTarget.url;

      // 1. SHARDING: Extracted Content JSON
      if (extractedText) {
        const jsonFileName = `extracted_${item.id}.json`;
        const jsonContent = JSON.stringify({ id: item.id, fullText: extractedText });
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const file = folder.createFile(Utilities.newBlob(jsonContent, 'application/json', jsonFileName));
          item.extractedJsonId = file.getId();
        } else {
          const res = UrlFetchApp.fetch(storageTarget.url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({ action: 'saveJsonFile', fileName: jsonFileName, content: jsonContent, folderId: storageTarget.folderId }),
            muteHttpExceptions: true
          });
          const resJson = JSON.parse(res.getContentText());
          if (resJson.status === 'success') item.extractedJsonId = resJson.fileId;
        }
      }

      // 2. SHARDING: Insight Data JSON
      if (!item.insightJsonId) {
        const insightFileName = `insight_${item.id}.json`;
        const insightContent = JSON.stringify({});
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const file = folder.createFile(Utilities.newBlob(insightContent, 'application/json', insightFileName));
          item.insightJsonId = file.getId();
        } else {
          const res = UrlFetchApp.fetch(storageTarget.url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({ action: 'saveJsonFile', fileName: insightFileName, content: insightContent, folderId: storageTarget.folderId }),
            muteHttpExceptions: true
          });
          const resJson = JSON.parse(res.getContentText());
          if (resJson.status === 'success') item.insightJsonId = resJson.fileId;
        }
      }

      // 3. SHARDING: Original File / Binary Data
      if (body.file && body.file.fileData) {
        const mimeType = body.file.mimeType || 'application/octet-stream';
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const blob = Utilities.newBlob(Utilities.base64Decode(body.file.fileData), mimeType, body.file.fileName);
          const file = folder.createFile(blob);
          item.fileId = file.getId();
        } else {
          const res = UrlFetchApp.fetch(storageTarget.url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({ action: 'saveFileDirect', fileName: body.file.fileName, mimeType: mimeType, fileData: body.file.fileData, folderId: storageTarget.folderId }),
            muteHttpExceptions: true
          });
          const resJson = JSON.parse(res.getContentText());
          if (resJson.status === 'success') {
            item.fileId = resJson.fileId;
            if (mimeType.toLowerCase().includes('image/')) item.imageView = 'https://lh3.googleusercontent.com/d/' + resJson.fileId;
          }
        }
      }

      if (item.url && (item.url.includes('youtube.com') || item.url.includes('youtu.be'))) {
        const ytid = extractYoutubeId(item.url);
        if (ytid) item.youtubeId = 'https://www.youtube.com/embed/' + ytid;
      }
      
      saveToSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", item);
      return createJsonResponse({ status: 'success' });
    }
    
    if (action === 'deleteItem') {
      deleteFromSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", body.id);
      return createJsonResponse({ status: 'success' });
    }
    
    if (action === 'extractOnly') {
      let extractedText = "";
      let fileName = body.fileName || "Extracted Content";
      let imageView = null;
      let detectedMime = null;
      let primaryDoiFromMeta = null;
      
      // STRICT REGEX Patterns - Ensure no cross-contamination
      const doiPattern = /10\.\d{4,9}\/[-._;()/:A-Z0-9]{5,}/i;
      const isbnPattern = /ISBN(?:-1[03])?:?\s*((?:97[89][\s-]?)?[0-9]{1,5}[\s-]?[0-9]+[\s-]?[0-9]+[\s-]?[0-9X])/i;
      const issnPattern = /ISSN:?\s*([0-9]{4}-?[0-9]{3}[0-9X])/i;
      const pmidPattern = /PMID:?\s*(\d{4,11})/i;
      const arxivPattern = /arXiv:?\s*(\d{4}\.\d{4,5}(?:v\d+)?)/i;

      let detectedDoi = null;
      let detectedIsbn = null;
      let detectedIssn = null;
      let detectedPmid = null;
      let detectedArxiv = null;

      try {
        if (body.url) {
          // STEP 1: SNIFF URL STRING (Strict checking)
          const urlDoiMatch = body.url.match(doiPattern);
          if (urlDoiMatch) detectedDoi = urlDoiMatch[0];
          
          const urlPmidMatch = body.url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
          if (urlPmidMatch) detectedPmid = urlPmidMatch[1];

          const urlArxivMatch = body.url.match(/arxiv\.org\/(?:pdf|abs)\/(\d{4}\.\d{4,5})/i);
          if (urlArxivMatch) detectedArxiv = urlArxivMatch[1];

          const driveId = getFileIdFromUrl(body.url);
          if (driveId && (body.url.includes('drive.google.com') || body.url.includes('docs.google.com'))) {
            try {
              const fileMeta = Drive.Files.get(driveId);
              detectedMime = fileMeta.mimeType;
              const isAudioVideo = detectedMime.includes('audio/') || detectedMime.includes('video/');
              if (isAudioVideo) {
                return createJsonResponse({ status: 'error', message: 'Audio/Video from Drive not supported.' });
              }
              if (detectedMime && detectedMime.toLowerCase().includes('image/')) imageView = 'https://lh3.googleusercontent.com/d/' + driveId;
            } catch (e) {}
          }
          
          extractedText = routerUrlExtraction(body.url);
          const doiMetaMatch = extractedText.match(/PRIMARY_DOI:\s*([^\n]+)/);
          if (doiMetaMatch) primaryDoiFromMeta = doiMetaMatch[1].trim();
        } else if (body.fileData) {
          extractedText = handleFileExtraction(body.fileData, body.mimeType, fileName);
          detectedMime = body.mimeType;
        }
      } catch (err) {
        extractedText = "Extraction failed: " + err.toString();
      }

      const snippet = extractedText.substring(0, 15000);
      
      // STEP 2: Content Scanning (Fallback)
      if (!detectedDoi) detectedDoi = primaryDoiFromMeta || (snippet.match(doiPattern) ? snippet.match(doiPattern)[0] : null);
      if (!detectedIsbn) detectedIsbn = snippet.match(isbnPattern) ? snippet.match(isbnPattern)[1] : null;
      if (!detectedIssn) detectedIssn = snippet.match(issnPattern) ? snippet.match(issnPattern)[1] : null;
      if (!detectedPmid) detectedPmid = snippet.match(pmidPattern) ? snippet.match(pmidPattern)[1] : null;
      if (!detectedArxiv) detectedArxiv = snippet.match(arxivPattern) ? (snippet.match(arxivPattern)[1] || snippet.match(arxivPattern)[0]) : null;

      // DOI CLEANUP
      if (detectedDoi && !primaryDoiFromMeta) {
        detectedDoi = detectedDoi.replace(/[.,;)]+$/, '');
        if (/[0-9][A-Z]{3,}$/.test(detectedDoi)) {
          const cleaned = detectedDoi.replace(/[A-Z]{3,}$/, '');
          if (cleaned.length > 7) detectedDoi = cleaned;
        }
      }

      return createJsonResponse({ 
        status: 'success', 
        extractedText: extractedText,
        fileName: fileName,
        mimeType: detectedMime,
        detectedDoi: detectedDoi,
        detectedIsbn: detectedIsbn,
        detectedIssn: detectedIssn,
        detectedPmid: detectedPmid,
        detectedArxiv: detectedArxiv,
        imageView: imageView
      });
    }

    if (action === 'searchByIdentifier') return createJsonResponse(handleIdentifierSearch(body.idValue));
    if (action === 'aiProxy') return createJsonResponse(handleAiRequest(body.provider, body.prompt, body.modelOverride));
    
    // NEW ACTION: getSupportingReferences
    if (action === 'getSupportingReferences') {
      return createJsonResponse({
        status: 'success',
        data: getSupportingReferencesFromCrossref(body.keywords || [])
      });
    }
    
    return createJsonResponse({ status: 'error', message: 'Invalid action: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function getViableStorageTarget(threshold) {
  const reqThreshold = threshold || CONFIG.STORAGE.THRESHOLD;
  
  // Gunakan Drive API v3 untuk akurasi kuota total (Gmail + Drive + Photos)
  const quota = Drive.About.get({fields: 'storageQuota'}).storageQuota;
  const localRemaining = parseInt(quota.limit) - parseInt(quota.usage);

  // Jika Master masih punya ruang di atas ambang batas, simpan secara lokal
  if (localRemaining > reqThreshold) {
    return { isLocal: true, url: ScriptApp.getService().getUrl(), folderId: CONFIG.FOLDERS.MAIN_LIBRARY };
  }

  // Jika Master hampir penuh, cari Slave di spreadsheet Registry
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.STORAGE_REGISTRY);
    const sheet = ss.getSheetByName(CONFIG.STORAGE.REGISTRY_SHEET);
    if (sheet) {
      const values = sheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        const nodeUrl = values[i][1];
        const folderId = values[i][2];
        if (!nodeUrl || !nodeUrl.toString().startsWith('http')) continue;
        try {
          // Cek kuota Slave
          const response = UrlFetchApp.fetch(nodeUrl, { 
            method: 'post', 
            contentType: 'application/json', 
            payload: JSON.stringify({ action: 'checkQuota' }), 
            muteHttpExceptions: true 
          });
          const resJson = JSON.parse(response.getContentText());
          if (resJson.status === 'success' && resJson.remaining > reqThreshold) {
            return { isLocal: false, url: nodeUrl, folderId: folderId };
          }
        } catch (nodeErr) {}
      }
    }
  } catch (e) {}

  // Jika Master dan SEMUA Slave tidak mencukupi, kembalikan null
  return null;
}

function extractYoutubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function routerUrlExtraction(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return handleYoutubeExtraction(url);
  const driveId = getFileIdFromUrl(url);
  if (driveId && (url.includes('drive.google.com') || url.includes('docs.google.com'))) return handleDriveExtraction(url, driveId);
  return handleWebExtraction(url);
}

function handleAiRequest(provider, prompt, modelOverride) {
  if (provider === 'groq') return callGroqLibrarian(prompt, modelOverride);
  return callGeminiService(prompt, modelOverride);
}
