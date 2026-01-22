
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
    
    // ACTION: checkQuota - Used by other nodes to verify storage availability
    if (action === 'checkQuota') {
      const remaining = DriveApp.getStorageLimit() - DriveApp.getStorageUsed();
      return createJsonResponse({ status: 'success', remaining: remaining });
    }

    // ACTION: saveJsonFile - Helper to create sharded JSON files
    if (action === 'saveJsonFile') {
      const folderId = body.folderId || CONFIG.FOLDERS.MAIN_LIBRARY;
      const folder = DriveApp.getFolderById(folderId);
      const blob = Utilities.newBlob(body.content, 'application/json', body.fileName);
      const file = folder.createFile(blob);
      return createJsonResponse({ status: 'success', fileId: file.getId() });
    }

    // ACTION: saveFileDirect - Existing file upload handler
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
      
      // DETERMINING STORAGE TARGET (Smart Switch Logic)
      const storageTarget = getViableStorageTarget();
      item.storageNodeUrl = storageTarget.url; // Main app URL if local, otherwise Node URL

      // 1. Handle Sharding: Create extractedJsonId file
      if (extractedText) {
        const jsonFileName = `extracted_${item.id}.json`;
        const jsonContent = JSON.stringify({ id: item.id, fullText: extractedText });
        
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const file = folder.createFile(Utilities.newBlob(jsonContent, 'application/json', jsonFileName));
          item.extractedJsonId = file.getId();
        } else {
          // Send to Node
          const res = UrlFetchApp.fetch(storageTarget.url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({
              action: 'saveJsonFile',
              fileName: jsonFileName,
              content: jsonContent,
              folderId: storageTarget.folderId
            }),
            muteHttpExceptions: true
          });
          const resJson = JSON.parse(res.getContentText());
          if (resJson.status === 'success') item.extractedJsonId = resJson.fileId;
        }
      }

      // 2. MANDATORY LOCK-IN: Create insightJsonId placeholder ({})
      if (!item.insightJsonId) {
        const insightFileName = `insight_${item.id}.json`;
        const insightContent = JSON.stringify({});
        
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const file = folder.createFile(Utilities.newBlob(insightContent, 'application/json', insightFileName));
          item.insightJsonId = file.getId();
        } else {
          // Send to Node
          const res = UrlFetchApp.fetch(storageTarget.url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({
              action: 'saveJsonFile',
              fileName: insightFileName,
              content: insightContent,
              folderId: storageTarget.folderId
            }),
            muteHttpExceptions: true
          });
          const resJson = JSON.parse(res.getContentText());
          if (resJson.status === 'success') item.insightJsonId = resJson.fileId;
        }
      }

      // 3. Handle Physical File Upload
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
            payload: JSON.stringify({
              action: 'saveFileDirect',
              fileName: body.file.fileName,
              mimeType: mimeType,
              fileData: body.file.fileData,
              folderId: storageTarget.folderId
            }),
            muteHttpExceptions: true
          });
          const resJson = JSON.parse(res.getContentText());
          if (resJson.status === 'success') {
            item.fileId = resJson.fileId;
            if (mimeType.toLowerCase().includes('image/')) {
              item.imageView = 'https://lh3.googleusercontent.com/d/' + resJson.fileId;
            }
          }
        }
      }

      // 4. Handle YouTube ID Logic
      if (item.url && (item.url.includes('youtube.com') || item.url.includes('youtu.be'))) {
        const ytid = extractYoutubeId(item.url);
        if (ytid) {
          item.youtubeId = 'https://www.youtube.com/embed/' + ytid;
        }
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
      
      try {
        if (body.url) {
          const driveId = getFileIdFromUrl(body.url);
          if (driveId && (body.url.includes('drive.google.com') || body.url.includes('docs.google.com'))) {
            try {
              const fileMeta = Drive.Files.get(driveId);
              detectedMime = fileMeta.mimeType;
              if (detectedMime && detectedMime.toLowerCase().includes('image/')) {
                imageView = 'https://lh3.googleusercontent.com/d/' + driveId;
              }
            } catch (e) {}
          }
          extractedText = routerUrlExtraction(body.url);
        } else if (body.fileData) {
          extractedText = handleFileExtraction(body.fileData, body.mimeType, fileName);
          detectedMime = body.mimeType;
        }
      } catch (err) {
        extractedText = "Extraction failed: " + err.toString();
      }

      const snippet = extractedText.substring(0, 7500);

      const doiPattern = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i;
      const isbnPattern = /(?:ISBN(?:-1[03])?:?\s*)?(?=[0-9X\s-]{10,17}$)(?:97[89][\s-]?)?[0-9]{1,5}[\s-]?[0-9]+[\s-]?[0-9]+[\s-]?[0-9X]/i;
      const pmidPattern = /PMID:?\s*(\d{4,10})/i;
      const arxivPattern = /arXiv:?\s*(\d{4}\.\d{4,5}(?:v\d+)?)/i;

      const doiMatch = snippet.match(doiPattern);
      const isbnMatch = snippet.match(isbnPattern);
      const pmidMatch = snippet.match(pmidPattern);
      const arxivMatch = snippet.match(arxivPattern);

      return createJsonResponse({ 
        status: 'success', 
        extractedText: extractedText,
        fileName: fileName,
        mimeType: detectedMime,
        detectedDoi: doiMatch ? doiMatch[0] : null,
        detectedIsbn: isbnMatch ? isbnMatch[0] : null,
        detectedArxiv: arxivMatch ? (arxivMatch[1] || arxivMatch[0]) : null,
        imageView: imageView
      });
    }

    if (action === 'searchByIdentifier') {
      return createJsonResponse(handleIdentifierSearch(body.idValue));
    }
    
    if (action === 'aiProxy') {
      const { provider, prompt, modelOverride } = body;
      const result = handleAiRequest(provider, prompt, modelOverride);
      return createJsonResponse(result);
    }
    return createJsonResponse({ status: 'error', message: 'Invalid action: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * SMART STORAGE NODE SELECTOR
 * Implements the 5GB threshold and sequential node checking.
 */
function getViableStorageTarget() {
  const THRESHOLD = CONFIG.STORAGE.THRESHOLD;
  const localRemaining = DriveApp.getStorageLimit() - DriveApp.getStorageUsed();
  
  // 1. Check Local Primary Account
  if (localRemaining > THRESHOLD) {
    return { 
      isLocal: true, 
      url: ScriptApp.getService().getUrl(), 
      folderId: CONFIG.FOLDERS.MAIN_LIBRARY 
    };
  }
  
  // 2. Iterate through Registry Nodes
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.STORAGE_REGISTRY);
    const sheet = ss.getSheetByName(CONFIG.STORAGE.REGISTRY_SHEET);
    if (!sheet) throw new Error("Registry missing");
    
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      const nodeUrl = values[i][1];
      const folderId = values[i][2]; // Column C: Folder ID
      
      if (!nodeUrl || !nodeUrl.toString().startsWith('http')) continue;
      
      try {
        const response = UrlFetchApp.fetch(nodeUrl, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ action: 'checkQuota' }),
          muteHttpExceptions: true
        });
        const resJson = JSON.parse(response.getContentText());
        
        if (resJson.status === 'success' && resJson.remaining > THRESHOLD) {
          return { isLocal: false, url: nodeUrl, folderId: folderId };
        }
      } catch (nodeErr) {
        console.warn(`Node ${nodeUrl} unreachable or error: ${nodeErr.message}`);
      }
    }
  } catch (e) {
    console.error("Critical Registry Failure: " + e.message);
  }
  
  // 3. Absolute Fallback: Main Library (Better full than lost)
  return { 
    isLocal: true, 
    url: ScriptApp.getService().getUrl(), 
    folderId: CONFIG.FOLDERS.MAIN_LIBRARY 
  };
}

function extractYoutubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function routerUrlExtraction(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return handleYoutubeExtraction(url);
  }
  const driveId = getFileIdFromUrl(url);
  if (driveId && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
    return handleDriveExtraction(url, driveId);
  }
  return handleWebExtraction(url);
}

function handleAiRequest(provider, prompt, modelOverride) {
  if (provider === 'groq') {
    return callGroqLibrarian(prompt, modelOverride);
  } else {
    return callGeminiService(prompt, modelOverride);
  }
}
