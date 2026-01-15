// services/ai/businessResearch.ts
// Smart Wizard: AI-powered business research for auto-filling form fields

import { BusinessInfo } from '../../types';
import { extractPageContent } from '../jinaService';
import { AppAction } from '../../state/appState';
import { AIResponseSanitizer } from '../aiResponseSanitizer';
import { RESEARCH_BUSINESS_PROMPT } from '../../config/prompts';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export interface BusinessResearchInput {
  input: string; // URL, business name, or description
  inputType: 'url' | 'name' | 'description' | 'mixed';
  extractedUrl?: string;
  extractedDescription?: string;
}

export interface BusinessResearchResult {
  suggestions: Partial<BusinessInfo>;
  confidence: 'high' | 'medium' | 'low';
  source: 'scraped' | 'ai_knowledge' | 'combined';
  warnings: string[];
  scrapedContent?: {
    title: string;
    description: string;
    content: string;
  };
}

/**
 * Extract URL from mixed input if present
 */
const extractUrlFromInput = (input: string): { url: string | null; remainder: string } => {
  // Match URLs with protocol
  const urlWithProtocol = input.match(/(https?:\/\/[^\s]+)/i);
  if (urlWithProtocol) {
    const url = urlWithProtocol[1];
    const remainder = input.replace(url, '').trim();
    return { url, remainder };
  }

  // Match domain-like patterns (e.g., example.com, www.example.nl)
  const domainPattern = input.match(/(?:^|\s)((?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i);
  if (domainPattern) {
    const domain = domainPattern[1];
    const remainder = input.replace(domain, '').trim();
    return { url: `https://${domain}`, remainder };
  }

  return { url: null, remainder: input };
};

/**
 * Detect the type of input provided by the user
 * Supports mixed inputs like "https://example.com Business description here"
 */
export const detectInputType = (input: string): BusinessResearchInput['inputType'] => {
  const trimmed = input.trim();
  const { url, remainder } = extractUrlFromInput(trimmed);

  // If we found a URL and there's additional text, it's mixed input
  if (url && remainder.length > 0) {
    return 'mixed';
  }

  // Pure URL
  if (url && remainder.length === 0) {
    return 'url';
  }

  // If it's short (likely a business name) vs long (description)
  if (trimmed.length < 50 && trimmed.split(' ').length <= 5) {
    return 'name';
  }

  return 'description';
};

/**
 * Parse input to extract URL and description components
 */
export const parseInput = (input: string): BusinessResearchInput => {
  const trimmed = input.trim();
  const inputType = detectInputType(trimmed);
  const { url, remainder } = extractUrlFromInput(trimmed);

  return {
    input: trimmed,
    inputType,
    extractedUrl: url || undefined,
    extractedDescription: remainder || (inputType !== 'url' ? trimmed : undefined),
  };
};

/**
 * Normalize URL input (add https:// if missing)
 */
const normalizeUrl = (input: string): string => {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

/** Result type for scrapeWebsite that includes error details */
interface ScrapeResult {
  success: boolean;
  data?: { title: string; description: string; content: string };
  error?: string;
  errorType?: 'no_api_key' | 'insufficient_balance' | 'rate_limit' | 'auth_error' | 'network_error' | 'unknown';
}

/**
 * Parse Jina API error to extract user-friendly message
 */
const parseJinaError = (errorMessage: string): { message: string; type: ScrapeResult['errorType'] } => {
  // Try to extract JSON error from message
  const jsonMatch = errorMessage.match(/\{.*\}/);
  if (jsonMatch) {
    try {
      const errorData = JSON.parse(jsonMatch[0]);
      if (errorData.code === 402 || errorData.name === 'InsufficientBalanceError') {
        return {
          message: 'Jina API account has insufficient balance. Please recharge at jina.ai',
          type: 'insufficient_balance'
        };
      }
      if (errorData.code === 401) {
        return {
          message: 'Jina API key is invalid. Please check your API key in Settings.',
          type: 'auth_error'
        };
      }
      if (errorData.code === 429) {
        return {
          message: 'Jina API rate limit exceeded. Please try again in a few minutes.',
          type: 'rate_limit'
        };
      }
      if (errorData.readableMessage) {
        return { message: errorData.readableMessage, type: 'unknown' };
      }
    } catch {
      // JSON parse failed, continue with string matching
    }
  }

  // Fallback to string matching
  if (errorMessage.includes('402') || errorMessage.includes('InsufficientBalance')) {
    return {
      message: 'Jina API account has insufficient balance. Please recharge at jina.ai',
      type: 'insufficient_balance'
    };
  }
  if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
    return {
      message: 'Jina API key is invalid. Please check your API key in Settings.',
      type: 'auth_error'
    };
  }
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return {
      message: 'Jina API rate limit exceeded. Please try again in a few minutes.',
      type: 'rate_limit'
    };
  }

  return { message: 'Failed to scrape website content.', type: 'unknown' };
};

/**
 * Scrape website content using Jina.ai
 */
const scrapeWebsite = async (
  url: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<ScrapeResult> => {
  if (!businessInfo.jinaApiKey) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'SmartWizard',
        message: 'Jina API key not configured, skipping web scraping',
        status: 'info',
        timestamp: Date.now(),
      },
    });
    return {
      success: false,
      error: 'Jina API key not configured. Add it in Settings to enable website scraping.',
      errorType: 'no_api_key'
    };
  }

  try {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'SmartWizard',
        message: `Scraping website: ${url}`,
        status: 'info',
        timestamp: Date.now(),
      },
    });

    const proxyConfig = businessInfo.supabaseUrl && businessInfo.supabaseAnonKey
      ? { supabaseUrl: businessInfo.supabaseUrl, supabaseAnonKey: businessInfo.supabaseAnonKey }
      : undefined;

    const extraction = await extractPageContent(url, businessInfo.jinaApiKey, proxyConfig);

    return {
      success: true,
      data: {
        title: extraction.title || '',
        description: extraction.description || '',
        content: extraction.content?.substring(0, 8000) || '', // Limit content size for AI
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Parse the error to get user-friendly message
    const parsedError = parseJinaError(errorMessage);

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'SmartWizard',
        message: `Failed to scrape website: ${parsedError.message}`,
        status: 'failure',
        timestamp: Date.now(),
      },
    });

    return {
      success: false,
      error: parsedError.message,
      errorType: parsedError.type
    };
  }
};

