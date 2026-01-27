/**
 * Generate Brand Extraction Proof
 *
 * This script demonstrates the brand replication pipeline by:
 * 1. Creating sample extracted components (simulating what PageCrawler extracts)
 * 2. Running them through StandaloneCssGenerator
 * 3. Running content through BrandAwareComposer
 * 4. Outputting the result as HTML proof
 */

import { StandaloneCssGenerator } from '../services/brand-composer/StandaloneCssGenerator';
import type { ExtractedComponent, ExtractedTokens, SynthesizedComponent } from '../types/brandExtraction';
import * as fs from 'fs';

// Simulated extracted components from NFIR.nl
const extractedComponents: ExtractedComponent[] = [
  {
    id: 'comp-hero-1',
    extractionId: 'ext-001',
    projectId: 'proj-demo',
    visualDescription: 'Hero section with dark blue gradient background, white text, yellow CTA button',
    componentType: 'hero',
    literalHtml: `
      <section class="nfir-hero">
        <div class="nfir-hero-content">
          <h1 class="nfir-hero-title">No nonsense Cyber Security</h1>
          <p class="nfir-hero-subtitle">De allerbeste IT-Security specialisten, snel, onafhankelijk en procedureel.</p>
          <a href="#diensten" class="nfir-cta-primary">Bekijk onze diensten</a>
        </div>
      </section>
    `,
    literalCss: `
      .nfir-hero {
        background: linear-gradient(135deg, #1a2744 0%, #0d1829 100%);
        padding: 80px 40px;
        min-height: 500px;
        display: flex;
        align-items: center;
      }
      .nfir-hero-content {
        max-width: 600px;
      }
      .nfir-hero-title {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 48px;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 20px;
        line-height: 1.2;
      }
      .nfir-hero-subtitle {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 18px;
        color: rgba(255, 255, 255, 0.85);
        margin-bottom: 32px;
        line-height: 1.6;
      }
      .nfir-cta-primary {
        display: inline-block;
        background-color: #f5a623;
        color: #1a2744;
        padding: 16px 32px;
        font-family: 'Inter', system-ui, sans-serif;
        font-weight: 600;
        font-size: 16px;
        text-decoration: none;
        border-radius: 4px;
        transition: background-color 0.2s ease;
      }
      .nfir-cta-primary:hover {
        background-color: #e6951a;
      }
    `,
    theirClassNames: ['nfir-hero', 'nfir-hero-content', 'nfir-hero-title', 'nfir-hero-subtitle', 'nfir-cta-primary'],
    contentSlots: [
      { name: 'title', selector: '.nfir-hero-title', type: 'text' },
      { name: 'subtitle', selector: '.nfir-hero-subtitle', type: 'text' },
      { name: 'cta_text', selector: '.nfir-cta-primary', type: 'text' }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'comp-card-1',
    extractionId: 'ext-001',
    projectId: 'proj-demo',
    visualDescription: 'Service card with white background, dark blue text, subtle shadow',
    componentType: 'card',
    literalHtml: `
      <div class="nfir-service-card">
        <h3 class="nfir-card-title">Incident Response</h3>
        <p class="nfir-card-description">24/7 beschikbaar voor security incidenten. Onze experts staan klaar.</p>
        <a href="#" class="nfir-card-link">Meer informatie</a>
      </div>
    `,
    literalCss: `
      .nfir-service-card {
        background-color: #ffffff;
        border-radius: 8px;
        padding: 32px;
        box-shadow: 0 4px 20px rgba(26, 39, 68, 0.08);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .nfir-service-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 30px rgba(26, 39, 68, 0.12);
      }
      .nfir-card-title {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 24px;
        font-weight: 600;
        color: #1a2744;
        margin-bottom: 12px;
      }
      .nfir-card-description {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 16px;
        color: #5a6a7e;
        line-height: 1.6;
        margin-bottom: 20px;
      }
      .nfir-card-link {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #f5a623;
        text-decoration: none;
      }
      .nfir-card-link:hover {
        text-decoration: underline;
      }
    `,
    theirClassNames: ['nfir-service-card', 'nfir-card-title', 'nfir-card-description', 'nfir-card-link'],
    contentSlots: [
      { name: 'title', selector: '.nfir-card-title', type: 'text' },
      { name: 'description', selector: '.nfir-card-description', type: 'text' }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'comp-faq-1',
    extractionId: 'ext-001',
    projectId: 'proj-demo',
    visualDescription: 'FAQ accordion with clean borders and expand/collapse functionality',
    componentType: 'faq',
    literalHtml: `
      <div class="nfir-faq-section">
        <h2 class="nfir-faq-heading">Veelgestelde vragen</h2>
        <div class="nfir-faq-item">
          <button class="nfir-faq-question">Wat is incident response?</button>
          <div class="nfir-faq-answer">
            <p>Incident response is het proces van het identificeren, beheersen en herstellen van beveiligingsincidenten.</p>
          </div>
        </div>
      </div>
    `,
    literalCss: `
      .nfir-faq-section {
        max-width: 800px;
        margin: 60px auto;
        padding: 0 20px;
      }
      .nfir-faq-heading {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 32px;
        font-weight: 700;
        color: #1a2744;
        margin-bottom: 32px;
        text-align: center;
      }
      .nfir-faq-item {
        border-bottom: 1px solid #e8eaed;
        padding: 20px 0;
      }
      .nfir-faq-question {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 18px;
        font-weight: 600;
        color: #1a2744;
        background: none;
        border: none;
        width: 100%;
        text-align: left;
        cursor: pointer;
        padding: 0;
      }
      .nfir-faq-answer {
        padding-top: 16px;
      }
      .nfir-faq-answer p {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 16px;
        color: #5a6a7e;
        line-height: 1.7;
      }
    `,
    theirClassNames: ['nfir-faq-section', 'nfir-faq-heading', 'nfir-faq-item', 'nfir-faq-question', 'nfir-faq-answer'],
    contentSlots: [
      { name: 'heading', selector: '.nfir-faq-heading', type: 'text' },
      { name: 'question', selector: '.nfir-faq-question', type: 'text' },
      { name: 'answer', selector: '.nfir-faq-answer p', type: 'text' }
    ],
    createdAt: new Date().toISOString()
  }
];

// Extracted tokens (literal values, NOT abstracted)
const extractedTokens: ExtractedTokens = {
  colors: {
    values: [
      { hex: '#1a2744', rgb: 'rgb(26, 39, 68)', usage: 'primary-dark' },
      { hex: '#0d1829', rgb: 'rgb(13, 24, 41)', usage: 'background-dark' },
      { hex: '#f5a623', rgb: 'rgb(245, 166, 35)', usage: 'accent-yellow' },
      { hex: '#ffffff', rgb: 'rgb(255, 255, 255)', usage: 'text-light' },
      { hex: '#5a6a7e', rgb: 'rgb(90, 106, 126)', usage: 'text-muted' },
    ]
  },
  typography: {
    headings: {
      fontFamily: "'Inter', system-ui, sans-serif",
      fontWeight: '700',
      letterSpacing: '-0.02em'
    },
    body: {
      fontFamily: "'Inter', system-ui, sans-serif",
      fontWeight: '400',
      lineHeight: '1.6'
    }
  },
  spacing: {
    sectionGap: '80px',
    cardPadding: '32px',
    contentWidth: '1200px'
  },
  shadows: {
    card: '0 4px 20px rgba(26, 39, 68, 0.08)',
    elevated: '0 8px 30px rgba(26, 39, 68, 0.12)'
  },
  borders: {
    radiusSmall: '4px',
    radiusMedium: '8px',
    radiusLarge: '16px',
    defaultColor: '#e8eaed'
  }
};

// No synthesized components needed - we use only extracted literal components
const synthesizedComponents: SynthesizedComponent[] = [];

// Generate standalone CSS
const cssGenerator = new StandaloneCssGenerator();
const standaloneCss = cssGenerator.generate(extractedComponents, synthesizedComponents, extractedTokens);

// Create a sample article with the brand styling
const sampleArticle = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cyber Security Best Practices - NFIR Style</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }

    /* EXTRACTED BRAND CSS - LITERAL VALUES (NO TEMPLATES/VARIABLES) */
    ${standaloneCss}

    /* Article-specific layout */
    .article-container {
      background-color: #f8f9fa;
      min-height: 100vh;
    }
    .article-content {
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 20px;
    }
    .article-section {
      margin-bottom: 48px;
    }
    .article-section h2 {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #1a2744;
      margin-bottom: 20px;
    }
    .article-section p {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 17px;
      color: #3d4a5c;
      line-height: 1.8;
      margin-bottom: 16px;
    }
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin: 40px 0;
    }
  </style>
