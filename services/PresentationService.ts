
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS BLUEPRINT ARCHITECT V17 (Mastering Layout & Themes)
 */

const sanitizeJsonResponse = (text: string): string => {
  if (!text) return "";
  let cleaned = text.trim();
  if (cleaned.includes('```json')) cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
  return cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").replace(/\\n/g, " ").replace(/\\r/g, " ").replace(/\\t/g, " ");
};

const getContrastColor = (hexColor: string): string => {
  const hex = (hexColor || 'FFFFFF').replace('#', '').slice(0, 6);
  const r = parseInt(hex.slice(0, 2), 16) || 255;
  const g = parseInt(hex.slice(2, 4), 16) || 255;
  const b = parseInt(hex.slice(4, 6), 16) || 255;
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? '004A74' : 'FFFFFF'; 
};

/**
 * V17 The Enforcer: Bounding Box Guard
 * Menjamin elemen tidak keluar slide (10x5.625) dan tidak vertikal.
 */
const enforceLayoutConstraints = (cmd: any) => {
  let x = Number(cmd.x) || 1;
  let y = Number(cmd.y) || 1.6; // Minimal di bawah header
  let w = Number(cmd.w) || 4;
  let h = Number(cmd.h) || 1;

  // 1. Anti-Vertical Guard (Lebar minimal 3.5")
  if (cmd.type === 'text' && w < 3.5) w = 3.5;

  // 2. Slide Boundary Guard (Max 10")
  if (x + w > 9.5) {
    if (x > 5) x = 10 - w - 0.5; // Geser ke kiri jika muat
    else w = 10 - x - 0.5;      // Kecilkan lebar jika terlalu mepet kanan
  }
  
  // 3. Header Collision Guard
  if (y < 1.4) y = 1.5;

  return { x, y, w, h };
};

