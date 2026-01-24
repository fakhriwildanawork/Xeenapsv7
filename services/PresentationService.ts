import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * XEENAPS DESIGN SYSTEM (XDS) CONSTANTS
 * Inspired by Gamma.ai's high-end editorial aesthetics.
 */
const XDS = {
  GRID: {
    COLS: 12,
    WIDTH: 10,       // PPTX 16:9 Width
    HEIGHT: 5.625,   // PPTX 16:9 Height
    MARGIN: 0.5,     // 5% Safe Margin
    GUTTER: 0.25,    // Spacing between cards
  },
  TYPE: {
    FONT_HEAD: 'Inter',
    FONT_BODY: 'Inter',
    H1_SIZE: 34,
    H2_SIZE: 24,
    BODY_SIZE: 13,
    LINE_HEIGHT: 1.3, // Standard editorial spacing
  },
  VISUAL: {
    RADIUS: 0.15,    // Rounded corners
    SHADOW_OFFSET: 0.04,
    SHADOW_OPACITY: 95,
    BORDER_W: 0.5,   // Hairline border
    CARD_PADDING: 0.3, // Internal padding (Box Model)
  }
};

/**
 * EDITORIAL LAYOUT ENGINE
 * Handles programmatic placement, grid snapping, and aesthetic styling.
 */
class EditorialLayoutEngine {
  constructor(private pptx: pptxgen, private colors: any) {}

  /**
   * Calculates dimensions based on 12-column grid system
   */
  getGrid(startCol: number, span: number) {
    const totalSafeW = XDS.GRID.WIDTH - (XDS.GRID.MARGIN * 2);
    const colW = totalSafeW / XDS.GRID.COLS;
    return {
      x: XDS.GRID.MARGIN + (startCol * colW),
      w: (span * colW) - XDS.GRID.GUTTER
    };
  }

  /**
   * Renders a "Gamma-style" Card with shadow and rounded corners
   */
  renderCard(slide: pptxgen.Slide, x: number, y: number, w: number, h: number, options: any = {}) {
    // 1. Render Subtle Shadow
    slide.addShape(this.pptx.ShapeType.rect, {
      x: x + XDS.VISUAL.SHADOW_OFFSET,
      y: y + XDS.VISUAL.SHADOW_OFFSET,
      w, h,
      fill: { color: '000000', transparency: XDS.VISUAL.SHADOW_OPACITY },
      line: { width: 0 },
      rectRadius: XDS.VISUAL.RADIUS
    });

    // 2. Render Main Card Container
    return slide.addShape(this.pptx.ShapeType.rect, {
      x, y, w, h,
      fill: options.fill || { color: 'FFFFFF' },
      line: options.line || { color: this.colors.surface.border, width: XDS.VISUAL.BORDER_W },
      rectRadius: XDS.VISUAL.RADIUS
    });
  }

  /**
   * High-fidelity Text Rendering with auto-scaling and proper line spacing
   */
  renderText(slide: pptxgen.Slide, text: any, options: any) {
    const isHeading = options.fontSize && options.fontSize >= 20;
    
    const baseOpts: pptxgen.TextPropsOptions = {
      fontFace: XDS.TYPE.FONT_BODY,
      color: this.colors.text.primary,
      align: 'left',
      valign: 'top',
      lineSpacing: (options.lineSpacing || XDS.TYPE.LINE_HEIGHT) * 10, // PPTXGenJS scaling
      inset: [XDS.VISUAL.CARD_PADDING, XDS.VISUAL.CARD_PADDING, XDS.VISUAL.CARD_PADDING, XDS.VISUAL.CARD_PADDING],
      shrinkText: true,
      ...options
    };

    return slide.addText(text, baseOpts);
  }

  /**
   * Smart Content Block: Adjusts font size based on text density
   */
  renderSmartContent(slide: pptxgen.Slide, points: string[], x: number, y: number, w: number, h: number, cardOptions: any = {}) {
    this.renderCard(slide, x, y, w, h, cardOptions);

    const totalChars = points.join(' ').length;
    let fontSize = XDS.TYPE.BODY_SIZE;
    if (totalChars > 600) fontSize = 10;
    else if (totalChars > 400) fontSize = 11.5;

    const bulletItems = points.map(p => ({
      text: p,
      options: { 
        bullet: { type: 'number', color: this.colors.primary },
        fontSize: fontSize,
        color: cardOptions.textColor || this.colors.text.primary
      }
    }));

    this.renderText(slide, bulletItems, {
      x, y, w, h,
      valign: 'middle',
      fontSize: fontSize
    });
  }
}

