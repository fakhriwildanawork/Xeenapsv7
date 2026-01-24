import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * XEENAPS BLOCK ENGINE (XBE) - Version "THE MASTERPIECE"
 * Focused on SaaS-modern editorial design (Linear/Vercel/Stripe aesthetics).
 * This engine uses mathematical ratios and "Smart Cards" to ensure professional output.
 */
const XBE = {
  LAYOUT: {
    WIDTH: 10,
    HEIGHT: 5.625,
    MARGIN: 0.5,
    GRID_COLS: 12,
  },
  THEME: {
    BG: 'FFFFFF',
    TEXT_MAIN: '111827', // Slate 900
    TEXT_MUTED: '6B7280', // Slate 500
    ACCENT: '4F46E5', // Indigo 600 - High-end professional
    ACCENT_LIGHT: 'EEF2FF', // Indigo 50
    SURFACE: 'F9FAFB', // Gray 50
    BORDER: 'E5E7EB', // Gray 200
  },
  STYLE: {
    RADIUS: 0.2, // Slightly rounded for modern professional look
    CARD_PADDING: 0.4,
  },
  TYPO: {
    FONT_HEAD: 'Helvetica', // Cleanest fallbacks
    FONT_BODY: 'Inter',
    H1: 42,
    H2: 28,
    CARD_TITLE: 18,
    BODY: 12,
    LINE_HEIGHT: 1.4,
  }
};

class XBEEngine {
  constructor(private pptx: pptxgen) {}

  /**
   * Background initialization
   */
  initSlide(slide: pptxgen.Slide) {
    slide.background = { color: XBE.THEME.BG };
  }

  /**
   * Helper to calculate grid-based width and x position
   */
  getGridX(col: number): number {
    const safeW = XBE.LAYOUT.WIDTH - (XBE.LAYOUT.MARGIN * 2);
    return XBE.LAYOUT.MARGIN + ((safeW / XBE.LAYOUT.GRID_COLS) * col);
  }

  getGridW(cols: number): number {
    const safeW = XBE.LAYOUT.WIDTH - (XBE.LAYOUT.MARGIN * 2);
    return (safeW / XBE.LAYOUT.GRID_COLS) * cols;
  }

  /**
   * Render a "Smart Card": A floating surface with a subtle border.
   */
  addSmartCard(slide: pptxgen.Slide, x: number, y: number, w: number, h: number, isAccent = false) {
    // 1. Subtle "Floating" Layer (Fake Shadow)
    slide.addShape(this.pptx.ShapeType.rect, {
      x: x + 0.04, y: y + 0.04, w, h,
      fill: { color: '000000', transparency: 94 },
      line: { width: 0 },
      rectRadius: XBE.STYLE.RADIUS
    });

    // 2. Main Card Body
    slide.addShape(this.pptx.ShapeType.rect, {
      x, y, w, h,
      fill: { color: isAccent ? XBE.THEME.ACCENT : 'FFFFFF' },
      line: { color: isAccent ? XBE.THEME.ACCENT : XBE.THEME.BORDER, width: 1 },
      rectRadius: XBE.STYLE.RADIUS
    });
  }

  /**
   * Typography wrapper with integrated auto-shrink and line spacing
   */
  writeText(slide: pptxgen.Slide, text: string | any[], opts: any) {
    const defaults = {
      fontFace: opts.bold ? XBE.TYPO.FONT_HEAD : XBE.TYPO.FONT_BODY,
      color: XBE.THEME.TEXT_MAIN,
      fontSize: XBE.TYPO.BODY,
      lineSpacing: XBE.TYPO.LINE_HEIGHT * 100,
      align: 'left',
      valign: 'top',
      shrinkText: true,
      ...opts
    };
    slide.addText(text, defaults);
  }

