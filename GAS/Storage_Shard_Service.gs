
/**
 * XEENAPS PKM - STORAGE SHARD SERVICE
 * Modul terpusat untuk mengambil konten file JSON dari storage node manapun.
 */
const StorageShardService = {
  
  /**
   * Mengambil konten JSON dari node (Lokal/Remote)
   * @param {string} fileId - ID File di Drive
   * @param {string} nodeUrl - URL Web App Node
   * @return {Object|null} - Data ter-parse atau null
   */
  getJsonContent: function(fileId, nodeUrl) {
    if (!fileId) return null;
    
    const currentUrl = ScriptApp.getService().getUrl();
    const isLocal = !nodeUrl || nodeUrl === "" || nodeUrl === currentUrl;
    
    try {
      if (isLocal) {
        const file = DriveApp.getFileById(fileId);
        const content = file.getBlob().getDataAsString();
        return JSON.parse(content);
      } else {
        const finalUrl = nodeUrl + (nodeUrl.indexOf('?') === -1 ? '?' : '&') + "action=getFileContent&fileId=" + fileId;
        const res = UrlFetchApp.fetch(finalUrl, { muteHttpExceptions: true });
        const resJson = JSON.parse(res.getContentText());
        
        if (resJson.status === 'success' && resJson.content) {
          // Response getFileContent dari Main.gs mengirim stringified JSON di dalam properti 'content'
          return JSON.parse(resJson.content);
        }
      }
    } catch (e) {
      console.error("StorageShardService Error: " + e.toString());
    }
    return null;
  }
};
