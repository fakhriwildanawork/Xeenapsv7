
/**
 * XEENAPS PKM - GLOBAL CONFIGURATION
 */
const CONFIG = {
  FOLDERS: {
    MAIN_LIBRARY: '1CUvptRGnncn0M-vZdLCb1XBUmAeM9G8B'
  },
  STORAGE: {
    THRESHOLD: 5 * 1024 * 1024 * 1024, // 5 GB in bytes
    CRITICAL_THRESHOLD: 2 * 1024 * 1024 * 1024, // 2 GB for Link/Ref
    REGISTRY_SHEET: 'StorageNodes'
  },
  SPREADSHEETS: {
    LIBRARY: '1ROW4iyHN10DfDWaXL7O54mZi6Da9Xx70vU6oE-YW-I8',
    KEYS: '1Ji8XL2ceTprNa1dYvhfTnMDkWwzC937kpfyP19D7NvI',
    AI_CONFIG: '1RVYM2-U5LRb8S8JElRSEv2ICHdlOp9pnulcAM8Nd44s',
    STORAGE_REGISTRY: '1qBzgjhUv_aAFh5cLb8SqIt83bOdUFRfRXZz4TxyEZDw'
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
      'updatedAt',
      'supportingReferences'
    ]
  }
};
