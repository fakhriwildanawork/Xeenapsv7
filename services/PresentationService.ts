
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig, DesignStyle } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS BLUEPRINT ARCHITECT V10
 * FOCUS: Elegant Modern UI, Auto-Shrink Text, Rounded Shapes, and Strict Language Alignment.
 */

const CANVAS_W = 10;
const CANVAS_H = 5.625;

/**
 * Memperbaiki JSON yang terpotong jika terjadi limit token
 */
const tryRepairJson = (jsonString: string): string => {
  let str = jsonString.trim();
  if (!str.startsWith('{')) return str;

  const openBraces = (str.match(/\{/g) || []).length;
  const closeBraces = (str.match(/\}/g) || []).length;
  const openBrackets = (str.match(/\[/g) || []).length;
  const closeBrackets = (str.match(/\]/g) || []).length;

  if (!str.endsWith('"') && str.match(/"[^"]*$/)) str += '"';
  for (let i = 0; i < (openBrackets - closeBrackets); i++) str += ']';
  for (let i = 0; i < (openBraces - closeBraces); i++) str += '}';
  
  return str;
};

/**
 * Master Layout Generator - Menghasilkan base modern untuk setiap slide
 */
const applyMasterLayout = (slide: any, style: DesignStyle, primary: string, secondary: string, isTitle: boolean = false) => {
  const pColor = primary.replace('#', '');
  const sColor = secondary.replace('#', '');

  slide.background = { color: 'FFFFFF' };

  if (isTitle) {
    // Title Slide Modern Accents
    slide.addShape('rect', { x: 0, y: 0, w: 0.3, h: 5.625, fill: { color: pColor } });
    slide.addShape('rect', { x: 9.7, y: 0, w: 0.3, h: 5.625, fill: { color: sColor } });
    // Decorative background element
    slide.addShape('rect', { x: 1, y: 1.2, w: 8, h: 3.2, fill: { color: pColor }, opacity: 5, rectRadius: 0.3 });
  } else {
    // Content Slide Modern Header
    slide.addShape('rect', { x: 0.5, y: 0.3, w: 9, h: 0.8, fill: { color: pColor }, rectRadius: 0.15 });
    slide.addShape('rect', { x: 0.5, y: 1.1, w: 1, h: 0.05, fill: { color: sColor } });
  }
};

/**
 * Eksekutor Perintah Visual dari AI
 */
const executeBlueprintCommands = (slide: any, commands: any[], primaryColor: string, secondaryColor: string) => {
  if (!Array.isArray(commands)) return;
  
  commands.forEach(cmd => {
    try {
      const options: any = {
        x: Math.min(Math.max(cmd.x || 0, 0), CANVAS_W - 0.5),
        y: Math.min(Math.max(cmd.y || 0, 0), CANVAS_H - 0.5),
        w: Math.min(cmd.w || 1, CANVAS_W - 1),
        h: Math.min(cmd.h || 1, CANVAS_H - 1),
      };

      const fillCol = String(cmd.fill || primaryColor).replace('#', '').toUpperCase();
      const lineCol = String(cmd.lineColor || secondaryColor).replace('#', '').toUpperCase();

      if (cmd.type === 'shape') {
        slide.addShape(cmd.kind || 'rect', {
          ...options,
          fill: { color: fillCol },
          line: cmd.line ? { color: lineCol, width: cmd.lineWidth || 1 } : undefined,
          rectRadius: cmd.radius || 0.1, // Modern rounded corners by default
          opacity: cmd.opacity || 100
        });
      } 
      
      else if (cmd.type === 'text') {
        const textStr = String(cmd.text || "").trim();
        if (!textStr) return;

        // Warna Teks Cerdas (Kontras)
        const bgColor = cmd.onBackground ? String(cmd.onBackground).replace('#', '') : (options.y < 1.1 ? primaryColor : 'FFFFFF');
        const contrastColor = cmd.color || getContrastColor(bgColor);
        
        // Ukuran font proporsional (dengan batasan minimum)
        let fontSize = cmd.fontSize || (options.y < 1.1 ? 24 : 16);
        if (textStr.length > 100) fontSize = Math.max(fontSize * 0.7, 12);

        slide.addText(textStr, {
          ...options,
          fontSize: fontSize,
          fontFace: 'Inter',
          color: String(contrastColor).replace('#', '').toUpperCase(),
          bold: cmd.bold || options.y < 1.1,
          align: cmd.align || (options.y < 1.1 ? 'center' : 'left'),
          valign: 'middle',
          wrap: true,
          autoFit: true,   
          shrinkText: true 
        });
      }
    } catch (e) {
      console.warn("Blueprint Command Error:", e);
    }
  });
};

