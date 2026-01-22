/**
 * Component Registry
 *
 * Defines reusable component patterns with variants (CVA-inspired).
 * Each component has base styles, variants, and compound variants.
 *
 * @module services/publishing/components/registry
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ComponentVariants {
  [variantName: string]: {
    [optionName: string]: string;
  };
}

export interface ComponentDefinition<V extends ComponentVariants = ComponentVariants> {
  name: string;
  description: string;
  semanticElement: string;
  ariaRole?: string;
  schemaType?: string;
  baseClasses: string;
  variants: V;
  defaultVariants: { [K in keyof V]?: keyof V[K] };
  slots?: string[];
  compoundVariants?: Array<{
    conditions: Partial<{ [K in keyof V]?: keyof V[K] }>;
    classes: string;
  }>;
}

// ============================================================================
// BUTTON COMPONENT
// ============================================================================

export const buttonComponent: ComponentDefinition<{
  intent: { primary: string; secondary: string; ghost: string; white: string; outline: string };
  size: { sm: string; md: string; lg: string };
}> = {
  name: 'button',
  description: 'Call-to-action button with multiple intents and sizes',
  semanticElement: 'a',
  baseClasses: 'ctc-btn inline-flex items-center justify-center font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2',
  variants: {
    intent: {
      primary: 'ctc-btn--primary bg-[var(--ctc-primary)] text-[var(--ctc-text-inverse)] hover:bg-[var(--ctc-primary-dark)] focus-visible:outline-[var(--ctc-primary)]',
      secondary: 'ctc-btn--secondary bg-[var(--ctc-surface)] text-[var(--ctc-primary)] border-2 border-[var(--ctc-primary)] hover:bg-[var(--ctc-primary)] hover:text-[var(--ctc-text-inverse)]',
      ghost: 'ctc-btn--ghost bg-transparent text-[var(--ctc-primary)] hover:bg-[var(--ctc-primary)]/10',
      white: 'ctc-btn--white bg-white text-[var(--ctc-primary)] hover:bg-gray-100',
      outline: 'ctc-btn--outline bg-transparent text-[var(--ctc-text)] border-2 border-[var(--ctc-border)] hover:border-[var(--ctc-primary)] hover:text-[var(--ctc-primary)]',
    },
    size: {
      sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-[var(--ctc-radius-md)]',
      md: 'px-4 py-2 text-base gap-2 rounded-[var(--ctc-radius-lg)]',
      lg: 'px-6 py-3 text-lg gap-2.5 rounded-[var(--ctc-radius-lg)]',
    },
  },
  defaultVariants: { intent: 'primary', size: 'md' },
  slots: ['icon-start', 'label', 'icon-end'],
  compoundVariants: [
    {
      conditions: { intent: 'primary', size: 'lg' },
      classes: 'shadow-lg hover:shadow-xl hover:-translate-y-0.5',
    },
    {
      conditions: { intent: 'white', size: 'lg' },
      classes: 'shadow-lg hover:shadow-xl',
    },
  ],
};

// ============================================================================
// HERO COMPONENT
// ============================================================================

export const heroComponent: ComponentDefinition<{
  layout: { centered: string; split: string; minimal: string; asymmetric: string; 'full-bleed': string };
  background: { gradient: string; solid: string; image: string; 'image-overlay': string };
}> = {
  name: 'hero',
  description: 'Hero section with multiple layout and background options',
  semanticElement: 'header',
  ariaRole: 'banner',
  baseClasses: 'ctc-hero relative overflow-hidden',
  variants: {
    layout: {
      centered: 'ctc-hero--centered text-center py-16 md:py-24',
      split: 'ctc-hero--split grid md:grid-cols-2 gap-8 items-center py-12 md:py-16',
      minimal: 'ctc-hero--minimal py-8 md:py-12',
      asymmetric: 'ctc-hero--asymmetric py-16 md:py-24',
      'full-bleed': 'ctc-hero--full-bleed min-h-[60vh] flex items-center py-16',
    },
    background: {
      gradient: 'ctc-hero--gradient bg-[var(--ctc-gradient-hero)] text-[var(--ctc-text-inverse)]',
      solid: 'ctc-hero--solid bg-[var(--ctc-surface)]',
      image: 'ctc-hero--image bg-cover bg-center',
      'image-overlay': 'ctc-hero--image-overlay bg-cover bg-center before:absolute before:inset-0 before:bg-gradient-to-b before:from-black/60 before:to-black/80 text-white',
    },
  },
  defaultVariants: { layout: 'centered', background: 'gradient' },
  slots: ['pretitle', 'title', 'subtitle', 'actions', 'media'],
};

// ============================================================================
// CARD COMPONENT
// ============================================================================

export const cardComponent: ComponentDefinition<{
  elevation: { flat: string; raised: string; floating: string; outlined: string; glass: string };
  padding: { compact: string; normal: string; spacious: string };
}> = {
  name: 'card',
  description: 'Reusable card with elevation and padding variants',
  semanticElement: 'div',
  baseClasses: 'ctc-card rounded-[var(--ctc-radius-xl)] bg-[var(--ctc-surface)] transition-all',
  variants: {
    elevation: {
      flat: 'ctc-card--flat',
      raised: 'ctc-card--raised shadow-[var(--ctc-shadow-md)]',
      floating: 'ctc-card--floating shadow-[var(--ctc-shadow-xl)] hover:shadow-[var(--ctc-shadow-2xl)] hover:-translate-y-1',
      outlined: 'ctc-card--outlined border border-[var(--ctc-border)]',
      glass: 'ctc-card--glass bg-white/80 backdrop-blur-sm border border-white/20',
    },
    padding: {
      compact: 'p-4',
      normal: 'p-6',
      spacious: 'p-8',
    },
  },
  defaultVariants: { elevation: 'raised', padding: 'normal' },
  slots: ['icon', 'header', 'content', 'footer'],
};

// ============================================================================
// TIMELINE COMPONENT
// ============================================================================

export const timelineComponent: ComponentDefinition<{
  orientation: { vertical: string; horizontal: string; zigzag: string };
  style: { numbered: string; icons: string; dots: string };
}> = {
  name: 'timeline',
  description: 'Process/steps timeline with multiple orientations',
  semanticElement: 'section',
  schemaType: 'HowTo',
  baseClasses: 'ctc-timeline relative',
  variants: {
    orientation: {
      vertical: 'ctc-timeline--vertical flex flex-col',
      horizontal: 'ctc-timeline--horizontal flex flex-row overflow-x-auto gap-6 pb-4',
      zigzag: 'ctc-timeline--zigzag max-w-4xl mx-auto',
    },
    style: {
      numbered: 'ctc-timeline--numbered',
      icons: 'ctc-timeline--icons',
      dots: 'ctc-timeline--dots',
    },
  },
  defaultVariants: { orientation: 'zigzag', style: 'numbered' },
  slots: ['title', 'steps'],
};

// ============================================================================
// TESTIMONIAL COMPONENT
// ============================================================================

export const testimonialComponent: ComponentDefinition<{
  layout: { card: string; minimal: string; featured: string };
}> = {
  name: 'testimonial',
  description: 'Quote/testimonial block with multiple layouts',
  semanticElement: 'blockquote',
  schemaType: 'Review',
  baseClasses: 'ctc-testimonial relative',
  variants: {
    layout: {
      card: 'ctc-testimonial--card bg-[var(--ctc-surface)] p-6 rounded-[var(--ctc-radius-xl)] shadow-[var(--ctc-shadow-md)] border-l-4 border-[var(--ctc-primary)]',
      minimal: 'ctc-testimonial--minimal pl-6 border-l-4 border-[var(--ctc-primary)]/30 italic',
      featured: 'ctc-testimonial--featured bg-gradient-to-br from-[var(--ctc-primary)]/5 to-transparent p-8 rounded-[var(--ctc-radius-2xl)]',
    },
  },
  defaultVariants: { layout: 'card' },
  slots: ['quote-mark', 'content', 'author', 'author-title', 'avatar'],
};

// ============================================================================
// FAQ COMPONENT
// ============================================================================

export const faqComponent: ComponentDefinition<{
  style: { accordion: string; cards: string; simple: string };
}> = {
  name: 'faq',
  description: 'FAQ section with Schema.org support',
  semanticElement: 'section',
  schemaType: 'FAQPage',
  baseClasses: 'ctc-faq',
  variants: {
    style: {
      accordion: 'ctc-faq--accordion divide-y divide-[var(--ctc-border)]',
      cards: 'ctc-faq--cards grid gap-4',
      simple: 'ctc-faq--simple space-y-6',
    },
  },
  defaultVariants: { style: 'accordion' },
  slots: ['title', 'description', 'items'],
};

// ============================================================================
// CTA SECTION COMPONENT
// ============================================================================

export const ctaSectionComponent: ComponentDefinition<{
  variant: { gradient: string; solid: string; outlined: string; 'bold-contrast': string; 'gradient-glow': string; 'warm-gradient': string };
}> = {
  name: 'cta-section',
  description: 'Call-to-action section with multiple visual styles',
  semanticElement: 'aside',
  baseClasses: 'ctc-cta-section rounded-[var(--ctc-radius-2xl)] text-center',
  variants: {
    variant: {
      gradient: 'ctc-cta--gradient bg-[var(--ctc-gradient-cta)] text-white py-12 px-8',
      solid: 'ctc-cta--solid bg-[var(--ctc-primary)] text-[var(--ctc-text-inverse)] py-12 px-8',
      outlined: 'ctc-cta--outlined border-2 border-[var(--ctc-primary)] text-[var(--ctc-text)] py-12 px-8',
      'bold-contrast': 'ctc-cta--bold-contrast bg-[var(--ctc-text)] text-[var(--ctc-background)] py-16 px-8',
      'gradient-glow': 'ctc-cta--gradient-glow bg-[var(--ctc-gradient-hero)] text-white py-12 px-8 shadow-[0_0_60px_var(--ctc-primary)]',
      'warm-gradient': 'ctc-cta--warm-gradient bg-gradient-to-r from-[var(--ctc-primary)] via-[var(--ctc-accent)] to-[var(--ctc-secondary)] text-white py-12 px-8',
    },
  },
  defaultVariants: { variant: 'gradient' },
  slots: ['title', 'text', 'actions'],
};

// ============================================================================
// KEY TAKEAWAYS COMPONENT
// ============================================================================

export const keyTakeawaysComponent: ComponentDefinition<{
  style: { box: string; cards: string; numbered: string; icons: string };
}> = {
  name: 'key-takeaways',
  description: 'Key takeaways/summary box',
  semanticElement: 'aside',
  baseClasses: 'ctc-takeaways',
  variants: {
    style: {
      box: 'ctc-takeaways--box bg-[var(--ctc-surface)] border-l-4 border-[var(--ctc-primary)] p-6 rounded-[var(--ctc-radius-lg)]',
      cards: 'ctc-takeaways--cards bg-gradient-to-br from-[var(--ctc-primary)] to-[var(--ctc-primary-dark)] text-white p-8 rounded-[var(--ctc-radius-2xl)]',
      numbered: 'ctc-takeaways--numbered bg-[var(--ctc-surface)] p-6 rounded-[var(--ctc-radius-lg)] shadow-[var(--ctc-shadow-md)]',
      icons: 'ctc-takeaways--icons',
    },
  },
  defaultVariants: { style: 'box' },
  slots: ['title', 'items'],
};

// ============================================================================
// BENEFITS GRID COMPONENT
// ============================================================================

export const benefitsGridComponent: ComponentDefinition<{
  columns: { '2': string; '3': string; '4': string };
  style: { icons: string; cards: string; minimal: string };
}> = {
  name: 'benefits-grid',
  description: 'Benefits/features grid with icon cards',
  semanticElement: 'section',
  baseClasses: 'ctc-benefits-grid',
  variants: {
    columns: {
      '2': 'grid md:grid-cols-2 gap-6',
      '3': 'grid md:grid-cols-2 lg:grid-cols-3 gap-6',
      '4': 'grid md:grid-cols-2 lg:grid-cols-4 gap-6',
    },
    style: {
      icons: 'ctc-benefits--icons',
      cards: 'ctc-benefits--cards',
      minimal: 'ctc-benefits--minimal',
    },
  },
  defaultVariants: { columns: '3', style: 'icons' },
  slots: ['title', 'items'],
};

// ============================================================================
// AUTHOR BOX COMPONENT
// ============================================================================

export const authorBoxComponent: ComponentDefinition<{
  layout: { horizontal: string; vertical: string; compact: string };
}> = {
  name: 'author-box',
  description: 'Author information box for E-E-A-T signals',
  semanticElement: 'aside',
  schemaType: 'Person',
  baseClasses: 'ctc-author-box',
  variants: {
    layout: {
      horizontal: 'ctc-author--horizontal flex gap-4 items-center p-6 bg-[var(--ctc-surface)] rounded-[var(--ctc-radius-xl)]',
      vertical: 'ctc-author--vertical flex flex-col items-center text-center p-6 bg-[var(--ctc-surface)] rounded-[var(--ctc-radius-xl)]',
      compact: 'ctc-author--compact flex gap-3 items-center',
    },
  },
  defaultVariants: { layout: 'horizontal' },
  slots: ['avatar', 'name', 'title', 'bio', 'social'],
};

// ============================================================================
// TABLE OF CONTENTS COMPONENT
// ============================================================================

export const tocComponent: ComponentDefinition<{
  position: { sidebar: string; inline: string; floating: string };
}> = {
  name: 'toc',
  description: 'Table of contents navigation',
  semanticElement: 'nav',
  ariaRole: 'navigation',
  baseClasses: 'ctc-toc',
  variants: {
    position: {
      sidebar: 'ctc-toc--sidebar sticky top-4 bg-[var(--ctc-surface)] p-4 rounded-[var(--ctc-radius-lg)]',
      inline: 'ctc-toc--inline bg-[var(--ctc-surface)] p-6 rounded-[var(--ctc-radius-lg)] mb-8',
      floating: 'ctc-toc--floating fixed right-4 top-1/2 -translate-y-1/2 bg-[var(--ctc-surface)] p-4 rounded-[var(--ctc-radius-lg)] shadow-[var(--ctc-shadow-xl)]',
    },
  },
  defaultVariants: { position: 'sidebar' },
  slots: ['title', 'items'],
};

// ============================================================================
// SOURCES SECTION COMPONENT
// ============================================================================

export const sourcesComponent: ComponentDefinition<{
  style: { list: string; cards: string };
}> = {
  name: 'sources',
  description: 'Sources and citations section for E-E-A-T',
  semanticElement: 'section',
  baseClasses: 'ctc-sources',
  variants: {
    style: {
      list: 'ctc-sources--list',
      cards: 'ctc-sources--cards grid gap-3',
    },
  },
  defaultVariants: { style: 'list' },
  slots: ['title', 'items', 'methodology'],
};

// ============================================================================
// REGISTRY COLLECTION
// ============================================================================

export const componentRegistry = {
  button: buttonComponent,
  hero: heroComponent,
  card: cardComponent,
  timeline: timelineComponent,
  testimonial: testimonialComponent,
  faq: faqComponent,
  'cta-section': ctaSectionComponent,
  'key-takeaways': keyTakeawaysComponent,
  'benefits-grid': benefitsGridComponent,
  'author-box': authorBoxComponent,
  toc: tocComponent,
  sources: sourcesComponent,
} as const;

export type ComponentName = keyof typeof componentRegistry;

/**
 * Get component definition by name
 */
export function getComponentDefinition(name: ComponentName): ComponentDefinition {
  return componentRegistry[name] as ComponentDefinition;
}

/**
 * Get all component names
 */
export function getAllComponentNames(): ComponentName[] {
  return Object.keys(componentRegistry) as ComponentName[];
}