  /**
   * Visual Accent Line
   */
  addAccentLine(slide: pptxgen.Slide, x: number, y: number, w: number) {
    slide.addShape(this.pptx.ShapeType.rect, {
      x, y, w, h: 0.06,
      fill: { color: XBE.THEME.ACCENT },
      line: { width: 0 }
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
 * CORE WORKFLOW
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
    onProgress?.("Architecting Editorial Layouts...");

    const systemPrompt = `ACT AS A CREATIVE DIRECTOR FOR A LUXURY TECH BRAND.
    Create an impactful ${config.slidesCount}-slide presentation in ${config.language}.
    
    SOURCE:
    Title: ${config.title}
    Abstract: ${item.abstract || item.title}
    
    MANDATORY RULES:
    1. Language: ${config.language}.
    2. Slide Layouts: Mix of "HERO_SPLIT", "CARD_GRID", "BIG_STATEMENT", "FEATURE_FOCUS".
    3. Content: Be punchy. Max 4 points per slide. No filler text.
    4. Return valid JSON only.
    
    JSON SCHEMA: { "slides": [{ "title": "", "points": [""], "layout": "" }] }`;

    const aiRes = await callAiProxy('groq', systemPrompt);
    if (!aiRes) throw new Error("AI Refusal");

    const jsonMatch = aiRes.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI Response");
    const blueprint = JSON.parse(jsonMatch[0]);
    const slidesData = blueprint.slides || [];

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    
    const engine = new XBEEngine(pptx);

    // --- SLIDE 1: COVER (MODERN TYPOGRAPHY HERO) ---
    const cover = pptx.addSlide();
    engine.initSlide(cover);
    
    // Abstract Pattern (Circle in corner)
    cover.addShape(pptx.ShapeType.ellipse, {
      x: 6.5, y: -1, w: 5, h: 5,
      fill: { color: XBE.THEME.ACCENT_LIGHT, transparency: 40 },
      line: { width: 0 }
    });

    const cleanTitle = Sanitizer.clean(config.title).toUpperCase();
    engine.writeText(cover, cleanTitle, {
      x: engine.getGridX(0), y: 1.8, w: engine.getGridW(8), h: 2,
      fontSize: cleanTitle.length > 50 ? 32 : 40,
      bold: true, color: XBE.THEME.TEXT_MAIN
    });

    engine.addAccentLine(cover, engine.getGridX(0), 1.6, 1.5);

    engine.writeText(cover, config.presenters.join(' • ').toUpperCase(), {
      x: engine.getGridX(0), y: 3.8, w: 5, h: 0.5,
      fontSize: 10, color: XBE.THEME.TEXT_MUTED, bold: true, letterSpacing: 2
    });

    // --- CONTENT SLIDES: RHYTHMIC VARIETY ---
    slidesData.forEach((s: any, idx: number) => {
      onProgress?.(`Building slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      engine.initSlide(slide);

      const title = Sanitizer.clean(s.title);
      const points = (s.points || []).map(Sanitizer.clean);
      const layout = s.layout || 'FEATURE_FOCUS';

      // Global Header (Always clean and consistent)
      engine.writeText(slide, title, {
        x: engine.getGridX(0), y: 0.4, w: engine.getGridW(10), h: 0.6,
        fontSize: XBE.TYPO.H2, bold: true, color: XBE.THEME.TEXT_MAIN
      });

      if (layout === 'CARD_GRID' || idx % 3 === 0) {
        // ASYMMETRIC GRID
        const cardX = engine.getGridX(0);
        const cardW = engine.getGridW(7);
        const cardH = 3.6;
        
        engine.addSmartCard(slide, cardX, 1.2, cardW, cardH);
        
        const bulletData = points.map(p => ({
          text: p,
          options: { bullet: true, color: XBE.THEME.TEXT_MAIN, fontSize: 13, breakLine: true }
        }));
        
        engine.writeText(slide, bulletData, {
          x: cardX + XBE.STYLE.CARD_PADDING, 
          y: 1.2 + XBE.STYLE.CARD_PADDING, 
          w: cardW - (XBE.STYLE.CARD_PADDING * 2), 
          h: cardH - (XBE.STYLE.CARD_PADDING * 2)
        });

        // Small Accent Card on Right
        const sideX = engine.getGridX(8);
        const sideW = engine.getGridW(4);
        engine.addSmartCard(slide, sideX, 1.2, sideW, cardH, true);
        engine.writeText(slide, "KEY\nTAKEAWAY", {
          x: sideX, y: 1.5, w: sideW, align: 'center', bold: true, color: 'FFFFFF', fontSize: 14
        });
      } 
      else if (layout === 'BIG_STATEMENT' || idx % 3 === 1) {
        // CLEAN CENTERED FOCUS
        const mainW = engine.getGridW(10);
        const centerX = (XBE.LAYOUT.WIDTH - mainW) / 2;
        
        engine.addSmartCard(slide, centerX, 1.2, mainW, 3.6);
        engine.addAccentLine(slide, centerX + 0.5, 1.6, 1);

        const bulletData = points.map(p => ({
          text: p,
          options: { bullet: { type: 'number', color: XBE.THEME.ACCENT }, color: XBE.THEME.TEXT_MAIN, fontSize: 14, breakLine: true }
        }));

        engine.writeText(slide, bulletData, {
          x: centerX + 0.5, y: 1.9, w: mainW - 1, h: 2.8, align: 'left', valign: 'middle'
        });
      }
      else {
        // SPLIT VIEW
        const leftW = engine.getGridW(5.5);
        const rightW = engine.getGridW(5.5);
        const leftX = engine.getGridX(0);
        const rightX = engine.getGridX(6.5);
        
        engine.addSmartCard(slide, leftX, 1.2, leftW, 3.6);
        engine.addSmartCard(slide, rightX, 1.2, rightW, 3.6);

        const half = Math.ceil(points.length / 2);
        
        engine.writeText(slide, points.slice(0, half).map(p => ({ text: p, options: { bullet: true, breakLine: true } })), {
          x: leftX + 0.4, y: 1.5, w: leftW - 0.8, h: 3, fontSize: 12
        });
        
        engine.writeText(slide, points.slice(half).map(p => ({ text: p, options: { bullet: true, breakLine: true } })), {
          x: rightX + 0.4, y: 1.5, w: rightW - 0.8, h: 3, fontSize: 12
        });
      }

      // Minimalist Footer
      engine.writeText(slide, `© XEENAPS PKM • ${idx + 2}`, {
        x: 8.5, y: 5.3, w: 1, fontSize: 8, color: XBE.THEME.TEXT_MUTED, align: 'right', bold: true
      });
    });

    onProgress?.("Exporting for Google Slides...");
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
    console.error("XBE Masterpiece Error:", error);
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
