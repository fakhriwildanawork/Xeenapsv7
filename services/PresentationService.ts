
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS UNIVERSAL ARCHITECT V8.6
 * Optimized for: Extreme Robustness, High-Contrast Visibility, & Auto-Fit Precision.
 */

// Helper: Determine high-contrast text color based on background luminance
const getContrastColor = (hexColor: string): string => {
  const hex = (hexColor || 'FFFFFF').replace('#', '').slice(0, 6);
  const r = parseInt(hex.slice(0, 2), 16) || 255;
  const g = parseInt(hex.slice(2, 4), 16) || 255;
  const b = parseInt(hex.slice(4, 6), 16) || 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '1E293B' : 'FFFFFF';
};

const getHeadingFontSize = (text: string): number => {
  const length = String(text || '').length;
  if (length <= 20) return 26;
  if (length <= 40) return 22;
  if (length <= 60) return 18;
  return 16;
};

// Enhanced Card Component - Hardened for non-string inputs and unreliable transparency
const drawContentCard = (
  slide: any, 
  x: number, 
  y: number, 
  w: number, 
  h: number, 
  content: any[],
  size: 'S' | 'M' | 'B' | 'XL' = 'M',
  accentColor: string
) => {
  // Use solid colors for card body to avoid "Black Box" errors in transparency-challenged viewers
  const cardBgColor = 'F8FAFC'; // Light Gray-Blue for premium visibility
  const baseFontSize = size === 'S' ? 10 : size === 'M' ? 11 : size === 'B' ? 13 : 15;
  const borderWidth = size === 'S' ? 0.5 : size === 'M' ? 0.8 : size === 'B' ? 1.2 : 1.5;
  
  // 1. Main Card Body
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: cardBgColor },
    line: { color: 'E2E8F0', width: borderWidth },
    rectRadius: 0.1,
    shadow: { 
      type: 'outer', 
      color: 'CBD5E1', 
      blur: 10, 
      offset: { x: 0, y: 2 }, 
      transparency: 80 
    }
  });

  // 2. Left accent border (Dynamic Color)
  slide.addShape('rect', {
    x: x + 0.05, y: y + 0.2, w: 0.04, h: h - 0.4,
    fill: { color: accentColor.replace('#', '') }
  });

  // 3. HARDENED Text Content Processing
  const safeContent = Array.isArray(content) ? content : [content];
  const textObjects = safeContent
    .filter(line => line !== null && line !== undefined)
    .map(line => {
      // Cast to string safely to prevent .replace errors
      const safeLine = String(line)
        .replace(/[\*_#]/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .trim();
        
      return {
        text: safeLine,
        options: {
          fontSize: baseFontSize,
          fontFace: 'Inter',
          color: '1E293B', // Forced High-Contrast Slate
          lineSpacing: 22,
          bullet: { type: 'bullet', color: accentColor.replace('#', ''), indent: 0.2 },
          breakLine: true
        }
      };
    });

  if (textObjects.length > 0) {
    slide.addText(textObjects, {
      x: x + 0.25, 
      y: y + 0.2, 
      w: w - 0.4, 
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
  primaryColor: string
) => {
  const marginX = 0.4;
  const marginY = 1.0;
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
        primaryColor
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
    
    onProgress?.("AI is synthesizing high-contrast strategy...");
    
    const additionalSource = String(item.mainInfo || item.abstract || item.summary || '').substring(0, 2000);
    
    const blueprintPrompt = `ACT AS A SENIOR INFORMATION ARCHITECT.
    SYNTHESIZE THIS SOURCE INTO A PREMIUM PRESENTATION: "${config.title}"
    CONTEXT: ${config.context}
    REQUIRED SLIDES: ${config.slidesCount}
    LAYOUTS: "2TOP_1BOTTOM", "1TOP_3BOTTOM", "SIDEBAR_GRID", "1C1R", "2C1R"
    LANGUAGE: ${config.language}
    
    OUTPUT RAW JSON ONLY:
    {
      "slides": [
        { 
          "title": "Slide Title",
          "layout": "SIDEBAR_GRID",
          "cardSizes": ["B", "S", "S"],
          "content": [["Strategic Pillar 1"], ["Supporting Data A"], ["Supporting Data B"]]
        }
      ]
    }`;

    let aiResText = await callAiProxy('groq', blueprintPrompt);
    if (!aiResText) throw new Error("AI Synthesis failed.");

    // JSON Cleaning
    const start = aiResText.indexOf('{');
    const end = aiResText.lastIndexOf('}');
    if (start !== -1 && end !== -1) aiResText = aiResText.substring(start, end + 1);

    let blueprint = JSON.parse(aiResText);
    if (blueprint.presentation && blueprint.presentation.slides) blueprint = blueprint.presentation;

    // --- COVER SLIDE (WHITE BACKGROUND, REFINED PRECISION) ---
    onProgress?.("Architecting Precision Cover...");
    const cover = pptx.addSlide();
    cover.background = { color: 'FFFFFF' }; 

    // Geometric Decoration
    cover.addShape('ellipse', { 
      x: 8.5, y: -0.5, w: 2, h: 2, 
      fill: { color: primaryColor, transparency: 90 } 
    });

    // TITLE: Precision Fit and High Contrast
    cover.addText(String(config.title).toUpperCase(), {
      x: 0.5, y: 1.2, w: 9.0, h: 2.5,
      fontSize: 32, fontFace: 'Inter', color: primaryColor, bold: true,
      align: 'center', valign: 'middle', 
      autoFit: true, shrinkText: true, wrap: true
    });

    // PRESENTER
    cover.addText(config.presenters.join(' • '), {
      x: 1.0, y: 4.0, w: 8.0, h: 0.4,
      fontSize: 12, fontFace: 'Inter', color: '64748B', align: 'center', bold: true
    });

    // --- CONTENT SLIDES ---
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Building Adaptive Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      // Slide Header
      slide.addShape('rect', { x: 0.4, y: 0.3, w: 0.06, h: 0.5, fill: { color: primaryColor } });
      slide.addText(String(sData.title || ''), {
        x: 0.6, y: 0.3, w: 8.8, h: 0.5,
        fontSize: getHeadingFontSize(sData.title), fontFace: 'Inter', color: primaryColor, bold: true, 
        align: 'left', valign: 'middle'
      });
      slide.addShape('rect', { x: 0.4, y: 0.85, w: 9.2, h: 0.01, fill: { color: secondaryColor } });

      const layout = String(sData.layout || '1C1R');
      const contents = (sData.content || []).map((c: any) => Array.isArray(c) ? c : [c]);
      const cardSizes = sData.cardSizes || [];

      if (layout.includes('TOP') || layout === 'SIDEBAR_GRID') {
        createCompositeLayout(slide, layout, contents, cardSizes, primaryColor);
      } else {
        // Fallback grid logic
        const colCount = layout.includes('2C') ? 2 : 1;
        const cardW = colCount === 2 ? 4.5 : 9.2;
        contents.forEach((c: any, cIdx: number) => {
          if (cIdx < colCount) {
            drawContentCard(slide, 0.4 + (cIdx * 4.7), 1.1, cardW, 4.0, c, 'XL', primaryColor);
          }
        });
      }

      // Footer
      slide.addText(`XEENAPS ANALYTICS • 0${idx + 1}`, {
        x: 0.5, y: 5.3, w: 9, h: 0.3,
        fontSize: 7, fontFace: 'Inter', color: 'CBD5E1', align: 'right', bold: true
      });
    });

    // --- BIBLIOGRAPHY ---
    const bibSlide = pptx.addSlide();
    bibSlide.background = { color: 'FFFFFF' };
    bibSlide.addText("REFERENCES", {
      x: 1, y: 0.5, w: 8, h: 0.6,
      fontSize: 28, fontFace: 'Inter', color: primaryColor, bold: true, align: 'center'
    });
    
    const bibItems = [];
    if (item.bibHarvard) bibItems.push(...item.bibHarvard.split('\n').filter(Boolean));
    else bibItems.push(`${item.authors?.join(', ')} (${item.year}). ${item.title}.`);
    
    // Safety processing for bibliography strings
    const bibContent = bibItems.map((it, i) => {
      const safeLine = String(it || '').replace(/[\*_#]/g, '').trim();
      return `${i + 1}. ${safeLine}`;
    });

    drawContentCard(bibSlide, 0.8, 1.4, 8.4, 3.4, bibContent, 'XL', primaryColor);

    onProgress?.("Finalizing Cloud Node sync...");
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
