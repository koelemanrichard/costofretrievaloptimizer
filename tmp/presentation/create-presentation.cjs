const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const SLIDES_DIR = path.join(__dirname, 'slides');
const SCREENSHOTS_DIR = 'D:/www/cost-of-retreival-reducer/docs/help-screenshots';
const OUTPUT_FILE = path.join(__dirname, 'Holistic-SEO-Workbench-Marketing.pptx');

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

// Create accent shape
async function createAccentShape(filename, color, opacity = 0.3) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
    <circle cx="200" cy="200" r="200" fill="#${color}" opacity="${opacity}"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(filename);
  return filename;
}

async function createPresentation() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = 'Holistic SEO Workbench - Marketing Presentation';
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

  // ============================================
  // SLIDE 1: Title Slide
  // ============================================
  console.log('Creating Slide 1: Title');
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
  console.log('Creating Slide 2: The Problem');
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('THE SEO STRUGGLE IS REAL', {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 32, fontFace: 'Arial', bold: true, color: COLORS.accent,
    align: 'center'
  });

  const problems = [
    { icon: '?', text: '"What content should I write next?"', desc: 'No clear content strategy or topic prioritization' },
    { icon: '!', text: '"Why isn\'t my content ranking?"', desc: 'Missing semantic relationships and topical authority' },
    { icon: '~', text: '"How do I optimize for featured snippets?"', desc: 'No systematic approach to SERP features' },
    { icon: 'X', text: '"AI content feels generic and robotic"', desc: 'Single-pass generation lacks quality control' }
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
  console.log('Creating Slide 3: The Solution');
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
    '9-Pass AI Content Generation with Quality Audits',
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
  // SLIDE 4: Results at a Glance
  // ============================================
  console.log('Creating Slide 4: Results');
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('RESULTS YOU CAN EXPECT', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, fontFace: 'Arial', bold: true, color: COLORS.accent, align: 'center'
  });

  const results = [
    { num: '9', label: 'Optimization Passes', desc: 'Per article' },
    { num: '50+', label: 'Articles', desc: 'Batch generation' },
    { num: '5', label: 'AI Providers', desc: 'Supported' },
    { num: '10', label: 'Audit Rules', desc: 'Quality checks' }
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
    { title: 'Save Time', desc: 'Automate content strategy & generation' },
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
  // SLIDE 5: How It Works
  // ============================================
  console.log('Creating Slide 5: How It Works');
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
    // Number circle
    slide.addShape(pptx.shapes.OVAL, {
      x: x + 0.65, y: 1.0, w: 0.6, h: 0.6,
      fill: { color: COLORS.primary }
    });
    slide.addText(s.num, {
      x: x + 0.65, y: 1.08, w: 0.6, h: 0.5,
      fontSize: 20, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
    });
    // Arrow
    if (i < 4) {
      slide.addText('→', {
        x: x + 1.4, y: 1.05, w: 0.5, h: 0.5,
        fontSize: 24, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
      });
    }
    // Card
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

  // Bottom tagline
  slide.addText('From strategy to published content in one platform', {
    x: 0.5, y: 4.8, w: 9, h: 0.4,
    fontSize: 14, fontFace: 'Arial', italic: true, color: COLORS.primary, align: 'center'
  });

  // ============================================
  // SLIDE 6: Dashboard Screenshot
  // ============================================
  console.log('Creating Slide 6: Dashboard');
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('PROJECT MANAGEMENT', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.accent, align: 'center'
  });
  slide.addText('Manage multiple SEO projects from one dashboard', {
    x: 0.5, y: 0.55, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  // Screenshot
  const dashboardImg = 'D:/www/cost-of-retreival-reducer/public/help-screenshots/project-management/dashboard-overview.png';
  slide.addImage({
    path: dashboardImg,
    x: 0.5, y: 0.95, w: 9, h: 4.5,
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.4 }
  });

  // ============================================
  // SLIDE 7: SEO Pillars
  // ============================================
  console.log('Creating Slide 7: SEO Pillars');
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

  // Feature bullets
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

  // Screenshot (right side)
  const pillarImg = path.join(SCREENSHOTS_DIR, 'g06-pillar.png');
  slide.addImage({
    path: pillarImg,
    x: 4.5, y: 0.3, w: 5.3, h: 5.1,
    shadow: { type: 'outer', blur: 6, offset: 2, angle: 45, color: '000000', opacity: 0.3 }
  });

  // ============================================
  // SLIDE 8: Semantic Triples (EAV)
  // ============================================
  console.log('Creating Slide 8: Semantic Triples');
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('SEMANTIC TRIPLES (E-A-V)', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.accent, align: 'center'
  });
  slide.addText('The secret to topical authority - Entity-Attribute-Value framework', {
    x: 0.5, y: 0.55, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  // Screenshot
  const eavImg = path.join(SCREENSHOTS_DIR, 'modal-eav-manager.png');
  slide.addImage({
    path: eavImg,
    x: 0.5, y: 0.95, w: 9, h: 4.5,
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.4 }
  });

  // ============================================
  // SLIDE 9: Topical Map Dashboard
  // ============================================
  console.log('Creating Slide 9: Topical Map');
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('TOPICAL MAP DASHBOARD', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.accent, align: 'center'
  });
  slide.addText('Track 89+ topics with briefs, drafts, and metrics at a glance', {
    x: 0.5, y: 0.55, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  const mapImg = path.join(SCREENSHOTS_DIR, 'c01-map-dashboard.png');
  slide.addImage({
    path: mapImg,
    x: 0.5, y: 0.95, w: 9, h: 4.5,
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.4 }
  });

  // ============================================
  // SLIDE 10: Graph Visualization
  // ============================================
  console.log('Creating Slide 10: Graph View');
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('VISUAL TOPIC GRAPH', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.accent, align: 'center'
  });
  slide.addText('See your content network and topic relationships', {
    x: 0.5, y: 0.55, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  const graphImg = path.join(SCREENSHOTS_DIR, 'c07-tab-graph.png');
  slide.addImage({
    path: graphImg,
    x: 0.5, y: 0.95, w: 9, h: 4.5,
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.4 }
  });

  // ============================================
  // SLIDE 11: Analysis Tools
  // ============================================
  console.log('Creating Slide 11: Analysis Tools');
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
  // SLIDE 12: 9-Pass Content Generation
  // ============================================
  console.log('Creating Slide 12: 9-Pass System');
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
    { num: '8', name: 'Audit', desc: '10-rule quality check' },
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
  // SLIDE 13: Multi-Provider AI
  // ============================================
  console.log('Creating Slide 13: Multi-Provider AI');
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
  slide.addImage({
    path: settingsImg,
    x: 4.5, y: 0.3, w: 5.3, h: 4.2,
    shadow: { type: 'outer', blur: 6, offset: 2, angle: 45, color: '000000', opacity: 0.3 }
  });

  // ============================================
  // SLIDE 14: Admin Console
  // ============================================
  console.log('Creating Slide 14: Admin Console');
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('ADMIN CONSOLE', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.accent, align: 'center'
  });
  slide.addText('Track AI usage, costs, and system health in real-time', {
    x: 0.5, y: 0.55, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  const adminImg = path.join(SCREENSHOTS_DIR, 'j01-admin.png');
  slide.addImage({
    path: adminImg,
    x: 0.5, y: 0.95, w: 9, h: 4.5,
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.4 }
  });

  // ============================================
  // SLIDE 15: What Makes Us Different
  // ============================================
  console.log('Creating Slide 15: Differentiators');
  slide = pptx.addSlide();
  slide.addImage({ path: gradientAccent, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('WHAT MAKES US DIFFERENT', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, fontFace: 'Arial', bold: true, color: COLORS.white, align: 'center'
  });

  const diffs = [
    { title: 'Entity-Focused, Not Keyword-Focused', desc: 'Build topical authority with semantic relationships' },
    { title: '9-Pass Quality System', desc: 'Eliminates AI hallucinations and generic content' },
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
  // SLIDE 16: Use Cases
  // ============================================
  console.log('Creating Slide 16: Use Cases');
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
  // SLIDE 17: Technical Architecture
  // ============================================
  console.log('Creating Slide 17: Architecture');
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
  // SLIDE 18: Site Analysis Feature
  // ============================================
  console.log('Creating Slide 18: Site Analysis');
  slide = pptx.addSlide();
  slide.addImage({ path: gradientDark, x: 0, y: 0, w: 10, h: 5.625 });

  slide.addText('SITE ANALYSIS & MIGRATION', {
    x: 0.5, y: 0.2, w: 9, h: 0.4,
    fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.accent, align: 'center'
  });
  slide.addText('Audit existing pages against Holistic SEO framework', {
    x: 0.5, y: 0.55, w: 9, h: 0.3,
    fontSize: 12, fontFace: 'Arial', color: COLORS.textLight, align: 'center'
  });

  const siteAnalysisImg = path.join(SCREENSHOTS_DIR, 'i01-site-analysis.png');
  slide.addImage({
    path: siteAnalysisImg,
    x: 0.5, y: 0.95, w: 9, h: 4.5,
    shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, color: '000000', opacity: 0.4 }
  });

  // ============================================
  // SLIDE 19: Pricing (Placeholder)
  // ============================================
  console.log('Creating Slide 19: Pricing');
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
  // SLIDE 20: Call to Action
  // ============================================
  console.log('Creating Slide 20: CTA');
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

  // CTA Button
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
  console.log('\nSaving presentation...');
  await pptx.writeFile({ fileName: OUTPUT_FILE });
  console.log(`\n✅ Presentation created: ${OUTPUT_FILE}`);
}

// Run
createPresentation().catch(err => {
  console.error('Error creating presentation:', err);
  process.exit(1);
});
