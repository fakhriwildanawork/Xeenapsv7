import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * EDITORIAL DESIGN SYSTEM CONSTANTS
 * Inspired by Gamma.ai's boxed and grid-based aesthetic.
 */
const EDITORIAL_CONSTANTS = {
  GRID: {
    MARGIN_X: 0.5,      // Standard safe margin
    MARGIN_Y: 0.5,
    GUTTER: 0.25,       // Space between cards
    SAFE_CONTENT_W: 9.0, // 10 - (2 * 0.5)
  },
  
  TYPOGRAPHY: {
    H1: { size: 34, weight: 700, lineSpacing: 1.1 },
    H2: { size: 28, weight: 700, lineSpacing: 1.2 },
    H3: { size: 22, weight: 600, lineSpacing: 1.3 },
    BODY: { size: 16, weight: 400, lineSpacing: 1.5 },
    CAPTION: { size: 10, weight: 700, lineSpacing: 1.3 },
  },
  
  VISUAL: {
    RADIUS: 0.2,       // Soft rounded corners
    PADDING: 0.3,      // Internal card padding (Inset)
    BORDER_WIDTH: 1,
    SHADOW_OPACITY: 0.1,
  }
};

/**
 * EDITORIAL LAYOUT ENGINE
 * Handles dynamic positioning, content-aware scaling, and container management.
 */
class EditorialLayoutEngine {
  private currentY: number = 0;

  constructor(private pptx: any, private colors: any) {
    this.resetY();
  }

  resetY() {
    this.currentY = EDITORIAL_CONSTANTS.GRID.MARGIN_Y;
  }

  setCurrentY(y: number) {
    this.currentY = y;
  }

  getCurrentY() {
    return this.currentY;
  }

  // Content-Aware Scaling: Adjust font based on text density
  getScaledFontSize(text: string, baseSize: number, maxLength: number = 300): number {
    if (text.length > maxLength * 1.5) return baseSize * 0.75;
    if (text.length > maxLength) return baseSize * 0.85;
    return baseSize;
  }

  /**
   * adds a "Boxed" container (Gamma-style card)
   */
  addModernCard(slide: any, x: number, y: number, w: number, h: number, options: any = {}) {
    // Subtle Shadow Layer
    slide.addShape(this.pptx.ShapeType.rect, {
      x: x + 0.05,
      y: y + 0.05,
      w: w,
      h: h,
      fill: { color: '000000', transparency: 90 },
      line: { width: 0 },
      rectRadius: EDITORIAL_CONSTANTS.VISUAL.RADIUS,
    });

    // Main Card Body
    return slide.addShape(this.pptx.ShapeType.rect, {
      x: x,
      y: y,
      w: w,
      h: h,
      fill: options.fill || { color: 'FFFFFF' },
      line: options.border || { color: this.colors.surface.border, width: EDITORIAL_CONSTANTS.VISUAL.BORDER_WIDTH },
      rectRadius: EDITORIAL_CONSTANTS.VISUAL.RADIUS,
    });
  }

  /**
   * Adds text with precise editorial styling (LineSpacing, Inset, Shrink)
   */
  addText(slide: any, text: string, options: any) {
    const fontSize = options.fontSize || EDITORIAL_CONSTANTS.TYPOGRAPHY.BODY.size;
    const lineSpacing = options.lineSpacing || EDITORIAL_CONSTANTS.TYPOGRAPHY.BODY.lineSpacing;
    
    const finalOptions = {
      fontFace: 'Inter',
      color: this.colors.text.primary,
      align: 'left',
      valign: 'top',
      shrinkText: true,
      lineSpacing: lineSpacing * 10, // PPTXGenJS scaling
      inset: [EDITORIAL_CONSTANTS.VISUAL.PADDING, EDITORIAL_CONSTANTS.VISUAL.PADDING, EDITORIAL_CONSTANTS.VISUAL.PADDING, EDITORIAL_CONSTANTS.VISUAL.PADDING],
      ...options,
      fontSize: fontSize
    };

    return slide.addText(text, finalOptions);
  }

  /**
   * Smart Render: Automatically spaces elements and returns ending Y
   */
  renderFlow(slide: any, content: string[], x: number, yStart: number, w: number, cardOptions: any = {}): number {
    let internalY = yStart;
    const padding = EDITORIAL_CONSTANTS.VISUAL.PADDING;
    
    // Estimate total height needed
    const charCount = content.join(' ').length;
    const estimatedHeight = Math.max(2.5, (charCount / 200) * 1.5);
    
    // Render Card Background
    this.addModernCard(slide, x, internalY, w, estimatedHeight, cardOptions);
    
    // Render Points
    content.forEach((point, idx) => {
      const fontSize = this.getScaledFontSize(point, EDITORIAL_CONSTANTS.TYPOGRAPHY.BODY.size);
      this.addText(slide, point, {
        x: x,
        y: internalY,
        w: w,
        h: 1.0, // Floating height handled by overlap logic & shrink
        fontSize: fontSize,
        bullet: { type: 'number' },
        color: cardOptions.textColor || this.colors.text.primary
      });
      internalY += (fontSize / 10) * 0.45; // Manual offset for spacing rhythm
    });

    return internalY + 0.5;
  }
}

