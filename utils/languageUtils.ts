// utils/languageUtils.ts
// Utility functions for language handling in AI prompts

/**
 * Regional variant mappings - maps region to language variant
 * Used to determine regional language variations (e.g., British English vs American English)
 */
const REGIONAL_LANGUAGE_VARIANTS: Record<string, Record<string, string>> = {
  'english': {
    'united states': 'American English',
    'usa': 'American English',
    'us': 'American English',
    'america': 'American English',
    'united kingdom': 'British English',
    'uk': 'British English',
    'britain': 'British English',
    'england': 'British English',
    'scotland': 'British English',
    'wales': 'British English',
    'australia': 'Australian English',
    'new zealand': 'New Zealand English',
    'canada': 'Canadian English',
    'ireland': 'Irish English',
    'south africa': 'South African English',
    'india': 'Indian English',
    'singapore': 'Singaporean English',
  },
  'spanish': {
    'spain': 'European Spanish (Castilian)',
    'mexico': 'Mexican Spanish',
    'argentina': 'Argentine Spanish',
    'colombia': 'Colombian Spanish',
    'chile': 'Chilean Spanish',
    'peru': 'Peruvian Spanish',
    'venezuela': 'Venezuelan Spanish',
    'latin america': 'Latin American Spanish',
  },
  'portuguese': {
    'brazil': 'Brazilian Portuguese',
    'brasil': 'Brazilian Portuguese',
    'portugal': 'European Portuguese',
  },
  'french': {
    'france': 'Metropolitan French',
    'canada': 'Canadian French (Québécois)',
    'quebec': 'Canadian French (Québécois)',
    'belgium': 'Belgian French',
    'switzerland': 'Swiss French',
  },
  'german': {
    'germany': 'Standard German (Hochdeutsch)',
    'austria': 'Austrian German',
    'switzerland': 'Swiss German',
  },
  'dutch': {
    'netherlands': 'Dutch (Netherlands)',
    'belgium': 'Flemish (Belgian Dutch)',
    'flanders': 'Flemish (Belgian Dutch)',
  },
  'chinese': {
    'china': 'Simplified Chinese (Mainland)',
    'taiwan': 'Traditional Chinese (Taiwan)',
    'hong kong': 'Traditional Chinese (Hong Kong)',
    'singapore': 'Simplified Chinese (Singapore)',
  },
  'arabic': {
    'saudi arabia': 'Gulf Arabic',
    'egypt': 'Egyptian Arabic',
    'morocco': 'Moroccan Arabic',
    'uae': 'Gulf Arabic',
    'lebanon': 'Levantine Arabic',
    'jordan': 'Levantine Arabic',
    'syria': 'Levantine Arabic',
    'iraq': 'Iraqi Arabic',
    'modern standard': 'Modern Standard Arabic (MSA)',
  },
};

/**
 * Map of ISO 639-1 language codes to full language names
 * Used to provide clear language instructions to AI models
 */
const LANGUAGE_MAP: Record<string, string> = {
  // Common languages
  'en': 'English',
  'nl': 'Dutch',
  'de': 'German',
  'fr': 'French',
  'es': 'Spanish',
  'it': 'Italian',
  'pt': 'Portuguese',
  'pl': 'Polish',
  'ru': 'Russian',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'tr': 'Turkish',
  'sv': 'Swedish',
  'da': 'Danish',
  'no': 'Norwegian',
  'fi': 'Finnish',
  'cs': 'Czech',
  'el': 'Greek',
  'he': 'Hebrew',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'uk': 'Ukrainian',
  'ro': 'Romanian',
  'hu': 'Hungarian',
  'bg': 'Bulgarian',
  'hr': 'Croatian',
  'sk': 'Slovak',
  'sl': 'Slovenian',
  'et': 'Estonian',
  'lv': 'Latvian',
  'lt': 'Lithuanian',

  // Full names (in case already provided as full name)
  'english': 'English',
  'dutch': 'Dutch',
  'german': 'German',
  'french': 'French',
  'spanish': 'Spanish',
  'italian': 'Italian',
  'portuguese': 'Portuguese',
  'polish': 'Polish',
  'russian': 'Russian',
  'chinese': 'Chinese',
  'japanese': 'Japanese',
  'korean': 'Korean',
  'arabic': 'Arabic',
  'hindi': 'Hindi',
  'turkish': 'Turkish',
  'swedish': 'Swedish',
  'danish': 'Danish',
  'norwegian': 'Norwegian',
  'finnish': 'Finnish',
  'czech': 'Czech',
  'greek': 'Greek',
  'hebrew': 'Hebrew',
  'thai': 'Thai',
  'vietnamese': 'Vietnamese',
  'indonesian': 'Indonesian',
  'malay': 'Malay',
  'ukrainian': 'Ukrainian',
  'romanian': 'Romanian',
  'hungarian': 'Hungarian',
  'bulgarian': 'Bulgarian',
  'croatian': 'Croatian',
  'slovak': 'Slovak',
  'slovenian': 'Slovenian',
  'estonian': 'Estonian',
  'latvian': 'Latvian',
  'lithuanian': 'Lithuanian',

  // Local names
  'nederlands': 'Dutch',
  'deutsch': 'German',
  'français': 'French',
  'español': 'Spanish',
  'italiano': 'Italian',
  'português': 'Portuguese',
  'polski': 'Polish',
};

