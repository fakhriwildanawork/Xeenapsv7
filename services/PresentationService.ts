
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS BLUEPRINT ARCHITECT V12 (Defensive & Rigid)
 * Fokus: Pencegahan [object Object], Normalisasi Tabel & Chart, Robust UI.
 */

const CANVAS_W = 10;
const CANVAS_H = 5.625;

/**
 * Pembersih JSON dengan sanitasi karakter kontrol dan proteksi markdown
 */
const sanitizeJsonResponse = (text: string): string => {
  let cleaned = text.trim();
  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.split('```')[1].split('```')[0].trim();
  }

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return cleaned;
  cleaned = cleaned.substring(start, end + 1);

  return cleaned
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") 
    .replace(/\n/g, "\\n") 
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
};

/**
 * Kontras Dinamis untuk memastikan keterbacaan teks
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
 * Normalisasi Elemen Slide (Defensive Layer)
 */
const executeBlueprintCommands = (slide: any, commands: any[], primaryColor: string, secondaryColor: string) => {
  if (!Array.isArray(commands)) return;
  
  commands.forEach(cmd => {
    try {
      // 0. Base Options Normalization
      const options: any = {
        x: Number(cmd.x) || 0,
        y: Number(cmd.y) || 0,
        w: Number(cmd.w) || 1,
        h: Number(cmd.h) || 1,
      };

      // 1. TEXT (Anti [object Object] Layer)
      if (cmd.type === 'text') {
        let textContent = "";
        if (typeof cmd.text === 'string') {
          textContent = cmd.text;
        } else if (typeof cmd.text === 'object' && cmd.text !== null) {
          textContent = cmd.text.content || cmd.text.text || cmd.text.value || JSON.stringify(cmd.text);
        } else {
          textContent = String(cmd.text || "");
        }

        const bgFill = cmd.onBackground ? String(cmd.onBackground).replace('#', '') : null;
        let textColor = cmd.color ? String(cmd.color).replace('#', '') : primaryColor.replace('#', '');
        if (bgFill) textColor = getContrastColor(bgFill).replace('#', '');
        
        slide.addText(textContent, {
          ...options,
          fontSize: Number(cmd.fontSize) || 12,
          fontFace: 'Inter',
          color: textColor.replace('#', ''),
          bold: !!cmd.bold,
          align: cmd.align || 'left',
          valign: cmd.valign || 'top',
          wrap: true,
          autoFit: true,
          shadow: cmd.shadow ? { type: 'outer', color: '333333', blur: 1, offset: 1, opacity: 0.15 } : undefined
        });
      } 
      
      // 2. SHAPES (Premium Rounded & Shadows)
      else if (cmd.type === 'shape') {
        slide.addShape(cmd.kind || 'rect', {
          ...options,
          fill: { color: String(cmd.fill || primaryColor).replace('#', '') },
          line: cmd.line ? { color: String(cmd.lineColor || secondaryColor).replace('#', ''), width: cmd.lineWidth || 1 } : undefined,
          rectRadius: Number(cmd.radius) || 0.2, 
          opacity: Number(cmd.opacity) || 100,
          shadow: cmd.shadow ? { type: 'outer', color: '666666', blur: 4, offset: 3, opacity: 0.25 } : undefined
        });
      }

      // 3. TABLES (Normalization to Array of Arrays)
      else if (cmd.type === 'table') {
        let rows = cmd.rows;
        if (!Array.isArray(rows)) rows = [];
        
        // Paksa menjadi Array of Arrays (2D Array)
        const normalizedRows = rows.map(row => {
          if (Array.isArray(row)) return row.map(cell => String(cell || ""));
          if (typeof row === 'object' && row !== null) return Object.values(row).map(v => String(v || ""));
          return [String(row || "")];
        });

        if (normalizedRows.length > 0) {
          slide.addTable(normalizedRows, {
            ...options,
            border: { pt: 0.5, color: secondaryColor.replace('#', '') },
            fill: { color: 'F8FAFC' },
            fontSize: Number(cmd.fontSize) || 10,
            color: '1E293B',
            align: 'center',
            valign: 'middle'
          });
        }
      }

      // 4. CHARTS (Normalization to Array of Objects)
      else if (cmd.type === 'chart') {
        let chartData = cmd.data;
        if (!Array.isArray(chartData)) {
          chartData = (typeof chartData === 'object' && chartData !== null) ? [chartData] : [];
        }

        const normalizedData = chartData.map(series => ({
          name: String(series.name || "Data"),
          labels: Array.isArray(series.labels) ? series.labels.map(String) : [],
          values: Array.isArray(series.values) ? series.values.map(v => Number(v) || 0) : []
        }));

        if (normalizedData.length > 0) {
          slide.addChart(cmd.chartType || 'bar', normalizedData, {
            ...options,
            showTitle: true,
            chartTitle: String(cmd.title || ""),
            chartTitleColor: primaryColor.replace('#', ''),
            chartTitleFontSize: 14,
            showLegend: true,
            legendPos: 'b'
          });
        }
      }

      // 5. LINES
      else if (cmd.type === 'line') {
        slide.addShape('line', {
          ...options,
          line: { color: String(cmd.color || secondaryColor).replace('#', ''), width: Number(cmd.width) || 1.5, dashType: cmd.dash || 'solid' }
        });
      }
    } catch (e) {
      console.warn("Element Rendering Ignored due to error:", e);
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
    
    onProgress?.("AI Architect is synthesizing content...");
    
    const bibliographyEntry = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}.`;

    const blueprintPrompt = `ACT AS A SENIOR UI/UX ARCHITECT.
    TASK: Generate a VISUAL BLUEPRINT for: "${config.title}"
    
    STRICT DATA STRUCTURE RULES:
    1. "text": MUST BE A STRING. DO NOT use objects for text values.
    2. "table": "rows" MUST BE AN ARRAY OF ARRAYS. Example: "rows": [["Header"], ["Value"]].
    3. "chart": "data" MUST BE AN ARRAY OF OBJECTS. Example: "data": [{"name": "S1", "labels": ["A"], "values": [10]}].
    4. NO MARKDOWN. NO COMMENTS. RAW JSON ONLY.

    SLIDE STRUCTURE:
    - SLIDE 1: Cover with Title and Presenters: ${config.presenters.join(', ')}.
    - SLIDES 2-${config.slidesCount - 1}: High-impact insights, comparisons (tables), and trends (charts).
    - LAST SLIDE: Bibliography with: "${bibliographyEntry.replace(/"/g, "'")}".

    AESTHETIC: Use ${primaryColor} for backgrounds and ${secondaryColor} for accents.
    CONTENT: ${config.context.substring(0, 8000)}
    LANGUAGE: ${config.language}
    SLIDES: ${config.slidesCount}

    OUTPUT SCHEMA:
    { "slides": [{ "title": "string", "commands": [ { "type": "shape"|"text"|"table"|"chart"|"line", "x": number, "y": number, "w": number, "h": number, ... } ] }] }`;

    let aiResText = await callAiProxy('gemini', blueprintPrompt);
    if (!aiResText) throw new Error("AI failed to respond.");

    const sanitizedJson = sanitizeJsonResponse(aiResText);
    
    let blueprint;
    try {
      blueprint = JSON.parse(sanitizedJson);
    } catch (e) {
      console.error("Critical Parsing Error:", e);
      // Absolute Minimal Fallback
      blueprint = { slides: [{ title: config.title, commands: [{ type: 'text', text: config.title, x: 1, y: 1, w: 8, h: 1, fontSize: 24, bold: true }] }] };
    }

    if (!blueprint.slides || !Array.isArray(blueprint.slides)) throw new Error("Invalid Blueprint Structure");

    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Rendering Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      if (sData.commands) {
        executeBlueprintCommands(slide, sData.commands, primaryColor, secondaryColor);
      }

      slide.addText(`XEENAPS PKM • ${idx + 1}`, {
        x: 0.5, y: 5.35, w: 9, h: 0.2,
        fontSize: 7, fontFace: 'Inter', color: '94A3B8', align: 'right', bold: true
      });
    });

    onProgress?.("Archiving to Xeenaps Cloud...");
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
    throw new Error(result.message || "Failed to save.");

  } catch (error: any) {
    console.error("Blueprint Architect Final Error:", error);
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
