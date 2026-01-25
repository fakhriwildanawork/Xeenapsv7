
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS BLUEPRINT ARCHITECT V9
 * Fokus: Kebebasan Layouting (X, Y, W, H) dengan Guardrail Spasial & PPTxGenJS Awareness.
 */

// Konfigurasi Kanvas Standar PowerPoint (Inci)
const CANVAS_W = 10;
const CANVAS_H = 5.625;

/**
 * Fungsi Eksekutor Blueprint
 * Menerjemahkan instruksi visual dari AI langsung ke perintah PPTxGenJS
 */
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
        const contrastColor = cmd.color || (cmd.onBackground ? getContrastColor(cmd.onBackground) : primaryColor);
        
        slide.addText(String(cmd.text || ""), {
          ...options,
          fontSize: cmd.fontSize || 12,
          fontFace: 'Inter',
          color: String(contrastColor).replace('#', ''),
          bold: cmd.bold || false,
          italic: cmd.italic || false,
          align: cmd.align || 'left',
          valign: cmd.valign || 'top',
          wrap: true,
          autoFit: true,   // PPTxGenJS Fit
          shrinkText: true // PPTxGenJS Shrink
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
  const r = parseInt(hex.slice(0, 2), 16) || 255;
  const g = parseInt(hex.slice(2, 4), 16) || 255;
  const b = parseInt(hex.slice(4, 6), 16) || 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '1E293B' : 'FFFFFF';
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
    
    onProgress?.("AI Architect is designing your custom layouts...");
    
    const blueprintPrompt = `YOU ARE A SENIOR UI/UX DESIGNER SPECIALIZED IN PPTXGENJS (V4.0).
    TASK: CREATE A VISUAL BLUEPRINT FOR A PRESENTATION TITLED: "${config.title}"
    
    TECHNICAL SPECS:
    - CANVAS: ${CANVAS_W} (W) x ${CANVAS_H} (H) inches.
    - OUTPUT: JSON object with "slides" array.
    - COLORS: Hex format WITHOUT '#'.
    - COORDINATES: Inches.
    
    STRICT JSON SANITIZATION RULES:
    1. ESCAPING: You MUST escape all double quotes within text content with backslashes (\\").
    2. CLEAN STRINGS: Ensure no raw newlines or special control characters break the JSON structure.
    3. NO MARKDOWN: Output only the raw JSON string, do not wrap in \`\`\`json blocks.
    
    SPATIAL RULES:
    1. MAX DENSITY: 150 characters per 1 square inch of box area.
    2. COLLISION: Maintain 0.2 inch margin between different text elements.
    
    SOURCE MATERIAL: ${config.context.substring(0, 10000)}
    LANGUAGE: ${config.language}
    REQUIRED SLIDES: ${config.slidesCount}

    OUTPUT SCHEMA:
    {
      "slides": [
        { 
          "title": "string",
          "commands": [ 
            { "type": "shape", "kind": "rect", "x": number, "y": number, "w": number, "h": number, "fill": "hex" },
            { "type": "text", "x": number, "y": number, "w": number, "h": number, "text": "string", "fontSize": number, "bold": boolean }
          ]
        }
      ]
    }`;

    let aiResText = await callAiProxy('gemini', blueprintPrompt);
    if (!aiResText) throw new Error("AI Synthesis failed.");

    // Sanitasi Respons: Mencari blok JSON pertama jika ada teks sampah
    const start = aiResText.indexOf('{');
    const end = aiResText.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      aiResText = aiResText.substring(start, end + 1);
    }

    // Mekanisme Recovery jika JSON terpotong di akhir (Truncation)
    if (!aiResText.trim().endsWith('}')) {
       console.warn("Detected potential truncated JSON, attempting recovery...");
       if (!aiResText.includes(']')) aiResText += ']}';
       else if (!aiResText.trim().endsWith('}')) aiResText += '}';
    }

    const blueprint = JSON.parse(aiResText);
    if (!blueprint.slides || !Array.isArray(blueprint.slides)) throw new Error("Invalid Blueprint Schema");

    // Render Slides berdasarkan AI Blueprint
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Rendering Design for Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      
      // Eksekusi layout custom dari AI
      if (sData.commands) {
        executeBlueprintCommands(slide, sData.commands, primaryColor, secondaryColor);
      }

      // Add Footer Branding
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
        headingFont: 'Inter'
      },
      slidesCount: config.slidesCount,
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
