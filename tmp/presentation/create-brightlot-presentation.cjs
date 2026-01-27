const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const SLIDES_DIR = path.join(__dirname, 'slides');
const OUTPUT_FILE = path.join(__dirname, 'Holistic-SEO-Workbench-Brightlot.pptx');

// Brightlot Brand Colors
const COLORS = {
  primary: 'FE3B1F',      // Brightlot Orange/Red
  primaryDark: 'D62D14',  // Darker orange for contrast
  dark: '131415',         // Almost black
  darkAlt: '243B42',      // Dark teal-navy
  white: 'FFFFFF',
  light: 'F5F5F5',        // Off-white
  text: '131415',         // Dark text
  textLight: '6B7280',    // Gray text
  success: '10B981',      // Green for positive metrics
  accent: 'FE3B1F',       // Same as primary for consistency
};

// Create gradient background image
async function createGradientBg(filename, color1, color2, direction = 'diagonal') {
  const gradientDef = direction === 'diagonal'
    ? 'x1="0%" y1="0%" x2="100%" y2="100%"'
    : direction === 'vertical'
    ? 'x1="0%" y1="0%" x2="0%" y2="100%"'
    : 'x1="0%" y1="0%" x2="100%" y2="0%"';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
    <defs>
      <linearGradient id="g" ${gradientDef}>
        <stop offset="0%" style="stop-color:#${color1}"/>
        <stop offset="100%" style="stop-color:#${color2}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(filename);
  return filename;
}

