
/**
 * XEENAPS PKM - GLOBAL CONFIGURATION
 */
const CONFIG = {
  FOLDERS: {
    MAIN_LIBRARY: '1WG5W6KHHLhKVK-eCq1bIQYif0ZoSxh9t'
  },
  STORAGE: {
    THRESHOLD: 5 * 1024 * 1024 * 1024, // 5 GB in bytes
    CRITICAL_THRESHOLD: 2 * 1024 * 1024 * 1024, // 2 GB for Link/Ref
    REGISTRY_SHEET: 'StorageNodes'
  },
  SPREADSHEETS: {
    LIBRARY: '1NSofMlK1eENfucu2_aF-A3JRwAwTXi7QzTsuPGyFk8w',
    KEYS: '1QRzqKe42ck2HhkA-_yAGS-UHppp96go3s5oJmlrwpc0',
    AI_CONFIG: '1RVYM2-U5LRb8S8JElRSEv2ICHdlOp9pnulcAM8Nd44s',
    STORAGE_REGISTRY: '1F7ayViIAcqY2sSNSA4xB2rms1gDGAc7sI5LEQu6OiHY'
  },
  SCHEMAS: {
    LIBRARY: [
      'id', 
      'title', 
      'type', 
      'category', 
      'topic', 
      'subTopic', 
      'authors', // Merged JSON Array
      'publisher', 
      'year', 
      'fullDate',
      'pubInfo', // Merged JSON Object (journal, vol, issue, pages)
      'identifiers', // Merged JSON Object (doi, issn, isbn, pmid, arxiv, bibcode)
      'source', 
      'format', 
      'url', 
      'fileId', 
      'imageView', 
      'youtubeId', 
      'tags', // Merged JSON Object (keywords, labels)
      'abstract', 
      'mainInfo', // Search Indexer (Plain Text)
      'extractedJsonId', 
      'insightJsonId', 
      'storageNodeUrl',
      'isFavorite', 
      'isBookmarked', 
      'createdAt', 
      'updatedAt'
    ]
  }
};
