import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * XEENAPS BLOCK ENGINE (XBE) - Version 2.0
 * A high-fidelity layout engine that treats slides as a collection of aesthetic blocks.
 */
const XBE = {
  LAYOUT: {
    WIDTH: 10,
    HEIGHT: 5.625,
    MARGIN_X: 0.6,    // 6% Safe Zone
    MARGIN_Y: 0.5,
    GUTTER: 0.3,      // Premium breathing space
    GRID_COLS: 12,
  },
  STYLE: {
    RADIUS: 0.2,      // Modern rounded corners
    CARD_PADDING: 0.4, // Internal box model padding
    SHADOW_OFFSET: 0.05,
    BORDER_W: 0.5,
    SHADOW_OPACITY: 94,
  },
  TYPE: {
    FONT: 'Inter',
    H1_MAX: 32,       // Safer for academic long titles
    H2_MAX: 22,
    BODY_SIZE: 12.5,
    LINE_HEIGHT_H: 1.2,
    LINE_HEIGHT_B: 1.4, // Editorial spacing
  }
};

class XBEEngine {
  constructor(private pptx: pptxgen, private colors: any) {}

  /**
   * Calculates X and Width based on 12-column grid
   */
  getGridDim(colStart: number, colSpan: number) {
    const safeW = XBE.LAYOUT.WIDTH - (XBE.LAYOUT.MARGIN_X * 2);
    const colW = safeW / XBE.LAYOUT.GRID_COLS;
    return {
      x: XBE.LAYOUT.MARGIN_X + (colStart * colW),
      w: (colSpan * colW) - XBE.LAYOUT.GUTTER
    };
  }

  /**
   * Renders a "Gamma-style" Block Card
   */
  addBlockCard(slide: pptxgen.Slide, x: number, y: number, w: number, h: number, fill?: string) {
    // 1. Soft Shadow Layer
    slide.addShape(this.pptx.ShapeType.rect, {
      x: x + XBE.STYLE.SHADOW_OFFSET,
      y: y + XBE.STYLE.SHADOW_OFFSET,
      w, h,
      fill: { color: '000000', transparency: XBE.STYLE.SHADOW_OPACITY },
      line: { width: 0 },
      rectRadius: XBE.STYLE.RADIUS
    });

    // 2. Main Card Layer
    return slide.addShape(this.pptx.ShapeType.rect, {
      x, y, w, h,
      fill: fill ? { color: fill } : { color: 'FFFFFF' },
      line: { color: fill === this.colors.primary ? this.colors.primary : 'E5E7EB', width: XBE.STYLE.BORDER_W },
      rectRadius: XBE.STYLE.RADIUS
    });
  }

  /**
   * Renders text with high vertical rhythm
   */
  addTextBlock(slide: pptxgen.Slide, text: any, options: any) {
    const isHeading = options.fontSize && options.fontSize > 20;
    const spacing = isHeading ? XBE.TYPE.LINE_HEIGHT_H : XBE.TYPE.LINE_HEIGHT_B;

    const baseOpts: pptxgen.TextPropsOptions = {
      fontFace: XBE.TYPE.FONT,
      color: this.colors.text.primary,
      align: 'left',
      valign: 'top',
      lineSpacing: spacing * 100, // Correct pptxgenjs percentage logic
      inset: [XBE.STYLE.CARD_PADDING, XBE.STYLE.CARD_PADDING, XBE.STYLE.CARD_PADDING, XBE.STYLE.CARD_PADDING],
      shrinkText: true,
      ...options
    };

    return slide.addText(text, baseOpts);
  }

  /**
   * Complex Block: Card with Title and Bullet List
   */
  renderContentBlock(slide: pptxgen.Slide, title: string, points: string[], x: number, y: number, w: number, h: number, isAccent = false) {
    this.addBlockCard(slide, x, y, w, h, isAccent ? this.colors.primary : 'FFFFFF');
    
    // Header inside block
    this.addTextBlock(slide, title.toUpperCase(), {
      x, y, w, h: 0.8,
      fontSize: 14, bold: true, color: isAccent ? 'FFFFFF' : this.colors.primary,
      align: 'left', valign: 'top'
    });

    // Content inside block (using native array for perfect spacing)
    const totalContentLen = points.join('').length;
    const dynamicSize = totalContentLen > 500 ? 10 : (totalContentLen > 300 ? 11 : 12);

    const bulletProps = points.map(p => ({
      text: p,
      options: {
        bullet: { type: 'number', color: isAccent ? 'FFFFFF' : this.colors.primary },
        fontSize: dynamicSize,
        color: isAccent ? 'FFFFFF' : this.colors.text.primary,
        breakLine: true
      }
    }));

    this.addTextBlock(slide, bulletProps, {
      x, y: y + 0.6, w, h: h - 0.7,
      fontSize: dynamicSize,
      valign: 'top'
    });
  }
}