/**
 * CONTENT OPTIMIZER
 */
class ContentSanitizer {
  static clean(text: string): string {
    return text ? text.replace(/[\*_#`]/g, '').trim() : "";
  }
}

/**
 * PRESENTATION SERVICE V7 - EDITORIAL EDITION
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
    onProgress?.("Architecting editorial layout...");
    const systemPrompt = `ACT AS A SENIOR EDITORIAL DESIGNER FOR GAMMA.AI.
    CREATE A HIGH-LEVEL ACADEMIC PRESENTATION.

    MATERIAL: ${item.abstract || item.title}
    TITLE: ${config.title}
    
    CONSTRAINTS:
    1. Exactly ${config.slidesCount} content slides.
    2. Zero markdown symbols. 
    3. Hierarchy: Dense enough for reading, scannable for presenting.
    4. Language: ${config.language}.
    
    LAYOUTS: 
    - "EDITORIAL_LEFT": Title left box, content right cards.
    - "SPLIT_GRID": Balanced 2-column grid.
    - "HERO_CENTER": Large centered statement card.

    OUTPUT RAW JSON ONLY.`;

    const aiRes = await callAiProxy('groq', systemPrompt);
    if (!aiRes) throw new Error("AI design failed.");
    
    const blueprint = JSON.parse(aiRes.substring(aiRes.indexOf('{'), aiRes.lastIndexOf('}') + 1));
    const slidesData = blueprint.slides || [];

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    
    const colors = {
      primary: config.theme.primaryColor?.replace('#', '') || '004A74',
      secondary: config.theme.secondaryColor?.replace('#', '') || 'FED400',
      text: { primary: '1F2937', secondary: '6B7280' },
      surface: { background: 'FFFFFF', border: 'E5E7EB', card: 'F9FAFB' }
    };

    const engine = new EditorialLayoutEngine(pptx, colors);

    // COVER SLIDE
    const cover = pptx.addSlide();
    engine.addModernCard(cover, 0, 0, 10, 5.625, { fill: { color: colors.primary }, border: { width: 0 } });
    engine.addText(cover, ContentSanitizer.clean(config.title).toUpperCase(), {
      x: 1, y: 1.5, w: 8, h: 2, fontSize: 36, color: 'FFFFFF', bold: true, align: 'center', valign: 'middle'
    });
    engine.addText(cover, config.presenters.join(' • '), {
      x: 1, y: 4, w: 8, fontSize: 12, color: colors.secondary, align: 'center', bold: true, charSpacing: 1.5
    });

    // CONTENT SLIDES
    slidesData.forEach((s: any, i: number) => {
      onProgress?.(`Rendering slide ${i+1}...`);
      const slide = pptx.addSlide();
      const title = ContentSanitizer.clean(s.title);
      const points = (s.content || []).map(ContentSanitizer.clean);
      
      engine.resetY();
      
      if (s.layoutType === 'EDITORIAL_LEFT') {
        // Boxed Title on Left
        engine.addModernCard(slide, 0.4, 0.4, 3.2, 4.8, { fill: { color: colors.primary } });
        engine.addText(slide, title, { x: 0.6, y: 1.5, w: 2.8, h: 2, fontSize: 24, color: 'FFFFFF', bold: true });
        
        // Right Column Cards
        engine.renderFlow(slide, points, 3.8, 0.4, 5.8, { fill: { color: colors.surface.card } });
      } else if (s.layoutType === 'HERO_CENTER') {
        engine.addText(slide, title.toUpperCase(), { x: 1, y: 0.5, w: 8, fontSize: 18, bold: true, align: 'center', color: colors.primary });
        engine.renderFlow(slide, points, 1.5, 1.5, 7, { fill: { color: colors.surface.card } });
      } else {
        // Default Split Grid
        engine.addText(slide, title, { x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true, color: colors.primary });
        const mid = Math.ceil(points.length / 2);
        engine.renderFlow(slide, points.slice(0, mid), 0.5, 1.0, 4.4, { fill: { color: 'FFFFFF' } });
        engine.renderFlow(slide, points.slice(mid), 5.1, 1.0, 4.4, { fill: { color: colors.surface.card } });
      }

      // Footer
      engine.addText(slide, `© XEENAPS • ${i+1}`, { x: 8, y: 5.3, w: 1.5, fontSize: 8, align: 'right', color: colors.text.secondary });
    });

    onProgress?.("Exporting to Google Slides...");
    const base64 = await pptx.write({ outputType: 'base64' }) as string;

    const presentation: Partial<PresentationItem> = {
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
      body: JSON.stringify({ action: 'savePresentation', presentation, pptxFileData: base64 })
    });

    const out = await res.json();
    return out.status === 'success' ? out.data : null;

  } catch (error) {
    console.error("Editorial PPT Error:", error);
    return null;
  }
};

export const fetchRelatedPresentations = async (collectionId: string): Promise<PresentationItem[]> => {
  try {
    const res = await fetch(`${GAS_WEB_APP_URL}?action=getRelatedPresentations&collectionId=${collectionId}`);
    const result = await res.json();
    return result.status === 'success' ? result.data : [];
  } catch (error) { return []; }
};