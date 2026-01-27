/**
 * Test script for BrandAwareComposer improvements.
 * Run with: npx tsx tmp/test_brand_composer.ts
 */

import { BrandAwareComposer, ArticleContent } from '../services/brand-composer/BrandAwareComposer';
import { StandaloneCssGenerator } from '../services/brand-composer/StandaloneCssGenerator';
import type { ExtractedComponent, ExtractedTokens } from '../types/brandExtraction';

// Test article with markdown content
const testArticle: ArticleContent = {
  title: 'Incident Response Retainer Overheid',
  sections: [
    {
      id: 'section-1',
      heading: 'Wat is een Incident Response Retainer?',
      headingLevel: 2,
      content: `Een **Incident Response Retainer** voor de Overheid is een contractueel vastgelegde cybersecurity-dienst.

Dit artikel belicht de unieke kenmerken:
- Diagnostische snelheid
- Grondige post-incident documentatie
- 24/7 beschikbaarheid

Neem [contact op](/contact) voor meer informatie.`
    },
    {
      id: 'section-2',
      heading: 'Voordelen',
      headingLevel: 2,
      content: `De belangrijkste voordelen zijn:

1. Snellere respons
2. Budgetzekerheid
3. Juridische duidelijkheid

Vraag nu een **offerte** aan.`
    }
  ]
};

// Test extracted components (simulating what we'd get from extraction)
const testComponents: ExtractedComponent[] = [
  {
    id: 'comp-1',
    extractionId: 'ext-1',
    projectId: 'proj-1',
    visualDescription: 'Article section with heading and content',
    componentType: 'article',
    literalHtml: '', // Empty - should trigger fallback
    literalCss: '',
    theirClassNames: ['article-content', 'content-block'],
    contentSlots: [{ name: 'content', selector: '*', type: 'html' as const, required: true }],
    createdAt: new Date().toISOString()
  }
];

// Test tokens
const testTokens: ExtractedTokens = {
  id: 'tokens-1',
  projectId: 'proj-1',
  colors: {
    values: [
      { hex: '#1a365d', usage: 'primary', frequency: 5 },
      { hex: '#2d3748', usage: 'secondary', frequency: 3 },
      { hex: '#3182ce', usage: 'accent', frequency: 2 }
    ]
  },
  typography: {
    headings: { fontFamily: 'Inter, sans-serif', fontWeight: 700 },
    body: { fontFamily: 'Inter, sans-serif', fontWeight: 400, lineHeight: 1.7 }
  },
  spacing: {
    sectionGap: '3rem',
    cardPadding: '2rem',
    contentWidth: '900px'
  },
  shadows: {
    card: '0 2px 8px rgba(0,0,0,0.1)',
    elevated: '0 4px 16px rgba(0,0,0,0.15)'
  },
  borders: {
    radiusSmall: '4px',
    radiusMedium: '8px',
    radiusLarge: '16px',
    defaultColor: '#e2e8f0'
  },
  extractedFrom: ['test'],
  extractedAt: new Date().toISOString()
};

async function runTest() {
  console.log('=== Testing BrandAwareComposer ===\n');

  // Create composer
  const composer = new BrandAwareComposer({
    projectId: 'test-project',
    aiProvider: 'gemini',
    apiKey: 'test-key'
  });

  // Run composition
  console.log('1. Composing article with markdown content...');
  const result = await composer.compose(testArticle, testComponents);

  console.log('\n2. Checking HTML output...');

  // Check for markdown conversion issues
  const issues: string[] = [];

  if (result.html.includes('**')) {
    issues.push('ERROR: Raw markdown bold (**) found in output');
  }
  if (result.html.match(/^# /m)) {
    issues.push('ERROR: Raw markdown heading (#) found in output');
  }
  if (result.html.includes('<!-- Component:')) {
    issues.push('ERROR: Placeholder comment found in output');
  }

  // Check for proper HTML
  const hasStrong = result.html.includes('<strong>');
  const hasParagraphs = result.html.includes('<p>');
  const hasLinks = result.html.includes('<a href=');
  const hasLists = result.html.includes('<li>');

  console.log(`   - Has <strong> tags: ${hasStrong}`);
  console.log(`   - Has <p> tags: ${hasParagraphs}`);
  console.log(`   - Has <a> links: ${hasLinks}`);
  console.log(`   - Has <li> list items: ${hasLists}`);

  // Print issues
  if (issues.length > 0) {
    console.log('\n=== ISSUES FOUND ===');
    issues.forEach(i => console.log(`   ${i}`));
  } else {
    console.log('\n=== MARKDOWN CONVERSION: OK ===');
  }

  // Test CSS generation
  console.log('\n3. Testing CSS generation...');
  const cssGenerator = new StandaloneCssGenerator();
  const css = cssGenerator.generate(testComponents, [], testTokens);

  const hasCssVars = css.includes('--color-');
  const hasBrandSection = css.includes('.brand-section') || css.includes('.brand-article');
  const hasFallbackCss = css.includes('font-family: var(--font-') || css.includes('padding: var(--');

  console.log(`   - Has CSS variables: ${hasCssVars}`);
  console.log(`   - Has brand selectors: ${hasBrandSection}`);
  console.log(`   - Has fallback CSS: ${hasFallbackCss}`);

  // Print sample output
  console.log('\n=== SAMPLE HTML OUTPUT (first 1500 chars) ===');
  console.log(result.html.substring(0, 1500));

  console.log('\n=== SAMPLE CSS OUTPUT (first 1000 chars) ===');
  console.log(css.substring(0, 1000));

  // Summary
  console.log('\n=== TEST SUMMARY ===');
  const allGood = issues.length === 0 && hasStrong && hasParagraphs && hasCssVars;
  console.log(`Result: ${allGood ? 'PASS' : 'FAIL'}`);
}

runTest().catch(console.error);
