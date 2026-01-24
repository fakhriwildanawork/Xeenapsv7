
/**
 * XEENAPS PKM - GOOGLE SLIDES NATIVE RENDERER
 */

function renderToGoogleSlides(blueprint, config) {
  const slides = blueprint.slides || [];
  const presentation = SlidesApp.create(config.title);
  const deck = presentation.getSlides();
  
  // Remove default first slide
  if (deck.length > 0) deck[0].remove();

  // Color Palette
  const colors = {
    primary: config.theme.primaryColor || '#004A74',
    secondary: config.theme.secondaryColor || '#FED400',
    text: '#111827',
    muted: '#6B7280'
  };

  // --- SLIDE 1: COVER ---
  const cover = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const coverTitle = cover.insertShape(SlidesApp.ShapeType.TEXT_BOX, 50, 100, 620, 150);
  coverTitle.getText().setText(config.title.toUpperCase())
    .getTextStyle().setFontSize(36).setBold(true).setForegroundColor(colors.primary).setFontFamily('Lexend');
  
  const coverPresenter = cover.insertShape(SlidesApp.ShapeType.TEXT_BOX, 50, 250, 620, 50);
  coverPresenter.getText().setText(config.presenters.join(' • '))
    .getTextStyle().setFontSize(12).setForegroundColor(colors.muted).setFontFamily('Inter');

  // --- CONTENT SLIDES ---
  slides.forEach((s) => {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    
    // Title
    const titleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, 30, 640, 50);
    titleBox.getText().setText(s.title)
      .getTextStyle().setFontSize(24).setBold(true).setForegroundColor(colors.primary).setFontFamily('Lexend');

    if (s.layout === 'SPLIT') {
      // Left Column
      const leftBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, 100, 310, 250);
      leftBox.getText().setText(s.content.slice(0, Math.ceil(s.content.length/2)).join('\n'))
        .getTextStyle().setFontSize(12).setLineSpacing(1.5).setFontFamily('Inter');
      
      // Right Column (with accent background)
      const rect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 370, 100, 310, 250);
      rect.getFill().setSolidFill(colors.primary, 0.05);
      rect.getBorder().setTransparent();
      
      const rightBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 380, 110, 290, 230);
      rightBox.getText().setText(s.content.slice(Math.ceil(s.content.length/2)).join('\n'))
        .getTextStyle().setFontSize(12).setLineSpacing(1.5).setFontFamily('Inter');

    } else {
      // DEFAULT / FULL CONTENT
      const contentBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, 100, 640, 250);
      const text = contentBox.getText();
      s.content.forEach(p => {
        text.appendText(p + '\n').getParagraphs().forEach(para => para.setRange(0, para.getRange().getEndIndex()).getTextStyle().setFontSize(13).setFontFamily('Inter'));
      });
    }

    // Footer
    const footer = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, 375, 640, 20);
    footer.getText().setText("XEENAPS PKM • " + config.title)
      .getTextStyle().setFontSize(8).setForegroundColor(colors.muted).setItalic(true);
  });

  return presentation.getId();
}
