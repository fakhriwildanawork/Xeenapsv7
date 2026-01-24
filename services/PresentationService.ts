import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * XEENAPS EDITORIAL DESIGN SYSTEM (EDS)
 * A programmatic layout engine inspired by Gamma.ai's fluid aesthetics.
 */
const EDS = {
  GRID: {
    COLS: 12,
    WIDTH: 10,      // PPTX 16:9 Width in inches
    HEIGHT: 5.625,  // PPTX 16:9 Height in inches
    MARGIN: 0.5,    // Safe zone
    GUTTER: 0.2,    // Space between blocks
  },
  TYPOGRAPHY: {
    FONT_PRIMARY: 'Inter',
    H1: { size: 36, bold: true, lineSpacing: 1.1 },
    H2: { size: 28, bold: true, lineSpacing: 1.2 },
    BODY: { size: 14, bold: false, lineSpacing: 1.5 },
    CAPTION: { size: 9, bold: true, tracking: 1.5 },
  },
  AESTHETICS: {
    RADIUS: 0.2,    // Soft rounded corners
    PADDING: 0.35,  // Internal card padding (Box Model)
    BORDER_W: 0.5,  // Hairline borders
    SHADOW: { color: '000000', transparency: 94, offset: 0.05 }
  }
};

/**
 * EDITORIAL LAYOUT ENGINE
 * Handles block-based rendering, grid alignment, and dynamic scaling.
 */
class EDSLayoutEngine {
  constructor(private pptx: pptxgen, private colors: any) {}

  /**
   * Calculates X position and Width based on 12-column grid
   */
  getGridDim(colStart: number, colSpan: number) {
    const colWidth = (EDS.GRID.WIDTH - (EDS.GRID.MARGIN * 2)) / EDS.GRID.COLS;
    return {
      x: EDS.GRID.MARGIN + (colStart * colWidth),
      w: (colSpan * colWidth) - EDS.GRID.GUTTER
    };
  }

  /**
   * Renders a "Block Container" (Gamma-style Card)
   */
  addCard(slide: pptxgen.Slide, x: number, y: number, w: number, h: number, options: any = {}) {
    // Subtle Shadow Layer
    slide.addShape(this.pptx.ShapeType.rect, {
      x: x + EDS.AESTHETICS.SHADOW.offset,
      y: y + EDS.AESTHETICS.SHADOW.offset,
      w, h,
      fill: { color: EDS.AESTHETICS.SHADOW.color, transparency: EDS.AESTHETICS.SHADOW.transparency },
      line: { width: 0 },
      rectRadius: EDS.AESTHETICS.RADIUS,
    });

    // Main Card Body
    return slide.addShape(this.pptx.ShapeType.rect, {
      x, y, w, h,
      fill: options.fill || { color: 'FFFFFF' },
      line: options.line || { color: this.colors.surface.border, width: EDS.AESTHETICS.BORDER_W },
      rectRadius: EDS.AESTHETICS.RADIUS,
    });
  }

  /**
   * Adds text with high-fidelity line spacing and padding
   */
  addEditorialText(slide: pptxgen.Slide, text: any, options: any) {
    const isHeading = options.fontSize && options.fontSize > 20;
    const spacing = isHeading ? 1.1 : 1.4;

    const baseOptions: pptxgen.TextPropsOptions = {
      fontFace: EDS.TYPOGRAPHY.FONT_PRIMARY,
      color: this.colors.text.primary,
      align: 'left',
      valign: 'top',
      lineSpacing: (options.lineSpacing || spacing) * 10,
      inset: [EDS.AESTHETICS.PADDING, EDS.AESTHETICS.PADDING, EDS.AESTHETICS.PADDING, EDS.AESTHETICS.PADDING],
      shrinkText: true,
      ...options
    };

    return slide.addText(text, baseOptions);
  }

  /**
   * Content-Aware Multi-Column List Renderer
   */
  renderContentBlock(slide: pptxgen.Slide, points: string[], x: number, y: number, w: number, h: number, cardFill?: string) {
    this.addCard(slide, x, y, w, h, { fill: cardFill ? { color: cardFill } : null });
    
    // Scale font if content is dense
    const totalChars = points.join('').length;
    const baseSize = totalChars > 600 ? 11 : (totalChars > 300 ? 12 : 14);

    const bulletItems = points.map(p => ({
      text: p,
      options: { 
        bullet: { type: 'number', color: this.colors.primary }, 
        fontSize: baseSize,
        color: cardFill === this.colors.primary ? 'FFFFFF' : this.colors.text.primary,
        breakLine: true
      }
    }));

    this.addEditorialText(slide, bulletItems, {
      x, y, w, h,
      valign: 'middle',
      fontSize: baseSize
    });
  }
}

