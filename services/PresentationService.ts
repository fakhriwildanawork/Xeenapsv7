
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig, DesignStyle } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS BLUEPRINT ARCHITECT V9.1
 * FOCUS: Safe-JSON protocol, Truncation Recovery, Dynamic Font Scaling.
 */

const CANVAS_W = 10;
const CANVAS_H = 5.625;

/**
 * Menghitung ukuran font dinamis agar tidak meluber
 */
const calculateDynamicFontSize = (text: string, baseSize: number, boxWidth: number): number => {
  if (!text) return baseSize;
  const charCount = text.length;
  // Rasio kasar: 1 inci bisa menampung ~10-12 karakter pada font 12pt
  // Jika teks terlalu panjang untuk lebar box, kita kecilkan baseline-nya
  const estimatedWidth = (charCount * (baseSize / 2)) / 72; // estimasi lebar dalam inci
  if (estimatedWidth > boxWidth * 0.9) {
    const scaleFactor = (boxWidth * 0.9) / estimatedWidth;
    return Math.max(Math.floor(baseSize * scaleFactor), 14); // Minimal 14pt agar tetap terbaca
  }
  return baseSize;
};

const executeBlueprintCommands = (slide: any, commands: any[], primaryColor: string, secondaryColor: string) => {
  if (!Array.isArray(commands)) return;
  
  commands.forEach(cmd => {
    try {
      const options: any = {
        x: cmd.x || 0,
        y: cmd.y || 0,
        w: cmd.w || 1,
        h: cmd.h || 1,
      };

      if (cmd.type === 'shape') {
        slide.addShape(cmd.kind || 'rect', {
          ...options,
          fill: { color: String(cmd.fill || primaryColor).replace('#', '') },
          line: cmd.line ? { color: String(cmd.lineColor || secondaryColor).replace('#', ''), width: cmd.lineWidth || 1 } : undefined,
          rectRadius: cmd.radius || 0,
          opacity: cmd.opacity || 100
        });
      } 
      
      else if (cmd.type === 'text') {
        const bgColor = cmd.onBackground ? String(cmd.onBackground).replace('#', '') : primaryColor;
        const contrastColor = cmd.color || getContrastColor(bgColor);
        
        // FLEXIBLE FONT SIZE LOGIC
        // Kita hitung font size ideal sebelum dikirim ke PPTxGenJS
        let fontSize = calculateDynamicFontSize(String(cmd.text), cmd.fontSize || 18, options.w);

        slide.addText(String(cmd.text || ""), {
          ...options,
          fontSize: fontSize,
          fontFace: 'Inter',
          color: String(contrastColor).replace('#', ''),
          bold: cmd.bold || false,
          italic: cmd.italic || false,
          align: cmd.align || 'left',
          valign: cmd.valign || 'top',
          wrap: true,
          autoFit: true,   
          shrinkText: true 
        });
      }
      
      else if (cmd.type === 'line') {
        slide.addShape('line', {
          x: cmd.x, y: cmd.y, w: cmd.w, h: cmd.h,
          line: { color: String(cmd.color || secondaryColor).replace('#', ''), width: cmd.width || 1, dashType: cmd.dash || 'solid' }
        });
      }
    } catch (e) {
      console.warn("Blueprint Command Execution Error:", e);
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
    
    const blueprintPrompt = `YOU ARE A SENIOR UI/UX DESIGNER. TASK: CREATE A VISUAL BLUEPRINT FOR A PRESENTATION TITLED: "${config.title}"
    
    STYLE: "${designStyle}". COLORS: Primary (${primaryColor}), Accent (${secondaryColor}).
    
    STRICT SLIDE SEQUENCE (MANDATORY):
    1. SLIDE 1: Master Title Slide. Title: "${config.title}", Presenters: "${config.presenters.join(', ')}".
    2. MIDDLE: Synthesize core insights into ${config.slidesCount - 2} slides.
    3. FINAL: Bibliography slide. Content: "${bibliographyText}".

    STRICT JSON PROTOCOL:
    - RETURN EXACTLY ${config.slidesCount} ITEMS IN "slides" ARRAY.
    - BE CONCISE to prevent truncation. Use bullet points.
    - ESCAPE all double quotes and newlines (\\n) inside string values.
    - OUTPUT RAW JSON ONLY.

    EXPECTED SCHEMA:
    {
      "slides": [
        { "title": "Slide Title", "commands": [
          { "type": "shape", "kind": "rect", "x", "y", "w", "h", "fill": "hex" },
          { "type": "text", "x", "y", "w", "h", "text", "fontSize", "bold", "align", "color": "hex", "onBackground": "hex" }
        ]}
      ]
    }`;

    let aiResText = await callAiProxy('gemini', blueprintPrompt);
    if (!aiResText) throw new Error("AI Synthesis failed.");

    // Robust JSON Sanitization & Recovery
    let cleanJson = aiResText.trim();
    // Menghapus karakter kontrol aneh yang mungkin disisipkan AI
    cleanJson = cleanJson.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); 
    
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
       throw new Error("AI response did not contain a valid JSON block.");
    }
    
    cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);

    let blueprint;
    try {
      blueprint = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("JSON Parse Error. Length:", cleanJson.length, "Text near error:", cleanJson.substring(cleanJson.length - 50));
      throw new Error("AI output was malformed or truncated. Try reducing slide count.");
    }

    if (!blueprint.slides || !Array.isArray(blueprint.slides)) throw new Error("Invalid Blueprint Schema");

    const slidesToRender = blueprint.slides.slice(0, config.slidesCount);

    slidesToRender.forEach((sData: any, idx: number) => {
      onProgress?.(`Rendering Design for Slide ${idx + 1}/${slidesToRender.length}...`);
      const slide = pptx.addSlide();
      
      if (sData.commands) {
        executeBlueprintCommands(slide, sData.commands, primaryColor, secondaryColor);
      }

      slide.addText(`XEENAPS PKM • ${idx + 1}`, {
        x: 0.5, y: 5.35, w: 9, h: 0.2,
        fontSize: 7, fontFace: 'Inter', color: 'CBD5E1', align: 'right', bold: true
      });
    });

    onProgress?.("Archiving to Xeenaps Cloud Node...");
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
        headingFont: 'Inter',
        designStyle: designStyle
      },
      slidesCount: slidesToRender.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'savePresentation',
        presentation: presentationData,
        pptxFileData: base64Pptx
      })
    });

    const result = await res.json();
    if (result.status === 'success') return result.data;
    throw new Error(result.message || "Cloud archive failure.");

  } catch (error: any) {
    console.error("Blueprint Architect Error:", error);
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