/**
 * Convert a language code or name to a full language name for AI prompts
 * @param language - ISO code (en, nl), locale code (en-US, nl-NL), or language name (English, Dutch) or UI format (Dutch (Nederlands))
 * @returns Full language name in English (e.g., "English", "Dutch")
 */
export function getLanguageName(language: string | undefined | null): string {
  if (!language) return 'English';

  const trimmed = language.trim();
  const normalized = trimmed.toLowerCase();

  // Direct lookup
  if (LANGUAGE_MAP[normalized]) {
    return LANGUAGE_MAP[normalized];
  }

  // Handle locale codes like "en-US", "nl-NL", "de-DE"
  // Extract the base language code before the hyphen
  if (normalized.includes('-')) {
    const baseCode = normalized.split('-')[0];
    if (LANGUAGE_MAP[baseCode]) {
      return LANGUAGE_MAP[baseCode];
    }
  }

  // Handle underscore format like "en_US", "nl_NL"
  if (normalized.includes('_')) {
    const baseCode = normalized.split('_')[0];
    if (LANGUAGE_MAP[baseCode]) {
      return LANGUAGE_MAP[baseCode];
    }
  }

  // Handle UI dropdown format like "Dutch (Nederlands)" or "English (US)"
  // Extract the first word before any parenthesis
  const beforeParen = trimmed.split('(')[0].trim().toLowerCase();
  if (LANGUAGE_MAP[beforeParen]) {
    return LANGUAGE_MAP[beforeParen];
  }

  // Try to extract language from inside parenthesis (e.g., "(Nederlands)" -> Dutch)
  const parenMatch = trimmed.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const insideParen = parenMatch[1].toLowerCase();
    if (LANGUAGE_MAP[insideParen]) {
      return LANGUAGE_MAP[insideParen];
    }
  }

  // Return original if nothing matched (but capitalize first letter)
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Get regional language variant based on language and region
 * @param language - Base language (e.g., "English", "en")
 * @param region - Geographic region (e.g., "United Kingdom", "Brazil")
 * @returns Regional variant name (e.g., "British English", "Brazilian Portuguese")
 */
export function getRegionalLanguageVariant(
  language: string | undefined | null,
  region: string | undefined | null
): string {
  const baseLang = getLanguageName(language);

  if (!region) return baseLang;

  const normalizedLang = baseLang.toLowerCase();
  const normalizedRegion = region.trim().toLowerCase();

  // Check if we have regional variants for this language
  const variants = REGIONAL_LANGUAGE_VARIANTS[normalizedLang];
  if (variants && variants[normalizedRegion]) {
    return variants[normalizedRegion];
  }

  // Return base language with region context if no specific variant
  return `${baseLang} (${region})`;
}

/**
 * Get a strong language instruction for AI prompts
 * This creates an emphatic instruction to ensure the AI uses the correct language
 */
export function getLanguageInstruction(language: string | undefined | null): string {
  const langName = getLanguageName(language);
  return `**CRITICAL - OUTPUT LANGUAGE**: You MUST write ALL content in ${langName}. Do NOT use any other language. Every word, sentence, and paragraph must be in ${langName}.`;
}

/**
 * Get comprehensive language and region instruction for AI prompts
 * This creates a detailed, emphatic instruction covering language, regional variants, and localization
 * @param language - Base language
 * @param region - Geographic region/target market
 * @returns Comprehensive language instruction string
 */
