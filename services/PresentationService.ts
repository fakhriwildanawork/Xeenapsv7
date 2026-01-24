import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * EDITORIAL DESIGN SYSTEM CONSTANTS
 */
const EDITORIAL_CONSTANTS = {
  GRID: {
    MARGIN_X: 0.5,
    MARGIN_Y: 0.5,
    GUTTER: 0.3,
    SAFE_W: 9.0,
  },
  TYPOGRAPHY: {
    H1: { size: 32, weight: 700, spacing: 1.1 },
    BODY: { size: 14, weight: 400, spacing: 1.4 },
    CAPTION: { size: 9, weight: 700 },
  },
  VISUAL: {
    RADIUS: 0.15,
    PADDING: 0.35,
    BORDER_W: 0.5,
  }
};

/**
 * EDITORIAL LAYOUT ENGINE
 */
class EditorialLayoutEngine {
  constructor(private pptx: any, private colors: any) {}

  // Content-Aware scaling to prevent overflow
  getScaledFontSize(text: string, base: number): number {
    if (text.length > 500) return base * 0.75;
    if (text.length > 300) return base * 0.85;
    return base;
  }

  addModernCard(slide: any, x: number, y: number, w: number, h: number, options: any = {}) {
    // Subtle Shadow
    slide.addShape(this.pptx.ShapeType.rect, {
      x: x + 0.05, y: y + 0.05, w, h,
      fill: { color: '000000', transparency: 92 },
      line: { width: 0 },
      rectRadius: EDITORIAL_CONSTANTS.VISUAL.RADIUS,
    });
    // Main Container
    return slide.addShape(this.pptx.ShapeType.rect, {
      x, y, w, h,
      fill: options.fill || { color: 'FFFFFF' },
      line: options.border || { color: this.colors.surface.border, width: EDITORIAL_CONSTANTS.VISUAL.BORDER_W },
      rectRadius: EDITORIAL_CONSTANTS.VISUAL.RADIUS,
    });
  }

  addText(slide: any, text: any, options: any) {
    const finalOpts = {
      fontFace: 'Inter',
      color: this.colors.text.primary,
      align: 'left',
      valign: 'top',
      shrinkText: true,
      lineSpacing: (options.lineSpacing || 1.2) * 10,
      inset: [EDITORIAL_CONSTANTS.VISUAL.PADDING, EDITORIAL_CONSTANTS.VISUAL.PADDING, EDITORIAL_CONSTANTS.VISUAL.PADDING, EDITORIAL_CONSTANTS.VISUAL.PADDING],
      ...options
    };
    return slide.addText(text, finalOpts);
  }

  /**
   * Renders a professional bullet list inside a card
   */
  renderSmartList(slide: any, points: string[], x: number, y: number, w: number, cardOptions: any = {}) {
    const totalChars = points.join('').length;
    // Estimate height dynamically (avg 180 chars per inch for 1 column)
    const estimatedH = Math.max(2.8, (totalChars / 180) * 0.9 + 0.8);
    
    this.addModernCard(slide, x, y, w, estimatedH, cardOptions);

    // Using native bullet array for perfect spacing
    const bulletItems = points.map(p => ({
      text: p,
      options: { 
        bullet: { type: 'number' },
        fontSize: this.getScaledFontSize(p, EDITORIAL_CONSTANTS.TYPOGRAPHY.BODY.size),
        color: cardOptions.textColor || this.colors.text.primary,
      }
    }));

    this.addText(slide, bulletItems, {
      x, y, w, h: estimatedH,
      valign: 'middle',
      fontSize: EDITORIAL_CONSTANTS.TYPOGRAPHY.BODY.size
    });

    return y + estimatedH + EDITORIAL_CONSTANTS.GRID.GUTTER;
  }
}

class ContentSanitizer {
  static clean(text: any): string {
    if (!text) return "";
    const str = typeof text === 'string' ? text : String(text);
    return str.replace(/[\*_#`]/g, '').trim();
  }
}

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
    GENERATE A HIGH-END ACADEMIC PRESENTATION BluePrint.
    
    TITLE: ${config.title}
    CONTENT: ${item.abstract || item.title}
    
    GOAL: 
    - Create exactly ${config.slidesCount} slides.
    - Diversity is key. Alternate between "LEFT_ACCENT", "GRID_TWO", and "HERO_STATEMENT".
    - Content must be detailed enough for study (Academic Standard).
    - Output raw JSON only. Format: { "slides": [{ "title": "", "content": [""], "layoutType": "" }] }`;

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

    // --- SLIDE 1: COVER (Fixed Overlap) ---
    const cover = pptx.addSlide();
    engine.addModernCard(cover, 0, 0, 10, 5.625, { fill: { color: colors.primary }, border: { width: 0 } });
    
    const cleanTitle = ContentSanitizer.clean(config.title).toUpperCase();
    const coverTitleSize = cleanTitle.length > 80 ? 22 : (cleanTitle.length > 40 ? 28 : 34);

    engine.addText(cover, cleanTitle, {
      x: 0.5, y: 1.0, w: 9, h: 3.5, 
      fontSize: coverTitleSize, color: 'FFFFFF', bold: true, align: 'center', valign: 'middle'
    });
    
    engine.addText(cover, config.presenters.join(' • '), {
      x: 0, y: 4.5, w: 10, align: 'center', fontSize: 11, color: colors.secondary, bold: true, charSpacing: 1.5
    });

    // --- CONTENT SLIDES (Fixed Monotony) ---
    slidesData.forEach((s: any, idx: number) => {
      onProgress?.(`Rendering slide ${idx+1}...`);
      const slide = pptx.addSlide();
      const title = ContentSanitizer.clean(s.title);
      const points = (s.content || []).map(ContentSanitizer.clean);
      const type = s.layoutType || 'GRID_TWO';

      if (type === 'LEFT_ACCENT' || (idx % 3 === 0)) {
        // Layout: Left Accent Box
        engine.addModernCard(slide, 0, 0, 3.5, 5.625, { fill: { color: colors.primary }, border: { width: 0 } });
        engine.addText(slide, title, { 
          x: 0.3, y: 1.5, w: 2.9, h: 2.5, 
          fontSize: 24, bold: true, color: 'FFFFFF', valign: 'middle' 
        });
        engine.renderSmartList(slide, points, 3.8, 0.5, 5.7, { fill: { color: colors.surface.card } });
      } else if (type === 'HERO_STATEMENT' || (idx % 3 === 1)) {
        // Layout: Centered Hero Card
        engine.addText(slide, title, { 
          x: 0.5, y: 0.3, w: 9, fontSize: 20, bold: true, color: colors.primary, align: 'center' 
        });
        engine.renderSmartList(slide, points, 1.5, 1.2, 7.0, { fill: { color: colors.surface.card } });
      } else {
        // Layout: Balanced 2 Columns
        engine.addText(slide, title, { x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true, color: colors.primary });
        const half = Math.ceil(points.length / 2);
        engine.renderSmartList(slide, points.slice(0, half), 0.5, 1.0, 4.35, { fill: { color: 'FFFFFF' } });
        engine.renderSmartList(slide, points.slice(half), 5.15, 1.0, 4.35, { fill: { color: colors.surface.card } });
      }

      // Footer
      engine.addText(slide, `© XEENAPS • Page ${idx+2}`, { x: 8.5, y: 5.3, w: 1, fontSize: 8, color: colors.text.secondary, align: 'right' });
    });

    // --- EXPORT ---
    onProgress?.("Packaging presentation...");
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
    console.error("Layout Engine Error:", error);
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