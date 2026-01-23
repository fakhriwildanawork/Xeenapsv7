
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - TEXT ONLY "GAMMA-STYLE" EDITION
 * Fokus: Menghilangkan seluruh ketergantungan pada gambar (CORS/Proxy) 
 * untuk memastikan slide terisi dan memvalidasi alur builder.
 */
export const createPresentationWorkflow = async (
  item: LibraryItem,
  config: {
    title: string;
    context: string;
    presenters: string[];
    template: PresentationTemplate;
    theme: PresentationThemeConfig;
    slidesCount: number;
    language: string;
  },
  onProgress?: (stage: string) => void
): Promise<PresentationItem | null> => {
  try {
    // 1. GENERATE BLUEPRINT (Materi Slide)
    onProgress?.("Generating AI Blueprint...");
    const blueprintPrompt = `ACT AS AN EXPERT PRESENTATION DESIGNER.
    CREATE A DETAILED PRESENTATION BLUEPRINT IN JSON FORMAT FOR: "${config.title}"
    SOURCE MATERIAL: ${item.abstract || item.title}
    ADDITIONAL CONTEXT: ${config.context}
    
    REQUIREMENTS:
    - EXACTLY ${config.slidesCount} CONTENT SLIDES (Excluding Title & Reference).
    - LANGUAGE: ${config.language}.
    - FOR EACH SLIDE PROVIDE: "title", "content" (detailed bullet points).
    - OUTPUT RAW JSON ONLY.

    FORMAT:
    {
      "slides": [
        { "title": "Slide Title", "content": ["Point 1", "Point 2", "Point 3"] }
      ]
    }`;

    let aiResText = await callAiProxy('groq', blueprintPrompt);
    
    if (!aiResText) throw new Error("AI Proxy failed to return blueprint.");

    // Clean JSON
    if (aiResText.includes('{')) {
      const start = aiResText.indexOf('{');
      const end = aiResText.lastIndexOf('}');
      if (start !== -1 && end !== -1) aiResText = aiResText.substring(start, end + 1);
    }

    let blueprint = JSON.parse(aiResText || '{"slides":[]}');
    if (blueprint.presentation && blueprint.presentation.slides) blueprint = blueprint.presentation;
    if (!blueprint.slides || !Array.isArray(blueprint.slides)) throw new Error("Invalid slide data structure.");
    
    // 2. INITIALIZE PPTX
    onProgress?.("Designing Visual Layout...");
    const pptx = new pptxgen();
    
    // Font Configuration
    const headingFont = config.theme.headingFont || 'Arial';
    const bodyFont = config.theme.fontFamily || 'Arial';
    const primaryColor = config.theme.primaryColor || '004A74';

    // DEFINE MASTER (GEOMETRIC ACCENTS - NO IMAGES)
    pptx.defineSlideMaster({
      title: 'XEENAPS_TEXT_MASTER',
      background: { color: 'FFFFFF' },
      objects: [
        // Top accent line
        { rect: { x: 0.5, y: 0.8, w: 1, h: 0.05, fill: { color: primaryColor } } },
        // Bottom footer accent
        { rect: { x: 0, y: '95%', w: '100%', h: 0.05, fill: { color: primaryColor } } },
        // Subtle Side Vertical Bar (Gamma Style)
        { rect: { x: 0, y: 0, w: 0.1, h: '100%', fill: { color: primaryColor } } },
        { 
          text: { 
            text: "XEENAPS PKM", 
            options: { x: 0.5, y: '96%', fontSize: 8, fontFace: bodyFont, color: 'FFFFFF', align: 'left' } 
          } 
        }
      ]
    });

    // SLIDE 1: COVER (Modern Centered Layout)
    const slide1 = pptx.addSlide({ masterName: 'XEENAPS_TEXT_MASTER' });
    slide1.addText(config.title.toUpperCase(), { 
      x: 1, y: 2, w: '80%', fontSize: 42, fontFace: headingFont, 
      color: primaryColor, bold: true, align: 'center' 
    });
    
    // Decorative separator line under title
    slide1.addShape(pptx.ShapeType.rect, { x: 4, y: 3, w: 2, h: 0.05, fill: { color: primaryColor } });

    slide1.addText(`PRESENTED BY\n${config.presenters.join(', ')}`, { 
      x: 1, y: 3.5, w: '80%', fontSize: 16, fontFace: bodyFont, 
      color: '666666', align: 'center', bold: true 
    });

    // CONTENT SLIDES (Full Text Layout)
    for (const sData of blueprint.slides) {
      onProgress?.(`Assembling: ${sData.title}...`);
      const slide = pptx.addSlide({ masterName: 'XEENAPS_TEXT_MASTER' });
      
      // Slide Heading
      slide.addText(sData.title, { 
        x: 0.5, y: 0.3, w: '90%', fontSize: 32, fontFace: headingFont, 
        color: primaryColor, bold: true 
      });

      // Horizontal Divider
      slide.addShape(pptx.ShapeType.line, { x: 0.5, y: 0.9, w: 9, h: 0, line: { color: primaryColor, width: 2 } });

      // Body Content (Larger Text for Full Width)
      const contentText = Array.isArray(sData.content) ? sData.content.join('\n\n') : String(sData.content);
      slide.addText(contentText, { 
        x: 0.5, y: 1.5, w: '90%', fontSize: 18, fontFace: bodyFont, 
        color: '333333', bullet: { indent: 20 }, valign: 'top', lineSpacing: 28 
      });
    }

    // FINAL SLIDE: SUMMARY & REFERENCE
    const lastSlide = pptx.addSlide({ masterName: 'XEENAPS_TEXT_MASTER' });
    lastSlide.addText("References", { x: 0.5, y: 0.5, fontSize: 28, bold: true, fontFace: headingFont, color: primaryColor });
    lastSlide.addText(`Extracted Source: ${item.title}\nLibrary ID: ${item.id}`, { 
      x: 0.5, y: 1.5, w: '90%', fontSize: 14, fontFace: bodyFont, color: '666666' 
    });
    
    lastSlide.addText("END OF PRESENTATION", { 
      x: 0.5, y: 4, w: '90%', fontSize: 24, fontFace: headingFont, 
      color: primaryColor, bold: true, align: 'center', italic: true 
    });

    // 3. EXPORT TO BASE64
    onProgress?.("Finalizing Cloud Sync...");
    const base64Pptx = await pptx.write({ outputType: 'base64' }) as string;

    // 4. SAVE TO GAS
    const presentationData: Partial<PresentationItem> = {
      id: crypto.randomUUID(),
      collectionIds: [item.id],
      title: config.title,
      presenters: config.presenters,
      templateName: config.template,
      themeConfig: config.theme,
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
    
    throw new Error(result.message || "Failed to save presentation to cloud storage.");
  } catch (error) {
    console.error("Critical Presentation Error:", error);
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
