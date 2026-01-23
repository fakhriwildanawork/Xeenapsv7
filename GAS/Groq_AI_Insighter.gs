
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
       
    2. SUMMARY LOGIC (EXTREMELY VERBOSE MODE - MINIMUM 500 WORDS):
       - IF THE TEXT IS A RESEARCH PAPER: Use IMRaD+C (Introduction, Methods, Results, and Discussion + Conclusion).
       - IF NOT: Create a VERY COMPREHENSIVE multi-paragraph summary covering every critical nuance and implication.
       - STYLING (MANDATORY): 
         * Use <b><i> tags for key findings and major breakthroughs.
         * Use <span style="background-color: #FED40030; color: #004A74; padding: 0 4px; border-radius: 4px;">...</span> to HIGHLIGHT critical terms, core concepts, or statistical significance.
         * Use <br/> for paragraph breaks. MUST BE AT LEAST 5-8 LONG PARAGRAPHS.

    3. STRENGTHS & WEAKNESSES: Numbered list with technical justification.
    
    4. UNFAMILIAR TERMINOLOGY (NARRATIVE FORMAT):
       - Explain technical terms one by one.
       - STRICT TEMPLATE: <b>[Terminology]</b><br/>[Explanation]<br/><br/>
       - DILARANG MENGGUNAKAN NUMBERING (1, 2, 3) ATAU BULLET POINTS UNTUK BAGIAN INI.

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
      "strength": "string (list or text)",
      "weakness": "string (list or text)",
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

    return { status: 'success', data: insights };

  } catch (err) {
    console.error("Insighter Error: " + err.toString());
    return { status: 'error', message: 'Insighter Error: ' + err.toString() };
  }
}
