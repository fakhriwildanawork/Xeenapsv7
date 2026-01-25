import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS BLUEPRINT ARCHITECT V11
 * Optimized for: Zero Hallucination, Adaptive Layouts, and Strict JSON Compliance.
 */

const CANVAS_W = 10;
const CANVAS_H = 5.625;

/**
 * Helper to clean and validate AI JSON output
 */
const parseAiJson = (text: string) => {
  try {
    // Attempt to extract the first valid JSON block
    let cleanText = text.trim();
    const start = cleanText.indexOf('{');
    const end = cleanText.lastIndexOf('}');
    
    if (start === -1 || end === -1) throw new Error("No JSON block found in AI response");
    
    cleanText = cleanText.substring(start, end + 1);
    
    // Remove potential trailing commas before closing braces/brackets which AI often hallucinates
    cleanText = cleanText.replace(/,\s*([}\]])/g, '$1');
    
    // Fix potential unescaped double quotes inside values (basic approach)
    // This is a common cause of SyntaxError when AI includes quotes in titles/abstracts
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parsing Error in PresentationService:", e, "\nRaw Text:", text);
    throw e;
  }
};

/**
 * Kalkulasi kontras warna secara dinamis
 */
const getContrastColor = (hexColor: string): string => {
  const hex = (hexColor || 'FFFFFF').replace('#', '').slice(0, 6);
  const r = parseInt(hex.slice(0, 2), 16) || 255;
  const g = parseInt(hex.slice(2, 4), 16) || 255;
  const b = parseInt(hex.slice(4, 6), 16) || 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '1E293B' : 'FFFFFF';
};

/**
 * Blueprint Executor V11 (Chart functionality REMOVED to prevent data hallucination)
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

      // Guard for Presenter/Text Y position - Ensure nothing goes off-canvas at bottom
      if (cmd.y && cmd.y > 5.2) {
        options.y = 5.0; // Force it up to a safe zone
      }

      if (cmd.type === 'shape') {
        slide.addShape(cmd.kind || 'rect', {
          ...options,
          fill: { color: String(cmd.fill || primaryColor).replace('#', '') },
          line: cmd.line ? { color: String(cmd.lineColor || secondaryColor).replace('#', ''), width: cmd.lineWidth || 1 } : undefined,
          rectRadius: cmd.radius || 0.1,
          opacity: cmd.opacity || 100,
          shadow: cmd.shadow ? { type: 'outer', color: '666666', blur: 3, offset: 2, opacity: 0.3 } : undefined
        });
      } 
      else if (cmd.type === 'text') {
        const bgFill = cmd.onBackground ? String(cmd.onBackground).replace('#', '') : null;
        const textColor = cmd.color ? String(cmd.color).replace('#', '') : (bgFill ? getContrastColor(bgFill) : primaryColor);
        
        slide.addText(String(cmd.text || ""), {
          ...options,
          fontSize: cmd.fontSize || 12,
          fontFace: 'Inter',
          color: textColor.replace('#', ''),
          bold: cmd.bold || false,
          italic: cmd.italic || false,
          align: cmd.align || 'left',
          valign: cmd.valign || 'top',
          wrap: true,
          autoFit: true,
          shrinkText: true,
          shadow: cmd.shadow ? { type: 'outer', color: '333333', blur: 1, offset: 1, opacity: 0.2 } : undefined
        });
      }
      else if (cmd.type === 'table') {
        slide.addTable(cmd.rows || [], {
          ...options,
          border: { pt: 1, color: secondaryColor.replace('#', '') },
          fill: { color: 'F8FAFC' },
          fontSize: cmd.fontSize || 10,
          color: primaryColor.replace('#', ''),
          align: 'center',
          valign: 'middle'
        });
      }
      else if (cmd.type === 'line') {
        slide.addShape('line', {
          ...options,
          line: { color: String(cmd.color || secondaryColor).replace('#', ''), width: cmd.width || 1.5, dashType: cmd.dash || 'solid' }
        });
      }
      // CHART REMOVED to satisfy hallucination guard
    } catch (e) {
      console.warn("Blueprint Execution Warning:", e);
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
    
    const primaryColor = config.theme.primaryColor.replace('#', '');
    const secondaryColor = config.theme.secondaryColor.replace('#', '');
    
    onProgress?.("AI Architect is designing your custom layouts...");
    
    const bibliographyEntry = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}.`;

    const blueprintPrompt = `ACT AS A SENIOR UI/UX ARCHITECT AND ACADEMIC LIBRARIAN.
    TASK: Generate a VISUAL BLUEPRINT for a professional presentation.
    
    TITLE: "${config.title}"
    PRESENTERS: "${config.presenters.join(', ')}"
    BIBLIOGRAPHY: "${bibliographyEntry}"
    
    --- HALLUCINATION GUARD (STRICT) ---
    1. NEVER create or invent data, statistics, or metrics. 
    2. CHARTS ARE DISABLED. DO NOT USE THE "chart" COMMAND TYPE.
    3. ONLY use information provided in the CONTEXT.
    4. If information is not in the context, do not make it up.
    
    --- ADAPTIVE LAYOUT RULES ---
    1. SLIDE 1 (COVER): 
       - If Title length > 50 characters: Use fontSize 28-32pt.
       - If Title length <= 50 characters: Use fontSize 42-48pt.
       - Presenters must be positioned at y=4.6 to 5.0 (SAFE ZONE) to avoid footer overlap.
       - Adjust Presenters fontSize if name list is long (max 14pt).
    2. LAST SLIDE (BIBLIOGRAPHY): 
       - Identify all sources mentioned in the context.
       - If there are multiple sources, represent them as a CLEAN LIST.
    
    --- TECHNICAL SPECS ---
    - CANVAS: ${CANVAS_W}x${CANVAS_H} inches.
    - OUTPUT: RAW JSON ONLY. NO MARKDOWN.
    - ESCAPE all double quotes inside text strings using backslash (e.g., \\").
    
    COMMAND TYPES:
    - "shape": { kind: "rect"|"oval"|"triangle", x, y, w, h, fill, radius, shadow: boolean }
    - "text": { text, x, y, w, h, fontSize, bold, align, color, onBackground }
    - "table": { rows: [[]], x, y, w, h }
    - "line": { x, y, w, h, color }

    CONTEXT: ${config.context.substring(0, 12000)}
    LANGUAGE: ${config.language}
    SLIDES: ${config.slidesCount}

    EXPECTED JSON:
    { "slides": [{ "title": "string", "commands": [] }] }`;

    let aiResText = await callAiProxy('gemini', blueprintPrompt);
    if (!aiResText) throw new Error("AI Synthesis failed.");

    // Improved JSON parsing with cleanup
    const blueprint = parseAiJson(aiResText);
    if (!blueprint.slides || !Array.isArray(blueprint.slides)) throw new Error("Invalid Blueprint Schema");

    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Rendering Slide ${idx + 1} with adaptive layout...`);
      const slide = pptx.addSlide();
      
      if (sData.commands) {
        executeBlueprintCommands(slide, sData.commands, primaryColor, secondaryColor);
      }

      slide.addText(`XEENAPS PKM • ${idx + 1}`, {
        x: 0.5, y: 5.35, w: 9, h: 0.2,
        fontSize: 7, fontFace: 'Inter', color: '94A3B8', align: 'right', bold: true
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
      slidesCount: blueprint.slides.length,
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