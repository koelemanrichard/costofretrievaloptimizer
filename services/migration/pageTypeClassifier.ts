/**
 * URL-pattern-based page type classifier.
 * Prevents the plan engine from making dangerous decisions
 * (like pruning conversion pages, utility pages, or location pages).
 */

export type PageType =
  | 'conversion'   // Thank-you, confirmation, form-submitted pages
  | 'utility'      // Contact, about, privacy, terms, sitemap
  | 'location'     // City/region landing pages (e.g. /dakdekker-oosterhout)
  | 'gallery'      // Image galleries, portfolio items
  | 'blog'         // Blog posts, articles
  | 'category'     // Category/tag archive pages
  | 'product'      // Product pages
  | 'homepage'     // Root path /
  | 'content';     // Default: general content pages

export interface PageClassification {
  type: PageType;
  confidence: number;         // 0-1
  protectedFromPrune: boolean;
  reason: string;
}

// ── Pattern rules ──────────────────────────────────────────────────────────

interface ClassificationRule {
  type: PageType;
  patterns: RegExp[];
  protectedFromPrune: boolean;
  reason: string;
  confidence: number;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  // Homepage — exact root path
  {
    type: 'homepage',
    patterns: [/^\/$/],
    protectedFromPrune: true,
    reason: 'Homepage — critical site entry point',
    confidence: 1.0,
  },

  // Conversion pages — thank-you, confirmation, form-submitted
  {
    type: 'conversion',
    patterns: [
      /\/(offerte|quote|order|bestelling)[-_]?.*(verzonden|verstuurd|sent|confirmed|bevestigd|success)/i,
      /\/(bedankt|thank[-_]?you|thanks|dank[-_]?u|dankjewel)/i,
      /^\/(confirmation)$/i,
      /^\/(success)$/i,
      /\/form[-_]?(submitted|complete|sent)/i,
      /\/checkout[-_]?(complete|success|done)/i,
    ],
    protectedFromPrune: true,
    reason: 'Conversion/thank-you page — critical to business funnel',
    confidence: 0.9,
  },

  // Utility pages — contact, about, privacy, terms
  {
    type: 'utility',
    patterns: [
      /^\/(contact|contacteer|neem[-_]?contact)/i,
      /^\/(over[-_]?ons|about[-_]?us|about|wie[-_]?zijn[-_]?wij|over[-_]?mij)/i,
      /^\/(privacy|privacybeleid|privacy[-_]?policy|privacyverklaring)/i,
      /^\/(disclaimer)/i,
      /^\/(algemene[-_]?voorwaarden|terms|terms[-_]?of[-_]?service|terms[-_]?and[-_]?conditions|tos)/i,
      /^\/(cookie[-_]?beleid|cookie[-_]?policy|cookies)/i,
      /^\/(sitemap|site[-_]?map)/i,
      /^\/(faq|veelgestelde[-_]?vragen)/i,
      /^\/(werkgebied|service[-_]?area|dienst[-_]?gebied)/i,
      /^\/(vacatures|careers|jobs|banen)/i,
      /^\/(team|medewerkers|ons[-_]?team)/i,
      /^\/(reviews?|recensies|ervaringen|testimonials)/i,
      /^\/(referenties|references|portfolio)/i,
    ],
    protectedFromPrune: true,
    reason: 'Utility/structural page — serves essential site function',
    confidence: 0.85,
  },

  // Gallery / portfolio pages
  {
    type: 'gallery',
    patterns: [
      /\/(gallery|gallerij|galerij|foto)/i,
      /\/rl_gallery\//i,
      /\/(portfolio|werk|projecten|projects)/i,
    ],
    protectedFromPrune: false,
    reason: 'Gallery/portfolio page',
    confidence: 0.8,
  },

  // Blog / news / articles
  {
    type: 'blog',
    patterns: [
      /^\/(blog|nieuws|news|artikelen|articles|magazine|updates)\//i,
      /^\/(blog|nieuws|news|artikelen|articles)$/i,
    ],
    protectedFromPrune: false,
    reason: 'Blog/news content',
    confidence: 0.8,
  },

  // Category / tag archives
  {
    type: 'category',
    patterns: [
      /^\/(category|categorie|tag|onderwerp)\//i,
      /^\/(diensten|services|producten|products)$/i,
    ],
    protectedFromPrune: false,
    reason: 'Category/archive page',
    confidence: 0.7,
  },

