
import React, { useState } from 'react';
import { LibraryItem, PresentationTemplate } from '../../types';
import { createPresentationWorkflow } from '../../services/PresentationService';
import { 
  XMarkIcon, 
  SparklesIcon, 
  PaintBrushIcon, 
  UserGroupIcon, 
  QueueListIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { FormField, FormDropdown } from '../Common/FormComponents';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';
import { showXeenapsToast } from '../../utils/toastUtils';

interface PresentationSetupModalProps {
  item: LibraryItem;
  onClose: () => void;
  onComplete: () => void;
}

const PresentationSetupModal: React.FC<PresentationSetupModalProps> = ({ item, onClose, onComplete }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStage, setProgressStage] = useState('');

  const [formData, setFormData] = useState({
    title: `Insight Presentation: ${item.title}`,
    context: '',
    template: PresentationTemplate.MODERN,
    presenters: ['Xeenaps User'],
    slidesCount: 8,
    primaryColor: '#004A74',
    secondaryColor: '#FED400',
    fontFamily: 'Inter',
    language: 'English'
  });

  const templates = Object.values(PresentationTemplate);
  const languages = ['English', 'Indonesian', 'French', 'German', 'Spanish', 'Japanese'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      // Custom Workflow with native builder
      const result = await createPresentationWorkflow(item, {
        title: formData.title,
        context: formData.context,
        presenters: formData.presenters,
        template: formData.template,
        theme: {
          primaryColor: formData.primaryColor.replace('#', ''),
          secondaryColor: formData.secondaryColor.replace('#', ''),
          fontFamily: formData.fontFamily,
          headingFont: 'Inter'
        },
        slidesCount: formData.slidesCount,
        language: formData.language
      }, (stage) => setProgressStage(stage));

      if (result) {
        showXeenapsToast('success', 'Native Presentation Created!');
        onComplete();
      }
    } catch (error: any) {
      Swal.fire({
        ...XEENAPS_SWAL_CONFIG,
        icon: 'error',
        title: 'BUILD FAILED',
        text: error.message || 'The cloud builder encountered an error. Please verify your settings.'
      });
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-[0_35px_100px_rgba(0,0,0,0.4)] overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Informative Progress Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-[300] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-10 animate-in fade-in">
            <div className="w-24 h-24 mb-8 relative">
              <div className="absolute inset-0 border-4 border-[#004A74]/10 rounded-full" />
              <div className="absolute inset-0 border-4 border-[#004A74] border-t-transparent rounded-full animate-spin" />
              <SparklesIcon className="absolute inset-0 m-auto w-10 h-10 text-[#004A74] animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-[#004A74] uppercase tracking-tighter mb-2">Native Cloud Build</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{progressStage || "Starting generation..."}</p>
            <div className="mt-8 px-8 py-3 bg-[#004A74]/5 text-[#004A74] rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-2 bg-[#FED400] rounded-full animate-ping" />
              AI is currently acting as your Architect
            </div>
            <p className="mt-4 text-[10px] text-gray-400 font-medium">This bespoke process creates native Google Slides shapes.</p>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-8 py-8 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg shadow-[#004A74]/20">
              <SparklesIcon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#004A74] uppercase tracking-tight">Slide Architect</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Native Google Slides Synthesis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-full transition-all">
            <XMarkIcon className="w-8 h-8" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 space-y-10">
          
          <div className="space-y-6">
            <FormField label="Presentation Title">
              <input 
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-bold text-[#004A74]"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </FormField>

            <FormField label="Additional Context (Optional)">
              <textarea 
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-medium min-h-[100px] outline-none"
                placeholder="Direct the AI Architect (e.g., Focus on visual cards)..."
                value={formData.context}
                onChange={(e) => setFormData({...formData, context: e.target.value})}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#004A74] flex items-center gap-2">
                <PaintBrushIcon className="w-4 h-4" /> Style Settings
              </h3>
              
              <FormField label="Design Template">
                <FormDropdown 
                  value={formData.template}
                  options={templates}
                  onChange={(v) => setFormData({...formData, template: v as PresentationTemplate})}
                  placeholder="Select Style"
                  allowCustom={false}
                  showSearch={false}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Primary Color">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <input type="color" value={formData.primaryColor} onChange={(e) => setFormData({...formData, primaryColor: e.target.value})} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none" />
                    <span className="text-[10px] font-mono font-bold text-gray-500">{formData.primaryColor}</span>
                  </div>
                </FormField>
                <FormField label="Accent Color">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <input type="color" value={formData.secondaryColor} onChange={(e) => setFormData({...formData, secondaryColor: e.target.value})} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none" />
                    <span className="text-[10px] font-mono font-bold text-gray-500">{formData.secondaryColor}</span>
                  </div>
                </FormField>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#004A74] flex items-center gap-2">
                <QueueListIcon className="w-4 h-4" /> Structure
              </h3>

              <FormField label="Content Slides">
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <input 
                    type="range" min="3" max="15" 
                    value={formData.slidesCount} 
                    onChange={(e) => setFormData({...formData, slidesCount: parseInt(e.target.value)})}
                    className="flex-1 accent-[#004A74]"
                  />
                  <span className="w-10 h-10 bg-[#004A74] text-white rounded-lg flex items-center justify-center font-black text-sm">{formData.slidesCount}</span>
                </div>
              </FormField>

              <FormField label="Speakers">
                <FormDropdown 
                  isMulti 
                  multiValues={formData.presenters}
                  onAddMulti={(v) => setFormData({...formData, presenters: [...formData.presenters, v]})}
                  onRemoveMulti={(v) => setFormData({...formData, presenters: formData.presenters.filter(p => p !== v)})}
                  options={['Xeenaps User']}
                  placeholder="Identify speakers..."
                  value="" onChange={() => {}}
                />
              </FormField>

              <FormField label="Language">
                <FormDropdown 
                  value={formData.language}
                  options={languages}
                  onChange={(v) => setFormData({...formData, language: v})}
                  placeholder="Select Language"
                  allowCustom={false}
                  showSearch={false}
                />
              </FormField>
            </div>
          </div>

          <div className="pt-8 flex justify-end">
            <button 
              type="submit"
              className="w-full md:w-auto px-12 py-5 bg-[#004A74] text-[#FED400] rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-[#004A74]/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4"
            >
              Construct Presentation <ChevronRightIcon className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #004A7420; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default PresentationSetupModal;
