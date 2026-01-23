import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * EDITORIAL DESIGN SYSTEM CONSTANTS
 */
const EDITORIAL_CONSTANTS = {
  // Grid System (12-column inspired)
  GRID: {
    MARGIN_X: 0.5,      // Inch from slide edges
    MARGIN_Y: 0.5,
    GUTTER: 0.3,        // Space between columns
    COLUMN_WIDTH: 0.7,  // Base column width
  },
  
  // Typography Scale (Modular Scale: 1.25)
  TYPOGRAPHY: {
    H1: { size: 32, weight: 700, lineHeight: 1.2 },
    H2: { size: 26, weight: 700, lineHeight: 1.3 },
    H3: { size: 20, weight: 600, lineHeight: 1.3 },
    BODY_LARGE: { size: 16, weight: 400, lineHeight: 1.6 },
    BODY: { size: 14, weight: 400, lineHeight: 1.5 },
    BODY_SMALL: { size: 12, weight: 400, lineHeight: 1.4 },
    CAPTION: { size: 10, weight: 400, lineHeight: 1.3 },
  },
  
  // Spacing System (8px base)
  SPACING: {
    XS: 0.1,   // 8px
    S: 0.2,    // 16px
    M: 0.3,    // 24px
    L: 0.4,    // 32px
    XL: 0.6,   // 48px
    XXL: 0.8,  // 64px
  },
  
  // Visual Elements
  BORDER_RADIUS: {
    SM: 0.1,
    MD: 0.2,
    LG: 0.3,
    PILL: 2.0,
  },
  
  // Shadows (x, y, blur, opacity)
  SHADOW: {
    SM: { x: 0, y: 0.04, blur: 0.08, color: '000000', opacity: 0.08 },
    MD: { x: 0, y: 0.08, blur: 0.2, color: '000000', opacity: 0.12 },
    LG: { x: 0, y: 0.12, blur: 0.4, color: '000000', opacity: 0.15 },
  },
};

/**
 * EDITORIAL LAYOUT ENGINE
 */
class EditorialLayoutEngine {
  constructor(private pptx: pptxgen, private colors: any) {}
  
  // Grid Position Calculator
  calculateGridPosition(cols: number = 12, start: number = 0): { x: number; w: number } {
    const availableWidth = 10 - (EDITORIAL_CONSTANTS.GRID.MARGIN_X * 2);
    const columnWidth = availableWidth / cols;
    const gutter = EDITORIAL_CONSTANTS.GRID.GUTTER;
    
    return {
      x: EDITORIAL_CONSTANTS.GRID.MARGIN_X + (start * (columnWidth + gutter)),
      w: (columnWidth * cols) - gutter,
    };
  }
  
  // Safe Area Container (ensures no overflow)
  addSafeContainer(slide: pptxgen.Slide, y: number, h: number) {
    return slide.addShape(pptxgen.ShapeType.rect, {
      x: EDITORIAL_CONSTANTS.GRID.MARGIN_X,
      y: y,
      w: 10 - (EDITORIAL_CONSTANTS.GRID.MARGIN_X * 2),
      h: h,
      fill: { color: 'FFFFFF', transparency: 100 },
      line: { width: 0 },
    });
  }
  
  // Modern Card with Shadow
  addModernCard(slide: pptxgen.Slide, x: number, y: number, w: number, h: number, options: any = {}) {
    const shadow = EDITORIAL_CONSTANTS.SHADOW.MD;
    
    // Shadow layer (subtle behind)
    slide.addShape(pptxgen.ShapeType.roundRect, {
      x: x + shadow.x,
      y: y + shadow.y,
      w: w,
      h: h,
      fill: { color: shadow.color, transparency: (1 - shadow.opacity) * 100 },
      line: { width: 0 },
      rectRadius: options.radius || EDITORIAL_CONSTANTS.BORDER_RADIUS.MD,
    });
    
    // Main card
    return slide.addShape(pptxgen.ShapeType.roundRect, {
      x: x,
      y: y,
      w: w,
      h: h,
      fill: options.fill || { color: 'FFFFFF' },
      line: options.border || { color: 'E5E7EB', width: 1 },
      rectRadius: options.radius || EDITORIAL_CONSTANTS.BORDER_RADIUS.MD,
    });
  }
  
  // Typography System
  addEditorialText(slide: pptxgen.Slide, text: string, options: any) {
    const defaultStyle = {
      fontFace: 'Inter',
      align: 'left' as const,
      color: this.colors.text || '1F2937',
      ...options,
    };
    
    return slide.addText(text, defaultStyle);
  }
  
