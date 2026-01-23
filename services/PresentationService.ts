import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - THE "MASTERPIECE" ENGINE V4
 * Strategi: Precise Spatial Awareness, Editorial Layouts, and Dynamic Glassmorphism.
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
    // 1. AI PROMPT: MINTA KONTEN BERSTRUKTUR TINGGI DENGAN HIGHLIGHT
    onProgress?.("AI is architecting editorial content...");
    const blueprintPrompt = `ACT AS A SENIOR EDITORIAL DESIGNER & ACADEMIC STRATEGIST.
    CREATE A DEEP, COMPREHENSIVE PRESENTATION BLUEPRINT IN JSON FORMAT FOR: "${config.title}"
    SOURCE MATERIAL: ${item.abstract || item.title}
    ADDITIONAL CONTEXT: ${config.context}
    
    REQUIREMENTS:
    - EXACTLY ${config.slidesCount} CONTENT SLIDES.
    - CONTENT QUALITY: Comprehensive narrative. Highlight key terms by wrapping them in **Bold** or _Italic_.
    - LAYOUTS: ["EDITORIAL_SPLIT", "GLASS_CARD_GRID", "FOCUS_QUOTE", "FEATURE_STAGGERED", "MINIMAL_SIDEBAR"].
    - LANGUAGE: ${config.language}.
    - OUTPUT RAW JSON ONLY.

    FORMAT:
    {
      "slides": [
        { 
          "title": "Editorial Title", 
          "content": ["Point 1 with **Highlight**", "Point 2 with _Emphasis_"], 
          "layoutType": "EDITORIAL_SPLIT",
          "summary": "One sentence profound takeaway"
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
    const BG_CLEAN = 'F8FAFC';

    // HELPER: SMART FONT SIZER (DENGAN SPACING VERTICAL AWARENESS)
    const calculateSafeFont = (text: string, base: number, containerHeight: number) => {
      const charLimit = containerHeight * 50; // Perkiraan kapasitas
      if (text.length > charLimit) return base * 0.55;
      if (text.length > charLimit * 0.7) return base * 0.75;
      return base;
    };

    // --- SLIDE 1: PREMIUM HERO COVER ---
    const slide1 = pptx.addSlide();
    slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: BG_CLEAN } });
    
    // Abstract Background Elements
    slide1.addShape(pptx.ShapeType.ellipse, { x: 7, y: -0.5, w: 4, h: 4, fill: { color: primaryColor, transparency: 95 } });
    slide1.addShape(pptx.ShapeType.roundRect, { x: -1, y: 3.5, w: 5, h: 3, fill: { color: secondaryColor, transparency: 92 }, rectRadius: 0.5 });

    // Glass Card
    slide1.addShape(pptx.ShapeType.roundRect, { 
      x: 0.8, y: 1.2, w: 8.4, h: 3.2, 
      fill: { color: 'FFFFFF', transparency: 5 }, 
      line: { color: primaryColor, width: 2 },
      rectRadius: 0.3 
    });

    const coverTitleSize = calculateSafeFont(config.title, 34, 1.5);
    slide1.addText(config.title.toUpperCase(), { 
      x: 1.2, y: 1.6, w: 7.6, h: 1.6, 
      fontSize: coverTitleSize, fontFace: FONT_MAIN, color: primaryColor, 
      bold: true, align: 'center', valign: 'middle', lineSpacing: 38
    });

    slide1.addShape(pptx.ShapeType.rect, { x: 4.5, y: 3.4, w: 1, h: 0.06, fill: { color: secondaryColor } });

    slide1.addText(`${config.presenters.join(' • ')}`, { 
      x: 1, y: 3.9, w: 8, h: 0.4, 
      fontSize: 12, fontFace: FONT_MAIN, color: '64748B', 
      align: 'center', bold: true, charSpacing: 2
    });

    // --- CONTENT ENGINE V4 ---
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Fine-tuning Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: BG_CLEAN } });

      const bodyText = Array.isArray(sData.content) ? sData.content.join('\n\n') : String(sData.content);

      if (sData.layoutType === 'EDITORIAL_SPLIT') {
        // Layout: Left Primary Block + Right Content Card
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 3.5, h: 5.625, fill: { color: primaryColor } });
        slide.addText(sData.title, { x: 0.4, y: 0.8, w: 2.7, h: 4, fontSize: calculateSafeFont(sData.title, 26, 3), fontFace: FONT_MAIN, color: 'FFFFFF', bold: true, valign: 'top', lineSpacing: 32 });
        
        slide.addShape(pptx.ShapeType.roundRect, { x: 3.8, y: 0.4, w: 5.8, h: 4.8, fill: { color: 'FFFFFF' }, shadow: { type: 'outer', blur: 10, offset: 2, color: '000000', opacity: 0.05 }, rectRadius: 0.2 });
        slide.addText(bodyText, { x: 4.2, y: 0.8, w: 5, h: 4, fontSize: 13, fontFace: FONT_MAIN, color: '334155', bullet: { indent: 20 }, lineSpacing: 28 });
      } 
      else if (sData.layoutType === 'GLASS_CARD_GRID') {
        // Layout: Centered Glass Card with Side Accents
        slide.addShape(pptx.ShapeType.ellipse, { x: 8.5, y: 1, w: 3, h: 3, fill: { color: secondaryColor, transparency: 85 } });
        slide.addText(sData.title, { x: 0.8, y: 0.4, w: 8.4, h: 0.8, fontSize: 24, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'center' });
        
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 1.4, w: 8.4, h: 3.5, fill: { color: 'FFFFFF' }, line: { color: primaryColor, width: 1 }, rectRadius: 0.25 });
        slide.addText(bodyText, { x: 1.2, y: 1.7, w: 7.6, h: 2.9, fontSize: 14, fontFace: FONT_MAIN, color: '475569', align: 'left', bullet: true, lineSpacing: 26 });
      }
      else if (sData.layoutType === 'FOCUS_QUOTE') {
        // Layout: High Contrast Insight Slide
        slide.addShape(pptx.ShapeType.roundRect, { x: 1, y: 1, w: 8, h: 3.6, fill: { color: primaryColor }, rectRadius: 0.3 });
        slide.addShape(pptx.ShapeType.rect, { x: 1.2, y: 1.2, w: 0.1, h: 3.2, fill: { color: secondaryColor } });
        slide.addText(sData.title, { x: 1.5, y: 1.5, w: 7, h: 2.6, fontSize: calculateSafeFont(sData.title, 28, 2), fontFace: FONT_MAIN, color: 'FFFFFF', italic: true, bold: true, align: 'center', valign: 'middle' });
        if (sData.summary) {
          slide.addText(sData.summary.toUpperCase(), { x: 1, y: 4.8, w: 8, h: 0.4, fontSize: 10, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'center', charSpacing: 3 });
        }
      }
      else if (sData.layoutType === 'FEATURE_STAGGERED') {
        // Layout: Title Top + Dual Cards Staggered
        slide.addText(sData.title, { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 24, fontFace: FONT_MAIN, color: primaryColor, bold: true });
        
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.3, w: 4.3, h: 3.8, fill: { color: 'FFFFFF' }, rectRadius: 0.2 });
        slide.addText(bodyText.split('\n\n').slice(0, 2).join('\n\n'), { x: 0.8, y: 1.6, w: 3.7, h: 3.2, fontSize: 12, fontFace: FONT_MAIN, color: '334155', bullet: true, lineSpacing: 24 });
        
        slide.addShape(pptx.ShapeType.roundRect, { x: 5.2, y: 0.8, w: 4.3, h: 3.8, fill: { color: primaryColor, transparency: 95 }, line: { color: primaryColor, width: 1 }, rectRadius: 0.2 });
        slide.addText(bodyText.split('\n\n').slice(2).join('\n\n'), { x: 5.5, y: 1.1, w: 3.7, h: 3.2, fontSize: 12, fontFace: FONT_MAIN, color: primaryColor, bold: true, bullet: true, lineSpacing: 24 });
      }
      else {
        // Default: MINIMAL_SIDEBAR
        slide.addShape(pptx.ShapeType.rect, { x: 0.4, y: 0.4, w: 0.05, h: 0.8, fill: { color: secondaryColor } });
        slide.addText(sData.title, { x: 0.6, y: 0.4, w: 8.8, h: 0.8, fontSize: 24, fontFace: FONT_MAIN, color: primaryColor, bold: true });
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.4, w: 9, h: 3.8, fill: { color: 'FFFFFF' }, rectRadius: 0.2 });
        slide.addText(bodyText, { x: 0.9, y: 1.8, w: 8.2, h: 3, fontSize: 14, fontFace: FONT_MAIN, color: '334155', bullet: { indent: 20 }, lineSpacing: 28 });
      }

      // Consistent Footer
      slide.addText(`XEENAPS KNOWLEDGE SERIES • PAGE ${idx + 2}`, { x: 0.5, y: 5.3, w: 9, h: 0.2, fontSize: 7, fontFace: FONT_MAIN, color: '94A3B8', align: 'right', bold: true });
    });

    // --- SLIDE AKHIR: THE BIBLIOGRAPHY (Daftar Pustaka Formal) ---
    onProgress?.("Formatting Bibliography...");
    const lastSlide = pptx.addSlide();
    lastSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: BG_CLEAN } });
    
    // Header Bibliography
    // Fix: Corrected incorrect slide reference from slide1 to lastSlide
    lastSlide.addShape(pptx.ShapeType.ellipse, { x: -1, y: -1, w: 3, h: 3, fill: { color: primaryColor, transparency: 90 } });
    lastSlide.addText("BIBLIOGRAPHY", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, fontFace: FONT_MAIN, color: primaryColor, bold: true });
    lastSlide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.3, w: 1.5, h: 0.05, fill: { color: secondaryColor } });

    // Bibliography Content (Harvard Reference)
    const citation = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}. ${item.publisher || ''}. Available at: ${item.doi ? 'https://doi.org/'+item.doi : item.url || 'Internal Source'}.`;
    
    lastSlide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.8, w: 9, h: 3, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.2 });
    lastSlide.addText(citation, { 
      x: 1, y: 2.2, w: 8, h: 2.2, 
      fontSize: 14, fontFace: FONT_MAIN, color: '334155', 
      italic: true, lineSpacing: 24, align: 'left'
    });

    // Fix: Changed 'opacity' to 'transparency' as 'opacity' is not a valid property in pptxgenjs TextPropsOptions
    lastSlide.addText("Knowledge is the anchor of progress.", { 
      x: 0, y: 5, w: 10, h: 0.4, 
      fontSize: 9, fontFace: FONT_MAIN, color: primaryColor, 
      bold: true, align: 'center', transparency: 50 
    });

    // 3. EXPORT & SAVE
    onProgress?.("Finalizing Google Slides...");
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
    console.error("Presentation Masterpiece Engine Error:", error);
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