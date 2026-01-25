
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig, DesignStyle } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - XEENAPS BLUEPRINT ARCHITECT V9
 * FOCUS: Safe-JSON protocol, Strict slide count, and Bibliography integration.
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
        // Safe hex conversion
        const bgColor = cmd.onBackground ? String(cmd.onBackground).replace('#', '') : primaryColor;
        const contrastColor = cmd.color || getContrastColor(bgColor);
        
        // Logical Font Scaler: Sebagian besar library auto-fit butuh baseline yang masuk akal
        // Jika box kecil tapi font besar, library akan kesulitan.
        let fontSize = cmd.fontSize || 12;
        if (cmd.text && cmd.text.length > 50 && fontSize > 24) {
          fontSize = 18; // Force smaller start for long text to help auto-shrink
        }

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
  // Improved Luminance calculation
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

    // Generate accurate bibliography string for the final slide
    const bibliographyText = item.bibHarvard || `Reference: ${item.authors?.join(', ')} (${item.year}). ${item.title}.`;
    
    const blueprintPrompt = `YOU ARE A SENIOR UI/UX DESIGNER SPECIALIZED IN PPTXGENJS.
    TASK: CREATE A VISUAL BLUEPRINT FOR A PRESENTATION TITLED: "${config.title}"
    
    DESIGN STYLE: "${designStyle}"
    - Minimalist: Use lots of white space, large titles, thin accent lines.
    - Corporate: Use strict grid layouts, solid color blocks for sidebars, clear headings.
    - Creative: Use overlapping shapes, asymmetrical layouts, bold accent colors.
    - Academic: High density information, very clean hierarchy, structured lists.

    TECHNICAL SPECS:
    - CANVAS: ${CANVAS_W} (W) x ${CANVAS_H} (H) inches.
    - OUTPUT: JSON object with "slides" array.
    - COLORS: Primary (${primaryColor}), Accent (${secondaryColor}).
    
    STRICT SLIDE SEQUENCE (MANDATORY):
    1. SLIDE 1: MUST be the Master Title Slide. Elements: Title ("${config.title}"), Presenters ("${config.presenters.join(', ')}"). Use flexible font sizes.
    2. MIDDLE SLIDES: Synthesize the core insights into ${config.slidesCount - 2} slides.
    3. FINAL SLIDE: MUST be the Bibliography/Reference slide. Content: "${bibliographyText}".

    STRICT JSON PROTOCOL:
    - YOU MUST RETURN EXACTLY ${config.slidesCount} ITEMS IN THE "slides" ARRAY.
    - USE responseMimeType: application/json.
    - DO NOT use markdown code blocks.
    - ESCAPE all double quotes inside string values.
    - ENSURE NO ILLEGAL LINE BREAKS inside string values.

    SOURCE MATERIAL: ${config.context.substring(0, 10000)}
    LANGUAGE: ${config.language}

    COMMAND TYPES:
    - { "type": "shape", "kind": "rect"|"ellipse", "x", "y", "w", "h", "fill": "hex", "radius": number }
    - { "type": "text", "x", "y", "w", "h", "text", "fontSize", "bold", "align": "left"|"center"|"right", "color": "hex", "onBackground": "hex" }
    - { "type": "line", "x", "y", "w", "h", "color": "hex", "width" }

    EXPECTED JSON OUTPUT SCHEMA:
    {
      "slides": [
        { "title": "Slide Title", "commands": [...] }
      ]
    }`;

    let aiResText = await callAiProxy('gemini', blueprintPrompt);
    if (!aiResText) throw new Error("AI Synthesis failed.");

    // Robust JSON Sanitization
    let cleanJson = aiResText.trim();
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }

    let blueprint;
    try {
      blueprint = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("Blueprint Parse Error:", parseErr, "Raw text:", cleanJson);
      // Fallback: If AI fails to provide JSON, we stop to prevent empty presentation
      throw new Error("AI output was not valid JSON. Operation aborted.");
    }

    if (!blueprint.slides || !Array.isArray(blueprint.slides)) throw new Error("Invalid Blueprint Schema");

    // Render Slides berdasarkan AI Blueprint
    // Enforce slide count limit to prevent infinite loops or massive files
    const slidesToRender = blueprint.slides.slice(0, config.slidesCount);

    slidesToRender.forEach((sData: any, idx: number) => {
      onProgress?.(`Rendering Design for Slide ${idx + 1}/${slidesToRender.length}...`);
      const slide = pptx.addSlide();
      
      // Eksekusi layout custom dari AI
      if (sData.commands) {
        executeBlueprintCommands(slide, sData.commands, primaryColor, secondaryColor);
      }

      // Add Global Branding/Footer
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
