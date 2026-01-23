
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - TEXT ONLY "PURE COMPATIBILITY" EDITION
 * Strategi: 
 * 1. Tanpa Master Slide (menghindari layering issue).
 * 2. Koordinat Inci murni (menghindari mixed unit issue).
 * 3. Layout Direct (styling langsung di tiap slide).
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
    // 1. GENERATE BLUEPRINT
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

    // Clean JSON Resiliently
    if (aiResText.includes('{')) {
      const start = aiResText.indexOf('{');
      const end = aiResText.lastIndexOf('}');
      if (start !== -1 && end !== -1) aiResText = aiResText.substring(start, end + 1);
    }

    let blueprint = JSON.parse(aiResText || '{"slides":[]}');
    if (blueprint.presentation && blueprint.presentation.slides) blueprint = blueprint.presentation;
    if (!blueprint.slides || !Array.isArray(blueprint.slides)) throw new Error("Invalid AI structure.");
    
    // 2. INITIALIZE PPTX
    onProgress?.("Building Slides...");
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9'; // Standar Google Slides

    // Theme Colors (Safe Hex)
    const primaryColor = (config.theme.primaryColor || '004A74').replace('#', '');
    const headingFont = 'Arial'; // Gunakan font paling standar untuk tes
    const bodyFont = 'Arial';

    // --- SLIDE 1: COVER (Direct Styling) ---
    const slide1 = pptx.addSlide();
    // Background Accent (Gamma Style)
    slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.1, h: 5.625, fill: { color: primaryColor } });
    
    // Title - Menggunakan Inci (x: 1 inci, y: 1.5 inci, w: 8 inci)
    slide1.addText(config.title.toUpperCase(), { 
      x: 1, y: 1.5, w: 8, h: 1.5, 
      fontSize: 36, fontFace: headingFont, color: primaryColor, 
      bold: true, align: 'center', valign: 'middle'
    });
    
    // Separator
    slide1.addShape(pptx.ShapeType.rect, { x: 4, y: 3.2, w: 2, h: 0.04, fill: { color: primaryColor } });

    // Presenters
    slide1.addText(`PRESENTED BY:\n${config.presenters.join(', ')}`, { 
      x: 1, y: 3.8, w: 8, h: 1, 
      fontSize: 14, fontFace: bodyFont, color: '666666', 
      align: 'center', bold: true 
    });

    // --- CONTENT SLIDES ---
    for (const sData of blueprint.slides) {
      onProgress?.(`Building: ${sData.title}...`);
      const slide = pptx.addSlide();
      
      // Decorative Header Bar
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.3, w: 0.5, h: 0.05, fill: { color: primaryColor } });

      // Slide Title
      slide.addText(sData.title, { 
        x: 0.5, y: 0.5, w: 9, h: 0.8, 
        fontSize: 28, fontFace: headingFont, color: primaryColor, 
        bold: true, valign: 'top' 
      });

      // Body Content
      const contentText = Array.isArray(sData.content) ? sData.content.join('\n\n') : String(sData.content);
      slide.addText(contentText, { 
        x: 0.5, y: 1.5, w: 9, h: 3.5, 
        fontSize: 16, fontFace: bodyFont, color: '333333', 
        bullet: { indent: 20 }, valign: 'top', lineSpacing: 24
      });

      // Simple Footer
      slide.addText("XEENAPS PKM", { 
        x: 0.5, y: 5.2, w: 4, h: 0.3, 
        fontSize: 8, fontFace: bodyFont, color: 'CCCCCC', align: 'left' 
      });
    }

    // --- FINAL SLIDE: SUMMARY ---
    const lastSlide = pptx.addSlide();
    lastSlide.addText("REFERENCE", { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 24, bold: true, color: primaryColor });
    lastSlide.addText(`Source Material: ${item.title}`, { x: 0.5, y: 1.2, w: 9, h: 1, fontSize: 12, color: '666666' });
    lastSlide.addText("END OF PRESENTATION", { x: 0, y: 2.5, w: 10, h: 1, fontSize: 32, bold: true, color: primaryColor, align: 'center' });

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
