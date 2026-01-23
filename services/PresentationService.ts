
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - THE "ULTIMATE GAMMA" ENGINE V2
 * Strategi: Multi-Layout Cards, Rounded Corners, and Adaptive Typography.
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
    // 1. GENERATE BLUEPRINT DENGAN INSTRUKSI LAYOUT
    onProgress?.("AI is designing layouts...");
    const blueprintPrompt = `ACT AS A SENIOR UI/UX & PRESENTATION DESIGNER.
    CREATE A DETAILED PRESENTATION BLUEPRINT IN JSON FORMAT FOR: "${config.title}"
    SOURCE MATERIAL: ${item.abstract || item.title}
    ADDITIONAL CONTEXT: ${config.context}
    
    REQUIREMENTS:
    - EXACTLY ${config.slidesCount} CONTENT SLIDES.
    - FOR EACH SLIDE, ASSIGN A "layoutType" FROM: ["CENTER_CARD", "SPLIT_VIEW", "KEY_HIGHLIGHT", "MODERN_LIST"].
    - LANGUAGE: ${config.language}.
    - OUTPUT RAW JSON ONLY.

    FORMAT:
    {
      "slides": [
        { 
          "title": "Slide Title", 
          "content": ["Point 1", "Point 2"], 
          "layoutType": "SPLIT_VIEW",
          "highlight": "Optional key takeaway string" 
        }
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
    
    // 2. INITIALIZE PPTX
    onProgress?.("Applying Premium Styling...");
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';

    const primaryColor = (config.theme.primaryColor || '004A74').replace('#', '');
    const secondaryColor = (config.theme.secondaryColor || 'FED400').replace('#', '');
    const cardBg = 'FFFFFF';
    const softGray = 'F1F5F9';

    // HELPER: Get Adaptive Font Size
    const getFontSize = (text: string, baseSize: number) => {
      if (text.length > 150) return baseSize * 0.6;
      if (text.length > 80) return baseSize * 0.8;
      return baseSize;
    };

    // --- SLIDE 1: COVER (HERO CARD) ---
    const slide1 = pptx.addSlide();
    slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: softGray } });
    
    // Main Hero Card
    slide1.addShape(pptx.ShapeType.roundRect, { 
      x: 1, y: 1, w: 8, h: 3.6, 
      fill: { color: cardBg }, 
      line: { color: primaryColor, width: 2 },
      rectRadius: 0.2
    });

    const coverTitleSize = getFontSize(config.title, 36);
    slide1.addText(config.title.toUpperCase(), { 
      x: 1.5, y: 1.5, w: 7, h: 1.5, 
      fontSize: coverTitleSize, fontFace: 'Arial', color: primaryColor, 
      bold: true, align: 'center', valign: 'middle'
    });

    slide1.addShape(pptx.ShapeType.rect, { x: 4.5, y: 3.2, w: 1, h: 0.05, fill: { color: secondaryColor } });

    slide1.addText(`PRESENTED BY\n${config.presenters.join(', ')}`, { 
      x: 1.5, y: 3.5, w: 7, h: 0.8, 
      fontSize: 12, fontFace: 'Arial', color: '64748B', 
      align: 'center', bold: true 
    });

    // --- CONTENT SLIDES (MULTI-LAYOUT ENGINE) ---
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Building Slide ${idx + 1}: ${sData.layoutType}...`);
      const slide = pptx.addSlide();
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: softGray } });

      const contentText = Array.isArray(sData.content) ? sData.content.join('\n\n') : String(sData.content);

      if (sData.layoutType === 'SPLIT_VIEW') {
        // Layout: Sidebar + Main Card
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.4, y: 0.4, w: 2.8, h: 4.8, fill: { color: primaryColor }, rectRadius: 0.15 });
        slide.addText(sData.title, { x: 0.6, y: 0.6, w: 2.4, h: 4, fontSize: 22, color: 'FFFFFF', bold: true, valign: 'top' });
        
        slide.addShape(pptx.ShapeType.roundRect, { x: 3.4, y: 0.4, w: 6.2, h: 4.8, fill: { color: cardBg }, rectRadius: 0.15 });
        slide.addText(contentText, { x: 3.8, y: 0.8, w: 5.4, h: 4, fontSize: 14, color: '334155', bullet: { indent: 20 }, lineSpacing: 24 });
      } 
      else if (sData.layoutType === 'CENTER_CARD') {
        // Layout: Focused Center Card
        slide.addShape(pptx.ShapeType.roundRect, { x: 1, y: 0.5, w: 8, h: 4.6, fill: { color: cardBg }, line: { color: primaryColor, width: 1 }, rectRadius: 0.2 });
        slide.addText(sData.title, { x: 1.5, y: 0.8, w: 7, h: 0.6, fontSize: 24, color: primaryColor, bold: true, align: 'center' });
        slide.addShape(pptx.ShapeType.rect, { x: 4.5, y: 1.5, w: 1, h: 0.03, fill: { color: secondaryColor } });
        slide.addText(contentText, { x: 1.5, y: 1.8, w: 7, h: 3, fontSize: 14, color: '334155', align: 'center', lineSpacing: 22 });
      }
      else if (sData.layoutType === 'KEY_HIGHLIGHT') {
        // Layout: Modern Banner + Dual Cards
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.5, fill: { color: primaryColor } });
        slide.addText(sData.title, { x: 0.5, y: 0.3, w: 9, h: 0.9, fontSize: 26, color: 'FFFFFF', bold: true, valign: 'middle' });
        
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.8, w: 4.3, h: 3.2, fill: { color: cardBg }, rectRadius: 0.15 });
        slide.addText(contentText, { x: 0.8, y: 2.1, w: 3.7, h: 2.6, fontSize: 13, color: '334155', bullet: true });

        // Fix: Moved opacity to fill.transparency (opacity 10% = 90% transparency) as opacity is not a direct ShapeProps property
        slide.addShape(pptx.ShapeType.roundRect, { x: 5.2, y: 1.8, w: 4.3, h: 3.2, fill: { color: primaryColor, transparency: 90 }, rectRadius: 0.15 });
        slide.addText(sData.highlight || "Key Insight", { x: 5.5, y: 2.5, w: 3.7, h: 2, fontSize: 20, color: primaryColor, italic: true, bold: true, align: 'center' });
      }
      else {
        // Default: MODERN_LIST
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 0.4, w: 9, h: 4.8, fill: { color: cardBg }, rectRadius: 0.15 });
        slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.4, w: 0.1, h: 4.8, fill: { color: primaryColor } });
        slide.addText(sData.title, { x: 0.8, y: 0.7, w: 8, h: 0.6, fontSize: 24, color: primaryColor, bold: true });
        slide.addText(contentText, { x: 0.8, y: 1.5, w: 8, h: 3.4, fontSize: 15, color: '334155', bullet: { indent: 20 }, lineSpacing: 26 });
      }

      // Consistent Footer
      slide.addText(`Slide ${idx + 1} | XEENAPS INSIGHT`, { x: 0.5, y: 5.3, w: 9, h: 0.2, fontSize: 8, color: '94A3B8', align: 'right', bold: true });
    });

    // --- FINAL SLIDE: SUMMARY ---
    const lastSlide = pptx.addSlide();
    lastSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: primaryColor } });
    lastSlide.addText("THANK YOU", { x: 0, y: 2, w: 10, h: 1, fontSize: 48, color: 'FFFFFF', bold: true, align: 'center' });
    lastSlide.addShape(pptx.ShapeType.rect, { x: 4.5, y: 3.2, w: 1, h: 0.05, fill: { color: secondaryColor } });
    // Fix: Removed unsupported opacity property for text to comply with TextPropsOptions interface
    lastSlide.addText(`Generated from: ${item.title}`, { x: 1, y: 4.5, w: 8, h: 0.5, fontSize: 10, color: 'FFFFFF', align: 'center' });

    // 3. EXPORT & SAVE
    onProgress?.("Syncing with Google Drive...");
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
