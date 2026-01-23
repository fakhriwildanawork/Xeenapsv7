
/**
 * XEENAPS PKM - AI INSIGHTER SERVICE (GROQ POWERED)
 * Specialized in deep content analysis, IMRaD+C summary, and terminology explanation.
 */

function handleGenerateInsight(item) {
  try {
    const extractedId = item.extractedJsonId;
    if (!extractedId) return { status: 'error', message: 'No extracted data found to analyze.' };

    // 1. Fetch Extracted Text from Drive Shard
    const file = DriveApp.getFileById(extractedId);
    const content = JSON.parse(file.getBlob().getDataAsString());
    const fullText = content.fullText || "";

    if (!fullText || fullText.length < 50) {
      return { status: 'error', message: 'Extracted content is too short for analysis.' };
    }

    // 2. Prepare specialized Prompt for Senior Research Analyst
    const categoriesJournal = ["Original Research", "Systematic Review", "Meta-analysis", "Case Report", "Review Article", "Scoping Review", "Rapid Review", "Preprint"];
    const isAcademicJournal = categoriesJournal.includes(item.category);

    const prompt = `ACT AS A SENIOR RESEARCH ANALYST AND ACADEMIC INSIGHTER (XEENAPS AI INSIGHTER).
    ANALYZE THE FOLLOWING TEXT EXTRACTED FROM A PKM ITEM TITLED "${item.title}".

    --- ANALYTICAL REQUIREMENTS ---
    1. RESEARCH METHODOLOGY:
       - Find the methodology specifically within the ABSTRACT section of the text.
       - If found, describe the methodology and its technical terminology (e.g., if it is "Cross-Sectional", explain what that means).
       - FORMAT: Use <b>Terminology</b>: Description.
       - IF NOT FOUND IN ABSTRACT, RETURN AN EMPTY STRING FOR THIS FIELD.

    2. SUMMARY (IMRaD+C):
       - IF CATEGORY IS ACADEMIC JOURNAL ("${item.category}"), YOU MUST USE IMRaD+C STRUCTURE (Introduction, Method, Result, Discussion, Conclusion).
       - EACH SUB-HEADING MUST BE BOLDED USING <b> tag.
       - USE <br/> FOR CLEAN LINE BREAKS.
       - IF NOT AN ACADEMIC JOURNAL, PROVIDE A COMPREHENSIVE SUMMARY IN MULTIPLE PARAGRAPHS COVERING ALL KEY POINTS.
       - NO CHARACTER LIMIT. ENSURE MAXIMUM COMPREHENSION.

    3. STRENGTHS: Analyze the strong points of the text. Return as a numbered list.
    4. WEAKNESSES: Analyze the limitations or weaknesses of the text. Return as a numbered list.
    5. UNFAMILIAR TERMINOLOGY: 
       - Identify non-layman/technical terms.
       - Return as a numbered list.
       - FORMAT: <b>Terminology</b><br/>Explanation of the term.
    6. QUICK TIPS: Provide practical, relevant advice for the user based on the content.

    --- FORMATTING RESTRICTIONS (STRICT) ---
    - DILARANG PAKAI TANDA BINTANG (*) ATAU TANDA KUTIP DUA ('').
    - GUNAKAN TAG <b>, <i>, DAN <br/>.
    - GUNAKAN HIGHLIGHT WARNA UNTUK KATA/ISTILAH PENTING DENGAN: <span style="color: #004A74; font-weight: bold;">Penting</span>.
    - ALL RESPONSES MUST BE IN ENGLISH.
    - OUTPUT MUST BE A RAW JSON OBJECT.

    TEXT TO ANALYZE:
    ${fullText.substring(0, 10000)}

    EXPECTED JSON OUTPUT:
    {
      "researchMethodology": "HTML formatted methodology or empty string",
      "summary": "HTML formatted IMRaD+C or General Summary",
      "strength": "Numbered list of strengths",
      "weakness": "Numbered list of weaknesses",
      "unfamiliarTerminology": "Numbered list of explained terms",
      "quickTipsForYou": "Helpful tips for user"
    }`;

    // 3. Call Groq Service
    const aiResult = callGroqLibrarian(prompt);
    if (aiResult.status !== 'success') return aiResult;

    const insights = JSON.parse(aiResult.data);

    // 4. Persistence: Update insight_[id].json Shard
    if (item.insightJsonId) {
      const insightFile = DriveApp.getFileById(item.insightJsonId);
      insightFile.setContent(JSON.stringify(insights));
    }

    // 5. Persistence: Update Master Spreadsheet
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.LIBRARY);
    const sheet = ss.getSheetByName("Collections");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('id');
    const summaryIdx = headers.indexOf('summary');
    const strengthIdx = headers.indexOf('strength');
    const weaknessIdx = headers.indexOf('weakness');
    const tipsIdx = headers.indexOf('quickTipsForYou');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === item.id) {
        sheet.getRange(i + 1, summaryIdx + 1).setValue(insights.summary);
        sheet.getRange(i + 1, strengthIdx + 1).setValue(insights.strength);
        sheet.getRange(i + 1, weaknessIdx + 1).setValue(insights.weakness);
        sheet.getRange(i + 1, tipsIdx + 1).setValue(insights.quickTipsForYou);
        break;
      }
    }

    return { status: 'success', data: insights };

  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}