class ContentSanitizer {
  static clean(text: any): string {
    if (text === null || text === undefined) return "";
    const str = typeof text === 'string' ? text : String(text);
    return str.replace(/[\*_#`]/g, '').trim();
  }
}

/**
 * MAIN PRESENTATION WORKFLOW
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
    onProgress?.("Architecting editorial system...");
    
    const systemPrompt = `ACT AS A SENIOR EDITORIAL DESIGNER FOR GAMMA.AI.
    YOUR TASK IS TO DESIGN A ${config.slidesCount}-SLIDE ACADEMIC MASTERPIECE.

    TITLE: ${config.title}
    ABSTRACT: ${item.abstract || item.title}
    
    DESIGN RULES:
    - Language: ${config.language}.
    - No markdown characters.
    - Vary layout types: "HERO", "SPLIT", "CARDS", "EDITORIAL_ACCENT".
    - Content must be substantial (min 4 points per slide).

    OUTPUT RAW JSON ONLY: { "slides": [{ "title": "", "content": [""], "layout": "" }] }`;

    const aiRes = await callAiProxy('groq', systemPrompt);
    if (!aiRes) throw new Error("AI Design Refused");
    
    const blueprint = JSON.parse(aiRes.substring(aiRes.indexOf('{'), aiRes.lastIndexOf('}') + 1));
    const slidesData = blueprint.slides || [];

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    
    const colors = {
      primary: config.theme.primaryColor?.replace('#', '') || '004A74',
      secondary: config.theme.secondaryColor?.replace('#', '') || 'FED400',
      text: { primary: '1F2937', secondary: '6B7280' },
      surface: { border: 'E5E7EB', card: 'F9FAFB' }
    };

    const engine = new EDSLayoutEngine(pptx, colors);

    // --- SLIDE 1: PREMIUM COVER ---
    const cover = pptx.addSlide();
    engine.addCard(cover, 0, 0, 10, 5.625, { fill: { color: colors.primary }, line: { width: 0 } });
    
    const cleanTitle = ContentSanitizer.clean(config.title).toUpperCase();
    const titleSize = cleanTitle.length > 80 ? 22 : (cleanTitle.length > 40 ? 28 : 34);

    engine.addEditorialText(cover, cleanTitle, {
      x: 0, y: 1.0, w: 10, h: 3,
      fontSize: titleSize, color: 'FFFFFF', bold: true, align: 'center', valign: 'middle', charSpacing: 1.2
    });

    engine.addEditorialText(cover, config.presenters.join(' • '), {
      x: 0, y: 4.2, w: 10, align: 'center', fontSize: 10, color: colors.secondary, bold: true, charSpacing: 2
    });

    // --- CONTENT SLIDES: EDITORIAL DIVERSITY ---
    slidesData.forEach((s: any, i: number) => {
      onProgress?.(`Rendering slide ${i+1}...`);
      const slide = pptx.addSlide();
      const title = ContentSanitizer.clean(s.title);
      const points = (s.content || []).map(ContentSanitizer.clean);
      const layout = s.layout || 'SPLIT';

      // 1. EDITORIAL TITLE (Snap to Grid)
      const titleDim = engine.getGridDim(0, 12);
      engine.addEditorialText(slide, title, {
        x: titleDim.x, y: 0.3, w: titleDim.w, h: 0.6,
        fontSize: 22, bold: true, color: colors.primary, align: layout === 'HERO' ? 'center' : 'left'
      });

      // 2. LAYOUT SWITCHER
      if (layout === 'EDITORIAL_ACCENT' || (i % 4 === 0)) {
        // Layout: Dark sidebar accent
        engine.addCard(slide, 0.4, 1.0, 3.0, 4.0, { fill: { color: colors.primary } });
        engine.addEditorialText(slide, title, { x: 0.5, y: 2.0, w: 2.8, fontSize: 18, color: 'FFFFFF', bold: true, align: 'center' });
        
        const contentDim = engine.getGridDim(4, 8);
        engine.renderContentBlock(slide, points, contentDim.x, 1.0, contentDim.w, 4.0, colors.surface.card);
      } 
      else if (layout === 'HERO' || (i % 4 === 1)) {
        // Layout: Centered Hero Card
        const heroDim = engine.getGridDim(2, 8);
        engine.renderContentBlock(slide, points, heroDim.x, 1.2, heroDim.w, 3.8, colors.surface.card);
      }
      else if (layout === 'CARDS' || (i % 4 === 2)) {
        // Layout: Multi-column Card Grid
        const half = Math.ceil(points.length / 2);
        const col1 = engine.getGridDim(0, 6);
        const col2 = engine.getGridDim(6, 6);
        engine.renderContentBlock(slide, points.slice(0, half), col1.x, 1.0, col1.w, 4.0);
        engine.renderContentBlock(slide, points.slice(half), col2.x, 1.0, col2.w, 4.0, colors.surface.card);
      }
      else {
        // Layout: Standard Split
        const left = engine.getGridDim(0, 5);
        const right = engine.getGridDim(5, 7);
        // Visual cue: Add a small underline to title
        slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.9, w: 1, h: 0.05, fill: { color: colors.secondary } });
        engine.renderContentBlock(slide, points, right.x, 1.0, right.w, 4.0, colors.surface.card);
        engine.addEditorialText(slide, "Key Insights & Observations", { x: left.x, y: 1.5, w: left.w, fontSize: 16, italic: true, color: colors.text.secondary });
      }

      // Footer
      engine.addEditorialText(slide, `EDS • ${i+1}`, { x: 8.5, y: 5.2, w: 1, fontSize: 8, align: 'right', color: colors.text.secondary });
    });

    onProgress?.("Finalizing Google Slides export...");
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
    console.error("EDS System Error:", error);
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