const getContrastColor = (hexColor: string): string => {
  const hex = (hexColor || 'FFFFFF').replace('#', '').slice(0, 6);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '1E293B' : 'FFFFFF';
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
    
    const primaryColor = (config.theme.primaryColor || '004A74').replace('#', '');
    const secondaryColor = (config.theme.secondaryColor || 'FED400').replace('#', '');
    const designStyle = config.theme.designStyle || DesignStyle.MINIMALIST;
    
    onProgress?.("Architecting Slides in " + config.language + "...");

    const bibliographyText = item.bibHarvard || `Reference: ${item.authors?.join(', ')} (${item.year}). ${item.title}.`;
    
    const blueprintPrompt = `ACT AS A SENIOR PRESENTATION ARCHITECT. 
    LANGUAGE: ${config.language}. (ALL SLIDE CONTENT MUST BE IN ${config.language.toUpperCase()}).
    STYLE: ${designStyle}. 
    BRAND COLORS: Primary (#${primaryColor}), Accent (#${secondaryColor}).
    
    INPUT CONTENT: ${config.context.substring(0, 8000)}

    SLIDE STRUCTURE (TOTAL: ${config.slidesCount}):
    1. TITLE SLIDE: 
       - Title: "${config.title}" (Centered, Y=1.8, W=8)
       - Presenters: "${config.presenters.join(', ')}" (Centered, Y=4.2, W=8)
    2. BODY SLIDES (${config.slidesCount - 2}): Strategic insights from input.
    3. BIBLIOGRAPHY: Reference summary.

    TECHNICAL SPECS:
    - Background & Headers are ALREADY applied by the system.
    - Content area for body slides is Y=1.5 to Y=5.0.
    - Use type: "text" (x, y, w, h, text, fontSize, bold, align, color)
    - Use type: "shape" (kind: "rect"|"ellipse", x, y, w, h, fill)
    - Keep text CONCISE. No more than 6 bullets per slide.
    - OUTPUT RAW JSON ONLY.

    { "slides": [ { "title": "...", "commands": [...] } ] }`;

    let aiResText = await callAiProxy('gemini', blueprintPrompt);
    if (!aiResText) throw new Error("AI Synthesis failed.");

    let cleanJson = tryRepairJson(aiResText.trim());
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }

    let blueprint;
    try {
      blueprint = JSON.parse(cleanJson);
    } catch (e) {
      throw new Error("Invalid AI Response Structure.");
    }

    const slidesData = (blueprint.slides || []).slice(0, config.slidesCount);

    slidesData.forEach((sData: any, idx: number) => {
      onProgress?.(`Synthesizing Slide ${idx + 1}/${slidesData.length}...`);
      const slide = pptx.addSlide();
      
      applyMasterLayout(slide, designStyle, primaryColor, secondaryColor, idx === 0);

      // Header title for content slides (consistent placement)
      if (idx > 0) {
        slide.addText(sData.title || "", {
          x: 0.6, y: 0.3, w: 8.8, h: 0.8,
          fontSize: 24, fontFace: 'Inter', color: 'FFFFFF',
          bold: true, align: 'center', valign: 'middle'
        });
      }

      if (sData.commands) {
        executeBlueprintCommands(slide, sData.commands, primaryColor, secondaryColor);
      }

      // Branded Footer
      slide.addText(`XEENAPS • ${idx + 1}`, {
        x: 0.5, y: 5.3, w: 9, h: 0.2,
        fontSize: 7, fontFace: 'Inter', color: 'CBD5E1', align: 'right', bold: true
      });
    });

    onProgress?.("Encoding Presentation Package...");
    const base64Pptx = await pptx.write({ outputType: 'base64' }) as string;

    const presentationData: Partial<PresentationItem> = {
      id: crypto.randomUUID(),
      collectionIds: [item.id],
      title: config.title,
      presenters: config.presenters,
      themeConfig: {
        primaryColor: `#${primaryColor}`,
        secondaryColor: `#${secondaryColor}`,
        fontFamily: 'Inter',
        headingFont: 'Inter',
        designStyle: designStyle
      },
      slidesCount: slidesData.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'savePresentation', presentation: presentationData, pptxFileData: base64Pptx })
    });

    const result = await res.json();
    return result.status === 'success' ? result.data : null;

  } catch (error: any) {
    console.error("Presentation Engine Error:", error);
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
