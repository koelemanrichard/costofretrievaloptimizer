/**
 * Render a test blueprint to HTML and save it
 * Run with: npx tsx tmp/render_test_blueprint.ts
 */
import { generateBlueprintHeuristicV2 } from '../services/publishing/architect/architectService';
import { renderBlueprint } from '../services/publishing/renderer/blueprintRenderer';
import * as fs from 'fs';

const testArticleContent = `
# VVE Beheer - Professioneel Beheer voor uw Vereniging

VVE beheer is essentieel voor het onderhoud en beheer van uw appartementencomplex. Een professionele VVE beheerder zorgt voor technisch beheer, administratief beheer en financieel beheer. Dit zorgt voor een zorgeloze woonomgeving.

## Wat Bieden Wij

Wij bieden complete VVE beheer diensten:

- Volledig administratief beheer van uw VVE
- Financiële administratie en jaarrekeningen
- Technisch onderhoud en inspectie
- Begeleiding vergaderingen en besluitvorming
- 24/7 storingsmeldpunt

## Drie Pijlers van Ons VVE Beheer

### Administratief Beheer
Volledige administratieve ondersteuning inclusief ledenadministratie, correspondentie en archivering.

### Financieel Beheer
Professionele financiële administratie met maandelijkse rapportages, begroting en jaarrekening.

### Technisch Beheer
Technische inspecties, onderhoudsplannen en coördinatie van reparaties en renovaties.

## Onze Werkwijze

Stap 1: Intake gesprek en inventarisatie van uw VVE
Stap 2: Opstellen beheersovereenkomst op maat
Stap 3: Overdracht en implementatie van het beheer
Stap 4: Lopend beheer en kwartaalrapportage

## Voordelen van Professioneel VVE Beheer

- **Ontzorging** - U hoeft zich nergens zorgen over te maken
- **Expertise** - Jarenlange ervaring in VVE beheer
- **Transparantie** - Altijd inzicht in financiën en werkzaamheden
- **Bereikbaarheid** - Altijd een aanspreekpunt beschikbaar

## Veelgestelde Vragen

Wat kost VVE beheer per maand?
De kosten variëren afhankelijk van de grootte van de VVE en de gewenste diensten.

Hoe lang duurt de overdracht van het beheer?
Een overdracht duurt gemiddeld 4-6 weken na ondertekening van de overeenkomst.

Kunnen we tussentijds opzeggen?
Ja, met inachtneming van de opzegtermijn zoals vermeld in de beheersovereenkomst.
`;

const mockBusinessInfo = {
  companyName: 'Test VVE Beheer',
  industry: 'real-estate',
  targetAudience: 'VVE besturen',
  brandVoice: 'professional',
  primaryGoal: 'inform',
  uniqueSellingPoints: ['expertise', 'service'],
  domain: 'test-vve-beheer.nl',
} as any;

// MVGM Brand Design System CSS
const mvgmBrandCss = `
/* MVGM Brand Design System */
:root {
  --ctc-primary: #012d55;
  --ctc-primary-light: #1a4a73;
  --ctc-primary-dark: #001f3d;
  --ctc-secondary: #e0b15c;
  --ctc-secondary-light: #f0c87a;
  --ctc-accent: #7a9c59;
  --ctc-background: #ffffff;
  --ctc-surface: #f8fafc;
  --ctc-text: #1f2937;
  --ctc-text-secondary: #4b5563;
  --ctc-text-muted: #6b7280;
  --ctc-border: #e5e7eb;
  --ctc-border-subtle: #f3f4f6;
  --ctc-font-display: 'Roboto Slab', Georgia, serif;
  --ctc-font-body: 'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif;
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

  /* Hero customization */
  --ctc-hero-bg: linear-gradient(135deg, #012d55 0%, #001f3d 100%);
  --ctc-hero-text: white;
  --ctc-hero-subtitle: rgba(255,255,255,0.9);
}

body {
  font-family: var(--ctc-font-body);
  color: var(--ctc-text);
  line-height: 1.7;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--ctc-font-display);
}
`;

