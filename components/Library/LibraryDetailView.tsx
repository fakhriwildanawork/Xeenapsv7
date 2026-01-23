
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LibraryItem, PubInfo, Identifiers } from '../../types';
import { 
  XMarkIcon, 
  ArrowLeftIcon,
  EyeIcon,
  BookmarkIcon,
  StarIcon,
  EllipsisVerticalIcon,
  PresentationChartBarIcon,
  ClipboardDocumentListIcon,
  ChatBubbleBottomCenterTextIcon,
  ShareIcon,
  AcademicCapIcon,
  LinkIcon,
  VideoCameraIcon,
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
  LightBulbIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  HashtagIcon,
  TagIcon,
  BeakerIcon,
  ClockIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { 
  BookmarkIcon as BookmarkSolid, 
  StarIcon as StarSolid
} from '@heroicons/react/24/solid';
import { showXeenapsToast } from '../../utils/toastUtils';
import { saveLibraryItem, deleteLibraryItem, generateCitations } from '../../services/gasService';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { FormDropdown } from '../Common/FormComponents';
import Header from '../Layout/Header';

interface LibraryDetailViewProps {
  item: LibraryItem;
  onClose: () => void;
  isLoading?: boolean;
  isMobileSidebarOpen?: boolean;
  onRefresh?: () => Promise<void>;
  onUpdateOptimistic?: (updatedItem: LibraryItem) => void;
  onDeleteOptimistic?: (id: string) => void;
}

/**
 * Tooltip Component for Premium Hover Effect
 */
const MiniTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-[100]">
    {text}
    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#004A74]"></div>
  </div>
);

/**
 * Citation Modal Component
 */
