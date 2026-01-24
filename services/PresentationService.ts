
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS UNIVERSAL ARCHITECT V8.7 (GAMMA-SPEC)
 * Optimized for: Deep AI Synthesis, Adaptive Typography, & Premium Glassmorphism.
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
  if (len < 40) return 44;
  if (len < 80) return 32;
  return 24;
};

const getHeadingFontSize = (text: string): number => {
  const len = String(text || '').length;
  if (len <= 20) return 26;
  if (len <= 40) return 22;
  return 18;
};

// Enhanced Card Component - Gamma-style with Primary Transparency
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
  const baseFontSize = size === 'S' ? 10 : size === 'M' ? 12 : size === 'B' ? 14 : 16;
  const cardTextColor = getContrastColor(secondaryColor); // Reference contrast from secondary as requested
  
  // 1. Main Card Body (Primary color with transparency)
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: primaryColor.replace('#', ''), transparency: 92 },
    line: { color: primaryColor.replace('#', ''), width: 0.5, transparency: 80 },
    rectRadius: 0.1,
    shadow: { 
      type: 'outer', 
      color: primaryColor.replace('#', ''), 
      blur: 15, 
      offset: { x: 0, y: 4 }, 
      transparency: 85 
    }
  });

  // 2. Thick Left Accent Border (Solid Secondary Color)
  slide.addShape('rect', {
    x: x + 0.02, y: y + 0.15, w: 0.08, h: h - 0.3,
    fill: { color: secondaryColor.replace('#', '') }
  });

  // 3. HARDENED Text Content Processing
  const safeContent = Array.isArray(content) ? content : [content];
  const textObjects: any[] = [];

  safeContent.forEach(line => {
    if (line === null || line === undefined) return;
    
    const rawLine = String(line);
    // Regex to detect bold/italic parts but clean the symbols
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
      
      // Final cleanup of any stray symbols
      text = text.replace(/[\*_#]/g, '').trim();
      if (!text) return;

      textObjects.push({
        text: text + ' ',
        options: {
          fontSize: baseFontSize,
          fontFace: 'Inter',
          color: '1E293B', // Forced Slate for maximum legibility on light-glass cards
          bold,
          italic,
          lineSpacing: 24,
          bullet: part === parts[0] ? { type: 'bullet', color: secondaryColor.replace('#', ''), indent: 0.2 } : undefined
        }
      });
    });
    
    // Add line break
    if (textObjects.length > 0) {
      textObjects[textObjects.length - 1].options.breakLine = true;
    }
  });

  if (textObjects.length > 0) {
    slide.addText(textObjects, {
      x: x + 0.3, 
      y: y + 0.2, 
      w: w - 0.5, 
      h: h - 0.4,
      valign: 'top', 
      wrap: true, 
      autoFit: true,
      shrinkText: true
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
  const marginY = 1.1;
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
    
    onProgress?.("AI Architect is synthesizing deep holistic intelligence...");
    
    const additionalSource = String(item.mainInfo || item.abstract || item.summary || '').substring(0, 3000);
    
    const blueprintPrompt = `ACT AS A SENIOR STRATEGIC ANALYST & INFORMATION ARCHITECT.
    TRANSFORM THE SOURCE MATERIAL INTO A DEEP, COMPREHENSIVE, AND HOLISTIC PRESENTATION: "${config.title}"
    
    CONTEXT: ${config.context}
    REQUIRED SLIDES: ${config.slidesCount}
    LAYOUTS: "2TOP_1BOTTOM", "1TOP_3BOTTOM", "SIDEBAR_GRID", "1C1R", "2C1R"
    LANGUAGE: ${config.language}
    
    CRITICAL INSTRUCTIONS:
    1. DO NOT SUMMARIZE BRIEFLY. Provide DEEP and VERBOSE analysis for each slide.
    2. EACH SLIDE must contain HIGH-VALUE insights, detailed evidence, and holistic conclusions.
    3. FOR EACH CONTENT ARRAY: Provide 4-6 detailed bullet points per card.
    4. Use **Word** for bold emphasis and *Word* for italics in your text output.
    
    OUTPUT RAW JSON ONLY:
    {
      "slides": [
        { 
          "title": "Comprehensive Title Here",
          "layout": "SIDEBAR_GRID",
          "cardSizes": ["XL", "M", "M"],
          "content": [
            ["Deep pillar point 1 with elaboration", "Deep pillar point 2 with evidence", "Deep pillar point 3 with context"],
            ["Supporting data A detailed", "Supporting data B detailed"],
            ["Holistic implication 1", "Holistic implication 2"]
          ]
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

    // --- GAMMA-STYLE COVER SLIDE (WHITE & ELEGANT) ---
    onProgress?.("Designing Gamma-style Cover...");
    const cover = pptx.addSlide();
    cover.background = { color: 'FFFFFF' }; 

    // Sophisticated Overlapping Shapes
    cover.addShape('ellipse', { 
      x: 7.5, y: -1, w: 4, h: 4, 
      fill: { color: primaryColor, transparency: 92 } 
    });
    cover.addShape('ellipse', { 
      x: 8.5, y: 0.5, w: 2.5, h: 2.5, 
      fill: { color: secondaryColor, transparency: 85 } 
    });
    cover.addShape('rect', { 
      x: 0, y: 5.4, w: 10, h: 0.2, 
      fill: { color: primaryColor } 
    });

    // TITLE: Gamma-Style Central Typography
    cover.addText(String(config.title).toUpperCase(), {
      x: 0.5, y: 1.5, w: 9.0, h: 2.8,
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

    // PRESENTER: Elegant Muted Footer
    cover.addText(config.presenters.join(' • '), {
      x: 1.0, y: 4.4, w: 8.0, h: 0.4,
      fontSize: 12, fontFace: 'Inter', color: '64748B', align: 'center', bold: true,
      charSpacing: 2
    });

    // --- CONTENT SLIDES ---
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Building Holistic Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      // Elegant Modern Header
      slide.addShape('rect', { x: 0.4, y: 0.35, w: 0.08, h: 0.5, fill: { color: primaryColor } });
      slide.addText(String(sData.title || '').toUpperCase(), {
        x: 0.6, y: 0.35, w: 8.8, h: 0.5,
        fontSize: getHeadingFontSize(sData.title), 
        fontFace: 'Inter', 
        color: primaryColor, 
        bold: true, 
        align: 'left', 
        valign: 'middle',
        charSpacing: 1
      });
      slide.addShape('rect', { x: 0.4, y: 0.95, w: 9.2, h: 0.01, fill: { color: secondaryColor, transparency: 50 } });

      const layout = String(sData.layout || '1C1R');
      const contents = (sData.content || []).map((c: any) => Array.isArray(c) ? c : [c]);
      const cardSizes = sData.cardSizes || [];

      if (layout.includes('TOP') || layout === 'SIDEBAR_GRID' || layout === 'CROSS_LAYOUT') {
        createCompositeLayout(slide, layout, contents, cardSizes, primaryColor, secondaryColor);
      } else {
        const colCount = layout.includes('2C') ? 2 : 1;
        const cardW = colCount === 2 ? 4.5 : 9.2;
        contents.forEach((c: any, cIdx: number) => {
          if (cIdx < colCount) {
            drawContentCard(slide, 0.4 + (cIdx * 4.7), 1.2, cardW, 4.0, c, 'XL', primaryColor, secondaryColor);
          }
        });
      }

      // Branded Footer
      slide.addText(`XEENAPS KNOWLEDGE ARCHITECTURE • 0${idx + 1}`, {
        x: 0.5, y: 5.4, w: 9, h: 0.2,
        fontSize: 7, fontFace: 'Inter', color: 'CBD5E1', align: 'right', bold: true
      });
    });

    // --- DEEP BIBLIOGRAPHY ---
    onProgress?.("Generating Holistic References...");
    const bibSlide = pptx.addSlide();
    bibSlide.background = { color: 'FFFFFF' };
    bibSlide.addText("STRATEGIC REFERENCES", {
      x: 1, y: 0.5, w: 8, h: 0.6,
      fontSize: 28, fontFace: 'Inter', color: primaryColor, bold: true, align: 'center', charSpacing: 2
    });
    
    const bibItems = [];
    if (item.bibHarvard) bibItems.push(...item.bibHarvard.split('\n').filter(Boolean));
    else bibItems.push(`${item.authors?.join(', ')} (${item.year}). ${item.title}.`);
    
    const bibContent = bibItems.map((it, i) => `${i + 1}. ${String(it || '').replace(/[\*_#]/g, '').trim()}`);
    drawContentCard(bibSlide, 0.8, 1.4, 8.4, 3.6, bibContent, 'XL', primaryColor, secondaryColor);

    onProgress?.("Syncing with Xeenaps Cloud Node...");
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
    throw new Error("Finalization failure.");

  } catch (error: any) {
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