  // Decorative Accent Line
  addAccentLine(slide: pptxgen.Slide, x: number, y: number, w: number, thickness: number = 0.02) {
    return slide.addShape(pptxgen.ShapeType.rect, {
      x: x,
      y: y,
      w: w,
      h: thickness,
      fill: { color: this.colors.accent || this.colors.secondary },
    });
  }
}

/**
 * LAYOUT TEMPLATES - Each with specific grid structure
 */
const LAYOUT_TEMPLATES = {
  GAMMA_SPLIT: {
    name: 'Editorial Split',
    columns: [
      { width: 4, bgColor: 'primary' },  // Left panel
      { width: 8, bgColor: 'white' },    // Content panel
    ],
    spacing: EDITORIAL_CONSTANTS.SPACING.L,
  },
  
  CARD_GRID_DEEP: {
    name: 'Modular Grid',
    grid: { rows: 2, cols: 2 },
    cardPadding: EDITORIAL_CONSTANTS.SPACING.M,
    gutter: EDITORIAL_CONSTANTS.SPACING.S,
  },
  
  EDITORIAL_COLUMN: {
    name: 'Single Column',
    contentWidth: 8,
    centered: false,
    showLeftBorder: true,
  },
  
  ZIGZAG_FLOW: {
    name: 'Visual Flow',
    sections: 3,
    alternate: true,
    imagePlaceholder: true,
  },
};

/**
 * IMPROVED CONTENT SANITIZER
 */
class ContentSanitizer {
  static cleanText(text: string): string {
    return text
      .replace(/[\*_#`]/g, '')  // Remove all markdown
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .replace(/\.{3,}/g, '…')  // Replace multiple dots with ellipsis
      .trim();
  }
  
  static chunkContent(content: string[], maxItems: number = 4): string[][] {
    if (content.length <= maxItems) return [content];
    
    const chunkSize = Math.ceil(content.length / Math.ceil(content.length / maxItems));
    const chunks: string[][] = [];
    
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }
    
    return chunks;
  }
  
  static truncateForSlide(text: string, maxChars: number = 1200): string {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars).trim() + '…';
  }
}

