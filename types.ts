
export enum SourceType {
  LINK = 'LINK',
  FILE = 'FILE',
  NOTE = 'NOTE',
  BOOK = 'BOOK',
  VIDEO = 'VIDEO'
}

export enum FileFormat {
  PDF = 'PDF',
  DOCX = 'DOCX',
  MD = 'MD',
  MP4 = 'MP4',
  URL = 'URL',
  EPUB = 'EPUB',
  PPTX = 'PPTX',
  TXT = 'TXT',
  XLSX = 'XLSX',
  CSV = 'CSV',
  DOC = 'DOC',
  XLS = 'XLS',
  PPT = 'PPT'
}

export enum LibraryType {
  LITERATURE = 'Literature',
  TASK = 'Task',
  PERSONAL = 'Personal',
  OTHER = 'Other'
}

export interface PubInfo {
  journal?: string;
  vol?: string;
  issue?: string;
  pages?: string;
}

export interface Identifiers {
  doi?: string;
  issn?: string;
  isbn?: string;
  pmid?: string;
  arxiv?: string;
  bibcode?: string;
}

export interface TagsData {
  keywords: string[];
  labels: string[];
}

export interface LibraryItem {
  id: string;
  title: string;
  type: LibraryType;
  category: string;
  topic: string;
  subTopic: string;
  
  // New Merged Authors
  authors: string[]; 
  
  publisher: string;
  year: string;
  fullDate?: string;

  // New Merged JSON Objects
  pubInfo: PubInfo;
  identifiers: Identifiers;
  
  // Added flat fields for better integration with AI extraction results and UI components
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  issn?: string;
  isbn?: string;
  pmid?: string;
  arxivId?: string;
  bibcode?: string;

  source: SourceType;
  format: FileFormat;
  url?: string;
  fileId?: string;
  imageView?: string;
  youtubeId?: string;
  
  // New Merged Tags
  tags: TagsData;
  
  abstract?: string;
  mainInfo?: string; // For technical nouns indexing

  // AI Insights
  summary?: string;
  strength?: string;
  weakness?: string;
  quickTipsForYou?: string;
  supportingReferences?: string[]; // Updated to string array

  // Academic Citations
  inTextHarvard?: string;
  bibHarvard?: string;
  
  // Sharding IDs
  extractedJsonId?: string;
  insightJsonId?: string;
  storageNodeUrl?: string;
  
  // System Metadata
  isFavorite?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  updatedAt: string;

  // Legacy compatibility (optional to prevent immediate breaks)
  author?: string;
  keywords?: string[];
  labels?: string[];
}

export interface GASResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface ExtractionResult extends Partial<LibraryItem> {
  fullText?: string;
  chunks?: string[];
  aiSnippet?: string;
}

export type ViewState = 'LIBRARY' | 'ADD_ITEM' | 'SETTINGS' | 'AI_CHAT';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
