
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS PROFESSIONAL PRESENTER SERVICE
 * This service triggers a server-side workflow (Groq -> Deepseek -> Google Slides API).
 */

export const createPresentationWorkflow = async (
  item: LibraryItem,
  config: { 
    title: string; 
    context: string; 
    presenters: string[]; 
    template: PresentationTemplate; 
    theme: PresentationThemeConfig; 
    slidesCount: number; 
    language: string; 
  },
  onProgress?: (stage: string) => void
): Promise<PresentationItem | null> => {
  try {
    onProgress?.("Contacting Xeenaps AI Architect...");
    
    // We send everything to GAS. GAS handles Groq condensation and Deepseek styling.
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'generateProfessionalPresentation', 
        item, 
        config: {
          ...config,
          primaryColor: config.theme.primaryColor,
          secondaryColor: config.theme.secondaryColor
        }
      })
    });

    const out = await res.json();
    
    if (out.status === 'success') {
      onProgress?.("Slides rendered successfully!");
      return out.data;
    } else {
      throw new Error(out.message || "Presentation generation failed");
    }

  } catch (error) {
    console.error("Xeenaps Presenter Error:", error);
    return null;
  }
};

export const fetchRelatedPresentations = async (collectionId: string): Promise<PresentationItem[]> => {
  try {
    const res = await fetch(`${GAS_WEB_APP_URL}?action=getRelatedPresentations&collectionId=${collectionId}`);
    const result = await res.json();
    return result.status === 'success' ? result.data : [];
  } catch (error) { return []; }
};
