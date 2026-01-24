
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - THE "GAMMA ARCHITECT" ENGINE V5
 * Fokus: Kebersihan visual total, Spacing Editorial, & Konten Akademis Mendalam.
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
    // 1. AI PROMPT UPGRADE: MINTA ANALISIS MENDALAM (DEEP CONTENT)
    onProgress?.("AI is conducting deep knowledge synthesis...");
    const blueprintPrompt = `ACT AS A TOP-TIER KNOWLEDGE ARCHITECT.
    ANALYZE AND SYNTHESIZE THIS MATERIAL INTO A HIGH-LEVEL STRATEGIC PRESENTATION: "${config.title}"
    SOURCE: ${item.abstract || item.title}
    CONTEXT: ${config.context}
    
    REQUIREMENTS:
    - EXACTLY ${config.slidesCount} CONTENT SLIDES.
    - CONTENT DEPTH: Provide comprehensive, professional, and dense information. Do not use generic points.
    - NO MARKDOWN: Do NOT use asterisks (*), underscores (_), or hashes (#). Use plain text.
    - LAYOUTS: ["GAMMA_SPLIT", "CARD_GRID_DEEP", "HERO_FOCAL", "STAGGERED_INSIGHT", "EDITORIAL_COLUMN"] MAKE VERY MODERN AND PROFESSIONAL.
    - EVERY CONTENT LAYOUT OR ELEMENT SHOULD NOT EXCESS THE CONTAINER / BOX AND NOT OVERLAPPING EACH OTHER
    - LANGUAGE: ${config.language}.
    - OUTPUT RAW JSON ONLY.

    FORMAT:
    {
      "slides": [
        { 
          "title": "Deep Strategic Title", 
          "content": ["Comprehensive discovery 1...", "Detailed implication 2...", "Technical methodology 3...", "Future outlook 4..."], 
          "layoutType": "GAMMA_SPLIT",
          "takeaway": "Critical strategic essence of this slide"
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
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';

    const primaryColor = (config.theme.primaryColor || '004A74').replace('#', '');
    const secondaryColor = (config.theme.secondaryColor || 'FED400').replace('#', '');
    const FONT_MAIN = 'Poppins';
    const BG_CLEAN = 'FDFDFD'; // Slightly warmer white for luxury feel

    // HELPER: CLEAN TEXT (Remove Markdown Artifacts)
    const cleanText = (text: string) => {
      return text.replace(/[\*_#]/g, '').trim();
    };

    // HELPER: SMART FONT SIZER (EDITORIAL AWARENESS)
    const getSafeFontSize = (text: string, base: number, isTitle: boolean = false) => {
      const len = text.length;
      if (isTitle) {
        if (len > 80) return base * 0.6;
        if (len > 50) return base * 0.8;
        return base;
      }
      if (len > 800) return 10;
      if (len > 500) return 11.5;
      if (len > 300) return 13;
      return base;
    };

    // --- SLIDE 1: PREMIER HERO COVER ---
    const slide1 = pptx.addSlide();
    slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: primaryColor } });
    slide1.addShape(pptx.ShapeType.ellipse, { x: 6, y: -1, w: 6, h: 6, fill: { color: 'FFFFFF', transparency: 94 } });
    
    const coverTitle = cleanText(config.title).toUpperCase();
    slide1.addText(coverTitle, { 
      x: 1, y: 1.5, w: 8, h: 2, 
      fontSize: getSafeFontSize(coverTitle, 36, true), fontFace: FONT_MAIN, color: 'FFFFFF', 
      bold: true, align: 'center', valign: 'middle', lineSpacing: 40
    });

    slide1.addShape(pptx.ShapeType.rect, { x: 4.5, y: 3.5, w: 1, h: 0.05, fill: { color: secondaryColor } });
    slide1.addText(config.presenters.join(' • '), { 
      x: 1, y: 4, w: 8, h: 0.5, 
      fontSize: 12, fontFace: FONT_MAIN, color: 'FFFFFF', 
      align: 'center', bold: true, charSpacing: 2, transparency: 20
    });

    // --- CONTENT ENGINE V5 ---
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Architecting Slide ${idx + 1}: ${sData.layoutType}...`);
      const slide = pptx.addSlide();
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: BG_CLEAN } });
      
      const sTitle = cleanText(sData.title);
      const sPoints = Array.isArray(sData.content) ? sData.content.map(cleanText) : [cleanText(sData.content)];
      const sContent = sPoints.join('\n\n');
      const fontSize = getSafeFontSize(sContent, 14);

      if (sData.layoutType === 'GAMMA_SPLIT') {
        // Layout: High Contrast Editorial Split
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 3.8, h: 5.625, fill: { color: primaryColor } });
        slide.addShape(pptx.ShapeType.rect, { x: 3.5, y: 1, w: 0.1, h: 3.6, fill: { color: secondaryColor } });
        
        slide.addText(sTitle, { x: 0.5, y: 1, w: 2.8, h: 3.6, fontSize: getSafeFontSize(sTitle, 26, true), fontFace: FONT_MAIN, color: 'FFFFFF', bold: true, valign: 'middle', align: 'left' });
        
        slide.addShape(pptx.ShapeType.roundRect, { x: 4.2, y: 0.6, w: 5.3, h: 4.4, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.2 });
        slide.addText(sContent, { x: 4.5, y: 0.9, w: 4.7, h: 3.8, fontSize: fontSize, fontFace: FONT_MAIN, color: '334155', bullet: { indent: 20 }, lineSpacing: 28 });
      } 
      else if (sData.layoutType === 'CARD_GRID_DEEP') {
        // Layout: Dynamic Card Grid (Gamma Style)
        slide.addText(sTitle, { x: 0.6, y: 0.4, w: 8.8, h: 0.7, fontSize: 24, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'left' });
        slide.addShape(pptx.ShapeType.rect, { x: 0.6, y: 1.1, w: 1, h: 0.04, fill: { color: secondaryColor } });
        
        const cardW = 4.3;
        const cardH = 3.6;
        // Card 1
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 1.4, w: cardW, h: cardH, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.25 });
        slide.addText(sPoints.slice(0, Math.ceil(sPoints.length/2)).join('\n\n'), { x: 0.9, y: 1.7, w: cardW - 0.6, h: cardH - 0.6, fontSize: fontSize - 1, fontFace: FONT_MAIN, color: '475569', bullet: true, lineSpacing: 24 });
        
        // Card 2
        slide.addShape(pptx.ShapeType.roundRect, { x: 5.1, y: 1.4, w: cardW, h: cardH, fill: { color: primaryColor, transparency: 96 }, line: { color: primaryColor, width: 1 }, rectRadius: 0.25 });
        slide.addText(sPoints.slice(Math.ceil(sPoints.length/2)).join('\n\n'), { x: 5.4, y: 1.7, w: cardW - 0.6, h: cardH - 0.6, fontSize: fontSize - 1, fontFace: FONT_MAIN, color: primaryColor, bold: true, bullet: true, lineSpacing: 24 });
      }
      else if (sData.layoutType === 'HERO_FOCAL') {
        // Layout: Immersive Central Card
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 0.8, w: 8.4, h: 4, fill: { color: 'FFFFFF' }, line: { color: primaryColor, width: 2 }, rectRadius: 0.4 });
        slide.addText(sTitle, { x: 1.2, y: 1.2, w: 7.6, h: 0.8, fontSize: 28, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'center' });
        slide.addShape(pptx.ShapeType.rect, { x: 4.5, y: 2.1, w: 1, h: 0.04, fill: { color: secondaryColor } });
        slide.addText(sContent, { x: 1.5, y: 2.4, w: 7, h: 2, fontSize: fontSize + 1, fontFace: FONT_MAIN, color: '334155', align: 'center', lineSpacing: 30 });
      }
      else {
        // Default: EDITORIAL_COLUMN
        slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.5, w: 0.1, h: 0.8, fill: { color: primaryColor } });
        slide.addText(sTitle, { x: 0.7, y: 0.5, w: 8.8, h: 0.8, fontSize: 24, fontFace: FONT_MAIN, color: primaryColor, bold: true });
        
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.5, w: 9, h: 3.6, fill: { color: 'FFFFFF' }, line: { color: 'F1F5F9', width: 2 }, rectRadius: 0.2 });
        slide.addText(sContent, { x: 0.9, y: 1.8, w: 8.2, h: 3, fontSize: fontSize, fontFace: FONT_MAIN, color: '334155', bullet: { indent: 20 }, lineSpacing: 26 });
      }

      // Safe Zone Footer (Xeenaps Branding)
      slide.addText(`XEENAPS KNOWLEDGE SERIES • SLIDE ${idx + 2}`, { 
        x: 0.5, y: 5.2, w: 9, h: 0.3, 
        fontSize: 8, fontFace: FONT_MAIN, color: '94A3B8', align: 'right', bold: true, charSpacing: 1 
      });
    });

    // --- SLIDE AKHIR: ARCHIVAL BIBLIOGRAPHY ---
    onProgress?.("Generating Archival Bibliography...");
    const lastSlide = pptx.addSlide();
    lastSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: 'F8FAFC' } });
    lastSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1, fill: { color: primaryColor } });
    
    lastSlide.addText("BIBLIOGRAPHY & SOURCES", { x: 0.5, y: 0.2, w: 9, h: 0.6, fontSize: 24, fontFace: FONT_MAIN, color: 'FFFFFF', bold: true, align: 'left' });
    
    const citation = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}. ${item.publisher || 'Internal Repository'}.`;
    
    slide1.addShape(pptx.ShapeType.ellipse, { x: 8, y: 4, w: 3, h: 3, fill: { color: secondaryColor, transparency: 90 } });
    
    lastSlide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.5, w: 9, h: 3, fill: { color: 'FFFFFF' }, line: { color: primaryColor, width: 1 }, rectRadius: 0.2 });
    lastSlide.addText(cleanText(citation), { 
      x: 1, y: 2, w: 8, h: 2, 
      fontSize: 13, fontFace: FONT_MAIN, color: '475569', 
      italic: true, lineSpacing: 24, align: 'left'
    });

    lastSlide.addText("Knowledge Anchored by Xeenaps PKM", { 
      x: 0, y: 5, w: 10, h: 0.5, 
      fontSize: 9, fontFace: FONT_MAIN, color: primaryColor, 
      bold: true, align: 'center', transparency: 60 
    });

    // 3. EXPORT & SAVE
    onProgress?.("Syncing Master Copy...");
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
