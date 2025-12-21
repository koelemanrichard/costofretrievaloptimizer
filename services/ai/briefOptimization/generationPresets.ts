/**
 * Generation Presets - Monetization Enhancement for Initial Brief Generation
 *
 * These prompt fragments are injected into the content brief generation prompt
 * for monetization topics to ensure they start with good 4 Pillars scores.
 *
 * Purpose: Pre-optimize briefs so AI Fix is rarely needed
 *
 * Note: Core functions (getMonetizationPromptEnhancement, shouldApplyMonetizationEnhancement)
 * are now in utils/monetizationPromptUtils.ts to avoid circular dependencies with config.
 * They are re-exported here for backward compatibility.
 */

import { getKeywordsForLanguage, KeywordCategory } from '../../../config/moneyPageKeywords';

// Re-export from utils for backward compatibility
export {
  getMonetizationPromptEnhancement,
  shouldApplyMonetizationEnhancement,
} from '../../../utils/monetizationPromptUtils';

/**
 * Get brief structure requirements for monetization topics
 * Returns sections that should be included in the brief
 */
export function getMonetizationStructureRequirements(language: string): {
  requiredSections: string[];
  suggestedSections: string[];
} {
  const isNL = language.toLowerCase().startsWith('nl') || language.toLowerCase() === 'dutch';
  const isDE = language.toLowerCase().startsWith('de') || language.toLowerCase() === 'german';
  const isFR = language.toLowerCase().startsWith('fr') || language.toLowerCase() === 'french';
  const isES = language.toLowerCase().startsWith('es') || language.toLowerCase() === 'spanish';

  if (isNL) {
    return {
      requiredSections: [
        'Voordelen',
        'Prijzen',
        'Contact',
      ],
      suggestedSections: [
        'Klantervaringen',
        'Hoe het werkt',
        'Veelgestelde vragen',
      ],
    };
  }

  if (isDE) {
    return {
      requiredSections: [
        'Vorteile',
        'Preise',
        'Kontakt',
      ],
      suggestedSections: [
        'Kundenbewertungen',
        'So funktioniert es',
        'Häufige Fragen',
      ],
    };
  }

  if (isFR) {
    return {
      requiredSections: [
        'Avantages',
        'Tarifs',
        'Contact',
      ],
      suggestedSections: [
        'Témoignages',
        'Comment ça marche',
        'Questions fréquentes',
      ],
    };
  }

  if (isES) {
    return {
      requiredSections: [
        'Beneficios',
        'Precios',
        'Contacto',
      ],
      suggestedSections: [
        'Testimonios',
        'Cómo funciona',
        'Preguntas frecuentes',
      ],
    };
  }

  // Default: English
  return {
    requiredSections: [
      'Benefits',
      'Pricing',
      'Contact',
    ],
    suggestedSections: [
      'Customer testimonials',
      'How it works',
      'FAQ',
    ],
  };
}

/**
 * Get CTA suggestions based on language
 */
export function getCTASuggestions(language: string, topicTitle: string): string[] {
  const ctaWords = getKeywordsForLanguage('cta', language);
  const shortTitle = topicTitle.split(' ').slice(0, 3).join(' ');

  const isNL = language.toLowerCase().startsWith('nl') || language.toLowerCase() === 'dutch';
  const isDE = language.toLowerCase().startsWith('de') || language.toLowerCase() === 'german';

  if (isNL) {
    return [
      `Start nu met ${shortTitle}`,
      `Vraag een offerte aan`,
      `Boek een gratis consultatie`,
      `Ontdek meer over ${shortTitle}`,
      `Neem contact op`,
    ];
  }

  if (isDE) {
    return [
      `Jetzt mit ${shortTitle} starten`,
      `Angebot anfordern`,
      `Kostenlose Beratung buchen`,
      `Mehr über ${shortTitle} erfahren`,
      `Kontakt aufnehmen`,
    ];
  }

  // Default: English
  return [
    `Get started with ${shortTitle}`,
    `Request a quote`,
    `Book a free consultation`,
    `Learn more about ${shortTitle}`,
    `Contact us today`,
  ];
}

/**
 * Get hero image prompt template
 */
export function getHeroImagePromptTemplate(
  topicTitle: string,
  centralEntity: string,
  language: string
): string {
  return `Professional, modern hero image showcasing ${centralEntity || topicTitle}. ` +
    `Clean composition with subtle gradient background. ` +
    `Include visual elements suggesting trust and expertise: certification badge, clean interface, or professional environment. ` +
    `Style: corporate but approachable, high contrast, web-optimized aspect ratio 16:9. ` +
    `Color palette: professional blues and whites with accent color for CTAs.`;
}

/**
 * Get validation rules for monetization briefs
 * Used to check if a brief meets minimum requirements before saving
 */
export function getMonetizationValidationRules(): Array<{
  field: string;
  rule: (value: any) => boolean;
  message: string;
}> {
  return [
    {
      field: 'cta',
      rule: (v) => typeof v === 'string' && v.length >= 5,
      message: 'CTA field is required for monetization topics',
    },
    {
      field: 'visuals.featuredImagePrompt',
      rule: (v) => typeof v === 'string' && v.length >= 20,
      message: 'Hero image prompt (20+ chars) is required for monetization topics',
    },
    {
      field: 'title',
      rule: (v) => typeof v === 'string' && v.length >= 10,
      message: 'Title is required',
    },
  ];
}

/**
 * Get keyword density requirements for monetization briefs
 */
export function getKeywordDensityRequirements(language: string): {
  field: string;
  categories: KeywordCategory[];
  minMatches: number;
}[] {
  return [
    { field: 'title', categories: ['benefit', 'howTo'], minMatches: 1 },
    { field: 'metaDescription', categories: ['power'], minMatches: 2 },
    { field: 'outline', categories: ['socialProof', 'pricing', 'roi'], minMatches: 3 },
    { field: 'cta', categories: ['cta'], minMatches: 1 },
  ];
}
