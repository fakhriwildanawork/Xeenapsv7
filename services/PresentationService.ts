
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig, DesignStyle } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS BLUEPRINT ARCHITECT V9.5
 * FOCUS: Robust Layouts, JSON Auto-Repair, and Payload Compression.
 */

const CANVAS_W = 10;
const CANVAS_H = 5.625;

/**
 * Fungsi untuk memperbaiki JSON yang terpotong (Truncated Recovery)
 */
const tryRepairJson = (jsonString: string): string => {
  let str = jsonString.trim();
  
  // Jika tidak dimulai dengan {, abaikan
  if (!str.startsWith('{')) return str;

  // Hitung jumlah kurung
  const openBraces = (str.match(/\{/g) || []).length;
  const closeBraces = (str.match(/\}/g) || []).length;
  const openBrackets = (str.match(/\[/g) || []).length;
  const closeBrackets = (str.match(/\]/g) || []).length;

  // Tutup string yang menggantung jika ada (biasanya terpotong di tengah value teks)
  if (str.endsWith('"')) { /* string looks okay but maybe values missing */ } 
  else if (str.match(/"[^"]*$/)) { str += '"'; }

  // Tutup objek dan array secara rekursif
  for (let i = 0; i < (openBrackets - closeBrackets); i++) str += ']';
  for (let i = 0; i < (openBraces - closeBraces); i++) str += '}';
  
  return str;
};

/**
 * Pre-defined Layout Master: Mengurangi beban AI dalam menggambar latar belakang
 */
const applyMasterLayout = (slide: any, style: DesignStyle, primary: string, secondary: string, isTitle: boolean = false) => {
  const pColor = primary.replace('#', '');
  const sColor = secondary.replace('#', '');

  // Default Background
  slide.background = { color: 'FFFFFF' };

  if (isTitle) {
    // Title Slide Frame
    slide.addShape('rect', { x: 0, y: 0, w: 0.5, h: 5.625, fill: { color: pColor } });
    slide.addShape('rect', { x: 9.5, y: 0, w: 0.5, h: 5.625, fill: { color: sColor } });
    slide.addShape('rect', { x: 0.5, y: 5.1, w: 9, h: 0.05, fill: { color: pColor }, opacity: 20 });
  } else {
    // Content Slide Frame
    slide.addShape('rect', { x: 0, y: 0, w: 10, h: 0.8, fill: { color: pColor } });
    slide.addShape('rect', { x: 0, y: 0.8, w: 10, h: 0.05, fill: { color: sColor } });
  }
};