async function renderTestBlueprint() {
  console.log('='.repeat(70));
  console.log('RENDERING TEST BLUEPRINT');
  console.log('='.repeat(70));

  // Generate blueprint
  const blueprint = generateBlueprintHeuristicV2(
    testArticleContent,
    'VVE Beheer',
    'test-article-render',
    mockBusinessInfo,
    {}
  );

  console.log('\nBlueprint generated with', blueprint.sections.length, 'sections');
  console.log('Components:', blueprint.sections.map(s => s.presentation.component).join(', '));

  // Create a mock brand design system with MVGM colors
  const mvgmBrandDesignSystem = {
    brandName: 'MVGM VVE Beheer',
    extractedAt: new Date().toISOString(),
    compiledCss: `
/* MVGM Brand Design System - Auto-Generated */
.ctc-root, .ctc-styled {
  --ctc-primary: #012d55;
  --ctc-primary-light: #1a4a73;
  --ctc-primary-dark: #001f3d;
  --ctc-secondary: #e0b15c;
  --ctc-secondary-light: #f0c87a;
  --ctc-accent: #7a9c59;
  --ctc-background: #ffffff;
  --ctc-surface: #f8fafc;
  --ctc-surface-elevated: #ffffff;
  --ctc-text: #1f2937;
  --ctc-text-secondary: #4b5563;
  --ctc-text-muted: #6b7280;
  --ctc-border: #e5e7eb;
  --ctc-border-subtle: #f3f4f6;
  --ctc-font-display: 'Roboto Slab', Georgia, serif;
  --ctc-font-body: 'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif;
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

  /* Hero customization for MVGM brand */
  --ctc-hero-bg: linear-gradient(135deg, #012d55 0%, #001f3d 100%);
  --ctc-hero-text: white;
  --ctc-hero-subtitle: rgba(255,255,255,0.9);
}

/* MVGM Hero Section */
.ctc-hero {
  background: linear-gradient(135deg, #012d55 0%, #001f3d 100%);
  color: white;
  padding: 4rem 2rem;
  border-radius: 0 0 2rem 2rem;
}

.ctc-hero-title {
  font-family: 'Roboto Slab', serif;
  font-weight: 800;
}

.ctc-hero-title span {
  color: #e0b15c;
}

/* MVGM Key Takeaways */
.ctc-prose.ctc-section--hero {
  background: linear-gradient(135deg, #012d55 0%, #0a3d6e 100%);
}

/* MVGM Card Grid */
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
  background: linear-gradient(135deg, #012d55 0%, #1a4a73 100%);
  color: white;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

/* MVGM Timeline */
.ctc-timeline-vertical {
  position: relative;
}

.ctc-timeline-step-number {
  background: #012d55;
  color: white;
  font-weight: 700;
}

/* MVGM FAQ Accordion */
.ctc-faq-accordion {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.ctc-faq-trigger {
  background: #f8fafc;
  padding: 1.25rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #012d55;
  border-bottom: 1px solid #e5e7eb;
}

.ctc-faq-trigger:hover {
  background: #f1f5f9;
}

/* MVGM CTA Banner */
.ctc-cta-banner {
  background: linear-gradient(135deg, #012d55 0%, #001f3d 100%);
  color: white;
  padding: 3rem 2rem;
  border-radius: 1.5rem;
  text-align: center;
}

.ctc-cta-title {
  color: white;
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
`,
    components: {},
  };

  // Render to HTML with brand design system
  // Pass proper article title (not full markdown content)
  const articleTitle = 'VVE Beheer - Professioneel Beheer voor uw Vereniging';
  const output = renderBlueprint(blueprint, articleTitle, {
    brief: {
      targetKeyword: 'VVE beheer',
      metaDescription: 'Professioneel VVE beheer voor uw appartementencomplex',
    } as any,
    topic: {
      title: 'VVE Beheer',
      id: 'test-topic',
    } as any,
    personalityId: 'corporate-professional',
    brandDesignSystem: mvgmBrandDesignSystem as any,
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
  <title>VVE Beheer - Design Agency Quality Test</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&family=Roboto+Slab:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${mvgmBrandCss}
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
  const outputPath = 'tmp/stylizer_new/design_agency_test_output.html';
  fs.writeFileSync(outputPath, fullHtml);
  console.log('\n✅ Output saved to:', outputPath);

  // List component classes used
  const componentClasses = output.html.match(/class="ctc-[a-z-]+/g) || [];
  const uniqueClasses = [...new Set(componentClasses)];
  console.log('\nComponent classes found:', uniqueClasses.length);
  console.log(uniqueClasses.map(c => c.replace('class="', '')).join('\n  '));
}

renderTestBlueprint().catch(console.error);
