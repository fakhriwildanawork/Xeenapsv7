
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - THE "GAMMA ARCHITECT" ENGINE V6 (REFACTORED)
 * Focus: Template-Driven Layouts, Smart Typography, Zero-Overflows.
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
    // ==========================================
    // 1. CONFIGURATION & CONSTANTS
    // ==========================================
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Xeenaps PKM';
    pptx.company = 'Xeenaps';

    const primaryColor = (config.theme.primaryColor || '004A74').replace('#', '');
    const secondaryColor = (config.theme.secondaryColor || 'FED400').replace('#', '');
    
    // Font Settings
    const FONT_TITLE = 'Montserrat'; // Modern & Bold
    const FONT_BODY = 'Open Sans';    // Highly Readable
    const BG_GLOBAL = 'F8FAFC';       // Off-white luxury feel
    const BG_CARD = 'FFFFFF';

    // Layout Strategy Mapping (Sistem Mengontrol Visual, Bukan AI)
    // Menggunakan Enum value langsung sebagai key untuk type-safety
    const TEMPLATE_LAYOUT_STRATEGY: Record<string, string[]> = {
      [PresentationTemplate.MODERN]: ['SPLIT_FOCUS', 'DUO_GRID', 'EDITORIAL_LIST', 'SPLIT_FOCUS', 'EDITORIAL_LIST', 'HERO_CARD'],
      [PresentationTemplate.CORPORATE]: ['EDITORIAL_LIST', 'EDITORIAL_LIST', 'EDITORIAL_LIST', 'EDITORIAL_LIST', 'EDITORIAL_LIST'],
      [PresentationTemplate.CREATIVE]: ['HERO_CARD', 'DUO_GRID', 'SPLIT_FOCUS', 'EDITORIAL_LIST', 'HERO_CARD'],
      [PresentationTemplate.ACADEMIC]: ['SPLIT_FOCUS', 'DUO_GRID', 'EDITORIAL_LIST', 'EDITORIAL_LIST', 'EDITORIAL_LIST'],
      'DEFAULT': ['SPLIT_FOCUS', 'DUO_GRID', 'EDITORIAL_LIST', 'EDITORIAL_LIST', 'EDITORIAL_LIST']
    };

    // ==========================================
    // 2. HELPER FUNCTIONS (The "Smart" Engine)
    // ==========================================

    // Bersihkan teks dari markdown
    const cleanText = (text: string) => text.replace(/[\*_#]/g, '').trim();

    // Hitung ukuran font berdasarkan panjang teks (Anti-tumpang tindih)
    const getSmartFontSize = (text: string, baseSize: number) => {
      const len = text.length;
      if (len > 800) return Math.max(10, baseSize - 5);
      if (len > 500) return Math.max(11, baseSize - 2);
      if (len > 300) return baseSize - 1;
      return baseSize;
    };

    // Fungsi Universal untuk membuat Kartu Cantik (Gamma Style)
    const createCard = (
      slide: any, 
      textLines: string[], 
      x: number, 
      y: number, 
      w: number, 
      options?: { accent?: boolean, title?: string }
    ) => {
      const textContent = textLines.map(cleanText);
      const fullText = textContent.join(' ');
      
      const estimatedHeight = Math.min(4.0, (textContent.length * 0.35) + 0.8);
      
      const cardOpts: any = {
        x: x, y: y, w: w, h: estimatedHeight,
        fill: { color: options?.accent ? primaryColor + '10' : BG_CARD }, 
        line: { color: options?.accent ? primaryColor : '#E2E8F0', width: options?.accent ? 1 : 1 },
        rectRadius: 0.2,
        shadow: {
          type: 'outer',
          color: '64748B',
          blur: 12,
          offset: { x: 2, y: 4 },
          transparency: 85
        }
      };
      slide.addShape(pptx.ShapeType.roundRect, cardOpts);

      const fontSize = getSmartFontSize(fullText, 13);
      const lineSpacing = fullText.length > 500 ? 24 : 30;

      let textStartY = y + 0.25;
      if (options?.title) {
        slide.addText(options.title, {
          x: x + 0.25, y: textStartY, w: w - 0.5, h: 0.4,
          fontSize: 16, fontFace: FONT_TITLE, color: primaryColor, bold: true
        });
        textStartY += 0.5;
      }

      slide.addText(textContent, {
        x: x + 0.25, y: textStartY, w: w - 0.5, h: estimatedHeight - (textStartY - y) - 0.2,
        fontSize: fontSize, fontFace: FONT_BODY, color: '#334155',
        lineSpacing: lineSpacing,
        bullet: { type: options?.accent ? 'number' : 'bullet', color: primaryColor },
        bodyProp: { wrap: true }
      });
    };

    // ==========================================
    // 3. LAYOUT BUILDERS (Visual Components)
    // ==========================================

    const addGlobalHeader = (slide: any, title: string, slideNumber: number) => {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: primaryColor } });
      slide.addText(`0${slideNumber}`, { 
        x: 0.4, y: 0.4, w: 0.5, h: 0.4, 
        fontSize: 9, fontFace: FONT_TITLE, color: '#94A3B8', bold: true 
      });
      slide.addText(title, { 
        x: 1.2, y: 0.4, w: 8.3, h: 0.8, 
        fontSize: 28, fontFace: FONT_TITLE, color: '#1E293B', bold: true, 
        lineSpacing: 34 
      });
      slide.addShape(pptx.ShapeType.rect, { x: 1.2, y: 1.1, w: 8.3, h: 0.02, fill: { color: '#CBD5E1' } });
      return 1.3;
    };

    const layoutVerticalStack = (slide: any, sData: any, slideNum: number) => {
      const startY = addGlobalHeader(slide, sData.title, slideNum);
      const splitIndex = Math.ceil(sData.content.length / 2);
      createCard(slide, sData.content.slice(0, splitIndex), 1.2, startY, 7.6);
      if (sData.content.length > 4) {
         const card1Height = (splitIndex * 0.35) + 0.8;
         createCard(slide, sData.content.slice(splitIndex), 1.2, startY + card1Height + 0.4, 7.6);
      }
    };

    const layoutDuoGrid = (slide: any, sData: any, slideNum: number) => {
      const startY = addGlobalHeader(slide, sData.title, slideNum);
      const gap = 0.4;
      const colWidth = 3.8;
      const midPoint = Math.ceil(sData.content.length / 2);
      createCard(slide, sData.content.slice(0, midPoint), 1.2, startY, colWidth);
      createCard(slide, sData.content.slice(midPoint), 1.2 + colWidth + gap, startY, colWidth, { accent: true });
    };

    const layoutSplitFocus = (slide: any, sData: any, slideNum: number) => {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 3.5, h: 5.625, fill: { color: primaryColor } });
      slide.addShape(pptx.ShapeType.ellipse, { x: 2, y: 4.5, w: 3, h: 3, fill: { color: secondaryColor, transparency: 90 } });
      slide.addText(sData.title, {
        x: 0.5, y: 1, w: 2.5, h: 4,
        fontSize: 32, fontFace: FONT_TITLE, color: 'FFFFFF', bold: true, align: 'left', valign: 'top'
      });
      createCard(slide, sData.content, 4.0, 1.0, 5.5, { title: 'Key Insights' });
    };

    const layoutHeroCard = (slide: any, sData: any, slideNum: number) => {
      const startY = addGlobalHeader(slide, sData.title, slideNum);
      slide.addShape(pptx.ShapeType.rect, { x: 1, y: startY, w: 8, h: 4, fill: { color: secondaryColor, transparency: 95 } });
      createCard(slide, sData.content, 2.0, startY + 0.5, 6.0, { title: 'Strategic Overview' });
    };

    // ==========================================
    // 4. AI PROMPT & GENERATION
    // ==========================================
    onProgress?.("AI is synthesizing deep knowledge...");
    
    const blueprintPrompt = `ACT AS A TOP-TIER PRESENTATION ARCHITECT.
    ANALYZE AND SYNTHESIZE THIS MATERIAL INTO A HIGH-LEVEL STRATEGIC PRESENTATION: "${config.title}"
    SOURCE: ${item.abstract || item.title}
    CONTEXT: ${config.context}
    
    REQUIREMENTS:
    - EXACTLY ${config.slidesCount} CONTENT SLIDES.
    - CONTENT DEPTH: Comprehensive and dense. Use professional terminology. NO GENERIC POINTS.
    - STYLE: Actionable bullet points. NOT paragraphs.
    - MAX LINES per slide: 7 lines.
    - NO MARKDOWN: No asterisks (*), underscores (_), or hashes (#). Use plain text.
    - LANGUAGE: ${config.language}.
    - OUTPUT RAW JSON ONLY.

    FORMAT:
    {
      "slides": [
        { 
          "title": "Deep Strategic Title", 
          "content": ["Comprehensive discovery 1...", "Detailed implication 2...", "Technical methodology 3..."]
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

    // ==========================================
    // 5. SLIDE GENERATION LOOP
    // ==========================================
    
    // --- COVER SLIDE ---
    onProgress?.("Designing Cover Slide...");
    const slide1 = pptx.addSlide();
    
    // Design Cover Template-Aware
    if (config.template === PresentationTemplate.CORPORATE) {
      slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: 'FFFFFF' } });
      slide1.addShape(pptx.ShapeType.rect, { x: 1, y: 4.5, w: 8, h: 0.05, fill: { color: primaryColor } });
      slide1.addText(config.title, { x: 1, y: 2, w: 8, h: 1.5, fontSize: 40, fontFace: FONT_TITLE, color: primaryColor, bold: true, align: 'center' });
    } else {
      slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: '0F172A' } }); 
      slide1.addShape(pptx.ShapeType.ellipse, { x: 7, y: -1, w: 5, h: 5, fill: { color: secondaryColor, transparency: 80 } });
      slide1.addShape(pptx.ShapeType.rect, { x: 1, y: 4.5, w: 1, h: 0.1, fill: { color: secondaryColor } });
      slide1.addText(config.title, { x: 1, y: 1.5, w: 8, h: 2.5, fontSize: 44, fontFace: FONT_TITLE, color: 'FFFFFF', bold: true, align: 'left', lineSpacing: 50 });
    }
    slide1.addText(config.presenters.join(' • '), { x: 1, y: 5, w: 8, h: 0.4, fontSize: 12, fontFace: FONT_BODY, color: '#64748B', align: 'center' });

    // --- CONTENT SLIDES ---
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Architecting Slide ${idx + 2}...`);
      const slide = pptx.addSlide();
      slide.background = { color: BG_GLOBAL };

      // Dispatch Layout - config.template adalah string Enum value
      const strategyKey = TEMPLATE_LAYOUT_STRATEGY[config.template] ? config.template : 'DEFAULT';
      const layoutSequence = TEMPLATE_LAYOUT_STRATEGY[strategyKey];
      const currentLayout = layoutSequence[idx % layoutSequence.length];

      if (currentLayout === 'DUO_GRID') {
        layoutDuoGrid(slide, sData, idx + 2);
      } else if (currentLayout === 'SPLIT_FOCUS') {
        layoutSplitFocus(slide, sData, idx + 2);
      } else if (currentLayout === 'HERO_CARD') {
        layoutHeroCard(slide, sData, idx + 2);
      } else {
        layoutVerticalStack(slide, sData, idx + 2);
      }

      slide.addText(`XEENAPS KNOWLEDGE SERIES • SLIDE ${idx + 2}`, { 
        x: 0.5, y: 5.25, w: 9, h: 0.3, 
        fontSize: 8, fontFace: FONT_BODY, color: '#94A3B8', align: 'right' 
      });
    });

    // --- BIBLIOGRAPHY SLIDE ---
    onProgress?.("Generating Bibliography...");
    const lastSlide = pptx.addSlide();
    lastSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: BG_GLOBAL } });
    lastSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1, fill: { color: primaryColor } });
    lastSlide.addText("BIBLIOGRAPHY & SOURCES", { x: 0.5, y: 0.2, w: 9, h: 0.6, fontSize: 24, fontFace: FONT_TITLE, color: 'FFFFFF', bold: true });
    
    const citation = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}. ${item.publisher || 'Internal Repository'}.`;
    
    lastSlide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.5, w: 9, h: 3, fill: { color: BG_CARD }, line: { color: '#E2E8F0' }, rectRadius: 0.2 });
    lastSlide.addText(cleanText(citation), { x: 1, y: 2, w: 8, h: 2, fontSize: 12, fontFace: FONT_BODY, color: '#475569', italic: true, lineSpacing: 20 });
    lastSlide.addText("Knowledge Anchored by Xeenaps PKM", { x: 0, y: 5.1, w: 10, h: 0.3, fontSize: 9, fontFace: FONT_TITLE, color: primaryColor, bold: true, align: 'center' });

    // ==========================================
    // 6. EXPORT & SAVE
    // ==========================================
    onProgress?.("Finalizing and Syncing...");
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
