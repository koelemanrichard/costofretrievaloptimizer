/**
 * Quick test to verify CleanArticleRenderer works
 */

import { renderCleanArticle } from '../services/publishing/renderer/CleanArticleRenderer';
import type { DesignDNA } from '../types/designDna';

// Sample DesignDNA matching MVGM brand
const mvgmDesignDna: DesignDNA = {
  colors: {
    primary: { hex: '#012d55', rgb: { r: 1, g: 45, b: 85 } },
    primaryLight: { hex: '#1a4a7a', rgb: { r: 26, g: 74, b: 122 } },
    primaryDark: { hex: '#001f3d', rgb: { r: 0, g: 31, b: 61 } },
    secondary: { hex: '#64748b', rgb: { r: 100, g: 116, b: 139 } },
    accent: { hex: '#f59e0b', rgb: { r: 245, g: 158, b: 11 } },
    neutrals: {
      darkest: '#111827',
      dark: '#374151',
      medium: '#6b7280',
      light: '#e5e7eb',
      lightest: '#f9fafb',
    }
  },
  typography: {
    headingFont: {
      family: 'Roboto Slab',
      weights: [400, 700],
      fallback: 'serif',
    },
    bodyFont: {
      family: 'Open Sans',
      weights: [400, 600],
      fallback: 'sans-serif',
    },
    scale: {
      h1: '2.5rem',
      h2: '1.875rem',
      h3: '1.5rem',
      body: '1rem',
      small: '0.875rem',
    }
  },
  shapes: {
    borderRadius: {
      small: '4px',
      medium: '8px',
      large: '16px',
    }
  },
  personality: {
    overall: 'corporate',
    formality: 'professional',
    energy: 'moderate',
  },
  layout: {
    gridStyle: 'structured',
    heroStyle: 'centered',
    containerWidth: '1080px',
  },
  decorative: {
    dividerStyle: 'subtle',
    patternUse: 'minimal',
  }
};

// Sample article content
const sampleArticle = {
  title: 'Totaal VvE Beheer Almere: Uw Partner in Vastgoedbeheer',
  sections: [
    {
      id: 'intro',
      heading: 'Wat is VvE Beheer?',
      headingLevel: 2,
      content: `VvE beheer is essentieel voor het goed functioneren van een Vereniging van Eigenaren. Een professionele VvE beheerder zorgt voor:

- Financieel beheer en administratie
- Technisch onderhoud van het gebouw
- Juridische ondersteuning
- Vergaderingen en besluitvorming

Met **ervaren professionals** aan uw zijde weet u zeker dat uw vastgoed in goede handen is.`
    },
    {
      id: 'services',
      heading: 'Onze Diensten',
      headingLevel: 2,
      content: `Wij bieden een compleet pakket aan diensten voor uw VvE:

| Dienst | Beschrijving | Voordeel |
|--------|-------------|----------|
| Financieel beheer | Boekhouding en begroting | Inzicht in kosten |
| Technisch beheer | Onderhoud en reparaties | Waardebehoud |
| Administratie | Vergaderingen en notulen | Transparantie |

Neem vandaag nog contact met ons op voor een vrijblijvend gesprek.`
    },
    {
      id: 'contact',
      heading: 'Contact',
      headingLevel: 2,
      content: `Heeft u vragen over ons VvE beheer? Neem gerust contact met ons op.

> "Wij staan voor u klaar met persoonlijke service en jarenlange ervaring."

Bel ons op **020-1234567** of stuur een e-mail naar info@example.com.`
    }
  ]
};

// Run the test
console.log('='.repeat(80));
console.log('Testing CleanArticleRenderer');
console.log('='.repeat(80));

const result = renderCleanArticle(sampleArticle, mvgmDesignDna, 'MVGM');

console.log('\n--- HTML Output (first 500 chars) ---');
console.log(result.html.substring(0, 500));

console.log('\n--- CSS Output (first 500 chars) ---');
console.log(result.css.substring(0, 500));

console.log('\n--- Verification Checks ---');
console.log('1. No ctc-* classes:', !result.html.includes('ctc-') ? '✓ PASS' : '✗ FAIL');
console.log('2. Has brand color #012d55:', result.css.includes('#012d55') ? '✓ PASS' : '✗ FAIL');
console.log('3. Has Roboto Slab font:', result.css.includes('Roboto Slab') ? '✓ PASS' : '✗ FAIL');
console.log('4. Has table element:', result.html.includes('<table>') ? '✓ PASS' : '✗ FAIL');
console.log('5. Has list element:', result.html.includes('<ul>') ? '✓ PASS' : '✗ FAIL');
console.log('6. Has blockquote:', result.html.includes('<blockquote>') ? '✓ PASS' : '✗ FAIL');
console.log('7. Has strong tag:', result.html.includes('<strong>') ? '✓ PASS' : '✗ FAIL');
console.log('8. Full document has DOCTYPE:', result.fullDocument.includes('<!DOCTYPE html>') ? '✓ PASS' : '✗ FAIL');
console.log('9. Has Google Fonts link:', result.fullDocument.includes('fonts.googleapis.com') ? '✓ PASS' : '✗ FAIL');

console.log('\n--- Full Document Length ---');
console.log(`HTML: ${result.html.length} chars`);
console.log(`CSS: ${result.css.length} chars`);
console.log(`Full Document: ${result.fullDocument.length} chars`);

// Write full output to file for inspection
const fs = await import('fs');
fs.writeFileSync('tmp/clean_renderer_output.html', result.fullDocument);
console.log('\n✓ Full output written to tmp/clean_renderer_output.html');
