
import React, { useState, useRef, useEffect } from 'react';
import { LibraryItem, LibraryType } from '../../types';
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
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { 
  BookmarkIcon as BookmarkSolid, 
  StarIcon as StarSolid,
  Bold,
  Italic
} from 'lucide-react';

interface LibraryDetailViewProps {
  item: LibraryItem;
  onClose: () => void;
}

/**
 * Reusable Rich Text Editor Component for Inline Editing
 */
const RichTextEditor: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string;
  isList?: boolean;
}> = ({ value, onChange, placeholder, isList }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const execCommand = (command: string) => {
    document.execCommand(command, false);
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  return (
    <div className="flex flex-col rounded-3xl border border-gray-100 bg-gray-50/30 overflow-hidden focus-within:border-[#004A74]/30 focus-within:ring-4 focus-within:ring-[#004A74]/5 transition-all">
      <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-white/50">
        <button type="button" onClick={() => execCommand('bold')} className={`p-1.5 rounded-lg ${isBold ? 'bg-[#004A74] text-white' : 'hover:bg-gray-100 text-[#004A74]'}`}><Bold className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => execCommand('italic')} className={`p-1.5 rounded-lg ${isItalic ? 'bg-[#004A74] text-white' : 'hover:bg-gray-100 text-[#004A74]'}`}><Italic className="w-3.5 h-3.5" /></button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className={`p-5 text-sm outline-none min-h-[100px] leading-relaxed text-gray-700 font-medium ${isList ? 'prose-ol:list-decimal prose-ol:ml-4' : ''}`}
        dangerouslySetInnerHTML={{ __html: value || '' }}
      />
    </div>
  );
};

