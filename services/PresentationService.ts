
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS UNIVERSAL ARCHITECT V8.5
 * Optimized for: Vercel Deployment, High-Contrast Visibility, & Auto-Fit Precision.
 */

// Helper functions
const getContrastColor = (hexColor: string): string => {
  const r = parseInt(hexColor.slice(0, 2), 16);
  const g = parseInt(hexColor.slice(2, 4), 16);
  const b = parseInt(hexColor.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '1E293B' : 'FFFFFF';
};

const getTitleFontSize = (text: string): number => {
  const length = text.length;
  if (length <= 30) return 44;
  if (length <= 50) return 36;
  if (length <= 80) return 30;
  if (length <= 120) return 26;
  return 22;
};

const getHeadingFontSize = (text: string): number => {
  const length = text.length;
  if (length <= 20) return 28;
  if (length <= 40) return 24;
  if (length <= 60) return 20;
  return 18;
};

// Enhanced Card Component - Fixed for Production
const drawContentCard = (
  slide: any, 
  x: number, 
  y: number, 
  w: number, 
  h: number, 
  content: string[],
  size: 'S' | 'M' | 'B' | 'XL' = 'M',
  accentColor: string,
  backgroundColor: string
) => {
  // CRITICAL FIX: Use 'roundRect' string instead of pptxgen.ShapeType to avoid Vercel errors
  const cardTextColor = getContrastColor(backgroundColor.slice(0, 6));
  const baseFontSize = size === 'S' ? 10 : size === 'M' ? 12 : size === 'B' ? 14 : 16;
  const minFontSize = 8;
  const borderWidth = size === 'S' ? 0.5 : size === 'M' ? 1 : size === 'B' ? 1.5 : 2;
  
  // Main Card - Use 'roundRect' string
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: backgroundColor.slice(0, 6), transparency: 90 }, // 90% transparency for soft look
    line: { 
      color: accentColor,
      width: borderWidth,
      transparency: 50
    },
    rectRadius: 0.15,
    shadow: { 
      type: 'outer', 
      color: '64748B', 
      blur: 14, 
      offset: { x: 0, y: 3 }, 
      transparency: 90 
    }
  });

  // Left accent border - Use 'rect' string
  const leftBorderWidth = size === 'XL' ? 0.12 : 0.08;
  slide.addShape('rect', {
    x: x + 0.01, 
    y: y + 0.08, 
    w: leftBorderWidth, 
    h: h - 0.16,
    fill: { color: accentColor }
  });

  // Top subtle accent for larger cards
  if (size === 'B' || size === 'XL') {
    slide.addShape('rect', {
      x: x + 0.15, 
      y: y + 0.04, 
      w: w - 0.2, 
      h: 0.006,
      fill: { color: accentColor, transparency: 40 }
    });
  }

  // Text content with smart fitting
  const textLines = content.map(line => 
    line.replace(/[\*_#]/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .trim()
  );

  const textObjects = textLines.map(line => ({
    text: line,
    options: {
      fontSize: baseFontSize,
      fontFace: 'Inter',
      color: '1E293B', // Forced high contrast dark gray
      lineSpacing: 18,
      bullet: { type: 'bullet', color: accentColor, indent: 0.3 },
      breakLine: true
    }
  }));

  slide.addText(textObjects, {
    x: x + 0.18, 
    y: y + 0.12, 
    w: w - 0.25, 
    h: h - 0.24,
    valign: 'top', 
    wrap: true, 
    shrinkText: true,
    autoFit: true
  });

  // Corner decoration for XL cards - Use 'triangle' string
  if (size === 'XL') {
    slide.addShape('triangle', {
      x: x + w - 0.25, 
      y: y + h - 0.25, 
      w: 0.2, 
      h: 0.2,
      fill: { color: accentColor, transparency: 85 },
      rotate: 45
    });
  }
};

// Composite Layout Generator
const createCompositeLayout = (
  slide: any,
  layoutType: string,
  contents: (string[])[], 
  cardSizes: string[],
  primaryColor: string,
  secondaryColor: string
) => {
  const marginX = 0.3;
  const marginY = 0.8;
  const totalW = 9.4;
  const totalH = 4.5;
  const cardSpacing = 0.1;

  // Define composite layout patterns
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
    
    '3TOP_2BOTTOM': [
      { x: marginX, y: marginY, w: totalW/3 - cardSpacing*0.66, h: totalH/2 - cardSpacing/2 },
      { x: marginX + totalW/3, y: marginY, w: totalW/3 - cardSpacing*0.66, h: totalH/2 - cardSpacing/2 },
      { x: marginX + totalW*2/3, y: marginY, w: totalW/3 - cardSpacing*0.66, h: totalH/2 - cardSpacing/2 },
      { x: marginX, y: marginY + totalH/2 + cardSpacing/2, w: totalW/2 - cardSpacing/2, h: totalH/2 - cardSpacing/2 },
      { x: marginX + totalW/2 + cardSpacing/2, y: marginY + totalH/2 + cardSpacing/2, w: totalW/2 - cardSpacing/2, h: totalH/2 - cardSpacing/2 }
    ],
    
    'SIDEBAR_GRID': [
      { x: marginX, y: marginY, w: totalW/3 - cardSpacing/2, h: totalH },
      { x: marginX + totalW/3 + cardSpacing/2, y: marginY, w: totalW*2/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 },
      { x: marginX + totalW/3 + cardSpacing/2, y: marginY + totalH/2 + cardSpacing/2, w: totalW*2/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 }
    ],
    
    'CROSS_LAYOUT': [
      { x: marginX, y: marginY, w: totalW, h: totalH/3 - cardSpacing*0.66 },
      { x: marginX, y: marginY + totalH/3 + cardSpacing/2, w: totalW/2 - cardSpacing/2, h: totalH*2/3 - cardSpacing/2 },
      { x: marginX + totalW/2 + cardSpacing/2, y: marginY + totalH/3 + cardSpacing/2, w: totalW/2 - cardSpacing/2, h: totalH*2/3 - cardSpacing/2 }
    ],
    
    'ZIGZAG': [
      { x: marginX, y: marginY, w: totalW*2/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 },
      { x: marginX + totalW*2/3 + cardSpacing/2, y: marginY, w: totalW/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 },
      { x: marginX, y: marginY + totalH/2 + cardSpacing/2, w: totalW/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 },
      { x: marginX + totalW/3 + cardSpacing/2, y: marginY + totalH/2 + cardSpacing/2, w: totalW*2/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 }
    ],
    
    'PYRAMID': [
      { x: marginX + totalW/4, y: marginY, w: totalW/2, h: totalH/3 },
      { x: marginX, y: marginY + totalH/3 + cardSpacing/2, w: totalW/2 - cardSpacing/2, h: totalH/3 },
      { x: marginX + totalW/2 + cardSpacing/2, y: marginY + totalH/3 + cardSpacing/2, w: totalW/2 - cardSpacing/2, h: totalH/3 },
      { x: marginX, y: marginY + totalH*2/3 + cardSpacing, w: totalW, h: totalH/3 - cardSpacing }
    ]
  };

  const pattern = layoutPatterns[layoutType] || layoutPatterns['2TOP_1BOTTOM'];
  
  // Draw cards based on pattern
  pattern.forEach((pos, idx) => {
    if (idx >= contents.length) return;
    
    const cardContent = contents[idx] || [''];
    const size = (cardSizes[idx] || 'M') as 'S' | 'M' | 'B' | 'XL';
    
    drawContentCard(
      slide,
      pos.x,
      pos.y,
      pos.w,
      pos.h,
      cardContent,
      size,
      primaryColor,
      secondaryColor
    );

    // Add subtle background pattern for merged cards - Use 'ellipse' string
    if (pos.w > totalW * 0.6) {
      slide.addShape('ellipse', {
        x: pos.x + pos.w - 0.6,
        y: pos.y + 0.1,
        w: 0.4,
        h: 0.4,
        fill: { color: primaryColor, transparency: 95 },
        line: { color: primaryColor, width: 0.3, transparency: 90 }
      });
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
    
    // Modern Color Palette
    const FONT_MAIN = 'Inter';
    const BG_GLOBAL = 'FFFFFF';
    const TEXT_DARK = '1E293B';
    const TEXT_LIGHT = '64748B';

    // ==========================================
    // 1. ENHANCED AI SYNTHESIS WITH COMPOSITE LAYOUTS
    // ==========================================
    onProgress?.("AI is designing adaptive composite grids...");
    
    const additionalSource = item.mainInfo || item.abstract || item.summary || '';
    
    const blueprintPrompt = `ACT AS A SENIOR INFORMATION ARCHITECT & PRESENTATION DESIGNER.
    SYNTHESIZE THIS SOURCE INTO A PREMIUM STRATEGIC PRESENTATION: "${config.title}"
    SOURCE: ${item.abstract || item.title}
    ADDITIONAL SOURCES: ${additionalSource.substring(0, 2000)}
    CONTEXT: ${config.context}
    
    CRITICAL REQUIREMENTS:
    1. EXACTLY ${config.slidesCount} CONTENT SLIDES.
    2. FOR EACH SLIDE, CHOOSE THE MOST SUITABLE LAYOUT STRATEGY:
       
       A. STANDARD GRID LAYOUTS (for uniform content):
          - "1C1R", "1C2R", "2C2R", "3C2R"
       
       B. COMPOSITE/HYBRID LAYOUTS (for hierarchical content):
          - "2TOP_1BOTTOM", "1TOP_3BOTTOM", "3TOP_2BOTTOM", "SIDEBAR_GRID", "CROSS_LAYOUT", "ZIGZAG", "PYRAMID"
    
    3. For each card, specify size: "S", "M", "B", "XL"
    4. LANGUAGE: ${config.language}
    
    OUTPUT FORMAT: RAW JSON ONLY
    {
      "slides": [
        { 
          "title": "Title Here",
          "layout": "2TOP_1BOTTOM",
          "cardSizes": ["B", "B", "XL"],
          "content": [["Point A"], ["Point B"], ["Point C"]]
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
    // 2. MODERN COVER SLIDE (WHITE BACKGROUND)
    // ==========================================
    onProgress?.("Crafting Modern Cover...");
    const cover = pptx.addSlide();
    cover.background = { color: 'FFFFFF' }; // Forced White

    // Modern geometric shapes - Use string literals
    cover.addShape('ellipse', { 
      x: 8, y: -2, w: 4, h: 4, 
      fill: { color: primaryColor, transparency: 90 },
      line: { color: primaryColor, width: 0.5, transparency: 70 }
    });
    
    cover.addShape('rect', { 
      x: -1, y: 1, w: 3, h: 2, 
      fill: { color: secondaryColor, transparency: 80 },
      rotate: 15
    });

    // Main Title Box - Positioned and Resized for No Overflow
    cover.addText(config.title.toUpperCase(), {
      x: 0.5, y: 1.0, w: 9.0, h: 3.5, // Increased height and width
      fontSize: 36, 
      fontFace: FONT_MAIN, 
      color: primaryColor, 
      bold: true,
      align: 'center', 
      valign: 'middle', 
      autoFit: true, // Crucial for no overflow
      wrap: true
    });

    // Presenters
    cover.addText(config.presenters.join(' • '), {
      x: 1.0, y: 4.5, w: 8.0, h: 0.5,
      fontSize: 14, 
      fontFace: FONT_MAIN, 
      color: TEXT_LIGHT, 
      align: 'center', 
      bold: true
    });

    // ==========================================
    // 3. SMART CONTENT SLIDES WITH COMPOSITE LAYOUTS
    // ==========================================
    
    const compositeLayouts = ['2TOP_1BOTTOM', '1TOP_3BOTTOM', '3TOP_2BOTTOM', 'SIDEBAR_GRID', 'CROSS_LAYOUT', 'ZIGZAG', 'PYRAMID'];

    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Building Composite Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      // Modern Slide Header - Use 'rect' string
      slide.addShape('rect', {
        x: 0, y: 0, w: 10, h: 0.6,
        fill: { color: primaryColor, transparency: 95 }
      });

      slide.addShape('rect', {
        x: 0.3, y: 0.1, w: 0.05, h: 0.4,
        fill: { color: primaryColor }
      });

      slide.addText(sData.title, {
        x: 0.5, y: 0.15, w: 8.8, h: 0.5,
        fontSize: getHeadingFontSize(sData.title), 
        fontFace: FONT_MAIN, 
        color: primaryColor, 
        bold: true, 
        align: 'left', 
        valign: 'middle'
      });

      // Decorative divider - Use 'rect' string
      slide.addShape('rect', {
        x: 0.3, y: 0.7, w: 9.4, h: 0.01,
        fill: { color: secondaryColor, transparency: 30 }
      });

      const layout = sData.layout || '1C1R';
      const contents = (sData.content || []).map((c: any) => Array.isArray(c) ? c : [c]);
      const cardSizes = sData.cardSizes || [];

      if (compositeLayouts.includes(layout)) {
        createCompositeLayout(slide, layout, contents, cardSizes, primaryColor, secondaryColor);
      } else {
        // Simple fallback
        drawContentCard(slide, 0.5, 1.2, 9, 3.8, contents[0] || [], 'XL', primaryColor, secondaryColor);
      }

      // Branding Footer - Use 'rect' string
      slide.addShape('rect', {
        x: 0, y: 5.6, w: 10, h: 0.05,
        fill: { color: primaryColor, transparency: 95 }
      });

      slide.addText(`XEENAPS KNOWLEDGE ANCHOR v8.5 • 0${idx + 1}`, {
        x: 0.5, y: 5.65, w: 9, h: 0.3,
        fontSize: 7, 
        fontFace: FONT_MAIN, 
        color: TEXT_LIGHT, 
        align: 'right', 
        bold: true
      });
    });

    // ==========================================
    // 4. ENHANCED BIBLIOGRAPHY SLIDE
    // ==========================================
    onProgress?.("Finalizing References...");
    const bibSlide = pptx.addSlide();
    bibSlide.background = { color: 'FFFFFF' };
    
    bibSlide.addShape('rect', {
      x: 0, y: 0, w: 10, h: 0.8,
      fill: { color: primaryColor, transparency: 95 }
    });

    bibSlide.addText("REFERENCES", {
      x: 1, y: 0.2, w: 8, h: 0.6,
      fontSize: 32, 
      fontFace: FONT_MAIN, 
      color: primaryColor, 
      bold: true, 
      align: 'center'
    });

    const bibItems = [];
    if (item.bibHarvard) bibItems.push(...item.bibHarvard.split('\n').filter(Boolean));
    else if (item.authors && item.year) bibItems.push(`${item.authors.join(', ')} (${item.year}). ${item.title}.`);
    
    const bibContent = bibItems.map((it, i) => `${i + 1}. ${it.replace(/[\*_#]/g, '').trim()}`);

    drawContentCard(bibSlide, 0.8, 1.2, 8.4, 3.5, bibContent, 'XL', primaryColor, secondaryColor);

    // ==========================================
    // 5. EXPORT & SYNC
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
