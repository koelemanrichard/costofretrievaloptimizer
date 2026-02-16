import type { SiteInventoryItem } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type UrlCategory =
  | 'content'
  | 'product'
  | 'category'
  | 'legal'
  | 'pagination'
  | 'media'
  | 'uncategorized';

export interface UrlClassification {
  category: UrlCategory;
  confidence: 'high' | 'medium' | 'low';
  matchedPattern: string;
}

// ── Pattern Definitions (priority order — first match wins) ───────────────────

interface PatternRule {
  category: UrlCategory;
  confidence: 'high' | 'medium' | 'low';
  pattern: RegExp;
  label: string;
}

const PATTERN_RULES: PatternRule[] = [
  // 1. Pagination — must come before content to catch /blog/page/2
  { category: 'pagination', confidence: 'high', pattern: /\/page\/\d+/i, label: '/page/N' },
  { category: 'pagination', confidence: 'high', pattern: /[?&]page=\d+/i, label: '?page=N' },
  { category: 'pagination', confidence: 'high', pattern: /\/p\/\d+/i, label: '/p/N' },
  { category: 'pagination', confidence: 'medium', pattern: /[?&]paged?=\d+/i, label: '?paged=N' },
  { category: 'pagination', confidence: 'medium', pattern: /[?&]offset=\d+/i, label: '?offset=N' },

  // 2. Media files
  { category: 'media', confidence: 'high', pattern: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)(\?|$)/i, label: 'document file' },
  { category: 'media', confidence: 'high', pattern: /\.(jpg|jpeg|png|gif|webp|svg|ico|bmp|tiff)(\?|$)/i, label: 'image file' },
  { category: 'media', confidence: 'high', pattern: /\.(mp4|mp3|avi|mov|wmv|flv|webm|ogg|wav)(\?|$)/i, label: 'media file' },
  { category: 'media', confidence: 'high', pattern: /\.(zip|rar|tar|gz|7z)(\?|$)/i, label: 'archive file' },

  // 3. Legal/Utility — multilingual
  // EN
  { category: 'legal', confidence: 'high', pattern: /\/(privacy-?policy|privacy)\/?$/i, label: 'privacy' },
  { category: 'legal', confidence: 'high', pattern: /\/(terms-?(of|and)-(service|use|conditions)|terms)\/?$/i, label: 'terms' },
  { category: 'legal', confidence: 'high', pattern: /\/(contact-?us|contact)\/?$/i, label: 'contact' },
  { category: 'legal', confidence: 'high', pattern: /\/(about-?us|about)\/?$/i, label: 'about' },
  { category: 'legal', confidence: 'high', pattern: /\/(login|signin|sign-in|register|signup|sign-up)\/?$/i, label: 'auth page' },
  { category: 'legal', confidence: 'medium', pattern: /\/(careers|jobs)\/?$/i, label: 'careers' },
  { category: 'legal', confidence: 'medium', pattern: /\/faq\/?$/i, label: 'faq' },
  { category: 'legal', confidence: 'high', pattern: /\/(cookie-?policy|cookie)\/?$/i, label: 'cookie' },
  { category: 'legal', confidence: 'high', pattern: /\/(sitemap\.xml|sitemap)\/?$/i, label: 'sitemap' },
  { category: 'legal', confidence: 'high', pattern: /\/(disclaimer|imprint)\/?$/i, label: 'disclaimer/imprint' },
  // NL
  { category: 'legal', confidence: 'high', pattern: /\/privacybeleid\/?$/i, label: 'privacybeleid' },
  { category: 'legal', confidence: 'high', pattern: /\/(algemene-)?voorwaarden\/?$/i, label: 'voorwaarden' },
  { category: 'legal', confidence: 'high', pattern: /\/over-ons\/?$/i, label: 'over-ons' },
  { category: 'legal', confidence: 'medium', pattern: /\/vacatures\/?$/i, label: 'vacatures' },
  // DE
  { category: 'legal', confidence: 'high', pattern: /\/datenschutz(erklaerung)?\/?$/i, label: 'datenschutz' },
  { category: 'legal', confidence: 'high', pattern: /\/agb\/?$/i, label: 'agb' },
  { category: 'legal', confidence: 'high', pattern: /\/kontakt\/?$/i, label: 'kontakt' },
  { category: 'legal', confidence: 'high', pattern: /\/ueber-uns\/?$/i, label: 'ueber-uns' },
  { category: 'legal', confidence: 'high', pattern: /\/impressum\/?$/i, label: 'impressum' },
  { category: 'legal', confidence: 'medium', pattern: /\/stellenangebote\/?$/i, label: 'stellenangebote' },
  // ES
  { category: 'legal', confidence: 'high', pattern: /\/privacidad\/?$/i, label: 'privacidad' },
  { category: 'legal', confidence: 'high', pattern: /\/condiciones\/?$/i, label: 'condiciones' },
  { category: 'legal', confidence: 'high', pattern: /\/contacto\/?$/i, label: 'contacto' },
  { category: 'legal', confidence: 'high', pattern: /\/sobre\/?$/i, label: 'sobre' },

  // 4. Category/Tag — multilingual
  // EN
  { category: 'category', confidence: 'high', pattern: /\/category\//i, label: '/category/' },
  { category: 'category', confidence: 'high', pattern: /\/tag\//i, label: '/tag/' },
  { category: 'category', confidence: 'high', pattern: /\/archive\//i, label: '/archive/' },
  { category: 'category', confidence: 'medium', pattern: /\/author\//i, label: '/author/' },
  { category: 'category', confidence: 'medium', pattern: /\/topic\//i, label: '/topic/' },
  // NL
  { category: 'category', confidence: 'high', pattern: /\/categorie\//i, label: '/categorie/' },
  { category: 'category', confidence: 'medium', pattern: /\/onderwerp\//i, label: '/onderwerp/' },
  { category: 'category', confidence: 'high', pattern: /\/archief\//i, label: '/archief/' },
  { category: 'category', confidence: 'medium', pattern: /\/auteur\//i, label: '/auteur/' },
  // DE
  { category: 'category', confidence: 'high', pattern: /\/kategorie\//i, label: '/kategorie/' },
  { category: 'category', confidence: 'high', pattern: /\/archiv\//i, label: '/archiv/' },
  { category: 'category', confidence: 'medium', pattern: /\/autor\//i, label: '/autor/' },

  // 5. Content — multilingual
  // EN
  { category: 'content', confidence: 'high', pattern: /\/blog\//i, label: '/blog/' },
  { category: 'content', confidence: 'high', pattern: /\/articles?\//i, label: '/article/' },
  { category: 'content', confidence: 'high', pattern: /\/guides?\//i, label: '/guide/' },
  { category: 'content', confidence: 'high', pattern: /\/news\//i, label: '/news/' },
  { category: 'content', confidence: 'medium', pattern: /\/learn\//i, label: '/learn/' },
  { category: 'content', confidence: 'medium', pattern: /\/tutorials?\//i, label: '/tutorial/' },
  { category: 'content', confidence: 'medium', pattern: /\/resources?\//i, label: '/resource/' },
  { category: 'content', confidence: 'medium', pattern: /\/insights?\//i, label: '/insight/' },
  { category: 'content', confidence: 'medium', pattern: /\/knowledge\//i, label: '/knowledge/' },
  // NL
  { category: 'content', confidence: 'high', pattern: /\/kennisbank\//i, label: '/kennisbank/' },
  { category: 'content', confidence: 'high', pattern: /\/artikelen\//i, label: '/artikelen/' },
  { category: 'content', confidence: 'high', pattern: /\/nieuws\//i, label: '/nieuws/' },
  { category: 'content', confidence: 'medium', pattern: /\/gids\//i, label: '/gids/' },
  { category: 'content', confidence: 'medium', pattern: /\/handleiding\//i, label: '/handleiding/' },
  // DE
  { category: 'content', confidence: 'high', pattern: /\/ratgeber\//i, label: '/ratgeber/' },
  { category: 'content', confidence: 'high', pattern: /\/artikel\//i, label: '/artikel/' },
  { category: 'content', confidence: 'high', pattern: /\/nachrichten\//i, label: '/nachrichten/' },
  { category: 'content', confidence: 'medium', pattern: /\/wissen\//i, label: '/wissen/' },
  // Slug patterns (lower confidence — heuristic)
  { category: 'content', confidence: 'medium', pattern: /\/how-to-[^/]+/i, label: 'how-to-*' },
  { category: 'content', confidence: 'medium', pattern: /\/what-is-[^/]+/i, label: 'what-is-*' },
  { category: 'content', confidence: 'low', pattern: /\/why-[^/]+/i, label: 'why-*' },
  { category: 'content', confidence: 'low', pattern: /\/best-[^/]+/i, label: 'best-*' },
  { category: 'content', confidence: 'low', pattern: /\/top-\d+-[^/]+/i, label: 'top-N-*' },

  // 6. Product/Service — multilingual
  // EN
  { category: 'product', confidence: 'high', pattern: /\/products?\//i, label: '/product/' },
  { category: 'product', confidence: 'high', pattern: /\/services?\//i, label: '/service/' },
  { category: 'product', confidence: 'high', pattern: /\/pricing\/?/i, label: '/pricing/' },
  { category: 'product', confidence: 'high', pattern: /\/shop\//i, label: '/shop/' },
  { category: 'product', confidence: 'medium', pattern: /\/solutions?\//i, label: '/solution/' },
  { category: 'product', confidence: 'medium', pattern: /\/features?\//i, label: '/feature/' },
  { category: 'product', confidence: 'medium', pattern: /\/plans?\/?$/i, label: '/plans' },
  // NL
  { category: 'product', confidence: 'high', pattern: /\/diensten\//i, label: '/diensten/' },
  { category: 'product', confidence: 'medium', pattern: /\/oplossingen\//i, label: '/oplossingen/' },
  { category: 'product', confidence: 'high', pattern: /\/producten\//i, label: '/producten/' },
  { category: 'product', confidence: 'high', pattern: /\/prijzen\/?/i, label: '/prijzen/' },
  { category: 'product', confidence: 'medium', pattern: /\/functies\//i, label: '/functies/' },
  { category: 'product', confidence: 'medium', pattern: /\/certificeringen\//i, label: '/certificeringen/' },
  // DE
  { category: 'product', confidence: 'high', pattern: /\/dienstleistungen\//i, label: '/dienstleistungen/' },
  { category: 'product', confidence: 'high', pattern: /\/produkte\//i, label: '/produkte/' },
  { category: 'product', confidence: 'high', pattern: /\/preise\/?/i, label: '/preise/' },
  { category: 'product', confidence: 'medium', pattern: /\/loesungen\//i, label: '/loesungen/' },
  // ES
  { category: 'product', confidence: 'high', pattern: /\/servicios\//i, label: '/servicios/' },
  { category: 'product', confidence: 'high', pattern: /\/productos\//i, label: '/productos/' },
  { category: 'product', confidence: 'high', pattern: /\/precios\/?/i, label: '/precios/' },
  { category: 'product', confidence: 'medium', pattern: /\/soluciones\//i, label: '/soluciones/' },
];

// ── Classification Functions ──────────────────────────────────────────────────

export function classifyUrl(url: string): UrlClassification {
  // Normalize: extract pathname + search from full URL, or use as-is for relative paths
  let pathToMatch: string;
  try {
    const parsed = new URL(url);
    pathToMatch = parsed.pathname + parsed.search;
  } catch {
    pathToMatch = url;
  }

  for (const rule of PATTERN_RULES) {
    if (rule.pattern.test(pathToMatch)) {
      return {
        category: rule.category,
        confidence: rule.confidence,
        matchedPattern: rule.label,
      };
    }
  }

  return {
    category: 'uncategorized',
    confidence: 'low',
    matchedPattern: 'no match',
  };
}

export function classifyInventory(
  items: SiteInventoryItem[],
): Map<UrlCategory, SiteInventoryItem[]> {
  const groups = new Map<UrlCategory, SiteInventoryItem[]>();

  // Initialize all categories (ensures consistent ordering)
  const allCategories: UrlCategory[] = [
    'content', 'product', 'category', 'legal', 'pagination', 'media', 'uncategorized',
  ];
  for (const cat of allCategories) {
    groups.set(cat, []);
  }

  for (const item of items) {
    const { category } = classifyUrl(item.url);
    groups.get(category)!.push(item);
  }

  return groups;
}

// ── Display Helpers ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<UrlCategory, string> = {
  content: 'Content',
  product: 'Product / Service',
  category: 'Category / Tag',
  legal: 'Legal / Utility',
  pagination: 'Pagination',
  media: 'Media',
  uncategorized: 'Uncategorized',
};

const CATEGORY_COLORS: Record<UrlCategory, string> = {
  content: 'text-blue-400',
  product: 'text-green-400',
  category: 'text-purple-400',
  legal: 'text-gray-400',
  pagination: 'text-orange-400',
  media: 'text-yellow-400',
  uncategorized: 'text-gray-500',
};

const CATEGORY_BG_COLORS: Record<UrlCategory, string> = {
  content: 'bg-blue-400',
  product: 'bg-green-400',
  category: 'bg-purple-400',
  legal: 'bg-gray-400',
  pagination: 'bg-orange-400',
  media: 'bg-yellow-400',
  uncategorized: 'bg-gray-500',
};

export function getCategoryLabel(category: UrlCategory): string {
  return CATEGORY_LABELS[category];
}

export function getCategoryColor(category: UrlCategory): string {
  return CATEGORY_COLORS[category];
}

export function getCategoryBgColor(category: UrlCategory): string {
  return CATEGORY_BG_COLORS[category];
}