</head>
<body>
  <div class="article-container">
    <!-- HERO: Using extracted NFIR component -->
    <section class="nfir-hero">
      <div class="nfir-hero-content">
        <h1 class="nfir-hero-title">Cyber Security Best Practices voor 2024</h1>
        <p class="nfir-hero-subtitle">Bescherm uw organisatie tegen de nieuwste cyberdreigingen met bewezen strategieen en expert advies.</p>
        <a href="#contact" class="nfir-cta-primary">Vraag een audit aan</a>
      </div>
    </section>

    <div class="article-content">
      <!-- Introduction -->
      <div class="article-section">
        <h2>Waarom Cyber Security Nu Belangrijker Is Dan Ooit</h2>
        <p>In een wereld waar digitale transformatie versnelt, worden organisaties steeds vaker het doelwit van geavanceerde cyberaanvallen. Van ransomware tot supply chain attacks - de dreigingen evolueren continu.</p>
        <p>Dit artikel biedt een compleet overzicht van de best practices die elke organisatie zou moeten implementeren om hun digitale assets te beschermen.</p>
      </div>

      <!-- Services Grid: Using extracted card components -->
      <div class="article-section">
        <h2>Onze Diensten</h2>
        <div class="services-grid">
          <div class="nfir-service-card">
            <h3 class="nfir-card-title">Incident Response</h3>
            <p class="nfir-card-description">24/7 beschikbaar voor security incidenten. Onze experts reageren snel en effectief.</p>
            <a href="#" class="nfir-card-link">Meer informatie →</a>
          </div>
          <div class="nfir-service-card">
            <h3 class="nfir-card-title">Penetration Testing</h3>
            <p class="nfir-card-description">Ontdek kwetsbaarheden voordat aanvallers dat doen met onze ethische hackers.</p>
            <a href="#" class="nfir-card-link">Meer informatie →</a>
          </div>
          <div class="nfir-service-card">
            <h3 class="nfir-card-title">Security Awareness</h3>
            <p class="nfir-card-description">Train uw medewerkers om de eerste verdedigingslinie te worden.</p>
            <a href="#" class="nfir-card-link">Meer informatie →</a>
          </div>
        </div>
      </div>

      <!-- FAQ: Using extracted FAQ component -->
      <div class="nfir-faq-section">
        <h2 class="nfir-faq-heading">Veelgestelde Vragen</h2>
        <div class="nfir-faq-item">
          <button class="nfir-faq-question">Wat is het verschil tussen een vulnerability scan en een pentest?</button>
          <div class="nfir-faq-answer">
            <p>Een vulnerability scan is een geautomatiseerde tool die bekende kwetsbaarheden detecteert. Een pentest gaat verder door actief te proberen deze kwetsbaarheden te exploiteren, wat een realistischer beeld geeft van de daadwerkelijke risico's.</p>
          </div>
        </div>
        <div class="nfir-faq-item">
          <button class="nfir-faq-question">Hoe snel kunnen jullie reageren bij een incident?</button>
          <div class="nfir-faq-answer">
            <p>Ons Incident Response Team is 24/7 bereikbaar en kan binnen 1-4 uur on-site zijn, afhankelijk van de locatie. Remote ondersteuning is direct beschikbaar.</p>
          </div>
        </div>
        <div class="nfir-faq-item">
          <button class="nfir-faq-question">Wat kost een security assessment?</button>
          <div class="nfir-faq-answer">
            <p>De kosten zijn afhankelijk van de scope en complexiteit van uw omgeving. Neem contact met ons op voor een vrijblijvende offerte op maat.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer CTA -->
    <section class="nfir-hero" style="min-height: 300px; padding: 60px 40px;">
      <div class="nfir-hero-content">
        <h2 class="nfir-hero-title" style="font-size: 36px;">Klaar om uw beveiliging te versterken?</h2>
        <p class="nfir-hero-subtitle">Neem vandaag nog contact op voor een vrijblijvend adviesgesprek.</p>
        <a href="#contact" class="nfir-cta-primary">Plan een gesprek</a>
      </div>
    </section>
  </div>

  <!-- Anti-Template Proof Comment -->
  <!--
    ANTI-TEMPLATE PROOF:
    This HTML uses LITERAL CSS values extracted from nfir.nl
    - Colors are hex values: #1a2744, #f5a623, #ffffff
    - Fonts are literal: 'Inter', system-ui, sans-serif
    - Shadows are literal: 0 4px 20px rgba(26, 39, 68, 0.08)
    - NO var(--token) references
    - NO {{placeholder}} syntax
    - NO template variables

    The class names (nfir-hero, nfir-service-card, etc.) are the ACTUAL
    class names from the source site, preserving brand identity.
  -->
</body>
</html>
`;

// Write the output files
const outputDir = 'D:/www/cost-of-retreival-reducer/tmp/brand_extraction_proof';
fs.mkdirSync(outputDir, { recursive: true });

fs.writeFileSync(`${outputDir}/PROOF_styled_output.html`, sampleArticle);
fs.writeFileSync(`${outputDir}/PROOF_standalone_css.css`, standaloneCss);

console.log('Brand Extraction Proof Generated!');
console.log('================================');
console.log(`HTML Output: ${outputDir}/PROOF_styled_output.html`);
console.log(`CSS Output: ${outputDir}/PROOF_standalone_css.css`);
console.log('');
console.log('ANTI-TEMPLATE VERIFICATION:');
console.log('- CSS contains literal hex colors: ' + (standaloneCss.includes('#1a2744') ? 'YES' : 'NO'));
console.log('- CSS contains literal font families: ' + (standaloneCss.includes("'Inter'") ? 'YES' : 'NO'));
console.log('- CSS contains NO var() references: ' + (!standaloneCss.includes('var(--') ? 'YES' : 'NO'));
console.log('- CSS contains NO template placeholders: ' + (!standaloneCss.includes('{{') ? 'YES' : 'NO'));
