
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS BLUEPRINT ARCHITECT V16 (Architectural Precision)
 * Fokus: Anti-Vertical Text, Adaptive Headers, Width-Aware Typography.
 */

/**
 * Super Sanitizer V15 - Menghapus semua karakter perusak JSON
 */
const sanitizeJsonResponse = (text: string): string => {
  if (!text) return "";
  let cleaned = text.trim();
  
  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.split('```')[1].split('```')[0].trim();
  }
  
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }

  return cleaned
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") 
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ");
};

/**
 * Smart Contrast Engine V2 (YIQ Logic)
 */
const getContrastColor = (hexColor: string): string => {
  const hex = (hexColor || 'FFFFFF').replace('#', '').slice(0, 6);
  const r = parseInt(hex.slice(0, 2), 16) || 255;
  const g = parseInt(hex.slice(2, 4), 16) || 255;
  const b = parseInt(hex.slice(4, 6), 16) || 255;
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? '004A74' : 'FFFFFF'; 
};

/**
 * Width-Aware Typography V16
 * Menghitung ukuran font berdasarkan panjang teks DAN lebar box.
 */
const getDynamicFontSize = (text: string, maxWidthInches: number, baseSize: number = 32): number => {
  const length = text.length;
  // Rasio presisi V16: ~4.5 karakter per inci pada font 32pt
  const charCapacity = maxWidthInches * (32 / baseSize) * 4.5;
  
  if (length <= charCapacity) return baseSize;
  const scaleFactor = charCapacity / length;
  let dynamicSize = Math.floor(baseSize * scaleFactor);
  
  // Jika teks sangat panjang (melebihi 2x kapasitas), perkecil lebih drastis
  if (length > charCapacity * 2) dynamicSize = Math.floor(dynamicSize * 0.9);
  
  return Math.max(14, dynamicSize); 
};

/**
 * Elite Design Executor V16
 * Implementasi Precision Layout Guard
 */