const executeBlueprintCommands = (slide: any, commands: any[], primaryColor: string, secondaryColor: string) => {
  if (!Array.isArray(commands)) return;
  
  commands.forEach(cmd => {
    try {
      // Koordinat aman (Inci)
      const options: any = {
        x: Math.min(Math.max(cmd.x || 0, 0), CANVAS_W - 0.5),
        y: Math.min(Math.max(cmd.y || 0, 0), CANVAS_H - 0.5),
        w: Math.min(cmd.w || 1, CANVAS_W - (cmd.x || 0)),
        h: Math.min(cmd.h || 1, CANVAS_H - (cmd.y || 0)),
      };

      const fillCol = String(cmd.fill || primaryColor).replace('#', '').toUpperCase();
      const lineCol = String(cmd.lineColor || secondaryColor).replace('#', '').toUpperCase();

      if (cmd.type === 'shape') {
        slide.addShape(cmd.kind || 'rect', {
          ...options,
          fill: { color: fillCol },
          line: cmd.line ? { color: lineCol, width: cmd.lineWidth || 1 } : undefined,
          rectRadius: cmd.radius || 0,
          opacity: cmd.opacity || 100
        });
      } 
      
      else if (cmd.type === 'text') {
        const textStr = String(cmd.text || "").trim();
        if (!textStr) return;

        const bgColor = cmd.onBackground ? String(cmd.onBackground).replace('#', '') : (cmd.y < 0.8 ? primaryColor : 'FFFFFF');
        const contrastColor = cmd.color || getContrastColor(bgColor);
        
        // Font size logic based on title vs body
        let fontSize = cmd.fontSize || (options.y < 1 ? 22 : 14);
        if (textStr.length > 60 && fontSize > 24) fontSize = 20;

        slide.addText(textStr, {
          ...options,
          fontSize: fontSize,
          fontFace: 'Inter',
          color: String(contrastColor).replace('#', '').toUpperCase(),
          bold: cmd.bold || options.y < 1,
          align: cmd.align || 'left',
          valign: cmd.valign || 'top',
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
    
    onProgress?.("AI Architect is designing your custom layouts...");

    const bibliographyText = item.bibHarvard || `Reference: ${item.authors?.join(', ')} (${item.year}). ${item.title}.`;
    
    // COMPRESSED PROMPT: Mengurangi repetisi warna dan background
    const blueprintPrompt = `SYSTEM: SENIOR UI DESIGNER.
    TARGET: PPTX BLUEPRINT (16:9).
    BRANDING: Primary (#${primaryColor}), Accent (#${secondaryColor}).
    
    CONTENT SOURCE: ${config.context.substring(0, 8000)}

    SLIDE RULES:
    1. SLIDE 1 (TITLE): Title "${config.title}", Presenters "${config.presenters.join(', ')}".
    2. BODY (${config.slidesCount - 2} SLIDES): Core insights from source.
    3. FINAL (BIBLIOGRAPHY): "${bibliographyText}".

    TECHNICAL COMMANDS (JSON):
    - type: "text", x, y, w, h, text, fontSize, bold, align, color
    - type: "shape", kind: "rect"|"ellipse", x, y, w, h, fill

    IMPORTANT:
    - Kanvas 10x5.625 inci.
    - BACKGROUND SUDAH ADA (Jangan buat shape rect 10x5.625).
    - HEADER SUDAH ADA (y < 0.8 adalah area header, y > 0.8 area konten).
    - OUTPUT RAW JSON ONLY. NO MARKDOWN.
    - BE EXTREMELY CONCISE. LIMIT TEXT PER SLIDE.

    JSON SCHEMA:
    { "slides": [ { "title": "...", "commands": [...] } ] }`;

    let aiResText = await callAiProxy('gemini', blueprintPrompt);
    if (!aiResText) throw new Error("AI Synthesis failed.");

    // REPAIR & SANITIZE
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
      console.error("JSON Error. Result:", cleanJson);
      throw new Error("AI output limit exceeded. Please try with fewer slides.");
    }

    const slidesToRender = (blueprint.slides || []).slice(0, config.slidesCount);

    slidesToRender.forEach((sData: any, idx: number) => {
      onProgress?.(`Rendering Slide ${idx + 1}/${slidesToRender.length}...`);
      const slide = pptx.addSlide();
      
      // 1. Apply Master Template
      applyMasterLayout(slide, designStyle, primaryColor, secondaryColor, idx === 0);

      // 2. Render Slide Title (Auto-Placement jika AI tidak mendesainnya)
      if (idx > 0) {
        slide.addText(sData.title || "Key Insight", {
          x: 0.5, y: 0.15, w: 9, h: 0.5,
          fontSize: 22, fontFace: 'Inter', color: getContrastColor(primaryColor).replace('#',''),
          bold: true, align: 'left', valign: 'middle'
        });
      }

      // 3. Execute AI Custom Design
      if (sData.commands) {
        executeBlueprintCommands(slide, sData.commands, primaryColor, secondaryColor);
      }

      // 4. Footer
      slide.addText(`XEENAPS PKM • ${idx + 1}`, {
        x: 0.5, y: 5.35, w: 9, h: 0.2,
        fontSize: 7, fontFace: 'Inter', color: 'CBD5E1', align: 'right', bold: true
      });
    });

    onProgress?.("Finalizing Presentation...");
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
      slidesCount: slidesToRender.length,
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
// ... rest of file (fetchRelatedPresentations) ...
export const fetchRelatedPresentations = async (collectionId: string): Promise<PresentationItem[]> => {
  try {
    const res = await fetch(`${GAS_WEB_APP_URL}?action=getRelatedPresentations&collectionId=${collectionId}`);
    const result = await res.json();
    return result.status === 'success' ? result.data : [];
  } catch (error) {
    return [];
  }
};
