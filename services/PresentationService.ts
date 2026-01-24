
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS UNIVERSAL ARCHITECT V8.8 (GAMMA-PREMIUM)
 * Optimized for: Perfect Text Fit, Solid Card UI, & Dynamic Canvas Backgrounds.
 */

// Helper: Determine high-contrast text color
const getContrastColor = (hexColor: string): string => {
  const hex = (hexColor || 'FFFFFF').replace('#', '').slice(0, 6);
  const r = parseInt(hex.slice(0, 2), 16) || 255;
  const g = parseInt(hex.slice(2, 4), 16) || 255;
  const b = parseInt(hex.slice(4, 6), 16) || 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '1E293B' : 'FFFFFF';
};

// Helper: Adaptive Font Size for Cover Title
const getCoverFontSize = (text: string): number => {
  const len = String(text || '').length;
  if (len < 40) return 42;
  if (len < 80) return 30;
  return 22;
};

const getHeadingFontSize = (text: string): number => {
  const len = String(text || '').length;
  if (len <= 20) return 24;
  if (len <= 40) return 20;
  return 16;
};

// Enhanced Card Component - Solid Primary with Perfect Text Fit
const drawContentCard = (
  slide: any, 
  x: number, 
  y: number, 
  w: number, 
  h: number, 
  content: any[],
  size: 'S' | 'M' | 'B' | 'XL' = 'M',
  primaryColor: string,
  secondaryColor: string
) => {
  const baseFontSize = size === 'S' ? 10 : size === 'M' ? 11 : size === 'B' ? 13 : 15;
  // Card Text Color must contrast the solid primary background
  const cardTextColor = getContrastColor(primaryColor); 
  
  // 1. Main Card Body (SOLID Primary color)
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: primaryColor.replace('#', '') }, // Solid Primary as requested
    line: { color: secondaryColor.replace('#', ''), width: 0.5, transparency: 60 },
    rectRadius: 0.1,
    shadow: { 
      type: 'outer', 
      color: primaryColor.replace('#', ''), 
      blur: 12, 
      offset: { x: 0, y: 3 }, 
      transparency: 70 
    }
  });

  // 2. Thick Left Accent Border (Solid Secondary Color)
  slide.addShape('rect', {
    x: x + 0.02, y: y + 0.15, w: 0.06, h: h - 0.3,
    fill: { color: secondaryColor.replace('#', '') }
  });

  // 3. HARDENED Text Content Processing with Autoshrink
  const safeContent = Array.isArray(content) ? content : [content];
  const textObjects: any[] = [];

  safeContent.forEach(line => {
    if (line === null || line === undefined) return;
    
    const rawLine = String(line);
    const parts = rawLine.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    
    parts.forEach(part => {
      let text = part;
      let bold = false;
      let italic = false;
      
      if (text.startsWith('**') && text.endsWith('**')) {
        text = text.slice(2, -2);
        bold = true;
      } else if (text.startsWith('*') && text.endsWith('*')) {
        text = text.slice(1, -1);
        italic = true;
      }
      
      text = text.replace(/[\*_#]/g, '').trim();
      if (!text) return;

      textObjects.push({
        text: text + ' ',
        options: {
          fontSize: baseFontSize,
          fontFace: 'Inter',
          color: cardTextColor.replace('#', ''), 
          bold,
          italic,
          lineSpacing: baseFontSize + 2, // Strict 1.0ish leading (fontSize + small point gap)
          bullet: part === parts[0] ? { type: 'bullet', color: secondaryColor.replace('#', ''), indent: 0.15 } : undefined
        }
      });
    });
    
    if (textObjects.length > 0) {
      textObjects[textObjects.length - 1].options.breakLine = true;
    }
  });

  if (textObjects.length > 0) {
    slide.addText(textObjects, {
      x: x + 0.25, 
      y: y + 0.2, 
      w: w - 0.4, 
      h: h - 0.4,
      valign: 'top', 
      wrap: true, 
      autoFit: true,  // MANDATORY FIT
      shrinkText: true // MANDATORY SHRINK
    });
  }
};

// Composite Layout Generator
const createCompositeLayout = (
  slide: any,
  layoutType: string,
  contents: (any[])[], 
  cardSizes: string[],
  primaryColor: string,
  secondaryColor: string
) => {
  const marginX = 0.4;
  const marginY = 1.05;
  const totalW = 9.2;
  const totalH = 4.2;
  const cardSpacing = 0.15;

  const layoutPatterns: Record<string, Array<{x: number, y: number, w: number, h: number}>> = {
    '2TOP_1BOTTOM': [
      { x: marginX, y: marginY, w: totalW/2 - cardSpacing/2, h: totalH/2 - cardSpacing/2 },
      { x: marginX + totalW/2 + cardSpacing/2, y: marginY, w: totalW/2 - cardSpacing/2, h: totalH/2 - cardSpacing/2 },
      { x: marginX, y: marginY + totalH/2 + cardSpacing/2, w: totalW, h: totalH/2 - cardSpacing/2 }
    ],
    '1TOP_3BOTTOM': [
      { x: marginX, y: marginY, w: totalW, h: totalH/2 - cardSpacing/2 },
      { x: marginX, y: marginY + totalH/2 + cardSpacing/2, w: totalW/3 - cardSpacing*0.66, h: totalH/2 - cardSpacing/2 },
      { x: marginX + totalW/3, y: marginY + totalH/2 + cardSpacing/2, w: totalW/3 - cardSpacing*0.66, h: totalH/2 - cardSpacing/2 },
      { x: marginX + totalW*2/3, y: marginY + totalH/2 + cardSpacing/2, w: totalW/3 - cardSpacing*0.66, h: totalH/2 - cardSpacing/2 }
    ],
    'SIDEBAR_GRID': [
      { x: marginX, y: marginY, w: totalW/3 - cardSpacing/2, h: totalH },
      { x: marginX + totalW/3 + cardSpacing/2, y: marginY, w: totalW*2/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 },
      { x: marginX + totalW/3 + cardSpacing/2, y: marginY + totalH/2 + cardSpacing/2, w: totalW*2/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 }
    ]
  };

  const pattern = layoutPatterns[layoutType] || layoutPatterns['2TOP_1BOTTOM'];
  
  pattern.forEach((pos, idx) => {
    if (idx < contents.length) {
      drawContentCard(
        slide,
        pos.x, pos.y, pos.w, pos.h,
        contents[idx],
        (cardSizes[idx] || 'M') as any,
        primaryColor,
        secondaryColor
      );
    }
  });
};

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
    
    onProgress?.("AI Librarian is conducting deep architectural research...");
    
    const blueprintPrompt = `ACT AS A SENIOR STRATEGIC ANALYST & INFORMATION ARCHITECT.
    TRANSFORM THE SOURCE MATERIAL INTO A DEEP, COMPREHENSIVE, AND HOLISTIC PRESENTATION: "${config.title}"
    
    CONTEXT: ${config.context}
    REQUIRED SLIDES: ${config.slidesCount}
    LAYOUTS: "2TOP_1BOTTOM", "1TOP_3BOTTOM", "SIDEBAR_GRID", "1C1R", "2C1R"
    LANGUAGE: ${config.language}
    
    CRITICAL INSTRUCTIONS:
    1. PROVIDE DEEP and VERBOSE analysis. DO NOT summarize briefly.
    2. EACH SLIDE must contain high-value evidence and logic.
    3. FOR EACH CONTENT ARRAY: Provide 4-6 detailed bullet points per card.
    4. Use **Word** for bold and *Word* for italics.
    
    OUTPUT RAW JSON ONLY:
    {
      "slides": [
        { 
          "title": "Comprehensive Title",
          "layout": "SIDEBAR_GRID",
          "cardSizes": ["XL", "M", "M"],
          "content": [["Detailed Point 1", "Detailed Point 2"], ["Data A", "Data B"], ["Impact 1", "Impact 2"]]
        }
      ]
    }`;

    let aiResText = await callAiProxy('groq', blueprintPrompt);
    if (!aiResText) throw new Error("AI Synthesis failed.");

    const start = aiResText.indexOf('{');
    const end = aiResText.lastIndexOf('}');
    if (start !== -1 && end !== -1) aiResText = aiResText.substring(start, end + 1);

    let blueprint = JSON.parse(aiResText);
    if (blueprint.presentation && blueprint.presentation.slides) blueprint = blueprint.presentation;

    // --- GAMMA-STYLE COVER SLIDE (MODERN & CLEAN) ---
    onProgress?.("Designing Gamma-style Premium Cover...");
    const cover = pptx.addSlide();
    cover.background = { color: 'FFFFFF' }; 

    // Dynamic Geometrics
    cover.addShape('ellipse', { 
      x: -1, y: -1, w: 5, h: 5, 
      fill: { color: primaryColor, transparency: 90 } 
    });
    cover.addShape('rect', { 
      x: 8.5, y: 0, w: 1.5, h: 5.625, 
      fill: { color: secondaryColor, transparency: 94 } 
    });
    cover.addShape('rect', { 
      x: 0, y: 5.3, w: 10, h: 0.325, 
      fill: { color: primaryColor } 
    });

    // TITLE: Gamma-Style Central Typography with Dynamic Color
    const coverTitleColor = getContrastColor('FFFFFF');
    cover.addText(String(config.title).toUpperCase(), {
      x: 0.8, y: 1.2, w: 8.4, h: 3.0,
      fontSize: getCoverFontSize(config.title), 
      fontFace: 'Inter', 
      color: primaryColor, 
      bold: true,
      align: 'center', 
      valign: 'middle', 
      autoFit: true, 
      shrinkText: true, 
      wrap: true
    });

    // PRESENTER
    cover.addText(config.presenters.join(' • ').toUpperCase(), {
      x: 1.0, y: 4.5, w: 8.0, h: 0.4,
      fontSize: 10, fontFace: 'Inter', color: '94A3B8', align: 'center', bold: true,
      charSpacing: 3
    });

    // --- CONTENT SLIDES ---
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Building Holistic Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      // Canvas Background: Primary with high transparency (Dynamic effect)
      slide.background = { color: primaryColor, transparency: 96 };

      // Header UI
      slide.addShape('rect', { x: 0.4, y: 0.35, w: 0.08, h: 0.45, fill: { color: primaryColor } });
      slide.addText(String(sData.title || '').toUpperCase(), {
        x: 0.6, y: 0.35, w: 8.8, h: 0.45,
        fontSize: getHeadingFontSize(sData.title), 
        fontFace: 'Inter', 
        color: primaryColor, 
        bold: true, 
        align: 'left', 
        valign: 'middle',
        charSpacing: 1
      });
      slide.addShape('rect', { x: 0.4, y: 0.9, w: 9.2, h: 0.01, fill: { color: secondaryColor } });

      const layout = String(sData.layout || '1C1R');
      const contents = (sData.content || []).map((c: any) => Array.isArray(c) ? c : [c]);
      const cardSizes = sData.cardSizes || [];

      if (layout.includes('TOP') || layout === 'SIDEBAR_GRID') {
        createCompositeLayout(slide, layout, contents, cardSizes, primaryColor, secondaryColor);
      } else {
        const colCount = layout.includes('2C') ? 2 : 1;
        const cardW = colCount === 2 ? 4.5 : 9.2;
        contents.forEach((c: any, cIdx: number) => {
          if (cIdx < colCount) {
            drawContentCard(slide, 0.4 + (cIdx * 4.7), 1.15, cardW, 3.9, c, 'XL', primaryColor, secondaryColor);
          }
        });
      }

      // Footer
      slide.addText(`XEENAPS ANALYTICS • 0${idx + 1}`, {
        x: 0.5, y: 5.35, w: 9, h: 0.2,
        fontSize: 7, fontFace: 'Inter', color: 'CBD5E1', align: 'right', bold: true
      });
    });

    // --- BIBLIOGRAPHY ---
    onProgress?.("Finalizing Reference Engine...");
    const bibSlide = pptx.addSlide();
    bibSlide.background = { color: 'FFFFFF' };
    bibSlide.addText("STRATEGIC SOURCES", {
      x: 1, y: 0.5, w: 8, h: 0.6,
      fontSize: 26, fontFace: 'Inter', color: primaryColor, bold: true, align: 'center', charSpacing: 2
    });
    
    const bibItems = [];
    if (item.bibHarvard) bibItems.push(...item.bibHarvard.split('\n').filter(Boolean));
    else bibItems.push(`${item.authors?.join(', ')} (${item.year}). ${item.title}.`);
    
    const bibContent = bibItems.map((it, i) => `${i + 1}. ${String(it || '').replace(/[\*_#]/g, '').trim()}`);
    drawContentCard(bibSlide, 0.8, 1.3, 8.4, 3.7, bibContent, 'XL', primaryColor, secondaryColor);

    onProgress?.("Archiving to Xeenaps Cloud Node...");
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
        fontFamily: 'Inter',
        headingFont: 'Inter'
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
    throw new Error("Cloud archive failure.");

  } catch (error: any) {
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
