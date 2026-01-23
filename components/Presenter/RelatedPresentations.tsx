
import React, { useState, useEffect } from 'react';
import { PresentationItem, LibraryItem } from '../../types';
import { fetchRelatedPresentations } from '../../services/PresentationService';
import { 
  PlusIcon, 
  PresentationChartBarIcon, 
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import PresentationSetupModal from './PresentationSetupModal';
import { CardGridSkeleton } from '../Common/LoadingComponents';

interface RelatedPresentationsProps {
  collection: LibraryItem;
  onBack: () => void;
}

const RelatedPresentations: React.FC<RelatedPresentationsProps> = ({ collection, onBack }) => {
  const [presentations, setPresentations] = useState<PresentationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  const loadPresentations = async () => {
    setIsLoading(true);
    const data = await fetchRelatedPresentations(collection.id);
    setPresentations(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadPresentations();
  }, [collection.id]);

  const openInGoogleSlides = (id: string) => {
    window.open(`https://docs.google.com/presentation/d/${id}/edit`, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-500 overflow-hidden">
      {showSetup && (
        <PresentationSetupModal 
          item={collection} 
          onClose={() => setShowSetup(false)} 
          onComplete={() => {
            setShowSetup(false);
            loadPresentations();
          }} 
        />
      )}

      {/* Header Galeri */}
      <div className="px-6 md:px-10 py-8 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-[#004A74] uppercase tracking-tight">Presentation Gallery</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[200px] md:max-w-md">Source: {collection.title}</p>
          </div>
        </div>

        <button 
          onClick={() => setShowSetup(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#004A74] text-white rounded-2xl font-bold hover:shadow-lg hover:bg-[#003859] transition-all transform active:scale-95"
        >
          <PlusIcon className="w-5 h-5" />
          <span className="hidden md:inline">Create New</span>
        </button>
      </div>

      {/* Grid Konten */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 pb-32">
        {isLoading ? (
          <CardGridSkeleton count={4} />
        ) : presentations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <PresentationChartBarIcon className="w-20 h-20 mb-4 text-[#004A74]" />
            <h3 className="text-lg font-black text-[#004A74] uppercase tracking-widest">No Presentations Yet</h3>
            <p className="text-sm font-medium text-gray-500 mt-2">Transform this library collection into professional slides.</p>
            <button 
              onClick={() => setShowSetup(true)}
              className="mt-8 text-[#004A74] font-black underline uppercase tracking-widest text-xs"
            >
              Start Building Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {presentations.map((ppt) => (
              <div 
                key={ppt.id}
                onClick={() => openInGoogleSlides(ppt.gSlidesId)}
                className="group relative bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden"
              >
                {/* Visual Accent */}
                <div 
                  className="absolute top-0 right-0 w-32 h-32 opacity-5 translate-x-8 -translate-y-8 rounded-full"
                  style={{ backgroundColor: ppt.themeConfig.primaryColor }}
                />

                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-gray-50 rounded-2xl text-[#004A74] group-hover:bg-[#FED400] group-hover:text-[#004A74] transition-colors duration-500">
                    <PresentationChartBarIcon className="w-8 h-8" />
                  </div>
                  <ArrowTopRightOnSquareIcon className="w-5 h-5 text-gray-300 group-hover:text-[#004A74] transition-colors" />
                </div>

                <h3 className="text-lg font-black text-[#004A74] line-clamp-2 leading-tight mb-4 uppercase">{ppt.title}</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <UserGroupIcon className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest line-clamp-1">{ppt.presenters.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <CalendarDaysIcon className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(ppt.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="px-3 py-1 bg-[#004A74]/5 text-[#004A74] text-[8px] font-black rounded-full uppercase tracking-tighter">{ppt.templateName}</span>
                  <span className="text-[10px] font-black text-[#004A74]">{ppt.slidesCount} SLIDES</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #004A7420; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default RelatedPresentations;