/**
 * UPDATED PRESENTATION SERVICE V6
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
    // 1. ENHANCED AI PROMPT WITH LAYOUT CONSTRAINTS
    onProgress?.("AI is designing editorial layouts...");
    const blueprintPrompt = `ACT AS AN EDITORIAL DESIGNER + SUBJECT MATTER EXPERT.
    CREATE A PROFESSIONAL PRESENTATION WITH PERFECT VISUAL HIERARCHY.

    SOURCE MATERIAL: ${item.abstract || item.title}
    PRESENTATION TITLE: ${config.title}
    CONTEXT: ${config.context}
    
    CRITICAL DESIGN REQUIREMENTS:
    1. EXACTLY ${config.slidesCount} content slides
    2. EACH SLIDE MUST HAVE CLEAR VISUAL STRUCTURE
    3. MAX 4 key points per slide (for readability)
    4. Each point should be 1-2 sentences (dense but scannable)
    5. Natural language flow between slides
    6. NO markdown characters (*, _, #, `)
    7. Language: ${config.language}
    
    AVAILABLE LAYOUTS (choose based on content type):
    - "GAMMA_SPLIT": For thesis/argument with supporting evidence
    - "CARD_GRID_DEEP": For comparative analysis or multi-faceted topics
    - "EDITORIAL_COLUMN": For narrative/storytelling content
    - "ZIGZAG_FLOW": For process/methodology explanation
    
    OUTPUT FORMAT (RAW JSON ONLY):
    {
      "slides": [
        {
          "title": "Clear, concise title (max 10 words)",
          "content": [
            "Point 1: Clear statement with supporting detail",
            "Point 2: Another distinct idea with evidence",
            "Point 3: Logical progression from previous points",
            "Point 4: Conclusion or transition point"
          ],
          "layoutType": "CHOOSE_FROM_ABOVE",
          "visualHint": "data | process | comparison | narrative",
          "takeaway": "One memorable insight for audience"
        }
      ]
    }`;

    let aiResText = await callAiProxy('groq', blueprintPrompt);
    
    // Parse and validate AI response
    const cleanedText = aiResText.substring(
      aiResText.indexOf('{'),
      aiResText.lastIndexOf('}') + 1
    );
    
    const blueprint = JSON.parse(cleanedText || '{"slides":[]}');
    const slidesData = blueprint.presentation?.slides || blueprint.slides || [];

    // 2. INITIALIZE WITH MODERN DESIGN SYSTEM
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.defineLayout({ name: 'WIDESCREEN', width: 13.33, height: 7.5 });
    
    // Color system
    const colors = {
      primary: config.theme.primaryColor?.replace('#', '') || '004A74',
      secondary: config.theme.secondaryColor?.replace('#', '') || 'FED400',
      accent: config.theme.accentColor?.replace('#', '') || '7C3AED',
      background: 'FDFDFD',
      text: {
        primary: '1F2937',
        secondary: '4B5563',
        muted: '6B7280',
      },
      surface: {
        card: 'FFFFFF',
        panel: 'F9FAFB',
        border: 'E5E7EB',
      }
    };

    const layoutEngine = new EditorialLayoutEngine(pptx, colors);

    // 3. COVER SLIDE - EDITORIAL STYLE
    onProgress?.("Designing editorial cover...");
    const coverSlide = pptx.addSlide();
    
    // Background with gradient effect
    coverSlide.addShape(pptxgen.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 5.625,
      fill: { type: 'gradient', stops: [
        { color: colors.primary, position: 0 },
        { color: colors.primary + 'DD', position: 100 }
      ]}
    });

    // Title block with perfect centering
    const titleBlock = layoutEngine.addSafeContainer(coverSlide, 2, 1.5);
    const cleanTitle = ContentSanitizer.cleanText(config.title);
    
    layoutEngine.addEditorialText(coverSlide, cleanTitle, {
      x: EDITORIAL_CONSTANTS.GRID.MARGIN_X,
      y: 2,
      w: 10 - (EDITORIAL_CONSTANTS.GRID.MARGIN_X * 2),
      h: 1.5,
      fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.H1.size,
      fontFace: 'Inter',
      color: 'FFFFFF',
      bold: true,
      align: 'center',
      valign: 'middle',
      lineSpacing: 40,
    });

    // Accent line
    layoutEngine.addAccentLine(
      coverSlide,
      10/2 - 1, // Center minus half width
      3.6,
      2,
      0.03
    );

    // Presenters with typographic hierarchy
    layoutEngine.addEditorialText(coverSlide, config.presenters.join(' • '), {
      x: EDITORIAL_CONSTANTS.GRID.MARGIN_X,
      y: 4,
      w: 10 - (EDITORIAL_CONSTANTS.GRID.MARGIN_X * 2),
      fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.BODY.size,
      fontFace: 'Inter',
      color: 'FFFFFF',
      align: 'center',
      bold: true,
      charSpacing: 1.5,
      opacity: 85,
    });

    // 4. CONTENT SLIDES WITH CONSISTENT GRID
    slidesData.forEach((slideData: any, index: number) => {
      onProgress?.(`Crafting slide ${index + 1}: ${slideData.layoutType}...`);
      
      const slide = pptx.addSlide();
      const sanitizedTitle = ContentSanitizer.cleanText(slideData.title);
      const sanitizedContent = Array.isArray(slideData.content) 
        ? slideData.content.map(ContentSanitizer.cleanText)
        : [ContentSanitizer.cleanText(slideData.content)];
      
      // Chunk content for better layout
      const contentChunks = ContentSanitizer.chunkContent(sanitizedContent, 4);

      // Apply layout template
      switch(slideData.layoutType) {
        case 'GAMMA_SPLIT':
          createGammaSplitSlide(layoutEngine, slide, sanitizedTitle, contentChunks, colors);
          break;
          
        case 'CARD_GRID_DEEP':
          createCardGridSlide(layoutEngine, slide, sanitizedTitle, contentChunks, colors);
          break;
          
        case 'EDITORIAL_COLUMN':
          createEditorialColumnSlide(layoutEngine, slide, sanitizedTitle, contentChunks, colors);
          break;
          
        default:
          createModernColumnSlide(layoutEngine, slide, sanitizedTitle, contentChunks, colors);
      }

      // Consistent footer
      addSlideFooter(layoutEngine, slide, index + 1, colors);
    });

    // 5. BIBLIOGRAPHY SLIDE
    onProgress?.("Adding archival references...");
    const bibSlide = pptx.addSlide();
    
    // Header panel
    layoutEngine.addModernCard(bibSlide, 0, 0, 10, 1, {
      fill: { color: colors.primary },
      radius: 0,
    });

    layoutEngine.addEditorialText(bibSlide, "REFERENCES & SOURCES", {
      x: EDITORIAL_CONSTANTS.GRID.MARGIN_X,
      y: 0.2,
      w: 9,
      h: 0.6,
      fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.H2.size,
      fontFace: 'Inter',
      color: 'FFFFFF',
      bold: true,
    });

    // Citation card
    const citationCard = layoutEngine.addModernCard(
      bibSlide,
      EDITORIAL_CONSTANTS.GRID.MARGIN_X,
      1.5,
      10 - (EDITORIAL_CONSTANTS.GRID.MARGIN_X * 2),
      3,
      {
        fill: { color: colors.surface.card },
        border: { color: colors.surface.border, width: 1 },
      }
    );

    const citation = item.bibHarvard || 
      `${item.authors?.join(', ')} (${item.year}). ${item.title}. ${item.publisher || 'Source'}.`;

    layoutEngine.addEditorialText(bibSlide, ContentSanitizer.cleanText(citation), {
      x: EDITORIAL_CONSTANTS.GRID.MARGIN_X + EDITORIAL_CONSTANTS.SPACING.M,
      y: 1.8,
      w: 9 - (EDITORIAL_CONSTANTS.SPACING.M * 2),
      h: 2.4,
      fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.BODY.size,
      fontFace: 'Inter',
      color: colors.text.secondary,
      italic: true,
      lineSpacing: 24,
    });

    // 6. EXPORT & SAVE
    onProgress?.("Finalizing presentation...");
    const base64Pptx = await pptx.write({ outputType: 'base64' }) as string;

    // Rest of your save logic...
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
    console.error("Editorial Presentation Builder Error:", error);
    return null;
  }
};

/**
 * LAYOUT TEMPLATE IMPLEMENTATIONS
 */
