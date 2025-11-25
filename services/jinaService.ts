// services/jinaService.ts
// Jina.ai Reader API for semantic content extraction

import { JinaExtraction } from '../types';

const JINA_READER_URL = 'https://r.jina.ai/';

interface JinaResponse {
  code: number;
  status: number;
  data: {
    title: string;
    description: string;
    url: string;
    content: string;
    usage: {
      tokens: number;
    };
  };
}

interface ProxyConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Extract semantic content from a URL using Jina.ai Reader API
 * Uses proxy to avoid CORS issues in browser
 */
export const extractPageContent = async (
  url: string,
  apiKey: string,
  proxyConfig?: ProxyConfig
): Promise<JinaExtraction> => {
  if (!apiKey) {
    throw new Error('Jina.ai API key is not configured.');
  }

  try {
    let responseData: JinaResponse;

    if (proxyConfig?.supabaseUrl) {
      // Use Supabase Edge Function proxy to avoid CORS
      const proxyUrl = `${proxyConfig.supabaseUrl}/functions/v1/fetch-proxy`;
      const jinaUrl = `${JINA_READER_URL}${encodeURIComponent(url)}`;

      const proxyResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': proxyConfig.supabaseAnonKey,
        },
        body: JSON.stringify({
          url: jinaUrl,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'X-Return-Format': 'markdown',
            'X-With-Links-Summary': 'true',
            'X-With-Images-Summary': 'true',
          },
        }),
      });

      const proxyResult = await proxyResponse.json();

      if (!proxyResult.ok) {
        throw new Error(`Jina API error: ${proxyResult.status} - ${proxyResult.error || proxyResult.body}`);
      }

      // Parse the body from proxy response
      responseData = typeof proxyResult.body === 'string' ? JSON.parse(proxyResult.body) : proxyResult.body;
    } else {
      // Direct fetch (will fail with CORS in browser, but works server-side)
      const response = await fetch(`${JINA_READER_URL}${encodeURIComponent(url)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'X-Return-Format': 'markdown',
          'X-With-Links-Summary': 'true',
          'X-With-Images-Summary': 'true',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jina API error: ${response.status} - ${errorText}`);
      }

      responseData = await response.json();
    }

    const data = responseData;

    // Parse the markdown content to extract structured data
    const extraction = parseJinaContent(data.data.content, url);

    return {
      title: data.data.title || '',
      description: data.data.description || '',
      content: data.data.content || '',
      headings: extraction.headings,
      links: extraction.links,
      images: extraction.images,
      schema: extraction.schema,
      wordCount: extraction.wordCount,
      readingTime: extraction.readingTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Jina API error';
    throw new Error(`Failed to extract content from ${url}: ${message}`);
  }
};

/**
 * Parse Jina markdown content to extract structured elements
 */
const parseJinaContent = (content: string, sourceUrl: string): {
  headings: { level: number; text: string }[];
  links: { href: string; text: string; isInternal: boolean }[];
  images: { src: string; alt: string }[];
  schema: any[];
  wordCount: number;
  readingTime: number;
} => {
  const headings: { level: number; text: string }[] = [];
  const links: { href: string; text: string; isInternal: boolean }[] = [];
  const images: { src: string; alt: string }[] = [];
  const schema: any[] = [];

  // Extract domain from source URL for internal link detection
  let sourceDomain = '';
  try {
    sourceDomain = new URL(sourceUrl).hostname;
  } catch (e) {
    // Invalid URL, skip domain extraction
  }

  // Parse headings (# ## ### etc)
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
    });
  }

  // Parse links [text](url)
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[2];
    let isInternal = false;

    try {
      const linkUrl = new URL(href, sourceUrl);
      isInternal = linkUrl.hostname === sourceDomain;
    } catch (e) {
      // Relative URL - likely internal
      isInternal = !href.startsWith('http');
    }

    links.push({
      text: match[1],
      href: href,
      isInternal,
    });
  }

  // Parse images ![alt](src)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  while ((match = imageRegex.exec(content)) !== null) {
    images.push({
      alt: match[1],
      src: match[2],
    });
  }

  // Extract JSON-LD schema if present in content
  const schemaRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = schemaRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      schema.push(parsed);
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  // Calculate word count and reading time
  const textOnly = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1') // Replace links with text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
    .replace(/#{1,6}\s+/g, '') // Remove heading markers
    .replace(/[*_`]/g, ''); // Remove formatting

  const words = textOnly.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const readingTime = Math.ceil(wordCount / 200); // ~200 words per minute

  return {
    headings,
    links,
    images,
    schema,
    wordCount,
    readingTime,
  };
};

/**
 * Batch extract content from multiple URLs
 */
export const extractMultiplePages = async (
  urls: string[],
  apiKey: string,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, JinaExtraction | Error>> => {
  const results = new Map<string, JinaExtraction | Error>();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const extraction = await extractPageContent(url, apiKey);
      results.set(url, extraction);
    } catch (error) {
      results.set(url, error instanceof Error ? error : new Error(String(error)));
    }

    if (onProgress) {
      onProgress(i + 1, urls.length);
    }

    // Rate limiting: 100ms delay between requests
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
};

/**
 * Generate content hash for change detection
 */
export const generateContentHash = (content: string): string => {
  // Simple hash function for content comparison
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};