/**
 * Call Perplexity API for business research via Supabase proxy to avoid CORS
 */
const callPerplexityForResearch = async (
  prompt: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<Partial<BusinessInfo>> => {
  if (!businessInfo.perplexityApiKey) {
    throw new Error('Perplexity API key is not configured. Please add it in Settings.');
  }

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'SmartWizard',
      message: 'Researching business with Perplexity AI...',
      status: 'info',
      timestamp: Date.now(),
    },
  });

  let responseData: any;

  // Use Supabase proxy to avoid CORS issues in browser
  if (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) {
    const proxyUrl = `${businessInfo.supabaseUrl}/functions/v1/fetch-proxy`;

    const proxyResponse = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': businessInfo.supabaseAnonKey,
        'Authorization': `Bearer ${businessInfo.supabaseAnonKey}`,
      },
      body: JSON.stringify({
        url: PERPLEXITY_API_URL,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${businessInfo.perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro', // Use sonar-pro for web search capability
          messages: [
            {
              role: 'system',
              content: 'You are a business analyst expert. Analyze the provided information and extract structured business data. Output strict JSON only.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 4096,
        }),
      }),
    });

    const proxyResult = await proxyResponse.json();

    if (!proxyResult.ok) {
      throw new Error(`Perplexity API Error: ${proxyResult.status} - ${proxyResult.error || proxyResult.body}`);
    }

    responseData = typeof proxyResult.body === 'string' ? JSON.parse(proxyResult.body) : proxyResult.body;
  } else {
    // Direct fetch (will fail with CORS in browser, but works server-side)
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${businessInfo.perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst expert. Analyze the provided information and extract structured business data. Output strict JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Perplexity API Error: ${response.status} - ${errText}`);
    }

    responseData = await response.json();
  }

  const responseText = responseData.choices[0].message.content || '';

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'SmartWizard',
      message: 'Received business research results',
      status: 'info',
      timestamp: Date.now(),
    },
  });

  // Parse the response
  const sanitizer = new AIResponseSanitizer(dispatch);
  const schema = {
    seedKeyword: String,
    industry: String,
    valueProp: String,
    audience: String,
    language: String,
    targetMarket: String,
    authorName: String,
    authorBio: String,
    authorCredentials: String,
  };

  const fallback: Partial<BusinessInfo> = {};

  return sanitizer.sanitize(responseText, schema, fallback);
};

/**
 * Main function: Research a business and return auto-fill suggestions
 */
export const researchBusiness = async (
  input: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<BusinessResearchResult> => {
  const parsedInput = parseInput(input);
  const warnings: string[] = [];
  let scrapedContent: { title: string; description: string; content: string } | undefined;
  let source: BusinessResearchResult['source'] = 'ai_knowledge';
  let confidence: BusinessResearchResult['confidence'] = 'medium';

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'SmartWizard',
      message: `Starting business research (input type: ${parsedInput.inputType})`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  // Step 1: If URL present (either pure URL or mixed), try to scrape the website
  if (parsedInput.extractedUrl) {
    const scrapeResult = await scrapeWebsite(parsedInput.extractedUrl, businessInfo, dispatch);

    if (scrapeResult.success && scrapeResult.data?.content) {
      scrapedContent = scrapeResult.data;
      source = 'scraped';
      confidence = 'high';
    } else {
      // Use specific error message if available, otherwise generic message
      const errorMessage = scrapeResult.error || 'Could not scrape website content.';
      warnings.push(`${errorMessage} Using AI knowledge only.`);
      source = 'ai_knowledge';
      // If mixed input, we still have description so confidence stays medium
      confidence = parsedInput.inputType === 'mixed' ? 'medium' : 'low';
    }
  }

  // Step 2: Build the research prompt with all available info
  // For mixed input, include both the scraped content and the user-provided description
  const prompt = RESEARCH_BUSINESS_PROMPT(
    input,
    parsedInput.inputType,
    scrapedContent,
    parsedInput.extractedDescription
  );

  // Step 3: Call Perplexity for analysis
  try {
    const suggestions = await callPerplexityForResearch(prompt, businessInfo, dispatch);

    // Adjust confidence based on completeness
    const filledFields = Object.values(suggestions).filter(v => v && String(v).trim()).length;
    if (filledFields < 3) {
      confidence = 'low';
      warnings.push('Limited information found. Please review and complete the fields manually.');
    } else if (filledFields < 6 && confidence !== 'low') {
      confidence = 'medium';
      warnings.push('Some fields may need manual adjustment.');
    }

    // If we had scraped content, upgrade to 'combined'
    if (scrapedContent && source === 'scraped') {
      source = 'combined';
    }

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'SmartWizard',
        message: `Research complete: ${filledFields} fields suggested (confidence: ${confidence})`,
        status: 'success',
        timestamp: Date.now(),
      },
    });

    return {
      suggestions,
      confidence,
      source,
      warnings,
      scrapedContent,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'SmartWizard',
        message: `Research failed: ${message}`,
        status: 'failure',
        timestamp: Date.now(),
      },
    });

    return {
      suggestions: {},
      confidence: 'low',
      source: 'ai_knowledge',
      warnings: [`Research failed: ${message}. Please fill in the fields manually.`],
    };
  }
};
