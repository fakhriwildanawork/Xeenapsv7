
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
  ClipboardDocumentListIcon,
  ChatBubbleBottomCenterTextIcon,
  AcademicCapIcon,
  LinkIcon,
  VideoCameraIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
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
import { saveLibraryItem, deleteLibraryItem, generateCitations, generateInsight, fetchFileContent } from '../../services/gasService';
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
      <div className="bg-white/90 backdrop-blur-2xl p-6 md:p-10 rounded-[3rem] w-full max-w-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] relative border border-white/20 flex flex-col max-h-[85vh] min-h-[450px] md:min-h-[580px]">
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
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
            <XMarkIcon className="w-8 h-8" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Citation Style</label>
              <FormDropdown value={style} onChange={(v) => setStyle(v)} options={styles} placeholder="Select style..." allowCustom={false} showSearch={false} disabled={isGenerating} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Language</label>
              <FormDropdown value={language} onChange={(v) => setLanguage(v)} options={languages} placeholder="Select language..." allowCustom={false} showSearch={false} disabled={isGenerating} />
            </div>
          </div>
          <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-4 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-[#004A74]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
            {isGenerating ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
            {isGenerating ? 'Processing...' : 'Cite Now'}
          </button>
          {results && (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500 pb-4">
              <div className="h-px bg-gray-100 w-full" />
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">In-Text (Parenthetical)</span>
                  <button onClick={() => copyToClipboard(editableParenthetical)} className="text-[#004A74] hover:scale-110 transition-transform"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                </div>
                <textarea value={editableParenthetical} onChange={(e) => setEditableParenthetical(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-[#004A74] leading-relaxed focus:bg-white transition-all outline-none resize-none min-h-[60px]" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">In Narrative Citation</span>
                  <button onClick={() => copyToClipboard(editableNarrative)} className="text-[#004A74] hover:scale-110 transition-transform"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                </div>
                <textarea value={editableNarrative} onChange={(e) => setEditableNarrative(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-[#004A74] leading-relaxed focus:bg-white transition-all outline-none resize-none min-h-[60px]" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Bibliographic Citation</span>
                  <button onClick={() => copyToClipboard(editableBibliography)} className="text-[#004A74] hover:scale-110 transition-transform"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                </div>
                <textarea value={editableBibliography} onChange={(e) => setEditableBibliography(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-[#004A74] leading-relaxed focus:bg-white transition-all outline-none resize-none min-h-[100px]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
  } catch (e) { return null; }
};

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
  } catch { return "-"; }
};

const parseJsonField = (field: any, defaultValue: any = {}) => {
  if (!field) return defaultValue;
  if (typeof field === 'object' && !Array.isArray(field)) return field;
  try {
    const parsed = typeof field === 'string' ? JSON.parse(field) : field;
    return parsed || defaultValue;
  } catch (e) { return defaultValue; }
};

const ElegantList: React.FC<{ text?: any; className?: string; isLoading?: boolean }> = ({ text, className = "", isLoading }) => {
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
  if (text === null || text === undefined || text === 'N/A') return null;
  if (typeof text === 'string' && (text.includes('<b>') || text.includes('<br'))) {
    return (
      <div className={`text-sm leading-relaxed text-[#004A74] font-medium ${className}`} dangerouslySetInnerHTML={{ __html: text }} />
    );
  }
  let items: string[] = [];
  if (Array.isArray(text)) {
    items = text.map(i => String(i).trim()).filter(Boolean);
  } else if (typeof text === 'string') {
    const trimmedText = text.trim();
    if (trimmedText === '') return null;
    items = trimmedText.split(/\n|(?=\d+\.)|(?=•)/).map(i => i.replace(/^\d+\.\s*|•\s*/, '').trim()).filter(Boolean);
  } else {
    const strVal = String(text).trim();
    if (strVal === '') return null;
    items = [strVal];
  }
  if (items.length === 0) return null;
  return (
    <ol className={`space-y-3 list-none ${className}`}>
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-3 items-start group">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#004A74] text-[#FED400] text-[10px] font-black flex items-center justify-center shadow-sm">{idx + 1}</span>
          <span className="text-sm text-[#004A74]/90 leading-relaxed font-semibold" dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ol>
  );
};

const LibraryDetailView: React.FC<LibraryDetailViewProps> = ({ item, onClose, isLoading, isMobileSidebarOpen, onRefresh, onUpdateOptimistic, onDeleteOptimistic }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCiteModal, setShowCiteModal] = useState(false);
  const [dummySearch, setDummySearch] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(!!item.isBookmarked);
  const [isFavorite, setIsFavorite] = useState(!!item.isFavorite);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isFetchingStoredInsights, setIsFetchingStoredInsights] = useState(false);
  const [currentItem, setCurrentItem] = useState(item);

  useEffect(() => {
    const loadJsonInsights = async () => {
      if (item.insightJsonId) {
        setIsFetchingStoredInsights(true);
        const jsonInsights = await fetchFileContent(item.insightJsonId, item.storageNodeUrl);
        if (jsonInsights && Object.keys(jsonInsights).length > 0) {
          setCurrentItem(prev => ({ ...prev, ...jsonInsights }));
        }
        setIsFetchingStoredInsights(false);
      }
    };
    setCurrentItem(item);
    loadJsonInsights();
  }, [item]);

  const pubInfo: PubInfo = useMemo(() => parseJsonField(currentItem.pubInfo), [currentItem.pubInfo]);
  const identifiers: Identifiers = useMemo(() => parseJsonField(currentItem.identifiers), [currentItem.identifiers]);
  const tags = useMemo(() => parseJsonField(currentItem.tags, { keywords: [], labels: [] }), [currentItem.tags]);
  const supportingData = useMemo(() => parseJsonField(currentItem.supportingReferences, { references: [], videoUrl: null }), [currentItem.supportingReferences]);
  
  const displayDate = formatDate(currentItem.fullDate || currentItem.year);
  const authorsText = Array.isArray(currentItem.authors) ? currentItem.authors.join(', ') : (currentItem.authors || 'Unknown');

  const handleToggleAction = async (property: 'isBookmarked' | 'isFavorite') => {
    const newValue = property === 'isBookmarked' ? !isBookmarked : !isFavorite;
    if (property === 'isBookmarked') setIsBookmarked(newValue);
    else setIsFavorite(newValue);
    const updatedItem = { ...currentItem, [property]: newValue };
    if (onUpdateOptimistic) onUpdateOptimistic(updatedItem);
    try { await saveLibraryItem(updatedItem); } catch (e) {
      if (property === 'isBookmarked') setIsBookmarked(!newValue);
      else setIsFavorite(!newValue);
      if (onUpdateOptimistic) onUpdateOptimistic(item);
      showXeenapsToast('error', 'Failed to sync with server');
    }
  };

  const handleGenerateInsights = async () => {
    if (isGeneratingInsights) return;
    setIsGeneratingInsights(true);
    showXeenapsToast('info', 'AI Insighter is analyzing content...');
    try {
      const data = await generateInsight(currentItem);
      if (data) {
        const updated = { ...currentItem, ...data, updatedAt: new Date().toISOString() };
        setCurrentItem(updated);
        showXeenapsToast('success', 'Deep Insights Generated!');
      } else { showXeenapsToast('error', 'Analysis failed on server'); }
    } catch (e) { showXeenapsToast('error', 'Connection error'); } finally { setIsGeneratingInsights(false); }
  };

  const handleViewCollection = () => {
    let targetUrl = '';
    if (currentItem.fileId) targetUrl = `https://drive.google.com/file/d/${currentItem.fileId}/view`;
    else if (currentItem.url) targetUrl = currentItem.url;
    if (targetUrl) window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async () => {
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      if (onDeleteOptimistic) onDeleteOptimistic(currentItem.id);
      onClose(); navigate('/'); showXeenapsToast('success', 'Deleting...');
      try { await deleteLibraryItem(currentItem.id); } catch (e) { showXeenapsToast('error', 'Deletion failed'); }
    }
  };

  const hasViewLink = !!(currentItem.fileId || currentItem.url);
  const isAnyLoading = isGeneratingInsights || isFetchingStoredInsights;

  return (
    <div className={`fixed top-0 right-0 bottom-0 left-0 lg:left-16 z-[80] bg-white flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden transition-all border-l border-gray-100 ${isMobileSidebarOpen ? 'blur-[15px] opacity-40 pointer-events-none' : ''}`}>
      {showCiteModal && <CitationModal item={currentItem} onClose={() => setShowCiteModal(false)} />}
      <div className="sticky top-0 z-[90] bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="px-4 md:px-8"><Header searchQuery={dummySearch} setSearchQuery={setDummySearch} onRefresh={onRefresh} /></div>
        <nav className="px-4 md:px-8 py-3 flex items-center justify-between border-t border-gray-50/50">
          <button onClick={onClose} className="flex items-center gap-2 text-[#004A74] font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 px-3 py-2 rounded-xl transition-all"><ArrowLeftIcon className="w-4 h-4 stroke-[3]" /> Back</button>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCiteModal(true)} className="px-5 py-2 bg-[#004A74] text-[#FED400] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md">Cite</button>
            {hasViewLink && <button onClick={handleViewCollection} className="p-2 text-gray-400 hover:text-[#004A74] rounded-xl"><EyeIcon className="w-5 h-5" /></button>}
            <button onClick={() => handleToggleAction('isBookmarked')} className="p-2 text-gray-400 hover:text-[#004A74] rounded-xl">{isBookmarked ? <BookmarkSolid className="w-5 h-5 text-[#004A74]" /> : <BookmarkIcon className="w-5 h-5" />}</button>
            <button onClick={() => handleToggleAction('isFavorite')} className="p-2 text-gray-400 hover:text-[#004A74] rounded-xl">{isFavorite ? <StarSolid className="w-5 h-5 text-[#FED400]" /> : <StarIcon className="w-5 h-5" />}</button>
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-400 hover:text-[#004A74] rounded-xl"><EllipsisVerticalIcon className="w-5 h-5" /></button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-[90]">
                  <button onClick={() => navigate(`/edit/${currentItem.id}`)} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl"><PencilIcon className="w-4 h-4" /> Update</button>
                  <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl"><TrashIcon className="w-4 h-4" /> Delete</button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-6 space-y-6">
          <header className="bg-gray-50/50 p-6 md:p-10 rounded-[2.5rem] border border-gray-100 space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <span className="px-3 py-1 bg-[#004A74] text-white text-[8px] font-black uppercase tracking-widest rounded-full">{currentItem.type}</span>
              <span className="px-3 py-1 bg-[#FED400] text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{currentItem.topic}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-[#004A74] break-words uppercase">{currentItem.title}</h1>
            <div className="flex flex-col gap-1">
              {displayDate && <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{displayDate}</p>}
              <p className="text-sm font-bold text-[#004A74]">{authorsText}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100/50">
              <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Publisher</p><p className="text-xs font-bold text-[#004A74]">{currentItem.publisher || '-'}</p></div>
              <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Journal</p><p className="text-xs font-bold text-[#004A74]">{pubInfo.journal || '-'}</p></div>
              <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Vol / Issue</p><p className="text-xs font-bold text-[#004A74]">{pubInfo.vol || '-'}{pubInfo.issue ? ` (${pubInfo.issue})` : ''}</p></div>
              <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Pages</p><p className="text-xs font-bold text-[#004A74]">{pubInfo.pages || '-'}</p></div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <section className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><BookOpenIcon className="w-3.5 h-3.5" /> Abstract</h3>
                <div className="text-sm leading-relaxed text-[#004A74] font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: currentItem.abstract || 'No abstract found.' }} />
              </section>
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-[#004A74] flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-[#FED400]" /> KNOWLEDGE INSIGHTS</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={handleGenerateInsights} disabled={isGeneratingInsights} className="flex items-center gap-2 px-4 py-2 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg disabled:opacity-50">
                      {isGeneratingInsights ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <SparklesIcon className="w-3 h-3" />} {isGeneratingInsights ? 'Analyzing...' : 'Generate'}
                    </button>
                    {isFetchingStoredInsights && <ArrowPathIcon className="w-4 h-4 text-[#004A74] animate-spin" />}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><ClipboardDocumentListIcon className="w-3.5 h-3.5" /> Summary</h3>
                    {isAnyLoading ? <div className="h-4 w-full skeleton rounded-md" /> : <div className="text-sm leading-relaxed text-[#004A74] font-medium" dangerouslySetInnerHTML={{ __html: currentItem.summary || 'Summary pending analysis.' }} />}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50/20 p-6 rounded-[2rem] border border-green-100 shadow-sm space-y-3">
                      <h3 className="text-[9px] font-black uppercase tracking-widest text-green-600 flex items-center gap-2"><ClipboardDocumentCheckIcon className="w-3.5 h-3.5" /> Strengths</h3>
                      <ElegantList text={currentItem.strength} isLoading={isAnyLoading} />
                    </div>
                    <div className="bg-red-50/20 p-6 rounded-[2rem] border border-red-100 shadow-sm space-y-3">
                      <h3 className="text-[9px] font-black uppercase tracking-widest text-red-600 flex items-center gap-2"><ExclamationTriangleIcon className="w-3.5 h-3.5" /> Weaknesses</h3>
                      <ElegantList text={currentItem.weakness} isLoading={isAnyLoading} />
                    </div>
                  </div>
                  <div className="bg-[#004A74]/5 p-6 rounded-[2rem] border border-[#004A74]/10 shadow-sm space-y-3">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-[#004A74] flex items-center gap-2"><ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5" /> Unfamiliar Terminology</h3>
                    <ElegantList text={currentItem.unfamiliarTerminology} isLoading={isAnyLoading} />
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><LinkIcon className="w-3.5 h-3.5" /> Identifiers</h3>
                <div className="space-y-3">
                  {identifiers.doi && <div className="p-3 bg-white rounded-xl border border-gray-100"><p className="text-[7px] font-black text-gray-400 uppercase">DOI</p><p className="text-[10px] font-bold text-[#004A74] truncate">{identifiers.doi}</p></div>}
                  {identifiers.issn && <div className="p-3 bg-white rounded-xl border border-gray-100"><p className="text-[7px] font-black text-gray-400 uppercase">ISSN</p><p className="text-[10px] font-bold text-[#004A74]">{identifiers.issn}</p></div>}
                  {identifiers.isbn && <div className="p-3 bg-white rounded-xl border border-gray-100"><p className="text-[7px] font-black text-gray-400 uppercase">ISBN</p><p className="text-[10px] font-bold text-[#004A74]">{identifiers.isbn}</p></div>}
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><TagIcon className="w-3.5 h-3.5" /> Tags & Labels</h3>
                <div className="flex flex-wrap gap-1.5">
                  {tags.keywords.map(k => <span key={k} className="px-2 py-1 bg-gray-100 text-[#004A74] text-[9px] font-bold rounded-lg lowercase">#{k}</span>)}
                  {tags.labels.map(l => <span key={l} className="px-2 py-1 bg-[#FED400]/10 text-[#004A74] text-[9px] font-black rounded-lg uppercase">{l}</span>)}
                </div>
              </div>
              {supportingData.videoUrl && (
                <div className="space-y-3">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><VideoCameraIcon className="w-3.5 h-3.5" /> Video Resource</h3>
                  <div className="aspect-video w-full rounded-[1.5rem] overflow-hidden bg-black border border-gray-100 shadow-lg">
                    <iframe src={supportingData.videoUrl} className="w-full h-full" allowFullScreen title="Related Video" />
                  </div>
                </div>
              )}
            </aside>
          </div>

          <footer className="pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              <div className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> Created: {formatTimeMeta(currentItem.createdAt)}</div>
              <div className="flex items-center gap-1"><ArrowPathIcon className="w-3 h-3" /> Updated: {formatTimeMeta(currentItem.updatedAt)}</div>
            </div>
            <p className="text-[9px] font-black text-[#004A74] tracking-tighter opacity-30">XEENAPS CORE ID: {currentItem.id}</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default LibraryDetailView;
