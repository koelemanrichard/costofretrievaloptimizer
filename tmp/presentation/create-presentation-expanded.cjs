const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const SLIDES_DIR = path.join(__dirname, 'slides');
const SCREENSHOTS_DIR = 'D:/www/cost-of-retreival-reducer/docs/help-screenshots';
const OUTPUT_FILE = path.join(__dirname, 'Holistic-SEO-Workbench-Marketing-Expanded.pptx');

// Color palette - Bold/Creative theme
const COLORS = {
  primary: '667EEA',      // Vibrant purple-blue
  secondary: '764BA2',    // Deep purple
  accent: 'F97316',       // Orange
  dark: '1A1A2E',         // Dark navy
  darkAlt: '16213E',      // Slightly lighter navy
  light: 'F8FAFC',        // Off-white
  white: 'FFFFFF',
  success: '10B981',      // Green
  warning: 'F59E0B',      // Amber
  text: '1E293B',         // Dark slate
  textLight: '64748B',    // Light slate
};

// Create gradient background image
async function createGradientBg(filename, color1, color2, direction = 'diagonal') {
  const gradientDef = direction === 'diagonal'
    ? 'x1="0%" y1="0%" x2="100%" y2="100%"'
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
  pptx.title = 'Holistic SEO Workbench - Complete Marketing Presentation';
  pptx.author = 'Holistic SEO Workbench';
  pptx.company = 'Holistic SEO';

  // Create gradient backgrounds
  console.log('Creating gradient backgrounds...');
  const gradientDark = path.join(SLIDES_DIR, 'gradient-dark.png');
  const gradientLight = path.join(SLIDES_DIR, 'gradient-light.png');
  const gradientAccent = path.join(SLIDES_DIR, 'gradient-accent.png');

  await createGradientBg(gradientDark, COLORS.dark, COLORS.darkAlt);
  await createGradientBg(gradientLight, COLORS.light, 'E2E8F0');
  await createGradientBg(gradientAccent, COLORS.primary, COLORS.secondary);

  let slideNum = 0;

  // Helper function for slide headers
  function addSlideHeader(slide, title, subtitle = null, bgPath = gradientDark, titleColor = COLORS.accent) {
    slide.addImage({ path: bgPath, x: 0, y: 0, w: 10, h: 5.625 });
    slide.addText(title, {
      x: 0.5, y: 0.2, w: 9, h: 0.4,
      fontSize: 24, fontFace: 'Arial', bold: true, color: titleColor, align: 'center'
    });
    if (subtitle) {
      slide.addText(subtitle, {
        x: 0.5, y: 0.55, w: 9, h: 0.3,
        fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
      });
    }
  }

  // ============================================
  // SLIDE 1: Title Slide
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Title`);
  let slide = pptx.addSlide();
  slide.addImage({ path: gradientAccent, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('HOLISTIC SEO', {
    x: 0.5, y: 1.5, w: 9, h: 0.8,
    fontSize: 48, fontFace: 'Arial', bold: true, color: COLORS.white,
    align: 'center'
  });
  slide.addText('WORKBENCH', {
    x: 0.5, y: 2.2, w: 9, h: 0.8,
    fontSize: 48, fontFace: 'Arial', bold: true, color: COLORS.white,
    align: 'center'
  });
  slide.addText('Next-Gen SEO Strategy & Content Generation Platform', {
    x: 0.5, y: 3.2, w: 9, h: 0.5,
    fontSize: 20, fontFace: 'Arial', color: COLORS.white,
    align: 'center'
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 3.5, y: 4.2, w: 3, h: 0.08, fill: { color: COLORS.white }
  });
  slide.addText('Dominate Search Results with Semantic SEO', {
    x: 0.5, y: 4.5, w: 9, h: 0.4,
    fontSize: 16, fontFace: 'Arial', color: 'E0E7FF', italic: true,
    align: 'center'
  });

  // ============================================
  // SLIDE 2: The Problem
  // ============================================
  console.log(`Creating Slide ${++slideNum}: The Problem`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('THE SEO STRUGGLE IS REAL', {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 32, fontFace: 'Arial', bold: true, color: COLORS.accent,
    align: 'center'
  });

  const problems = [
    { text: '"What content should I write next?"', desc: 'No clear content strategy or topic prioritization' },
    { text: '"Why isn\'t my content ranking?"', desc: 'Missing semantic relationships and topical authority' },
    { text: '"How do I optimize for featured snippets?"', desc: 'No systematic approach to SERP features' },
    { text: '"AI content feels generic and robotic"', desc: 'Single-pass generation lacks quality control' }
  ];

  problems.forEach((p, i) => {
    const y = 1.2 + (i * 1.0);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: y, w: 8.4, h: 0.85,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 1 },
      rectRadius: 0.1
    });
    slide.addText(p.text, {
      x: 1.0, y: y + 0.1, w: 7, h: 0.35,
      fontSize: 16, fontFace: 'Arial', bold: true, color: COLORS.white
    });
    slide.addText(p.desc, {
      x: 1.0, y: y + 0.45, w: 7, h: 0.3,
      fontSize: 12, fontFace: 'Arial', color: COLORS.textLight
    });
  });

  // ============================================
  // SLIDE 3: The Solution
  // ============================================
  console.log(`Creating Slide ${++slideNum}: The Solution`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientAccent, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('INTRODUCING', {
    x: 0.5, y: 1.0, w: 9, h: 0.4,
    fontSize: 18, fontFace: 'Arial', color: 'E0E7FF', align: 'center'
  });
  slide.addText('Holistic SEO Workbench', {
    x: 0.5, y: 1.4, w: 9, h: 0.8,
    fontSize: 40, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 3.5, y: 2.3, w: 3, h: 0.05, fill: { color: COLORS.white }
  });
  slide.addText('The only SEO platform that combines:', {
    x: 0.5, y: 2.6, w: 9, h: 0.4,
    fontSize: 16, fontFace: 'Arial', color: COLORS.white, align: 'center'
  });

  const features = [
    'Semantic Content Strategy (Entity-Attribute-Value Framework)',
    '9-Pass AI Content Generation with 129+ Quality Audit Rules',
    'Featured Snippet Optimization Built-In',
    'Multi-Provider AI Support (OpenAI, Anthropic, Gemini, & more)'
  ];

  features.forEach((f, i) => {
    slide.addText('✓  ' + f, {
      x: 1.5, y: 3.2 + (i * 0.45), w: 7, h: 0.4,
      fontSize: 14, fontFace: 'Arial', color: COLORS.white
    });
  });

  // ============================================
  // SLIDE 4: Results at a Glance (UPDATED - 129+ rules)
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Results`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('RESULTS YOU CAN EXPECT', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, fontFace: 'Arial', bold: true, color: COLORS.accent, align: 'center'
  });

  const results = [
    { num: '9', label: 'Optimization Passes', desc: 'Per article' },
    { num: '129+', label: 'Audit Rules', desc: 'Quality checks' },
    { num: '17+', label: 'API Services', desc: 'Integrated' },
    { num: '5', label: 'AI Providers', desc: 'Supported' }
  ];

  results.forEach((r, i) => {
    const x = 0.5 + (i * 2.4);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 1.1, w: 2.2, h: 1.8,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 2 },
      rectRadius: 0.15
    });
    slide.addText(r.num, {
      x: x, y: 1.3, w: 2.2, h: 0.7,
      fontSize: 36, fontFace: 'Arial', bold: true, color: COLORS.accent, align: 'center'
    });
    slide.addText(r.label, {
      x: x, y: 2.0, w: 2.2, h: 0.35,
      fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(r.desc, {
      x: x, y: 2.35, w: 2.2, h: 0.3,
      fontSize: 10, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
    });
  });

  // Benefits row
  const benefits = [
    { title: 'Save 80% Time', desc: 'Automate content strategy & generation' },
    { title: 'Rank Higher', desc: 'Semantic SEO methodology built-in' },
    { title: 'Scale Content', desc: 'Batch generation with quality control' }
  ];

  benefits.forEach((b, i) => {
    const x = 1.0 + (i * 2.8);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 3.3, w: 2.6, h: 1.1,
      fill: { color: COLORS.primary }, rectRadius: 0.1
    });
    slide.addText(b.title, {
      x: x, y: 3.45, w: 2.6, h: 0.4,
      fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(b.desc, {
      x: x + 0.1, y: 3.85, w: 2.4, h: 0.45,
      fontSize: 10, fontFace: 'Arial', color: 'E0E7FF', align: 'center'
    });
  });

  // ============================================
  // SLIDE 5: 129+ Content Audit Rules - Overview
  // ============================================
  console.log(`Creating Slide ${++slideNum}: 129+ Audit Rules Overview`);
  slide = pptx.addSlide();
  addSlideHeader(slide, '129+ CONTENT WRITING & AUDIT RULES', 'Comprehensive quality assurance for every piece of content');

  const ruleCategories = [
    { name: 'Algorithmic Audit', count: '31', desc: 'Core SEO checks' },
    { name: 'Semantic/Pillar', count: '5', desc: 'Entity alignment' },
    { name: 'Link Structure', count: '5', desc: 'Internal linking' },
    { name: 'Content Validators', count: '80+', desc: 'Quality rules' },
    { name: 'Technical Rules', count: '6', desc: 'Format checks' },
    { name: 'Visual/Schema', count: '5', desc: 'Rich snippets' }
  ];

  ruleCategories.forEach((cat, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = 0.8 + (col * 3.0);
    const y = 1.0 + (row * 1.9);

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: y, w: 2.8, h: 1.6,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 2 },
      rectRadius: 0.1
    });
    slide.addText(cat.count, {
      x: x, y: y + 0.2, w: 2.8, h: 0.6,
      fontSize: 32, fontFace: 'Arial', bold: true, color: COLORS.accent, align: 'center'
    });
    slide.addText(cat.name, {
      x: x, y: y + 0.8, w: 2.8, h: 0.35,
      fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(cat.desc, {
      x: x, y: y + 1.15, w: 2.8, h: 0.3,
      fontSize: 10, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
    });
  });

  slide.addText('+ 8 Language-specific patterns for multilingual SEO', {
    x: 0.5, y: 5.0, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.success, align: 'center'
  });

  // ============================================
  // SLIDE 6: Audit Rules - Detailed List Page 1
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Audit Rules Detail 1`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'ALGORITHMIC AUDIT RULES (31)', 'Core SEO quality checks applied to every article');

  const algorithmicRules = [
    ['intro-clarity', 'Validates introduction effectiveness'],
    ['heading-hierarchy', 'Ensures proper H1-H6 structure'],
    ['keyword-prominence', 'Checks keyword placement'],
    ['content-depth', 'Validates topic coverage'],
    ['readability-score', 'Flesch-Kincaid scoring'],
    ['sentence-variety', 'Checks sentence length variation'],
    ['paragraph-structure', 'Validates paragraph density'],
    ['transition-words', 'Ensures content flow'],
    ['active-voice', 'Promotes active voice usage'],
    ['entity-mentions', 'Validates entity coverage'],
    ['semantic-density', 'Checks semantic richness'],
    ['anchor-optimization', 'Internal link text quality'],
    ['meta-alignment', 'Title/meta consistency'],
    ['featured-snippet-ready', 'Structured for SERP features'],
    ['question-coverage', 'PAA optimization']
  ];

  algorithmicRules.forEach((rule, i) => {
    const col = i < 8 ? 0 : 1;
    const row = i < 8 ? i : i - 8;
    const x = 0.5 + (col * 4.8);
    const y = 0.95 + (row * 0.55);

    slide.addText(`• ${rule[0]}`, {
      x: x, y: y, w: 1.8, h: 0.35,
      fontSize: 10, fontFace: 'Arial', bold: true, color: COLORS.accent
    });
    slide.addText(rule[1], {
      x: x + 1.8, y: y, w: 3, h: 0.35,
      fontSize: 10, fontFace: 'Arial', color: COLORS.white
    });
  });

  // ============================================
  // SLIDE 7: Audit Rules - Detailed List Page 2
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Audit Rules Detail 2`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'CONTENT VALIDATOR RULES (80+)', 'Quality gates for publication-ready content');

  const validatorCategories = [
    { name: 'Introduction Quality', rules: ['centerpiece-clarity', 'hook-effectiveness', 'thesis-statement'] },
    { name: 'Structural Elements', rules: ['list-optimization', 'table-structure', 'image-placement'] },
    { name: 'Semantic SEO', rules: ['entity-coverage', 'attribute-depth', 'predicate-variety'] },
    { name: 'SERP Features', rules: ['snippet-length', 'answer-format', 'definition-boxes'] },
    { name: 'Link Quality', rules: ['anchor-diversity', 'contextual-relevance', 'authority-signals'] },
    { name: 'Technical', rules: ['word-count', 'unique-value', 'duplicate-detection'] }
  ];

  validatorCategories.forEach((cat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + (col * 4.8);
    const y = 0.95 + (row * 1.5);

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: y, w: 4.5, h: 1.35,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 1 },
      rectRadius: 0.08
    });
    slide.addText(cat.name, {
      x: x + 0.1, y: y + 0.1, w: 4.3, h: 0.3,
      fontSize: 11, fontFace: 'Arial', bold: true, color: COLORS.accent
    });
    cat.rules.forEach((rule, ri) => {
      slide.addText(`• ${rule}`, {
        x: x + 0.15, y: y + 0.45 + (ri * 0.28), w: 4.2, h: 0.25,
        fontSize: 9, fontFace: 'Arial', color: COLORS.white
      });
    });
  });

  // ============================================
  // SLIDE 8: ROI Calculation
  // ============================================
  console.log(`Creating Slide ${++slideNum}: ROI Calculation`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientLight, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('ROI CALCULATOR', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 26, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });
  slide.addText('See the real impact on your content operations', {
    x: 0.5, y: 0.55, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  // Medium Business ROI
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.0, w: 4.4, h: 3.8,
    fill: { color: COLORS.white },
    shadow: { type: 'outer', blur: 6, offset: 3, angle: 45, color: '000000', opacity: 0.15 },
    rectRadius: 0.15
  });
  slide.addText('MEDIUM BUSINESS', {
    x: 0.5, y: 1.1, w: 4.4, h: 0.4,
    fontSize: 16, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });
  slide.addText('20 articles/month', {
    x: 0.5, y: 1.45, w: 4.4, h: 0.3,
    fontSize: 11, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  const mediumROI = [
    ['Traditional Cost', '$6,000/mo', '(writer + editor + SEO)'],
    ['With Workbench', '$1,500/mo', '(AI costs + platform)'],
    ['Time Saved', '80 hours/mo', '(4 hrs → 45 min/article)'],
    ['Monthly Savings', '$4,500', '75% cost reduction']
  ];

  mediumROI.forEach((item, i) => {
    const y = 1.85 + (i * 0.65);
    slide.addText(item[0], {
      x: 0.7, y: y, w: 2, h: 0.25,
      fontSize: 10, fontFace: 'Arial', color: COLORS.textLight
    });
    slide.addText(item[1], {
      x: 2.7, y: y, w: 1.2, h: 0.25,
      fontSize: 12, fontFace: 'Arial', bold: true, color: i === 3 ? COLORS.success : COLORS.dark
    });
    slide.addText(item[2], {
      x: 0.7, y: y + 0.25, w: 4, h: 0.2,
      fontSize: 8, fontFace: 'Arial', color: COLORS.textLight
    });
  });

  // Enterprise ROI
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 5.1, y: 1.0, w: 4.4, h: 3.8,
    fill: { color: COLORS.primary },
    shadow: { type: 'outer', blur: 6, offset: 3, angle: 45, color: '000000', opacity: 0.15 },
    rectRadius: 0.15
  });
  slide.addText('ENTERPRISE', {
    x: 5.1, y: 1.1, w: 4.4, h: 0.4,
    fontSize: 16, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });
  slide.addText('100+ articles/month', {
    x: 5.1, y: 1.45, w: 4.4, h: 0.3,
    fontSize: 11, fontFace: 'Arial', color: 'E0E7FF', align: 'center'
  });

  const enterpriseROI = [
    ['Traditional Cost', '$30,000/mo', '(team + tools + QA)'],
    ['With Workbench', '$5,000/mo', '(AI + platform + review)'],
    ['Time Saved', '400 hrs/mo', '(entire content team)'],
    ['Monthly Savings', '$25,000', '83% cost reduction']
  ];

  enterpriseROI.forEach((item, i) => {
    const y = 1.85 + (i * 0.65);
    slide.addText(item[0], {
      x: 5.3, y: y, w: 2, h: 0.25,
      fontSize: 10, fontFace: 'Arial', color: 'E0E7FF'
    });
    slide.addText(item[1], {
      x: 7.3, y: y, w: 1.2, h: 0.25,
      fontSize: 12, fontFace: 'Arial', bold: true, color: i === 3 ? COLORS.warning : COLORS.white
    });
    slide.addText(item[2], {
      x: 5.3, y: y + 0.25, w: 4, h: 0.2,
      fontSize: 8, fontFace: 'Arial', color: 'E0E7FF'
    });
  });

  slide.addText('* ROI increases with volume due to batch processing and template reuse', {
    x: 0.5, y: 5.0, w: 9, h: 0.3,
    fontSize: 9, fontFace: 'Arial', italic: true, color: COLORS.textLight, align: 'center'
  });

  // ============================================
  // SLIDE 9: AI-First vs AI-Assisted
  // ============================================
  console.log(`Creating Slide ${++slideNum}: AI-First vs AI-Assisted`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('AI-FIRST vs FULLY AI-ASSISTED', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.accent, align: 'center'
  });
  slide.addText('Understanding our intelligent content creation approach', {
    x: 0.5, y: 0.55, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  // AI-First Column
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.0, w: 4.4, h: 3.6,
    fill: { color: COLORS.darkAlt },
    line: { color: COLORS.accent, width: 2 },
    rectRadius: 0.1
  });
  slide.addText('AI-FIRST APPROACH', {
    x: 0.5, y: 1.1, w: 4.4, h: 0.4,
    fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.accent, align: 'center'
  });

  const aiFirst = [
    'AI generates complete first drafts',
    '9-pass optimization system',
    'Human reviews & refines output',
    'Best for: Scale & efficiency',
    'Time: 30-45 min per article',
    'Quality: 85-95% accuracy'
  ];

  aiFirst.forEach((item, i) => {
    slide.addText('• ' + item, {
      x: 0.7, y: 1.6 + (i * 0.45), w: 4, h: 0.35,
      fontSize: 11, fontFace: 'Arial', color: COLORS.white
    });
  });

  // Fully AI-Assisted Column
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 5.1, y: 1.0, w: 4.4, h: 3.6,
    fill: { color: COLORS.darkAlt },
    line: { color: COLORS.primary, width: 2 },
    rectRadius: 0.1
  });
  slide.addText('FULLY AI-ASSISTED', {
    x: 5.1, y: 1.1, w: 4.4, h: 0.4,
    fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });

  const aiAssisted = [
    'Human writes with AI suggestions',
    'AI Strategist provides guidance',
    'Real-time quality scoring',
    'Best for: Premium content',
    'Time: 2-3 hrs per article',
    'Quality: 95-100% accuracy'
  ];

  aiAssisted.forEach((item, i) => {
    slide.addText('• ' + item, {
      x: 5.3, y: 1.6 + (i * 0.45), w: 4, h: 0.35,
      fontSize: 11, fontFace: 'Arial', color: COLORS.white
    });
  });

  slide.addText('Both modes use the same 129+ audit rules for quality assurance', {
    x: 0.5, y: 4.85, w: 9, h: 0.3,
    fontSize: 11, fontFace: 'Arial', bold: true, color: COLORS.success, align: 'center'
  });

  // ============================================
  // SLIDE 10: Complete Features List - Part 1
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Features List 1`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'COMPLETE FEATURES - STRATEGY', 'Everything you need for semantic SEO success');

  const strategyFeatures = [
    { name: 'Business Info Wizard', desc: 'Define company context, expertise areas, and target audience' },
    { name: 'SEO Pillars Setup', desc: 'Central Entity (CE), Source Context (SC), Central Search Intent (CSI)' },
    { name: 'EAV Discovery', desc: 'Entity-Attribute-Value semantic triples for topical authority' },
    { name: 'Competitor Analysis', desc: 'Analyze competitor content gaps and opportunities' },
    { name: 'Topical Map Generation', desc: 'AI-powered topic clustering with 50-100+ topics' },
    { name: 'Knowledge Graph View', desc: 'Visualize topic relationships and content network' },
    { name: 'Topic Prioritization', desc: 'Score topics by search volume, difficulty, and relevance' },
    { name: 'Content Calendar', desc: 'Plan and schedule content production' }
  ];

  strategyFeatures.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + (col * 4.8);
    const y = 0.95 + (row * 1.1);

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: y, w: 4.6, h: 0.95,
      fill: { color: COLORS.darkAlt },
      rectRadius: 0.08
    });
    slide.addText(f.name, {
      x: x + 0.15, y: y + 0.12, w: 4.3, h: 0.3,
      fontSize: 11, fontFace: 'Arial', bold: true, color: COLORS.accent
    });
    slide.addText(f.desc, {
      x: x + 0.15, y: y + 0.45, w: 4.3, h: 0.4,
      fontSize: 9, fontFace: 'Arial', color: COLORS.white
    });
  });

  // ============================================
  // SLIDE 11: Complete Features List - Part 2
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Features List 2`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'COMPLETE FEATURES - CONTENT CREATION', 'Multi-pass AI content generation system');

  const contentFeatures = [
    { name: 'Content Brief Generation', desc: 'SERP analysis, competitor specs, visual semantics, structured outline' },
    { name: '9-Pass Content Generation', desc: 'Draft → Headers → Intro → Lists → Flow → Micro → Visual → Audit → Schema' },
    { name: 'Section-by-Section Writing', desc: 'Resumable generation with retry logic and version history' },
    { name: 'Featured Snippet Targeting', desc: 'Automatic snippet-length answers and structured data' },
    { name: 'Image Placeholder System', desc: 'AI-generated alt text with vocabulary-extending semantics' },
    { name: 'Internal Link Suggestions', desc: 'Contextual anchor text recommendations for topical clusters' },
    { name: 'Schema Generation (JSON-LD)', desc: 'Entity resolution via Wikidata, page type detection, auto-fix' },
    { name: 'Batch Content Generation', desc: 'Generate 50+ articles with consistent quality' }
  ];

  contentFeatures.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + (col * 4.8);
    const y = 0.95 + (row * 1.1);

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: y, w: 4.6, h: 0.95,
      fill: { color: COLORS.darkAlt },
      rectRadius: 0.08
    });
    slide.addText(f.name, {
      x: x + 0.15, y: y + 0.12, w: 4.3, h: 0.3,
      fontSize: 11, fontFace: 'Arial', bold: true, color: COLORS.accent
    });
    slide.addText(f.desc, {
      x: x + 0.15, y: y + 0.45, w: 4.3, h: 0.4,
      fontSize: 9, fontFace: 'Arial', color: COLORS.white
    });
  });

  // ============================================
  // SLIDE 12: Complete Features List - Part 3
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Features List 3`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'COMPLETE FEATURES - ANALYSIS & TOOLS', 'Comprehensive SEO analysis suite');

  const analysisFeatures = [
    { name: 'Unified Audit Engine', desc: '129+ rules with real-time scoring and actionable feedback' },
    { name: 'Semantic Analysis', desc: 'Entity coverage, attribute depth, predicate variety scoring' },
    { name: 'Corpus Audit', desc: 'Site-wide content analysis for topical authority gaps' },
    { name: 'Query Network Analysis', desc: 'Map search queries to content and identify opportunities' },
    { name: 'Entity Authority Scoring', desc: 'Measure topical authority by entity coverage' },
    { name: 'Competitor Gap Analysis', desc: 'Find content gaps and outranking opportunities' },
    { name: 'Internal Link Audit', desc: 'Neo4j-powered link structure analysis' },
    { name: 'E-A-T Scanner', desc: 'Expertise, Authority, Trust signals analysis' }
  ];

  analysisFeatures.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + (col * 4.8);
    const y = 0.95 + (row * 1.1);

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: y, w: 4.6, h: 0.95,
      fill: { color: COLORS.darkAlt },
      rectRadius: 0.08
    });
    slide.addText(f.name, {
      x: x + 0.15, y: y + 0.12, w: 4.3, h: 0.3,
      fontSize: 11, fontFace: 'Arial', bold: true, color: COLORS.accent
    });
    slide.addText(f.desc, {
      x: x + 0.15, y: y + 0.45, w: 4.3, h: 0.4,
      fontSize: 9, fontFace: 'Arial', color: COLORS.white
    });
  });

  // ============================================
  // SLIDE 13: Content Brief Deep Dive
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Content Brief`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'CONTENT BRIEF - RESEARCH DEPTH', 'Every brief contains comprehensive SEO intelligence');

  const briefSections = [
    { title: 'SERP Analysis', items: ['Featured snippet type', 'People Also Ask questions', 'Competitor analysis', 'Search intent classification'] },
    { title: 'Visual Semantics', items: ['Image placement map', 'Alt text vocabulary', 'Visual context signals', 'Schema markup hints'] },
    { title: 'Structured Outline', items: ['Section hierarchy', 'Word count targets', 'Semantic anchors', 'Flow requirements'] },
    { title: 'Competitor Specs', items: ['Content length analysis', 'Topic coverage gaps', 'Keyword density', 'Structure patterns'] }
  ];

  briefSections.forEach((section, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + (col * 4.8);
    const y = 0.95 + (row * 2.2);

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: y, w: 4.6, h: 2.0,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 1 },
      rectRadius: 0.08
    });
    slide.addText(section.title, {
      x: x + 0.15, y: y + 0.15, w: 4.3, h: 0.35,
      fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.accent
    });
    section.items.forEach((item, ii) => {
      slide.addText('• ' + item, {
        x: x + 0.2, y: y + 0.55 + (ii * 0.35), w: 4.2, h: 0.3,
        fontSize: 10, fontFace: 'Arial', color: COLORS.white
      });
    });
  });

  // ============================================
  // SLIDE 14: Draft Mode - 5 Views
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Draft Mode Views`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'DRAFT MODE - 5 POWERFUL VIEWS', 'Complete control over your content creation process');

  const draftViews = [
    { name: 'EDIT', desc: 'Rich markdown editor with requirements rail, section navigation, and inline AI suggestions', color: COLORS.primary },
    { name: 'PREVIEW', desc: 'Live HTML rendering with responsive preview and SEO meta preview', color: COLORS.secondary },
    { name: 'IMAGES', desc: 'Image management panel for alt text editing, placement, and AI image generation', color: COLORS.accent },
    { name: 'QUALITY', desc: '113+ rules in 18 categories with real-time scoring and improvement suggestions', color: COLORS.success },
    { name: 'DEBUG', desc: 'Pass history, audit issues, AI conversation logs, and version comparison', color: COLORS.warning }
  ];

  draftViews.forEach((view, i) => {
    const y = 0.95 + (i * 0.9);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y: y, w: 9, h: 0.75,
      fill: { color: COLORS.darkAlt },
      line: { color: view.color, width: 2 },
      rectRadius: 0.08
    });
    slide.addText(view.name, {
      x: 0.7, y: y + 0.15, w: 1.2, h: 0.4,
      fontSize: 12, fontFace: 'Arial', bold: true, color: view.color
    });
    slide.addText(view.desc, {
      x: 2.0, y: y + 0.2, w: 7.3, h: 0.4,
      fontSize: 10, fontFace: 'Arial', color: COLORS.white
    });
  });

  // ============================================
  // SLIDE 15: AI Strategist
  // ============================================
  console.log(`Creating Slide ${++slideNum}: AI Strategist`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'AI STRATEGIST', 'Context-aware assistant powered by Holistic SEO methodology');

  // Left side - description
  const strategistFeatures = [
    'Understands your current context (topic, brief, draft)',
    'Provides strategic recommendations based on SEO pillars',
    'Answers questions about Holistic SEO methodology',
    'Suggests improvements aligned with your business goals',
    'Multi-provider support (use your preferred AI)',
    'Quick actions for common tasks'
  ];

  strategistFeatures.forEach((f, i) => {
    slide.addText('✓ ' + f, {
      x: 0.4, y: 0.95 + (i * 0.5), w: 4.5, h: 0.4,
      fontSize: 11, fontFace: 'Arial', color: COLORS.white
    });
  });

  // Right side - example questions
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 5.0, y: 0.95, w: 4.6, h: 3.8,
    fill: { color: COLORS.darkAlt },
    line: { color: COLORS.primary, width: 1 },
    rectRadius: 0.1
  });
  slide.addText('EXAMPLE QUESTIONS:', {
    x: 5.2, y: 1.1, w: 4.2, h: 0.35,
    fontSize: 11, fontFace: 'Arial', bold: true, color: COLORS.accent
  });

  const exampleQuestions = [
    '"How can I improve this section for featured snippets?"',
    '"What entities am I missing for topical authority?"',
    '"Suggest internal links for this paragraph"',
    '"Is my introduction following Holistic SEO principles?"',
    '"What PAA questions should I address?"',
    '"How do I strengthen my E-A-T signals?"'
  ];

  exampleQuestions.forEach((q, i) => {
    slide.addText(q, {
      x: 5.2, y: 1.55 + (i * 0.5), w: 4.2, h: 0.4,
      fontSize: 9, fontFace: 'Arial', italic: true, color: COLORS.white
    });
  });

  // ============================================
  // SLIDE 16: API Services Integration
  // ============================================
  console.log(`Creating Slide ${++slideNum}: API Services`);
  slide = pptx.addSlide();
  addSlideHeader(slide, '17+ API SERVICES INTEGRATED', 'Enterprise-grade integrations for comprehensive SEO');

  const apiServices = [
    { name: 'Jina.ai', purpose: 'Content extraction & readability' },
    { name: 'Apify', purpose: 'Technical web scraping' },
    { name: 'Firecrawl', purpose: 'Fallback scraping service' },
    { name: 'DataForSEO', purpose: 'SERP analysis & keyword data' },
    { name: 'Wikidata', purpose: 'Entity resolution & knowledge graph' },
    { name: 'Neo4j', purpose: 'Graph database for link analysis' },
    { name: 'Cloudinary', purpose: 'Image hosting & optimization' },
    { name: 'MarkupGo', purpose: 'Dynamic image generation' },
    { name: 'WordPress API', purpose: 'Direct publishing integration' },
    { name: 'Gemini', purpose: 'Google AI for content generation' },
    { name: 'OpenAI', purpose: 'GPT-4 for content generation' },
    { name: 'Anthropic', purpose: 'Claude for content generation' },
    { name: 'Perplexity', purpose: 'Research & fact-checking' },
    { name: 'OpenRouter', purpose: '100+ model access' },
    { name: 'Supabase', purpose: 'Backend & authentication' },
    { name: 'Stripe', purpose: 'Billing & subscriptions' }
  ];

  apiServices.forEach((api, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.3 + (col * 2.4);
    const y = 0.95 + (row * 1.1);

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: y, w: 2.3, h: 0.95,
      fill: { color: COLORS.darkAlt },
      rectRadius: 0.06
    });
    slide.addText(api.name, {
      x: x + 0.1, y: y + 0.12, w: 2.1, h: 0.3,
      fontSize: 10, fontFace: 'Arial', bold: true, color: COLORS.accent
    });
    slide.addText(api.purpose, {
      x: x + 0.1, y: y + 0.45, w: 2.1, h: 0.4,
      fontSize: 8, fontFace: 'Arial', color: COLORS.white
    });
  });

  slide.addText('All API keys encrypted with AES-GCM • No markup on AI costs', {
    x: 0.5, y: 5.1, w: 9, h: 0.3,
    fontSize: 10, fontFace: 'Arial', color: COLORS.success, align: 'center'
  });

  // ============================================
  // SLIDE 17: WordPress Publishing
  // ============================================
  console.log(`Creating Slide ${++slideNum}: WordPress Publishing`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'WORDPRESS PUBLISHING', 'Seamless content publishing workflow');

  // Left - Setup
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.4, y: 0.95, w: 4.5, h: 2.0,
    fill: { color: COLORS.darkAlt },
    line: { color: COLORS.primary, width: 1 },
    rectRadius: 0.08
  });
  slide.addText('CONNECTION SETUP', {
    x: 0.6, y: 1.05, w: 4.1, h: 0.35,
    fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.primary
  });
  const setupItems = ['REST API or Application Passwords', 'AES-GCM encrypted credentials', 'Test connection validation', 'Category/tag mapping'];
  setupItems.forEach((item, i) => {
    slide.addText('• ' + item, {
      x: 0.6, y: 1.45 + (i * 0.35), w: 4.1, h: 0.3,
      fontSize: 10, fontFace: 'Arial', color: COLORS.white
    });
  });

  // Right - Workflow
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 5.1, y: 0.95, w: 4.5, h: 2.0,
    fill: { color: COLORS.darkAlt },
    line: { color: COLORS.accent, width: 1 },
    rectRadius: 0.08
  });
  slide.addText('PUBLISHING WORKFLOW', {
    x: 5.3, y: 1.05, w: 4.1, h: 0.35,
    fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.accent
  });
  const workflowItems = ['Draft/Publish/Schedule options', 'Conflict detection & resolution', 'Media upload handling', 'Custom field support'];
  workflowItems.forEach((item, i) => {
    slide.addText('• ' + item, {
      x: 5.3, y: 1.45 + (i * 0.35), w: 4.1, h: 0.3,
      fontSize: 10, fontFace: 'Arial', color: COLORS.white
    });
  });

  // Bottom - Benefits
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.4, y: 3.2, w: 9.2, h: 1.6,
    fill: { color: COLORS.darkAlt },
    rectRadius: 0.08
  });
  slide.addText('KEY BENEFITS:', {
    x: 0.6, y: 3.35, w: 8.8, h: 0.35,
    fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.success
  });
  const benefitItems = [
    'One-click publish from draft editor • Automatic featured image upload',
    'SEO meta (Yoast/RankMath compatible) • Batch publishing for multiple articles',
    'Version history with WordPress sync • Custom taxonomy support'
  ];
  benefitItems.forEach((item, i) => {
    slide.addText(item, {
      x: 0.6, y: 3.75 + (i * 0.35), w: 8.8, h: 0.3,
      fontSize: 10, fontFace: 'Arial', color: COLORS.white
    });
  });

  // ============================================
  // SLIDE 18: Migration Workbench
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Migration Workbench`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'MIGRATION WORKBENCH', 'Comprehensive site migration and content audit platform');

  // 4 View Types
  const migrationViews = [
    { name: 'MATRIX VIEW', desc: 'Spreadsheet-style page inventory with bulk editing', icon: '▦' },
    { name: 'KANBAN VIEW', desc: 'Drag-drop workflow for migration stages', icon: '▤' },
    { name: 'GRAPH VIEW', desc: 'Visual link structure and relationships', icon: '◎' },
    { name: 'TRIAGE VIEW', desc: 'Priority-based decision making interface', icon: '▣' }
  ];

  migrationViews.forEach((view, i) => {
    const x = 0.4 + (i * 2.4);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 0.95, w: 2.25, h: 1.6,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 1 },
      rectRadius: 0.08
    });
    slide.addText(view.icon, {
      x: x, y: 1.0, w: 2.25, h: 0.5,
      fontSize: 24, fontFace: 'Arial', color: COLORS.accent, align: 'center'
    });
    slide.addText(view.name, {
      x: x + 0.1, y: 1.5, w: 2.05, h: 0.3,
      fontSize: 10, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(view.desc, {
      x: x + 0.1, y: 1.8, w: 2.05, h: 0.6,
      fontSize: 8, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
    });
  });

  // Features
  slide.addText('MIGRATION FEATURES:', {
    x: 0.4, y: 2.75, w: 9.2, h: 0.35,
    fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.accent
  });

  const migrationFeatures = [
    ['Site Inventory Import', 'Import from sitemap, crawl data, or CSV files'],
    ['Semantic Analysis', 'Score existing content against Holistic SEO framework'],
    ['Redirect Mapping', 'Generate htaccess or nginx redirect rules'],
    ['Content Decisions', 'Keep, migrate, merge, redirect, or retire pages'],
    ['Gap Analysis', 'Identify missing topics for new content creation'],
    ['Export Options', 'CSV, redirect rules, migration checklist']
  ];

  migrationFeatures.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + (col * 4.8);
    const y = 3.15 + (row * 0.65);

    slide.addText('• ' + f[0] + ':', {
      x: x, y: y, w: 2.2, h: 0.3,
      fontSize: 10, fontFace: 'Arial', bold: true, color: COLORS.white
    });
    slide.addText(f[1], {
      x: x + 2.2, y: y, w: 2.4, h: 0.3,
      fontSize: 9, fontFace: 'Arial', color: COLORS.textLight
    });
  });

  // ============================================
  // SLIDE 19: How It Works
  // ============================================
  console.log(`Creating Slide ${++slideNum}: How It Works`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientLight, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('HOW IT WORKS', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });

  const steps = [
    { num: '1', title: 'Define Strategy', desc: 'Set up SEO pillars & semantic triples (EAVs)' },
    { num: '2', title: 'Generate Map', desc: 'AI creates topical map with 50-100+ topics' },
    { num: '3', title: 'Create Briefs', desc: 'Generate content briefs with SERP analysis' },
    { num: '4', title: 'Generate Content', desc: '9-pass optimization for each article' },
    { num: '5', title: 'Audit & Export', desc: 'Quality checks & WordPress-ready export' }
  ];

  steps.forEach((s, i) => {
    const x = 0.3 + (i * 1.9);
    slide.addShape(pptx.shapes.OVAL, {
      x: x + 0.65, y: 1.0, w: 0.6, h: 0.6,
      fill: { color: COLORS.primary }
    });
    slide.addText(s.num, {
      x: x + 0.65, y: 1.08, w: 0.6, h: 0.5,
      fontSize: 20, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    if (i < 4) {
      slide.addText('→', {
        x: x + 1.4, y: 1.05, w: 0.5, h: 0.5,
        fontSize: 24, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
      });
    }
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 1.8, w: 1.9, h: 1.5,
      fill: { color: COLORS.white },
      shadow: { type: 'outer', blur: 4, offset: 2, angle: 45, color: '000000', opacity: 0.15 },
      rectRadius: 0.1
    });
    slide.addText(s.title, {
      x: x + 0.1, y: 1.95, w: 1.7, h: 0.4,
      fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.dark, align: 'center'
    });
    slide.addText(s.desc, {
      x: x + 0.1, y: 2.35, w: 1.7, h: 0.8,
      fontSize: 9, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
    });
  });

  slide.addText('From strategy to published content in one platform', {
    x: 0.5, y: 4.8, w: 9, h: 0.4,
    fontSize: 14, fontFace: 'Arial', italic: true, color: COLORS.primary, align: 'center'
  });

  // ============================================
  // SLIDE 20: 9-Pass Content Generation
  // ============================================
  console.log(`Creating Slide ${++slideNum}: 9-Pass System`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientLight, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('9-PASS CONTENT GENERATION', {
    x: 0.5, y: 0.2, w: 9, h: 0.5,
    fontSize: 26, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });
  slide.addText('Each article goes through 9 specialized optimization passes', {
    x: 0.5, y: 0.6, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  const passes = [
    { num: '1', name: 'Draft', desc: 'Section-by-section content' },
    { num: '2', name: 'Headers', desc: 'Heading hierarchy' },
    { num: '3', name: 'Intro', desc: 'Centerpiece annotation' },
    { num: '4', name: 'Lists', desc: 'Featured snippet ready' },
    { num: '5', name: 'Flow', desc: 'Transitions & bridges' },
    { num: '6', name: 'Micro', desc: 'Linguistic optimization' },
    { num: '7', name: 'Visual', desc: 'Image placeholders' },
    { num: '8', name: 'Audit', desc: '129+ rule quality check' },
    { num: '9', name: 'Schema', desc: 'JSON-LD generation' }
  ];

  passes.forEach((p, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = 0.8 + (col * 3.0);
    const y = 1.1 + (row * 1.4);

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: y, w: 2.8, h: 1.2,
      fill: { color: COLORS.white },
      line: { color: COLORS.primary, width: 2 },
      rectRadius: 0.1
    });
    slide.addShape(pptx.shapes.OVAL, {
      x: x + 0.1, y: y + 0.1, w: 0.5, h: 0.5,
      fill: { color: COLORS.primary }
    });
    slide.addText(p.num, {
      x: x + 0.1, y: y + 0.15, w: 0.5, h: 0.4,
      fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(p.name, {
      x: x + 0.7, y: y + 0.15, w: 2, h: 0.4,
      fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.dark
    });
    slide.addText(p.desc, {
      x: x + 0.1, y: y + 0.65, w: 2.6, h: 0.4,
      fontSize: 10, fontFace: 'Arial', color: COLORS.textLight
    });
  });

  slide.addText('Result: Publication-ready content with no AI artifacts', {
    x: 0.5, y: 5.1, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.success, align: 'center'
  });

  // ============================================
  // SLIDE 21: Dashboard Screenshot
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Dashboard`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'PROJECT MANAGEMENT', 'Manage multiple SEO projects from one dashboard');

  const dashboardImg = 'D:/www/cost-of-retreival-reducer/public/help-screenshots/project-management/dashboard-overview.png';
  slide.addImage({
    path: dashboardImg,
    x: 0.5, y: 0.95, w: 9, h: 4.5,
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.4 }
  });

  // ============================================
  // SLIDE 22: SEO Pillars
  // ============================================
  console.log(`Creating Slide ${++slideNum}: SEO Pillars`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('SEO PILLARS', {
    x: 0.3, y: 0.2, w: 4, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.accent
  });
  slide.addText('Define your content strategy foundation', {
    x: 0.3, y: 0.55, w: 4, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight
  });

  const pillarFeatures = [
    'Central Entity (CE) - Your main topic',
    'Source Context (SC) - Your expertise',
    'Central Search Intent (CSI) - User goals'
  ];

  pillarFeatures.forEach((f, i) => {
    slide.addText('• ' + f, {
      x: 0.3, y: 1.0 + (i * 0.35), w: 4, h: 0.3,
      fontSize: 11, fontFace: 'Arial', color: COLORS.white
    });
  });

  const pillarImg = path.join(SCREENSHOTS_DIR, 'g06-pillar.png');
  slide.addImage({
    path: pillarImg,
    x: 4.5, y: 0.3, w: 5.3, h: 5.1,
    shadow: { type: 'outer', blur: 6, offset: 2, angle: 45, color: '000000', opacity: 0.3 }
  });

  // ============================================
  // SLIDE 23: Semantic Triples
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Semantic Triples`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'SEMANTIC TRIPLES (E-A-V)', 'The secret to topical authority - Entity-Attribute-Value framework');

  const eavImg = path.join(SCREENSHOTS_DIR, 'modal-eav-manager.png');
  slide.addImage({
    path: eavImg,
    x: 0.5, y: 0.95, w: 9, h: 4.5,
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.4 }
  });

  // ============================================
  // SLIDE 24: Topical Map Dashboard
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Topical Map`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'TOPICAL MAP DASHBOARD', 'Track 89+ topics with briefs, drafts, and metrics at a glance');

  const mapImg = path.join(SCREENSHOTS_DIR, 'c01-map-dashboard.png');
  slide.addImage({
    path: mapImg,
    x: 0.5, y: 0.95, w: 9, h: 4.5,
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.4 }
  });

  // ============================================
  // SLIDE 25: Graph Visualization
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Graph View`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'VISUAL TOPIC GRAPH', 'See your content network and topic relationships');

  const graphImg = path.join(SCREENSHOTS_DIR, 'c07-tab-graph.png');
  slide.addImage({
    path: graphImg,
    x: 0.5, y: 0.95, w: 9, h: 4.5,
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.4 }
  });

  // ============================================
  // SLIDE 26: Analysis Tools
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Analysis Tools`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('POWERFUL ANALYSIS TOOLS', {
    x: 0.3, y: 0.2, w: 4.5, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.accent
  });

  const analysisTools = [
    '• Internal Link Audit',
    '• Full Health Check',
    '• Query Network Audit',
    '• E-A-T Scanner',
    '• Corpus Audit',
    '• Enhanced Metrics Dashboard',
    '• Entity Authority Analysis'
  ];

  analysisTools.forEach((t, i) => {
    slide.addText(t, {
      x: 0.3, y: 0.7 + (i * 0.32), w: 4, h: 0.3,
      fontSize: 11, fontFace: 'Arial', color: COLORS.white
    });
  });

  const analysisImg = path.join(SCREENSHOTS_DIR, 'c05-tab-analysis.png');
  slide.addImage({
    path: analysisImg,
    x: 4.5, y: 0.3, w: 5.3, h: 5.1,
    shadow: { type: 'outer', blur: 6, offset: 2, angle: 45, color: '000000', opacity: 0.3 }
  });

  // ============================================
  // SLIDE 27: Multi-Provider AI
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Multi-Provider AI`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('MULTI-PROVIDER AI SUPPORT', {
    x: 0.3, y: 0.2, w: 4.5, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.accent
  });
  slide.addText('Choose your preferred AI provider:', {
    x: 0.3, y: 0.6, w: 4, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight
  });

  const providers = ['Google Gemini', 'OpenAI GPT-4', 'Anthropic Claude', 'Perplexity', 'OpenRouter (100+ models)'];
  providers.forEach((p, i) => {
    slide.addText('✓ ' + p, {
      x: 0.3, y: 1.0 + (i * 0.35), w: 4, h: 0.3,
      fontSize: 12, fontFace: 'Arial', color: COLORS.white
    });
  });

  slide.addText('Bring your own API keys - no markup!', {
    x: 0.3, y: 2.9, w: 4, h: 0.3,
    fontSize: 11, fontFace: 'Arial', bold: true, color: COLORS.success
  });

  const settingsImg = 'D:/www/cost-of-retreival-reducer/screenshots/settings-ai-providers.png';
  try {
    slide.addImage({
      path: settingsImg,
      x: 4.5, y: 0.3, w: 5.3, h: 4.2,
      shadow: { type: 'outer', blur: 6, offset: 2, angle: 45, color: '000000', opacity: 0.3 }
    });
  } catch (e) {
    // Fallback if image doesn't exist
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 4.5, y: 0.3, w: 5.3, h: 4.2,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 1 },
      rectRadius: 0.1
    });
    slide.addText('AI Provider Settings Panel', {
      x: 4.5, y: 2.2, w: 5.3, h: 0.5,
      fontSize: 14, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
    });
  }

  // ============================================
  // SLIDE 28: Admin Console
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Admin Console`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'ADMIN CONSOLE', 'Track AI usage, costs, and system health in real-time');

  const adminImg = path.join(SCREENSHOTS_DIR, 'j01-admin.png');
  slide.addImage({
    path: adminImg,
    x: 0.5, y: 0.95, w: 9, h: 4.5,
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.4 }
  });

  // ============================================
  // SLIDE 29: Site Analysis
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Site Analysis`);
  slide = pptx.addSlide();
  addSlideHeader(slide, 'SITE ANALYSIS & MIGRATION', 'Audit existing pages against Holistic SEO framework');

  const siteAnalysisImg = path.join(SCREENSHOTS_DIR, 'i01-site-analysis.png');
  slide.addImage({
    path: siteAnalysisImg,
    x: 0.5, y: 0.95, w: 9, h: 4.5,
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.4 }
  });

  // ============================================
  // SLIDE 30: What Makes Us Different
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Differentiators`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientAccent, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('WHAT MAKES US DIFFERENT', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });

  const diffs = [
    { title: 'Entity-Focused, Not Keyword-Focused', desc: 'Build topical authority with semantic relationships' },
    { title: '9-Pass Quality System + 129 Rules', desc: 'Eliminates AI hallucinations and generic content' },
    { title: 'Featured Snippet Optimization', desc: 'Built-in targeting with answer lengths and predicates' },
    { title: 'Holistic SEO Methodology', desc: 'Based on proven framework by Koray Tugberk GUBUR' }
  ];

  diffs.forEach((d, i) => {
    const y = 1.0 + (i * 1.1);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 1, y: y, w: 8, h: 0.95,
      fill: { color: 'FFFFFF', transparency: 15 },
      rectRadius: 0.1
    });
    slide.addText(d.title, {
      x: 1.2, y: y + 0.15, w: 7.6, h: 0.35,
      fontSize: 16, fontFace: 'Arial', bold: true, color: COLORS.white
    });
    slide.addText(d.desc, {
      x: 1.2, y: y + 0.5, w: 7.6, h: 0.35,
      fontSize: 12, fontFace: 'Arial', color: 'E0E7FF'
    });
  });

  // ============================================
  // SLIDE 31: Use Cases
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Use Cases`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientLight, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('WHO IS THIS FOR?', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });

  const useCases = [
    { title: 'SEO Agencies', desc: 'Scale content production across multiple clients with consistent quality', color: COLORS.primary },
    { title: 'In-House Teams', desc: 'Build topical authority systematically with data-driven strategy', color: COLORS.secondary },
    { title: 'Content Writers', desc: 'Get AI assistance that actually understands SEO best practices', color: COLORS.accent }
  ];

  useCases.forEach((u, i) => {
    const x = 0.7 + (i * 3.1);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 1.1, w: 2.9, h: 2.8,
      fill: { color: u.color },
      shadow: { type: 'outer', blur: 6, offset: 3, angle: 45, color: '000000', opacity: 0.2 },
      rectRadius: 0.15
    });
    slide.addText(u.title, {
      x: x + 0.2, y: 1.4, w: 2.5, h: 0.5,
      fontSize: 18, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(u.desc, {
      x: x + 0.2, y: 2.1, w: 2.5, h: 1.5,
      fontSize: 11, fontFace: 'Arial', color: COLORS.white, align: 'center'
    });
  });

  slide.addText('Perfect for anyone who wants to dominate search results with quality content', {
    x: 0.5, y: 4.3, w: 9, h: 0.4,
    fontSize: 12, fontFace: 'Arial', italic: true, color: COLORS.textLight, align: 'center'
  });

  // ============================================
  // SLIDE 32: Technical Architecture
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Architecture`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('ENTERPRISE-GRADE ARCHITECTURE', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 26, fontFace: 'Arial', bold: true, color: COLORS.accent, align: 'center'
  });

  const techFeatures = [
    { title: 'React 18 + TypeScript', desc: 'Modern, type-safe frontend' },
    { title: 'Supabase Backend', desc: 'PostgreSQL + Edge Functions' },
    { title: 'Row Level Security', desc: 'Enterprise data isolation' },
    { title: 'Real-time Updates', desc: 'Live progress tracking' },
    { title: 'Encrypted API Keys', desc: 'Secure credential storage' },
    { title: 'Resumable Jobs', desc: 'No lost work on interruptions' }
  ];

  techFeatures.forEach((t, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = 0.8 + (col * 3.0);
    const y = 1.1 + (row * 1.8);

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: y, w: 2.8, h: 1.5,
      fill: { color: COLORS.darkAlt },
      line: { color: COLORS.primary, width: 1 },
      rectRadius: 0.1
    });
    slide.addText(t.title, {
      x: x + 0.1, y: y + 0.3, w: 2.6, h: 0.4,
      fontSize: 13, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    slide.addText(t.desc, {
      x: x + 0.1, y: y + 0.8, w: 2.6, h: 0.5,
      fontSize: 10, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
    });
  });

  // ============================================
  // SLIDE 33: Pricing
  // ============================================
  console.log(`Creating Slide ${++slideNum}: Pricing`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientLight, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('SIMPLE, TRANSPARENT PRICING', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
  });

  const pricing = [
    { name: 'Starter', price: 'Free', features: ['1 Project', '10 Topics', 'Basic Briefs', 'Manual Generation'] },
    { name: 'Professional', price: '$49/mo', features: ['Unlimited Projects', 'Unlimited Topics', 'Full 9-Pass System', 'Priority Support'], highlight: true },
    { name: 'Enterprise', price: 'Custom', features: ['Team Collaboration', 'Custom Integrations', 'White-Label Options', 'Dedicated Support'] }
  ];

  pricing.forEach((p, i) => {
    const x = 0.7 + (i * 3.1);
    const bgColor = p.highlight ? COLORS.primary : COLORS.white;
    const textColor = p.highlight ? COLORS.white : COLORS.dark;

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x, y: 1.0, w: 2.9, h: 3.5,
      fill: { color: bgColor },
      line: p.highlight ? null : { color: 'E2E8F0', width: 1 },
      shadow: { type: 'outer', blur: 6, offset: 3, angle: 45, color: '000000', opacity: 0.15 },
      rectRadius: 0.15
    });

    slide.addText(p.name, {
      x: x, y: 1.2, w: 2.9, h: 0.4,
      fontSize: 16, fontFace: 'Arial', bold: true, color: textColor, align: 'center'
    });
    slide.addText(p.price, {
      x: x, y: 1.6, w: 2.9, h: 0.5,
      fontSize: 24, fontFace: 'Arial', bold: true, color: p.highlight ? COLORS.white : COLORS.primary, align: 'center'
    });

    p.features.forEach((f, fi) => {
      slide.addText('✓ ' + f, {
        x: x + 0.3, y: 2.3 + (fi * 0.4), w: 2.3, h: 0.35,
        fontSize: 10, fontFace: 'Arial', color: p.highlight ? 'E0E7FF' : COLORS.textLight
      });
    });
  });

  slide.addText('Bring your own AI API keys - pay only for what you use!', {
    x: 0.5, y: 4.7, w: 9, h: 0.3,
    fontSize: 11, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  // ============================================
  // SLIDE 34: Call to Action
  // ============================================
  console.log(`Creating Slide ${++slideNum}: CTA`);
  slide = pptx.addSlide();
  slide.addImage({ path: gradientAccent, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('READY TO DOMINATE', {
    x: 0.5, y: 1.2, w: 9, h: 0.7,
    fontSize: 42, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });
  slide.addText('SEARCH RESULTS?', {
    x: 0.5, y: 1.85, w: 9, h: 0.7,
    fontSize: 42, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 3.5, y: 2.7, w: 3, h: 0.06, fill: { color: COLORS.white }
  });

  slide.addText('Start building your topical authority today', {
    x: 0.5, y: 3.0, w: 9, h: 0.4,
    fontSize: 16, fontFace: 'Arial', color: 'E0E7FF', align: 'center'
  });

  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 3.5, y: 3.6, w: 3, h: 0.7,
    fill: { color: COLORS.white },
    rectRadius: 0.35
  });
  slide.addText('GET STARTED FREE', {
    x: 3.5, y: 3.72, w: 3, h: 0.5,
    fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center'
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
  console.log(`\n✅ Presentation created: ${OUTPUT_FILE}`);
}

// Run
createPresentation().catch(err => {
  console.error('Error creating presentation:', err);
  process.exit(1);
});
