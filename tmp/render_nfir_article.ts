/**
 * Render the NFIR "Incident Response Retainer voor Vitale Sectoren" article
 * with proper visual components (card-grid, timeline, FAQ accordion)
 *
 * Run with: npx tsx tmp/render_nfir_article.ts
 */
import { generateBlueprintHeuristicV2 } from '../services/publishing/architect/architectService';
import { renderBlueprint } from '../services/publishing/renderer/blueprintRenderer';
import * as fs from 'fs';

// NFIR article content - Incident Response Retainer voor Vitale Sectoren
const nfirArticleContent = `
# Incident Response Retainer voor Vitale Sectoren

Een Incident Response Retainer voor Vitale Sectoren is een contractuele overeenkomst die organisaties in kritieke infrastructuur directe toegang tot gespecialiseerde cybersecurity-experts garandeert wanneer een cyberincident plaatsvindt.

## Wat is een IR-Retainer?

Een Incident Response Retainer is een vooraf overeengekomen servicecontract dat:

- Gegarandeerde responstijd biedt bij cyberincidenten
- Directe toegang tot certified incident responders
- Vooraf gedefinieerde escalatieprocedures
- 24/7 beschikbaarheid van het response team
- Reguliere security assessments

## Voordelen voor Vitale Sectoren

### Snelle Response
Vitale sectoren zoals energie, water en telecom kunnen geen langdurige downtime veroorloven. Een IR-Retainer garandeert responstijden van soms minder dan 2 uur.

### Expertise op Afroep
Toegang tot forensisch onderzoekers, malware-analisten en crisis-communicatie specialisten zonder deze fulltime in dienst te hebben.

### Compliance Ondersteuning
Voldoen aan wettelijke meldplichten en sectorspecifieke regelgeving zoals NIS2 en de Wet Beveiliging Netwerk- en Informatiesystemen.

## Ons IR-Retainer Proces

Stap 1: Intake en risico-assessment van uw organisatie
Stap 2: Opstellen incident response playbooks op maat
Stap 3: Training en tabletop exercises met uw team
Stap 4: 24/7 monitoring en stand-by response team

## Waarom NFIR Kiezen?

- **Certified Experts** - GIAC, OSCP en CREST gecertificeerde professionals
- **Bewezen Track Record** - 500+ succesvolle incident responses
- **Nederlandse Expertise** - Kennis van lokale wet- en regelgeving
- **Sectorkennis** - Ervaring met vitale infrastructuur

## Veelgestelde Vragen

Wat kost een IR-Retainer per jaar?
De kosten variëren afhankelijk van organisatiegrootte, sector en gewenste SLA's. Neem contact op voor een offerte op maat.

Hoe snel kunnen jullie ter plaatse zijn?
Bij een kritiek incident zijn onze responders binnen 2-4 uur ter plaatse, afhankelijk van locatie.

Wat gebeurt er als we geen incident hebben?
De retainer omvat ook proactieve diensten zoals security assessments, threat briefings en tabletop exercises.

Kunnen jullie helpen bij ransomware aanvallen?
Ja, ransomware incident response is een van onze kerncompetenties, inclusief onderhandeling en decryptie mogelijkheden.
`;

const nfirBusinessInfo = {
  companyName: 'NFIR',
  industry: 'cybersecurity',
  targetAudience: 'Vitale sectoren, CISO\'s',
  brandVoice: 'professional',
  primaryGoal: 'inform',
  uniqueSellingPoints: ['expertise', 'speed', 'compliance'],
  domain: 'nfir.nl',
} as any;

