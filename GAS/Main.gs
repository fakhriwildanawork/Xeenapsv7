
/**
 * XEENAPS PKM - MAIN ROUTER (FULL VERSION WITH CLUSTER SECURITY)
 */

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    // Verifikasi Token untuk aksi sistem internal (seperti checkQuota)
    const token = e.parameter.token;
    if (action === 'checkQuota' && token !== CONFIG.SECURITY.INTERNAL_TOKEN) {
      return createJsonResponse({ status: 'error', message: 'Unauthorized' });
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
    
    if (action === 'getStorageNodes') {
      return createJsonResponse({ status: 'success', data: getStorageNodesList() });
    }

    if (action === 'checkQuota') {
      let total = 15 * 1024 * 1024 * 1024;
      try {
        const driveLimit = DriveApp.getStorageLimit();
        if (driveLimit > 0) total = driveLimit;
      } catch(e) {}
      const used = DriveApp.getStorageUsed();
      const remaining = Number(total) - Number(used);
      return createJsonResponse({ 
        status: 'success', 
        remaining: remaining, 
        used: used, 
        total: total,
        percent: ((used / total) * 100).toFixed(2)
      });
    }

    if (action === 'getAiConfig') return createJsonResponse({ status: 'success', data: getProviderModel('GEMINI') });
    return createJsonResponse({ status: 'error', message: 'Invalid GET action' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
    
    // VALIDASI KEAMANAN: Memastikan request memiliki token yang valid
    if (body.token !== CONFIG.SECURITY.INTERNAL_TOKEN) {
      console.error("Unauthorized attempt to access action: " + (body.action || "unknown"));
      return createJsonResponse({ status: 'error', message: 'Unauthorized access' });
    }
  } catch(err) {
    return createJsonResponse({ status: 'error', message: 'Bad request format' });
  }
  
  const action = body.action;
  
  try {
    // 1. DATABASE & CLUSTER OPS
    if (action === 'setupDatabase') return createJsonResponse(setupDatabase());
    
    if (action === 'addStorageNode') {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.STORAGE_REGISTRY);
      let sheet = ss.getSheetByName(CONFIG.STORAGE.REGISTRY_SHEET);
      if (!sheet) { setupDatabase(); sheet = ss.getSheetByName(CONFIG.STORAGE.REGISTRY_SHEET); }
      sheet.appendRow([body.label, body.nodeUrl, body.folderId, new Date().toISOString()]);
      return createJsonResponse({ status: 'success' });
    }

    // 2. REMOTE STORAGE ACTIONS (Called by Master to Slave)
    if (action === 'saveJsonFile') {
      const folderId = body.folderId || CONFIG.FOLDERS.MAIN_LIBRARY;
      const folder = DriveApp.getFolderById(folderId);
      const blob = Utilities.newBlob(body.content, 'application/json', body.fileName);
      const file = folder.createFile(blob);
      return createJsonResponse({ status: 'success', fileId: file.getId() });
    }

    if (action === 'saveFileDirect') {
      const folderId = body.folderId || CONFIG.FOLDERS.MAIN_LIBRARY;
      const folder = DriveApp.getFolderById(folderId);
      const blob = Utilities.newBlob(Utilities.base64Decode(body.fileData), body.mimeType, body.fileName);
      const file = folder.createFile(blob);
      return createJsonResponse({ status: 'success', fileId: file.getId() });
    }
    
    // 3. MAIN COLLECTION ACTIONS
    if (action === 'saveItem') {
      const item = body.item;
      const extractedText = body.extractedText || "";
      const storageTarget = getViableStorageTarget();
      item.storageNodeUrl = storageTarget.url;

      if (extractedText) {
        const jsonFileName = `extracted_${item.id}.json`;
        const jsonContent = JSON.stringify({ id: item.id, fullText: extractedText });
        if (storageTarget.isLocal) {
          const file = DriveApp.getFolderById(storageTarget.folderId).createFile(Utilities.newBlob(jsonContent, 'application/json', jsonFileName));
          item.extractedJsonId = file.getId();
        } else {
          const res = callSlave(storageTarget.url, { action: 'saveJsonFile', fileName: jsonFileName, content: jsonContent, folderId: storageTarget.folderId });
          if (res && res.status === 'success') item.extractedJsonId = res.fileId;
        }
      }

      if (body.file && body.file.fileData) {
        const mimeType = body.file.mimeType || 'application/octet-stream';
        if (storageTarget.isLocal) {
          const file = DriveApp.getFolderById(storageTarget.folderId).createFile(Utilities.newBlob(Utilities.base64Decode(body.file.fileData), mimeType, body.file.fileName));
          item.fileId = file.getId();
        } else {
          const res = callSlave(storageTarget.url, { action: 'saveFileDirect', fileName: body.file.fileName, mimeType: mimeType, fileData: body.file.fileData, folderId: storageTarget.folderId });
          if (res && res.status === 'success') {
            item.fileId = res.fileId;
            if (mimeType.toLowerCase().includes('image/')) item.imageView = 'https://lh3.googleusercontent.com/d/' + res.fileId;
          }
        }
      }
      
      saveToSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", item);
      return createJsonResponse({ status: 'success' });
    }
    
    if (action === 'deleteItem') {
      deleteFromSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", body.id);
      return createJsonResponse({ status: 'success' });
    }
    
    // 4. EXTRACTION & AI PROXY (RESTORED)
    if (action === 'extractOnly') {
      let extractedText = "";
      let fileName = body.fileName || "Extracted Content";
      let imageView = null;
      let detectedMime = null;
      
      const doiPattern = /10\.\d{4,9}\/[-._;()/:A-Z0-9]{5,}/i;
      const snippetLimit = 15000;

      if (body.url) {
        extractedText = routerUrlExtraction(body.url);
        fileName = body.url.split('/').pop() || "Webpage";
      } else if (body.fileData) {
        extractedText = handleFileExtraction(body.fileData, body.mimeType, fileName);
        detectedMime = body.mimeType;
      }

      const snippet = extractedText.substring(0, snippetLimit);
      const detectedDoi = snippet.match(doiPattern) ? snippet.match(doiPattern)[0] : null;

      return createJsonResponse({ 
        status: 'success', 
        extractedText: extractedText,
        fileName: fileName,
        mimeType: detectedMime,
        detectedDoi: detectedDoi,
        imageView: imageView
      });
    }

    if (action === 'searchByIdentifier') {
      return createJsonResponse(handleIdentifierSearch(body.idValue));
    }

    if (action === 'aiProxy') {
      return createJsonResponse(handleAiRequest(body.provider, body.prompt, body.modelOverride));
    }

    return createJsonResponse({ status: 'error', message: 'Invalid POST action: ' + action });
  } catch (err) {
    console.error("Critical error in doPost: " + err.message);
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * HELPER: Memanggil Slave (POST Internal)
 */
function callSlave(url, payload) {
  payload.token = CONFIG.SECURITY.INTERNAL_TOKEN;
  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      followRedirects: true
    });
    return JSON.parse(res.getContentText());
  } catch(e) {
    console.error("Slave Call Failed: " + e.message);
    return null;
  }
}

