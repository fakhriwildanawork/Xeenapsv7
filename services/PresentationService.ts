
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS BLUEPRINT ARCHITECT V11 (Safe Edition)
 * Fokus: Robust JSON Parsing, Premium UI/UX, Smart Contrast, Charts & Tables.
 */

const CANVAS_W = 10;
const CANVAS_H = 5.625;

/**
 * Membersihkan string JSON dari AI yang sering mengandung karakter ilegal atau markdown
 */
const sanitizeJsonResponse = (text: string): string => {
  let cleaned = text.trim();
  
  // Hapus Markdown Code Blocks jika ada
  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.split('```')[1].split('```')[0].trim();
  }

  // Temukan objek JSON pertama dan terakhir
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return cleaned;
  cleaned = cleaned.substring(start, end + 1);

  // Perbaikan karakter ilegal yang sering muncul dari AI
  return cleaned
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Hapus control characters
    .replace(/\n/g, "\\n") // Escape newlines manual
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
};

/**
 * Kalkulasi kontras warna secara dinamis (Luminance Sensing)
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
 * Eksekutor Blueprint V11
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

      // 1. SHAPES (Premium Styling: Rounded, Shadow, Multi-shape)
      if (cmd.type === 'shape') {
        slide.addShape(cmd.kind || 'rect', {
          ...options,
          fill: { color: String(cmd.fill || primaryColor).replace('#', '') },
          line: cmd.line ? { color: String(cmd.lineColor || secondaryColor).replace('#', ''), width: cmd.lineWidth || 1 } : undefined,
          rectRadius: cmd.radius || 0.2, 
          opacity: cmd.opacity || 100,
          shadow: cmd.shadow ? { type: 'outer', color: '666666', blur: 4, offset: 3, opacity: 0.25 } : undefined
        });
      } 
      
      // 2. TEXT (Modern Typography & Smart Contrast Enforcement)
      else if (cmd.type === 'text') {
        const bgFill = cmd.onBackground ? String(cmd.onBackground).replace('#', '') : null;
        let textColor = cmd.color ? String(cmd.color).replace('#', '') : primaryColor.replace('#', '');
        
        // Proteksi Kontras: Jika teks di atas background, hitung ulang warnanya
        if (bgFill) {
          textColor = getContrastColor(bgFill).replace('#', '');
        }
        
        slide.addText(String(cmd.text || ""), {
          ...options,
          fontSize: cmd.fontSize || 12,
          fontFace: 'Inter',
          color: textColor,
          bold: cmd.bold || false,
          italic: cmd.italic || false,
          align: cmd.align || 'left',
          valign: cmd.valign || 'top',
          wrap: true,
          autoFit: true,
          shrinkText: true,
          shadow: cmd.shadow ? { type: 'outer', color: '333333', blur: 1, offset: 1, opacity: 0.15 } : undefined
        });
      }
      
      // 3. TABLES (Data comparison)
      else if (cmd.type === 'table') {
        slide.addTable(cmd.rows || [], {
          ...options,
          border: { pt: 0.5, color: secondaryColor.replace('#', '') },
          fill: { color: 'F8FAFC' },
          fontSize: cmd.fontSize || 10,
          color: '333333',
          align: 'center',
          valign: 'middle'
        });
      }

      // 4. CHARTS (Native PPT Data Visualization)
      else if (cmd.type === 'chart') {
        const chartType = cmd.chartType || 'bar'; 
        slide.addChart(chartType, cmd.data || [], {
          ...options,
          showTitle: true,
          chartTitle: cmd.title || "",
          chartTitleColor: primaryColor.replace('#', ''),
          chartTitleFontSize: 14,
          dataLabelColor: '333333',
          dataLabelFontSize: 9,
          showLegend: true,
          legendPos: 'b'
        });
      }

      // 5. LINES (Premium Dividers)
      else if (cmd.type === 'line') {
        slide.addShape('line', {
          ...options,
          line: { color: String(cmd.color || secondaryColor).replace('#', ''), width: cmd.width || 1.5, dashType: cmd.dash || 'solid' }
        });
      }
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

    const blueprintPrompt = `ACT AS A SENIOR UI/UX ARCHITECT SPECIALIZED IN MODERN SLIDE DESIGN.
    TASK: Generate a VISUAL BLUEPRINT for a presentation titled: "${config.title}"
    
    BRAND IDENTITY:
    - PRIMARY COLOR: ${primaryColor} (Main Brand Identity)
    - ACCENT COLOR: ${secondaryColor} (Highlight & Action)
    
    STRICT JSON RULES:
    1. ESCAPE ALL DOUBLE QUOTES inside strings (e.g. "text": "He said \\"Hello\\"").
    2. NO RAW NEWLINES inside strings. Use \\n for breaks.
    3. DO NOT ADD MARKDOWN TAGS. Output RAW JSON ONLY.
    
    STRUCTURE RULES:
    1. SLIDE 1 (COVER): MUST use Title: "${config.title}" and Presenter: "${config.presenters.join(', ')}". 
       Design: Use a large "rect" or "oval" as background, set "onBackground" property to trigger contrast calculation.
    2. INTERMEDIATE SLIDES: Mix content (Title + Bullets). Use "chart" or "table" for data-heavy parts.
    3. LAST SLIDE (BIBLIOGRAPHY): MUST use the heading "References" and display: "${bibliographyEntry.replace(/"/g, "'")}".
    
    AESTHETIC SPECS:
    - "shape": { "kind": "rect"|"oval"|"triangle", "shadow": true, "radius": 0.3 }
    - "text": { "bold": true, "onBackground": "hex_color_code" }
    - Canvas Size: 10 x 5.625 inches.

    CONTENT SOURCE: ${config.context.substring(0, 10000)}
    LANGUAGE: ${config.language}
    SLIDES: ${config.slidesCount}

    OUTPUT SCHEMA:
    { "slides": [{ "title": "string", "commands": [ { "type": "shape"|"text"|"table"|"chart"|"line", ...options } ] }] }`;

    let aiResText = await callAiProxy('gemini', blueprintPrompt);
    if (!aiResText) throw new Error("AI Synthesis failed.");

    // Sanitasi JSON sebelum di-parse
    const sanitizedJson = sanitizeJsonResponse(aiResText);
    
    let blueprint;
    try {
      blueprint = JSON.parse(sanitizedJson);
    } catch (parseError) {
      console.error("JSON Parse Error. Raw Text Sample:", aiResText.substring(0, 200));
      // Fallback sederhana jika total failure
      blueprint = { slides: [{ title: config.title, commands: [{ type: 'text', text: config.title, x: 1, y: 1, w: 8, h: 2, fontSize: 32, bold: true }] }] };
    }

    if (!blueprint.slides || !Array.isArray(blueprint.slides)) throw new Error("Invalid Blueprint Schema");

    // Eksekusi Rendering
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Applying Premium UI for Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      
      if (sData.commands) {
        executeBlueprintCommands(slide, sData.commands, primaryColor, secondaryColor);
      }

      // Branding Footer
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
