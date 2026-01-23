
/**
 * XEENAPS PKM - AI INSIGHTER SERVICE (GROQ POWERED)
 * Specialized in deep content analysis, IMRaD+C summary, and terminology explanation.
 */

function handleGenerateInsight(item) {
  try {
    const extractedId = item.extractedJsonId;
    if (!extractedId) return { status: 'error', message: 'No extracted data found to analyze.' };

    const nodeUrl = item.storageNodeUrl;
    const currentWebAppUrl = ScriptApp.getService().getUrl();
    const isLocal = !nodeUrl || nodeUrl === "" || nodeUrl === currentWebAppUrl;

    let fullText = "";

    if (isLocal) {
      const file = DriveApp.getFileById(extractedId);
      const contentStr = file.getBlob().getDataAsString();
      const content = JSON.parse(contentStr);
      fullText = content.fullText || "";
    } else {
      try {
        const remoteRes = UrlFetchApp.fetch(nodeUrl + (nodeUrl.indexOf('?') === -1 ? '?' : '&') + "action=getFileContent&fileId=" + extractedId, { 
          muteHttpExceptions: true 
        });
        const resJson = JSON.parse(remoteRes.getContentText());
        if (resJson.status === 'success') {
          const content = JSON.parse(resJson.content);
          fullText = content.content ? JSON.parse(resJson.content).fullText : (content.fullText || "");
        } else {
          throw new Error(resJson.message || "Failed to fetch remote content");
        }
      } catch (remoteErr) {
        return { status: 'error', message: 'Remote Node Access Failed: ' + remoteErr.toString() };
      }
    }

    if (!fullText || fullText.length < 50) {
      return { status: 'error', message: 'Extracted content is too short for analysis.' };
    }

    // MANDATORY: Upgraded Context to 100,000 characters
    const contextText = fullText.substring(0, 100000);

    const prompt = `ACT AS A SENIOR ARCHITECTURAL RESEARCH ANALYST (XEENAPS AI INSIGHTER).
    YOUR GOAL IS TO PROVIDE A DEEP, PROLIX, AND ARCHITECTURAL ANALYSIS OF THE TEXT BELOW.

    --- MANDATORY ANALYTICAL REQUIREMENTS ---
    1. RESEARCH METHODOLOGY:
       - Identify the exact technical methodology used.
       - FORMAT: Use <b>Methodology</b>: Description.
    
    2. ARCHITECTURAL SUMMARY (IMRaD+C STRUCTURE):
       - YOU MUST WRITE MINIMUM 500 WORDS.
       - STRUCTURE: Introduction, Methods, Results, Discussion, Conclusion.
       - STYLE: Prolix, Verbose, and Highly Descriptive Narrative.
       - SUB-HEADINGS: Use ONLY <b>Introduction</b>, <b>Methods</b>, etc.

    3. STRENGTHS & WEAKNESSES:
       - Provide detailed narrative points.

    4. UNFAMILIAR TERMINOLOGY & HIGHLIGHTING:
       - For EVERY technical term, key concept, or specific terminology mentioned in your narrative:
         WRAP IT WITH: <span style="background-color: rgba(254, 212, 0, 0.3); font-weight: bold;">Terminology</span>
       - In the "unfamiliarTerminology" field, provide a detailed explanation for each.

    --- FORMATTING RESTRICTIONS (STRICT) ---
    - DILARANG KERAS MENGGUNAKAN SIMBOL MARKDOWN (* atau # atau ##).
    - GUNAKAN TAG HTML: <b> untuk sub-heading, <br/> untuk baris baru.
    - GUNAKAN TAG SPAN BERIKUT UNTUK HIGHLIGHT ISTILAH: <span style="background-color: rgba(254, 212, 0, 0.3); font-weight: bold;">
    - JANGAN GUNAKAN TANDA KUTIP GANDA DI DALAM VALUE STRING JSON (Gunakan single quote jika perlu).
    - OUTPUT HARUS RAW JSON.

    ITEM TITLE: "${item.title}"
    TEXT TO ANALYZE:
    ${contextText}

    EXPECTED JSON OUTPUT:
    {
      "researchMethodology": "string with HTML",
      "summary": "Verbose narrative min 500 words with HTML sub-headings and span highlights",
      "strength": "Detailed narrative with HTML highlights",
      "weakness": "Detailed narrative with HTML highlights",
      "unfamiliarTerminology": "Detailed list with <b>Term</b><br/>Explanation and span highlights",
      "quickTipsForYou": "string"
    }`;

    const aiResult = callGroqLibrarian(prompt);
    if (aiResult.status !== 'success') return aiResult;

    let rawData = aiResult.data;
    const jsonMatch = rawData.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return a valid JSON object structure.");
    
    const insights = JSON.parse(jsonMatch[0]);

    if (item.insightJsonId) {
      const insightContent = JSON.stringify(insights);
      if (isLocal) {
        DriveApp.getFileById(item.insightJsonId).setContent(insightContent);
      } else {
        // ENHANCED: Pass fileId to remote node to perform overwrite instead of create
        UrlFetchApp.fetch(nodeUrl, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ 
            action: 'saveJsonFile', 
            fileId: item.insightJsonId, // CRITICAL FOR TOTAL REWRITE
            fileName: `insight_${item.id}.json`, 
            content: insightContent, 
            folderId: CONFIG.FOLDERS.MAIN_LIBRARY 
          })
        });
      }
    }

    return { status: 'success', data: insights };

  } catch (err) {
    return { status: 'error', message: 'Insighter Error: ' + err.toString() };
  }
}
