
/**
 * XEENAPS PKM - MAIN ROUTER
 */

function doGet(e) {
  try {
    const action = e.parameter.action;
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
    
    if (action === 'getStorageNodes') {
      return createJsonResponse({ status: 'success', data: getStorageNodesList() });
    }

    if (action === 'checkQuota') {
      let total = 15 * 1024 * 1024 * 1024; // Default 15GB
      try {
        const driveLimit = DriveApp.getStorageLimit();
        if (driveLimit > 0) total = driveLimit;
      } catch(e) {}
      
      const used = DriveApp.getStorageUsed();
      const remaining = total - used;
      
      return createJsonResponse({ 
        status: 'success', 
        remaining: Number(remaining), 
        used: used, 
        total: total,
        percent: ((used / total) * 100).toFixed(2)
      });
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
    
    // BACKUP POST handler for checkQuota
    if (action === 'checkQuota') {
      const total = DriveApp.getStorageLimit();
      const used = DriveApp.getStorageUsed();
      const remaining = total - used;
      return createJsonResponse({ 
        status: 'success', 
        remaining: remaining, 
        used: used, 
        total: total,
        percent: ((used / total) * 100).toFixed(2)
      });
    }

    // ACTION: addStorageNode
    if (action === 'addStorageNode') {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.STORAGE_REGISTRY);
      let sheet = ss.getSheetByName(CONFIG.STORAGE.REGISTRY_SHEET);
      if (!sheet) { setupDatabase(); sheet = ss.getSheetByName(CONFIG.STORAGE.REGISTRY_SHEET); }
      sheet.appendRow([body.label, body.nodeUrl, body.folderId, new Date().toISOString()]);
      return createJsonResponse({ status: 'success' });
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
    
    if (action === 'saveItem') {
      const item = body.item;
      const extractedText = body.extractedText || "";
      const storageTarget = getViableStorageTarget();
      
      item.storageNodeUrl = storageTarget.url;

      if (extractedText) {
        const jsonFileName = `extracted_${item.id}.json`;
        const jsonContent = JSON.stringify({ id: item.id, fullText: extractedText });
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const file = folder.createFile(Utilities.newBlob(jsonContent, 'application/json', jsonFileName));
          item.extractedJsonId = file.getId();
        } else {
          try {
            const res = UrlFetchApp.fetch(storageTarget.url, {
              method: 'post',
              contentType: 'application/json',
              payload: JSON.stringify({ action: 'saveJsonFile', fileName: jsonFileName, content: jsonContent, folderId: storageTarget.folderId }),
              muteHttpExceptions: true,
              followRedirects: true
            });
            const resJson = JSON.parse(res.getContentText());
            if (resJson.status === 'success') item.extractedJsonId = resJson.fileId;
          } catch(e) { console.error("Slave saveJsonFile error: " + e.message); }
        }
      }

      if (!item.insightJsonId) {
        const insightFileName = `insight_${item.id}.json`;
        const insightContent = JSON.stringify({});
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const file = folder.createFile(Utilities.newBlob(insightContent, 'application/json', insightFileName));
          item.insightJsonId = file.getId();
        } else {
          try {
            const res = UrlFetchApp.fetch(storageTarget.url, {
              method: 'post',
              contentType: 'application/json',
              payload: JSON.stringify({ action: 'saveJsonFile', fileName: insightFileName, content: insightContent, folderId: storageTarget.folderId }),
              muteHttpExceptions: true,
              followRedirects: true
            });
            const resJson = JSON.parse(res.getContentText());
            if (resJson.status === 'success') item.insightJsonId = resJson.fileId;
          } catch(e) { console.error("Slave insightJsonId error: " + e.message); }
        }
      }

      if (body.file && body.file.fileData) {
        const mimeType = body.file.mimeType || 'application/octet-stream';
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const blob = Utilities.newBlob(Utilities.base64Decode(body.file.fileData), mimeType, body.file.fileName);
          const file = folder.createFile(blob);
          item.fileId = file.getId();
        } else {
          try {
            const res = UrlFetchApp.fetch(storageTarget.url, {
              method: 'post',
              contentType: 'application/json',
              payload: JSON.stringify({ action: 'saveFileDirect', fileName: body.file.fileName, mimeType: mimeType, fileData: body.file.fileData, folderId: storageTarget.folderId }),
              muteHttpExceptions: true,
              followRedirects: true
            });
            const resJson = JSON.parse(res.getContentText());
            if (resJson.status === 'success') {
              item.fileId = resJson.fileId;
              if (mimeType.toLowerCase().includes('image/')) item.imageView = 'https://lh3.googleusercontent.com/d/' + resJson.fileId;
            }
          } catch(e) { console.error("Slave saveFileDirect error: " + e.message); }
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
      
      if (!detectedDoi) detectedDoi = primaryDoiFromMeta || (snippet.match(doiPattern) ? snippet.match(doiPattern)[0] : null);
      if (!detectedIsbn) detectedIsbn = snippet.match(isbnPattern) ? snippet.match(isbnPattern)[1] : null;
      if (!detectedIssn) detectedIssn = snippet.match(issnPattern) ? snippet.match(issnPattern)[1] : null;
      if (!detectedPmid) detectedPmid = snippet.match(pmidPattern) ? snippet.match(pmidPattern)[1] : null;
      if (!detectedArxiv) detectedArxiv = snippet.match(arxivPattern) ? (snippet.match(arxivPattern)[1] || snippet.match(arxivPattern)[0]) : null;

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
    if (action === 'aiProxy') return createJsonResponse(handleAiRequest(provider, prompt, modelOverride));
    return createJsonResponse({ status: 'error', message: 'Invalid action: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function getViableStorageTarget() {
  const THRESHOLD = Number(CONFIG.STORAGE.THRESHOLD);
  
  // Ambil sisa ruang Master dengan pertimbangan akun Workspace/Personal
  let localLimit = DriveApp.getStorageLimit();
  if (localLimit <= 0) localLimit = 15 * 1024 * 1024 * 1024; // Safety 15GB jika API limit fail
  const localRemaining = localLimit - DriveApp.getStorageUsed();
  
  console.log("Master Space Left: " + (localRemaining / (1024*1024*1024)).toFixed(2) + " GB");

  // Jika Master kritis (di bawah 5GB), cari Slave
  if (localRemaining < THRESHOLD) {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.STORAGE_REGISTRY);
      const sheet = ss.getSheetByName(CONFIG.STORAGE.REGISTRY_SHEET);
      if (sheet) {
        const values = sheet.getDataRange().getValues();
        // Cek semua Slave di Registry
        for (let i = 1; i < values.length; i++) {
          const nodeUrl = (values[i][1] || "").toString().trim();
          const folderId = (values[i][2] || "").toString().trim();
          if (!nodeUrl.startsWith('http')) continue;
          
          try {
            const separator = nodeUrl.includes('?') ? '&' : '?';
            const response = UrlFetchApp.fetch(nodeUrl + separator + "action=checkQuota", { 
              method: 'get', 
              muteHttpExceptions: true,
              followRedirects: true,
              timeout: 10000 
            });
            
            const resJson = JSON.parse(response.getContentText());
            if (resJson.status === 'success' && Number(resJson.remaining) > THRESHOLD) {
              console.log("Switching to Slave: " + values[i][0]);
              return { isLocal: false, url: nodeUrl, folderId: folderId };
            }
          } catch (e) { console.log("Slave check failed: " + nodeUrl); }
        }
      }
    } catch (e) { console.error("Registry access error: " + e.message); }
  }
  
  // Default kembali ke Master
  return { isLocal: true, url: ScriptApp.getService().getUrl(), folderId: CONFIG.FOLDERS.MAIN_LIBRARY };
}

function getStorageNodesList() {
  const localTotal = DriveApp.getStorageLimit() > 0 ? DriveApp.getStorageLimit() : 15 * 1024 * 1024 * 1024;
  const localUsed = DriveApp.getStorageUsed();
  
  const nodes = [{
    label: 'Master Account (Local)',
    url: ScriptApp.getService().getUrl(),
    folderId: CONFIG.FOLDERS.MAIN_LIBRARY,
    total: localTotal,
    used: localUsed,
    remaining: localTotal - localUsed,
    percent: ((localUsed / localTotal) * 100).toFixed(2),
    status: 'online'
  }];

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.STORAGE_REGISTRY);
    const sheet = ss.getSheetByName(CONFIG.STORAGE.REGISTRY_SHEET);
    if (sheet) {
      const values = sheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        const label = values[i][0];
        const nodeUrl = (values[i][1] || "").toString().trim();
        const folderId = (values[i][2] || "").toString().trim();
        if (!nodeUrl) continue;
        
        let nodeData = { label, url: nodeUrl, folderId, status: 'offline', total: 0, used: 0, remaining: 0, percent: 0 };
        try {
          const separator = nodeUrl.includes('?') ? '&' : '?';
          const response = UrlFetchApp.fetch(nodeUrl + separator + "action=checkQuota", { 
            method: 'get', 
            muteHttpExceptions: true,
            followRedirects: true,
            timeout: 8000 
          });
          
          const resJson = JSON.parse(response.getContentText());
          if (resJson.status === 'success') {
            nodeData = { ...nodeData, status: 'online', total: resJson.total, used: resJson.used, remaining: resJson.remaining, percent: resJson.percent };
          }
        } catch(e) {}
        nodes.push(nodeData);
      }
    }
  } catch(e) {}
  return nodes;
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
