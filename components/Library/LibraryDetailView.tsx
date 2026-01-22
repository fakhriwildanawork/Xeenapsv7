
import React, { useState, useMemo } from 'react';
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
  BeakerIcon
} from '@heroicons/react/24/outline';
import { 
  BookmarkIcon as BookmarkSolid, 
  StarIcon as StarSolid
} from '@heroicons/react/24/solid';

interface LibraryDetailViewProps {
  item: LibraryItem;
  onClose: () => void;
}

/**
 * Helper to safely format dates from ISO or raw strings
 */
const formatDate = (dateStr: any) => {
  if (!dateStr || dateStr === 'N/A') return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate().toString().padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    // Check if it's just a year or full ISO
    if (String(dateStr).length === 4) return dateStr;
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
};

/**
 * Helper to parse dynamic JSON fields from the database
 */
const parseJsonField = (field: any, defaultValue: any = {}) => {
  if (!field) return defaultValue;
  if (typeof field === 'object') return field;
  try {
    return JSON.parse(field);
  } catch (e) {
    return defaultValue;
  }
};

/**
 * Helper to render text as elegant numbered list if it looks like one
 */
const ElegantList: React.FC<{ text?: string; className?: string }> = ({ text, className = "" }) => {
  if (!text || text === 'N/A') return <p className="text-gray-400 italic">No data available.</p>;
  
  // Split by common list delimiters (numbers, bullet points, or newlines)
  const items = text.split(/\n|(?=\d+\.)|(?=•)/).map(i => i.replace(/^\d+\.\s*|•\s*/, '').trim()).filter(Boolean);
  
  if (items.length <= 1) return <p className={`text-sm leading-relaxed text-gray-700 ${className}`} dangerouslySetInnerHTML={{ __html: text }} />;

  return (
    <ol className={`space-y-3 list-none counter-reset-item ${className}`}>
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-4 items-start group">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#004A74]/5 text-[#004A74] text-[10px] font-black flex items-center justify-center border border-[#004A74]/10 group-hover:bg-[#FED400] transition-colors">
            {idx + 1}
          </span>
          <span className="text-sm text-gray-700 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ol>
  );
};

