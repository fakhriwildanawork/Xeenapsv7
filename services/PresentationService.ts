
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS ELEGANT ARCHITECT V7
 * Focus: High-Density Knowledge, Glassmorphism UI, Standardized Excellence.
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
    
    // Global Styling Constants
    const FONT_MAIN = 'Inter';
    const BG_GLOBAL = 'FBFDFF'; // Ultra-clean off-white
    const CARD_GLASS = 'FFFFFFD9'; // 85% opacity white for glass effect

    // Helper: Clean Text
    const cleanText = (text: string) => text.replace(/[\*_#]/g, '').trim();

    // Helper: Smart Font Resizer
    const getSmartFontSize = (text: string, base: number) => {
      const len = text.length;
      if (len > 1000) return Math.max(9, base - 4);
      if (len > 600) return Math.max(10, base - 2);
      return base;
    };

    // Helper: Create Glass Card
    const drawGlassCard = (slide: any, x: number, y: number, w: number, h: number) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w, h,
        fill: { color: CARD_GLASS },
        line: { color: 'E2E8F0', width: 0.5 },
        rectRadius: 0.15,
        shadow: {
          type: 'outer',
          color: '64748B',
          blur: 20,
          offset: { x: 0, y: 8 },
          transparency: 90
        }
      });
    };

    // ==========================================
    // 1. AI PROMPT (Deep Synthesis)
    // ==========================================
    onProgress?.("AI is conducting a profound analysis...");
    
    const blueprintPrompt = `ACT AS A SENIOR STRATEGIC ANALYST AND ACADEMIC ARCHITECT.
    SYNTHESIZE THE FOLLOWING MATERIAL INTO A COMPREHENSIVE, DEEP, AND STRATEGIC PRESENTATION: "${config.title}"
    
    SOURCE MATERIAL: ${item.abstract || item.title}
    CONTEXT: ${config.context}
    
    CRITICAL REQUIREMENTS:
    - EXACTLY ${config.slidesCount} CONTENT SLIDES.
    - CONTENT DEPTH: Use highly professional, academic, and strategic language. 
    - AVOID: Simple bullet points or generic summaries.
    - FOCUS: Deep insights, theoretical implications, and complex conceptual frameworks.
    - STYLE: Dense but readable. Provide actionable high-level points.
    - LANGUAGE: ${config.language}.
    - FORMAT: RAW JSON ONLY.

    {
      "slides": [
        { 
          "title": "A Profound Strategic Heading", 
          "content": [
            "Comprehensive technical implication or insight 1...",
            "Deep methodological analysis or discovery 2...",
            "Strategic framework or future projection 3..."
          ]
        }
      ]
    }`;

    let aiResText = await callAiProxy('groq', blueprintPrompt);
    if (!aiResText) throw new Error("AI Synthesis failed.");

    // Extract JSON from potential noise
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
    onProgress?.("Designing Cover...");
    const cover = pptx.addSlide();
    cover.background = { color: '0F172A' }; // Dark Premium Background

    // Decorative Shapes
    cover.addShape(pptx.ShapeType.ellipse, { x: 6, y: -1, w: 6, h: 6, fill: { color: primaryColor, transparency: 85 } });
    cover.addShape(pptx.ShapeType.rect, { x: 1, y: 4.8, w: 0.5, h: 0.05, fill: { color: secondaryColor } });

    // Title Center
    cover.addText(config.title.toUpperCase(), {
      x: 1, y: 1.5, w: 8, h: 2,
      fontSize: 38, fontFace: FONT_MAIN, color: 'FFFFFF', bold: true,
      align: 'center', valign: 'middle', breakLine: true
    });

    // Presenters
    cover.addText(config.presenters.join(' • '), {
      x: 1, y: 3.8, w: 8, h: 0.5,
      fontSize: 12, fontFace: FONT_MAIN, color: '94A3B8', align: 'center', bold: true
    });

    // --- CONTENT SLIDES ---
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Architecting Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      slide.background = { color: BG_GLOBAL };

      // Header: Left Accent Box + Title
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.5, w: 0.08, h: 0.6, fill: { color: primaryColor } });
      slide.addText(sData.title, {
        x: 0.75, y: 0.5, w: 8.5, h: 0.6,
        fontSize: 24, fontFace: FONT_MAIN, color: '1E293B', bold: true, align: 'left', valign: 'middle'
      });

      // Line Separator
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.2, w: 9, h: 0.01, fill: { color: 'CBD5E1' } });

      // Body: Glassmorphism Card
      const cardX = 0.5;
      const cardY = 1.5;
      const cardW = 9.0;
      const cardH = 3.6;
      drawGlassCard(slide, cardX, cardY, cardW, cardH);

      const textObjects = sData.content.map((line: string) => ({
        text: cleanText(line),
        options: {
          fontSize: getSmartFontSize(sData.content.join(' '), 13),
          fontFace: FONT_MAIN,
          color: '334155',
          lineSpacing: 22,
          bullet: { type: 'bullet', color: primaryColor },
          breakLine: true
        }
      }));

      slide.addText(textObjects, {
        x: cardX + 0.3, y: cardY + 0.3, w: cardW - 0.6, h: cardH - 0.6,
        valign: 'top', wrap: true
      });

      // Branding Footer
      slide.addText(`XEENAPS KNOWLEDGE ANCHOR • 0${idx + 1}`, {
        x: 0.5, y: 5.2, w: 9, h: 0.3,
        fontSize: 8, fontFace: FONT_MAIN, color: '94A3B8', align: 'right', bold: true
      });
    });

    // --- CLOSING: BIBLIOGRAPHY ---
    onProgress?.("Finalizing Bibliography...");
    const bibSlide = pptx.addSlide();
    bibSlide.background = { color: 'F1F5F9' };

    bibSlide.addText("BIBLIOGRAPHY", {
      x: 1, y: 0.8, w: 8, h: 0.5,
      fontSize: 28, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'center'
    });

    drawGlassCard(bibSlide, 1, 1.5, 8, 3);
    
    const citation = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}.`;
    bibSlide.addText(cleanText(citation), {
      x: 1.3, y: 1.8, w: 7.4, h: 2.4,
      fontSize: 12, fontFace: FONT_MAIN, color: '475569', align: 'left', italic: true, lineSpacing: 24
    });

    bibSlide.addText("Knowledge Anchored by Xeenaps", {
      x: 0, y: 5.1, w: 10, h: 0.3,
      fontSize: 9, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'center'
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
      templateName: PresentationTemplate.MODERN, // Default internal mapping
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
