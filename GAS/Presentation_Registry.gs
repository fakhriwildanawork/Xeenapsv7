
/**
 * XEENAPS PKM - PRESENTATION REGISTRY & NATIVE BUILDER
 */

/**
 * Mendapatkan presentasi yang terkait dengan suatu collectionId
 */
function getPresentationsByCollection(collectionId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PRESENTATION);
    let sheet = ss.getSheetByName("Presentation");
    if (!sheet) {
      setupPresentationRegistry();
      return [];
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colIdsIdx = headers.indexOf('collectionIds');
    
    const results = [];
    const jsonFields = ['collectionIds', 'presenters', 'themeConfig'];

    for (let i = 1; i < data.length; i++) {
      let rowCollectionIds = [];
      try {
        rowCollectionIds = JSON.parse(data[i][colIdsIdx] || '[]');
      } catch (e) {
        rowCollectionIds = [];
      }

      if (rowCollectionIds.includes(collectionId)) {
        let presentation = {};
        headers.forEach((h, j) => {
          let val = data[i][j];
          if (jsonFields.includes(h)) {
            try {
              val = JSON.parse(val || (h === 'presenters' ? '[]' : '{}'));
            } catch (e) {
              val = h === 'presenters' ? [] : {};
            }
          }
          presentation[h] = val;
        });
        results.push(presentation);
      }
    }
    return results;
  } catch (e) {
    console.error("Error fetching related presentations: " + e.toString());
    return [];
  }
}

/**
 * Handle Save Presentation - Support for Blueprint or PPTX
 */
function handleSavePresentation(body) {
  try {
    const { presentation, blueprint, pptxFileData } = body;
    
    const storageTarget = getViableStorageTarget(CONFIG.STORAGE.THRESHOLD);
    if (!storageTarget) throw new Error("Storage full on all nodes.");

    // DELEGASI KE SLAVE JIKA PERLU
    if (!storageTarget.isLocal) {
      const res = UrlFetchApp.fetch(storageTarget.url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          action: 'savePresentation',
          presentation: presentation,
          blueprint: blueprint,
          pptxFileData: pptxFileData
        })
      });
      return JSON.parse(res.getContentText());
    }

    // ALUR NATIVE (BLUEPRINT)
    if (blueprint) {
      presentation.gSlidesId = buildNativeSlidesFromBlueprint(presentation, blueprint, storageTarget.folderId);
    } 
    // ALUR LEGACY (PPTX CONVERSION)
    else if (pptxFileData) {
      const blob = Utilities.newBlob(Utilities.base64Decode(pptxFileData), 'application/vnd.openxmlformats-officedocument.presentationml.presentation', `${presentation.title}.pptx`);
      const resource = { name: presentation.title, mimeType: MimeType.GOOGLE_SLIDES, parents: [storageTarget.folderId] };
      const convertedFile = Drive.Files.create(resource, blob);
      presentation.gSlidesId = convertedFile.id;
    }

    // CATAT KE REGISTRY
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PRESENTATION);
    let sheet = ss.getSheetByName("Presentation");
    if (!sheet) { setupPresentationRegistry(); sheet = ss.getSheetByName("Presentation"); }

    const headers = CONFIG.SCHEMAS.PRESENTATIONS;
    const rowData = headers.map(h => {
      const val = presentation[h];
      return (Array.isArray(val) || (typeof val === 'object' && val !== null)) ? JSON.stringify(val) : (val !== undefined ? val : '');
    });

    sheet.appendRow(rowData);
    return { status: 'success', data: presentation };
  } catch (e) {
    console.error("Save Presentation Error: " + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * THE BUILDER: Native Google Slides Constructor
 */
function buildNativeSlidesFromBlueprint(presentation, blueprint, folderId) {
  const deck = SlidesApp.create(presentation.title);
  const deckId = deck.getId();
  
  // Clean initial slide
  deck.getSlides()[0].remove();

  const primaryColor = '#' + (presentation.themeConfig.primaryColor || '004A74');
  const accentColor = '#' + (presentation.themeConfig.secondaryColor || 'FED400');

  // 1. TITLE SLIDE
  const titleSlide = deck.appendSlide(SlidesApp.PredefinedLayout.TITLE_ONLY);
  const titleBox = titleSlide.getShapes()[0];
  titleBox.getText().setText(presentation.title.toUpperCase());
  titleBox.getText().getTextStyle().setFontSize(36).setBold(true).setForegroundColor(primaryColor);
  titleBox.setTop(150);
  
  const presenterText = titleSlide.insertTextBox(`Presented by: ${presentation.presenters.join(', ')}`);
  presenterText.setTop(220).setLeft(0).setWidth(720).setHeight(30);
  presenterText.getText().getParagraphStyle().setAlignment(SlidesApp.Alignment.CENTER);
  presenterText.getText().getTextStyle().setFontSize(14).setForegroundColor('#666666');

  // 2. CONTENT SLIDES
  blueprint.slides.forEach((sData) => {
    const slide = deck.appendSlide();
    
    // Header
    const header = slide.insertTextBox(sData.title);
    header.setTop(20).setLeft(40).setWidth(640).setHeight(50);
    header.getText().getTextStyle().setFontSize(24).setBold(true).setForegroundColor(primaryColor);

    // Layout Interpretation
    if (sData.layout === 'CARD_GRID' && sData.cards) {
      const cardWidth = 180;
      const cardHeight = 220;
      const spacing = 20;
      let startX = 40;

      sData.cards.slice(0, 3).forEach((card, cIdx) => {
        // Card Shape (Rounded)
        const shape = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, startX, 100, cardWidth, cardHeight);
        shape.getFill().setSolidFill('#F8FAFC');
        shape.getBorder().setTransparent();

        // Card Title
        const cTitle = slide.insertTextBox(card.title, startX + 10, 110, cardWidth - 20, 30);
        cTitle.getText().getTextStyle().setFontSize(12).setBold(true).setForegroundColor(primaryColor);

        // Card Body
        const cBody = slide.insertTextBox(card.body, startX + 10, 145, cardWidth - 20, cardHeight - 50);
        cBody.getText().getTextStyle().setFontSize(10).setForegroundColor('#333333');
        
        startX += cardWidth + spacing;
      });
    } else {
      // DEFAULT / SPLIT CONTENT
      const body = slide.insertTextBox(Array.isArray(sData.content) ? sData.content.join('\n\n') : (sData.content || ""));
      body.setTop(100).setLeft(40).setWidth(400).setHeight(250);
      body.getText().getTextStyle().setFontSize(13).setForegroundColor('#333333');

      if (sData.imageKeyword) {
        try {
          const imgUrl = `https://loremflickr.com/800/600/${encodeURIComponent(sData.imageKeyword)}`;
          slide.insertImage(imgUrl).setTop(100).setLeft(460).setWidth(220).setHeight(220);
        } catch(e) {}
      }
    }
  });

  // 3. FINAL SETUP: Move to target folder
  const file = DriveApp.getFileById(deckId);
  if (folderId) {
    const destFolder = DriveApp.getFolderById(folderId);
    file.moveTo(destFolder);
  }

  return deckId;
}

/**
 * Setup tabel Presentation
 */
function setupPresentationRegistry() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PRESENTATION);
  let sheet = ss.getSheetByName("Presentation");
  if (!sheet) {
    sheet = ss.insertSheet("Presentation");
    const headers = CONFIG.SCHEMAS.PRESENTATIONS;
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  }
}
