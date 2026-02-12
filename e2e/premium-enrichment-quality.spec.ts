import { test, expect } from '@playwright/test';

test.describe('Premium Enrichment Quality - NFIR Pentest Content', () => {

  test('all 5 enrichment types fire on realistic pentest content', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();

    // Realistic NFIR-style pentest article
    const markdown = `## Wat is een pentest?

Een pentest, of penetratietest, is een gecontroleerde cyberaanval op uw IT-infrastructuur om kwetsbaarheden te identificeren voordat kwaadwillenden dat doen. NFIR voert pentests uit volgens de hoogste standaarden.

> Voorkomen is beter dan genezen — investeer in proactieve beveiliging.

## Voordelen van een pentest

- Identificatie van kwetsbaarheden
- Compliance met NEN 7510 en ISO 27001
- Bescherming van klantgegevens
- Versterking van uw beveiligingsstrategie
- Inzicht in uw risicoprofiel

## Stappen in het pentestproces

Zo verloopt een professionele pentest bij NFIR:

1. Scopebepaling en intake met uw team
2. Informatie verzamelen en reconnaissance
3. Kwetsbaarheden identificeren en exploiteren
4. Rapportage met prioriteiten en aanbevelingen
5. Herbeoordeling na implementatie van fixes

<p><strong>Belangrijk:</strong> Een pentest moet minimaal jaarlijks worden uitgevoerd om effectief te blijven.</p>

## Pentest vergelijking: Black Box vs White Box vs Grey Box

| Kenmerk | Black Box | White Box | Grey Box |
|---------|-----------|-----------|----------|
| Kennis aanvaller | Geen voorkennis | Volledige toegang | Beperkte kennis |
| Realisme | Zeer realistisch | Minder realistisch | Gemiddeld |
| Diepgang | Oppervlakkig | Zeer diepgaand | Diepgaand |
| Tijdsduur | Korter | Langer | Gemiddeld |
| Kosten | Lager | Hoger | Gemiddeld |

## Veelgestelde vragen over pentesten

### Hoe lang duurt een pentest?

Een gemiddelde pentest duurt 1-3 weken, afhankelijk van de scope en complexiteit.

### Wat kost een pentest?

De kosten variëren van €5.000 tot €50.000, afhankelijk van de omvang.

### Hoe vaak moet een pentest worden uitgevoerd?

Minimaal jaarlijks, of na significante wijzigingen in uw IT-infrastructuur.`;

    const html = generator.generate(markdown, 'Pentest laten uitvoeren: Alles wat u moet weten', {
      industry: 'Cybersecurity',
      audience: 'IT Managers',
      articlePurpose: 'commercial',
      ctaText: 'Plan een pentest',
      ctaUrl: 'https://www.nfir.nl/contact/',
    });

    // 1. Hero enrichment
    expect(html).toContain('data-hero-content');
    expect(html).toContain('data-hero-subtitle');
    expect(html).toContain('Cybersecurity');
    expect(html).toContain('IT Managers');

    // 2. Feature grid (short list items)
    expect(html).toContain('data-feature-grid');

    // 3. Pull quote (short blockquote)
    expect(html).toContain('data-pull-quote');

    // 4. Step list (steps content type + ol)
    expect(html).toContain('data-step-list');

    // 5. Highlight box (Belangrijk: prefix)
    expect(html).toContain('data-highlight-box');

    // 6. Comparison table (comparison content type + table)
    expect(html).toContain('data-comparison-table');

    // 7. CTA section
    expect(html).toContain('data-content-type="cta"');
    expect(html).toContain('data-cta-button');
    expect(html).toContain('Plan een pentest');

    // 8. FAQ detection
    expect(html).toContain('data-content-type="faq"');

    // 9. Universal hooks — data-section-index on every section
    const sectionIndexMatches = html.match(/data-section-index="\d+"/g) || [];
    expect(sectionIndexMatches.length).toBeGreaterThanOrEqual(5);

    // 10. Prose sections get data-prose-section (only for prose/explanation content types without enrichment)
    // This test's content is all specialized (definition, list, steps, comparison, faq) so prose attr may not appear
    // Verify the mechanism exists by checking the section-role attributes are present
    expect(html).toContain('data-section-role=');

    // 11. Intro text after h2
    expect(html).toContain('data-intro-text');

    // 12. Proper escaping (no raw HTML injection)
    expect(html).not.toContain('<script');

    // 13. Phase 3: Section intelligence — data-section-role values
    expect(html).toContain('data-section-role="definition"');   // "Wat is een pentest?"
    expect(html).toContain('data-section-role="list"');          // "Voordelen" with <ul>
    expect(html).toContain('data-section-role="steps"');         // "Stappen in het pentestproces"
    expect(html).toContain('data-section-role="comparison"');    // "Pentest vergelijking"
    expect(html).toContain('data-section-role="faq"');           // "Veelgestelde vragen"

    // 14. Semantic weights are present on sections
    const weights = (html.match(/data-semantic-weight="(\d)"/g) || [])
      .map(m => m.match(/\d/)![0]);
    expect(weights.length).toBeGreaterThanOrEqual(5);

    // 15. Emphasis levels are present
    expect(html).toContain('data-emphasis=');

    // Log the enrichment markers for visual inspection
    const markers = [
      'data-hero-content', 'data-hero-subtitle', 'data-feature-grid',
      'data-pull-quote', 'data-step-list', 'data-highlight-box',
      'data-comparison-table', 'data-content-type="cta"', 'data-content-type="faq"',
      'data-section-index', 'data-section-role', 'data-intro-text',
      'data-section-role', 'data-semantic-weight', 'data-emphasis',
    ];
    for (const marker of markers) {
      const found = html.includes(marker);
      console.log(`  ${found ? 'PASS' : 'FAIL'} ${marker}`);
    }
  });

  test('enriched HTML renders as a visually rich page in browser', async ({ page }) => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();

    const markdown = `## Wat is een pentest?

Een pentest is een gecontroleerde cyberaanval op uw IT-infrastructuur.

> Voorkomen is beter dan genezen.

## Voordelen van een pentest

- Identificatie van kwetsbaarheden
- Compliance met NEN 7510
- Bescherming van klantgegevens
- Versterking van beveiligingsstrategie

## Stappen in het pentestproces

Zo verloopt een professionele pentest:

1. Scopebepaling en intake
2. Informatie verzamelen
3. Kwetsbaarheden exploiteren
4. Rapportage met aanbevelingen

<p><strong>Belangrijk:</strong> Een pentest moet minimaal jaarlijks worden uitgevoerd.</p>

## Pentest vergelijking: Black Box vs White Box

| Kenmerk | Black Box | White Box |
|---------|-----------|-----------|
| Kennis | Geen | Volledig |
| Realisme | Hoog | Laag |
| Kosten | Lager | Hoger |

## Veelgestelde vragen

### Hoe lang duurt een pentest?

Een gemiddelde pentest duurt 1-3 weken.

### Wat kost een pentest?

De kosten variëren van €5.000 tot €50.000.

### Hoe vaak moet een pentest?

Minimaal jaarlijks.`;

    const html = generator.generate(markdown, 'Pentest uitvoeren: Complete Gids', {
      industry: 'Cybersecurity',
      audience: 'IT Managers',
      articlePurpose: 'commercial',
      ctaText: 'Neem contact op',
      ctaUrl: 'https://www.nfir.nl/contact/',
    });

    // Create a styled version with NFIR-inspired CSS that targets the data-* attributes
    const nfirCss = `
      :root {
        --brand-primary: #0170B9;
        --brand-secondary: #211A9C;
        --brand-accent: #5DC6F2;
        --brand-bg: #ffffff;
        --brand-text: #3a3a3a;
        --brand-surface: #f5f5f5;
        --brand-border: #e5e5e5;
        --brand-radius: 8px;
        --font-heading: 'Barlow Semi Condensed', sans-serif;
        --font-body: 'Roboto', sans-serif;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: var(--font-body); color: var(--brand-text); line-height: 1.65; }
      article { max-width: 100%; }

      /* Hero */
      [data-hero] {
        background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
        color: white; padding: 4rem 2rem; text-align: center; min-height: 200px;
        display: flex; align-items: center; justify-content: center;
      }
      [data-hero] h1 { font-family: var(--font-heading); font-size: 2.8rem; margin-bottom: 0.5rem; }
      [data-hero-subtitle] { opacity: 0.85; font-size: 1.1rem; }

      /* Content body */
      [data-content-body] { max-width: 780px; margin: 0 auto; padding: 2rem; }
      section { margin: 2.5rem 0; padding: 2rem; border-radius: var(--brand-radius); }
      [data-variant="surface"] { background: var(--brand-surface); }

      h2 { font-family: var(--font-heading); color: var(--brand-secondary); font-size: 1.8rem;
           border-left: 4px solid var(--brand-primary); padding-left: 1rem; margin-bottom: 1rem; }

      /* Feature grid */
      [data-feature-grid] {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 1rem; list-style: none; padding: 0;
      }
      [data-feature-grid] li {
        background: white; border: 1px solid var(--brand-border); border-radius: var(--brand-radius);
        padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      [data-feature-grid] li:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

      /* Pull quote */
      [data-pull-quote] {
        font-size: 1.4rem; font-style: italic; text-align: center;
        border-top: 3px solid var(--brand-primary); border-bottom: 3px solid var(--brand-primary);
        border-left: none; padding: 2rem; margin: 2rem 0; color: var(--brand-secondary);
      }

      /* Step list */
      [data-step-list] { counter-reset: step-counter; list-style: none; padding-left: 0; }
      [data-step-list] li {
        counter-increment: step-counter; padding-left: 3.5rem; position: relative; margin-bottom: 1.5rem;
        border-left: 2px solid var(--brand-border); padding-bottom: 1rem;
      }
      [data-step-list] li::before {
        content: counter(step-counter); position: absolute; left: -14px; top: 0;
        width: 28px; height: 28px; border-radius: 50%; background: var(--brand-primary);
        color: white; display: flex; align-items: center; justify-content: center;
        font-weight: bold; font-size: 0.85rem;
      }

      /* Highlight box */
      [data-highlight-box] {
        border-left: 4px solid var(--brand-accent); background: #f0f9ff;
        padding: 1.5rem; border-radius: 0 var(--brand-radius) var(--brand-radius) 0; margin: 1.5rem 0;
      }

      /* Comparison table */
      [data-comparison-table] { border-radius: var(--brand-radius); overflow: hidden; border: 1px solid var(--brand-border); }
      [data-comparison-table] table { width: 100%; border-collapse: collapse; }
      [data-comparison-table] th { background: var(--brand-primary); color: white; padding: 0.75rem 1rem; text-align: left; }
      [data-comparison-table] td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--brand-border); }
      [data-comparison-table] tr:nth-child(even) td { background: var(--brand-surface); }
      [data-comparison-table] tr:hover td { background: #e8f4fd; }

      /* CTA */
      [data-content-type="cta"] {
        background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
        color: white; text-align: center; padding: 3rem; border-radius: var(--brand-radius);
      }
      [data-cta-button] {
        display: inline-block; background: white; color: var(--brand-primary);
        padding: 0.75rem 2rem; border-radius: 999px; text-decoration: none;
        font-weight: bold; margin-top: 1rem; transition: transform 0.2s;
      }
      [data-cta-button]:hover { transform: scale(1.05); }

      /* FAQ */
      details { border: 1px solid var(--brand-border); border-radius: var(--brand-radius); margin: 0.5rem 0; }
      summary { padding: 1rem; cursor: pointer; font-weight: 600; }
      details p { padding: 0 1rem 1rem; }

      /* Footer */
      [data-article-footer] { text-align: center; padding: 2rem; color: #999; font-size: 0.85rem; border-top: 1px solid var(--brand-border); }
    `;

    const fullHtml = '<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>' + nfirCss + '</style></head><body>' + html + '</body></html>';

    await page.setContent(fullHtml);

    // Verify visual components exist in DOM
    const heroHeight = await page.evaluate(() => {
      const hero = document.querySelector('[data-hero]');
      return hero ? hero.getBoundingClientRect().height : 0;
    });
    expect(heroHeight).toBeGreaterThanOrEqual(150); // Bold hero, not tiny

    const gridItems = await page.evaluate(() => {
      const grid = document.querySelector('[data-feature-grid]');
      return grid ? grid.children.length : 0;
    });
    expect(gridItems).toBeGreaterThanOrEqual(3); // Grid has items

    const hasStepNumbers = await page.evaluate(() => {
      const steps = document.querySelector('[data-step-list]');
      if (!steps) return false;
      const firstLi = steps.querySelector('li');
      if (!firstLi) return false;
      const style = window.getComputedStyle(firstLi, '::before');
      return style.content !== 'none' && style.content !== '';
    });
    // Step counter styling applied
    expect(hasStepNumbers).toBeTruthy();

    // Take full-page screenshot for visual inspection
    await page.screenshot({ path: 'test-results/nfir-pentest-enriched.png', fullPage: true });

    // Verify no overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth + 5;
    });
    expect(hasOverflow).toBeFalsy();
  });
});
