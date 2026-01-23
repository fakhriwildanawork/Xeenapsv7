
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

    // UPGRADE: 100,000 Characters Limit
    const fullText = extractedData.fullText || "";
    if (fullText.length < 50) {
      return { status: 'error', message: 'Extracted content is too short for analysis.' };
    }

    const categoriesJournal = ["Original Research", "Systematic Review", "Meta-analysis", "Case Report", "Review Article", "Scoping Review", "Rapid Review", "Preprint"];
    const isAcademicJournal = categoriesJournal.includes(item.category);

    // 2. Prepare Specialized Prompt (IMRaD+C vs Comprehensive Summary)
    const prompt = `ACT AS A SENIOR RESEARCH ANALYST AND ACADEMIC INSIGHTER (XEENAPS AI INSIGHTER).
    ANALYZE THE FOLLOWING TEXT EXTRACTED FROM A PKM ITEM TITLED "${item.title}".

    --- ANALYTICAL REQUIREMENTS ---
    1. RESEARCH METHODOLOGY:
       - Identify the exact methodology used.
       - FORMAT: Use <b>Terminology</b>: Description.
       
    2. SUMMARY LOGIC:
       - IF THE TEXT IS A RESEARCH PAPER (IMRaD Structure detected):
         * Create a highly detailed summary using IMRaD+C (Introduction, Methods, Results, and Discussion + Conclusion).
         * Use <b> tags for each sub-heading.
       - IF NOT A RESEARCH PAPER:
         * Create a VERY COMPREHENSIVE multi-paragraph summary covering all critical points.
       - STYLING (MANDATORY): 
         * Use <b><i> tags for key findings.
         * Use <span style="background-color: #FED40030; color: #004A74; padding: 0 4px; border-radius: 4px;">...</span> to HIGHLIGHT critical terms, core concepts, or major breakthroughs.
         * Use <br/> for paragraph breaks.

    3. STRENGTHS & WEAKNESSES: Numbered list with technical justification.
    4. UNFAMILIAR TERMINOLOGY: 
       - Explain technical terms in a numbered list.
       - FORMAT: <b>Terminology</b><br/>Explanation.
    5. QUICK TIPS: Practical and strategic advice for the user.

    --- FORMATTING RESTRICTIONS (STRICT) ---
    - DILARANG PAKAI TANDA BINTANG (*) ATAU TANDA KUTIP DUA ('').
    - NO MARKDOWN SYMBOLS. OUTPUT MUST BE RAW JSON.
    - BE ARCHITECTURAL AND DEEP. NO SURFACE LEVEL ANALYSIS.

    TEXT TO ANALYZE:
    ${fullText.substring(0, 100000)}

    EXPECTED JSON OUTPUT:
    {
      "researchMethodology": "string with HTML",
      "summary": "string with HTML",
      "strength": "string (list or text)",
      "weakness": "string (list or text)",
      "unfamiliarTerminology": "string with HTML",
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
    
    // Normalization Layer: Ensure keys match UI requirements
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