  // Product pages (common e-commerce patterns)
  {
    type: 'product',
    patterns: [
      /^\/(product|shop|winkel)\//i,
      /^\/(producten|products)\/.+/i,
    ],
    protectedFromPrune: false,
    reason: 'Product page',
    confidence: 0.7,
  },
];

// ── Known Dutch cities for location page detection ──────────────────────────

const KNOWN_DUTCH_CITIES = new Set([
  // Major cities
  'amsterdam', 'rotterdam', 'den-haag', 'utrecht', 'eindhoven', 'groningen',
  'tilburg', 'almere', 'breda', 'nijmegen', 'arnhem', 'haarlem', 'enschede',
  'apeldoorn', 'amersfoort', 'zaanstad', 'zwolle', 'leiden', 'dordrecht',
  'zoetermeer', 'maastricht', 'deventer', 'delft', 'alkmaar', 'heerlen',
  'venlo', 'leeuwarden', 'hilversum', 'oss', 'roosendaal', 'sittard',
  // North Brabant region (common for service businesses)
  'oosterhout', 'dongen', 'waalwijk', 'raamsdonksveer', 'geertruidenberg',
  'drimmelen', 'made', 'etten-leur', 'rijen', 'gilze', 'bavel', 'ulvenhout',
  'teteringen', 'prinsenbeek', 'terheijden', 'helmond', 'den-bosch',
  's-hertogenbosch', 'bergen-op-zoom', 'moerdijk', 'goirle', 'oisterwijk',
  // South Holland
  'gorinchem', 'sliedrecht', 'papendrecht', 'hardinxveld-giessendam',
  'ridderkerk', 'barendrecht', 'capelle-aan-den-ijssel', 'schiedam',
  'vlaardingen', 'spijkenisse', 'hellevoetsluis', 'middelharnis',
  // Utrecht province
  'nieuwegein', 'veenendaal', 'zeist', 'woerden', 'ijsselstein',
  // Gelderland
  'ede', 'wageningen', 'barneveld', 'doetinchem', 'tiel', 'culemborg',
  // Overijssel
  'almelo', 'hengelo', 'kampen', 'hardenberg',
  // North Holland
  'purmerend', 'heerhugowaard', 'hoorn', 'den-helder', 'amstelveen',
  // Flevoland
  'lelystad', 'dronten',
  // Zeeland
  'middelburg', 'vlissingen', 'goes', 'terneuzen',
  // Limburg
  'roermond', 'weert', 'kerkrade', 'geleen',
]);

/**
 * Check if a URL path ends with a known city pattern.
 * Handles patterns like /dakdekker-oosterhout, /loodgieter-breda, etc.
 */
function detectLocationPage(pathname: string): { isLocation: boolean; city: string | null } {
  // Get the last path segment
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return { isLocation: false, city: null };

  const lastSegment = segments[segments.length - 1].toLowerCase();
  const parts = lastSegment.split('-');

  if (parts.length < 2) return { isLocation: false, city: null };

  // Check if the last 1-3 parts match a known city
  // Cities can be multi-word: "bergen-op-zoom", "den-haag", "s-hertogenbosch"
  for (let cityLen = 3; cityLen >= 1; cityLen--) {
    if (parts.length <= cityLen) continue;
    const candidateCity = parts.slice(-cityLen).join('-');
    if (KNOWN_DUTCH_CITIES.has(candidateCity)) {
      return { isLocation: true, city: candidateCity };
    }
  }

  return { isLocation: false, city: null };
}

// ── Main classification function ────────────────────────────────────────────

export function classifyPageType(url: string): PageClassification {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    // If URL parsing fails, try treating as pathname
    pathname = url.startsWith('/') ? url : `/${url}`;
  }

  // Normalize: strip trailing slash for matching (except root)
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Check rule-based patterns first
  for (const rule of CLASSIFICATION_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(pathname)) {
        return {
          type: rule.type,
          confidence: rule.confidence,
          protectedFromPrune: rule.protectedFromPrune,
          reason: rule.reason,
        };
      }
    }
  }

  // Check for location pages (service-city pattern)
  const locationResult = detectLocationPage(pathname);
  if (locationResult.isLocation) {
    return {
      type: 'location',
      confidence: 0.8,
      protectedFromPrune: true,
      reason: `Location landing page for ${locationResult.city} — important for local SEO`,
    };
  }

  // Default: general content
  return {
    type: 'content',
    confidence: 0.5,
    protectedFromPrune: false,
    reason: 'General content page',
  };
}
