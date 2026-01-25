import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS BLUEPRINT ARCHITECT V14 (Elite-Design Update)
 * Fokus: Auto-Scaling Typography, Robust Parsing, Mandatory Code-Level Slides, Elite Glassmorphism.
 */

const CANVAS_W = 10;
const CANVAS_H = 5.625;

/**
 * Robust JSON Sanitizer V14 - Melawan karakter perusak parsing
 */
const sanitizeJsonResponse = (text: string): string => {
  let cleaned = text.trim();
  // Strip Markdown Blocks
  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.split('```')[1].split('```')[0].trim();
  }
  
  // Find valid JSON object bounds
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return cleaned;
  cleaned = cleaned.substring(start, end + 1);

  return cleaned
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Hapus karakter kontrol
    .replace(/\n/g, "\\n") 
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
};

/**
 * Auto-Scaling Typography V14
 * Menghitung ukuran font agar teks fit dalam area tertentu
 */
const getDynamicFontSize = (text: string, maxW: number, defaultSize: number = 32): number => {
  const length = text.length;
  if (length < 20) return defaultSize;
  if (length < 50) return Math.max(24, defaultSize - 8);
  if (length < 100) return Math.max(18, defaultSize - 14);
  return 14; // Font minimal untuk keamanan visual
};

/**
 * Smart Contrast Engine V2
 */
const getContrastColor = (hexColor: string): string => {
  const hex = (hexColor || 'FFFFFF').replace('#', '').slice(0, 6);
  const r = parseInt(hex.slice(0, 2), 16) || 255;
  const g = parseInt(hex.slice(2, 4), 16) || 255;
  const b = parseInt(hex.slice(4, 6), 16) || 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '1E293B' : 'FFFFFF'; // Gelap vs Putih-Gading
};

/**
 * Elite Design Executor V14 - Glassmorphism & Depth
 */
const executeBlueprintCommands = (slide: any, commands: any[], primaryColor: string, secondaryColor: string) => {
  if (!Array.isArray(commands)) return;
  
  commands.forEach(cmd => {
    try {
      const options: any = {
        x: Number(cmd.x) || 0,
        y: Number(cmd.y) || 0,
        w: Number(cmd.w) || 1,
        h: Number(cmd.h) || 1,
      };

      // 1. TEXT (Auto-Scaling & Context-Aware Contrast)
      if (cmd.type === 'text') {
        let textContent = (typeof cmd.text === 'object') ? (cmd.text.content || JSON.stringify(cmd.text)) : String(cmd.text || "");
        const bgFill = cmd.onBackground ? String(cmd.onBackground).replace('#', '') : null;
        let textColor = cmd.color ? String(cmd.color).replace('#', '') : primaryColor.replace('#', '');
        
        if (bgFill) textColor = getContrastColor(bgFill).replace('#', '');
        
        const baseSize = Number(cmd.fontSize) || 14;
        const finalSize = cmd.autoScale ? getDynamicFontSize(textContent, options.w, baseSize) : baseSize;

        slide.addText(textContent, {
          ...options,
          fontSize: finalSize,
          fontFace: 'Inter',
          color: textColor,
          bold: !!cmd.bold,
          align: cmd.align || 'left',
          valign: cmd.valign || 'top',
          wrap: true,
          autoFit: true,
          shadow: cmd.premium ? { type: 'outer', color: '333333', blur: 2, offset: 1, opacity: 0.1 } : undefined
        });
      } 
      
      // 2. SHAPES (Premium Rounded & Shadows)
      else if (cmd.type === 'shape') {
        slide.addShape(cmd.kind || 'rect', {
          ...options,
          fill: { 
            color: String(cmd.fill || primaryColor).replace('#', ''), 
            alpha: cmd.glass ? (Number(cmd.opacity) || 20) : (Number(cmd.opacity) || 100) 
          },
          line: { 
            color: String(cmd.lineColor || (cmd.glass ? 'FFFFFF' : secondaryColor)).replace('#', ''), 
            width: cmd.glass ? 0.5 : (Number(cmd.lineWidth) || 0) 
          },
          rectRadius: 0.4, // Ukuran ideal modern
          shadow: cmd.shadow !== false ? { type: 'outer', color: '000000', blur: 8, offset: 4, opacity: 0.15 } : undefined
        });
      }

      // 3. TABLES (Pro Normalization)
      else if (cmd.type === 'table') {
        let rows = cmd.rows;
        if (!Array.isArray(rows)) rows = [];
        const normalizedRows = rows.map(row => Array.isArray(row) ? row.map(String) : [String(row)]);

        slide.addTable(normalizedRows, {
          ...options,
          border: { pt: 0.5, color: secondaryColor.replace('#', '') },
          fill: { color: 'F8FAFC' },
          fontSize: 10,
          color: '1E293B',
          align: 'center',
          valign: 'middle'
        });
      }

      // 4. CHARTS (Elite Viz)
      else if (cmd.type === 'chart') {
        slide.addChart(cmd.chartType || 'bar', cmd.data || [], {
          ...options,
          showTitle: true,
          chartTitle: String(cmd.title || ""),
          chartTitleColor: primaryColor.replace('#', ''),
          chartTitleFontSize: 14,
          showLegend: true,
          legendPos: 'b'
        });
      }

      // 5. LINES
      else if (cmd.type === 'line') {
        slide.addShape('line', {
          ...options,
          line: { color: String(cmd.color || secondaryColor).replace('#', ''), width: 2 }
        });
      }
    } catch (e) {
      console.warn("V14 Ignored Element Error:", e);
    }
  });
};

