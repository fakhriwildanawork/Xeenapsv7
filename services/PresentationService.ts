
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS UNIVERSAL ARCHITECT V7.5
 * Focus: Dynamic Grid Layouts, Precision Auto-fit, & Smart Color Contrast.
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
    
    // Global Constants
    const FONT_MAIN = 'Inter';
    const BG_GLOBAL = 'FBFDFF'; 
    const CARD_GLASS = 'FFFFFFE6'; // 90% opacity for better contrast

    const cleanText = (text: string) => text.replace(/[\*_#]/g, '').trim();

    // Helper: Draw Enhanced Glass Card with Left Accent Border
    const drawContentCard = (slide: any, x: number, y: number, w: number, h: number, lines: string[]) => {
      // 1. Shadow Layer
      slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w, h,
        fill: { color: CARD_GLASS },
        line: { color: 'E2E8F0', width: 0.5 },
        rectRadius: 0.1,
        shadow: { type: 'outer', color: '64748B', blur: 15, offset: { x: 0, y: 5 }, transparency: 90 }
      });

      // 2. Left Accent Border (Primary Color)
      slide.addShape(pptx.ShapeType.rect, {
        x: x + 0.02, y: y + 0.15, w: 0.04, h: h - 0.3,
        fill: { color: primaryColor }
      });

      // 3. Text Content
      const textObjects = lines.map(line => ({
        text: cleanText(line),
        options: {
          fontSize: lines.length > 5 ? 10 : 11,
          fontFace: FONT_MAIN,
          color: '1E293B', // High contrast dark blue-gray
          lineSpacing: 24,
          bullet: { type: 'bullet', color: primaryColor },
          breakLine: true
        }
      }));

      slide.addText(textObjects, {
        x: x + 0.25, y: y + 0.2, w: w - 0.45, h: h - 0.4,
        valign: 'top', wrap: true
      });
    };

    // ==========================================
    // 1. DEEP AI SYNTHESIS (Layout-Aware)
    // ==========================================
    onProgress?.("AI is architecting multi-layered layouts...");
    
    const blueprintPrompt = `ACT AS A SENIOR STRATEGIC ANALYST.
    SYNTHESIZE THIS SOURCE INTO A DEEP KNOWLEDGE PRESENTATION: "${config.title}"
    SOURCE: ${item.abstract || item.title}
    CONTEXT: ${config.context}
    
    REQUIREMENTS:
    - EXACTLY ${config.slidesCount} CONTENT SLIDES.
    - DEPTH: Highly technical and strategic.
    - LAYOUT STRATEGY: For each slide, choose one: "SINGLE", "DUO_COL", "TRI_COL", or "STACKED_ROWS" based on content density.
    - LANGUAGE: ${config.language}.
    - FORMAT: RAW JSON ONLY.

    {
      "slides": [
        { 
          "title": "Strategic Heading", 
          "layoutStrategy": "DUO_COL",
          "content": ["Point A...", "Point B...", "Point C...", "Point D..."]
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
    // 2. SLIDE BUILDING
    // ==========================================
    
    // --- COVER SLIDE (Enhanced Center Gravity) ---
    onProgress?.("Finalizing Cover Precision...");
    const cover = pptx.addSlide();
    cover.background = { color: '0F172A' }; 

    // Decor
    cover.addShape(pptx.ShapeType.ellipse, { x: 7.5, y: -0.5, w: 4, h: 4, fill: { color: primaryColor, transparency: 85 } });
    cover.addShape(pptx.ShapeType.rect, { x: 4.5, y: 4.2, w: 1, h: 0.04, fill: { color: secondaryColor } });
    
    // Title Box (Large Centered Box, Shrink Text to Fit)
    cover.addText(config.title.toUpperCase(), {
      x: 0.5, y: 1.5, w: 9.0, h: 2.5,
      fontSize: 40, fontFace: FONT_MAIN, color: 'FFFFFF', bold: true,
      align: 'center', valign: 'middle', 
      autoFit: true, wrap: true
    });

    // Presenter Box
    cover.addText(config.presenters.join(' • '), {
      x: 1.0, y: 4.5, w: 8.0, h: 0.4,
      fontSize: 11, fontFace: FONT_MAIN, color: '94A3B8', align: 'center', bold: true
    });

    // --- CONTENT SLIDES (Dynamic Grid Engine) ---
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Building Adaptive Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      slide.background = { color: BG_GLOBAL };

      // Header UI
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.4, w: 0.1, h: 0.7, fill: { color: primaryColor } });
      slide.addText(sData.title, {
        x: 0.75, y: 0.4, w: 8.5, h: 0.7,
        fontSize: 24, fontFace: FONT_MAIN, color: '1E293B', bold: true, align: 'left', valign: 'middle'
      });
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.1, w: 9, h: 0.01, fill: { color: secondaryColor, transparency: 50 } });

      const strategy = sData.layoutStrategy || 'SINGLE';
      const content = sData.content || [];
      const margin = 0.5;
      const startY = 1.4;
      const totalW = 9.0;
      const totalH = 3.8;

      if (strategy === 'DUO_COL') {
        const half = Math.ceil(content.length / 2);
        drawContentCard(slide, margin, startY, 4.4, totalH, content.slice(0, half));
        drawContentCard(slide, margin + 4.6, startY, 4.4, totalH, content.slice(half));
      } else if (strategy === 'TRI_COL') {
        const third = Math.ceil(content.length / 3);
        drawContentCard(slide, margin, startY, 2.9, totalH, content.slice(0, third));
        drawContentCard(slide, margin + 3.05, startY, 2.9, totalH, content.slice(third, third * 2));
        drawContentCard(slide, margin + 6.1, startY, 2.9, totalH, content.slice(third * 2));
      } else if (strategy === 'STACKED_ROWS') {
        const half = Math.ceil(content.length / 2);
        drawContentCard(slide, margin, startY, totalW, 1.8, content.slice(0, half));
        drawContentCard(slide, margin, startY + 2.0, totalW, 1.8, content.slice(half));
      } else {
        drawContentCard(slide, margin, startY, totalW, totalH, content);
      }

      // Branding Footer
      slide.addText(`XEENAPS KNOWLEDGE ANCHOR • 0${idx + 1}`, {
        x: 0.5, y: 5.3, w: 9, h: 0.3,
        fontSize: 7, fontFace: FONT_MAIN, color: '94A3B8', align: 'right', bold: true
      });
    });

    // --- CLOSING: BIBLIOGRAPHY ---
    const bibSlide = pptx.addSlide();
    bibSlide.background = { color: 'F8FAFC' };
    bibSlide.addText("BIBLIOGRAPHY", {
      x: 1, y: 0.6, w: 8, h: 0.6,
      fontSize: 26, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'center'
    });
    
    // Large elegant bibliography card
    const bibText = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}.`;
    drawContentCard(bibSlide, 1, 1.5, 8, 3.2, [bibText]);

    bibSlide.addText("Knowledge Anchored by Xeenaps", {
      x: 0, y: 5.2, w: 10, h: 0.3,
      fontSize: 8, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'center'
    });

    // ==========================================
    // 3. EXPORT & SAVE
    // ==========================================
    onProgress?.("Syncing to Cloud Drive...");
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
    throw new Error(result.message || "Failed to save.");

  } catch (error) {
    console.error("Presentation Engine Error:", error);
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
