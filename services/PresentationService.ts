import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * XBE Engine v3.0 - "The Gamma Aesthetic"
 * Fokus pada: Elegan, Luas, dan Modern.
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
    RADIUS: 0.35,      // Sudut lebih membulat ala Gamma
    CARD_PADDING: 0.5, // Padding dalam kotak lebih luas
    BORDER_W: 1,       // Border tipis sebagai pengganti shadow berat
    BORDER_COLOR: 'F1F5F9', // Abu-abu sangat muda (Slate 100)
    BG_ACCENT: 'F8FAFC',    // Background slide off-white
  },
  TYPE: {
    FONT_HEADING: 'Inter Bold',
    FONT_BODY: 'Inter',
    H1_SIZE: 28,      
    H2_SIZE: 20,
    BODY_SIZE: 11,
    LINE_HEIGHT: 1.3,  // Vertical rhythm lebih lega
  }
};

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
   * Render kartu dengan border lembut, bukan shadow hitam.
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
   */
  addTextToCard(slide: pptxgen.Slide, text: any, x: number, y: number, w: number, h: number, opts: any = {}) {
    const padding = XBE.STYLE.CARD_PADDING;
    slide.addText(text, {
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
      bullet: opts.bullet || null,
      breakLine: true,
      ...opts
    });
  }
}

export const createPresentationWorkflow = async (
  item: LibraryItem,
  config: { title: string; context: string; presenters: string[]; template: PresentationTemplate; theme: PresentationThemeConfig; slidesCount: number; language: string; },
  onProgress?: (stage: string) => void
): Promise<PresentationItem | null> => {
  try {
    onProgress?.("Architecting Gamma-style layouts...");

    // PROMPT AI: Fokus pada kepadatan konten yang seimbang
    const systemPrompt = `ACT AS A SENIOR UI/UX DESIGNER.
    Create a ${config.slidesCount}-slide presentation in ${config.language}.
    Title: ${config.title}
    Abstract: ${item.abstract || item.title} [cite: 4, 5]
    
    RULES:
    1. Maximum 5 bullet points per slide.
    2. Use Layouts: "FEATURE_SPLIT" (70/30), "THREE_COL", "CENTER_MINIMAL".
    3. Keep sentences punchy and professional. [cite: 27]
    4. Output JSON only: { "slides": [{ "title": "", "points": [""], "layout": "" }] }`;

    const aiRes = await callAiProxy('groq', systemPrompt);
    const blueprint = JSON.parse(aiRes.substring(aiRes.indexOf('{'), aiRes.lastIndexOf('}') + 1));
    const slidesData = blueprint.slides || [];

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    
    const colors = {
      primary: config.theme.primaryColor?.replace('#', '') || '0F172A', // Navy Slate
      text: { primary: '1E293B', secondary: '64748B' }
    };

    const engine = new XBEEngine(pptx, colors);

    slidesData.forEach((s: any, idx: number) => {
      const slide = pptx.addSlide();
      // Set Slide Background ke Off-White agar kartu putih terlihat kontras
      slide.background = { color: XBE.STYLE.BG_ACCENT };

      const points = s.points || [];
      const layout = s.layout;

      // --- RENDER LOGIC: ASYMMETRIC ---
      if (idx === 0) {
        // COVER: Full Primary Card
        engine.addModernCard(slide, 0.4, 0.4, 9.2, 4.8, true);
        engine.addTextToCard(slide, s.title.toUpperCase(), 0.4, 0.4, 9.2, 3.5, { 
          fontSize: 32, color: 'FFFFFF', bold: true, align: 'center', valign: 'middle' 
        });
      } 
      else if (layout === "FEATURE_SPLIT" || idx % 2 === 0) {
        // 70/30 Layout (Main Content / Highlight)
        const main = engine.getGridDim(0, 8);
        const side = engine.getGridDim(8, 4);

        // Main Card
        engine.addModernCard(slide, main.x, 1.0, main.w, 4.2);
        engine.addTextToCard(slide, s.title, main.x, 1.0, main.w, 0.8, { fontSize: 20, bold: true, color: colors.primary });
        engine.addTextToCard(slide, points.map((p:string) => ({ text: p, options: { bullet: true } })), main.x, 1.6, main.w, 3.4);

        // Side Highlight (Colored)
        engine.addModernCard(slide, side.x, 1.0, side.w, 4.2, true);
        engine.addTextToCard(slide, "KEY INSIGHT", side.x, 1.0, side.w, 3.0, { color: 'FFFFFF', bold: true, fontSize: 14, align: 'center' });
      }
      else {
        // Center Minimalist
        const center = engine.getGridDim(2, 8);
        engine.addModernCard(slide, center.x, 0.8, center.w, 4.4);
        engine.addTextToCard(slide, s.title, center.x, 0.8, center.w, 0.8, { fontSize: 22, bold: true, align: 'center' });
        engine.addTextToCard(slide, points.map((p:string) => ({ text: p, options: { bullet: true } })), center.x, 1.6, center.w, 3.6);
      }

      // Minimalist Footer
      slide.addText(`© ${new Date().getFullYear()} • ${config.title.substring(0, 30)}...`, { 
        x: 0.5, y: 5.3, w: 5, fontSize: 8, color: '94A3B8' 
      });
    });

    const base64 = await pptx.write({ outputType: 'base64' }) as string;
    // ... rest of the saving logic
    return null; // Update as per original return

  } catch (error) {
    console.error("XBE v3 Error:", error);
    return null;
  }
};