
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - Blueprint Architect Edition
 * Gemini generates the structural blueprint, GAS builds the native slides.
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
    // 1. GENERATE VISUAL BLUEPRINT
    onProgress?.("Architecting Slide Layouts...");
    const blueprintPrompt = `ACT AS A SENIOR PRESENTATION ARCHITECT (GAMMA.AI STYLE).
    CREATE A DETAILED VISUAL BLUEPRINT JSON FOR: "${config.title}"
    SOURCE MATERIAL: ${item.abstract || item.title}
    ADDITIONAL CONTEXT: ${config.context}
    
    REQUIREMENTS:
    - EXACTLY ${config.slidesCount} CONTENT SLIDES.
    - LANGUAGE: ${config.language}.
    - FOR EACH SLIDE, CHOOSE A LAYOUT: "HERO_TITLE", "CARD_GRID", "SPLIT_CONTENT", "CENTER_SUMMARY".
    - DEFINE "cards" (array of {title, body, iconKeyword}) FOR GRID LAYOUTS.
    - DEFINE "primaryPoint" AND "secondaryPoint" FOR SPLIT LAYOUTS.
    - OUTPUT RAW JSON ONLY.

    SCHEMA:
    {
      "theme": { "primary": "#${config.theme.primaryColor}", "font": "${config.theme.fontFamily}" },
      "slides": [
        { 
          "title": "Slide Title", 
          "layout": "CARD_GRID",
          "cards": [{ "title": "Sub", "body": "Text", "icon": "keyword" }],
          "imageKeyword": "relevant keyword"
        }
      ]
    }`;

    // Use Gemini 3 Pro for higher reasoning on layouts
    let aiResText = await callAiProxy('gemini', blueprintPrompt, 'gemini-3-pro-preview');
    
    if (!aiResText) throw new Error("AI Architect failed.");

    // Clean JSON
    if (aiResText.includes('{')) {
      const start = aiResText.indexOf('{');
      const end = aiResText.lastIndexOf('}');
      if (start !== -1 && end !== -1) aiResText = aiResText.substring(start, end + 1);
    }

    const blueprint = JSON.parse(aiResText);
    
    // 2. SEND BLUEPRINT TO GAS BUILDER
    onProgress?.("Transmitting Blueprint to Cloud...");
    
    const presentationData: Partial<PresentationItem> = {
      id: crypto.randomUUID(),
      collectionIds: [item.id],
      title: config.title,
      presenters: config.presenters,
      templateName: config.template,
      themeConfig: config.theme,
      slidesCount: config.slidesCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onProgress?.("GAS Builder: Stitching Native Shapes...");
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'savePresentation',
        presentation: presentationData,
        blueprint: blueprint // Sent blueprint instead of binary PPTX
      })
    });

    const result = await res.json();
    if (result.status === 'success') return result.data;
    throw new Error(result.message || "Cloud build failed.");
  } catch (error) {
    console.error("Presentation Error:", error);
    return null;
  }
};

export const fetchRelatedPresentations = async (collectionId: string): Promise<PresentationItem[]> => {
  try {
    const res = await fetch(`${GAS_WEB_APP_URL}?action=getRelatedPresentations&collectionId=${collectionId}`);
    const result = await res.json();
    return result.status === 'success' ? result.data : [];
  } catch (error) {
    return [];
  }
};
