
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS BLUEPRINT ARCHITECT V10
 * Fokus: Premium UI/UX, Smart Contrast, Modern Shapes, Charts & Tables.
 */

const CANVAS_W = 10;
const CANVAS_H = 5.625;

/**
 * Kalkulasi kontras warna secara dinamis
 */
const getContrastColor = (hexColor: string): string => {
  const hex = (hexColor || 'FFFFFF').replace('#', '').slice(0, 6);
  const r = parseInt(hex.slice(0, 2), 16) || 255;
  const g = parseInt(hex.slice(2, 4), 16) || 255;
  const b = parseInt(hex.slice(4, 6), 16) || 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '1E293B' : 'FFFFFF'; // Gelap untuk background terang, Putih untuk background gelap
};

/**
 * Eksekutor Blueprint V10
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

      // 1. SHAPES (Rect, Oval, Triangle, etc)
      if (cmd.type === 'shape') {
        slide.addShape(cmd.kind || 'rect', {
          ...options,
          fill: { color: String(cmd.fill || primaryColor).replace('#', '') },
          line: cmd.line ? { color: String(cmd.lineColor || secondaryColor).replace('#', ''), width: cmd.lineWidth || 1 } : undefined,
          rectRadius: cmd.radius || 0.1, // Rounded corners default
          opacity: cmd.opacity || 100,
          shadow: cmd.shadow ? { type: 'outer', color: '666666', blur: 3, offset: 2, opacity: 0.3 } : undefined
        });
      } 
      
      // 2. TEXT (Modern Typography & Smart Contrast)
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
      
      // 3. TABLES (Data comparison)
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

      // 4. CHARTS (Native PPT Data Visualization)
      else if (cmd.type === 'chart') {
        const chartType = cmd.chartType || 'bar'; // bar, pie, line
        slide.addChart(chartType, cmd.data || [], {
          ...options,
          showTitle: true,
          chartTitle: cmd.title || "",
          chartTitleColor: primaryColor.replace('#', ''),
          chartTitleFontSize: 14,
          dataLabelColor: '333333',
          dataLabelFontSize: 9,
          showLegend: true,
          legendPos: 'b',
          barGapWidthPct: 20
        });
      }

      // 5. LINES (Dividers)
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
    
    // Siapkan data bibliografi untuk slide terakhir
    const bibliographyEntry = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}.`;

    const blueprintPrompt = `ACT AS A SENIOR UI/UX ARCHITECT SPECIALIZED IN MODERN SLIDE DESIGN.
    TASK: Generate a VISUAL BLUEPRINT for a presentation titled: "${config.title}"
    
    BRAND IDENTITY:
    - PRIMARY COLOR: ${primaryColor} (Use for dominance, backgrounds, headers)
    - ACCENT COLOR: ${secondaryColor} (Use for emphasis, icons, lines, key points)
    
    STRUCTURE RULES:
    1. SLIDE 1 (COVER): MUST display TITLE: "${config.title}" and PRESENTERS: "${config.presenters.join(', ')}". Make it bold, modern, and centered/left-aligned with large typography.
    2. LAST SLIDE (BIBLIOGRAPHY): MUST display bibliographic references. Use this text: "${bibliographyEntry}".
    3. INTERMEDIATE SLIDES: Mix content using shapes (rect, oval, triangle), charts (bar, pie, line), and tables where appropriate.
    
    AESTHETIC GUIDELINES:
    - MODERNISM: Use "oval" kind for decorative blobs, "rect" with "radius": 0.3 for card-style layouts.
    - DEPTH: Use "shadow": true for shapes and cards to create layering.
    - CONTRAST: If you place text on a background color, specify "onBackground": "hex" so I can calculate contrast.
    - DECORATION: Add lines and small shapes as "visual sweets" to empty areas.
    
    TECHNICAL SPECS:
    - Canvas: ${CANVAS_W} (W) x ${CANVAS_H} (H) inches.
    - COORDINATES: Use Inches.
    - JSON ONLY: Strictly follow the schema. Escape special characters.
    
    CONTENT SOURCE: ${config.context.substring(0, 10000)}
    LANGUAGE: ${config.language}
    SLIDES: ${config.slidesCount}

    COMMAND TYPES:
    - "shape": { kind: "rect"|"oval"|"triangle", x, y, w, h, fill, radius, shadow: boolean, opacity }
    - "text": { text, x, y, w, h, fontSize, bold, align, color, onBackground, shadow: boolean }
    - "chart": { chartType: "bar"|"pie"|"line", x, y, w, h, title, data: [{ name: "string", labels: [], values: [] }] }
    - "table": { rows: [["Col1", "Col2"]], x, y, w, h }
    - "line": { x, y, w, h, color, width }

    OUTPUT RAW JSON:
    { "slides": [{ "title": "string", "commands": [] }] }`;

    let aiResText = await callAiProxy('gemini', blueprintPrompt);
    if (!aiResText) throw new Error("AI Synthesis failed.");

    // Sanitasi JSON
    const start = aiResText.indexOf('{');
    const end = aiResText.lastIndexOf('}');
    if (start !== -1 && end !== -1) aiResText = aiResText.substring(start, end + 1);

    const blueprint = JSON.parse(aiResText);
    if (!blueprint.slides || !Array.isArray(blueprint.slides)) throw new Error("Invalid Blueprint Schema");

    // Eksekusi Rendering
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Applying Premium UI for Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      
      // Terapkan Blueprint Commands
      if (sData.commands) {
        executeBlueprintCommands(slide, sData.commands, primaryColor, secondaryColor);
      }

      // Branding Footer Tetap Ada
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
