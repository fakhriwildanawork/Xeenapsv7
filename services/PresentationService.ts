
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - THE "ULTIMATE GAMMA" ENGINE V3
 * Strategi: Ultra-Modern Glassmorphism, Poppins Typography, & Hyper-Adaptive Layouts.
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
    // 1. AI PROMPT: MINTA KONTEN YANG KOMPREHENSIF & VERBOSE
    onProgress?.("AI is crafting comprehensive content...");
    const blueprintPrompt = `ACT AS A WORLD-CLASS PRESENTATION DESIGNER & CONTENT STRATEGIST.
    CREATE A DEEP, COMPREHENSIVE PRESENTATION BLUEPRINT IN JSON FORMAT FOR: "${config.title}"
    SOURCE MATERIAL: ${item.abstract || item.title}
    ADDITIONAL CONTEXT: ${config.context}
    
    REQUIREMENTS:
    - EXACTLY ${config.slidesCount} CONTENT SLIDES.
    - CONTENT QUALITY: Be verbose and detailed. Do not just use 2-3 words. Use 3-5 comprehensive bullet points per card.
    - VARIETY: Assign a unique "layoutType" for each slide to maintain visual interest.
    - LAYOUTS: ["MODERN_HERO", "GLASS_SPLIT", "SIDEBAR_DETAIL", "TRIPLE_CARD", "HIGHLIGHT_QUOTE", "FULL_LIST"].
    - LANGUAGE: ${config.language}.
    - OUTPUT RAW JSON ONLY.

    FORMAT:
    {
      "slides": [
        { 
          "title": "Comprehensive Slide Title", 
          "content": ["Detailed explanation point 1...", "Technical insight point 2...", "Practical application 3..."], 
          "layoutType": "GLASS_SPLIT",
          "secondaryTitle": "Contextual subtitle" 
        }
      ]
    }`;

    let aiResText = await callAiProxy('groq', blueprintPrompt);
    if (!aiResText) throw new Error("AI failed to return data.");

    if (aiResText.includes('{')) {
      const start = aiResText.indexOf('{');
      const end = aiResText.lastIndexOf('}');
      if (start !== -1 && end !== -1) aiResText = aiResText.substring(start, end + 1);
    }

    let blueprint = JSON.parse(aiResText || '{"slides":[]}');
    if (blueprint.presentation && blueprint.presentation.slides) blueprint = blueprint.presentation;
    
    // 2. INITIALIZE PPTX
    onProgress?.("Polishing Typography & Shapes...");
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';

    const primaryColor = (config.theme.primaryColor || '004A74').replace('#', '');
    const secondaryColor = (config.theme.secondaryColor || 'FED400').replace('#', '');
    const FONT_MAIN = 'Poppins'; // Standardized modern font
    const FONT_ACCENT = 'Arial'; // Safe fallback

    // ADAPTIVE FONT CALCULATOR (Anti-Overflow)
    const getSafeFontSize = (text: string, maxBase: number, limit: number = 60) => {
      if (text.length > limit * 2.5) return maxBase * 0.45;
      if (text.length > limit * 1.5) return maxBase * 0.6;
      if (text.length > limit) return maxBase * 0.8;
      return maxBase;
    };

    // --- SLIDE 1: PREMIER COVER (MODERN HERO) ---
    const slide1 = pptx.addSlide();
    // Background dynamic shape
    slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: 'F8FAFC' } });
    slide1.addShape(pptx.ShapeType.ellipse, { x: -1, y: -1, w: 4, h: 4, fill: { color: primaryColor, transparency: 92 } });
    slide1.addShape(pptx.ShapeType.ellipse, { x: 7, y: 3, w: 4, h: 4, fill: { color: secondaryColor, transparency: 94 } });

    // Glass Card Cover
    slide1.addShape(pptx.ShapeType.roundRect, { 
      x: 1, y: 1.2, w: 8, h: 3.2, 
      fill: { color: 'FFFFFF', transparency: 10 }, 
      line: { color: primaryColor, width: 1.5 },
      rectRadius: 0.25
    });

    const coverTitleSize = getSafeFontSize(config.title, 34, 40);
    slide1.addText(config.title.toUpperCase(), { 
      x: 1.2, y: 1.5, w: 7.6, h: 1.8, 
      fontSize: coverTitleSize, fontFace: FONT_MAIN, color: primaryColor, 
      bold: true, align: 'center', valign: 'middle'
    });

    slide1.addShape(pptx.ShapeType.rect, { x: 4.5, y: 3.4, w: 1, h: 0.05, fill: { color: secondaryColor } });

    slide1.addText(`PRESENTED BY\n${config.presenters.join(', ')}`, { 
      x: 1, y: 3.8, w: 8, h: 0.5, 
      fontSize: 11, fontFace: FONT_MAIN, color: '64748B', 
      align: 'center', bold: true 
    });

    // --- CONTENT SLIDES ENGINE V3 ---
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Rendering Slide ${idx + 1}: ${sData.layoutType}...`);
      const slide = pptx.addSlide();
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: 'F1F5F9' } });
      
      const titleSize = getSafeFontSize(sData.title, 24, 35);
      const contentText = Array.isArray(sData.content) ? sData.content.join('\n\n') : String(sData.content);

      if (sData.layoutType === 'GLASS_SPLIT') {
        // Layout: Dark Sidebar + Glass Main Card
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.3, y: 0.3, w: 3, h: 5.025, fill: { color: primaryColor }, rectRadius: 0.2 });
        slide.addText(sData.title, { x: 0.5, y: 0.6, w: 2.6, h: 4.4, fontSize: titleSize, fontFace: FONT_MAIN, color: 'FFFFFF', bold: true, valign: 'top' });
        
        slide.addShape(pptx.ShapeType.roundRect, { x: 3.5, y: 0.3, w: 6.2, h: 5.025, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.2 });
        slide.addText(contentText, { x: 3.8, y: 0.6, w: 5.6, h: 4.4, fontSize: 13, fontFace: FONT_MAIN, color: '334155', bullet: { indent: 20 }, lineSpacing: 22 });
      } 
      else if (sData.layoutType === 'MODERN_HERO') {
        // Layout: High Impact Center
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 0.5, w: 8.4, h: 4.6, fill: { color: 'FFFFFF' }, line: { color: primaryColor, width: 2 }, rectRadius: 0.3 });
        slide.addText(sData.title, { x: 1, y: 0.8, w: 8, h: 0.8, fontSize: 28, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'center' });
        slide.addShape(pptx.ShapeType.rect, { x: 4.5, y: 1.6, w: 1, h: 0.04, fill: { color: secondaryColor } });
        slide.addText(contentText, { x: 1.2, y: 1.9, w: 7.6, h: 3, fontSize: 14, fontFace: FONT_MAIN, color: '475569', align: 'center', lineSpacing: 24 });
      }
      else if (sData.layoutType === 'SIDEBAR_DETAIL') {
        // Layout: Left Accent Line + Double Column
        slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.5, w: 0.08, h: 0.8, fill: { color: secondaryColor } });
        slide.addText(sData.title, { x: 0.7, y: 0.5, w: 8.8, h: 0.8, fontSize: 26, fontFace: FONT_MAIN, color: primaryColor, bold: true });
        
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.6, w: 4.4, h: 3.5, fill: { color: 'FFFFFF' }, rectRadius: 0.15 });
        slide.addText(contentText.split('\n\n').slice(0, 2).join('\n\n'), { x: 0.8, y: 1.8, w: 3.8, h: 3.1, fontSize: 12, fontFace: FONT_MAIN, color: '334155', bullet: true });
        
        slide.addShape(pptx.ShapeType.roundRect, { x: 5.1, y: 1.6, w: 4.4, h: 3.5, fill: { color: primaryColor, transparency: 95 }, rectRadius: 0.15 });
        slide.addText(contentText.split('\n\n').slice(2).join('\n\n'), { x: 5.4, y: 1.8, w: 3.8, h: 3.1, fontSize: 12, fontFace: FONT_MAIN, color: primaryColor, bold: true });
      }
      else if (sData.layoutType === 'HIGHLIGHT_QUOTE') {
        // Layout: Single Card with Massive Font Takeaway
        slide.addShape(pptx.ShapeType.roundRect, { x: 1, y: 1, w: 8, h: 3.6, fill: { color: primaryColor }, rectRadius: 0.4 });
        slide.addText(`"${sData.title}"`, { 
          x: 1.5, y: 1.5, w: 7, h: 2.6, 
          fontSize: 32, fontFace: FONT_MAIN, color: 'FFFFFF', 
          italic: true, bold: true, align: 'center', valign: 'middle'
        });
        slide.addText(sData.secondaryTitle || "Key Insight", { x: 1, y: 4.8, w: 8, h: 0.5, fontSize: 10, fontFace: FONT_MAIN, color: primaryColor, bold: true, align: 'center' });
      }
      else {
        // Default: MODERN_LIST (Card with Color Block)
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 0.4, w: 9, h: 4.8, fill: { color: 'FFFFFF' }, rectRadius: 0.2 });
        slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 0.4, w: 9, h: 0.15, fill: { color: primaryColor }, rectRadius: 0.1 });
        slide.addText(sData.title, { x: 0.8, y: 0.8, w: 8.4, h: 0.6, fontSize: 22, fontFace: FONT_MAIN, color: primaryColor, bold: true });
        slide.addText(contentText, { x: 0.8, y: 1.5, w: 8.4, h: 3.4, fontSize: 13, fontFace: FONT_MAIN, color: '334155', bullet: { indent: 20 }, lineSpacing: 24 });
      }

      // Consistent Minimal Footer
      slide.addText(`© XEENAPS • ${idx + 1}`, { x: 0.5, y: 5.3, w: 9, h: 0.2, fontSize: 8, fontFace: FONT_MAIN, color: '94A3B8', align: 'right', bold: true });
    });

    // --- FINAL SLIDE: SUMMARY ---
    const lastSlide = pptx.addSlide();
    lastSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: primaryColor } });
    lastSlide.addText("THANK YOU", { x: 0, y: 2.2, w: 10, h: 1, fontSize: 52, fontFace: FONT_MAIN, color: 'FFFFFF', bold: true, align: 'center' });
    lastSlide.addShape(pptx.ShapeType.rect, { x: 4.5, y: 3.5, w: 1, h: 0.05, fill: { color: secondaryColor } });
    lastSlide.addText(`Material: ${item.title.substring(0, 50)}...`, { x: 1, y: 5, w: 8, h: 0.5, fontSize: 9, fontFace: FONT_MAIN, color: 'FFFFFF', align: 'center' });

    // 3. EXPORT & SAVE
    onProgress?.("Syncing with Xeenaps Cloud...");
    const base64Pptx = await pptx.write({ outputType: 'base64' }) as string;

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
    throw new Error(result.message || "Failed to save.");
  } catch (error) {
    console.error("Presentation Builder Error:", error);
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
