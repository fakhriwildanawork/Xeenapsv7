import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * XEENAPS BLOCK ENGINE (XBE) - Version "THE MASTERPIECE"
 * Style: Bold, Asymmetric, Modern Minimalist, High Impact.
 */
const XBE = {
  LAYOUT: {
    WIDTH: 10,
    HEIGHT: 5.625,
  },
  // Palette ini terinspirasi dari desain SaaS modern (Linear, Vercel, Stripe)
  THEME: {
    // Gunakan Dark Mode untuk kesan "Pro", atau Light Mode yang bold
    MODE: 'LIGHT', 
    BG: 'FFFFFF',
    TEXT_MAIN: '111827',
    TEXT_MUTED: '6B7280',
    ACCENT: '4F46E5', // Indigo 600 - Very professional & modern
    ACCENT_LIGHT: 'EEF2FF',
    SURFACE: 'F3F4F6'
  },
  STYLE: {
    RADIUS: 0.15, // Sudut sedikit melengkung tapi tetap tegas
    SHADOW: { color: '000000', transparency: 90, blur: 10 }, // Soft far shadow
    BORDER: { color: 'E5E7EB', width: 1 }
  },
  TYPO: {
    FONT: 'Inter', // Pastikan font ini clean
    H1: 40,
    H2: 28,
    BODY: 14,
    LINE: 1.4
  }
};

class XBEEngine {
  constructor(private pptx: pptxgen, private mode: 'LIGHT' | 'DARK') {
    // Set theme based on mode
    if (mode === 'DARK') {
      XBE.THEME.BG = '0F172A'; // Slate 900
      XBE.THEME.TEXT_MAIN = 'F8FAFC';
      XBE.THEME.TEXT_MUTED = '94A3B8';
      XBE.THEME.ACCENT = '818CF8'; // Indigo 400
      XBE.THEME.ACCENT_LIGHT = '1E293B';
      XBE.THEME.SURFACE = '1E293B';
    }
  }

  /**
   * Adds a full bleed background
   */
  setBackground(slide: pptxgen.Slide) {
    slide.background = { color: XBE.THEME.BG };
  }

  /**
   * Adds a "Smart Card": Border tipis, background halus, shadow jauh (far shadow)
   */
  addModernCard(slide: pptxgen.Slide, x: number, y: number, w: number, h: number, accent = false) {
    // 1. The subtle far shadow (makes it float)
    slide.addShape(this.pptx.ShapeType.rect, {
      x: x + 0.05, y: y + 0.05, w, h,
      fill: { color: XBE.THEME.TEXT_MAIN, transparency: 95 }, // 5% opacity
      line: { width: 0 }, rectRadius: XBE.STYLE.RADIUS
    });

    // 2. The Card Body
    slide.addShape(this.pptx.ShapeType.rect, {
      x, y, w, h,
      fill: { color: accent ? XBE.THEME.ACCENT : (this.mode === 'DARK' ? XBE.THEME.SURFACE : 'FFFFFF') },
      line: { 
        color: this.mode === 'DARK' ? '334155' : XBE.STYLE.BORDER.color, 
        width: XBE.STYLE.BORDER.width 
      },
      rectRadius: XBE.STYLE.RADIUS
    });
  }

  /**
   * Typography Wrapper
   */
  addText(slide: pptxgen.Slide, text: string | any[], opts: any) {
    const defaults = {
      fontFace: XBE.TYPO.FONT,
      align: 'left',
      valign: 'top',
      lineSpacing: XBE.TYPO.LINE * 100,
      ...opts
    };
    slide.addText(text, defaults);
  }