export function getLanguageAndRegionInstruction(
  language: string | undefined | null,
  region: string | undefined | null
): string {
  const langName = getLanguageName(language);
  const regionalVariant = getRegionalLanguageVariant(language, region);
  const hasRegionalVariant = regionalVariant !== langName;

  let instruction = `
**CRITICAL - LANGUAGE AND REGIONAL REQUIREMENTS**:
- **Output Language**: ${regionalVariant}
- You MUST write ALL content (headings, paragraphs, lists, metadata) in ${langName}.
- Do NOT use any other language. Every word, sentence, and paragraph must be in ${langName}.`;

  if (hasRegionalVariant && region) {
    instruction += `
- **Regional Variant**: Use ${regionalVariant} spelling, grammar, vocabulary, and conventions.
- **Target Region**: ${region} - adapt terminology, cultural references, and expressions to this market.`;

    // Add specific guidance for common regional differences
    const normalizedLang = langName.toLowerCase();
    if (normalizedLang === 'english') {
      if (region.toLowerCase().includes('uk') || region.toLowerCase().includes('kingdom') || region.toLowerCase().includes('britain')) {
        instruction += `
- Use British spelling: colour, organisation, centre, licence (noun), practise (verb), analyse, catalogue.
- Use British date format: DD/MM/YYYY.
- Use metric measurements unless industry-specific.`;
      } else if (region.toLowerCase().includes('us') || region.toLowerCase().includes('america') || region.toLowerCase() === 'usa') {
        instruction += `
- Use American spelling: color, organization, center, license, practice, analyze, catalog.
- Use American date format: MM/DD/YYYY.
- Use imperial measurements where culturally appropriate.`;
      } else if (region.toLowerCase().includes('australia')) {
        instruction += `
- Use Australian English spelling (follows British conventions): colour, organisation, centre.
- Use Australian date format: DD/MM/YYYY.
- Use metric measurements.`;
      }
    } else if (normalizedLang === 'portuguese') {
      if (region.toLowerCase().includes('brazil') || region.toLowerCase().includes('brasil')) {
        instruction += `
- Use Brazilian Portuguese vocabulary and grammar conventions.
- Use "você" form for informal address.`;
      } else if (region.toLowerCase().includes('portugal')) {
        instruction += `
- Use European Portuguese vocabulary and grammar conventions.
- Use "tu" form for informal address where appropriate.`;
      }
    } else if (normalizedLang === 'dutch') {
      instruction += `
- Use standard Dutch (Algemeen Nederlands / ABN). NEVER use dialect, slang, or regional colloquialisms.
- Write in a professional, clear tone. Do NOT use Brabants, Limburgs, Flemish dialect words, or informal expressions like "efkes", "wa", "bende", "keigoed", "gij".
- Use "u" for formal address, "je/jij" for informal but standard Dutch.`;
    } else if (normalizedLang === 'spanish') {
      if (region.toLowerCase().includes('spain')) {
        instruction += `
- Use European Spanish (Castilian) vocabulary and grammar.
- Use "vosotros" for plural informal address.`;
      } else {
        instruction += `
- Use Latin American Spanish vocabulary and grammar.
- Use "ustedes" for plural address (formal and informal).`;
      }
    }
  }

  return instruction;
}

/**
 * Check if language and region settings are properly configured
 * @returns Object with validation status and warning message if incomplete
 */
export function validateLanguageSettings(
  language: string | undefined | null,
  region: string | undefined | null
): { isValid: boolean; isComplete: boolean; warnings: string[] } {
  const warnings: string[] = [];

  const hasLanguage = !!language && language.trim().length > 0;
  const hasRegion = !!region && region.trim().length > 0;

  if (!hasLanguage) {
    warnings.push('Language is not set. Content will default to English, which may not match your target audience.');
  }

  if (!hasRegion) {
    warnings.push('Region/Location is not set. Regional language variants (e.g., British vs American English) cannot be applied.');
  }

  // Check for language/region combinations that have significant variants
  if (hasLanguage && !hasRegion) {
    const normalizedLang = getLanguageName(language).toLowerCase();
    const languagesWithVariants = ['english', 'spanish', 'portuguese', 'french', 'german', 'dutch', 'chinese', 'arabic'];

    if (languagesWithVariants.includes(normalizedLang)) {
      warnings.push(`${getLanguageName(language)} has significant regional variants. Setting a region is strongly recommended for optimal content localization.`);
    }
  }

  return {
    isValid: hasLanguage, // At minimum, language should be set
    isComplete: hasLanguage && hasRegion,
    warnings
  };
}

/**
 * Get a warning message for missing language/region settings
 * Returns null if settings are complete
 */
export function getMissingSettingsWarning(
  language: string | undefined | null,
  region: string | undefined | null
): string | null {
  const validation = validateLanguageSettings(language, region);

  if (validation.isComplete) {
    return null;
  }

  return `⚠️ INCOMPLETE LOCALIZATION SETTINGS:\n${validation.warnings.map(w => `  - ${w}`).join('\n')}`;
}

/**
 * Check if language appears to be an ISO code
 */
export function isIsoCode(language: string): boolean {
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(language.trim());
}
