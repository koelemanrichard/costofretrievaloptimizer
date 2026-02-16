import { describe, it, expect } from 'vitest';
import {
  classifyUrl,
  classifyInventory,
  getCategoryLabel,
  getCategoryColor,
  getCategoryBgColor,
  type UrlCategory,
} from '../urlClassifier';
import type { SiteInventoryItem } from '../../types';

// Helper: create a minimal SiteInventoryItem with a given URL
function makeItem(url: string, overrides?: Partial<SiteInventoryItem>): SiteInventoryItem {
  return {
    id: Math.random().toString(36).slice(2),
    project_id: 'test',
    url,
    title: '',
    http_status: 200,
    mapped_topic_id: null,
    status: 'AUDIT_PENDING' as SiteInventoryItem['status'],
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('classifyUrl', () => {
  // ── Pagination (highest priority) ──────────────────────────────────────────
  describe('pagination', () => {
    it('matches /page/N', () => {
      expect(classifyUrl('https://example.com/blog/page/2').category).toBe('pagination');
    });
    it('matches ?page=N', () => {
      expect(classifyUrl('https://example.com/products?page=3').category).toBe('pagination');
    });
    it('matches /p/N', () => {
      expect(classifyUrl('https://example.com/p/4').category).toBe('pagination');
    });
    it('matches ?paged=N', () => {
      expect(classifyUrl('https://example.com/news?paged=5').category).toBe('pagination');
    });
  });

  // ── Media ──────────────────────────────────────────────────────────────────
  describe('media', () => {
    it('matches .pdf', () => {
      expect(classifyUrl('https://example.com/docs/whitepaper.pdf').category).toBe('media');
    });
    it('matches .jpg', () => {
      expect(classifyUrl('https://example.com/images/logo.jpg').category).toBe('media');
    });
    it('matches .webp', () => {
      expect(classifyUrl('https://example.com/img/hero.webp').category).toBe('media');
    });
    it('matches .mp4', () => {
      expect(classifyUrl('https://example.com/videos/intro.mp4').category).toBe('media');
    });
    it('matches .zip', () => {
      expect(classifyUrl('https://example.com/downloads/file.zip').category).toBe('media');
    });
  });

  // ── Legal/Utility ─────────────────────────────────────────────────────────
  describe('legal', () => {
    it('matches /privacy', () => {
      expect(classifyUrl('https://example.com/privacy').category).toBe('legal');
    });
    it('matches /privacy-policy', () => {
      expect(classifyUrl('https://example.com/privacy-policy').category).toBe('legal');
    });
    it('matches /terms', () => {
      expect(classifyUrl('https://example.com/terms').category).toBe('legal');
    });
    it('matches /terms-of-service', () => {
      expect(classifyUrl('https://example.com/terms-of-service').category).toBe('legal');
    });
    it('matches /contact', () => {
      expect(classifyUrl('https://example.com/contact').category).toBe('legal');
    });
    it('matches /about', () => {
      expect(classifyUrl('https://example.com/about').category).toBe('legal');
    });
    it('matches /login', () => {
      expect(classifyUrl('https://example.com/login').category).toBe('legal');
    });
    it('matches /faq', () => {
      expect(classifyUrl('https://example.com/faq').category).toBe('legal');
    });
    it('matches /sitemap', () => {
      expect(classifyUrl('https://example.com/sitemap').category).toBe('legal');
    });
    it('matches /disclaimer', () => {
      expect(classifyUrl('https://example.com/disclaimer').category).toBe('legal');
    });
    // NL
    it('matches /privacybeleid (NL)', () => {
      expect(classifyUrl('https://example.nl/privacybeleid').category).toBe('legal');
    });
    it('matches /voorwaarden (NL)', () => {
      expect(classifyUrl('https://example.nl/voorwaarden').category).toBe('legal');
    });
    it('matches /over-ons (NL)', () => {
      expect(classifyUrl('https://example.nl/over-ons').category).toBe('legal');
    });
    // DE
    it('matches /datenschutz (DE)', () => {
      expect(classifyUrl('https://example.de/datenschutz').category).toBe('legal');
    });
    it('matches /impressum (DE)', () => {
      expect(classifyUrl('https://example.de/impressum').category).toBe('legal');
    });
    it('matches /agb (DE)', () => {
      expect(classifyUrl('https://example.de/agb').category).toBe('legal');
    });
    // ES
    it('matches /privacidad (ES)', () => {
      expect(classifyUrl('https://example.es/privacidad').category).toBe('legal');
    });
    it('matches /contacto (ES)', () => {
      expect(classifyUrl('https://example.es/contacto').category).toBe('legal');
    });
  });

  // ── Category/Tag ──────────────────────────────────────────────────────────
  describe('category', () => {
    it('matches /category/', () => {
      expect(classifyUrl('https://example.com/category/seo').category).toBe('category');
    });
    it('matches /tag/', () => {
      expect(classifyUrl('https://example.com/tag/performance').category).toBe('category');
    });
    it('matches /archive/', () => {
      expect(classifyUrl('https://example.com/archive/2024').category).toBe('category');
    });
    it('matches /author/', () => {
      expect(classifyUrl('https://example.com/author/john').category).toBe('category');
    });
    // NL
    it('matches /categorie/ (NL)', () => {
      expect(classifyUrl('https://example.nl/categorie/marketing').category).toBe('category');
    });
    // DE
    it('matches /kategorie/ (DE)', () => {
      expect(classifyUrl('https://example.de/kategorie/seo').category).toBe('category');
    });
  });

  // ── Content ───────────────────────────────────────────────────────────────
  describe('content', () => {
    it('matches /blog/', () => {
      expect(classifyUrl('https://example.com/blog/my-post').category).toBe('content');
    });
    it('matches /articles/', () => {
      expect(classifyUrl('https://example.com/articles/seo-guide').category).toBe('content');
    });
    it('matches /news/', () => {
      expect(classifyUrl('https://example.com/news/latest').category).toBe('content');
    });
    it('matches /guide/', () => {
      expect(classifyUrl('https://example.com/guide/getting-started').category).toBe('content');
    });
    it('matches how-to slug', () => {
      expect(classifyUrl('https://example.com/how-to-optimize-seo').category).toBe('content');
    });
    it('matches what-is slug', () => {
      expect(classifyUrl('https://example.com/what-is-topical-authority').category).toBe('content');
    });
    // NL
    it('matches /kennisbank/ (NL)', () => {
      expect(classifyUrl('https://example.nl/kennisbank/artikel-1').category).toBe('content');
    });
    it('matches /artikelen/ (NL)', () => {
      expect(classifyUrl('https://example.nl/artikelen/seo-tips').category).toBe('content');
    });
    // DE
    it('matches /ratgeber/ (DE)', () => {
      expect(classifyUrl('https://example.de/ratgeber/linkbuilding').category).toBe('content');
    });
  });

  // ── Product/Service ───────────────────────────────────────────────────────
  describe('product', () => {
    it('matches /product/', () => {
      expect(classifyUrl('https://example.com/product/seo-tool').category).toBe('product');
    });
    it('matches /service/', () => {
      expect(classifyUrl('https://example.com/service/consulting').category).toBe('product');
    });
    it('matches /pricing', () => {
      expect(classifyUrl('https://example.com/pricing').category).toBe('product');
    });
    it('matches /shop/', () => {
      expect(classifyUrl('https://example.com/shop/items').category).toBe('product');
    });
    // NL
    it('matches /diensten/ (NL)', () => {
      expect(classifyUrl('https://example.nl/diensten/incident-response/').category).toBe('product');
    });
    it('matches /producten/ (NL)', () => {
      expect(classifyUrl('https://example.nl/producten/software').category).toBe('product');
    });
    // DE
    it('matches /dienstleistungen/ (DE)', () => {
      expect(classifyUrl('https://example.de/dienstleistungen/beratung').category).toBe('product');
    });
    // ES
    it('matches /servicios/ (ES)', () => {
      expect(classifyUrl('https://example.es/servicios/consultoria').category).toBe('product');
    });
  });

  // ── Uncategorized (fallback) ──────────────────────────────────────────────
  describe('uncategorized', () => {
    it('returns uncategorized for homepage', () => {
      const result = classifyUrl('https://example.com/');
      expect(result.category).toBe('uncategorized');
      expect(result.confidence).toBe('low');
    });
    it('returns uncategorized for unknown paths', () => {
      expect(classifyUrl('https://example.com/random-slug').category).toBe('uncategorized');
    });
  });

  // ── Priority ordering (first match wins) ──────────────────────────────────
  describe('priority ordering', () => {
    it('pagination beats content: /blog/page/2 is pagination', () => {
      expect(classifyUrl('https://example.com/blog/page/2').category).toBe('pagination');
    });
    it('pagination beats category: /category/seo?page=3 is pagination', () => {
      expect(classifyUrl('https://example.com/category/seo?page=3').category).toBe('pagination');
    });
    it('media beats everything: /blog/article.pdf is media', () => {
      expect(classifyUrl('https://example.com/blog/article.pdf').category).toBe('media');
    });
  });

  // ── Confidence levels ─────────────────────────────────────────────────────
  describe('confidence', () => {
    it('high confidence for exact patterns', () => {
      expect(classifyUrl('https://example.com/blog/post').confidence).toBe('high');
    });
    it('medium confidence for slug heuristics', () => {
      expect(classifyUrl('https://example.com/how-to-do-seo').confidence).toBe('medium');
    });
    it('low confidence for weak slug patterns', () => {
      expect(classifyUrl('https://example.com/best-seo-tools').confidence).toBe('low');
    });
  });
});

describe('classifyInventory', () => {
  it('groups items by category', () => {
    const items = [
      makeItem('https://example.com/blog/post-1'),
      makeItem('https://example.com/blog/post-2'),
      makeItem('https://example.com/product/tool'),
      makeItem('https://example.com/privacy'),
      makeItem('https://example.com/random'),
    ];
    const groups = classifyInventory(items);

    expect(groups.get('content')!.length).toBe(2);
    expect(groups.get('product')!.length).toBe(1);
    expect(groups.get('legal')!.length).toBe(1);
    expect(groups.get('uncategorized')!.length).toBe(1);
    expect(groups.get('pagination')!.length).toBe(0);
    expect(groups.get('media')!.length).toBe(0);
    expect(groups.get('category')!.length).toBe(0);
  });

  it('initializes all categories even when empty', () => {
    const groups = classifyInventory([]);
    expect(groups.size).toBe(7);
    for (const items of groups.values()) {
      expect(items.length).toBe(0);
    }
  });
});

describe('display helpers', () => {
  const allCategories: UrlCategory[] = [
    'content', 'product', 'category', 'legal', 'pagination', 'media', 'uncategorized',
  ];

  it('getCategoryLabel returns a string for every category', () => {
    for (const cat of allCategories) {
      expect(typeof getCategoryLabel(cat)).toBe('string');
      expect(getCategoryLabel(cat).length).toBeGreaterThan(0);
    }
  });

  it('getCategoryColor returns a Tailwind text class for every category', () => {
    for (const cat of allCategories) {
      expect(getCategoryColor(cat)).toMatch(/^text-/);
    }
  });

  it('getCategoryBgColor returns a Tailwind bg class for every category', () => {
    for (const cat of allCategories) {
      expect(getCategoryBgColor(cat)).toMatch(/^bg-/);
    }
  });
});
