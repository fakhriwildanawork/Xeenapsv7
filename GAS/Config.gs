
/**
 * XEENAPS PKM - GLOBAL CONFIGURATION
 */
const CONFIG = {
  FOLDERS: {
    MAIN_LIBRARY: '1CUvptRGnncn0M-vZdLCb1XBUmAeM9G8B'
  },
  // TOKEN INI HARUS SAMA DI SEMUA AKUN (MASTER & SLAVE)
  // Ganti dengan string acak buatan Anda sendiri
  SECURITY: {
    INTERNAL_TOKEN: 'XEENAPS_SECURE_CLUSTER_2025_TOKEN_XYZ' 
  },
  STORAGE: {
    THRESHOLD: 5 * 1024 * 1024 * 1024, // 5 GB
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
      'id', 'title', 'type', 'category', 'topic', 'subTopic', 'authors', 
      'publisher', 'year', 'fullDate', 'pubInfo', 'identifiers', 'source', 
      'format', 'url', 'fileId', 'imageView', 'youtubeId', 'tags', 'abstract', 
      'mainInfo', 'extractedJsonId', 'insightJsonId', 'storageNodeUrl',
      'isFavorite', 'isBookmarked', 'createdAt', 'updatedAt'
    ]
  }
};
