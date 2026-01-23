
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { BRAND_ASSETS } from '../assets';
import { callAiProxy } from './gasService';

/**
 * Helper to fetch image and convert to Base64 via GAS Proxy to bypass CORS issues
 */
const imageUrlToBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'fetchImageProxy', url })
    });
    const result = await response.json();
    return result.status === 'success' ? result.data : null;
  } catch (error) {
    console.warn("Proxy fetch failed for:", url);
    return null;
  }
};

/**
 * PresentationService
 * Alur: Groq Blueprint -> Image Proxy (Base64) -> PptxGenJS -> GAS Save (Slave Delegated)
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
    // 0. PRE-FETCH MASTER ASSETS (Logo) - WAJIB BASE64 untuk Master Slide
    onProgress?.("Loading Brand Assets...");
    const logoBase64 = await imageUrlToBase64(BRAND_ASSETS.LOGO_ICON);

    // 1. GENERATE BLUEPRINT
    onProgress?.("Generating AI Blueprint...");
    const blueprintPrompt = `ACT AS AN EXPERT PRESENTATION DESIGNER.
    CREATE A DETAILED PRESENTATION BLUEPRINT IN JSON FORMAT FOR: "${config.title}"
    SOURCE MATERIAL: ${item.abstract || item.title}
    ADDITIONAL CONTEXT: ${config.context}
    
    REQUIREMENTS:
    - EXACTLY ${config.slidesCount} CONTENT SLIDES (Excluding Title & Reference).
    - LANGUAGE: ${config.language}.
    - FOR EACH SLIDE PROVIDE: "title", "content" (bullet points), and "imageKeyword" (1-2 words for relevant image).
    - OUTPUT RAW JSON ONLY.

    FORMAT:
    {
      "slides": [
        { "title": "Slide Title", "content": ["Point 1", "Point 2"], "imageKeyword": "keyword" }
      ]
    }`;

    let aiResText = await callAiProxy('groq', blueprintPrompt);
    
    if (!aiResText) throw new Error("AI Blueprint failed.");

    if (aiResText.includes('{')) {
      const start = aiResText.indexOf('{');
      const end = aiResText.lastIndexOf('}');
      if (start !== -1 && end !== -1) aiResText = aiResText.substring(start, end + 1);
    }

    let blueprint = JSON.parse(aiResText || '{"slides":[]}');
    if (blueprint.presentation && blueprint.presentation.slides) blueprint = blueprint.presentation;
    if (!blueprint.slides || !Array.isArray(blueprint.slides)) throw new Error("Invalid AI data.");
    
    // 2. INITIALIZE PPTX
    onProgress?.("Assembling Slides...");
    const pptx = new pptxgen();
    const headingFont = config.theme.headingFont || 'Arial';
    const bodyFont = config.theme.fontFamily || 'Arial';

    // DEFINE MASTER (Gunakan logoBase64 yang sudah di-fetch agar tidak CORS)
    pptx.defineSlideMaster({
      title: 'XEENAPS_MASTER',
      background: { color: 'FFFFFF' },
      objects: [
        { 
          image: { 
            x: '92%', y: '92%', w: 0.35, h: 0.35, 
            path: logoBase64 || undefined // Gunakan base64
          } 
        },
        {
          rect: { x: 0, y: '90%', w: '100%', h: 0.05, fill: { color: config.theme.primaryColor } }
        }
      ]
    });

    // SLIDE 1: COVER
    const slide1 = pptx.addSlide({ masterName: 'XEENAPS_MASTER' });
    slide1.addText(config.title.toUpperCase(), { 
      x: 0.5, y: 2, w: '90%', fontSize: 32, fontFace: headingFont, 
      color: config.theme.primaryColor, bold: true, align: 'center' 
    });
    slide1.addText(`Presented by: ${config.presenters.join(', ')}`, { 
      x: 0.5, y: 3.2, w: '90%', fontSize: 18, fontFace: bodyFont, 
      color: '666666', align: 'center' 
    });

    // CONTENT SLIDES
    for (const sData of blueprint.slides) {
      onProgress?.(`Building Slide: ${sData.title}...`);
      const slide = pptx.addSlide({ masterName: 'XEENAPS_MASTER' });
      
      slide.addText(sData.title, { 
        x: 0.5, y: 0.4, w: '90%', fontSize: 24, fontFace: headingFont, 
        color: config.theme.primaryColor, bold: true 
      });

      const contentText = Array.isArray(sData.content) ? sData.content.join('\n\n') : String(sData.content);
      slide.addText(contentText, { 
        x: 0.5, y: 1.2, w: '55%', fontSize: 14, fontFace: bodyFont, 
        color: '333333', bullet: true, valign: 'top' 
      });

      if (sData.imageKeyword) {
        const imgUrl = `https://loremflickr.com/800/600/${encodeURIComponent(sData.imageKeyword)}`;
        const base64Img = await imageUrlToBase64(imgUrl);
        
        // Selalu gunakan base64 untuk menjamin render
        if (base64Img) {
          slide.addImage({ 
            x: '60%', y: 1.2, w: '35%', h: 3, 
            path: base64Img, 
            sizing: { type: 'cover', w: 3, h: 3 } 
          });
        }
      }
    }

    // REFERENCE SLIDE
    const lastSlide = pptx.addSlide({ masterName: 'XEENAPS_MASTER' });
    lastSlide.addText("References & Source", { x: 0.5, y: 0.5, fontSize: 24, bold: true, fontFace: headingFont, color: config.theme.primaryColor });
    lastSlide.addText(`Source: ${item.title}`, { x: 0.5, y: 1.5, fontSize: 14, fontFace: bodyFont });

    // 3. EXPORT & SAVE
    onProgress?.("Syncing with Cloud...");
    const base64Pptx = await pptx.write({ outputType: 'base64' }) as string;

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

    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'savePresentation',
        presentation: presentationData,
        pptxFileData: base64Pptx
      })
    });

    const result = await res.json();
    if (result.status === 'success') return result.data;
    throw new Error(result.message || "Failed to save.");
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