class Sanitizer {
  static clean(text: any): string {
    if (!text) return "";
    return String(text).replace(/[\*_#`]/g, '').trim();
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
    onProgress?.("Designing block architecture...");
    
    const systemPrompt = `ACT AS A SENIOR DESIGNER FOR GAMMA.AI.
    YOUR MISSION IS TO ARCHITECT A ${config.slidesCount}-SLIDE ACADEMIC STORY.

    TITLE: ${config.title}
    ABSTRACT: ${item.abstract || item.title}
    
    ESTHETIC GUIDELINES:
    - Language: ${config.language}.
    - Layouts: Use "LEFT_ACCENT", "GRID_TWO", "HERO_STATEMENT".
    - Content: Substantial points (min 4 per slide).

    OUTPUT RAW JSON ONLY: { "slides": [{ "title": "", "content": [""], "layout": "" }] }`;

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
      surface: { border: 'E5E7EB' }
    };

    const engine = new XBEEngine(pptx, colors);

    // --- SLIDE 1: PREMIUM HERO COVER ---
    const cover = pptx.addSlide();
    engine.addBlockCard(cover, 0.2, 0.2, 9.6, 5.2, colors.primary);
    
    const cleanTitle = Sanitizer.clean(config.title).toUpperCase();
    const coverTitleSize = cleanTitle.length > 80 ? 20 : (cleanTitle.length > 40 ? 26 : 32);

    engine.addTextBlock(cover, cleanTitle, {
      x: 0.5, y: 1.0, w: 9, h: 3.5,
      fontSize: coverTitleSize, color: 'FFFFFF', bold: true, align: 'center', valign: 'middle', 
      charSpacing: 1.1, lineSpacing: 110
    });

    engine.addTextBlock(cover, config.presenters.join(' • '), {
      x: 0.5, y: 4.5, w: 9, align: 'center', fontSize: 10, color: colors.secondary, bold: true, charSpacing: 2
    });

    // --- CONTENT SLIDES: EDITORIAL DIVERSITY ---
    slidesData.forEach((s: any, idx: number) => {
      onProgress?.(`Building slide ${idx+1}...`);
      const slide = pptx.addSlide();
      const title = Sanitizer.clean(s.title);
      const points = (s.content || []).map(Sanitizer.clean);
      const layout = s.layout || 'GRID_TWO';

      // Global Slide Header (snap to grid)
      const headDim = engine.getGridDim(0, 12);
      engine.addTextBlock(slide, title, {
        x: headDim.x, y: 0.3, w: headDim.w, h: 0.6,
        fontSize: 20, bold: true, color: colors.primary, align: 'left'
      });

      // Layout Switcher
      if (layout === 'LEFT_ACCENT' || (idx % 3 === 0)) {
        const left = engine.getGridDim(0, 4);
        const right = engine.getGridDim(4, 8);
        
        engine.addBlockCard(slide, left.x, 1.0, left.w, 4.0, colors.primary);
        engine.addTextBlock(slide, title, { x: left.x, y: 1.2, w: left.w, h: 3.6, fontSize: 18, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
        
        engine.renderContentBlock(slide, "Insight Points", points, right.x, 1.0, right.w, 4.0);
      } 
      else if (layout === 'HERO_STATEMENT' || (idx % 3 === 1)) {
        const center = engine.getGridDim(2, 8);
        engine.renderContentBlock(slide, "Key Summary", points, center.x, 1.0, center.w, 4.2);
      }
      else {
        // GRID_TWO: Balanced columns
        const col1 = engine.getGridDim(0, 6);
        const col2 = engine.getGridDim(6, 6);
        const half = Math.ceil(points.length / 2);
        
        engine.renderContentBlock(slide, "Part I", points.slice(0, half), col1.x, 1.0, col1.w, 4.2);
        engine.renderContentBlock(slide, "Part II", points.slice(half), col2.x, 1.0, col2.w, 4.2, true);
      }

      // Branded Footer
      engine.addTextBlock(slide, `XEENAPS EDITORIAL SYSTEM • PAGE ${idx+2}`, { x: 7.5, y: 5.3, w: 2, fontSize: 7, color: colors.text.secondary, align: 'right' });
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
    console.error("XBE Engine Critical Error:", error);
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