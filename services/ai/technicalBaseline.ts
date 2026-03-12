/**
 * Technical Baseline Service
 *
 * Extracts technical SEO baseline information from HTML and HTTP headers,
 * including CMS detection, schema markup, canonical/hreflang, and server tech.
 */

export interface TechnicalBaselineInput {
  html: string;
  headers: Record<string, string>;
  domainAuthority?: number;
}

export interface TechnicalBaselineResult {
  cms: string | null;
  hasSchemaMarkup: boolean;
  schemaTypes: string[];
  hasCanonical: boolean;
  hasHreflang: boolean;
  serverTech: string | null;
  technicalIssues: string[];
}

interface CmsPattern {
  name: string;
  patterns: RegExp[];
}

const CMS_PATTERNS: CmsPattern[] = [
  {
    name: 'WordPress',
    patterns: [/wp-content/i, /wp-includes/i, /wp-json/i, /wordpress/i],
  },
  {
    name: 'Shopify',
    patterns: [/cdn\.shopify\.com/i, /shopify\.com/i, /Shopify\.theme/i],
  },
  {
    name: 'Wix',
    patterns: [/wix\.com/i, /wixstatic\.com/i, /X-Wix/i],
  },
  {
    name: 'Squarespace',
    patterns: [/squarespace\.com/i, /sqsp\.net/i, /squarespace-cdn/i],
  },
  {
    name: 'Drupal',
    patterns: [/Drupal/i, /drupal\.js/i, /sites\/default\/files/i],
  },
  {
    name: 'Joomla',
    patterns: [/Joomla/i, /\/media\/jui/i, /\/components\/com_/i],
  },
  {
    name: 'Webflow',
    patterns: [/webflow\.com/i, /wf-/i],
  },
  {
    name: 'HubSpot',
    patterns: [/hubspot/i, /hs-scripts/i, /hsstatic/i],
  },
  {
    name: 'Ghost',
    patterns: [/ghost\.org/i, /ghost\/api/i, /content="Ghost"/i],
  },
  {
    name: 'Next.js',
    patterns: [/__next/i, /_next\/static/i, /next\/dist/i],
  },
];

function detectCms(html: string): string | null {
  // Check <meta name="generator"> first
  const generatorMatch = html.match(/<meta[^>]+name\s*=\s*["']generator["'][^>]+content\s*=\s*["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+name\s*=\s*["']generator["']/i);

  if (generatorMatch) {
    const generator = generatorMatch[1];
    // Map generator value to known CMS names
    for (const cms of CMS_PATTERNS) {
      if (cms.patterns.some(p => p.test(generator))) {
        return cms.name;
      }
    }
    // If generator is set but doesn't match known patterns, return it directly
    return generator;
  }

  // Fallback: check HTML body for CMS-specific patterns
  for (const cms of CMS_PATTERNS) {
    if (cms.patterns.some(p => p.test(html))) {
      return cms.name;
    }
  }

  return null;
}

function extractSchemaTypes(html: string): string[] {
  const types = new Set<string>();
  const ldJsonRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = ldJsonRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      extractTypesFromObject(json, types);
    } catch {
      // Invalid JSON in ld+json block — skip
    }
  }

  return Array.from(types).sort();
}

function extractTypesFromObject(obj: unknown, types: Set<string>): void {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractTypesFromObject(item, types);
    }
    return;
  }

  const record = obj as Record<string, unknown>;

  if (typeof record['@type'] === 'string') {
    types.add(record['@type']);
  } else if (Array.isArray(record['@type'])) {
    for (const t of record['@type']) {
      if (typeof t === 'string') types.add(t);
    }
  }

  if (Array.isArray(record['@graph'])) {
    for (const item of record['@graph']) {
      extractTypesFromObject(item, types);
    }
  }
}

function hasCanonical(html: string): boolean {
  return /<link[^>]+rel\s*=\s*["']canonical["']/i.test(html);
}

function hasHreflang(html: string): boolean {
  return /<link[^>]+hreflang\s*=/i.test(html);
}

function detectServerTech(headers: Record<string, string>): string | null {
  // Normalize header keys to lowercase for case-insensitive lookup
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }

  return normalized['x-powered-by'] || normalized['server'] || null;
}

function detectTechnicalIssues(
  html: string,
  headers: Record<string, string>,
  hasSchema: boolean,
  hasCanonicalTag: boolean
): string[] {
  const issues: string[] = [];

  if (!hasCanonicalTag) {
    issues.push('Missing canonical tag');
  }

  if (!hasSchema) {
    issues.push('No structured data (JSON-LD) found');
  }

  // Check for missing viewport meta tag
  if (!/<meta[^>]+name\s*=\s*["']viewport["']/i.test(html)) {
    issues.push('Missing viewport meta tag');
  }

  // Check for missing title tag
  if (!/<title[^>]*>.+<\/title>/is.test(html)) {
    issues.push('Missing or empty title tag');
  }

  // Check for missing meta description
  if (!/<meta[^>]+name\s*=\s*["']description["']/i.test(html)) {
    issues.push('Missing meta description');
  }

  // Check for missing lang attribute on html tag
  if (!/<html[^>]+lang\s*=/i.test(html)) {
    issues.push('Missing lang attribute on html element');
  }

  return issues;
}

export function extractTechnicalBaseline(input: TechnicalBaselineInput): TechnicalBaselineResult {
  const { html, headers } = input;

  const cms = detectCms(html);
  const schemaTypes = extractSchemaTypes(html);
  const hasSchemaMarkup = schemaTypes.length > 0;
  const hasCanonicalTag = hasCanonical(html);
  const hasHreflangTag = hasHreflang(html);
  const serverTech = detectServerTech(headers);
  const technicalIssues = detectTechnicalIssues(html, headers, hasSchemaMarkup, hasCanonicalTag);

  return {
    cms,
    hasSchemaMarkup,
    schemaTypes,
    hasCanonical: hasCanonicalTag,
    hasHreflang: hasHreflangTag,
    serverTech,
    technicalIssues,
  };
}
