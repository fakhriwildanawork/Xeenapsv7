
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS UNIVERSAL ARCHITECT V8.0
 * Optimized for: Precision Auto-fit, Dynamic Grids, High-Contrast Readability.
 */

export const createPresentationWorkflow = async (
  item: LibraryItem,
  config: {
    title: string;
    context: string;
    presenters: string[];
    theme: PresentationThemeConfig;
    slidesCount: number;
    language: string;
  },
  onProgress?: (stage: string) => void
): Promise<PresentationItem | null> => {
  try {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Xeenaps PKM';

    const primaryColor = (config.theme.primaryColor || '004A74').replace('#', '');
    const secondaryColor = (config.theme.secondaryColor || 'FED400').replace('#', '');
    
    // Global Constants for High-Contrast Premium Design
    const FONT_MAIN = 'Inter';
    const BG_GLOBAL = 'FFFFFF'; // Standardized Clean White Background
    const CARD_GLASS = 'F8FAFC'; // Lightest Gray-Blue for card background to ensure 100% contrast
    const TEXT_DARK = '1E293B'; // Deep Slate for content

    const cleanText = (text: string) => text.replace(/[\*_#]/g, '').trim();

    // Helper: Draw Enhanced Content Card with Side Accent
    const drawContentCard = (slide: any, x: number, y: number, w: number, h: number, lines: string[]) => {
      // 1. Main Card Body
      slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w, h,
        fill: { color: CARD_GLASS },
        line: { color: 'E2E8F0', width: 1.0 },
        rectRadius: 0.1,
        shadow: { type: 'outer', color: 'CBD5E1', blur: 12, offset: { x: 0, y: 4 }, transparency: 80 }
      });

      // 2. Left Decorative Border (Smart Color Usage)
      slide.addShape(pptx.ShapeType.rect, {
        x: x + 0.05, y: y + 0.2, w: 0.04, h: h - 0.4,
        fill: { color: primaryColor }
      });

      // 3. Top Accent Line (Secondary Color)
      slide.addShape(pptx.ShapeType.rect, {
        x: x + 0.3, y: y + 0.05, w: w - 0.6, h: 0.02,
        fill: { color: secondaryColor }
      });

      // 4. Text Logic with adaptive font sizing
      const fontSize = lines.length > 5 ? 10 : 11;
      const textObjects = lines.map(line => ({
        text: cleanText(line),
        options: {
          fontSize: fontSize,
          fontFace: FONT_MAIN,
          color: TEXT_DARK,
          lineSpacing: 22,
          bullet: { type: 'bullet', color: primaryColor },
          breakLine: true
        }
      }));

      slide.addText(textObjects, {
        x: x + 0.3, y: y + 0.3, w: w - 0.6, h: h - 0.6,
        valign: 'top', wrap: true, charSpacing: 0
      });
    };

    // ==========================================
    // 1. INTELLIGENT AI SYNTHESIS (GRID-AWARE)
    // ==========================================
    onProgress?.("AI is architecting adaptive structural grids...");
    
    const blueprintPrompt = `ACT AS A SENIOR INFORMATION ARCHITECT.
    SYNTHESIZE THIS SOURCE INTO A PREMIUM STRATEGIC PRESENTATION: "${config.title}"
    SOURCE: ${item.abstract || item.title}
    CONTEXT: ${config.context}
    
    CRITICAL LAYOUT REQUIREMENTS:
    - EXACTLY ${config.slidesCount} CONTENT SLIDES.
    - FOR EACH SLIDE, ANALYZE CONTENT DENSITY AND CHOOSE ONE STRATEGY:
      * "1_GRID": Single wide card for narrative flow.
      * "2_GRID": Two vertical columns for comparison or distinct points.
      * "3_GRID": Three vertical columns for taxonomy or phased insights.
      * "2_ROW": Two horizontal rows for process flows or temporal data.
    - LANGUAGE: ${config.language}.
    - FORMAT: RAW JSON ONLY.

    {
      "slides": [
        { 
          "title": "Strategic Heading", 
          "layoutStrategy": "2_GRID",
          "content": ["Phase 1 data...", "Phase 2 data...", "Component A...", "Component B..."]
        }
      ]
    }`;

    let aiResText = await callAiProxy('groq', blueprintPrompt);
    if (!aiResText) throw new Error("AI Synthesis failed.");

    if (aiResText.includes('{')) {
      const start = aiResText.indexOf('{');
      const end = aiResText.lastIndexOf('}');
      if (start !== -1 && end !== -1) aiResText = aiResText.substring(start, end + 1);
    }

    let blueprint = JSON.parse(aiResText || '{"slides":[]}');
    if (blueprint.presentation && blueprint.presentation.slides) blueprint = blueprint.presentation;

    // ==========================================
    // 2. SLIDE BUILDING (UNIVERSAL PRECISION)
    // ==========================================
    
    // --- COVER SLIDE (WHITE BACKGROUND, PRECISION FIT) ---
    onProgress?.("Architecting Precision Cover...");
    const cover = pptx.addSlide();
    cover.background = { color: BG_GLOBAL }; 

    // Visual Flourish using Brand Colors
    cover.addShape(pptx.ShapeType.ellipse, { x: 7, y: -1, w: 4, h: 4, fill: { color: primaryColor, transparency: 90 } });
    cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.1, h: 5.6, fill: { color: secondaryColor } });

    // LARGE TITLE BOX - Centered and Robust fit
    // Width 9.5 covers almost entire slide, x: 0.25 keeps it centered with small margin
    cover.addText(config.title.toUpperCase(), {
      x: 0.5, y: 1.2, w: 9.0, h: 2.8,
      fontSize: 42, fontFace: FONT_MAIN, color: primaryColor, bold: true,
      align: 'center', valign: 'middle', 
      autoFit: true, wrap: true
    });

    // PRESENTER BOX
    cover.addText(`PRESENTED BY: ${config.presenters.join(' • ')}`, {
      x: 1.0, y: 4.2, w: 8.0, h: 0.4,
      fontSize: 12, fontFace: FONT_MAIN, color: '64748B', align: 'center', bold: true
    });

    // --- CONTENT SLIDES (DYNAMIC GRID ENGINE) ---
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Building Smart Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      slide.background = { color: BG_GLOBAL };

      // Slide Header
      slide.addShape(pptx.ShapeType.rect, { x: 0.4, y: 0.4, w: 0.08, h: 0.7, fill: { color: primaryColor } });
      slide.addText(sData.title, {
        x: 0.65, y: 0.4, w: 8.8, h: 0.7,
        fontSize: 24, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'left', valign: 'middle'
      });
      slide.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.1, w: 9.2, h: 0.01, fill: { color: secondaryColor } });

      const strategy = sData.layoutStrategy || '1_GRID';
      const content = sData.content || [];
      const margin = 0.4;
      const startY = 1.4;
      const totalW = 9.2;
      const totalH = 3.8;

      // Adapt Grid Logic based on AI Decision
      if (strategy === '2_GRID') {
        const half = Math.ceil(content.length / 2);
        drawContentCard(slide, margin, startY, 4.5, totalH, content.slice(0, half));
        drawContentCard(slide, margin + 4.7, startY, 4.5, totalH, content.slice(half));
      } else if (strategy === '3_GRID') {
        const third = Math.ceil(content.length / 3);
        drawContentCard(slide, margin, startY, 2.95, totalH, content.slice(0, third));
        drawContentCard(slide, margin + 3.1, startY, 2.95, totalH, content.slice(third, third * 2));
        drawContentCard(slide, margin + 6.2, startY, 2.95, totalH, content.slice(third * 2));
      } else if (strategy === '2_ROW') {
        const half = Math.ceil(content.length / 2);
        drawContentCard(slide, margin, startY, totalW, 1.8, content.slice(0, half));
        drawContentCard(slide, margin, startY + 2.0, totalW, 1.8, content.slice(half));
      } else {
        // Default 1_GRID / 1_ROW
        drawContentCard(slide, margin, startY, totalW, totalH, content);
      }

      // Branding Footer
      slide.addText(`XEENAPS ANALYTICS • 0${idx + 1}`, {
        x: 0.5, y: 5.3, w: 9, h: 0.3,
        fontSize: 7, fontFace: FONT_MAIN, color: 'CBD5E1', align: 'right', bold: true
      });
    });

    // --- CLOSING: BIBLIOGRAPHY ---
    const bibSlide = pptx.addSlide();
    bibSlide.background = { color: BG_GLOBAL };
    bibSlide.addText("BIBLIOGRAPHY", {
      x: 1, y: 0.6, w: 8, h: 0.6,
      fontSize: 26, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'center'
    });
    
    const bibText = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}.`;
    drawContentCard(bibSlide, 1, 1.5, 8, 3.2, [bibText]);

    bibSlide.addText("Knowledge Anchored by Xeenaps", {
      x: 0, y: 5.2, w: 10, h: 0.3,
      fontSize: 8, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'center'
    });

    // ==========================================
    // 3. EXPORT & SYNC
    // ==========================================
    onProgress?.("Securing to Xeenaps Cloud Node...");
    const base64Pptx = await pptx.write({ outputType: 'base64' }) as string;

    const presentationData: Partial<PresentationItem> = {
      id: crypto.randomUUID(),
      collectionIds: [item.id],
      title: config.title,
      presenters: config.presenters,
      templateName: PresentationTemplate.MODERN,
      themeConfig: {
        primaryColor: `#${primaryColor}`,
        secondaryColor: `#${secondaryColor}`,
        fontFamily: FONT_MAIN,
        headingFont: FONT_MAIN
      },
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
    throw new Error(result.message || "Failed to finalize presentation.");

  } catch (error) {
    console.error("Presentation Engine Failure:", error);
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
