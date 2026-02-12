import type { FetchedContent, FetchOptions } from './types';

export interface ContentFetcherConfig {
  jinaApiKey?: string;
  firecrawlApiKey?: string;
  proxyConfig?: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
}

export class ContentFetcher {
  private readonly config: ContentFetcherConfig;

  constructor(config: ContentFetcherConfig = {}) {
    this.config = config;
  }

  /**
   * Fetch content from URL using preferred provider with optional fallback.
   */
  async fetch(url: string, options: FetchOptions): Promise<FetchedContent> {
    const start = Date.now();
    const chain = options.fallbackEnabled !== false
      ? this.buildFallbackChain(options.preferredProvider)
      : [options.preferredProvider];

    let lastError: Error | undefined;
    for (const provider of chain) {
      try {
        const raw = await this.fetchWithProvider(url, provider);
        const parsed = this.parseHtml(raw.html, url);
        return {
          url,
          semanticText: raw.text,
          rawHtml: raw.html,
          title: raw.title || parsed.title,
          metaDescription: parsed.metaDescription,
          headings: parsed.headings,
          images: parsed.images,
          internalLinks: parsed.internalLinks,
          externalLinks: parsed.externalLinks,
          schemaMarkup: parsed.schemaMarkup,
          language: parsed.language,
          provider,
          fetchDurationMs: Date.now() - start,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
    throw lastError || new Error(`All providers failed for ${url}`);
  }

  private async fetchWithProvider(
    url: string,
    provider: FetchOptions['preferredProvider']
  ): Promise<{ text: string; html: string; title: string }> {
    switch (provider) {
      case 'jina':
        return this.fetchWithJina(url);
      case 'firecrawl':
        return this.fetchWithFirecrawl(url);
      case 'direct':
        return this.fetchDirect(url);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private async fetchWithJina(
    url: string
  ): Promise<{ text: string; html: string; title: string }> {
    const apiKey = this.config.jinaApiKey;
    if (!apiKey) throw new Error('Jina API key not configured');

    const { extractPageContentWithHtml } = await import('../jinaService');
    const result = await extractPageContentWithHtml(
      url,
      apiKey,
      this.config.proxyConfig
    );
    return {
      text: result.content,
      html: result.html || '',
      title: result.title || '',
    };
  }

  private async fetchWithFirecrawl(
    url: string
  ): Promise<{ text: string; html: string; title: string }> {
    const apiKey = this.config.firecrawlApiKey;
    if (!apiKey) throw new Error('Firecrawl API key not configured');

    const { extractPageWithFirecrawl } = await import('../firecrawlService');
    const result = await extractPageWithFirecrawl(
      url,
      apiKey,
      undefined,
      this.config.proxyConfig
    );
    return {
      text: result.markdown || '',
      html: result.html || '',
      title: result.title || '',
    };
  }

  private async fetchDirect(
    url: string
  ): Promise<{ text: string; html: string; title: string }> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
    return {
      text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      html,
      title: titleMatch?.[1]?.trim() || '',
    };
  }

  /**
   * Parse raw HTML to extract structured content.
   */
  parseHtml(
    html: string,
    baseUrl: string
  ): {
    title: string;
    metaDescription: string;
    headings: { level: number; text: string }[];
    images: { src: string; alt: string }[];
    internalLinks: { href: string; anchor: string }[];
    externalLinks: { href: string; anchor: string }[];
    schemaMarkup: object[];
    language: string;
  } {
    const base = new URL(baseUrl);

    // Title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
    const title = titleMatch?.[1]?.trim() || '';

    // Meta description (handle both attribute orderings)
    const metaMatch =
      html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*?)["']/is
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']*?)["'][^>]+name=["']description["']/is
      );
    const metaDescription = metaMatch?.[1]?.trim() || '';

    // Language
    const langMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
    const language = langMatch?.[1] || 'en';

    // Headings
    const headings: { level: number; text: string }[] = [];
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gis;
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
      headings.push({
        level: parseInt(match[1], 10),
        text: match[2].replace(/<[^>]+>/g, '').trim(),
      });
    }

    // Images
    const images: { src: string; alt: string }[] = [];
    const imgRegex = /<img[^>]+>/gi;
    while ((match = imgRegex.exec(html)) !== null) {
      const srcMatch = match[0].match(/src=["']([^"']+)["']/i);
      const altMatch = match[0].match(/alt=["']([^"']*?)["']/i);
      if (srcMatch) {
        images.push({ src: srcMatch[1], alt: altMatch?.[1] || '' });
      }
    }

    // Links
    const internalLinks: { href: string; anchor: string }[] = [];
    const externalLinks: { href: string; anchor: string }[] = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const anchor = match[2].replace(/<[^>]+>/g, '').trim();
      try {
        const resolved = new URL(href, baseUrl);
        if (resolved.hostname === base.hostname) {
          internalLinks.push({ href: resolved.href, anchor });
        } else {
          externalLinks.push({ href: resolved.href, anchor });
        }
      } catch {
        // Skip invalid URLs
      }
    }

    // Schema markup (JSON-LD)
    const schemaMarkup: object[] = [];
    const schemaRegex =
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
    while ((match = schemaRegex.exec(html)) !== null) {
      try {
        schemaMarkup.push(JSON.parse(match[1]));
      } catch {
        // Skip invalid JSON-LD
      }
    }

    return {
      title,
      metaDescription,
      headings,
      images,
      internalLinks,
      externalLinks,
      schemaMarkup,
      language,
    };
  }

  buildFallbackChain(
    preferred: FetchOptions['preferredProvider']
  ): FetchOptions['preferredProvider'][] {
    const all: FetchOptions['preferredProvider'][] = [
      'jina',
      'firecrawl',
      'direct',
    ];
    return [preferred, ...all.filter((p) => p !== preferred)];
  }
}
