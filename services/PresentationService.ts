
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * XBE Engine v3.1 - "The Gamma Aesthetic"
 * Stability & Aesthetic Update.
 */
const XBE = {
  LAYOUT: {
    WIDTH: 10,
    HEIGHT: 5.625,
    MARGIN_X: 0.5,    
    MARGIN_Y: 0.4,
    GUTTER: 0.25,      
    GRID_COLS: 12,
  },
  STYLE: {
    RADIUS: 0.35,      // Rounded corners
    CARD_PADDING: 0.5, // Generous internal padding
    BORDER_W: 1,       
    BORDER_COLOR: 'F1F5F9', 
    BG_ACCENT: 'F8FAFC',    
  },
  TYPE: {
    FONT_HEADING: 'Inter Bold',
    FONT_BODY: 'Inter',
    H1_SIZE: 28,      
    H2_SIZE: 20,
    BODY_SIZE: 11,
    LINE_HEIGHT: 1.3,  
  }
};

/**
 * UTILS: Content Sanitizer
 */
class Sanitizer {
  static clean(text: any): string {
    if (text === null || text === undefined) return "";
    return String(text).replace(/[\*_#`]/g, '').trim();
  }

  static cleanPoints(points: any): string[] {
    if (!Array.isArray(points)) return [];
    return points.map(p => this.clean(p)).filter(p => p.length > 0);
  }
}

class XBEEngine {
  constructor(private pptx: pptxgen, private colors: any) {}

  getGridDim(colStart: number, colSpan: number) {
    const safeW = XBE.LAYOUT.WIDTH - (XBE.LAYOUT.MARGIN_X * 2);
    const colW = safeW / XBE.LAYOUT.GRID_COLS;
    return {
      x: XBE.LAYOUT.MARGIN_X + (colStart * colW),
      w: (colSpan * colW) - XBE.LAYOUT.GUTTER
    };
  }

  /**
   * Render kartu dengan border lembut.
   * // Fix: Changed ShapeType.RECT to ShapeType.rect to match pptxgenjs type definitions (lowercase)
   */
  addModernCard(slide: pptxgen.Slide, x: number, y: number, w: number, h: number, isPrimary = false) {
    return slide.addShape(this.pptx.ShapeType.rect, {
      x, y, w, h,
      fill: isPrimary ? { color: this.colors.primary } : { color: 'FFFFFF' },
      line: isPrimary ? { width: 0 } : { color: XBE.STYLE.BORDER_COLOR, width: XBE.STYLE.BORDER_W },
      rectRadius: XBE.STYLE.RADIUS
    });
  }

  /**
   * Text block dengan internal padding yang konsisten.
   * FIX: Memastikan options bullet tidak bernilai null jika tidak ada.
   */
  addTextToCard(slide: pptxgen.Slide, text: any, x: number, y: number, w: number, h: number, opts: any = {}) {
    const padding = XBE.STYLE.CARD_PADDING;
    const textOptions: pptxgen.TextPropsOptions = {
      x: x + padding,
      y: y + padding,
      w: w - (padding * 2),
      h: h - (padding * 2),
      fontFace: opts.bold ? XBE.TYPE.FONT_HEADING : XBE.TYPE.FONT_BODY,
      fontSize: opts.fontSize || XBE.TYPE.BODY_SIZE,
      color: opts.color || this.colors.text.primary,
      align: opts.align || 'left',
      valign: opts.valign || 'top',
      lineSpacing: (opts.lineSpacing || XBE.TYPE.LINE_HEIGHT) * 100,
      breakLine: true,
      shrinkText: true,
      ...opts
    };

    // Remove bullet if null/undefined to avoid library internal errors
    if (!opts.bullet) delete textOptions.bullet;

    slide.addText(text, textOptions);
  }

  /**
   * Render Blok Konten dengan Bullet Points
   */
  renderContentBlock(slide: pptxgen.Slide, title: string, points: string[], x: number, y: number, w: number, h: number, isAccent = false) {
    this.addModernCard(slide, x, y, w, h, isAccent);
    
    // Header
    this.addTextToCard(slide, Sanitizer.clean(title).toUpperCase(), x, y, w, 1, {
      fontSize: 14,
      bold: true,
      color: isAccent ? 'FFFFFF' : this.colors.primary
    });

    // Bullets
    const cleanedPoints = Sanitizer.cleanPoints(points);
    if (cleanedPoints.length > 0) {
      const bulletProps = cleanedPoints.map(p => ({
        text: p,
        options: { 
          bullet: true,
          color: isAccent ? 'FFFFFF' : this.colors.text.primary,
          fontSize: cleanedPoints.join('').length > 400 ? 10 : 11
        }
      }));

      this.addTextToCard(slide, bulletProps, x, y + 0.6, w, h - 0.7, {
        color: isAccent ? 'FFFFFF' : this.colors.text.primary
      });
    }
  }
}

/**
 * FETCH RELATED PRESENTATIONS
 * Memperbaiki error TS2305 dengan mengekspor kembali fungsi ini.
 */
export const fetchRelatedPresentations = async (collectionId: string): Promise<PresentationItem[]> => {
  try {
    if (!GAS_WEB_APP_URL) return [];
    const res = await fetch(`${GAS_WEB_APP_URL}?action=getRelatedPresentations&collectionId=${collectionId}`);
    const result = await res.json();
    return result.status === 'success' ? result.data : [];
  } catch (error) {
    console.error("Fetch Presentations Error:", error);
    return [];
  }
};

/**
 * CREATE PRESENTATION WORKFLOW
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
    onProgress?.("Architecting Gamma-style layouts...");

    const systemPrompt = `ACT AS A SENIOR UI/UX DESIGNER FOR GAMMA.AI.
    Create a ${config.slidesCount}-slide academic presentation blueprint in ${config.language}.
    
    SOURCE MATERIAL:
    Title: ${config.title}
    Abstract: ${item.abstract || item.title}
    
    DIRECTIONS:
    - Language: ${config.language}.
    - Diversify layouts: "HERO", "SPLIT_VIEW", "FULL_CONTENT".
    - Avoid markdown. Return clean strings in a JSON array.

    OUTPUT JSON: { "slides": [{ "title": "", "points": [""], "layout": "" }] }`;

    const aiRes = await callAiProxy('groq', systemPrompt);
    if (!aiRes) throw new Error("AI Refusal");

    const blueprint = JSON.parse(aiRes.substring(aiRes.indexOf('{'), aiRes.lastIndexOf('}') + 1));
    const slidesData = blueprint.slides || [];

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    
    const colors = {
      primary: config.theme.primaryColor?.replace('#', '') || '0F172A',
      text: { primary: '1E293B', secondary: '64748B' }
    };

    const engine = new XBEEngine(pptx, colors);

    // SLIDE 1: COVER
    const cover = pptx.addSlide();
    cover.background = { color: XBE.STYLE.BG_ACCENT };
    engine.addModernCard(cover, 0.4, 0.4, 9.2, 4.8, true);
    
    const cleanTitle = Sanitizer.clean(config.title).toUpperCase();
    engine.addTextToCard(cover, cleanTitle, 0.4, 0.4, 9.2, 3.5, { 
      fontSize: cleanTitle.length > 60 ? 24 : 32, 
      color: 'FFFFFF', 
      bold: true, 
      align: 'center', 
      valign: 'middle' 
    });

    engine.addTextToCard(cover, config.presenters.join(' • '), 0.4, 4.2, 9.2, 0.5, {
      fontSize: 10, color: 'FFFFFF', align: 'center', bold: true
    });

    // SLIDES KONTEN
    slidesData.forEach((s: any, idx: number) => {
      onProgress?.(`Building slide ${idx+1}...`);
      const slide = pptx.addSlide();
      slide.background = { color: XBE.STYLE.BG_ACCENT };

      const title = Sanitizer.clean(s.title);
      const points = Sanitizer.cleanPoints(s.points);
      const layout = s.layout || 'SPLIT_VIEW';

      // Header Global
      const headDim = engine.getGridDim(0, 12);
      engine.addTextToCard(slide, title, headDim.x, 0.2, headDim.w, 0.6, {
        fontSize: 20, bold: true, color: colors.primary
      });

      if (layout === "SPLIT_VIEW" || idx % 2 === 0) {
        const left = engine.getGridDim(0, 6);
        const right = engine.getGridDim(6, 6);
        const half = Math.ceil(points.length / 2);
        
        engine.renderContentBlock(slide, "Overview", points.slice(0, half), left.x, 1.0, left.w, 4.1);
        engine.renderContentBlock(slide, "Key Points", points.slice(half), right.x, 1.0, right.w, 4.1, true);
      } else {
        const center = engine.getGridDim(1, 10);
        engine.renderContentBlock(slide, "Analysis", points, center.x, 1.0, center.w, 4.2);
      }

      // Footer
      slide.addText(`© XEENAPS • ${idx + 2}`, { 
        x: 8.5, y: 5.3, w: 1, fontSize: 8, color: '94A3B8', align: 'right'
      });
    });

    onProgress?.("Exporting and saving...");
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
    console.error("XBE v3.1 Error:", error);
    return null;
  }
};
