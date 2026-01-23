
/**
 * XEENAPS PKM - AI INSIGHTER SERVICE (GROQ POWERED)
 * Specialized in deep content analysis, IMRaD+C summary, and terminology explanation.
 */

function handleGenerateInsight(item) {
  try {
    const extractedId = item.extractedJsonId;
    if (!extractedId) return { status: 'error', message: 'No extracted data found to analyze.' };

    // 1. Fetch Extracted Text using specialized Service
    const extractedData = StorageShardService.getJsonContent(extractedId, item.storageNodeUrl);
    if (!extractedData || !extractedData.fullText) {
      return { status: 'error', message: 'Failed to retrieve extracted content from storage.' };
    }

    // 100,000 Characters Limit as requested
    const fullText = extractedData.fullText || "";
    if (fullText.length < 50) {
      return { status: 'error', message: 'Extracted content is too short for analysis.' };
    }

    // 2. Prepare Specialized Prompt (EXTREMELY VERBOSE MODE)
    const prompt = `ACT AS A SENIOR RESEARCH ANALYST AND ACADEMIC INSIGHTER (XEENAPS AI INSIGHTER).
    ANALYZE THE FOLLOWING TEXT FROM A PKM ITEM TITLED "${item.title}".
    RESPONSE LANGUAGE: ENGLISH.

    --- ANALYTICAL REQUIREMENTS ---
    1. RESEARCH METHODOLOGY:
       - Identify the exact methodology used.
       - FORMAT: Use <b>Terminology</b>: Description.
       - If methodology can not be identified at all, return empty
       
    2. SUMMARY LOGIC (EXTREMELY VERBOSE MODE - MINIMUM 500 WORDS):
       - - IF THE TEXT CONTAIN Introduction, Methode, Result, Discussion, Conclusion Structure:
         * Create a highly detailed, comprehensive and long enough (Minimal 3 sentences) summary using IMRaD+C (Introduction, Methods, Results, and Discussion + Conclusion) with our own summarizing style. Do Not copy identically from Asbtract
         * Use only <b> tags for each sub-heading.
         * Use <span style="background-color: #FED40030; color: #004A74; padding: 0 4px; border-radius: 4px;">...</span> to HIGHLIGHT only accurate and important critical terms, core concepts, or statistical significance BUT NOT FOR SUB HEADING
         * Use single <br> to separate subheading with paragraph and Use double breaks to separate paragraph with next sub heading
       - IF NOT A RESEARCH PAPER:
         * Create a VERY COMPREHENSIVE multi-paragraph summary covering all critical points and every critical nuance with our own summarizing style. MUST BE AT LEAST 5-8 LONG PARAGRAPHS.
         * Use <b><i> tags for key findings and major breakthroughs.
         * Use <span style="background-color: #FED40030; color: #004A74; padding: 0 4px; border-radius: 4px;">...</span> to HIGHLIGHT only accurate and important critical terms, core concepts, or statistical significance.
         * Use <br/> for paragraph breaks (Separate every paragraph).

    3. STRENGTHS & WEAKNESSES: 
       - STRICT NARRATIVE HTML FORMAT ONLY. DILARANG MENGGUNAKAN NUMBERING (1, 2, 3) ATAU BULLET POINTS.
       - Template: <b>[Point]</b><br/>[Explanation]<br/><br/>
       - USE only <b> combine with <span style="background-color: #FED40030; color: #004A74; padding: 0 4px; border-radius: 4px;">...</span> RIGIDLY for main key point.
    
    4. UNFAMILIAR TERMINOLOGY (NARRATIVE FORMAT):
       - Explain technical terms one by one comprehensively.
       - STRICT ONE TEMPLATE FOR ALL TERMINOLOGIES, EXACTLY following this rule for every terminology: <b>[Terminology]</b><br/>[Explanation]<br/><br/>
       - DO NOT USE <i>
       - STRICTLY DO NOT USE NUMBERING (1, 2, 3) OR BULLET POINTS FOR THIS PART.

    5. QUICK TIPS: Practical and strategic advice for the user.

    --- FORMATTING RESTRICTIONS (STRICT) ---
    - NO MARKDOWN SYMBOLS (no *, no #). OUTPUT MUST BE RAW JSON.
    - BE ARCHITECTURAL, DEEP, AND PROLIX. NO SURFACE LEVEL ANALYSIS.

    TEXT TO ANALYZE:
    ${fullText.substring(0, 100000)}

    EXPECTED JSON OUTPUT:
    {
      "researchMethodology": "string with HTML",
      "summary": "string with HTML (Min 500 words, multi-paragraph)",
      "strength": "string (narrative HTML format only: <b>Point</b><br/>Def<br/><br/>)",
      "weakness": "string (narrative HTML format only: <b>Point</b><br/>Def<br/><br/>)",
      "unfamiliarTerminology": "string (narrative HTML format only: <b>Term</b><br/>Def<br/><br/>)",
      "quickTipsForYou": "string with HTML"
    }`;

    // 3. Call Groq Service
    const aiResult = callGroqLibrarian(prompt);
    if (aiResult.status !== 'success') return aiResult;

    // 4. Robust JSON Extraction & Normalization
    let rawData = aiResult.data;
    const jsonMatch = rawData.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return a valid JSON object.");
    
    const rawInsights = JSON.parse(jsonMatch[0]);
    
    // Normalization Layer: Map synonyms to correct keys
    const insights = {
      researchMethodology: rawInsights.researchMethodology || rawInsights.methodology || "",
      summary: rawInsights.summary || rawInsights.abstract_summary || "",
      strength: rawInsights.strength || rawInsights.strengths || "",
      weakness: rawInsights.weakness || rawInsights.weaknesses || "",
      unfamiliarTerminology: rawInsights.unfamiliarTerminology || rawInsights.terminology || "",
      quickTipsForYou: rawInsights.quickTipsForYou || rawInsights.tips || ""
    };

    const newUpdatedAt = new Date().toISOString();

    // 5. Persistence: Update insight_[id].json Shard
    if (item.insightJsonId) {
      const insightContent = JSON.stringify(insights);
      const currentUrl = ScriptApp.getService().getUrl();
      const isLocal = !item.storageNodeUrl || item.storageNodeUrl === "" || item.storageNodeUrl === currentUrl;

      if (isLocal) {
        DriveApp.getFileById(item.insightJsonId).setContent(insightContent);
      } else {
        UrlFetchApp.fetch(item.storageNodeUrl, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ 
            action: 'saveJsonFile', 
            fileName: `insight_${item.id}.json`, 
            content: insightContent, 
            folderId: CONFIG.FOLDERS.MAIN_LIBRARY 
          })
        });
      }
    }

    // 6. SYNC SPREADSHEET: Update updatedAt only (without narrative content)
    // prepare a shallow copy for spreadsheet update
    const spreadsheetItem = { ...item, updatedAt: newUpdatedAt };
    saveToSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", spreadsheetItem);

    return { 
      status: 'success', 
      data: { 
        ...insights, 
        updatedAt: newUpdatedAt 
      } 
    };

  } catch (err) {
    console.error("Insighter Error: " + err.toString());
    return { status: 'error', message: 'Insighter Error: ' + err.toString() };
  }
}