function createGammaSplitSlide(
  engine: EditorialLayoutEngine,
  slide: pptxgen.Slide,
  title: string,
  contentChunks: string[][],
  colors: any
) {
  // Left panel (1/3 width)
  const leftPanel = engine.addModernCard(slide, 0, 0, 3.8, 5.625, {
    fill: { color: colors.primary },
    radius: 0,
  });

  // Title in left panel
  engine.addEditorialText(slide, title, {
    x: EDITORIAL_CONSTANTS.GRID.MARGIN_X,
    y: 1.5,
    w: 3.8 - (EDITORIAL_CONSTANTS.GRID.MARGIN_X * 2),
    h: 2.5,
    fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.H2.size,
    fontFace: 'Inter',
    color: 'FFFFFF',
    bold: true,
    valign: 'middle',
  });

  // Vertical accent line
  engine.addAccentLine(slide, 3.7, 1.5, 0.02, 2.5);

  // Right content panel (2/3 width)
  const rightPanel = engine.addModernCard(slide, 3.8, 0.8, 6, 4, {
    fill: { color: colors.surface.card },
    border: { color: colors.surface.border, width: 1 },
  });

  // Content points
  contentChunks[0]?.forEach((point, i) => {
    engine.addEditorialText(slide, `• ${point}`, {
      x: 4,
      y: 1 + (i * 0.8),
      w: 5.6,
      h: 0.7,
      fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.BODY.size,
      fontFace: 'Inter',
      color: colors.text.primary,
      lineSpacing: 24,
    });
  });
}

function createCardGridSlide(
  engine: EditorialLayoutEngine,
  slide: pptxgen.Slide,
  title: string,
  contentChunks: string[][],
  colors: any
) {
  // Title
  engine.addEditorialText(slide, title, {
    x: EDITORIAL_CONSTANTS.GRID.MARGIN_X,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.H2.size,
    fontFace: 'Inter',
    color: colors.primary,
    bold: true,
  });

  engine.addAccentLine(
    slide,
    EDITORIAL_CONSTANTS.GRID.MARGIN_X,
    1.3,
    3,
    0.03
  );

  // Grid of cards (2x2 or 1x2 based on content)
  const cardWidth = 4.3;
  const cardHeight = 3.5;
  const gutter = EDITORIAL_CONSTANTS.SPACING.M;

  contentChunks.forEach((chunk, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    
    const x = EDITORIAL_CONSTANTS.GRID.MARGIN_X + (col * (cardWidth + gutter));
    const y = 1.6 + (row * (cardHeight + gutter));

    const card = engine.addModernCard(slide, x, y, cardWidth, cardHeight, {
      fill: { 
        color: i % 2 === 0 ? colors.surface.card : colors.primary + '08' 
      },
      border: { color: colors.surface.border, width: 1 },
    });

    // Card content
    chunk.forEach((point, j) => {
      engine.addEditorialText(slide, point, {
        x: x + EDITORIAL_CONSTANTS.SPACING.M,
        y: y + EDITORIAL_CONSTANTS.SPACING.M + (j * 0.7),
        w: cardWidth - (EDITORIAL_CONSTANTS.SPACING.M * 2),
        fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.BODY_SMALL.size,
        fontFace: 'Inter',
        color: i % 2 === 0 ? colors.text.primary : colors.primary,
        bullet: true,
        lineSpacing: 20,
      });
    });
  });
}