async function createPresentation() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = 'Holistic SEO Workbench - Voor Brightlot';
  pptx.author = 'Holistic SEO Workbench';
  pptx.company = 'Brightlot Vastgoedmarketing';

  // Create gradient backgrounds
  console.log('Creating gradient backgrounds...');
  const gradientDark = path.join(SLIDES_DIR, 'brightlot-dark.png');
  const gradientLight = path.join(SLIDES_DIR, 'brightlot-light.png');
  const gradientAccent = path.join(SLIDES_DIR, 'brightlot-accent.png');

  await createGradientBg(gradientDark, COLORS.dark, COLORS.darkAlt);
  await createGradientBg(gradientLight, COLORS.light, 'E5E7EB');
  await createGradientBg(gradientAccent, COLORS.primary, COLORS.primaryDark, 'diagonal');

  let slideNum = 0;

  // Helper function for slide headers
  function addSlideHeader(slide, title, subtitle = null, bgPath = gradientDark, titleColor = COLORS.primary) {
    slide.addImage({ path: bgPath, x: 0, y: 0, w: 10, h: 5.625 });
    slide.addText(title, {
      x: 0.5, y: 0.2, w: 9, h: 0.5,
      fontSize: 26, fontFace: 'Arial', bold: true, color: titleColor, align: 'center'
    });
    if (subtitle) {
      slide.addText(subtitle, {
        x: 0.5, y: 0.65, w: 9, h: 0.3,
        fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
      });
    }
  }

  // ============================================
  // SLIDE 1: Title Slide
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Title`);
  let slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  // Brightlot branding accent line
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: COLORS.primary }
  });

  slide.addText('HOLISTIC SEO WORKBENCH', {
    x: 0.5, y: 1.3, w: 9, h: 0.7,
    fontSize: 38, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });
  slide.addText('voor', {
    x: 0.5, y: 2.0, w: 9, h: 0.4,
    fontSize: 16, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });
  slide.addText('BRIGHTLOT', {
    x: 0.5, y: 2.35, w: 9, h: 0.7,
    fontSize: 42, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 3.5, y: 3.3, w: 3, h: 0.06, fill: { color: COLORS.primary }
  });

  slide.addText('Meer bezoekers. Meer leads. Meer verkoop.', {
    x: 0.5, y: 3.6, w: 9, h: 0.4,
    fontSize: 18, fontFace: 'Arial', color: COLORS.white, align: 'center'
  });
  slide.addText('AI-gedreven content strategie voor vastgoedmarketing', {
    x: 0.5, y: 4.1, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  // ============================================
  // SLIDE 2: The Challenge for Real Estate Marketing
  // ============================================
  console.log(`Creating Slide ${++slideNum}: The Challenge`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: COLORS.primary }
  });

  slide.addText('DE UITDAGING', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });
  slide.addText('Waarom vastgoedprojecten online onzichtbaar blijven', {
    x: 0.5, y: 0.75, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  const challenges = [
    { title: 'Projectwebsites die niet gevonden worden', desc: 'Google toont concurrenten of Funda in plaats van uw project' },
    { title: 'Content die niet converteert', desc: 'Bezoekers verlaten de site zonder contact op te nemen' },
    { title: 'Tijdrovende content creatie', desc: 'Elke woning, elk project vraagt unieke beschrijvingen' },
    { title: 'Geen inzicht in wat werkt', desc: 'Onduidelijk welke content leads genereert' }
  ];

  challenges.forEach((c, i) => {
    const y = 1.2 + (i * 1.0);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: y, w: 8.4, h: 0.85,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 1 },
      rectRadius: 0.08
    });
    slide.addText(c.title, {
      x: 1.0, y: y + 0.12, w: 7.5, h: 0.35,
      fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.white
    });
    slide.addText(c.desc, {
      x: 1.0, y: y + 0.47, w: 7.5, h: 0.3,
      fontSize: 11, fontFace: 'Arial', color: COLORS.textLight
    });
  });

  // ============================================
  // SLIDE 3: The Solution
  // ============================================
  console.log(`Creating Slide ${++slideNum}: The Solution`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientAccent, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('DE OPLOSSING', {
    x: 0.5, y: 0.8, w: 9, h: 0.4,
    fontSize: 18, fontFace: 'Arial', color: 'FFE0DC', align: 'center'
  });
  slide.addText('Holistic SEO Workbench', {
    x: 0.5, y: 1.2, w: 9, h: 0.7,
    fontSize: 36, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 3.5, y: 2.0, w: 3, h: 0.05, fill: { color: COLORS.white }
  });
  slide.addText('Een platform dat:', {
    x: 0.5, y: 2.3, w: 9, h: 0.4,
    fontSize: 14, fontFace: 'Arial', color: COLORS.white, align: 'center'
  });

  const solutions = [
    'Projectwebsites laat scoren in Google (organisch verkeer)',
    'Woningbeschrijvingen genereert die converteren',
    'Content schaalt voor meerdere projecten tegelijk',
    'Inzicht geeft in wat werkt en wat niet'
  ];

  solutions.forEach((s, i) => {
    slide.addText('+ ' + s, {
      x: 2.0, y: 2.85 + (i * 0.5), w: 6, h: 0.4,
      fontSize: 14, fontFace: 'Arial', color: COLORS.white
    });
  });

  // ============================================
  // SLIDE 4: Results & KPIs
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Results & KPIs`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: COLORS.primary }
  });

  slide.addText('RESULTATEN DIE TELLEN', {
    x: 0.5, y: 0.25, w: 9, h: 0.5,
    fontSize: 26, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });

  const kpis = [
    { num: '+300%', label: 'Organisch verkeer', desc: 'Meer bezoekers via Google' },
    { num: '+85%', label: 'Conversie', desc: 'Meer leads per bezoeker' },
    { num: '80%', label: 'Tijdsbesparing', desc: 'Content creatie' },
    { num: '129+', label: 'Kwaliteitsregels', desc: 'Automatische checks' }
  ];

  kpis.forEach((k, i) => {
    const x = 0.5 + (i * 2.4);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 0.95, w: 2.2, h: 1.9,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 2 },
      rectRadius: 0.12
    });
    slide.addText(k.num, {
      x: x, y: 1.1, w: 2.2, h: 0.7,
      fontSize: 32, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
    });
    slide.addText(k.label, {
      x: x, y: 1.8, w: 2.2, h: 0.4,
      fontSize: 11, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(k.desc, {
      x: x, y: 2.2, w: 2.2, h: 0.35,
      fontSize: 9, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
    });
  });

  // Marketing funnel benefits
  slide.addText('VAN BEZOEKER NAAR KOPER', {
    x: 0.5, y: 3.1, w: 9, h: 0.4,
    fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });

  const funnel = [
    { stage: 'Awareness', metric: 'Google Rankings', icon: '1' },
    { stage: 'Interest', metric: 'Pagina Engagement', icon: '2' },
    { stage: 'Desire', metric: 'Content Kwaliteit', icon: '3' },
    { stage: 'Action', metric: 'Lead Conversie', icon: '4' }
  ];

  funnel.forEach((f, i) => {
    const x = 1.0 + (i * 2.15);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 3.6, w: 2.0, h: 1.4,
      fill: { color: COLORS.primary },
      rectRadius: 0.08
    });
    slide.addText(f.icon, {
      x: x, y: 3.7, w: 2.0, h: 0.4,
      fontSize: 18, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(f.stage, {
      x: x, y: 4.1, w: 2.0, h: 0.35,
      fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(f.metric, {
      x: x, y: 4.45, w: 2.0, h: 0.35,
      fontSize: 9, fontFace: 'Arial', color: 'FFE0DC', align: 'center'
    });
    if (i < 3) {
      slide.addText('>', {
        x: x + 1.95, y: 4.0, w: 0.3, h: 0.5,
        fontSize: 20, fontFace: 'Arial', color: COLORS.textLight
      });
    }
  });

  // ============================================
  // SLIDE 5: ROI for Marketing Agency
  // ============================================
  console.log(`Creating Slide ${++slideNum}: ROI`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientLight, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('ROI VOOR BRIGHTLOT', {
    x: 0.5, y: 0.2, w: 9, h: 0.5,
    fontSize: 26, fontFace: 'Arial', bold: true, color: COLORS.dark, align: 'center'
  });
  slide.addText('Wat betekent dit voor jullie klanten?', {
    x: 0.5, y: 0.65, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  // Per Project ROI
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.4, y: 1.05, w: 4.5, h: 3.5,
    fill: { color: COLORS.white },
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.12 },
    rectRadius: 0.12
  });
  slide.addText('PER PROJECT', {
    x: 0.4, y: 1.2, w: 4.5, h: 0.4,
    fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });

  const perProject = [
    { label: 'Content creatie traditioneel', value: '40 uur', type: 'old' },
    { label: 'Met Holistic SEO Workbench', value: '8 uur', type: 'new' },
    { label: 'Tijdsbesparing', value: '32 uur', type: 'save' },
    { label: 'Extra waarde voor klant', value: 'SEO-ready content', type: 'value' }
  ];

  perProject.forEach((item, i) => {
    const y = 1.7 + (i * 0.65);
    slide.addText(item.label, {
      x: 0.6, y: y, w: 2.8, h: 0.3,
      fontSize: 10, fontFace: 'Arial', color: COLORS.textLight
    });
    slide.addText(item.value, {
      x: 3.4, y: y, w: 1.3, h: 0.3,
      fontSize: 11, fontFace: 'Arial', bold: true,
      color: item.type === 'save' ? COLORS.success : item.type === 'value' ? COLORS.primary : COLORS.dark,
      align: 'right'
    });
  });

  // Agency Scale ROI
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 5.1, y: 1.05, w: 4.5, h: 3.5,
    fill: { color: COLORS.primary },
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.12 },
    rectRadius: 0.12
  });
  slide.addText('AGENCY SCHAAL', {
    x: 5.1, y: 1.2, w: 4.5, h: 0.4,
    fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });
  slide.addText('Bij 10 projecten per jaar:', {
    x: 5.1, y: 1.55, w: 4.5, h: 0.3,
    fontSize: 10, fontFace: 'Arial', color: 'FFE0DC', align: 'center'
  });

  const agencyScale = [
    { label: 'Uren bespaard', value: '320 uur/jaar' },
    { label: 'Extra omzet mogelijk', value: '2-3 projecten' },
    { label: 'Hogere klanttevredenheid', value: 'Meetbare resultaten' },
    { label: 'Nieuwe dienst', value: 'SEO Content Pakket' }
  ];

  agencyScale.forEach((item, i) => {
    const y = 1.95 + (i * 0.65);
    slide.addText(item.label, {
      x: 5.3, y: y, w: 2.5, h: 0.3,
      fontSize: 10, fontFace: 'Arial', color: 'FFE0DC'
    });
    slide.addText(item.value, {
      x: 7.8, y: y, w: 1.6, h: 0.3,
      fontSize: 11, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'right'
    });
  });

  slide.addText('* Investering verdient zich terug binnen eerste project', {
    x: 0.5, y: 4.75, w: 9, h: 0.3,
    fontSize: 9, fontFace: 'Arial', italic: true, color: COLORS.textLight, align: 'center'
  });

  // ============================================
  // SLIDE 6: Use Cases for Real Estate
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Use Cases`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: COLORS.primary }
  });

  slide.addText('TOEPASSINGEN VOOR VASTGOED', {
    x: 0.5, y: 0.2, w: 9, h: 0.5,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });

  const useCases = [
    { title: 'Projectwebsites', examples: ['Landingspaginas per woning', 'Buurtinformatie content', 'FAQ secties voor kopers', 'Duurzaamheid & kenmerken'] },
    { title: 'Nieuwbouw Marketing', examples: ['Fase-specifieke content', 'Wachtlijst paginas', 'Beleggerspaginas', 'Prijslijst content'] },
    { title: 'Verhuur & Beheer', examples: ['Gebiedsinformatie', 'Voorzieningen beschrijvingen', 'Huurders FAQ', 'Community content'] }
  ];

  useCases.forEach((uc, i) => {
    const x = 0.5 + (i * 3.15);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 0.85, w: 3.0, h: 3.8,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 1 },
      rectRadius: 0.1
    });
    slide.addText(uc.title, {
      x: x + 0.15, y: 1.0, w: 2.7, h: 0.4,
      fontSize: 13, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
    });
    uc.examples.forEach((ex, ei) => {
      slide.addText('+ ' + ex, {
        x: x + 0.2, y: 1.5 + (ei * 0.55), w: 2.6, h: 0.4,
        fontSize: 10, fontFace: 'Arial', color: COLORS.white
      });
    });
  });

  slide.addText('Alle content SEO-geoptimaliseerd voor Google vindbaar', {
    x: 0.5, y: 4.9, w: 9, h: 0.3,
    fontSize: 11, fontFace: 'Arial', bold: true, color: COLORS.success, align: 'center'
  });

  // ============================================
  // SLIDE 7: Content Generation Example
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Content Example`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: COLORS.primary }
  });

  slide.addText('VAN BRIEFING TOT PUBLICATIE', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });
  slide.addText('Voorbeeld: Luxe appartementencomplex', {
    x: 0.5, y: 0.6, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  const contentFlow = [
    { step: '1', title: 'Input', desc: 'Project info, doelgroep, USPs, buurt' },
    { step: '2', title: 'Research', desc: 'Concurrentie, zoekgedrag, vragen kopers' },
    { step: '3', title: 'Brief', desc: 'SEO strategie, structuur, call-to-actions' },
    { step: '4', title: 'Content', desc: '9-pass AI generatie met kwaliteitscheck' },
    { step: '5', title: 'Publicatie', desc: 'WordPress-ready, SEO meta, schema' }
  ];

  contentFlow.forEach((cf, i) => {
    const x = 0.3 + (i * 1.9);
    slide.addShape(pptx.shapes.OVAL, {
      x: x + 0.6, y: 1.05, w: 0.6, h: 0.6,
      fill: { color: COLORS.primary }
    });
    slide.addText(cf.step, {
      x: x + 0.6, y: 1.12, w: 0.6, h: 0.5,
      fontSize: 18, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    if (i < 4) {
      slide.addText('>', {
        x: x + 1.35, y: 1.1, w: 0.4, h: 0.5,
        fontSize: 18, fontFace: 'Arial', color: COLORS.textLight
      });
    }
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 1.8, w: 1.85, h: 1.2,
      fill: { color: COLORS.darkAlt },
      rectRadius: 0.08
    });
    slide.addText(cf.title, {
      x: x + 0.1, y: 1.9, w: 1.65, h: 0.35,
      fontSize: 11, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(cf.desc, {
      x: x + 0.1, y: 2.25, w: 1.65, h: 0.65,
      fontSize: 8, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
    });
  });

  // Example output
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.4, y: 3.2, w: 9.2, h: 2.1,
    fill: { color: COLORS.darkAlt },
    line: { color: COLORS.primary, width: 1 },
    rectRadius: 0.08
  });
  slide.addText('VOORBEELD OUTPUT:', {
    x: 0.6, y: 3.35, w: 8.8, h: 0.3,
    fontSize: 10, fontFace: 'Arial', bold: true, color: COLORS.primary
  });
  slide.addText('"Appartement kopen in Amsterdam Zuidas | The Pulse Residences"\n\nDroom je van wonen op een van de meest prestigieuze locaties van Nederland? The Pulse biedt moderne appartementen met panoramisch uitzicht over de Amsterdamse skyline. Ontdek duurzaam wonen gecombineerd met grootstedelijk comfort...', {
    x: 0.6, y: 3.7, w: 8.8, h: 1.4,
    fontSize: 10, fontFace: 'Arial', color: COLORS.white, italic: true
  });

  // ============================================
  // SLIDE 8: Website Audit Features
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Website Audit`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: COLORS.primary }
  });

  slide.addText('WEBSITE AUDIT & OPTIMALISATIE', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });
  slide.addText('Inzicht in wat werkt en wat verbeterd kan worden', {
    x: 0.5, y: 0.55, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  const auditCategories = [
    { name: 'Content Kwaliteit', items: ['Leesbaarheid', 'Relevantie', 'Conversie-elementen', 'Call-to-actions'] },
    { name: 'SEO Technisch', items: ['Meta titels', 'Heading structuur', 'Schema markup', 'Interne links'] },
    { name: 'Conversie', items: ['Lead formulieren', 'Contact opties', 'Urgentie triggers', 'Social proof'] },
    { name: 'Concurrentie', items: ['Ranking analyse', 'Content gaps', 'Zoekwoord kansen', 'SERP features'] }
  ];

  auditCategories.forEach((cat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + (col * 4.7);
    const y = 1.0 + (row * 2.1);

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: y, w: 4.4, h: 1.9,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 1 },
      rectRadius: 0.08
    });
    slide.addText(cat.name, {
      x: x + 0.15, y: y + 0.15, w: 4.1, h: 0.35,
      fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.primary
    });
    cat.items.forEach((item, ii) => {
      slide.addText('+ ' + item, {
        x: x + 0.2, y: y + 0.55 + (ii * 0.32), w: 4, h: 0.3,
        fontSize: 10, fontFace: 'Arial', color: COLORS.white
      });
    });
  });

  // ============================================
  // SLIDE 9: Social & Conversion Optimization
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Social & Conversion`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: COLORS.primary }
  });

  slide.addText('SOCIAL & CONVERSIE OPTIMALISATIE', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });

  // Social Features
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.4, y: 0.8, w: 4.5, h: 2.4,
    fill: { color: COLORS.darkAlt },
    rectRadius: 0.1
  });
  slide.addText('SOCIAL MEDIA READY', {
    x: 0.6, y: 0.95, w: 4.1, h: 0.35,
    fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.primary
  });

  const socialFeatures = [
    'Open Graph tags voor Facebook/LinkedIn',
    'Twitter Card optimalisatie',
    'Instagram-ready afbeelding specs',
    'Social snippet previews',
    'Shareable content structuur'
  ];
  socialFeatures.forEach((sf, i) => {
    slide.addText('+ ' + sf, {
      x: 0.6, y: 1.4 + (i * 0.35), w: 4.1, h: 0.3,
      fontSize: 10, fontFace: 'Arial', color: COLORS.white
    });
  });

  // Conversion Features
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 5.1, y: 0.8, w: 4.5, h: 2.4,
    fill: { color: COLORS.darkAlt },
    rectRadius: 0.1
  });
  slide.addText('CONVERSIE OPTIMALISATIE', {
    x: 5.3, y: 0.95, w: 4.1, h: 0.35,
    fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.primary
  });

  const conversionFeatures = [
    'Featured Snippet targeting',
    'FAQ schema voor Google',
    'Local SEO optimalisatie',
    'Call-to-action plaatsing',
    'Lead magnet content'
  ];
  conversionFeatures.forEach((cf, i) => {
    slide.addText('+ ' + cf, {
      x: 5.3, y: 1.4 + (i * 0.35), w: 4.1, h: 0.3,
      fontSize: 10, fontFace: 'Arial', color: COLORS.white
    });
  });

  // Visitor Journey
  slide.addText('BEZOEKER JOURNEY OPTIMALISATIE', {
    x: 0.5, y: 3.4, w: 9, h: 0.35,
    fontSize: 13, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });

  const journey = [
    { stage: 'Google Zoeken', action: 'SEO Content', color: COLORS.primary },
    { stage: 'Landingspagina', action: 'Relevante Info', color: COLORS.primary },
    { stage: 'Verdieping', action: 'Detail Content', color: COLORS.primary },
    { stage: 'Conversie', action: 'Lead Capture', color: COLORS.success }
  ];

  journey.forEach((j, i) => {
    const x = 0.8 + (i * 2.3);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 3.9, w: 2.1, h: 1.2,
      fill: { color: j.color },
      rectRadius: 0.08
    });
    slide.addText(j.stage, {
      x: x, y: 4.0, w: 2.1, h: 0.4,
      fontSize: 10, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(j.action, {
      x: x, y: 4.4, w: 2.1, h: 0.4,
      fontSize: 9, fontFace: 'Arial', color: 'FFE0DC', align: 'center'
    });
    if (i < 3) {
      slide.addText('>', {
        x: x + 2.0, y: 4.2, w: 0.4, h: 0.5,
        fontSize: 16, fontFace: 'Arial', color: COLORS.textLight
      });
    }
  });

  // ============================================
  // SLIDE 10: AI Features
  // ============================================
  console.log(`Creating Slide ${++slideNum}: AI Features`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: COLORS.primary }
  });

  slide.addText('AI-GESTUURDE CONTENT', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });
  slide.addText('9 optimalisatiepasses voor perfecte content', {
    x: 0.5, y: 0.55, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  const passes = [
    { num: '1', name: 'Draft', desc: 'Initieel concept' },
    { num: '2', name: 'Headers', desc: 'Kop structuur' },
    { num: '3', name: 'Intro', desc: 'Opening optimaal' },
    { num: '4', name: 'Lijsten', desc: 'Scanbare content' },
    { num: '5', name: 'Flow', desc: 'Leesbaarheid' },
    { num: '6', name: 'Micro', desc: 'Taal optimalisatie' },
    { num: '7', name: 'Visueel', desc: 'Afbeeldingen' },
    { num: '8', name: 'Audit', desc: '129+ checks' },
    { num: '9', name: 'Schema', desc: 'Structured data' }
  ];

  passes.forEach((p, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = 0.8 + (col * 3.0);
    const y = 1.0 + (row * 1.4);

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: y, w: 2.8, h: 1.15,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 2 },
      rectRadius: 0.08
    });
    slide.addShape(pptx.shapes.OVAL, {
      x: x + 0.1, y: y + 0.1, w: 0.45, h: 0.45,
      fill: { color: COLORS.primary }
    });
    slide.addText(p.num, {
      x: x + 0.1, y: y + 0.15, w: 0.45, h: 0.35,
      fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(p.name, {
      x: x + 0.6, y: y + 0.15, w: 2.1, h: 0.35,
      fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.white
    });
    slide.addText(p.desc, {
      x: x + 0.1, y: y + 0.6, w: 2.6, h: 0.4,
      fontSize: 9, fontFace: 'Arial', color: COLORS.textLight
    });
  });

  slide.addText('Resultaat: Professionele, SEO-geoptimaliseerde content zonder AI-"smaak"', {
    x: 0.5, y: 5.0, w: 9, h: 0.3,
    fontSize: 11, fontFace: 'Arial', bold: true, color: COLORS.success, align: 'center'
  });

  // ============================================
  // SLIDE 11: Integration & Workflow
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Integration`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: COLORS.primary }
  });

  slide.addText('NAADLOZE INTEGRATIE', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });
  slide.addText('Past in jullie bestaande workflow', {
    x: 0.5, y: 0.55, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  const integrations = [
    { name: 'WordPress', desc: 'Direct publiceren naar projectsites' },
    { name: 'Multi-AI', desc: 'OpenAI, Gemini, Claude - kies zelf' },
    { name: 'Export', desc: 'HTML, Markdown, of direct naar CMS' },
    { name: 'Team', desc: 'Meerdere gebruikers, projecten apart' }
  ];

  integrations.forEach((int, i) => {
    const x = 0.5 + (i * 2.4);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 1.0, w: 2.2, h: 1.8,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 1 },
      rectRadius: 0.1
    });
    slide.addText(int.name, {
      x: x, y: 1.2, w: 2.2, h: 0.4,
      fontSize: 13, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
    });
    slide.addText(int.desc, {
      x: x + 0.1, y: 1.7, w: 2.0, h: 0.8,
      fontSize: 9, fontFace: 'Arial', color: COLORS.white, align: 'center'
    });
  });

  // Workflow diagram
  slide.addText('BRIGHTLOT WORKFLOW', {
    x: 0.5, y: 3.0, w: 9, h: 0.35,
    fontSize: 13, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });

  const workflow = [
    'Klant Briefing',
    'Strategy Setup',
    'Content Generatie',
    'Review & Aanpassing',
    'Publicatie'
  ];

  workflow.forEach((step, i) => {
    const x = 0.5 + (i * 1.9);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 3.5, w: 1.75, h: 0.7,
      fill: { color: i === 2 ? COLORS.primary : COLORS.darkAlt },
      line: { color: COLORS.primary, width: 1 },
      rectRadius: 0.06
    });
    slide.addText(step, {
      x: x, y: 3.62, w: 1.75, h: 0.5,
      fontSize: 9, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    if (i < 4) {
      slide.addText('>', {
        x: x + 1.7, y: 3.55, w: 0.3, h: 0.5,
        fontSize: 14, fontFace: 'Arial', color: COLORS.textLight
      });
    }
  });

  slide.addText('Content Generatie = waar de magie gebeurt', {
    x: 0.5, y: 4.4, w: 9, h: 0.3,
    fontSize: 10, fontFace: 'Arial', color: COLORS.primary, align: 'center'
  });

  // ============================================
  // SLIDE 12: Success Metrics Dashboard
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Success Metrics`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: COLORS.primary }
  });

  slide.addText('MEETBARE RESULTATEN', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });
  slide.addText('Rapporteer concrete waarde aan jullie klanten', {
    x: 0.5, y: 0.55, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  // Metrics boxes
  const metrics = [
    { category: 'Verkeer', items: ['Organische bezoekers', 'Bouncepercentage', 'Tijd op pagina', 'Paginas per sessie'] },
    { category: 'Rankings', items: ['Google posities', 'Featured snippets', 'Zoekwoord dekking', 'SERP features'] },
    { category: 'Conversie', items: ['Lead formulieren', 'Telefoongesprekken', 'Brochure downloads', 'Bezichtigingen'] },
    { category: 'Content', items: ['Kwaliteitsscore', 'SEO score', 'Leesbaarheid', 'Engagement'] }
  ];

  metrics.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + (col * 4.7);
    const y = 1.0 + (row * 2.15);

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: y, w: 4.4, h: 1.95,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 1 },
      rectRadius: 0.08
    });
    slide.addText(m.category, {
      x: x + 0.15, y: y + 0.12, w: 4.1, h: 0.35,
      fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.primary
    });
    m.items.forEach((item, ii) => {
      slide.addText('+ ' + item, {
        x: x + 0.2, y: y + 0.5 + (ii * 0.35), w: 4, h: 0.3,
        fontSize: 10, fontFace: 'Arial', color: COLORS.white
      });
    });
  });

  // ============================================
  // SLIDE 13: Brightlot Case Example
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Case Example`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: COLORS.primary }
  });

  slide.addText('VOORBEELD: THE PULSE AMSTERDAM', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });
  slide.addText('Hoe Holistic SEO Workbench dit project zou ondersteunen', {
    x: 0.5, y: 0.55, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  // Before/After comparison
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.4, y: 1.0, w: 4.5, h: 3.2,
    fill: { color: COLORS.darkAlt },
    rectRadius: 0.1
  });
  slide.addText('TRADITIONELE AANPAK', {
    x: 0.6, y: 1.15, w: 4.1, h: 0.35,
    fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.textLight
  });

  const traditional = [
    ['Content creatie', '40+ uur'],
    ['SEO onderzoek', '8 uur'],
    ['Copywriting', '20 uur'],
    ['Optimalisatie', '12 uur'],
    ['Totaal', '80+ uur']
  ];
  traditional.forEach((t, i) => {
    slide.addText(t[0], {
      x: 0.6, y: 1.6 + (i * 0.45), w: 2.5, h: 0.35,
      fontSize: 10, fontFace: 'Arial', color: i === 4 ? COLORS.white : COLORS.textLight
    });
    slide.addText(t[1], {
      x: 3.1, y: 1.6 + (i * 0.45), w: 1.3, h: 0.35,
      fontSize: 10, fontFace: 'Arial', bold: i === 4, color: i === 4 ? COLORS.primary : COLORS.white, align: 'right'
    });
  });

  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 5.1, y: 1.0, w: 4.5, h: 3.2,
    fill: { color: COLORS.primary },
    rectRadius: 0.1
  });
  slide.addText('MET HOLISTIC SEO WORKBENCH', {
    x: 5.3, y: 1.15, w: 4.1, h: 0.35,
    fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.white
  });

  const withTool = [
    ['Setup & briefing', '2 uur'],
    ['AI content generatie', '4 uur'],
    ['Review & editing', '6 uur'],
    ['Publicatie', '1 uur'],
    ['Totaal', '13 uur']
  ];
  withTool.forEach((w, i) => {
    slide.addText(w[0], {
      x: 5.3, y: 1.6 + (i * 0.45), w: 2.5, h: 0.35,
      fontSize: 10, fontFace: 'Arial', color: i === 4 ? COLORS.white : 'FFE0DC'
    });
    slide.addText(w[1], {
      x: 7.8, y: 1.6 + (i * 0.45), w: 1.3, h: 0.35,
      fontSize: 10, fontFace: 'Arial', bold: i === 4, color: COLORS.white, align: 'right'
    });
  });

  // Savings highlight
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 2.5, y: 4.4, w: 5, h: 0.9,
    fill: { color: COLORS.success },
    rectRadius: 0.1
  });
  slide.addText('BESPARING: 67 UUR PER PROJECT (84%)', {
    x: 2.5, y: 4.55, w: 5, h: 0.6,
    fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });

  // ============================================
  // SLIDE 14: Getting Started
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Getting Started`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientLight, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('AAN DE SLAG', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, fontFace: 'Arial', bold: true, color: COLORS.dark, align: 'center'
  });

  const steps = [
    { num: '1', title: 'Onboarding', desc: 'Setup van jullie eerste project met begeleiding', time: '1 dag' },
    { num: '2', title: 'Training', desc: 'Team leren werken met het platform', time: '2 uur' },
    { num: '3', title: 'Eerste Project', desc: 'Content genereren voor een live klant', time: '1 week' },
    { num: '4', title: 'Optimalisatie', desc: 'Fine-tuning op basis van resultaten', time: 'Doorlopend' }
  ];

  steps.forEach((s, i) => {
    const x = 0.5 + (i * 2.4);
    slide.addShape(pptx.shapes.OVAL, {
      x: x + 0.85, y: 1.0, w: 0.5, h: 0.5,
      fill: { color: COLORS.primary }
    });
    slide.addText(s.num, {
      x: x + 0.85, y: 1.07, w: 0.5, h: 0.4,
      fontSize: 16, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 1.65, w: 2.2, h: 2.0,
      fill: { color: COLORS.white },
      shadow: { type: 'outer', blur: 6, offset: 3, angle: 45, color: '000000', opacity: 0.1 },
      rectRadius: 0.1
    });
    slide.addText(s.title, {
      x: x + 0.1, y: 1.8, w: 2.0, h: 0.4,
      fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.dark, align: 'center'
    });
    slide.addText(s.desc, {
      x: x + 0.1, y: 2.2, w: 2.0, h: 0.8,
      fontSize: 9, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
    });
    slide.addText(s.time, {
      x: x + 0.1, y: 3.1, w: 2.0, h: 0.35,
      fontSize: 10, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
    });
  });

  slide.addText('Geen langdurige implementatie - direct aan de slag', {
    x: 0.5, y: 4.0, w: 9, h: 0.3,
    fontSize: 11, fontFace: 'Arial', italic: true, color: COLORS.textLight, align: 'center'
  });

  // ============================================
  // SLIDE 15: Investment & Value
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Investment`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: COLORS.primary }
  });

  slide.addText('INVESTERING & WAARDE', {
    x: 0.5, y: 0.2, w: 9, h: 0.5,
    fontSize: 26, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });

  // Value proposition boxes
  const values = [
    { title: 'Professional', price: 'EUR 49/maand', features: ['Onbeperkt projecten', 'Volledige 9-pass systeem', 'WordPress integratie', '129+ kwaliteitsregels', 'Priority support'] },
    { title: 'Enterprise', price: 'Op maat', features: ['Team samenwerking', 'Whitelabel opties', 'Custom integraties', 'Dedicated support', 'Volume korting'], highlight: true }
  ];

  values.forEach((v, i) => {
    const x = 1.5 + (i * 4.0);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 0.9, w: 3.5, h: 3.6,
      fill: { color: v.highlight ? COLORS.primary : COLORS.darkAlt },
      line: v.highlight ? null : { color: COLORS.primary, width: 2 },
      rectRadius: 0.12
    });
    slide.addText(v.title, {
      x: x, y: 1.1, w: 3.5, h: 0.4,
      fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(v.price, {
      x: x, y: 1.5, w: 3.5, h: 0.5,
      fontSize: 22, fontFace: 'Arial', bold: true, color: v.highlight ? COLORS.white : COLORS.primary, align: 'center'
    });
    v.features.forEach((f, fi) => {
      slide.addText('+ ' + f, {
        x: x + 0.3, y: 2.2 + (fi * 0.4), w: 2.9, h: 0.35,
        fontSize: 10, fontFace: 'Arial', color: v.highlight ? 'FFE0DC' : COLORS.white
      });
    });
  });

  slide.addText('+ Eigen AI API keys = geen verborgen kosten, pay-as-you-go', {
    x: 0.5, y: 4.7, w: 9, h: 0.3,
    fontSize: 11, fontFace: 'Arial', color: COLORS.success, align: 'center'
  });

  // ============================================
  // SLIDE 16: Call to Action
  // ============================================
  console.log(`Creating Slide ${++slideNum}: CTA`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientAccent, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('KLAAR OM TE STARTEN?', {
    x: 0.5, y: 1.2, w: 9, h: 0.7,
    fontSize: 38, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 3.5, y: 2.0, w: 3, h: 0.06, fill: { color: COLORS.white }
  });

  slide.addText('Laat ons zien wat Holistic SEO Workbench\nkan betekenen voor Brightlot', {
    x: 0.5, y: 2.3, w: 9, h: 0.8,
    fontSize: 16, fontFace: 'Arial', color: COLORS.white, align: 'center'
  });

  // CTA Boxes
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 1.5, y: 3.3, w: 3.2, h: 1.0,
    fill: { color: COLORS.white },
    rectRadius: 0.1
  });
  slide.addText('DEMO AANVRAGEN', {
    x: 1.5, y: 3.55, w: 3.2, h: 0.5,
    fontSize: 13, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });

  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 5.3, y: 3.3, w: 3.2, h: 1.0,
    fill: { color: 'FFFFFF', transparency: 20 },
    line: { color: COLORS.white, width: 2 },
    rectRadius: 0.1
  });
  slide.addText('GRATIS PROBEREN', {
    x: 5.3, y: 3.55, w: 3.2, h: 0.5,
    fontSize: 13, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });

  slide.addText('holistic-seo-workbench.com', {
    x: 0.5, y: 4.6, w: 9, h: 0.4,
    fontSize: 14, fontFace: 'Arial', color: COLORS.white, align: 'center'
  });

  // ============================================
  // Save Presentation
  // ============================================
  console.log(`\nTotal slides created: ${slideNum}`);
  console.log('Saving presentation...');
  await pptx.writeFile({ fileName: OUTPUT_FILE });
  console.log(`Presentation created: ${OUTPUT_FILE}`);
}

// Run
createPresentation().catch(err => {
  console.error('Error creating presentation:', err);
  process.exit(1);
});
