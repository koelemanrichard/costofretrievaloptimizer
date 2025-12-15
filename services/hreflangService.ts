// services/hreflangService.ts
// Hreflang/Multilingual Support Service
// Generates and validates hreflang tags for international SEO

// ============================================
// TYPES
// ============================================

export interface HreflangEntry {
  language: string;       // ISO 639-1 (e.g., 'en', 'nl', 'de')
  region?: string;        // ISO 3166-1 Alpha-2 (e.g., 'US', 'NL', 'DE')
  url: string;
  isDefault?: boolean;
}

export interface HreflangConfig {
  enabled: boolean;
  entries: HreflangEntry[];
  defaultLanguage: string;
  validateSymmetry: boolean;
}

export interface HreflangSymmetryIssue {
  sourceUrl: string;
  sourceLanguage: string;
  missingReturnLinks: string[];
}

export interface HreflangValidationResult {
  isValid: boolean;
  symmetryIssues: HreflangSymmetryIssue[];
  duplicateIssues: string[];
  formatIssues: string[];
  suggestions: string[];
  score: number; // 0-100
}

export interface GeneratedHreflangTags {
  htmlTags: string;
  httpHeaders: string;
  sitemapXml: string;
}

// ============================================
// CONSTANTS
// ============================================

// Common ISO 639-1 language codes
export const COMMON_LANGUAGES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  pl: 'Polish',
  ru: 'Russian',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  tr: 'Turkish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  cs: 'Czech',
  el: 'Greek',
  he: 'Hebrew',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ms: 'Malay',
  uk: 'Ukrainian',
  ro: 'Romanian',
  hu: 'Hungarian',
  bg: 'Bulgarian',
};

// Common ISO 3166-1 Alpha-2 region codes
export const COMMON_REGIONS: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  IE: 'Ireland',
  DE: 'Germany',
  AT: 'Austria',
  CH: 'Switzerland',
  FR: 'France',
  BE: 'Belgium',
  NL: 'Netherlands',
  ES: 'Spain',
  MX: 'Mexico',
  AR: 'Argentina',
  CO: 'Colombia',
  IT: 'Italy',
  PT: 'Portugal',
  BR: 'Brazil',
  PL: 'Poland',
  RU: 'Russia',
  JP: 'Japan',
  CN: 'China',
  TW: 'Taiwan',
  HK: 'Hong Kong',
  KR: 'South Korea',
  IN: 'India',
  SG: 'Singapore',
  MY: 'Malaysia',
  ID: 'Indonesia',
  TH: 'Thailand',
  VN: 'Vietnam',
  PH: 'Philippines',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  IL: 'Israel',
  TR: 'Turkey',
  ZA: 'South Africa',
  NG: 'Nigeria',
  EG: 'Egypt',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  CZ: 'Czech Republic',
  GR: 'Greece',
  UA: 'Ukraine',
  RO: 'Romania',
  HU: 'Hungary',
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate ISO 639-1 language code format
 */
export const isValidLanguageCode = (code: string): boolean => {
  return /^[a-z]{2}$/.test(code.toLowerCase());
};

/**
 * Validate ISO 3166-1 Alpha-2 region code format
 */
export const isValidRegionCode = (code: string): boolean => {
  return /^[A-Z]{2}$/.test(code.toUpperCase());
};

/**
 * Format hreflang attribute value
 * e.g., "en", "en-US", "x-default"
 */
export const formatHreflang = (entry: HreflangEntry): string => {
  if (entry.isDefault) return 'x-default';
  if (entry.region) {
    return `${entry.language.toLowerCase()}-${entry.region.toUpperCase()}`;
  }
  return entry.language.toLowerCase();
};

/**
 * Validate URL format
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate hreflang configuration
 * Checks for symmetry, duplicates, and format issues
 */
export const validateHreflangConfig = (config: HreflangConfig): HreflangValidationResult => {
  const formatIssues: string[] = [];
  const duplicateIssues: string[] = [];
  const symmetryIssues: HreflangSymmetryIssue[] = [];
  const suggestions: string[] = [];

  // Track seen hreflang values for duplicate detection
  const seenHreflangs = new Map<string, string[]>();

  // Validate each entry
  for (const entry of config.entries) {
    const hreflangValue = formatHreflang(entry);

    // Check language code format
    if (!entry.isDefault && !isValidLanguageCode(entry.language)) {
      formatIssues.push(`Invalid language code "${entry.language}" - must be ISO 639-1 (e.g., "en", "nl")`);
    }

    // Check region code format
    if (entry.region && !isValidRegionCode(entry.region)) {
      formatIssues.push(`Invalid region code "${entry.region}" - must be ISO 3166-1 Alpha-2 (e.g., "US", "NL")`);
    }

    // Check URL format
    if (!isValidUrl(entry.url)) {
      formatIssues.push(`Invalid URL format: "${entry.url}"`);
    }

    // Track for duplicates
    if (!seenHreflangs.has(hreflangValue)) {
      seenHreflangs.set(hreflangValue, []);
    }
    seenHreflangs.get(hreflangValue)!.push(entry.url);
  }

  // Check for duplicate hreflang values
  for (const [hreflang, urls] of seenHreflangs) {
    if (urls.length > 1) {
      duplicateIssues.push(`Duplicate hreflang "${hreflang}" found for URLs: ${urls.join(', ')}`);
    }
  }

  // Check symmetry (if enabled)
  if (config.validateSymmetry && config.entries.length > 1) {
    // For symmetry validation, we'd need to check that each page
    // links back to all other language versions
    // This is a simplified check - in reality, you'd need to fetch each URL

    // Check that we have at least a basic set
    const languages = new Set(config.entries.map(e => e.language));
    if (!config.entries.some(e => e.isDefault)) {
      suggestions.push('Consider adding an x-default entry for users whose language preference is not matched.');
    }

    // Warn about common missing pairs
    if (languages.has('en') && !languages.has('en-US') && !languages.has('en-GB')) {
      suggestions.push('You have "en" - consider specifying regional variants like en-US, en-GB if targeting those markets.');
    }
  }

  // Check for x-default
  const hasXDefault = config.entries.some(e => e.isDefault);
  if (!hasXDefault && config.entries.length > 0) {
    suggestions.push('Add an x-default entry to specify the default page for unmatched languages.');
  }

  // Calculate score
  let score = 100;
  score -= formatIssues.length * 15;
  score -= duplicateIssues.length * 20;
  score -= symmetryIssues.length * 10;
  if (!hasXDefault) score -= 10;

  return {
    isValid: formatIssues.length === 0 && duplicateIssues.length === 0,
    symmetryIssues,
    duplicateIssues,
    formatIssues,
    suggestions,
    score: Math.max(0, score),
  };
};