const executeBlueprintCommands = (slide: any, commands: any[], primaryColor: string, secondaryColor: string) => {
  if (!Array.isArray(commands)) return;
  
  commands.forEach(cmd => {
    try {
      const { x, y, w, h } = enforceLayoutConstraints(cmd);
      const options: any = { x, y, w, h };

      if (cmd.type === 'text') {
        const textContent = String(cmd.text || "");
        const bgFill = cmd.onBackground ? String(cmd.onBackground).replace('#', '') : null;
        let textColor = cmd.color ? String(cmd.color).replace('#', '') : '334155';
        if (bgFill) textColor = getContrastColor(bgFill).replace('#', '');
        
        slide.addText(textContent, {
          ...options,
          fontSize: Number(cmd.fontSize) || 12,
          fontFace: 'Inter',
          color: textColor,
          bold: !!cmd.bold,
          align: cmd.align || 'left',
          valign: cmd.valign || 'top',
          wrap: true,
          autoFit: true, // Native pptxgenjs autofit
          shrinkText: true // Otomatis kecilkan font jika box penuh
        });
      } else if (cmd.type === 'shape') {
        slide.addShape(cmd.kind || 'rect', {
          ...options,
          fill: { color: String(cmd.fill || primaryColor).replace('#', ''), alpha: Number(cmd.opacity) || 100 },
          line: { color: String(cmd.lineColor || secondaryColor).replace('#', ''), width: Number(cmd.lineWidth) || 0 },
          rectRadius: cmd.radius || 0.1
        });
      }
    } catch (e) { console.warn("V17 Render Warning:", e); }
  });
};

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
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    const allSlides: any[] = [];
    const primaryColor = config.theme.primaryColor.replace('#', '');
    const secondaryColor = config.theme.secondaryColor.replace('#', '');

    // 1. MANDATORY COVER
    onProgress?.("Architecting Elite Cover...");
    const cover = pptx.addSlide();
    allSlides.push(cover);
    cover.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: primaryColor } });
    cover.addText(config.title.toUpperCase(), { x: 0.8, y: 1.5, w: 8.5, h: 2, fontSize: 36, fontFace: 'Inter', color: 'FFFFFF', bold: true, valign: 'bottom' });
    cover.addShape('line', { x: 0.8, y: 3.6, w: 2.5, h: 0, line: { color: secondaryColor, width: 4 } });
    cover.addText(config.presenters.join(' • '), { x: 0.8, y: 3.8, w: 8, h: 0.5, fontSize: 14, color: secondaryColor, bold: true });

    // 2. TEMPLATE DNA & PROMPT
    onProgress?.(`Applying ${config.template} DNA...`);
    const designDNA = {
      [PresentationTemplate.MODERN]: "Minimalist, generous white space, thin lines, clean grid.",
      [PresentationTemplate.CREATIVE]: "Dynamic shapes, asymmetric layouts, bold background accents, rotated elements.",
      [PresentationTemplate.CORPORATE]: "Solid borders, formal headers, perfectly aligned boxes, professional tables.",
      [PresentationTemplate.ACADEMIC]: "Dual columns, structured citation areas, clean data visualization."
    };

    const prompt = `ACT AS A SENIOR PRESENTATION ARCHITECT.
    Template Style: ${config.template} - ${designDNA[config.template]}
    Generate ${Math.max(3, config.slidesCount - 2)} slides for: "${config.title}"
    Content: ${config.context || item.abstract || ""}.
    
    CRITICAL V17 RULES:
    1. SLIDE SIZE is 10 x 5.625 inches.
    2. HEADER AREA is x:0.8, y:0.3, w:8.5, h:1. DO NOT PUT CONTENT HERE.
    3. MINIMUM WIDTH for text boxes is 3.5 inches. NO VERTICAL TEXT.
    4. X COORDINATE must be between 0.8 and 6.0.
    5. Y COORDINATE must be between 1.6 and 4.5.
    6. USE RAW JSON ONLY. NO MARKDOWN.
    
    FORMAT:
    { "slides": [{ "title": "...", "commands": [{ "type": "text"|"shape", "x":0.8, "y":1.6, "w":4, "h":1, "text": "..." }] }] }`;

    let aiRes = await callAiProxy('gemini', prompt);
    const cleanJson = sanitizeJsonResponse(aiRes);
    let blueprint = JSON.parse(cleanJson);

    // Render Content Slides
    blueprint.slides.forEach((s: any, i: number) => {
      onProgress?.(`Polishing Slide ${i + 2}...`);
      const slide = pptx.addSlide();
      allSlides.push(slide);
      
      // Header Prosedural (Safe Zone)
      slide.addText(s.title || "Insight", { x: 0.8, y: 0.4, w: 8.5, h: 0.8, fontSize: 24, fontFace: 'Inter', color: primaryColor, bold: true, valign: 'top' });
      slide.addShape('line', { x: 0.8, y: 1.1, w: 1.5, h: 0, line: { color: secondaryColor, width: 3 } });

      if (s.commands) executeBlueprintCommands(slide, s.commands, primaryColor, secondaryColor);
    });

    // 3. BIBLIOGRAPHY
    onProgress?.("Archiving Citations...");
    const bib = pptx.addSlide();
    allSlides.push(bib);
    bib.addText("REFERENCES", { x: 0.8, y: 0.5, w: 8.5, h: 0.6, fontSize: 24, color: primaryColor, bold: true });
    bib.addText(item.bibHarvard || "Source data archived in Xeenaps Master Library.", { x: 0.8, y: 1.5, w: 8.4, h: 2, fontSize: 12, italic: true, color: '475569' });

    onProgress?.("Finalizing PPTX Archive...");
    const base64Pptx = await pptx.write({ outputType: 'base64' }) as string;

    const presentationData: Partial<PresentationItem> = {
      id: crypto.randomUUID(),
      collectionIds: [item.id],
      title: config.title,
      presenters: config.presenters,
      templateName: config.template,
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
    console.error("V17 Elite Error:", error);
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
