import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS UNIVERSAL ARCHITECT V8.0++ 
 * Enhanced with: Composite Grid System, Hybrid Layouts, Smart Merging
 */

// Helper functions (sama seperti sebelumnya)
const getContrastColor = (hexColor: string): string => {
  const r = parseInt(hexColor.slice(0, 2), 16);
  const g = parseInt(hexColor.slice(2, 4), 16);
  const b = parseInt(hexColor.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '000000' : 'FFFFFF';
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

// Enhanced Card Component with better styling
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
  const cardTextColor = getContrastColor(backgroundColor.slice(0, 6));
  const baseFontSize = size === 'S' ? 10 : size === 'M' ? 12 : size === 'B' ? 14 : 16;
  const minFontSize = 8;
  const borderWidth = size === 'S' ? 0.5 : size === 'M' ? 1 : size === 'B' ? 1.5 : 2;
  
  // Main Card with improved styling
  slide.addShape(pptxgen.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: backgroundColor },
    line: { 
      color: accentColor + '80',
      width: borderWidth
    },
    rectRadius: 0.15,
    shadow: { 
      type: 'outer', 
      color: '00000015', 
      blur: 14, 
      offset: { x: 0, y: 3 }, 
      transparency: 25 
    }
  });

  // Left accent border with varying thickness
  const leftBorderWidth = size === 'XL' ? 0.12 : 0.08;
  slide.addShape(pptxgen.ShapeType.rect, {
    x: x + 0.01, 
    y: y + 0.08, 
    w: leftBorderWidth, 
    h: h - 0.16,
    fill: { color: accentColor }
  });

  // Top subtle accent for larger cards
  if (size === 'B' || size === 'XL') {
    slide.addShape(pptxgen.ShapeType.rect, {
      x: x + 0.15, 
      y: y + 0.04, 
      w: w - 0.2, 
      h: 0.006,
      fill: { color: accentColor + '60' }
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
      color: cardTextColor,
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
    autoFit: { 
      shrinkText: true, 
      fontSize: minFontSize 
    }
  });

  // Corner decoration for XL cards
  if (size === 'XL') {
    slide.addShape(pptxgen.ShapeType.triangle, {
      x: x + w - 0.25, 
      y: y + h - 0.25, 
      w: 0.2, 
      h: 0.2,
      fill: { color: accentColor + '15' },
      rotate: 45
    });
  }
};

