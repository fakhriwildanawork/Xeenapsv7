
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS BLUEPRINT ARCHITECT V13 (Premium Edition)
 * Fokus: Modern Aesthetics, Auto-Contrast, Mandatory Cover/Bib, Glassmorphism.
 */

// PPTX Standard Canvas (Inches)
const CANVAS_W = 10;
const CANVAS_H = 5.625;

/**
 * Sanitasi JSON untuk stabilitas parsing
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
 * Algoritma Kontras (WCAG Aware)
 */
const getContrastColor = (hexColor: string): string => {
  const hex = (hexColor || 'FFFFFF').replace('#', '').slice(0, 6);
  const r = parseInt(hex.slice(0, 2), 16) || 255;
  const g = parseInt(hex.slice(2, 4), 16) || 255;
  const b = parseInt(hex.slice(4, 6), 16) || 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '1E293B' : 'FFFFFF'; // Deep Blue-Gray or White
};

/**
 * Eksekutor Blueprint V13 - Desain Modern & Trendy
 */
const executeBlueprintCommands = (slide: any, commands: any[], primaryColor: string, secondaryColor: string) => {
  if (!Array.isArray(commands)) return;
  
  commands.forEach(cmd => {
    try {
      const options: any = {
        x: Number(cmd.x) || 0,
        y: Number(cmd.y) || 0,
        w: Number(cmd.w) || 1,
        h: Number(cmd.h) || 1,
      };

      // 1. TEXT (Modern Typography & Auto-Contrast)
      if (cmd.type === 'text') {
        let textContent = (typeof cmd.text === 'object') ? (cmd.text.content || JSON.stringify(cmd.text)) : String(cmd.text || "");
        
        // Proteksi Kontras: Jika berada di atas background warna
        const bgFill = cmd.onBackground ? String(cmd.onBackground).replace('#', '') : null;
        let textColor = cmd.color ? String(cmd.color).replace('#', '') : primaryColor.replace('#', '');
        
        if (bgFill) {
          textColor = getContrastColor(bgFill).replace('#', '');
        }

        slide.addText(textContent, {
          ...options,
          fontSize: Number(cmd.fontSize) || 12,
          fontFace: 'Inter',
          color: textColor,
          bold: !!cmd.bold,
          align: cmd.align || 'left',
          valign: cmd.valign || 'top',
          wrap: true,
          autoFit: true,
          shadow: cmd.premium ? { type: 'outer', color: '333333', blur: 1, offset: 1, opacity: 0.15 } : undefined
        });
      } 
      
      // 2. SHAPES (Glassmorphism & Rounded UI)
      else if (cmd.type === 'shape') {
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
          rectRadius: Number(cmd.radius) || 0.3, // Modern rounded corners
          shadow: cmd.shadow !== false ? { type: 'outer', color: '000000', blur: 6, offset: 4, opacity: 0.15 } : undefined
        });
      }

      // 3. TABLES (Clean & Pro)
      else if (cmd.type === 'table') {
        let rows = cmd.rows;
        if (!Array.isArray(rows)) rows = [];
        const normalizedRows = rows.map(row => Array.isArray(row) ? row : [String(row)]);

        slide.addTable(normalizedRows, {
          ...options,
          border: { pt: 0.5, color: secondaryColor.replace('#', '') },
          fill: { color: 'F8FAFC' },
          fontSize: Number(cmd.fontSize) || 11,
          color: '1E293B',
          align: 'center',
          valign: 'middle'
        });
      }

      // 4. CHARTS (Modern Visualization)
      else if (cmd.type === 'chart') {
        const chartType = cmd.chartType || 'bar';
        slide.addChart(chartType, cmd.data || [], {
          ...options,
          showTitle: true,
          chartTitle: String(cmd.title || ""),
          chartTitleColor: primaryColor.replace('#', ''),
          chartTitleFontSize: 14,
          showLegend: true,
          legendPos: 'b'
        });
      }

      // 5. LINES (Accent Separators)
      else if (cmd.type === 'line') {
        slide.addShape('line', {
          ...options,
          line: { color: String(cmd.color || secondaryColor).replace('#', ''), width: Number(cmd.width) || 2, dashType: cmd.dash || 'solid' }
        });
      }
    } catch (e) {
      console.warn("V13 Render Warning:", e);
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
    
    onProgress?.("AI Architect is composing premium layouts...");
    
    const bibliographyEntry = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}.`;

    const blueprintPrompt = `ACT AS A SENIOR UI/UX DESIGNER (APPLE/GOOGLE STANDARDS).
    TASK: Generate a PREMIUM VISUAL BLUEPRINT for: "${config.title}"
    
    BRAND GUIDELINES:
    - PRIMARY: #${primaryColor} (Authority, Professionalism)
    - ACCENT: #${secondaryColor} (Energy, Attention, Highlighting)
    
    DESIGN PRINCIPLES:
    1. USE WHITE SPACE: Do not crowd elements.
    2. MODERN UI: Use rounded "shape" (radius: 0.4) and subtle "shadow".
    3. GLASSMORPHISM: For secondary boxes, use "fill" with "opacity": 20 and "glass": true.
    4. AUTO-CONTRAST: Always specify "onBackground": "color" for text on colored shapes.
    
    MANDATORY SLIDE STRUCTURE:
    - SLIDE 1 (COVER): Title: "${config.title}", Presenters: "${config.presenters.join(', ')}". 
      Layout: Centered or Left-split with a large #${primaryColor} background shape.
    - CONTENT SLIDES: High-impact visuals, data tables, or bar charts.
    - FINAL SLIDE (REFERENCES): Title "References". Content: "${bibliographyEntry.replace(/"/g, "'")}".
    
    CONTENT: ${config.context.substring(0, 8000)}
    LANGUAGE: ${config.language}
    SLIDES: ${config.slidesCount}

    OUTPUT SCHEMA (RAW JSON):
    { "slides": [{ "title": "string", "commands": [ { "type": "shape"|"text"|"table"|"chart"|"line", "x": number, "y": number, "w": number, "h": number, "premium": true, ... } ] }] }`;

    let aiResText = await callAiProxy('gemini', blueprintPrompt);
    if (!aiResText) throw new Error("AI Synthesis failed.");

    const sanitizedJson = sanitizeJsonResponse(aiResText);
    
    let blueprint;
    try {
      blueprint = JSON.parse(sanitizedJson);
    } catch (e) {
      console.error("JSON Error. Blueprint recovery active.");
      blueprint = { slides: [{ title: config.title, commands: [{ type: 'text', text: config.title, x: 1, y: 1, w: 8, h: 1, fontSize: 32, bold: true }] }] };
    }

    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Applying Premium UI to Slide ${idx + 1}...`);
      const slide = pptx.addSlide();
      
      if (sData.commands) {
        executeBlueprintCommands(slide, sData.commands, primaryColor, secondaryColor);
      }

      // Branding Footer
      slide.addText(`XEENAPS • PKM ARCHITECT`, {
        x: 0.5, y: 5.35, w: 4, h: 0.2,
        fontSize: 7, fontFace: 'Inter', color: '94A3B8', align: 'left', bold: true
      });
      slide.addText(`PAGE ${idx + 1}`, {
        x: 6, y: 5.35, w: 3.5, h: 0.2,
        fontSize: 7, fontFace: 'Inter', color: '94A3B8', align: 'right', bold: true
      });
    });

    onProgress?.("Packaging to Xeenaps Cloud...");
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
    throw new Error(result.message || "Archive error.");

  } catch (error: any) {
    console.error("Architect V13 Error:", error);
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
