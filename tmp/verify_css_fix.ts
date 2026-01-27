/**
 * Simple verification that CSS classes are used instead of inline styles
 */
import { getComponentRenderer } from '../services/publishing/renderer/componentLibrary';

// Test the prose component
const proseRenderer = getComponentRenderer('prose');
if (proseRenderer) {
  const result = proseRenderer({
    sectionId: 'test-section',
    heading: 'Test Heading',
    headingLevel: 2,
    emphasis: 'featured',
    spacing: 'normal',
    hasBackground: true,
    hasDivider: false,
    content: 'This is a **test** paragraph with some content.',  // Changed from markdown to content
  });

  console.log('=== PROSE COMPONENT OUTPUT ===');
  console.log(result.html);
  console.log('\n');

  // Check for inline styles
  if (result.html.includes('style="')) {
    console.log('WARNING: Found inline styles in prose component!');
    const styleMatches = result.html.match(/style="[^"]*"/g);
    if (styleMatches) {
      for (const style of styleMatches.slice(0, 5)) {
        console.log('  ' + style);
      }
    }
  } else {
    console.log('SUCCESS: No inline styles in prose component!');
  }

  // List CSS classes
  const classes = result.html.match(/class="([^"]*)"/g);
  if (classes) {
    console.log('\nCSS classes used:');
    for (const cls of classes) {
      console.log('  ' + cls);
    }
  }
}

// Test the faq-accordion component
const faqRenderer = getComponentRenderer('faq-accordion');
if (faqRenderer) {
  const result = faqRenderer({
    sectionId: 'test-faq',
    heading: 'FAQ Section',
    headingLevel: 2,
    emphasis: 'background',
    spacing: 'normal',
    hasBackground: true,
    hasDivider: false,
    content: 'Some intro content',
    faqs: [
      { question: 'What is this?', answer: 'A test FAQ.' },
      { question: 'Why?', answer: 'To verify CSS classes.' },
    ],
  });

  console.log('\n=== FAQ COMPONENT OUTPUT ===');
  console.log(result.html.substring(0, 2000) + '...');
  console.log('\n');

  if (result.html.includes('style="')) {
    console.log('WARNING: Found inline styles in FAQ component!');
    const styleMatches = result.html.match(/style="[^"]*"/g);
    if (styleMatches) {
      console.log('Inline styles found:');
      for (const style of styleMatches.slice(0, 5)) {
        console.log('  ' + style);
      }
    }
  } else {
    console.log('SUCCESS: No inline styles in FAQ component!');
  }
}

// Test the bullet-list component
const bulletRenderer = getComponentRenderer('bullet-list');
if (bulletRenderer) {
  const result = bulletRenderer({
    sectionId: 'test-list',
    heading: 'Features',
    headingLevel: 3,
    emphasis: 'standard',
    spacing: 'normal',
    hasBackground: false,
    hasDivider: false,
    content: '- Feature one\n- Feature two\n- Feature three',
    items: ['Feature one', 'Feature two', 'Feature three'],
  });

  console.log('\n=== BULLET LIST COMPONENT OUTPUT ===');
  console.log(result.html);
  console.log('\n');

  if (result.html.includes('style="')) {
    console.log('WARNING: Found inline styles in bullet-list component!');
  } else {
    console.log('SUCCESS: No inline styles in bullet-list component!');
  }
}

// Test the cta-banner component
const ctaRenderer = getComponentRenderer('cta-banner');
if (ctaRenderer) {
  const result = ctaRenderer({
    sectionId: 'test-cta',
    heading: 'Get Started',
    headingLevel: 2,
    emphasis: 'featured',
    spacing: 'normal',
    hasBackground: true,
    hasDivider: false,
    content: 'Sign up now and get started.',
    title: 'Ready to begin?',
    text: 'Sign up now and get started.',
    primaryCta: { text: 'Sign Up', url: '/signup' },
  });

  console.log('\n=== CTA BANNER COMPONENT OUTPUT ===');
  console.log(result.html);
  console.log('\n');

  if (result.html.includes('style="')) {
    console.log('WARNING: Found inline styles in cta-banner component!');
  } else {
    console.log('SUCCESS: No inline styles in cta-banner component!');
  }
}

// Test the highlight-box component
const highlightRenderer = getComponentRenderer('highlight-box');
if (highlightRenderer) {
  const result = highlightRenderer({
    sectionId: 'test-highlight',
    heading: 'Important Note',
    headingLevel: 3,
    emphasis: 'background',
    spacing: 'normal',
    hasBackground: true,
    hasDivider: false,
    content: 'This is an important highlight box.',
    type: 'info',
    icon: '💡',
  });

  console.log('\n=== HIGHLIGHT BOX COMPONENT OUTPUT ===');
  console.log(result.html);
  console.log('\n');

  if (result.html.includes('style="')) {
    console.log('WARNING: Found inline styles in highlight-box component!');
  } else {
    console.log('SUCCESS: No inline styles in highlight-box component!');
  }
}

// Test the key-takeaways component
const takeawaysRenderer = getComponentRenderer('key-takeaways');
if (takeawaysRenderer) {
  const result = takeawaysRenderer({
    sectionId: 'test-takeaways',
    heading: 'Key Takeaways',
    headingLevel: 2,
    emphasis: 'featured',
    spacing: 'normal',
    hasBackground: true,
    hasDivider: false,
    content: 'Summary content',
    takeaways: [
      'First key takeaway',
      'Second key takeaway',
      'Third key takeaway',
    ],
  });

  console.log('\n=== KEY TAKEAWAYS COMPONENT OUTPUT ===');
  console.log(result.html);
  console.log('\n');

  if (result.html.includes('style="')) {
    console.log('WARNING: Found inline styles in key-takeaways component!');
  } else {
    console.log('SUCCESS: No inline styles in key-takeaways component!');
  }
}

console.log('\n=== VERIFICATION COMPLETE ===');