/**
 * CLEANER
 */
class ContentSanitizer {
  static clean(text: any): string {
    if (!text) return "";
    const str = typeof text === 'string' ? text : String(text);
    return str.replace(/[\*_#`]/g, '').trim();
  }
}

/**
 * PRESENTATION SERVICE V9 - GAMMA EDITION
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
    onProgress?.("Architecting design engine...");
    
    const systemPrompt = `ACT AS A SENIOR DESIGNER FOR GAMMA.AI.
    CREATE AN ACADEMIC PRESENTATION BluePrint.
    
    RULES:
    - Precisely ${config.slidesCount} slides.
    - Diversity in Layouts: HERO, SIDEBAR_ACCENT, SPLIT_GRID, FOCUS_CENTER.
    - No markdown. JSON only.
    - Abstract: ${item.abstract || item.title}
    
    OUTPUT JSON: { "slides": [{ "title": "", "content": [""], "layoutType": "" }] }`;

    const aiRes = await callAiProxy('groq', systemPrompt);
    if (!aiRes) throw new Error("AI Refusal");
    
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

    const engine = new EditorialLayoutEngine(pptx, colors);

    // 1. TITLE SLIDE (Hero Aesthetic)
    const cover = pptx.addSlide();
    engine.renderCard(cover, 0, 0, 10, 5.625, { fill: { color: colors.primary }, line: { width: 0 } });
    
    const titleClean = ContentSanitizer.clean(config.title).toUpperCase();
    const titleSize = titleClean.length > 50 ? 28 : 36;
    
    engine.renderText(cover, titleClean, {
      x: 0.5, y: 1.2, w: 9, h: 2.5,
      fontSize: titleSize, color: 'FFFFFF', bold: true, align: 'center', valign: 'middle', charSpacing: 1.2, lineSpacing: 1.1
    });

    engine.renderText(cover, config.presenters.join(' • '), {
      x: 0, y: 4.5, w: 10, align: 'center', fontSize: 10, color: colors.secondary, bold: true, charSpacing: 2
    });

    // 2. CONTENT SLIDES
    slidesData.forEach((s: any, idx: number) => {
      onProgress?.(`Rendering slide ${idx+1}...`);
      const slide = pptx.addSlide();
      const title = ContentSanitizer.clean(s.title);
      const points = (s.content || []).map(ContentSanitizer.clean);
      const layout = s.layoutType || 'SPLIT_GRID';

      if (layout === 'SIDEBAR_ACCENT' || (idx % 4 === 0)) {
        // Sidebar Layout
        engine.renderCard(slide, 0, 0, 3.2, 5.625, { fill: { color: colors.primary }, line: { width: 0 } });
        engine.renderText(slide, title, { 
          x: 0.2, y: 1.5, w: 2.8, h: 2, fontSize: 24, bold: true, color: 'FFFFFF', valign: 'middle' 
        });
        
        const content = engine.getGrid(4, 8);
        engine.renderSmartContent(slide, points, content.x, 0.8, content.w, 4.0, { fill: { color: colors.surface.card } });
      } 
      else if (layout === 'FOCUS_CENTER' || (idx % 4 === 1)) {
        // Centered Focus Layout
        engine.renderText(slide, title.toUpperCase(), { 
          x: 0.5, y: 0.4, w: 9, fontSize: 18, bold: true, color: colors.primary, align: 'center' 
        });
        
        const center = engine.getGrid(2, 8);
        engine.renderSmartContent(slide, points, center.x, 1.2, center.w, 3.8, { fill: { color: colors.surface.card } });
      }
      else {
        // Split Grid (Standard)
        engine.renderText(slide, title, { x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true, color: colors.primary });
        
        const half = Math.ceil(points.length / 2);
        const col1 = engine.getGrid(0, 6);
        const col2 = engine.getGrid(6, 6);
        
        engine.renderSmartContent(slide, points.slice(0, half), col1.x, 1.0, col1.w, 4.1);
        engine.renderSmartContent(slide, points.slice(half), col2.x, 1.0, col2.w, 4.1, { fill: { color: colors.surface.card } });
      }

      // Footer
      engine.renderText(slide, `© XEENAPS • Page ${idx+2}`, { x: 8.5, y: 5.2, w: 1, fontSize: 8, color: colors.text.secondary, align: 'right' });
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
    console.error("Editorial Engine Error:", error);
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