// NFIR Brand Design System CSS - Blue primary, orange accent
const nfirBrandCss = `
/* NFIR Brand Design System */
.ctc-root, .ctc-styled {
  --ctc-primary: #0047BB;
  --ctc-primary-light: #3373D8;
  --ctc-primary-dark: #002E80;
  --ctc-secondary: #F2994A;
  --ctc-secondary-light: #FFAC60;
  --ctc-accent: #F2994A;
  --ctc-background: #ffffff;
  --ctc-surface: #f8fafc;
  --ctc-surface-elevated: #ffffff;
  --ctc-text: #1f2937;
  --ctc-text-secondary: #4b5563;
  --ctc-text-muted: #6b7280;
  --ctc-border: #e5e7eb;
  --ctc-border-subtle: #f3f4f6;
  --ctc-font-display: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --ctc-font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --ctc-radius-sm: 4px;
  --ctc-radius-md: 8px;
  --ctc-radius-lg: 12px;
  --ctc-radius-xl: 16px;
  --ctc-radius-2xl: 24px;
  --ctc-space-1: 4px;
  --ctc-space-2: 8px;
  --ctc-space-4: 16px;
  --ctc-space-8: 32px;
  --ctc-space-12: 48px;
  --ctc-space-16: 64px;
  --ctc-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --ctc-shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
  --ctc-shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
  --ctc-shadow-float: 0 25px 50px -12px rgba(0,0,0,0.15);

  /* NFIR Hero - Blue gradient */
  --ctc-hero-bg: linear-gradient(135deg, #0047BB 0%, #002E80 100%);
  --ctc-hero-text: white;
  --ctc-hero-subtitle: rgba(255,255,255,0.9);
}

/* NFIR Hero Section */
.ctc-hero {
  background: linear-gradient(135deg, #0047BB 0%, #002E80 100%);
  color: white;
  padding: 4rem 2rem;
  border-radius: 0 0 2rem 2rem;
}

.ctc-hero-title {
  font-family: var(--ctc-font-display);
  font-weight: 800;
  color: white;
}

/* NFIR Key Takeaways */
.ctc-prose.ctc-section--hero {
  background: linear-gradient(135deg, #0047BB 0%, #003399 100%);
}

/* NFIR Card Grid */
.ctc-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.ctc-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15);
}

.ctc-card-icon {
  background: linear-gradient(135deg, #0047BB 0%, #3373D8 100%);
  color: white;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

/* NFIR Timeline */
.ctc-timeline-step-number {
  background: #0047BB;
  color: white;
  font-weight: 700;
}

/* NFIR FAQ Accordion */
.ctc-faq-trigger {
  background: #f8fafc;
  color: #0047BB;
  font-weight: 600;
}

.ctc-faq-trigger:hover {
  background: #f1f5f9;
}

/* NFIR CTA Banner */
.ctc-cta-banner {
  background: linear-gradient(135deg, #0047BB 0%, #002E80 100%);
  color: white;
  padding: 3rem 2rem;
  border-radius: 1.5rem;
  text-align: center;
}

.ctc-cta-button {
  background: #F2994A;
  color: white;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  display: inline-block;
  transition: background 0.2s;
}

.ctc-cta-button:hover {
  background: #d9853e;
}
`;

async function renderNfirArticle() {
  console.log('='.repeat(70));
  console.log('RENDERING NFIR ARTICLE WITH VISUAL COMPONENTS');
  console.log('='.repeat(70));

  // Generate blueprint with visual components
  const blueprint = generateBlueprintHeuristicV2(
    nfirArticleContent,
    'Incident Response Retainer voor Vitale Sectoren',
    'nfir-ir-retainer',
    nfirBusinessInfo,
    {}
  );

  console.log('\nBlueprint generated with', blueprint.sections.length, 'sections');
  console.log('Components:', blueprint.sections.map(s => s.presentation.component).join(', '));

  // Create mock brand design system
  const nfirBrandDesignSystem = {
    brandName: 'NFIR Cybersecurity',
    extractedAt: new Date().toISOString(),
    compiledCss: nfirBrandCss,
    components: {},
  };

  // Render to HTML
  const output = renderBlueprint(blueprint, 'Incident Response Retainer voor Vitale Sectoren', {
    brief: {
      targetKeyword: 'Incident Response Retainer',
      metaDescription: 'IR-Retainer voor vitale sectoren met 24/7 cybersecurity expertise',
    } as any,
    topic: {
      title: 'Incident Response Retainer voor Vitale Sectoren',
      id: 'nfir-ir-retainer',
    } as any,
    personalityId: 'corporate-professional',
    brandDesignSystem: nfirBrandDesignSystem as any,
  });

  console.log('\nRendered output:');
  console.log('  HTML length:', output.html.length, 'chars');
  console.log('  CSS length:', output.css.length, 'chars');
  console.log('  Components used:', output.metadata.componentsUsed.join(', '));

  // Create complete HTML document
  const fullHtml = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Incident Response Retainer voor Vitale Sectoren - NFIR</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1f2937;
      line-height: 1.7;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    ${nfirBrandCss}
    ${output.css}
  </style>
</head>
<body>
  <main class="max-w-4xl mx-auto py-12 px-4">
    ${output.html}
  </main>
</body>
</html>`;

  // Save to file
  const outputDir = 'tmp/nfir_comparison';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = `${outputDir}/04_OPTIMIZED_nfir_article.html`;
  fs.writeFileSync(outputPath, fullHtml);
  console.log('\n✅ Output saved to:', outputPath);

  // List component classes used
  const componentClasses = output.html.match(/class="ctc-[a-z-]+/g) || [];
  const uniqueClasses = [...new Set(componentClasses)];
  console.log('\nComponent classes found:', uniqueClasses.length);
  console.log(uniqueClasses.slice(0, 15).map(c => '  ' + c.replace('class="', '')).join('\n'));
}

renderNfirArticle().catch(console.error);