  /**
   * Decorative Element: Abstract Shape/Line to break monotony
   */
  addAccentLine(slide: pptxgen.Slide, x: number, y: number, w: number) {
    slide.addShape(this.pptx.ShapeType.rect, {
      x, y, w: w, h: 0.08,
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
 * MAIN WORKFLOW
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
    onProgress?.("Designing High-Impact Presentation...");
    
    // AI Prompting untuk konten yang singkat, padat, dan "punchy"
    const systemPrompt = `ACT AS A CREATIVE DIRECTOR.
    CREATE A ${config.slidesCount}-SLIDE PRESENTATION FOR: "${config.title}".
    
    STYLE RULES:
    1. Be Punchy. Use short, powerful sentences.
    2. Group content into max 4 strong points per slide.
    3. Focus on impact, not just listing information.
    
    OUTPUT JSON ONLY: { "slides": [ { "title": "Short Title", "points": ["Impactful point 1", "Impactful point 2"] } ] }`;

    const aiRes = await callAiProxy('groq', systemPrompt);
    if (!aiRes) throw new Error("AI Refusal");
    
    const jsonMatch = aiRes.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON");
    const blueprint = JSON.parse(jsonMatch[0]);
    const slidesData = blueprint.slides || [];

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    
    // Mode selection: Let's use LIGHT for clarity, but styled like Dark Mode aesthetics (high contrast)
    const engine = new XBEEngine(pptx, 'LIGHT'); 

    // --- SLIDE 1: BOLD TYPOGRAPHY HERO ---
    const cover = pptx.addSlide();
    engine.setBackground(cover);

    // Decorative Background Shape (Top Right)
    cover.addShape(pptx.ShapeType.ellipse, {
      x: 6, y: -1, w: 6, h: 6,
      fill: { color: XBE.THEME.ACCENT_LIGHT, transparency: 50 },
      line: { width: 0 }
    });

    // Main Title (Massive)
    const cleanTitle = Sanitizer.clean(config.title).toUpperCase();
    engine.addText(cover, cleanTitle, {
      x: 0.8, y: 2.0, w: 8, h: 2,
      fontSize: 44, bold: true, color: XBE.THEME.TEXT_MAIN,
      align: 'left'
    });

    // Subtitle / Presenter (Small, tracked out)
    engine.addText(cover, `PRESENTED BY ${config.presenters.join(' & ')}`, {
      x: 0.8, y: 3.2, w: 5, h: 0.5,
      fontSize: 11, color: XBE.THEME.TEXT_MUTED, 
      letterSpacing: 3, uppercase: true
    });
    
    // Bottom Accent Line
    engine.addAccentLine(cover, 0.8, 4.5, 2);


    // --- CONTENT SLIDES: ASYMMETRIC DYNAMICS ---
    slidesData.forEach((s: any, idx: number) => {
      onProgress?.(`Architecting slide ${idx+1}...`);
      const slide = pptx.addSlide();
      engine.setBackground(slide);
      
      const title = Sanitizer.clean(s.title);
      const points = (s.points || []).map(Sanitizer.clean);

      // 1. The "Off-Grid" Header
      // Judul ditaruh sedikit ke kiri, tebal, warna utama
      engine.addText(slide, title, {
        x: 0.8, y: 0.6, w: 6, h: 0.8,
        fontSize: 26, bold: true, color: XBE.THEME.TEXT_MAIN
      });

      // 2. Layout Variations based on Index (to create rhythm)
      const layoutType = idx % 3; 

      if (layoutType === 0) {
        // STYLE A: FLOATING CARD (Content in a centered card, loose)
        const cardW = 7.5;
        const cardH = 3.5;
        const cardX = (10 - cardW) / 2; // Centered X
        const cardY = 1.3;

        engine.addModernCard(slide, cardX, cardY, cardW, cardH, false);

        // Modern Bullets inside Card
        const bulletText = points.map((p, i) => ({
          text: p,
          options: { 
            breakLine: true, 
            fontSize: 14, color: XBE.THEME.TEXT_MAIN,
            bullet: { type: 'number', color: XBE.THEME.ACCENT }
          }
        }));

        engine.addText(slide, bulletText, {
          x: cardX + 0.4, y: cardY + 0.4, w: cardW - 0.8, h: cardH - 0.8
        });
      } 
      else if (layoutType === 1) {
        // STYLE B: SPLIT ASYMMETRIC (Left Accent, Right Content)
        // Left Color Block
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.8, y: 1.3, w: 0.15, h: 3.5,
          fill: { color: XBE.THEME.ACCENT }, line: {width:0}
        });

        // Right Content Card (Floating next to the line)
        engine.addModernCard(slide, 1.2, 1.3, 8, 3.5, false);

        const bulletText = points.map(p => ({
          text: p,
          options: { breakLine: true, fontSize: 14, color: XBE.THEME.TEXT_MAIN, bullet: true }
        }));

        engine.addText(slide, bulletText, {
          x: 1.6, y: 1.7, w: 7.2, h: 3.1
        });
      } 
      else {
        // STYLE C: TWO COLUMN GRID (Balanced but modern)
        const colW = 4;
        const gap = 0.3;
        const startY = 1.3;
        
        // Column 1
        engine.addModernCard(slide, 0.8, startY, colW, 3.5, true); // Accent Color Card
        engine.addText(slide, points.slice(0, Math.ceil(points.length/2)).map(p => ({ text: p, options: { breakLine: true, fontSize: 13, color: 'FFFFFF', bullet: true } })), {
          x: 1.0, y: startY + 0.3, w: colW - 0.4, h: 3.0
        });

        // Column 2
        engine.addModernCard(slide, 0.8 + colW + gap, startY, colW, 3.5, false);
        engine.addText(slide, points.slice(Math.ceil(points.length/2)).map(p => ({ text: p, options: { breakLine: true, fontSize: 14, color: XBE.THEME.TEXT_MAIN, bullet: true } })), {
          x: 0.8 + colW + gap + 0.3, y: startY + 0.3, w: colW - 0.4, h: 3.0
        });
      }

      // 3. Slide Number (Minimalist bottom right)
      engine.addText(slide, `0${idx + 2}`, {
        x: 9.2, y: 5.3, w: 0.5, h: 0.2,
        fontSize: 9, color: XBE.THEME.TEXT_MUTED, align: 'right'
      });
    });

    onProgress?.("Rendering final masterpiece...");
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
    console.error("Masterpiece Engine Error:", error);
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