function getViableStorageTarget() {
  const THRESHOLD = Number(CONFIG.STORAGE.THRESHOLD);
  const localLimit = DriveApp.getStorageLimit() > 0 ? DriveApp.getStorageLimit() : 15 * 1024 * 1024 * 1024;
  const localUsed = DriveApp.getStorageUsed();
  const localRemaining = Number(localLimit) - Number(localUsed);
  
  if (localRemaining < THRESHOLD) {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.STORAGE_REGISTRY);
      const sheet = ss.getSheetByName(CONFIG.STORAGE.REGISTRY_SHEET);
      if (sheet) {
        const values = sheet.getDataRange().getValues();
        const requests = [];
        const nodeInfo = [];

        for (let i = 1; i < values.length; i++) {
          const nodeUrl = (values[i][1] || "").toString().trim();
          if (nodeUrl.startsWith('http')) {
            const separator = nodeUrl.includes('?') ? '&' : '?';
            requests.push({
              url: nodeUrl + separator + "action=checkQuota&token=" + CONFIG.SECURITY.INTERNAL_TOKEN,
              method: 'get',
              muteHttpExceptions: true,
              followRedirects: true
            });
            nodeInfo.push({ label: values[i][0], url: nodeUrl, folderId: values[i][2] });
          }
        }

        if (requests.length > 0) {
          const responses = UrlFetchApp.fetchAll(requests);
          for (let i = 0; i < responses.length; i++) {
            try {
              const resJson = JSON.parse(responses[i].getContentText());
              if (resJson.status === 'success' && Number(resJson.remaining) > THRESHOLD) {
                return { isLocal: false, url: nodeInfo[i].url, folderId: nodeInfo[i].folderId };
              }
            } catch(e) {}
          }
        }
      }
    } catch (e) {}
  }
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
    remaining: Number(localTotal) - Number(localUsed),
    percent: ((localUsed / localTotal) * 100).toFixed(2),
    status: 'online'
  }];

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.STORAGE_REGISTRY);
    const sheet = ss.getSheetByName(CONFIG.STORAGE.REGISTRY_SHEET);
    if (sheet) {
      const values = sheet.getDataRange().getValues();
      const requests = [];
      const nodeMeta = [];

      for (let i = 1; i < values.length; i++) {
        const nodeUrl = (values[i][1] || "").toString().trim();
        if (nodeUrl) {
          const separator = nodeUrl.includes('?') ? '&' : '?';
          requests.push({
            url: nodeUrl + separator + "action=checkQuota&token=" + CONFIG.SECURITY.INTERNAL_TOKEN,
            method: 'get',
            muteHttpExceptions: true,
            followRedirects: true
          });
          nodeMeta.push({ label: values[i][0], url: nodeUrl, folderId: values[i][2] });
        }
      }

      if (requests.length > 0) {
        const responses = UrlFetchApp.fetchAll(requests);
        for (let i = 0; i < responses.length; i++) {
          let nodeData = { label: nodeMeta[i].label, url: nodeMeta[i].url, folderId: nodeMeta[i].folderId, status: 'offline', total: 0, used: 0, remaining: 0, percent: 0 };
          try {
            const resJson = JSON.parse(responses[i].getContentText());
            if (resJson.status === 'success') {
              nodeData = { ...nodeData, status: 'online', total: resJson.total, used: resJson.used, remaining: resJson.remaining, percent: resJson.percent };
            }
          } catch(e) {}
          nodes.push(nodeData);
        }
      }
    }
  } catch(e) {}
  return nodes;
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
