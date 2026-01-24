
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - THE "ULTIMATE GAMMA" TEXT EDITION
 * Fokus: Estetika premium melalui desain geometris pekat & tipografi hierarkis.
 * Keamanan: 100% Inci murni & Tanpa Gambar untuk menjamin Google Slides Rendering.
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
    - EXACTLY ${config.slidesCount} CONTENT SLIDES.
    - LANGUAGE: ${config.language}.
    - FOR EACH SLIDE PROVIDE: "title", "content" (detailed bullet points).
    - OUTPUT RAW JSON ONLY.

    FORMAT:
    {
      "slides": [
        { "title": "Slide Title", "content": ["Point 1", "Point 2", "Point 3"] }
      ]
    }`;

    let aiResText = await callAiProxy('groq', blueprintPrompt);
    if (!aiResText) throw new Error("AI failed to return data.");

    if (aiResText.includes('{')) {
      const start = aiResText.indexOf('{');
      const end = aiResText.lastIndexOf('}');
      if (start !== -1 && end !== -1) aiResText = aiResText.substring(start, end + 1);
    }

    let blueprint = JSON.parse(aiResText || '{"slides":[]}');
    if (blueprint.presentation && blueprint.presentation.slides) blueprint = blueprint.presentation;
    if (!blueprint.slides || !Array.isArray(blueprint.slides)) throw new Error("Invalid AI structure.");
    
    // 2. INITIALIZE PPTX
    onProgress?.("Designing Visual Layout...");
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';

    const primaryColor = (config.theme.primaryColor || '004A74').replace('#', '');
    const secondaryColor = (config.theme.secondaryColor || 'FED400').replace('#', '');
    const headingFont = 'Arial'; 
    const bodyFont = 'Arial';

    // --- SLIDE 1: COVER (Modern Central Split) ---
    const slide1 = pptx.addSlide();
    // Background Accents
    slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: 'F8F9FA' } });
    slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 3, h: 5.625, fill: { color: primaryColor } });
    
    // Title Adaptive Logic
    const titleFontSize = config.title.length > 100 ? 24 : (config.title.length > 60 ? 28 : 32);
    
    slide1.addText(config.title.toUpperCase(), { 
      x: 3.5, y: 1.5, w: 6, h: 2, 
      fontSize: titleFontSize, fontFace: headingFont, color: primaryColor, 
      bold: true, align: 'left', valign: 'middle', lineSpacing: 34
    });

    // Accent line
    slide1.addShape(pptx.ShapeType.rect, { x: 3.5, y: 3.5, w: 1, h: 0.1, fill: { color: secondaryColor } });

    slide1.addText(`PRESENTED BY\n${config.presenters.join(', ')}`, { 
      x: 3.5, y: 4, w: 6, h: 1, 
      fontSize: 14, fontFace: bodyFont, color: '666666', 
      align: 'left', bold: true 
    });

    // Branding in sidebar
    // Fix: Removed invalid 'opacity' property from TextPropsOptions
    slide1.addText("XEENAPS\nMODERN PKM", { 
      x: 0, y: 4.5, w: 3, h: 1, 
      fontSize: 18, fontFace: headingFont, color: 'FFFFFF', 
      align: 'center', bold: true
    });

    // --- CONTENT SLIDES (Gamma Split Style) ---
    for (const sData of blueprint.slides) {
      onProgress?.(`Polishing: ${sData.title}...`);
      const slide = pptx.addSlide();
      
      // Sidebar Background
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 2.8, h: 5.625, fill: { color: primaryColor } });
      
      // Slide Title (In Sidebar)
      slide.addText(sData.title, { 
        x: 0.3, y: 0.5, w: 2.2, h: 4.6, 
        fontSize: 24, fontFace: headingFont, color: 'FFFFFF', 
        bold: true, valign: 'top', align: 'left'
      });

      // Decorative Element in Sidebar
      slide.addShape(pptx.ShapeType.rect, { x: 0.3, y: 5, w: 0.5, h: 0.05, fill: { color: secondaryColor } });

      // Body Content (In Main Area)
      const contentText = Array.isArray(sData.content) ? sData.content.join('\n\n') : String(sData.content);
      slide.addText(contentText, { 
        x: 3.2, y: 0.5, w: 6.3, h: 4.6, 
        fontSize: 16, fontFace: bodyFont, color: '333333', 
        bullet: { indent: 20 }, valign: 'top', lineSpacing: 28 
      });

      // Footer
      slide.addText("XEENAPS PKM INSIGHT", { 
        x: 3.2, y: 5.2, w: 4, h: 0.3, 
        fontSize: 8, fontFace: bodyFont, color: 'CCCCCC', align: 'left', bold: true
      });
    }

    // --- FINAL SLIDE: THE END ---
    const lastSlide = pptx.addSlide();
    lastSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: primaryColor } });
    
    lastSlide.addText("THANK YOU", { 
      x: 0, y: 1.5, w: 10, h: 1.5, 
      fontSize: 54, fontFace: headingFont, color: 'FFFFFF', 
      bold: true, align: 'center' 
    });

    lastSlide.addShape(pptx.ShapeType.rect, { x: 4.5, y: 3, w: 1, h: 0.05, fill: { color: secondaryColor } });

    // Fix: Removed invalid 'opacity' property from TextPropsOptions
    lastSlide.addText(`Reference: ${item.title}`, { 
      x: 1, y: 4, w: 8, h: 1, 
      fontSize: 10, fontFace: bodyFont, color: 'FFFFFF', 
      align: 'center'
    });

    // 3. EXPORT & SAVE
    onProgress?.("Finalizing Cloud Sync...");
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
    console.error("Presentation Builder Error:", error);
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