// ============================================
// GENERATION FUNCTIONS
// ============================================

/**
 * Generate HTML link tags for hreflang
 */
export const generateHtmlTags = (entries: HreflangEntry[]): string => {
  if (entries.length === 0) return '';

  const tags = entries.map(entry => {
    const hreflang = formatHreflang(entry);
    return `<link rel="alternate" hreflang="${hreflang}" href="${entry.url}" />`;
  });

  return tags.join('\n');
};

/**
 * Generate HTTP Link headers for hreflang
 */
export const generateHttpHeaders = (entries: HreflangEntry[]): string => {
  if (entries.length === 0) return '';

  const headers = entries.map(entry => {
    const hreflang = formatHreflang(entry);
    return `<${entry.url}>; rel="alternate"; hreflang="${hreflang}"`;
  });

  return `Link: ${headers.join(', ')}`;
};

/**
 * Generate sitemap XML xhtml:link elements for hreflang
 */
export const generateSitemapXml = (
  pageUrl: string,
  entries: HreflangEntry[]
): string => {
  if (entries.length === 0) return '';

  const links = entries.map(entry => {
    const hreflang = formatHreflang(entry);
    return `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${entry.url}" />`;
  });

  return `  <url>
    <loc>${pageUrl}</loc>
${links.join('\n')}
  </url>`;
};

/**
 * Generate complete hreflang output in all formats
 */
export const generateHreflangTags = (config: HreflangConfig): GeneratedHreflangTags => {
  const { entries } = config;

  return {
    htmlTags: generateHtmlTags(entries),
    httpHeaders: generateHttpHeaders(entries),
    sitemapXml: entries.length > 0
      ? generateSitemapXml(entries[0]?.url || '', entries)
      : '',
  };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create default hreflang config
 */
export const createDefaultHreflangConfig = (): HreflangConfig => ({
  enabled: false,
  entries: [],
  defaultLanguage: 'en',
  validateSymmetry: true,
});

/**
 * Add a new language entry to config
 */
export const addLanguageEntry = (
  config: HreflangConfig,
  language: string,
  url: string,
  region?: string,
  isDefault?: boolean
): HreflangConfig => {
  const newEntry: HreflangEntry = {
    language: language.toLowerCase(),
    url,
    region: region?.toUpperCase(),
    isDefault,
  };

  return {
    ...config,
    entries: [...config.entries, newEntry],
  };
};

/**
 * Remove a language entry from config
 */
export const removeLanguageEntry = (
  config: HreflangConfig,
  url: string
): HreflangConfig => ({
  ...config,
  entries: config.entries.filter(e => e.url !== url),
});

/**
 * Get language display name
 */
export const getLanguageName = (code: string): string => {
  return COMMON_LANGUAGES[code.toLowerCase()] || code.toUpperCase();
};

/**
 * Get region display name
 */
export const getRegionName = (code: string): string => {
  return COMMON_REGIONS[code.toUpperCase()] || code.toUpperCase();
};

/**
 * Format entry for display
 */
export const formatEntryDisplay = (entry: HreflangEntry): string => {
  if (entry.isDefault) return 'Default (x-default)';
  const lang = getLanguageName(entry.language);
  if (entry.region) {
    return `${lang} (${getRegionName(entry.region)})`;
  }
  return lang;
};

export default {
  // Validation
  validateHreflangConfig,
  isValidLanguageCode,
  isValidRegionCode,
  formatHreflang,
  // Generation
  generateHtmlTags,
  generateHttpHeaders,
  generateSitemapXml,
  generateHreflangTags,
  // Helpers
  createDefaultHreflangConfig,
  addLanguageEntry,
  removeLanguageEntry,
  getLanguageName,
  getRegionName,
  formatEntryDisplay,
  // Constants
  COMMON_LANGUAGES,
  COMMON_REGIONS,
};
