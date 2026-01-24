
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS UNIVERSAL ARCHITECT V7
 * Focus: Inter Typography, Glassmorphism, Deep Academic Synthesis.
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
    const CARD_GLASS = 'FFFFFFD9'; // 85% opacity for glass effect

    const cleanText = (text: string) => text.replace(/[\*_#]/g, '').trim();

    // Helper: Glass Card Drawing
    const drawGlassCard = (slide: any, x: number, y: number, w: number, h: number) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w, h,
        fill: { color: CARD_GLASS },
        line: { color: 'E2E8F0', width: 0.5 },
        rectRadius: 0.15,
        shadow: {
          type: 'outer',
          color: '64748B',
          blur: 15,
          offset: { x: 0, y: 6 },
          transparency: 92
        }
      });
    };

    // ==========================================
    // 1. AI PROMPT (Deep Synthesis Engine)
    // ==========================================
    onProgress?.("AI is conducting a profound analytical synthesis...");
    
    const blueprintPrompt = `ACT AS A SENIOR STRATEGIC ANALYST AND RESEARCH ARCHITECT.
    TRANSFORM THIS SOURCE INTO A PROFOUND KNOWLEDGE PRESENTATION: "${config.title}"
    
    SOURCE MATERIAL: ${item.abstract || item.title}
    CONTEXT: ${config.context}
    
    CRITICAL REQUIREMENTS:
    - EXACTLY ${config.slidesCount} CONTENT SLIDES.
    - DEPTH: Provide highly technical, strategic, and theoretical insights. NO GENERIC POINTS.
    - STYLE: Dense academic narrative, structured in actionable points.
    - LANGUAGE: ${config.language}.
    - FORMAT: RAW JSON ONLY.

    {
      "slides": [
        { 
          "title": "A Profound Strategic Heading", 
          "content": [
            "Comprehensive technical implication 1...",
            "Deep methodological analysis 2...",
            "Strategic framework or future projection 3..."
          ]
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
    // 2. SLIDE BUILDING (The Universal Layout)
    // ==========================================
    
    // --- COVER SLIDE (Centered Gravity) ---
    onProgress?.("Designing Cover Slide...");
    const cover = pptx.addSlide();
    cover.background = { color: '0F172A' }; 

    // Decor
    cover.addShape(pptx.ShapeType.ellipse, { x: 7, y: -1, w: 5, h: 5, fill: { color: primaryColor, transparency: 80 } });
    
    // Title Box (Fixed size, Auto-fit font)
    cover.addText(config.title.toUpperCase(), {
      x: 1.0, y: 1.8, w: 8.0, h: 1.5,
      fontSize: 36, fontFace: FONT_MAIN, color: 'FFFFFF', bold: true,
      align: 'center', valign: 'middle', 
      autoFit: true, breakLine: true
    });

    // Presenter Box
    cover.addText(config.presenters.join(' • '), {
      x: 1.0, y: 3.5, w: 8.0, h: 0.4,
      fontSize: 11, fontFace: FONT_MAIN, color: '94A3B8', align: 'center', bold: true
    });

    // --- CONTENT SLIDES ---
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Architecting Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      slide.background = { color: BG_GLOBAL };

      // Header: Left Border Box + Title
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.5, w: 0.1, h: 0.6, fill: { color: primaryColor } });
      slide.addText(sData.title, {
        x: 0.75, y: 0.5, w: 8.5, h: 0.6,
        fontSize: 22, fontFace: FONT_MAIN, color: '1E293B', bold: true, align: 'left', valign: 'middle'
      });

      // Line Separator
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.15, w: 9, h: 0.01, fill: { color: 'E2E8F0' } });

      // Body Card (Glassmorphism)
      drawGlassCard(slide, 0.5, 1.4, 9.0, 3.8);

      const textObjects = sData.content.map((line: string) => ({
        text: cleanText(line),
        options: {
          fontSize: 12,
          fontFace: FONT_MAIN,
          color: '334155',
          lineSpacing: 24, // Consistent 1.0 spacing
          bullet: { type: 'bullet', color: primaryColor },
          breakLine: true
        }
      }));

      slide.addText(textObjects, {
        x: 0.8, y: 1.7, w: 8.4, h: 3.2,
        valign: 'top', wrap: true
      });

      slide.addText(`XEENAPS KNOWLEDGE ANCHOR • 0${idx + 1}`, {
        x: 0.5, y: 5.3, w: 9, h: 0.3,
        fontSize: 7, fontFace: FONT_MAIN, color: '94A3B8', align: 'right', bold: true
      });
    });

    // --- BIBLIOGRAPHY SLIDE ---
    onProgress?.("Finalizing Bibliography...");
    const bibSlide = pptx.addSlide();
    bibSlide.background = { color: 'F8FAFC' };

    bibSlide.addText("BIBLIOGRAPHY", {
      x: 1, y: 0.6, w: 8, h: 0.6,
      fontSize: 26, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'center'
    });

    drawGlassCard(bibSlide, 1, 1.4, 8, 3.5);
    
    const citation = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}.`;
    bibSlide.addText(cleanText(citation), {
      x: 1.4, y: 1.8, w: 7.2, h: 2.8,
      fontSize: 12, fontFace: FONT_MAIN, color: '475569', align: 'left', italic: true, lineSpacing: 26
    });

    bibSlide.addText("Knowledge Anchored by Xeenaps", {
      x: 0, y: 5.2, w: 10, h: 0.3,
      fontSize: 8, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'center'
    });

    // ==========================================
    // 3. EXPORT & SAVE
    // ==========================================
    onProgress?.("Syncing to Cloud...");
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
    throw new Error(result.message || "Failed to save presentation.");

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