const executeBlueprintCommands = (slide: any, commands: any[], primaryColor: string, secondaryColor: string) => {
  if (!Array.isArray(commands)) return;
  
  commands.forEach(cmd => {
    try {
      // V16 PRECISION GUARD: Minimal Width & Margin Enforcement
      const options: any = {
        x: Math.max(Number(cmd.x) || 0.8, 0.8), // Minimum margin kiri 0.8"
        y: Math.max(Number(cmd.y) || 1.2, 1.2), // Hindari area header
        w: Math.max(Number(cmd.w) || 3.5, 3.5), // Minimal lebar 3.5" untuk cegah teks vertikal
        h: Number(cmd.h) || 1,
      };

      if (cmd.type === 'text') {
        const textContent = String(cmd.text || "");
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
          autoFit: true
        });
      } else if (cmd.type === 'shape') {
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
          rectRadius: 0.4,
          shadow: { type: 'outer', color: '000000', blur: 8, offset: 4, opacity: 0.15 }
        });
      } else if (cmd.type === 'table') {
        slide.addTable(cmd.rows || [], {
          ...options,
          border: { pt: 0.5, color: secondaryColor.replace('#', '') },
          fill: { color: 'F8FAFC' },
          fontSize: 10,
          color: '004A74'
        });
      } else if (cmd.type === 'chart') {
        slide.addChart(cmd.chartType || 'bar', cmd.data || [], {
          ...options,
          showTitle: true,
          chartTitle: String(cmd.title || ""),
          chartTitleColor: primaryColor.replace('#', '')
        });
      } else if (cmd.type === 'line') {
        slide.addShape('line', { ...options, line: { color: String(cmd.color || secondaryColor).replace('#', ''), width: 2 } });
      }
    } catch (e) {
      console.warn("V16 Render Warning:", e);
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
    const allSlides: any[] = [];
    
    const primaryColor = config.theme.primaryColor.replace('#', '');
    const secondaryColor = config.theme.secondaryColor.replace('#', '');
    
    // 1. MANDATORY COVER (PROCEDURAL)
    onProgress?.("Architecting Elite Cover...");
    const cover = pptx.addSlide();
    allSlides.push(cover);
    cover.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: primaryColor } });
    cover.addShape('rect', { x: 0, y: 0, w: '45%', h: '100%', fill: { color: '000000', alpha: 15 } });
    
    const coverTitleSize = getDynamicFontSize(config.title, 8.5, 36);
    cover.addText(config.title.toUpperCase(), {
      x: 0.8, y: 1.5, w: 8.4, h: 2,
      fontSize: coverTitleSize, fontFace: 'Inter', color: 'FFFFFF', bold: true, align: 'left', valign: 'bottom'
    });
    cover.addShape('line', { x: 0.8, y: 3.6, w: 2.5, h: 0, line: { color: secondaryColor, width: 4 } });
    cover.addText(config.presenters.join(' • '), {
      x: 0.8, y: 3.8, w: 8, h: 0.5,
      fontSize: 14, fontFace: 'Inter', color: secondaryColor, bold: true, align: 'left'
    });

    // 2. AI COMPOSITION (STRICT PROMPT V16)
    onProgress?.("AI Librarian is synthesizing content...");
    const contentCount = Math.max(3, config.slidesCount - 2);
    const prompt = `ACT AS A SENIOR DESIGNER.
    Generate ${contentCount} slides for: "${config.title}"
    Brand: Primary #${primaryColor}, Accent #${secondaryColor}
    Content: ${config.context.substring(0, 7000)}
    
    STRICT RULES:
    - NO Cover/Bibliography slides.
    - DILARANG meletakkan elemen di x < 0.8 atau y < 1.2.
    - SETIAP "text" box WAJIB memiliki "w" minimal 3.5.
    - USE JSON ONLY. NO MARKDOWN. NO PRE-TEXT.
    - ESCAPE all double quotes in text.
    - For titles, set "autoScale": true.
    
    FORMAT:
    { "slides": [{ "title": "...", "commands": [{ "type": "text"|"shape"|"table"|"chart", "x":0, "y":0, "w":3.5, "h":1, ... }] }] }`;

    let aiRes = await callAiProxy('gemini', prompt);
    const cleanJson = sanitizeJsonResponse(aiRes);
    
    let blueprint;
    try {
      blueprint = JSON.parse(cleanJson);
    } catch (e) {
      console.error("V16 Parsing Failed. Activating Multi-Slide Recovery.");
      blueprint = { 
        slides: [
          { title: "Executive Summary", commands: [{ type: 'text', text: "Analysis performed via Xeenaps V16 Engine. Summary content unavailable due to structure mismatch.", x: 1, y: 1.5, w: 8, h: 3, fontSize: 16 }] }
        ] 
      };
    }

    // Render Content Slides
    blueprint.slides.forEach((s: any, i: number) => {
      onProgress?.(`Polishing Slide ${i + 2}...`);
      const slide = pptx.addSlide();
      allSlides.push(slide);
      
      // Header Adaptive V16 (Dinamis Berdasarkan Judul)
      const titleSize = getDynamicFontSize(s.title || "Section Insight", 8.5, 22);
      slide.addText(s.title || "Section Insight", { 
        x: 0.8, y: 0.3, w: 8.5, h: 1, 
        fontSize: titleSize, fontFace: 'Inter', color: primaryColor, bold: true, 
        valign: 'top', align: 'left' 
      });
      
      // Floating Line: Turun jika judul panjang (berpotensi 2 baris)
      const lineY = (s.title && s.title.length > 45) ? 1.3 : 1.0;
      slide.addShape('line', { x: 0.8, y: lineY, w: 1.5, h: 0, line: { color: secondaryColor, width: 3 } });

      if (s.commands) executeBlueprintCommands(slide, s.commands, primaryColor, secondaryColor);
    });

    // 3. MANDATORY BIBLIOGRAPHY (PROCEDURAL)
    onProgress?.("Adding Bibliography Archive...");
    const bibSlide = pptx.addSlide();
    allSlides.push(bibSlide);
    bibSlide.addText("REFERENCES & CITATIONS", { x: 0.8, y: 0.5, w: 8.5, h: 0.6, fontSize: 24, fontFace: 'Inter', color: primaryColor, bold: true });
    bibSlide.addShape('line', { x: 0.8, y: 1.1, w: 8.5, h: 0, line: { color: 'E2E8F0', width: 1 } });
    
    const bibText = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}.`;
    bibSlide.addShape('rect', { x: 0.8, y: 1.6, w: 8.4, h: 2, fill: { color: 'F8FAFC' }, rectRadius: 0.3, shadow: { type: 'outer', blur: 4, offset: 2, opacity: 0.1 } });
    bibSlide.addText(bibText, { x: 1.1, y: 1.9, w: 7.8, h: 1.5, fontSize: 13, fontFace: 'Inter', color: '475569', italic: true });

    // Page Branding
    allSlides.forEach((s, i) => {
      if (i > 0) {
        s.addText(`XEENAPS • PKM ARCHITECT`, { x: 0.8, y: 5.35, w: 3, h: 0.2, fontSize: 7, fontFace: 'Inter', color: '94A3B8', bold: true });
        s.addText(`${i + 1}`, { x: 9.2, y: 5.35, w: 0.3, h: 0.2, fontSize: 7, fontFace: 'Inter', color: '94A3B8', bold: true, align: 'right' });
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
      themeConfig: { primaryColor: `#${primaryColor}`, secondaryColor: `#${secondaryColor}`, fontFamily: 'Inter', headingFont: 'Inter' },
      slidesCount: allSlides.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = await fetch(GAS_WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'savePresentation', presentation: presentationData, pptxFileData: base64Pptx }) });
    const result = await res.json();
    if (result.status === 'success') return result.data;
    throw new Error(result.message || "Save error.");

  } catch (error: any) {
    console.error("V16 Elite Error:", error);
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
