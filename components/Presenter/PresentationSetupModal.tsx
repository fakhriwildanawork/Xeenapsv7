
import React, { useState } from 'react';
import { LibraryItem, PresentationTemplate } from '../../types';
import { createPresentationWorkflow } from '../../services/PresentationService';
import { 
  XMarkIcon, 
  SparklesIcon, 
  PaintBrushIcon, 
  UserGroupIcon, 
  QueueListIcon,
  ChevronRightIcon,
  SwatchIcon
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
    title: `Insights: ${item.title}`,
    context: '',
    presenters: ['Xeenaps User'],
    slidesCount: 8,
    template: PresentationTemplate.MODERN,
    primaryColor: '#004A74',
    secondaryColor: '#FED400',
    fontFamily: 'Inter',
    language: 'English'
  });

  const languages = ['English', 'Indonesian', 'French', 'German', 'Spanish', 'Japanese'];
  const templateOptions = Object.values(PresentationTemplate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    const result = await createPresentationWorkflow(item, {
      title: formData.title,
      context: formData.context,
      presenters: formData.presenters,
      template: formData.template,
      theme: {
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        fontFamily: formData.fontFamily,
        headingFont: formData.fontFamily
      },
      slidesCount: formData.slidesCount,
      language: formData.language
    }, (stage) => setProgressStage(stage));

    if (result) {
      showXeenapsToast('success', 'Presentation Ready!');
      onComplete();
    } else {
      Swal.fire({
        ...XEENAPS_SWAL_CONFIG,
        icon: 'error',
        title: 'GENERATION FAILED',
        text: 'A parsing error or timeout occurred. V17 Enforcer is active, please try again.'
      });
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-[0_35px_100px_rgba(0,0,0,0.4)] overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {isGenerating && (
          <div className="absolute inset-0 z-[300] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-10 animate-in fade-in">
            <div className="w-24 h-24 mb-8 relative">
              <div className="absolute inset-0 border-4 border-[#004A74]/10 rounded-full" />
              <div className="absolute inset-0 border-4 border-[#004A74] border-t-transparent rounded-full animate-spin" />
              <SparklesIcon className="absolute inset-0 m-auto w-10 h-10 text-[#004A74] animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-[#004A74] uppercase tracking-tighter mb-2">Architecting Knowledge</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{progressStage || "Synthesizing intelligence..."}</p>
          </div>
        )}

        <div className="px-8 py-8 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
              <SparklesIcon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#004A74] uppercase tracking-tight">Presenter Engine</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Universal Elegant Layout V17</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-full transition-all">
            <XMarkIcon className="w-8 h-8" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 space-y-10">
          <div className="space-y-6">
            <FormField label="Presentation Title">
              <input 
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-bold text-[#004A74] outline-none"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </FormField>

            <FormField label="Strategic Context (Optional)">
              <textarea 
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-medium min-h-[80px] outline-none"
                placeholder="Specific instructions for the AI..."
                value={formData.context}
                onChange={(e) => setFormData({...formData, context: e.target.value})}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-50">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#004A74] flex items-center gap-2">
                <SwatchIcon className="w-4 h-4" /> Visual Identity
              </h3>

              <FormField label="Design Template">
                <FormDropdown 
                  value={formData.template}
                  options={templateOptions}
                  onChange={(v) => setFormData({...formData, template: v})}
                  placeholder="Select Style"
                  allowCustom={false}
                  showSearch={false}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Primary Color">
                  <input type="color" value={formData.primaryColor} onChange={(e) => setFormData({...formData, primaryColor: e.target.value})} className="w-full h-12 rounded-xl cursor-pointer p-1 bg-gray-50 border border-gray-200" />
                </FormField>
                <FormField label="Accent Color">
                  <input type="color" value={formData.secondaryColor} onChange={(e) => setFormData({...formData, secondaryColor: e.target.value})} className="w-full h-12 rounded-xl cursor-pointer p-1 bg-gray-50 border border-gray-200" />
                </FormField>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#004A74] flex items-center gap-2">
                <QueueListIcon className="w-4 h-4" /> Parameters
              </h3>

              <FormField label="Target Slides">
                <input 
                  type="number" min="3" max="20" 
                  value={formData.slidesCount} 
                  onChange={(e) => setFormData({...formData, slidesCount: parseInt(e.target.value)})}
                  className="w-full px-5 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold"
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

          <div className="pt-8">
            <button 
              type="submit"
              disabled={isGenerating}
              className="w-full py-5 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-[#004A74]/30 flex items-center justify-center gap-4"
            >
              Start V17 Architect <ChevronRightIcon className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PresentationSetupModal;
