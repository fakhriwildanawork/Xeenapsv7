
import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * PresentationService - THE "GAMMA MASTER" ENGINE V6
 * Strategi: Semantic Blocks, Adaptive Text Scaling, & Word-Wrap Integrity.
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
    // 1. AI PROMPT UPGRADE: MINTA BLOK KONTEN TERSTRUKTUR (Bukan Blob Teks)
    onProgress?.("AI is structuring knowledge blocks...");
    const blueprintPrompt = `ACT AS A HIGH-END EDITORIAL ARCHITECT.
    ANALYZE MATERIAL FOR: "${config.title}"
    SOURCE: ${item.abstract || item.title}
    
    REQUIREMENTS:
    - EXACTLY ${config.slidesCount} SLIDES.
    - STRUCTURE: Each slide MUST have "points" array of objects { "title": "...", "desc": "..." }.
    - CONTENT: Professional, deep, and academic. No generic filler.
    - NO MARKDOWN: Avoid all stars (*), hashes (#), or underscores (_).
    - LAYOUTS: ["MODERN_GRID", "FOCAL_CARD", "SIDEBAR_DETAIL", "IMPACT_QUOTE"].
    - LANGUAGE: ${config.language}.
    - OUTPUT RAW JSON ONLY.

    FORMAT:
    {
      "slides": [
        { 
          "slideTitle": "Strategic Insights", 
          "points": [
            { "title": "Key Concept", "desc": "Deep detailed explanation of the concept." }
          ],
          "layout": "MODERN_GRID"
        }
      ]
    }`;

    let aiResText = await callAiProxy('groq', blueprintPrompt);
    if (!aiResText) throw new Error("AI failed.");

    if (aiResText.includes('{')) {
      const start = aiResText.indexOf('{');
      const end = aiResText.lastIndexOf('}');
      if (start !== -1 && end !== -1) aiResText = aiResText.substring(start, end + 1);
    }

    let blueprint = JSON.parse(aiResText || '{"slides":[]}');
    if (blueprint.presentation && blueprint.presentation.slides) blueprint = blueprint.presentation;
    
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';

    const primaryColor = (config.theme.primaryColor || '004A74').replace('#', '');
    const secondaryColor = (config.theme.secondaryColor || 'FED400').replace('#', '');
    const FONT_MAIN = 'Poppins';
    const BG_CLEAN = 'F8FAFC';

    // HELPER: CLEAN & WORD-WRAP PROTECT
    const clean = (t: string) => t.replace(/[\*_#]/g, '').trim();

    // HELPER: SMART FONT SIZER FOR BLOCKS
    const getBlockFontSize = (text: string, areaW: number, areaH: number) => {
      const len = text.length;
      const capacity = areaW * areaH * 45; // Heuristic for Poppins font
      if (len > capacity) return 9;
      if (len > capacity * 0.7) return 10.5;
      if (len > capacity * 0.4) return 12;
      return 13;
    };

    // --- SLIDE 1: COVER ---
    const slide1 = pptx.addSlide();
    slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: primaryColor } });
    slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 2.5, w: 10, h: 0.1, fill: { color: secondaryColor } });
    slide1.addText(clean(config.title).toUpperCase(), { x: 1, y: 1, w: 8, h: 1.4, fontSize: 32, fontFace: FONT_MAIN, color: 'FFFFFF', bold: true, align: 'center', lineSpacing: 38 });
    slide1.addText(config.presenters.join(' • '), { x: 1, y: 2.8, w: 8, h: 0.5, fontSize: 12, fontFace: FONT_MAIN, color: 'FFFFFF', align: 'center', bold: true, charSpacing: 2 });

    // --- CONTENT ENGINE V6 ---
    blueprint.slides.forEach((s: any, idx: number) => {
      const slide = pptx.addSlide();
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: BG_CLEAN } });

      // Title Section (Clean, Anti-Collision)
      slide.addText(clean(s.slideTitle).toUpperCase(), { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 22, fontFace: FONT_MAIN, color: primaryColor, bold: true });
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.85, w: 1.5, h: 0.04, fill: { color: secondaryColor } });

      if (s.layout === 'MODERN_GRID' || !s.layout) {
        // Grid System: 2-Column Points
        const points = s.points || [];
        points.forEach((p: any, pIdx: number) => {
          if (pIdx > 3) return; // Max 4 blocks
          const col = pIdx % 2;
          const row = Math.floor(pIdx / 2);
          const xPos = col === 0 ? 0.5 : 5.1;
          const yPos = row === 0 ? 1.2 : 3.3;
          const wSize = 4.4;
          const hSize = 2.0;

          // Card Background with Padding-Aware Shape
          slide.addShape(pptx.ShapeType.roundRect, { x: xPos, y: yPos, w: wSize, h: hSize, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.15 });
          slide.addShape(pptx.ShapeType.rect, { x: xPos + 0.1, y: yPos + 0.2, w: 0.04, h: 0.4, fill: { color: primaryColor } });

          // Block Title
          slide.addText(clean(p.title), { x: xPos + 0.25, y: yPos + 0.15, w: wSize - 0.4, h: 0.5, fontSize: 13, fontFace: FONT_MAIN, color: primaryColor, bold: true, wrap: true });
          
          // Block Desc (with Word-Wrap Lock)
          const descText = clean(p.desc);
          slide.addText(descText, { 
            x: xPos + 0.25, y: yPos + 0.6, w: wSize - 0.5, h: hSize - 0.8, 
            fontSize: getBlockFontSize(descText, wSize, hSize), 
            fontFace: FONT_MAIN, color: '475569', 
            valign: 'top', align: 'left', wrap: true, lineSpacing: 22 
          });
        });
      } 
      else if (s.layout === 'FOCAL_CARD') {
        // Single Huge Insight Card
        const p = (s.points && s.points[0]) || { title: "", desc: "" };
        slide.addShape(pptx.ShapeType.roundRect, { x: 1, y: 1.2, w: 8, h: 3.8, fill: { color: primaryColor }, rectRadius: 0.2 });
        slide.addText(clean(p.title).toUpperCase(), { x: 1.5, y: 1.6, w: 7, h: 0.8, fontSize: 20, fontFace: FONT_MAIN, color: secondaryColor, bold: true, align: 'center' });
        slide.addText(clean(p.desc), { x: 1.5, y: 2.4, w: 7, h: 2.2, fontSize: 14, fontFace: FONT_MAIN, color: 'FFFFFF', align: 'center', valign: 'top', wrap: true, lineSpacing: 28 });
      }

      // Safe Footer
      slide.addText(`XEENAPS • PAGE ${idx + 2}`, { x: 0.5, y: 5.3, w: 9, h: 0.2, fontSize: 7, fontFace: FONT_MAIN, color: 'CBD5E1', align: 'right', bold: true });
    });

    // --- SLIDE AKHIR: BIBLIOGRAPHY ---
    const lastSlide = pptx.addSlide();
    lastSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: 'F8FAFC' } });
    lastSlide.addText("BIBLIOGRAPHY", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 24, fontFace: FONT_MAIN, color: primaryColor, bold: true });
    const cite = item.bibHarvard || `${item.authors?.join(', ')} (${item.year}). ${item.title}.`;
    lastSlide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.5, w: 9, h: 2.5, fill: { color: 'FFFFFF' }, line: { color: primaryColor, width: 1 }, rectRadius: 0.2 });
    lastSlide.addText(clean(cite), { x: 0.9, y: 1.9, w: 8.2, h: 1.7, fontSize: 13, fontFace: FONT_MAIN, color: '334155', italic: true, wrap: true, lineSpacing: 24 });

    onProgress?.("Exporting Master Copy...");
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
      body: JSON.stringify({ action: 'savePresentation', presentation: presentationData, pptxFileData: base64Pptx })
    });

    const result = await res.json();
    if (result.status === 'success') return result.data;
    throw new Error("Save Failed");
  } catch (error) {
    console.error("Engine V6 Error:", error);
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
