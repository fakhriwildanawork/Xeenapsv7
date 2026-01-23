
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { BRAND_ASSETS } from '../assets';
import { callAiProxy } from './gasService';

/**
 * Helper to fetch image and convert to Base64 to bypass CORS issues in pptxgenjs
 */
const imageUrlToBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Failed to fetch image, using fallback:", url);
    return null;
  }
};

/**
 * PresentationService
 * Alur: Groq Blueprint (via GAS Proxy) -> LoremFlickr Images (Base64) -> PptxGenJS Build -> GAS Save
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
    // 1. GENERATE BLUEPRINT (Materi Slide)
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

    const aiResText = await callAiProxy('groq', blueprintPrompt);
    
    if (!aiResText) {
      throw new Error("AI Proxy failed to return blueprint text.");
    }

    const blueprint = JSON.parse(aiResText || '{"slides":[]}');
    
    // 2. INITIALIZE PPTX
    onProgress?.("Assembling Slides...");
    const pptx = new pptxgen();
    
    // DEFINE MASTER (BRANDING LOGO)
    pptx.defineSlideMaster({
      title: 'XEENAPS_MASTER',
      background: { color: 'FFFFFF' },
      objects: [
        { 
          image: { 
            x: '92%', y: '92%', w: 0.35, h: 0.35, 
            path: BRAND_ASSETS.LOGO_ICON 
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
      x: 0.5, y: 2, w: '90%', fontSize: 36, fontFace: config.theme.headingFont, 
      color: config.theme.primaryColor, bold: true, align: 'center' 
    });
    slide1.addText(`Presented by: ${config.presenters.join(', ')}`, { 
      x: 0.5, y: 3.2, w: '90%', fontSize: 18, fontFace: config.theme.fontFamily, 
      color: '666666', align: 'center' 
    });

    // CONTENT SLIDES
    for (const sData of blueprint.slides) {
      const slide = pptx.addSlide({ masterName: 'XEENAPS_MASTER' });
      
      // Title
      slide.addText(sData.title, { 
        x: 0.5, y: 0.4, w: '90%', fontSize: 24, fontFace: config.theme.headingFont, 
        color: config.theme.primaryColor, bold: true 
      });

      // Bullets
      slide.addText(sData.content.join('\n\n'), { 
        x: 0.5, y: 1.2, w: '55%', fontSize: 14, fontFace: config.theme.fontFamily, 
        color: '333333', bullet: true, valign: 'top' 
      });

      // Fetch Image (Using LoremFlickr as it's more stable for keyword search + CORS friendly via Base64 helper)
      if (sData.imageKeyword) {
        onProgress?.(`Loading asset for: ${sData.title}...`);
        const imgUrl = `https://loremflickr.com/800/600/${encodeURIComponent(sData.imageKeyword)}`;
        const base64Img = await imageUrlToBase64(imgUrl);
        
        // Use the base64 image if fetch was successful, otherwise fallback to Xeenaps Logo to prevent crash
        slide.addImage({ 
          x: '60%', y: 1.2, w: '35%', h: 3, 
          path: base64Img || BRAND_ASSETS.LOGO_ICON, 
          sizing: { type: 'cover', w: 3, h: 3 } 
        });
      }
    }

    // FINAL SLIDE: REFERENCE
    const lastSlide = pptx.addSlide({ masterName: 'XEENAPS_MASTER' });
    lastSlide.addText("References & Source", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: config.theme.primaryColor });
    lastSlide.addText(`Extracted from: ${item.title}`, { x: 0.5, y: 1.5, fontSize: 14 });
    lastSlide.addText("Generated by Xeenaps PKM", { x: 0.5, y: 5, fontSize: 10, italic: true, color: '999999', align: 'center', w: '90%' });

    // 3. EXPORT TO BASE64
    onProgress?.("Converting to Google Slides...");
    const base64Pptx = await pptx.write({ outputType: 'base64' }) as string;

    // 4. SAVE TO GAS
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
    
    throw new Error(result.message || "Failed to save presentation to Drive.");
  } catch (error) {
    console.error("Presentation Generation Error:", error);
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