const LibraryDetailView: React.FC<LibraryDetailViewProps> = ({ item, onClose }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTips, setShowTips] = useState(false);

  // Parse Metadata Objects
  const pubInfo: PubInfo = useMemo(() => parseJsonField(item.pubInfo), [item.pubInfo]);
  const identifiers: Identifiers = useMemo(() => parseJsonField(item.identifiers), [item.identifiers]);
  const tags = useMemo(() => parseJsonField(item.tags, { keywords: [], labels: [] }), [item.tags]);
  const supportingData = useMemo(() => parseJsonField(item.supportingReferences, { references: [], videoUrl: null }), [item.supportingReferences]);
  
  const displayDate = formatDate(item.fullDate || item.year);
  const authorsText = item.authors && Array.isArray(item.authors) ? item.authors.join(', ') : (item.authors || 'Unknown');

  const handleOpenLink = (url: string | null) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[72px] md:top-[100px] z-[120] bg-white flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden shadow-2xl">
      
      {/* 1. BLOK TOMBOL (Navigation Bar) */}
      <nav className="shrink-0 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-6 md:px-10 py-4 flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-2 text-[#004A74] font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 px-4 py-2.5 rounded-2xl transition-all">
          <ArrowLeftIcon className="w-4 h-4 stroke-[3]" /> Back
        </button>

        <div className="flex items-center gap-3">
          <button className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-[#004A74] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-[#004A74]/20 hover:scale-105 active:scale-95 transition-all">
            Cite Entry
          </button>
          
          <div className="h-6 w-px bg-gray-200 mx-1 hidden md:block" />
          
          <button className="p-2.5 text-gray-400 hover:text-[#004A74] hover:bg-gray-50 rounded-xl transition-all"><EyeIcon className="w-5 h-5" /></button>
          <button className="p-2.5 text-gray-400 hover:text-[#004A74] hover:bg-gray-50 rounded-xl transition-all">
            {item.isBookmarked ? <BookmarkSolid className="w-5 h-5 text-[#004A74]" /> : <BookmarkIcon className="w-5 h-5" />}
          </button>
          <button className="p-2.5 text-gray-400 hover:text-[#004A74] hover:bg-gray-50 rounded-xl transition-all">
            {item.isFavorite ? <StarSolid className="w-5 h-5 text-[#FED400]" /> : <StarIcon className="w-5 h-5" />}
          </button>
          
          <div className="relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2.5 text-gray-400 hover:text-[#004A74] hover:bg-gray-50 rounded-xl transition-all"><EllipsisVerticalIcon className="w-5 h-5" /></button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 z-[60] animate-in fade-in zoom-in-95">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-2xl transition-all"><PresentationChartBarIcon className="w-4 h-4" /> Presentation Mode</button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-2xl transition-all"><ClipboardDocumentListIcon className="w-4 h-4" /> To-Do List</button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-2xl transition-all"><AcademicCapIcon className="w-4 h-4" /> Export Quote</button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-2xl transition-all"><ShareIcon className="w-4 h-4" /> Share Collection</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 space-y-12">
          
          {/* 2. BLOK HEADER */}
          <header className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border border-gray-100 space-y-8">
            <div className="flex flex-wrap gap-2">
              <span className="px-4 py-1.5 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-full">{item.type}</span>
              {item.category && <span className="px-4 py-1.5 bg-[#004A74]/10 text-[#004A74] text-[9px] font-black uppercase tracking-widest rounded-full">{item.category}</span>}
              <span className="px-4 py-1.5 bg-[#FED400] text-[#004A74] text-[9px] font-black uppercase tracking-widest rounded-full">{item.topic}</span>
              {item.subTopic && <span className="px-4 py-1.5 bg-[#004A74]/5 text-[#004A74] text-[9px] font-black uppercase tracking-widest rounded-full">{item.subTopic}</span>}
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-[#004A74] leading-[1.1] break-words uppercase">{item.title}</h1>
            
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
              {displayDate && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{displayDate}</span>
                </div>
              )}
              <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-gray-200" />
              <p className="text-base font-bold text-[#004A74]">{authorsText === 'N/A' ? 'Unknown' : authorsText}</p>
            </div>

            <div className="space-y-4 pt-8 border-t border-gray-50">
              {item.publisher && (
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-24 shrink-0">Publisher</span>
                  <p className="text-xs font-bold text-gray-600">{item.publisher}</p>
                </div>
              )}
              
              {(pubInfo.journal || pubInfo.vol || pubInfo.issue || pubInfo.pages) && (
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-24 shrink-0">Publication</span>
                  <p className="text-xs font-bold text-[#004A74]">
                    {pubInfo.journal} 
                    {pubInfo.vol ? ` • Vol. ${pubInfo.vol}` : ''} 
                    {pubInfo.issue ? ` • No. ${pubInfo.issue}` : ''} 
                    {pubInfo.pages ? ` • pp. ${pubInfo.pages}` : ''}
                  </p>
                </div>
              )}

              {Object.values(identifiers).some(v => v) && (
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-24 shrink-0">Identifiers</span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {identifiers.doi && <p className="text-[10px] font-mono font-bold text-gray-400 italic">DOI: {identifiers.doi}</p>}
                    {identifiers.issn && <p className="text-[10px] font-mono font-bold text-gray-400 italic">ISSN: {identifiers.issn}</p>}
                    {identifiers.isbn && <p className="text-[10px] font-mono font-bold text-gray-400 italic">ISBN: {identifiers.isbn}</p>}
                    {identifiers.pmid && <p className="text-[10px] font-mono font-bold text-gray-400 italic">PMID: {identifiers.pmid}</p>}
                    {identifiers.arxiv && <p className="text-[10px] font-mono font-bold text-gray-400 italic">arXiv: {identifiers.arxiv}</p>}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* 3. BLOK TAGS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><HashtagIcon className="w-3.5 h-3.5" /> Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {tags.keywords?.length > 0 ? tags.keywords.map((k: string) => <span key={k} className="px-3 py-1.5 bg-[#004A74]/5 border border-[#004A74]/10 rounded-xl text-[10px] font-bold text-[#004A74]">{k}</span>) : <p className="text-[10px] text-gray-300 italic">No keywords identified.</p>}
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><TagIcon className="w-3.5 h-3.5" /> Labels</h3>
              <div className="flex flex-wrap gap-2">
                {tags.labels?.length > 0 ? tags.labels.map((l: string) => <span key={l} className="px-3 py-1.5 bg-[#FED400]/10 border border-[#FED400]/20 rounded-xl text-[10px] font-bold text-[#004A74]">{l}</span>) : <p className="text-[10px] text-gray-300 italic">No labels identified.</p>}
              </div>
            </div>
          </section>

          {/* 4. BLOK ABSTRACT */}
          <section className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><BookOpenIcon className="w-3.5 h-3.5" /> Abstract</h3>
            <div className="text-sm leading-relaxed text-gray-700 font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: item.abstract || 'Abstract not available for this collection.' }} />
          </section>

          {/* 5. BLOK INSIGHT */}
          <section className="space-y-8">
            <div className="flex items-center justify-between py-2">
              <h2 className="text-xl font-black text-[#004A74] flex items-center gap-3">
                <SparklesIcon className="w-6 h-6 text-[#FED400]" /> AI KNOWLEDGE INSIGHTS
              </h2>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-6 py-3 bg-[#004A74] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-[#004A74]/20 hover:scale-105 transition-all">
                  <SparklesIcon className="w-4 h-4" /> Generate Insight
                </button>
                <button onClick={() => setShowTips(true)} className="p-3 bg-[#FED400] text-[#004A74] rounded-2xl shadow-lg shadow-[#FED400]/20 hover:rotate-12 transition-all">
                  <LightBulbIcon className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {item.category === 'Original Research' && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 md:col-span-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#004A74] flex items-center gap-2"><BeakerIcon className="w-4 h-4" /> Research Methodology</h3>
                  <ElegantList text={item.summary} className="text-[#004A74]/80 italic" /> 
                </div>
              )}
              
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 md:col-span-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><ClipboardDocumentListIcon className="w-4 h-4" /> Executive Summary</h3>
                <div className="text-sm leading-relaxed text-gray-700 font-medium" dangerouslySetInnerHTML={{ __html: item.summary || 'Summary pending analysis.' }} />
              </div>

              <div className="bg-green-50/30 p-8 rounded-[2.5rem] border border-green-100/50 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-green-600 flex items-center gap-2">
                  <ClipboardDocumentCheckIcon className="w-4 h-4" /> Key Strengths
                </h3>
                <ElegantList text={item.strength} />
              </div>

              <div className="bg-red-50/30 p-8 rounded-[2.5rem] border border-red-100/50 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4" /> Identified Weaknesses
                </h3>
                <ElegantList text={item.weakness} />
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 md:col-span-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#004A74] flex items-center gap-2">
                  <ChatBubbleBottomCenterTextIcon className="w-4 h-4" /> Unfamiliar Terminology
                </h3>
                <ElegantList text={item.quickTipsForYou} />
              </div>
            </div>
          </section>

          {/* 6. BLOK SUPPORTING REFERENCE */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" /> Supporting References
                </h3>
                <span className="text-[8px] font-black text-[#004A74] bg-[#FED400] px-2 py-0.5 rounded-full uppercase">Crossref API</span>
              </div>
              <div className="space-y-4">
                {supportingData.references?.length > 0 ? supportingData.references.map((ref: string, idx: number) => {
                  const urlMatch = ref.match(/https?:\/\/[^\s<]+/);
                  const url = urlMatch ? urlMatch[0].replace(/[.,;)]+$/, '') : null;
                  return (
                    <div key={idx} onClick={() => handleOpenLink(url)} className={`group bg-gray-50/50 p-5 rounded-[2rem] border border-gray-100 transition-all ${url ? 'cursor-pointer hover:bg-white hover:shadow-xl hover:border-[#004A74]/20' : ''}`}>
                      <div className="flex gap-4">
                        <span className="shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-[#004A74] shadow-sm">{idx + 1}</span>
                        <p className="text-xs font-medium text-gray-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: ref }} />
                        {url && <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-300 group-hover:text-[#004A74] shrink-0" />}
                      </div>
                    </div>
                  );
                }) : <div className="py-10 text-center text-gray-300 text-xs italic">No supporting references found.</div>}
              </div>
            </div>

            <div className="bg-[#004A74] p-8 rounded-[3rem] shadow-xl space-y-6 flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
                  <VideoCameraIcon className="w-4 h-4" /> Video Insights
                </h3>
                <span className="text-[8px] font-black text-[#004A74] bg-[#FED400] px-2 py-0.5 rounded-full uppercase">YouTube Data V3</span>
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                {supportingData.videoUrl ? (
                  <div className="aspect-video rounded-[2rem] overflow-hidden bg-black shadow-2xl border-4 border-white/10">
                    <iframe className="w-full h-full" src={supportingData.videoUrl} frameBorder="0" allowFullScreen></iframe>
                  </div>
                ) : (
                  <div className="aspect-video rounded-[2rem] bg-white/5 flex flex-col items-center justify-center border-2 border-dashed border-white/10">
                    <VideoCameraIcon className="w-12 h-12 text-white/10 mb-2" />
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No Related Video Found</p>
                  </div>
                )}
                <p className="mt-6 text-[11px] text-white/50 font-medium italic text-center px-4 leading-relaxed">
                  "Exploring visual dimensions of this knowledge domain provides deeper conceptual anchoring."
                </p>
              </div>
            </div>
          </section>

          <footer className="py-10 text-center">
             <div className="w-12 h-1 bg-gray-100 mx-auto mb-6 rounded-full" />
             <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.5em]">XEENAPS KNOWLEDGE GRAPH SYSTEM</p>
          </footer>
        </div>
      </div>

      {/* Quick Tips Modal Overlay */}
      {showTips && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#004A74] text-white p-10 rounded-[3rem] max-w-lg shadow-2xl relative border border-white/10">
            <button onClick={() => setShowTips(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"><XMarkIcon className="w-6 h-6" /></button>
            <LightBulbIcon className="w-12 h-12 text-[#FED400] mb-6 drop-shadow-[0_0_10px_rgba(254,212,0,0.5)]" />
            <h3 className="text-xl font-black mb-4 uppercase tracking-widest">Intelligent Quick Tips</h3>
            <p className="text-sm font-medium italic leading-relaxed opacity-90">"{item.quickTipsForYou || 'Generate AI insights to unlock specific tips and unfamiliar terminology analysis for this library collection.'}"</p>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #004A7420; border-radius: 10px; }
      `}</style>
    </div>
  );
}; 

export default LibraryDetailView;
