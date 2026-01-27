/**
 * Direct test of the rendering output to verify CSS fix.
 * Tests that HTML output uses CSS classes instead of inline styles.
 */
import { renderBlueprint } from '../services/publishing/renderer/blueprintRenderer';
import type { LayoutBlueprint } from '../services/publishing/architect/blueprintTypes';

// Create a sample blueprint
const sampleBlueprint: LayoutBlueprint = {
  id: 'test-blueprint',
  version: '2.0',
  createdAt: new Date().toISOString(),
  visualStyle: {
    personality: 'professional',
    density: 'comfortable',
    emphasis: 'moderate',
  },
  sections: [
    {
      id: 'hero',
      contentType: 'hero',
      semanticWeight: 5,
      content: {
        heading: 'Test Article Title',
        subheading: 'A test article to verify CSS fix',
      },
      design: {
        component: 'prose',
        layout: { width: 'full', columns: 1, gap: 'md', padding: 'lg', alignment: 'center' },
        visual: { emphasis: 'hero', background: 'gradient', shadow: 'lg', borderRadius: 'lg', animation: 'fade' },
      },
    },
    {
      id: 'intro',
      contentType: 'prose',
      semanticWeight: 3,
      content: {
        markdown: '## Introduction\n\nThis is the introduction paragraph. It should be styled by CSS classes, not inline styles.',
      },
      design: {
        component: 'prose',
        layout: { width: 'reading', columns: 1, gap: 'md', padding: 'md', alignment: 'left' },
        visual: { emphasis: 'standard', background: 'none', shadow: 'none', borderRadius: 'none', animation: 'none' },
      },
    },
    {
      id: 'featured',
      contentType: 'prose',
      semanticWeight: 4,
      content: {
        markdown: '## Featured Section\n\nThis is a featured section with emphasis styling.',
      },
      design: {
        component: 'prose',
        layout: { width: 'wide', columns: 1, gap: 'md', padding: 'lg', alignment: 'left' },
        visual: { emphasis: 'featured', background: 'surface', shadow: 'md', borderRadius: 'lg', animation: 'none' },
      },
    },
    {
      id: 'faq',
      contentType: 'faq',
      semanticWeight: 3,
      content: {
        heading: 'FAQ Section',
        items: [
          { question: 'What is this test?', answer: 'A test to verify CSS classes are used instead of inline styles.' },
          { question: 'Why is this important?', answer: 'Because inline styles override CSS class styles due to specificity.' },
        ],
      },
      design: {
        component: 'faq-accordion',
        layout: { width: 'reading', columns: 1, gap: 'md', padding: 'md', alignment: 'left' },
        visual: { emphasis: 'background', background: 'surface', shadow: 'sm', borderRadius: 'md', animation: 'none' },
      },
    },
  ],
};

async function testRendering() {
  console.log('Testing blueprint rendering...\n');

  try {
    const output = await renderBlueprint(sampleBlueprint, {
      personalityId: 'professional',
    });

    console.log(`Generated HTML: ${output.html.length} chars`);
    console.log(`Generated CSS: ${output.css.length} chars`);

    // Save the output
    const fs = await import('fs');
    fs.writeFileSync('tmp/test_render_output.html', output.html);
    fs.writeFileSync('tmp/test_render_output.css', output.css);
    console.log('Saved output to tmp/test_render_output.html and tmp/test_render_output.css');

    // Check for problematic inline styles
    const problematicPatterns = [
      // Elements with ctc- class AND inline style containing background/padding/margin
      /<(header|section|div|article)[^>]*class="[^"]*ctc-[^"]*"[^>]*style="[^"]*(?:background|padding|margin)[^"]*"/gi,
    ];

    console.log('\n=== Checking for inline styles on CTC elements ===');

    let hasProblems = false;
    for (const pattern of problematicPatterns) {
      const matches = output.html.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`\nWARNING: Found ${matches.length} elements with inline styles:`);
        for (const match of matches.slice(0, 5)) {
          console.log(`  ${match.substring(0, 150)}...`);
        }
        hasProblems = true;
      }
    }

    if (!hasProblems) {
      console.log('\nSUCCESS: No problematic inline styles found on CTC elements!');
    }

    // Check that CSS classes are being used
    const ctcClasses = output.html.match(/class="([^"]*ctc-[^"]*)"/g) || [];
    const uniqueClasses = new Set<string>();
    for (const match of ctcClasses) {
      const classes = match.replace(/class="|"/g, '').split(' ');
      for (const cls of classes) {
        if (cls.startsWith('ctc-')) {
          uniqueClasses.add(cls);
        }
      }
    }

    console.log(`\n=== Found ${uniqueClasses.size} unique CTC classes ===`);
    const sortedClasses = Array.from(uniqueClasses).sort();
    for (const cls of sortedClasses.slice(0, 30)) {
      console.log(`  ${cls}`);
    }

    // Check hero element specifically
    const heroMatch = output.html.match(/<header[^>]*class="([^"]*ctc-hero[^"]*)"/);
    if (heroMatch) {
      console.log(`\n=== Hero element ===`);
      console.log(`Classes: ${heroMatch[1]}`);

      const heroInline = output.html.match(/<header[^>]*class="[^"]*ctc-hero[^"]*"[^>]*style="([^"]*)"/);
      if (heroInline) {
        console.log(`WARNING: Hero has inline style: ${heroInline[1].substring(0, 100)}...`);
      } else {
        console.log('SUCCESS: Hero has no inline styles!');
      }
    }

    // Check section elements
    const sectionMatches = output.html.match(/<section[^>]*class="([^"]*ctc-[^"]*)"[^>]*>/g) || [];
    console.log(`\n=== Section elements (${sectionMatches.length} found) ===`);
    for (const match of sectionMatches.slice(0, 5)) {
      const classMatch = match.match(/class="([^"]*)"/);
      const styleMatch = match.match(/style="([^"]*)"/);
      console.log(`  Classes: ${classMatch?.[1]}`);
      if (styleMatch) {
        console.log(`  WARNING: Has inline style: ${styleMatch[1].substring(0, 80)}...`);
      }
    }

    console.log('\n=== Test complete ===');

  } catch (error) {
    console.error('Error during rendering:', error);
  }
}

testRendering();