export const createPresentationWorkflow = async (
  item: LibraryItem,
  config: {
    title: string;
    context: string;
    presenters: string[];
    theme: PresentationThemeConfig;
    slidesCount: number;
    language: string;
  },
  onProgress?: (stage: string) => void
): Promise<PresentationItem | null> => {
  try {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    // Fix: Maintain a local array of slides since pptx.slides is not consistently public across versions/typings
    const allSlides: any[] = [];
    
    const primaryColor = config.theme.primaryColor.replace('#', '');
    const secondaryColor = config.theme.secondaryColor.replace('#', '');
    
    // --- STEP 1: MANUALLY ADD COVER SLIDE ---
    onProgress?.("Designing Elite Cover...");
    const coverSlide = pptx.addSlide();
    allSlides.push(coverSlide);
    // Cover Background Shape
    coverSlide.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: primaryColor } });
    coverSlide.addShape('rect', { x: 0, y: 0, w: '40%', h: '100%', fill: { color: '000000', alpha: 10 } });
    
    // Auto-scaling title for cover
    const coverTitleSize = getDynamicFontSize(config.title, 8, 36);
    coverSlide.addText(config.title.toUpperCase(), {
      x: 0.8, y: 1.5, w: 8.5, h: 2,
      fontSize: coverTitleSize, fontFace: 'Inter', color: 'FFFFFF', bold: true, align: 'left', valign: 'bottom'
    });
    
    // Presenter Info
    coverSlide.addText(config.presenters.join(' • '), {
      x: 0.8, y: 3.6, w: 8, h: 0.5,
      fontSize: 14, fontFace: 'Inter', color: secondaryColor, bold: true, align: 'left'
    });
    
    // Accent Line
    coverSlide.addShape('line', { x: 0.8, y: 3.5, w: 2, h: 0, line: { color: secondaryColor, width: 3 } });

    // --- STEP 2: AI COMPOSITION FOR CONTENT SLIDES ---
    onProgress?.("AI Architect is composing deep content...");
    const contentSlidesCount = Math.max(2, config.slidesCount - 2);
    
    const blueprintPrompt = `ACT AS A SENIOR UI/UX DESIGNER.
    TASK: Compose ${contentSlidesCount} deep-insight slides for: "${config.title}"
    CONTENT: ${config.context.substring(0, 7000)}
    
    RULES:
    1. EXCLUDE Cover and Bibliography (Handled manually).
    2. Use "shape" with "glass": true for modern depth.
    3. Use "text" with "autoScale": true for titles.
    4. For text on #${primaryColor}, use "onBackground": "#${primaryColor}".
    5. DATA STABILITY: Use raw arrays for tables/charts.
    
    OUTPUT RAW JSON:
    { "slides": [{ "title": "string", "commands": [ { "type": "shape"|"text"|"table"|"chart"|"line", "x": number, "y": number, "w": number, "h": number, "autoScale": true, ... } ] }] }`;

    let aiResText = await callAiProxy('gemini', blueprintPrompt);
    if (!aiResText) throw new Error("AI Timeout.");

    const sanitizedJson = sanitizeJsonResponse(aiResText);
    let blueprint;
    try {
      blueprint = JSON.parse(sanitizedJson);
    } catch (e) {
      console.error("V14 JSON Parser Error. Activating Recovery.");
      blueprint = { slides: [{ title: "Analysis Summary", commands: [{ type: 'text', text: "Analysis performed via Xeenaps AI Engine.", x: 1, y: 1, w: 8, h: 2, fontSize: 18 }] }] };
    }

    // Render Content Slides
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Polishing Slide ${idx + 2}...`);
      const slide = pptx.addSlide();
      allSlides.push(slide);
      
      // Default Slide Layout (Title Header)
      slide.addText(sData.title || "Section Insight", {
        x: 0.5, y: 0.3, w: 9, h: 0.8,
        fontSize: 22, fontFace: 'Inter', color: primaryColor, bold: true, align: 'left'
      });
      slide.addShape('line', { x: 0.5, y: 0.9, w: 1, h: 0, line: { color: secondaryColor, width: 2 } });

      if (sData.commands) {
        executeBlueprintCommands(slide, sData.commands, primaryColor, secondaryColor);
      }
    });

    // --- STEP 3: MANUALLY ADD BIBLIOGRAPHY SLIDE ---
    onProgress?.("Generating Bibliography Slide...");
    const bibSlide = pptx.addSlide();
    allSlides.push(bibSlide);
    bibSlide.addText("REFERENCES", { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 24, fontFace: 'Inter', color: primaryColor, bold: true });
    bibSlide.addShape('line', { x: 0.5, y: 1, w: 9, h: 0, line: { color: 'E2E8F0', width: 1 } });
    
    const bibEntry = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}.`;
    bibSlide.addShape('rect', { x: 0.5, y: 1.5, w: 9, h: 2, fill: { color: 'F8FAFC' }, rectRadius: 0.2 });
    bibSlide.addText(bibEntry, {
      x: 0.8, y: 1.8, w: 8.4, h: 1.5,
      fontSize: 12, fontFace: 'Inter', color: '475569', italic: true, align: 'left'
    });

    // Final Branding & Page Numbers
    // Fix: Use the local allSlides array for iteration
    allSlides.forEach((slide, i) => {
      if (i > 0) { // Footer for all except cover
        slide.addText(`XEENAPS • PKM ARCHITECT`, { x: 0.5, y: 5.35, w: 3, h: 0.2, fontSize: 7, fontFace: 'Inter', color: '94A3B8', bold: true });
        slide.addText(`${i + 1}`, { x: 9, y: 5.35, w: 0.5, h: 0.2, fontSize: 7, fontFace: 'Inter', color: '94A3B8', bold: true, align: 'right' });
      }
    });

    onProgress?.("Finalizing Elite Archive...");
    const base64Pptx = await pptx.write({ outputType: 'base64' }) as string;

    const presentationData: Partial<PresentationItem> = {
      id: crypto.randomUUID(),
      collectionIds: [item.id],
      title: config.title,
      presenters: config.presenters,
      templateName: PresentationTemplate.MODERN,
      themeConfig: {
        primaryColor: `#${primaryColor}`,
        secondaryColor: `#${secondaryColor}`,
        fontFamily: 'Inter',
        headingFont: 'Inter'
      },
      // Fix: Use allSlides.length for accurate count
      slidesCount: allSlides.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'savePresentation', presentation: presentationData, pptxFileData: base64Pptx })
    });

    const result = await res.json();
    if (result.status === 'success') return result.data;
    throw new Error(result.message || "Archive error.");

  } catch (error: any) {
    console.error("V14 Elite Architect Error:", error);
    return null;
  }
};

export const fetchRelatedPresentations = async (collectionId: string): Promise<PresentationItem[]> => {
  try {
    const res = await fetch(`${GAS_WEB_APP_URL}?action=getRelatedPresentations&collectionId=${collectionId}`);
    const result = await res.json();
    return result.status === 'success' ? result.data : [];
  } catch (error) {
    return [];
  }
}; 