function createEditorialColumnSlide(
  engine: EditorialLayoutEngine,
  slide: pptxgen.Slide,
  title: string,
  contentChunks: string[][],
  colors: any
) {
  // Vertical accent bar
  engine.addShape(pptxgen.ShapeType.rect, {
    x: EDITORIAL_CONSTANTS.GRID.MARGIN_X,
    y: 0.5,
    w: 0.15,
    h: 0.8,
    fill: { color: colors.primary },
  });

  // Title
  engine.addEditorialText(slide, title, {
    x: EDITORIAL_CONSTANTS.GRID.MARGIN_X + 0.3,
    y: 0.5,
    w: 8.5,
    h: 0.8,
    fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.H2.size,
    fontFace: 'Inter',
    color: colors.primary,
    bold: true,
  });

  // Content column
  const contentWidth = 8;
  const contentX = (10 - contentWidth) / 2;

  const contentCard = engine.addModernCard(
    slide,
    contentX,
    1.5,
    contentWidth,
    3.5,
    {
      fill: { color: colors.surface.card },
      border: { color: colors.surface.border, width: 1 },
    }
  );

  // Single column content
  contentChunks[0]?.forEach((point, i) => {
    engine.addEditorialText(slide, point, {
      x: contentX + EDITORIAL_CONSTANTS.SPACING.M,
      y: 1.7 + (i * 0.8),
      w: contentWidth - (EDITORIAL_CONSTANTS.SPACING.M * 2),
      fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.BODY.size,
      fontFace: 'Inter',
      color: colors.text.primary,
      lineSpacing: 26,
      bullet: { indent: 20 },
    });
  });
}

function createModernColumnSlide(
  engine: EditorialLayoutEngine,
  slide: pptxgen.Slide,
  title: string,
  contentChunks: string[][],
  colors: any
) {
  // Modern minimalist layout
  engine.addEditorialText(slide, title, {
    x: EDITORIAL_CONSTANTS.GRID.MARGIN_X,
    y: 0.8,
    w: 9,
    h: 0.8,
    fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.H2.size,
    fontFace: 'Inter',
    color: colors.primary,
    bold: true,
    align: 'center',
  });

  // Subtle underline
  engine.addAccentLine(
    slide,
    10/2 - 1.5,
    1.6,
    3,
    0.02
  );

  // Centered content block
  const contentBlock = engine.addModernCard(
    slide,
    1.5,
    2,
    7,
    2.8,
    {
      fill: { color: colors.surface.card },
      border: { color: colors.surface.border, width: 1 },
    }
  );

  contentChunks[0]?.forEach((point, i) => {
    engine.addEditorialText(slide, point, {
      x: 1.8,
      y: 2.2 + (i * 0.7),
      w: 6.4,
      fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.BODY.size,
      fontFace: 'Inter',
      color: colors.text.primary,
      align: 'center',
      lineSpacing: 24,
    });
  });
}

function addSlideFooter(
  engine: EditorialLayoutEngine,
  slide: pptxgen.Slide,
  slideNumber: number,
  colors: any
) {
  // Footer line
  engine.addShape(pptxgen.ShapeType.rect, {
    x: EDITORIAL_CONSTANTS.GRID.MARGIN_X,
    y: 5.3,
    w: 10 - (EDITORIAL_CONSTANTS.GRID.MARGIN_X * 2),
    h: 0.01,
    fill: { color: colors.surface.border },
  });

  // Slide number and branding
  engine.addEditorialText(slide, `XEENAPS KNOWLEDGE ARCHIVE • SLIDE ${slideNumber}`, {
    x: EDITORIAL_CONSTANTS.GRID.MARGIN_X,
    y: 5.4,
    w: 9,
    h: 0.2,
    fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.CAPTION.size,
    fontFace: 'Inter',
    color: colors.text.muted,
    align: 'right',
    bold: true,
    charSpacing: 1,
  });
}

export const fetchRelatedPresentations = async (collectionId: string): Promise<PresentationItem[]> => {
  try {
    const res = await fetch(`${GAS_WEB_APP_URL}?action=getRelatedPresentations&collectionId=${collectionId}`);
    const result = await res.json();
    return result.status === 'success' ? result.data : [];
  } catch (error) {
    return [];
  }
};