// Composite Layout Generator
const createCompositeLayout = (
  slide: any,
  layoutType: string,
  contents: string[],
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
    // Atas 2 Column, Bawah 1 Merged
    '2TOP_1BOTTOM': [
      { x: marginX, y: marginY, w: totalW/2 - cardSpacing/2, h: totalH/2 - cardSpacing/2 }, // Kiri atas
      { x: marginX + totalW/2 + cardSpacing/2, y: marginY, w: totalW/2 - cardSpacing/2, h: totalH/2 - cardSpacing/2 }, // Kanan atas
      { x: marginX, y: marginY + totalH/2 + cardSpacing/2, w: totalW, h: totalH/2 - cardSpacing/2 } // Bawah merged
    ],
    
    // Atas 1 Merged, Bawah 3 Column
    '1TOP_3BOTTOM': [
      { x: marginX, y: marginY, w: totalW, h: totalH/2 - cardSpacing/2 }, // Atas merged
      { x: marginX, y: marginY + totalH/2 + cardSpacing/2, w: totalW/3 - cardSpacing*0.66, h: totalH/2 - cardSpacing/2 }, // Bawah kiri
      { x: marginX + totalW/3, y: marginY + totalH/2 + cardSpacing/2, w: totalW/3 - cardSpacing*0.66, h: totalH/2 - cardSpacing/2 }, // Bawah tengah
      { x: marginX + totalW*2/3, y: marginY + totalH/2 + cardSpacing/2, w: totalW/3 - cardSpacing*0.66, h: totalH/2 - cardSpacing/2 } // Bawah kanan
    ],
    
    // Atas 3 Column, Bawah 2 Column
    '3TOP_2BOTTOM': [
      { x: marginX, y: marginY, w: totalW/3 - cardSpacing*0.66, h: totalH/2 - cardSpacing/2 }, // Atas kiri
      { x: marginX + totalW/3, y: marginY, w: totalW/3 - cardSpacing*0.66, h: totalH/2 - cardSpacing/2 }, // Atas tengah
      { x: marginX + totalW*2/3, y: marginY, w: totalW/3 - cardSpacing*0.66, h: totalH/2 - cardSpacing/2 }, // Atas kanan
      { x: marginX, y: marginY + totalH/2 + cardSpacing/2, w: totalW/2 - cardSpacing/2, h: totalH/2 - cardSpacing/2 }, // Bawah kiri
      { x: marginX + totalW/2 + cardSpacing/2, y: marginY + totalH/2 + cardSpacing/2, w: totalW/2 - cardSpacing/2, h: totalH/2 - cardSpacing/2 } // Bawah kanan
    ],
    
    // Sidebar + Grid
    'SIDEBAR_GRID': [
      { x: marginX, y: marginY, w: totalW/3 - cardSpacing/2, h: totalH }, // Sidebar kiri
      { x: marginX + totalW/3 + cardSpacing/2, y: marginY, w: totalW*2/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 }, // Kanan atas
      { x: marginX + totalW/3 + cardSpacing/2, y: marginY + totalH/2 + cardSpacing/2, w: totalW*2/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 } // Kanan bawah
    ],
    
    // Cross Layout (T-Shape)
    'CROSS_LAYOUT': [
      { x: marginX, y: marginY, w: totalW, h: totalH/3 - cardSpacing*0.66 }, // Atas merged
      { x: marginX, y: marginY + totalH/3 + cardSpacing/2, w: totalW/2 - cardSpacing/2, h: totalH*2/3 - cardSpacing/2 }, // Kiri bawah
      { x: marginX + totalW/2 + cardSpacing/2, y: marginY + totalH/3 + cardSpacing/2, w: totalW/2 - cardSpacing/2, h: totalH*2/3 - cardSpacing/2 } // Kanan bawah
    ],
    
    // Zigzag Layout
    'ZIGZAG': [
      { x: marginX, y: marginY, w: totalW*2/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 }, // Kiri atas besar
      { x: marginX + totalW*2/3 + cardSpacing/2, y: marginY, w: totalW/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 }, // Kanan atas kecil
      { x: marginX, y: marginY + totalH/2 + cardSpacing/2, w: totalW/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 }, // Kiri bawah kecil
      { x: marginX + totalW/3 + cardSpacing/2, y: marginY + totalH/2 + cardSpacing/2, w: totalW*2/3 - cardSpacing/2, h: totalH/2 - cardSpacing/2 } // Kanan bawah besar
    ],
    
    // Pyramid Layout
    'PYRAMID': [
      { x: marginX + totalW/4, y: marginY, w: totalW/2, h: totalH/3 }, // Atas tengah
      { x: marginX, y: marginY + totalH/3 + cardSpacing/2, w: totalW/2 - cardSpacing/2, h: totalH/3 }, // Tengah kiri
      { x: marginX + totalW/2 + cardSpacing/2, y: marginY + totalH/3 + cardSpacing/2, w: totalW/2 - cardSpacing/2, h: totalH/3 }, // Tengah kanan
      { x: marginX, y: marginY + totalH*2/3 + cardSpacing, w: totalW, h: totalH/3 - cardSpacing } // Bawah merged
    ]
  };

  const pattern = layoutPatterns[layoutType] || layoutPatterns['2TOP_1BOTTOM'];
  
  // Draw cards based on pattern
  pattern.forEach((pos, idx) => {
    if (idx >= contents.length) return;
    
    const cardContent = Array.isArray(contents[idx]) 
      ? contents[idx] 
      : [contents[idx]];
    
    const size = (cardSizes[idx] || 'M') as 'S' | 'M' | 'B' | 'XL';
    const bgColor = idx === pattern.length - 1 && layoutType.includes('BOTTOM') 
      ? secondaryColor + '10'  // Lighter for merged bottom cards
      : secondaryColor + '15';
    
    drawContentCard(
      slide,
      pos.x,
      pos.y,
      pos.w,
      pos.h,
      cardContent,
      size,
      primaryColor,
      bgColor
    );

    // Add subtle background pattern for merged cards
    if (pos.w > totalW * 0.6) { // If card is wide (merged)
      slide.addShape(pptxgen.ShapeType.ellipse, {
        x: pos.x + pos.w - 0.6,
        y: pos.y + 0.1,
        w: 0.4,
        h: 0.4,
        fill: { color: primaryColor + '05' },
        line: { color: primaryColor + '10', width: 0.3 }
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
    const ACCENT_COLOR = primaryColor + '20';

    // ==========================================
    // 1. ENHANCED AI SYNTHESIS WITH COMPOSITE LAYOUTS
    // ==========================================
    onProgress?.("AI is designing adaptive composite grids...");
    
    const blueprintPrompt = `ACT AS A SENIOR INFORMATION ARCHITECT & PRESENTATION DESIGNER.
    SYNTHESIZE THIS SOURCE INTO A PREMIUM STRATEGIC PRESENTATION: "${config.title}"
    SOURCE: ${item.abstract || item.title}
    ADDITIONAL SOURCES: ${item.fullText?.substring(0, 2000) || ''}
    CONTEXT: ${config.context}
    
    CRITICAL REQUIREMENTS:
    1. EXACTLY ${config.slidesCount} CONTENT SLIDES.
    2. FOR EACH SLIDE, CHOOSE THE MOST SUITABLE LAYOUT STRATEGY:
       
       A. STANDARD GRID LAYOUTS (for uniform content):
          - "1C1R" (1 Column 1 Row) - single focus
          - "1C2R" (1 Column 2 Rows) - process flow
          - "2C2R" (2 Columns 2 Rows) - comparison matrix
          - "3C2R" (3 Columns 2 Rows) - feature grid
       
       B. COMPOSITE/HYBRID LAYOUTS (for hierarchical content):
          - "2TOP_1BOTTOM": 2 cards atas (kiri-kanan), 1 card panjang bawah (merged)
          - "1TOP_3BOTTOM": 1 card panjang atas, 3 cards kecil bawah
          - "3TOP_2BOTTOM": 3 cards kecil atas, 2 cards bawah (kiri-kanan)
          - "SIDEBAR_GRID": Sidebar besar kiri, 2 cards grid kanan
          - "CROSS_LAYOUT": Card atas merged, 2 cards bawah split
          - "ZIGZAG": Asymmetric layout for visual interest
          - "PYRAMID": Hierarchical emphasis layout
    
    3. For each card, specify size: "S" (Small), "M" (Medium), "B" (Big), "XL" (Extra Large for merged cards)
    4. Provide DEEP, COMPREHENSIVE content with hierarchy
    5. Merge related points in composite layouts
    6. LANGUAGE: ${config.language}
    
    OUTPUT FORMAT: RAW JSON ONLY
    {
      "slides": [
        { 
          "title": "Strategic Analysis Framework",
          "layout": "2TOP_1BOTTOM",
          "cardSizes": ["B", "B", "XL"],
          "content": [
            ["SWOT Analysis", "• Strengths: AI-powered insights", "• Weaknesses: Data dependency"],
            ["Market Position", "• Current share: 24%", "• Growth rate: 18% YoY"],
            ["Strategic Recommendations", "1. Expand to ASEAN market", "2. Enhance mobile platform", "3. Build AI research team"]
          ],
          "iconKeywords": ["analysis", "market", "strategy"]
        },
        { 
          "title": "Implementation Roadmap",
          "layout": "1TOP_3BOTTOM",
          "cardSizes": ["XL", "M", "M", "M"],
          "content": [
            ["Phase 1: Foundation", "Months 1-3", "• System architecture", "• Team assembly"],
            ["Q1 Goals", "Complete MVP"],
            ["Q2 Goals", "User testing"],
            ["Q3 Goals", "Market launch"]
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
    // 2. MODERN COVER SLIDE (sama seperti sebelumnya)
    // ==========================================
    onProgress?.("Crafting Modern Cover...");
    const cover = pptx.addSlide();
    cover.background = { color: BG_GLOBAL };

    // Modern geometric shapes
    cover.addShape(pptx.ShapeType.ellipse, { 
      x: 8, y: -2, w: 4, h: 4, 
      fill: { color: primaryColor + '15' },
      line: { color: primaryColor + '30', width: 0.5 }
    });
    
    cover.addShape(pptx.ShapeType.rect, { 
      x: -1, y: 1, w: 3, h: 2, 
      fill: { color: secondaryColor + '20' },
      rotate: 15
    });

    // Main Title
    const titleFontSize = getTitleFontSize(config.title);
    const titleHeight = titleFontSize > 30 ? 2.5 : 2.0;
    
    cover.addText(config.title.toUpperCase(), {
      x: 0.5, y: 1.5, w: 9.0, h: titleHeight,
      fontSize: titleFontSize, 
      fontFace: FONT_MAIN, 
      color: primaryColor, 
      bold: true,
      align: 'center', 
      valign: 'middle', 
      autoFit: true,
      wrap: true
    });

    // Presenters
    cover.addText(config.presenters.join(' • '), {
      x: 1.0, y: 4.0, w: 8.0, h: 0.5,
      fontSize: 16, 
      fontFace: FONT_MAIN, 
      color: TEXT_LIGHT, 
      align: 'center', 
      bold: true
    });

    // ==========================================
    // 3. SMART CONTENT SLIDES WITH COMPOSITE LAYOUTS
    // ==========================================
    
    // Define which layouts are composite
    const compositeLayouts = [
      '2TOP_1BOTTOM', '1TOP_3BOTTOM', '3TOP_2BOTTOM',
      'SIDEBAR_GRID', 'CROSS_LAYOUT', 'ZIGZAG', 'PYRAMID'
    ];

    const standardGridConfigs = {
      '1C1R': { cols: 1, rows: 1 },
      '1C2R': { cols: 1, rows: 2 },
      '1C3R': { cols: 1, rows: 3 },
      '2C1R': { cols: 2, rows: 1 },
      '2C2R': { cols: 2, rows: 2 },
      '2C3R': { cols: 2, rows: 3 },
      '3C1R': { cols: 3, rows: 1 },
      '3C2R': { cols: 3, rows: 2 },
      '3C3R': { cols: 3, rows: 3 }
    };

    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Building Composite Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      slide.background = { color: BG_GLOBAL };

      // Modern Slide Header
      const headingFontSize = getHeadingFontSize(sData.title);
      
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 10, h: 0.6,
        fill: { color: ACCENT_COLOR }
      });

      slide.addShape(pptx.ShapeType.rect, {
        x: 0.3, y: 0.1, w: 0.05, h: 0.4,
        fill: { color: primaryColor }
      });

      slide.addText(sData.title, {
        x: 0.5, y: 0.15, w: 8.8, h: 0.5,
        fontSize: headingFontSize, 
        fontFace: FONT_MAIN, 
        color: primaryColor, 
        bold: true, 
        align: 'left', 
        valign: 'middle'
      });

      slide.addText(`0${idx + 1}`, {
        x: 9.2, y: 0.15, w: 0.5, h: 0.5,
        fontSize: 18, 
        fontFace: FONT_MAIN, 
        color: primaryColor + '50', 
        bold: true, 
        align: 'right'
      });

      // Decorative divider
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.3, y: 0.7, w: 9.4, h: 0.01,
        fill: { color: secondaryColor + '70' }
      });

      // Determine layout type
      const layout = sData.layout || '1C1R';
      const contents = sData.content || [];
      const cardSizes = sData.cardSizes || [];

      // Choose rendering method based on layout type
      if (compositeLayouts.includes(layout)) {
        // Use composite layout generator
        createCompositeLayout(
          slide,
          layout,
          contents,
          cardSizes,
          primaryColor,
          secondaryColor
        );
      } else {
        // Use standard grid layout
        const config = standardGridConfigs[layout] || { cols: 1, rows: 1 };
        const marginX = 0.3;
        const marginY = 0.8;
        const totalW = 9.4;
        const totalH = 4.5;
        const cardWidth = totalW / config.cols;
        const cardHeight = totalH / config.rows;
        const cardSpacing = 0.05;

        for (let row = 0; row < config.rows; row++) {
          for (let col = 0; col < config.cols; col++) {
            const cardIndex = row * config.cols + col;
            if (cardIndex >= contents.length) continue;
            
            const x = marginX + (col * cardWidth) + cardSpacing;
            const y = marginY + (row * cardHeight) + cardSpacing;
            const w = cardWidth - (cardSpacing * 2);
            const h = cardHeight - (cardSpacing * 2);
            
            const cardContent = Array.isArray(contents[cardIndex]) 
              ? contents[cardIndex] 
              : [contents[cardIndex]];
            
            const size = (cardSizes[cardIndex] || 'M') as 'S' | 'M' | 'B' | 'XL';
            
            drawContentCard(
              slide,
              x,
              y,
              w,
              h,
              cardContent,
              size,
              primaryColor,
              secondaryColor + '15'
            );
          }
        }
      }

      // Footer
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 5.6, w: 10, h: 0.05,
        fill: { color: primaryColor + '20' }
      });

      slide.addText(`XEENAPS • COMPOSITE LAYOUT v8.0`, {
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
    bibSlide.background = { color: BG_GLOBAL };
    
    bibSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.8,
      fill: { color: primaryColor + '10' }
    });

    bibSlide.addText("REFERENCES", {
      x: 1, y: 0.2, w: 8, h: 0.6,
      fontSize: 32, 
      fontFace: FONT_MAIN, 
      color: primaryColor, 
      bold: true, 
      align: 'center'
    });

    // Get bibliography items
    const bibItems = [];
    if (item.bibHarvard) {
      bibItems.push(...item.bibHarvard.split('\n').filter(Boolean));
    } else if (item.authors && item.year && item.title) {
      bibItems.push(`${item.authors.join(', ')} (${item.year}). ${item.title}.`);
    }
    
    // Create numbered list
    const bibContent = bibItems.map((item, idx) => 
      `${idx + 1}. ${item.replace(/[\*_#]/g, '').trim()}`
    );

    // Use composite layout for bibliography if multiple items
    if (bibItems.length > 3) {
      createCompositeLayout(
        bibSlide,
        '2TOP_1BOTTOM',
        [
          bibContent.slice(0, Math.ceil(bibContent.length/2)),
          bibContent.slice(Math.ceil(bibContent.length/2))
        ],
        ['B', 'B'],
        primaryColor,
        secondaryColor
      );
    } else {
      drawContentCard(
        bibSlide, 
        0.8, 
        1.2, 
        8.4, 
        3.5, 
        bibContent,
        'XL',
        primaryColor,
        secondaryColor + '10'
      );
    }

    // Closing
    bibSlide.addText("Knowledge Engineered with Precision • Composite Grid System", {
      x: 0, y: 5.0, w: 10, h: 0.4,
      fontSize: 14, 
      fontFace: FONT_MAIN, 
      color: primaryColor, 
      bold: true, 
      align: 'center'
    });

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
      layoutStrategy: 'COMPOSITE_GRID',
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