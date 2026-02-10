import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UrlDiscoveryService, type UrlSuggestion, type PageCrawlerLike } from '../UrlDiscoveryService';
import { PageCrawler } from '../PageCrawler';

const mockHtml = `
<!DOCTYPE html>
<html>
  <head><title>Test Company</title></head>
  <body>
    <nav>
      <a href="/services">Services</a>
      <a href="/about">About</a>
    </nav>
    <section class="hero">
      <a href="/contact" class="cta">Get Started</a>
    </section>
    <div class="featured">
      <a href="/blog/article-1">Latest News</a>
    </div>
    <footer>
      <a href="/privacy">Privacy</a>
    </footer>
  </body>
</html>
`;

describe('UrlDiscoveryService', () => {
  let service: UrlDiscoveryService;
  let mockCrawler: { capturePage: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockCrawler = {
      capturePage: vi.fn().mockResolvedValue({
        sourceUrl: 'https://example.com',
        pageType: 'homepage',
        rawHtml: mockHtml,
        screenshotBase64: 'data:image/png;base64,test',
        computedStyles: {},
        capturedAt: new Date().toISOString()
      }),
      close: vi.fn().mockResolvedValue(undefined)
    };

    // Use dependency injection to pass mock crawler factory
    service = new UrlDiscoveryService(() => mockCrawler as PageCrawlerLike);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('discoverUrls', () => {
    it('discovers URLs from homepage with prominence scoring', async () => {
      const suggestions = await service.discoverUrls('example.com');

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);

      // Should discover all links from the page
      const urls = suggestions.map(s => s.url);
      expect(urls).toContain('https://example.com/services');
      expect(urls).toContain('https://example.com/about');
      expect(urls).toContain('https://example.com/contact');
      expect(urls).toContain('https://example.com/blog/article-1');
      expect(urls).toContain('https://example.com/privacy');

      // Each suggestion should have required properties
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('url');
        expect(suggestion).toHaveProperty('pageType');
        expect(suggestion).toHaveProperty('discoveredFrom');
        expect(suggestion).toHaveProperty('prominenceScore');
        expect(suggestion).toHaveProperty('visualContext');
        expect(typeof suggestion.prominenceScore).toBe('number');
        expect(suggestion.prominenceScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.prominenceScore).toBeLessThanOrEqual(100);
      });
    });

    it('scores hero CTA links higher than footer links', async () => {
      const suggestions = await service.discoverUrls('example.com');

      const heroCtaLink = suggestions.find(s => s.url.includes('/contact'));
      const footerLink = suggestions.find(s => s.url.includes('/privacy'));

      expect(heroCtaLink).toBeDefined();
      expect(footerLink).toBeDefined();

      expect(heroCtaLink!.discoveredFrom).toBe('hero_cta');
      expect(footerLink!.discoveredFrom).toBe('footer');

      // Hero CTA should have higher prominence than footer
      expect(heroCtaLink!.prominenceScore).toBeGreaterThan(footerLink!.prominenceScore);
    });

    it('categorizes URLs by page type', async () => {
      const suggestions = await service.discoverUrls('example.com');

      const servicesLink = suggestions.find(s => s.url.includes('/services'));
      const contactLink = suggestions.find(s => s.url.includes('/contact'));
      const articleLink = suggestions.find(s => s.url.includes('/blog/article-1'));
      const privacyLink = suggestions.find(s => s.url.includes('/privacy'));

      expect(servicesLink?.pageType).toBe('service');
      expect(contactLink?.pageType).toBe('contact');
      expect(articleLink?.pageType).toBe('article');
      expect(privacyLink?.pageType).toBe('other');
    });

    it('correctly identifies discoveredFrom based on HTML context', async () => {
      const suggestions = await service.discoverUrls('example.com');

      const navLinks = suggestions.filter(s => s.discoveredFrom === 'nav_link');
      const heroCtas = suggestions.filter(s => s.discoveredFrom === 'hero_cta');
      const featuredContent = suggestions.filter(s => s.discoveredFrom === 'featured_content');
      const footerLinks = suggestions.filter(s => s.discoveredFrom === 'footer');

      // Services and About should be nav links
      expect(navLinks.map(s => s.url)).toContain('https://example.com/services');
      expect(navLinks.map(s => s.url)).toContain('https://example.com/about');

      // Contact should be hero CTA
      expect(heroCtas.map(s => s.url)).toContain('https://example.com/contact');

      // Blog article should be featured content
      expect(featuredContent.map(s => s.url)).toContain('https://example.com/blog/article-1');

      // Privacy should be footer
      expect(footerLinks.map(s => s.url)).toContain('https://example.com/privacy');
    });

    it('applies prominence scoring based on discovery source', async () => {
      const suggestions = await service.discoverUrls('example.com');

      // Expected prominence order: hero_cta > featured_content > nav_link > footer
      const heroScore = suggestions.find(s => s.discoveredFrom === 'hero_cta')?.prominenceScore ?? 0;
      const featuredScore = suggestions.find(s => s.discoveredFrom === 'featured_content')?.prominenceScore ?? 0;
      const navScore = suggestions.find(s => s.discoveredFrom === 'nav_link')?.prominenceScore ?? 0;
      const footerScore = suggestions.find(s => s.discoveredFrom === 'footer')?.prominenceScore ?? 0;

      expect(heroScore).toBeGreaterThan(featuredScore);
      expect(featuredScore).toBeGreaterThan(navScore);
      expect(navScore).toBeGreaterThan(footerScore);
    });

    it('includes visual context describing link location', async () => {
      const suggestions = await service.discoverUrls('example.com');

      suggestions.forEach(suggestion => {
        expect(suggestion.visualContext).toBeTruthy();
        expect(typeof suggestion.visualContext).toBe('string');
      });

      const heroLink = suggestions.find(s => s.discoveredFrom === 'hero_cta');
      expect(heroLink?.visualContext.toLowerCase()).toContain('hero');
    });
  });
});