const CitationModal: React.FC<{ 
  item: LibraryItem; 
  onClose: () => void 
}> = ({ item, onClose }) => {
  const [style, setStyle] = useState('Harvard');
  const [language, setLanguage] = useState('English');
  const [results, setResults] = useState<{ parenthetical: string; narrative: string; bibliography: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Editable states
  const [editableParenthetical, setEditableParenthetical] = useState('');
  const [editableNarrative, setEditableNarrative] = useState('');
  const [editableBibliography, setEditableBibliography] = useState('');

  const styles = ['Harvard', 'APA 7th Edition', 'IEEE', 'Chicago', 'Vancouver', 'MLA 9th Edition'];
  const languages = ['English', 'Indonesian', 'French', 'German', 'Dutch'];

  const handleGenerate = async () => {
    setIsGenerating(true);
    const data = await generateCitations(item, style, language);
    if (data) {
      setResults(data);
      setEditableParenthetical(data.parenthetical);
      setEditableNarrative(data.narrative);
      setEditableBibliography(data.bibliography);
    }
    setIsGenerating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showXeenapsToast('success', 'Citation Copied!');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-2xl p-6 md:p-10 rounded-[3rem] w-full max-w-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] relative border border-white/20 flex flex-col max-h-[90vh] min-h-[500px] md:min-h-[650px]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
              <AcademicCapIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Citation Generator</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Premium Academic Standards</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"
          >
            <XMarkIcon className="w-8 h-8" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
          {/* Configuration Grid using Xeenaps FormDropdown (Search disabled for fixed options) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Citation Style</label>
              <FormDropdown 
                value={style} 
                onChange={(v) => setStyle(v)} 
                options={styles} 
                placeholder="Select style..."
                allowCustom={false}
                showSearch={false}
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Language</label>
              <FormDropdown 
                value={language} 
                onChange={(v) => setLanguage(v)} 
                options={languages} 
                placeholder="Select language..."
                allowCustom={false}
                showSearch={false}
                disabled={isGenerating}
              />
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-[#004A74]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isGenerating ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
            {isGenerating ? 'Processing...' : 'Cite Now'}
          </button>

          {/* Results Section */}
          {results && (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500 pb-4">
              <div className="h-px bg-gray-100 w-full" />
              
              {/* In-Text Parenthetical */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">In-Text (Parenthetical)</span>
                  <button onClick={() => copyToClipboard(editableParenthetical)} className="text-[#004A74] hover:scale-110 transition-transform"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                </div>
                <textarea 
                  value={editableParenthetical}
                  onChange={(e) => setEditableParenthetical(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-[#004A74] leading-relaxed focus:bg-white transition-all outline-none resize-none min-h-[60px]"
                />
              </div>

              {/* In-Text Narrative */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">In Narrative Citation</span>
                  <button onClick={() => copyToClipboard(editableNarrative)} className="text-[#004A74] hover:scale-110 transition-transform"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                </div>
                <textarea 
                  value={editableNarrative}
                  onChange={(e) => setEditableNarrative(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-[#004A74] leading-relaxed focus:bg-white transition-all outline-none resize-none min-h-[60px]"
                />
              </div>

              {/* Bibliography */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Bibliographic Citation</span>
                  <button onClick={() => copyToClipboard(editableBibliography)} className="text-[#004A74] hover:scale-110 transition-transform"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                </div>
                <textarea 
                  value={editableBibliography}
                  onChange={(e) => setEditableBibliography(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-[#004A74] leading-relaxed focus:bg-white transition-all outline-none resize-none min-h-[100px]"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Helper to safely format dates from ISO or raw strings.
 */
const formatDate = (dateStr: any) => {
  if (!dateStr || dateStr === 'N/A' || dateStr === 'Unknown') return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      if (/^\d{4}$/.test(String(dateStr).trim())) return dateStr;
      return null;
    }
    const day = d.getDate().toString().padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    if (String(dateStr).includes('T00:00:00') || String(dateStr).length < 10) return year.toString();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return null;
  }
};

/**
 * Helper to format creation/update time in "DD Mmm YYYY hh:mm"
 */
const formatTimeMeta = (dateStr: string) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const day = d.getDate().toString().padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  } catch {
    return "-";
  }
};

/**
 * Helper to parse dynamic JSON fields
 */
const parseJsonField = (field: any, defaultValue: any = {}) => {
  if (!field) return defaultValue;
  if (typeof field === 'object' && !Array.isArray(field)) return field;
  try {
    const parsed = typeof field === 'string' ? JSON.parse(field) : field;
    return parsed || defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

/**
 * Enhanced List Component with Primary Circle and Yellow Text
 */
const ElegantList: React.FC<{ text?: string; className?: string; isLoading?: boolean }> = ({ text, className = "", isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className="w-6 h-6 rounded-full skeleton shrink-0" />
            <div className="h-4 w-full skeleton rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!text || text === 'N/A' || text.trim() === '') return null;
  
  const items = text.split(/\n|(?=\d+\.)|(?=•)/)
    .map(i => i.replace(/^\d+\.\s*|•\s*/, '').trim())
    .filter(Boolean);
  
  if (items.length <= 1) {
    return (
      <div className={`text-sm leading-relaxed text-[#004A74] font-medium ${className}`} dangerouslySetInnerHTML={{ __html: text }} />
    );
  }

  return (
    <ol className={`space-y-3 list-none ${className}`}>
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-3 items-start group">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#004A74] text-[#FED400] text-[10px] font-black flex items-center justify-center shadow-sm">
            {idx + 1}
          </span>
          <span className="text-sm text-[#004A74]/90 leading-relaxed font-semibold" dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ol>
  );
};

const LibraryDetailView: React.FC<LibraryDetailViewProps> = ({ item, onClose, isLoading, isMobileSidebarOpen, onRefresh, onUpdateOptimistic, onDeleteOptimistic }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showCiteModal, setShowCiteModal] = useState(false);
  const [dummySearch, setDummySearch] = useState('');
  
  // Local states for interactivity
  const [isBookmarked, setIsBookmarked] = useState(!!item.isBookmarked);
  const [isFavorite, setIsFavorite] = useState(!!item.isFavorite);
  const [isSyncing, setIsSyncing] = useState(false);

  const pubInfo: PubInfo = useMemo(() => parseJsonField(item.pubInfo), [item.pubInfo]);
  const identifiers: Identifiers = useMemo(() => parseJsonField(item.identifiers), [item.identifiers]);
  const tags = useMemo(() => parseJsonField(item.tags, { keywords: [], labels: [] }), [item.tags]);
  const supportingData = useMemo(() => parseJsonField(item.supportingReferences, { references: [], videoUrl: null }), [item.supportingReferences]);
  
  const displayDate = formatDate(item.fullDate || item.year);
  const authorsText = Array.isArray(item.authors) ? item.authors.join(', ') : (item.authors || 'Unknown');

  const handleOpenLink = (url: string | null) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    showXeenapsToast('success', 'Reference Copied!');
  };

  const handleToggleAction = async (property: 'isBookmarked' | 'isFavorite') => {
    const newValue = property === 'isBookmarked' ? !isBookmarked : !isFavorite;
    
    // 1. Optimistic Local Update
    if (property === 'isBookmarked') setIsBookmarked(newValue);
    else setIsFavorite(newValue);
    
    const updatedItem = { ...item, [property]: newValue };
    
    // 2. Optimistic Parent Update (Table)
    if (onUpdateOptimistic) {
      onUpdateOptimistic(updatedItem);
    }

    // 3. Background Sync (Success Toast Removed for Snappiness)
    try {
      await saveLibraryItem(updatedItem);
    } catch (e) {
      // Rollback on failure
      if (property === 'isBookmarked') setIsBookmarked(!newValue);
      else setIsFavorite(!newValue);
      if (onUpdateOptimistic) onUpdateOptimistic(item);
      showXeenapsToast('error', 'Failed to sync with server');
    }
  };

  const handleViewCollection = () => {
    let targetUrl = '';
    if (item.fileId) {
      targetUrl = `https://drive.google.com/file/d/${item.fileId}/view`;
    } else if (item.url) {
      targetUrl = item.url;
    }
    
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleUpdate = () => {
    navigate(`/edit/${item.id}`);
  };

  const handleDelete = async () => {
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      // 1. Optimistic Instant Redirect
      if (onDeleteOptimistic) {
        onDeleteOptimistic(item.id);
      }
      onClose();
      navigate('/');
      showXeenapsToast('success', 'Processing Deletion...');

      // 2. Background Deletion
      try {
        await deleteLibraryItem(item.id);
      } catch (e) {
        showXeenapsToast('error', 'Critical Error: Deletion failed on server');
        if (onRefresh) onRefresh();
      }
    }
  };

  const hasViewLink = !!(item.fileId || item.url);

  return (
    <div 
      className={`fixed top-0 right-0 bottom-0 left-0 lg:left-16 z-[80] bg-white flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden transition-all ease-in-out border-l border-gray-100 ${isMobileSidebarOpen ? 'blur-[15px] opacity-40 pointer-events-none scale-[0.98]' : ''}`}
    >
      {showCiteModal && <CitationModal item={item} onClose={() => setShowCiteModal(false)} />}

      {/* 1. TOP STICKY AREA (Header + Action Bar) */}
      <div className="sticky top-0 z-[90] bg-white/95 backdrop-blur-xl border-b border-gray-100">
        {/* Integrated Header Component */}
        <div className="px-4 md:px-8">
           <Header 
            searchQuery={dummySearch} 
            setSearchQuery={setDummySearch} 
            onRefresh={onRefresh}
           />
        </div>

        {/* Action Bar (Nav Buttons) */}
        <nav className="px-4 md:px-8 py-3 flex items-center justify-between border-t border-gray-50/50">
          <button onClick={onClose} className="flex items-center gap-2 text-[#004A74] font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 px-3 py-2 rounded-xl transition-all">
            <ArrowLeftIcon className="w-4 h-4 stroke-[3]" /> Back
          </button>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowCiteModal(true)}
              className="flex items-center gap-2 px-5 py-2 bg-[#004A74] text-[#FED400] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md hover:scale-105 transition-all"
            >
              Cite
            </button>
            
            {hasViewLink && (
              <div className="relative group">
                <button 
                  onClick={handleViewCollection}
                  className="p-2 text-gray-400 hover:text-[#004A74] hover:bg-gray-50 rounded-xl transition-all outline-none"
                >
                  <EyeIcon className="w-5 h-5" />
                </button>
                <MiniTooltip text="View Document" />
              </div>
            )}

            <div className="relative group">
              <button 
                onClick={() => handleToggleAction('isBookmarked')}
                className="p-2 text-gray-400 hover:text-[#004A74] hover:bg-gray-50 rounded-xl transition-all outline-none"
              >
                {isBookmarked ? <BookmarkSolid className="w-5 h-5 text-[#004A74]" /> : <BookmarkIcon className="w-5 h-5" />}
              </button>
              <MiniTooltip text={isBookmarked ? "Unbookmark" : "Bookmark"} />
            </div>

            <div className="relative group">
              <button 
                onClick={() => handleToggleAction('isFavorite')}
                className="p-2 text-gray-400 hover:text-[#004A74] hover:bg-gray-50 rounded-xl transition-all outline-none"
              >
                {isFavorite ? <StarSolid className="w-5 h-5 text-[#FED400]" /> : <StarIcon className="w-5 h-5" />}
              </button>
              <MiniTooltip text={isFavorite ? "Remove from Favorites" : "Add to Favorites"} />
            </div>
            
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-400 hover:text-[#004A74] hover:bg-gray-50 rounded-xl transition-all"><EllipsisVerticalIcon className="w-5 h-5" /></button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-2 z-[90] animate-in fade-in zoom-in-95">
                  <button onClick={handleUpdate} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
                    <PencilIcon className="w-4 h-4" /> Update
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all"><PresentationChartBarIcon className="w-4 h-4" /> Presentation Mode</button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all"><ClipboardDocumentListIcon className="w-4 h-4" /> To-Do List</button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all"><AcademicCapIcon className="w-4 h-4" /> Export Metadata</button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all"><ShareIcon className="w-4 h-4" /> Share Entry</button>
                  <div className="h-px bg-gray-50 my-1 mx-2" />
                  <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    <TrashIcon className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-6 space-y-4">
          
          {/* 2. BLOK HEADER KONTEN */}
          <header className="bg-gray-50/50 p-6 md:p-10 rounded-[2.5rem] border border-gray-100 space-y-4 relative overflow-hidden">
            {isLoading && !isSyncing ? (
              <div className="space-y-4">
                <div className="flex gap-2"><div className="h-6 w-20 skeleton rounded-full"/><div className="h-6 w-20 skeleton rounded-full"/></div>
                <div className="h-10 w-full skeleton rounded-2xl"/>
                <div className="h-4 w-1/2 skeleton rounded-lg"/>
                <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                   <div className="h-3 w-1/4 skeleton rounded-md"/>
                   <div className="h-3 w-1/3 skeleton rounded-md"/>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-3 py-1 bg-[#004A74] text-white text-[8px] font-black uppercase tracking-widest rounded-full">{item.type}</span>
                  {item.category && <span className="px-3 py-1 bg-[#004A74]/10 text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{item.category}</span>}
                  <span className="px-3 py-1 bg-[#FED400] text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{item.topic}</span>
                  {item.subTopic && <span className="px-3 py-1 bg-[#004A74]/5 text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{item.subTopic}</span>}
                </div>

                <h1 className="text-xl md:text-2xl font-black text-[#004A74] leading-[1.2] break-words uppercase">{item.title}</h1>
                
                <div className="flex flex-col gap-1">
                  {displayDate && <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{displayDate}</p>}
                  <p className="text-sm font-bold text-[#004A74]">{authorsText === 'N/A' ? 'Unknown' : authorsText}</p>
                </div>

                {/* RESPONSIVE TIMESTAMPS: Relative on small screens, Absolute on desktop to avoid overlap */}
                <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end gap-0.5 opacity-60 md:absolute md:bottom-4 md:right-8 transition-all">
                   <div className="flex items-center gap-1.5">
                      <ClockIcon className="w-2.5 h-2.5" />
                      <span className="text-[7px] font-black uppercase tracking-tighter">Created: {formatTimeMeta(item.createdAt)}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <ArrowPathIcon className="w-2.5 h-2.5" />
                      <span className="text-[7px] font-black uppercase tracking-tighter">Updated: {formatTimeMeta(item.updatedAt)}</span>
                   </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-100">
                  {item.publisher && (
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-20 shrink-0 mt-0.5">Publisher</span>
                      <p className="text-[11px] font-bold text-gray-600">{item.publisher}</p>
                    </div>
                  )}
                  
                  {(pubInfo.journal || pubInfo.vol || pubInfo.issue || pubInfo.pages) && (
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-20 shrink-0 mt-0.5">Publication</span>
                      <p className="text-[11px] font-bold text-[#004A74]">
                        {[pubInfo.journal, pubInfo.vol ? `Vol. ${pubInfo.vol}` : '', pubInfo.issue ? `No. ${pubInfo.issue}` : '', pubInfo.pages ? `pp. ${pubInfo.pages}` : ''].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  )}

                  {Object.values(identifiers).some(v => v) && (
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-20 shrink-0 mt-0.5">Identifiers</span>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {identifiers.doi && <p className="text-[9px] font-mono font-bold text-gray-400 italic">DOI: {identifiers.doi}</p>}
                        {identifiers.issn && <p className="text-[9px] font-mono font-bold text-gray-400 italic">ISSN: {identifiers.issn}</p>}
                        {identifiers.isbn && <p className="text-[9px] font-mono font-bold text-gray-400 italic">ISBN: {identifiers.isbn}</p>}
                        {identifiers.pmid && <p className="text-[9px] font-mono font-bold text-gray-400 italic">PMID: {identifiers.pmid}</p>}
                        {identifiers.arxiv && <p className="text-[9px] font-mono font-bold text-gray-400 italic">arXiv: {identifiers.arxiv}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </header>

          {/* 3. BLOK TAGS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><HashtagIcon className="w-3 h-3" /> Keywords</h3>
              {isLoading && !isSyncing ? <div className="h-10 w-full skeleton rounded-xl" /> : (
                <div className="flex flex-wrap gap-1.5">
                  {tags.keywords?.length > 0 ? tags.keywords.map((k: string) => <span key={k} className="px-2.5 py-1 bg-[#004A74]/5 border border-[#004A74]/10 rounded-lg text-[9px] font-bold text-[#004A74]">{k}</span>) : <p className="text-[9px] text-gray-300 italic">No keywords.</p>}
                </div>
              )}
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><TagIcon className="w-3 h-3" /> Labels</h3>
              {isLoading && !isSyncing ? <div className="h-10 w-full skeleton rounded-xl" /> : (
                <div className="flex flex-wrap gap-1.5">
                  {tags.labels?.length > 0 ? tags.labels.map((l: string) => <span key={l} className="px-2.5 py-1 bg-[#FED400]/10 border border-[#FED400]/20 rounded-lg text-[9px] font-bold text-[#004A74]">{l}</span>) : <p className="text-[9px] text-gray-300 italic">No labels.</p>}
                </div>
              )}
            </div>
          </section>

          {/* 4. BLOK ABSTRACT */}
          <section className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><BookOpenIcon className="w-3.5 h-3.5" /> Abstract</h3>
            {isLoading && !isSyncing ? (
               <div className="space-y-2"><div className="h-4 w-full skeleton rounded-md"/><div className="h-4 w-full skeleton rounded-md"/><div className="h-4 w-3/4 skeleton rounded-md"/></div>
            ) : (
              <div className="text-sm leading-relaxed text-[#004A74] font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: item.abstract || 'No abstract content found.' }} />
            )}
          </section>

          {/* 5. BLOK INSIGHT */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-[#004A74] flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-[#FED400]" /> KNOWLEDGE INSIGHTS
              </h2>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[#004A74]/20 hover:scale-105 transition-all">
                  <SparklesIcon className="w-3 h-3" /> Generate
                </button>
                <button onClick={() => setShowTips(true)} className="p-2 bg-[#FED400] text-[#004A74] rounded-xl shadow-md hover:rotate-12 transition-all">
                  <LightBulbIcon className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {item.category === 'Original Research' && (
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3 md:col-span-2">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-[#004A74] flex items-center gap-2"><BeakerIcon className="w-3.5 h-3.5" /> Research Methodology</h3>
                  {isLoading && !isSyncing ? <div className="h-12 w-full skeleton rounded-xl" /> : (
                    <div className="text-sm font-medium italic text-[#004A74]/80" dangerouslySetInnerHTML={{ __html: item.summary || 'Methodology pending analysis.' }} />
                  )}
                </div>
              )}
              
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3 md:col-span-2">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><ClipboardDocumentListIcon className="w-3.5 h-3.5" /> Summary</h3>
                {isLoading && !isSyncing ? <div className="h-24 w-full skeleton rounded-xl" /> : (
                  <div className="text-sm leading-relaxed text-[#004A74] font-medium" dangerouslySetInnerHTML={{ __html: item.summary || 'Summary pending analysis.' }} />
                )}
              </div>

              <div className="bg-green-50/20 p-6 rounded-[2rem] border border-green-100/50 shadow-sm space-y-3">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-green-600 flex items-center gap-2">
                  <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" /> Strengths
                </h3>
                <ElegantList text={item.strength} isLoading={isLoading && !isSyncing} />
              </div>

              <div className="bg-red-50/20 p-6 rounded-[2rem] border border-red-100/50 shadow-sm space-y-3">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Weaknesses
                </h3>
                <ElegantList text={item.weakness} isLoading={isLoading && !isSyncing} />
              </div>

              <div className="bg-[#004A74]/5 p-6 rounded-[2rem] border border-[#004A74]/10 shadow-sm space-y-3 md:col-span-2">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-[#004A74] flex items-center gap-2">
                  <ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5" /> Unfamiliar Terminology
                </h3>
                <ElegantList text={item.quickTipsForYou} isLoading={isLoading && !isSyncing} />
              </div>
            </div>
          </section>

          {/* 6. BLOK SUPPORTING REFERENCE */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
            <div className="space-y-4">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5" /> Supporting References
              </h3>
              <div className="space-y-3">
                {isLoading && !isSyncing ? [...Array(2)].map((_, i) => <div key={i} className="h-20 w-full skeleton rounded-3xl" />) : (
                  supportingData.references?.length > 0 ? supportingData.references.map((ref: string, idx: number) => {
                    const urlMatch = ref.match(/https?:\/\/[^\s<]+/);
                    const url = urlMatch ? urlMatch[0].replace(/[.,;)]+$/, '') : null;
                    return (
                      <div key={idx} className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100 flex flex-col gap-3 transition-all hover:scale-[1.02] hover:shadow-md hover:bg-white group">
                        <div className="flex gap-3">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-[#004A74] text-[#FED400] text-[10px] font-black flex items-center justify-center shadow-sm">
                            {idx + 1}
                          </span>
                          <p className="text-xs font-semibold text-[#004A74]/80 leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: ref }} />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => handleCopy(e, ref.replace(/<[^>]*>/g, ''))}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#004A74] rounded-lg border border-gray-100 text-[9px] font-black uppercase tracking-tight shadow-sm hover:bg-[#FED400] transition-all"
                          >
                            <DocumentDuplicateIcon className="w-3 h-3" /> Copy
                          </button>
                          {url && (
                            <button 
                              onClick={() => handleOpenLink(url)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#004A74] text-white rounded-lg text-[9px] font-black uppercase tracking-tight shadow-sm hover:bg-[#003859] hover:scale-105 transition-all"
                            >
                              <ArrowTopRightOnSquareIcon className="w-3 h-3" /> Visit
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }) : <div className="py-6 text-center text-gray-300 text-[10px] font-bold uppercase italic">No supporting links.</div>
                )}
              </div>
            </div>

            <div className="bg-[#004A74] p-6 rounded-[2.5rem] shadow-xl space-y-4 flex flex-col">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
                <VideoCameraIcon className="w-3.5 h-3.5" /> Visual Insights
              </h3>
              <div className="flex-1 flex flex-col justify-center">
                {isLoading && !isSyncing ? <div className="aspect-video w-full skeleton rounded-2xl" /> : (
                  supportingData.videoUrl ? (
                    <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border-4 border-white/10 group transition-all hover:scale-[1.01]">
                      <iframe className="w-full h-full" src={supportingData.videoUrl} frameBorder="0" allowFullScreen></iframe>
                    </div>
                  ) : (
                    <div className="aspect-video rounded-2xl bg-white/5 flex flex-col items-center justify-center border-2 border-dashed border-white/10">
                      <VideoCameraIcon className="w-10 h-10 text-white/10 mb-2" />
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Video stream unavailable</p>
                    </div>
                  )
                )}
                <p className="mt-4 text-[10px] text-[#FED400]/80 font-bold italic text-center px-4 leading-relaxed">
                  "Conceptual visualization facilitates faster knowledge anchoring."
                </p>
              </div>
            </div>
          </section>

          <footer className="py-8 text-center">
             <div className="w-10 h-0.5 bg-gray-100 mx-auto mb-4 rounded-full" />
             <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.6em]">XEENAPS PKM SYSTEMS</p>
          </footer>
        </div>
      </div>

      {/* Quick Tips Modal */}
      {showTips && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#004A74] text-white p-8 md:p-12 rounded-[3rem] max-w-lg shadow-2xl relative border border-white/10">
            <button onClick={() => setShowTips(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"><XMarkIcon className="w-6 h-6" /></button>
            <LightBulbIcon className="w-10 h-10 text-[#FED400] mb-6 drop-shadow-[0_0_10px_rgba(254,212,0,0.5)]" />
            <h3 className="text-xl font-black mb-4 uppercase tracking-widest">Knowledge Anchor Tips</h3>
            <p className="text-sm font-medium italic leading-relaxed opacity-90 border-l-2 border-[#FED400] pl-4">"{item.quickTipsForYou || 'Generate AI insights to unlock specific tips for this collection.'}"</p>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #004A7430; border-radius: 10px; }
      `}</style>
    </div>
  );
}; 

export default LibraryDetailView;