const LibraryDetailView: React.FC<LibraryDetailViewProps> = ({ item, onClose }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTips, setShowTips] = useState(false);
  
  // Local states for editable fields
  const [abstract, setAbstract] = useState(item.abstract || '');
  const [summary, setSummary] = useState(item.summary || '');
  const [methodology, setMethodology] = useState(''); // Initial methodology if exists
  const [strengths, setStrengths] = useState(item.strength || '');
  const [weaknesses, setWeaknesses] = useState(item.weakness || '');
  const [terminology, setTerminology] = useState('');

  const supportingData = item.supportingReferences;
  const supportingRefs = Array.isArray(supportingData) ? supportingData : (supportingData?.references || []);
  const videoUrl = !Array.isArray(supportingData) ? supportingData?.videoUrl : null;

  const handleOpenLink = (url: string | null) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[120] bg-white flex flex-col animate-in fade-in duration-300 overflow-hidden">
      
      {/* 1. BLOK TOMBOL (Navigation Bar) */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-2 text-[#004A74] font-black uppercase tracking-widest text-[10px] bg-gray-50 px-4 py-2.5 rounded-2xl hover:bg-[#FED400]/20 transition-all">
          <ArrowLeftIcon className="w-4 h-4 stroke-[3]" /> Back
        </button>

        <div className="flex items-center gap-2">
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
                <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-2xl transition-all"><AcademicCapIcon className="w-4 h-4" /> Generate Citation</button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-2xl transition-all"><ShareIcon className="w-4 h-4" /> Share Entry</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 space-y-12">
          
          {/* 2. BLOK HEADER */}
          <header className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <span className="px-4 py-1.5 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-full">{item.type}</span>
              <span className="px-4 py-1.5 bg-[#004A74]/10 text-[#004A74] text-[9px] font-black uppercase tracking-widest rounded-full">{item.category}</span>
              <span className="px-4 py-1.5 bg-[#FED400] text-[#004A74] text-[9px] font-black uppercase tracking-widest rounded-full">{item.topic}</span>
              <span className="px-4 py-1.5 bg-[#004A74]/5 text-[#004A74] text-[9px] font-black uppercase tracking-widest rounded-full">{item.subTopic}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-[#004A74] leading-[1.1] break-words uppercase">{item.title}</h1>
            
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{item.fullDate || item.year || 'N/A'}</p>
              <p className="text-base font-bold text-[#004A74]">{item.authors?.join(', ') || 'Unknown Authors'}</p>
            </div>

            <div className="space-y-2 pt-4 border-t border-gray-100">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{item.publisher || 'N/A'}</p>
              <p className="text-xs font-bold text-[#004A74]">{item.journalName || 'N/A'} {item.volume ? `• Vol. ${item.volume}` : ''} {item.issue ? `• No. ${item.issue}` : ''} {item.pages ? `• pp. ${item.pages}` : ''}</p>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono font-bold text-gray-400 italic">DOI: {item.doi || 'Not Available'}</p>
                <button className="px-6 py-2.5 bg-[#004A74] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-[#004A74]/20 hover:scale-105 active:scale-95 transition-all">Cite Entry</button>
              </div>
            </div>
          </header>

          {/* 3. BLOK TAGS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><AcademicCapIcon className="w-3.5 h-3.5" /> Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {item.tags?.keywords?.map(k => <span key={k} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-[#004A74]">{k}</span>)}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><BookmarkIcon className="w-3.5 h-3.5" /> Labels</h3>
              <div className="flex flex-wrap gap-2">
                {item.tags?.labels?.map(l => <span key={l} className="px-3 py-1.5 bg-[#FED400]/10 border border-[#FED400]/20 rounded-xl text-[10px] font-bold text-[#004A74]">{l}</span>)}
              </div>
            </div>
          </section>

          {/* 4. BLOK ABSTRACT */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><BookOpenIcon className="w-3.5 h-3.5" /> Abstract</h3>
            <RichTextEditor value={abstract} onChange={setAbstract} />
          </section>

          {/* 5. BLOK INSIGHT */}
          <section className="space-y-8 relative">
            <div className="flex items-center justify-between sticky top-20 z-30 bg-white/80 backdrop-blur-md py-4 border-b border-gray-50">
              <h2 className="text-xl font-black text-[#004A74] flex items-center gap-3">
                <SparklesIcon className="w-6 h-6 text-[#FED400]" /> AI INSIGHTS
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {item.category === 'Original Research' && (
                <div className="space-y-3 md:col-span-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Research Methodology</h3>
                  <RichTextEditor value={methodology} onChange={setMethodology} />
                </div>
              )}
              
              <div className="space-y-3 md:col-span-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Summary</h3>
                <RichTextEditor value={summary} onChange={setSummary} />
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-green-500 flex items-center gap-2">
                  <ClipboardDocumentCheckIcon className="w-4 h-4" /> Strengths
                </h3>
                <RichTextEditor value={strengths} onChange={setStrengths} isList />
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4" /> Weaknesses
                </h3>
                <RichTextEditor value={weaknesses} onChange={setWeaknesses} isList />
              </div>

              <div className="space-y-3 md:col-span-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#004A74] flex items-center gap-2">
                  <ChatBubbleBottomCenterTextIcon className="w-4 h-4" /> Unfamiliar Terminology
                </h3>
                <RichTextEditor value={terminology} onChange={setTerminology} isList />
              </div>
            </div>
          </section>

          {/* 6. BLOK SUPPORTING REFERENCE */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-gray-100">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5" /> Supporting References
              </h3>
              <div className="space-y-4">
                {supportingRefs.map((ref: string, idx: number) => {
                  const urlMatch = ref.match(/https?:\/\/[^\s<]+/);
                  const url = urlMatch ? urlMatch[0].replace(/[.,;)]+$/, '') : null;
                  return (
                    <div key={idx} onClick={() => handleOpenLink(url)} className={`group bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100 transition-all ${url ? 'cursor-pointer hover:bg-white hover:shadow-xl hover:border-[#004A74]/20' : ''}`}>
                      <div className="flex gap-4">
                        <span className="shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-[#004A74] shadow-sm">{idx + 1}</span>
                        <p className="text-xs font-medium text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: ref }} />
                        {url && <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-300 group-hover:text-[#004A74] shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <VideoCameraIcon className="w-3.5 h-3.5" /> Video Recommendation
              </h3>
              {videoUrl ? (
                <div className="aspect-video rounded-[3rem] overflow-hidden bg-gray-900 shadow-2xl border-8 border-white">
                  <iframe className="w-full h-full" src={videoUrl} frameBorder="0" allowFullScreen></iframe>
                </div>
              ) : (
                <div className="aspect-video rounded-[3rem] bg-gray-50 flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
                   <VideoCameraIcon className="w-12 h-12 text-gray-200 mb-2" />
                   <p className="text-[10px] font-black text-gray-400 uppercase">No Video Found</p>
                </div>
              )}
            </div>
          </section>

          <div className="py-20 text-center">
             <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.5em]">XEENAPS INTELLIGENCE SYSTEM</p>
          </div>
        </div>
      </div>

      {/* Quick Tips Modal Overlay */}
      {showTips && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#004A74] text-white p-10 rounded-[3rem] max-w-lg shadow-2xl relative">
            <button onClick={() => setShowTips(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"><XMarkIcon className="w-6 h-6" /></button>
            <LightBulbIcon className="w-12 h-12 text-[#FED400] mb-6" />
            <h3 className="text-xl font-black mb-4 uppercase tracking-widest">Quick Tips for You</h3>
            <p className="text-sm font-medium italic leading-relaxed opacity-90">"{item.quickTipsForYou || 'No specific tips generated for this reference yet. Use Generate Insight to get smarter recommendations.'}"</p>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #004A7420; border-radius: 10px; }
        [contenteditable]:empty:before {
          content: 'No content yet. Click Generate Insight to fill this area...';
          color: #9CA3AF;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default LibraryDetailView;
