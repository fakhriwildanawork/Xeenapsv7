
/**
 * XEENAPS PKM - AI INSIGHTER SERVICE (GROQ POWERED)
 * Specialized in deep content analysis, IMRaD+C summary, and terminology explanation.
 */

function handleGenerateInsight(item) {
  try {
    const extractedId = item.extractedJsonId;
    if (!extractedId) return { status: 'error', message: 'No extracted data found to analyze.' };

    const nodeUrl = item.storageNodeUrl;
    // FIX: Gunakan URL Web App untuk deteksi lokal yang lebih akurat daripada ScriptId
    const currentWebAppUrl = ScriptApp.getService().getUrl();
    const isLocal = !nodeUrl || nodeUrl === "" || nodeUrl === currentWebAppUrl;

    let fullText = "";

    // 1. Fetch Extracted Text (Local vs Remote Node)
    if (isLocal) {
      console.log("Processing locally on Master Node...");
      const file = DriveApp.getFileById(extractedId);
      const contentStr = file.getBlob().getDataAsString();
      const content = JSON.parse(contentStr);
      fullText = content.fullText || "";
    } else {
      console.log("Fetching remote content from Storage Node: " + nodeUrl);
      // Remote Fetch from Slave Node via doGet/getFileContent
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

    // 2. Prepare specialized Prompt
    const categoriesJournal = ["Original Research", "Systematic Review", "Meta-analysis", "Case Report", "Review Article", "Scoping Review", "Rapid Review", "Preprint"];
    const isAcademicJournal = categoriesJournal.includes(item.category);

    const prompt = `ACT AS A SENIOR RESEARCH ANALYST AND ACADEMIC INSIGHTER (XEENAPS AI INSIGHTER).
    ANALYZE THE FOLLOWING TEXT EXTRACTED FROM A PKM ITEM TITLED "${item.title}".

    --- ANALYTICAL REQUIREMENTS ---
    1. RESEARCH METHODOLOGY:
       - Find the methodology specifically within the ABSTRACT section.
       - Describe it and its technical terminology.
       - FORMAT: Use <b>Terminology</b>: Description.
    2. SUMMARY (IMRaD+C):
       - IF CATEGORY IS ACADEMIC JOURNAL ("${item.category}"), USE IMRaD+C STRUCTURE.
       - EACH SUB-HEADING BOLDED WITH <b> tag.
    3. STRENGTHS: Numbered list.
    4. WEAKNESSES: Numbered list.
    5. UNFAMILIAR TERMINOLOGY: 
       - Technical terms explained in a numbered list.
       - FORMAT: <b>Terminology</b><br/>Explanation.
    6. QUICK TIPS: Practical advice.

    --- FORMATTING RESTRICTIONS (STRICT) ---
    - DILARANG PAKAI TANDA BINTANG (*) ATAU TANDA KUTIP DUA ('').
    - GUNAKAN TAG <b>, <i>, DAN <br/>.
    - NO MARKDOWN SYMBOLS. OUTPUT MUST BE RAW JSON.

    TEXT TO ANALYZE:
    ${fullText.substring(0, 12000)}

    EXPECTED JSON OUTPUT:
    {
      "researchMethodology": "string",
      "summary": "string",
      "strength": "string",
      "weakness": "string",
      "unfamiliarTerminology": "string",
      "quickTipsForYou": "string"
    }`;

    // 3. Call Groq Service
    const aiResult = callGroqLibrarian(prompt);
    if (aiResult.status !== 'success') return aiResult;

    // FIX: Robust JSON Extraction menggunakan Regex untuk menangani AI yang "chatty"
    let rawData = aiResult.data;
    console.log("Raw AI Response: " + rawData);
    
    const jsonMatch = rawData.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI did not return a valid JSON object structure.");
    }
    
    const insights = JSON.parse(jsonMatch[0]);

    // 4. Persistence: Update insight_[id].json Shard (Local/Remote)
    if (item.insightJsonId) {
      const insightContent = JSON.stringify(insights);
      if (isLocal) {
        DriveApp.getFileById(item.insightJsonId).setContent(insightContent);
      } else {
        UrlFetchApp.fetch(nodeUrl, {
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

    console.log("Insights generated and saved successfully.");
    return { status: 'success', data: insights };

  } catch (err) {
    console.error("Insighter Error Log: " + err.toString());
    return { status: 'error', message: 'Insighter Error: ' + err.toString() };
  }
}
