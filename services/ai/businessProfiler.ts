/**
 * Business Profiler Service
 *
 * Analyzes crawl data (page titles, URLs, H1s) to auto-detect business
 * services/products BEFORE map generation. This fixes "garbage in = garbage out"
 * by ensuring the system understands the business from the start.
 *
 * @module services/ai/businessProfiler
 */

import type { BusinessInfo } from '../../types';
import { matchServicesToExistingUrls } from '../../utils/eavUtils';
import type { ServiceWithPage } from '../../utils/eavUtils';
import { dispatchToProvider } from './providerDispatcher';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { PROFILE_BUSINESS_PROMPT } from '../../config/prompts/businessProfiler';
import React from 'react';

export interface DetectedService {
  name: string;
  confidence: number; // 0-1
  evidence: string[]; // which pages/headings suggest this
  matchedUrl?: string;
  matchedTitle?: string;
  pageType: 'service' | 'product' | 'category' | 'landing';
}

export interface BusinessProfile {
  detectedServices: DetectedService[];
  detectedIndustry?: string;
  detectedAudience?: string;
  websiteType?: 'ecommerce' | 'saas' | 'b2b_services' | 'blog' | 'local_business';
}

interface PageInfo {
  url: string;
  title?: string;
  h1?: string;
  slug: string;
}

// ── URL pattern classifiers ──

const SERVICE_PATTERNS = ['/services/', '/diensten/', '/leistungen/', '/service/', '/solutions/'];
const PRODUCT_PATTERNS = ['/products/', '/producten/', '/produkte/', '/product/', '/shop/'];
const CATEGORY_PATTERNS = ['/category/', '/categorie/', '/kategorie/'];
const IGNORE_PATTERNS = ['/blog/', '/news/', '/about', '/contact', '/privacy', '/terms', '/cookie', '/sitemap', '/wp-content/', '/tag/', '/author/'];

function classifyPageType(url: string): 'service' | 'product' | 'category' | 'landing' | 'ignore' | 'unknown' {
  const lower = url.toLowerCase();
  if (IGNORE_PATTERNS.some(p => lower.includes(p))) return 'ignore';
  if (SERVICE_PATTERNS.some(p => lower.includes(p))) return 'service';
  if (PRODUCT_PATTERNS.some(p => lower.includes(p))) return 'product';
  if (CATEGORY_PATTERNS.some(p => lower.includes(p))) return 'category';

  // Pages at root or one level deep are likely service/landing pages
  const pathParts = new URL(url).pathname.split('/').filter(Boolean);
  if (pathParts.length <= 1) return 'landing';

  return 'unknown';
}

function extractSlug(url: string): string {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, '');
    const parts = pathname.split('/');
    return parts[parts.length - 1] || '';
  } catch {
    return url.split('/').filter(Boolean).pop() || '';
  }
}

function slugToWords(slug: string): string[] {
  return slug
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .map(w => w.toLowerCase());
}

// ── Heuristic Pre-filter ──

function heuristicDetect(pages: PageInfo[]): DetectedService[] {
  const servicePages = pages.filter(p => {
    const type = classifyPageType(p.url);
    return type === 'service' || type === 'product' || type === 'category' || type === 'landing';
  });

  // Group by slug words to find repeated service terms
  const termFrequency = new Map<string, { count: number; evidence: string[]; type: string }>();

  for (const page of servicePages) {
    const pageType = classifyPageType(page.url);
    const words = slugToWords(page.slug);
    const displayName = page.title || page.h1 || words.join(' ');

    // Use the full slug as a service candidate
    const slugName = page.slug.replace(/[-_]/g, ' ').trim();
    if (slugName.length > 2) {
      const existing = termFrequency.get(slugName) || { count: 0, evidence: [], type: pageType };
      existing.count++;
      existing.evidence.push(page.url);
      existing.type = pageType;
      termFrequency.set(slugName, existing);
    }
  }

  // Convert to DetectedService array
  const results: DetectedService[] = [];
  for (const [name, data] of termFrequency) {
    // Score confidence based on evidence
    let confidence = 0.3; // base confidence
    if (data.type === 'service' || data.type === 'product') confidence += 0.3;
    if (data.count > 1) confidence += 0.2;
    if (data.evidence.length > 2) confidence += 0.1;

    results.push({
      name: name.charAt(0).toUpperCase() + name.slice(1), // capitalize
      confidence: Math.min(1, confidence),
      evidence: data.evidence.slice(0, 3),
      pageType: data.type as DetectedService['pageType'],
    });
  }

  // Sort by confidence descending, limit to top 20
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 20);
}

// ── AI Refinement ──

async function aiRefine(
  heuristicCandidates: DetectedService[],
  pages: PageInfo[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<{ services: string[]; industry?: string; audience?: string; websiteType?: string }> {
  // Build compact page summary for the prompt (top 50 pages)
  const relevantPages = pages
    .filter(p => classifyPageType(p.url) !== 'ignore')
    .slice(0, 50);

  const pageList = relevantPages
    .map(p => `${p.title || p.slug} | ${p.url}`)
    .join('\n');

  const candidateList = heuristicCandidates
    .map(c => `${c.name} (confidence: ${Math.round(c.confidence * 100)}%)`)
    .join(', ');

  const prompt = PROFILE_BUSINESS_PROMPT(pageList, candidateList, businessInfo);

  try {
    const result = await dispatchToProvider(businessInfo, {
      gemini: () => geminiService.generateJson(prompt, businessInfo, dispatch, { services: [], industry: '', audience: '', websiteType: '' }),
      openai: () => openAiService.generateJson(prompt, businessInfo, dispatch, { services: [], industry: '', audience: '', websiteType: '' }),
      anthropic: () => anthropicService.generateJson(prompt, businessInfo, dispatch, { services: [], industry: '', audience: '', websiteType: '' }),
      perplexity: () => perplexityService.generateJson(prompt, businessInfo, dispatch, { services: [], industry: '', audience: '', websiteType: '' }),
      openrouter: () => openRouterService.generateJson(prompt, businessInfo, dispatch, { services: [], industry: '', audience: '', websiteType: '' }),
    });

    return {
      services: Array.isArray(result.services) ? result.services.filter((s: any) => typeof s === 'string') : [],
      industry: typeof result.industry === 'string' ? result.industry : undefined,
      audience: typeof result.audience === 'string' ? result.audience : undefined,
      websiteType: typeof result.websiteType === 'string' ? result.websiteType : undefined,
    };
  } catch (err) {
    console.warn('[businessProfiler] AI refinement failed, using heuristic results only:', err);
    return { services: heuristicCandidates.map(c => c.name) };
  }
}

// ── Main Entry Point ──

export async function profileBusinessFromCrawlData(
  crawledUrls: string[],
  existingBusinessInfo?: BusinessInfo,
  dispatch?: React.Dispatch<any>,
): Promise<BusinessProfile> {
  // Build page info from URLs
  const pages: PageInfo[] = crawledUrls.map(url => ({
    url,
    slug: extractSlug(url),
  }));

  // Step 1: Heuristic detection (no AI, instant)
  const heuristicResults = heuristicDetect(pages);

  // Step 2: AI refinement (if dispatch available for provider access)
  let aiResults: { services: string[]; industry?: string; audience?: string; websiteType?: string } | null = null;
  if (dispatch && existingBusinessInfo) {
    aiResults = await aiRefine(heuristicResults, pages, existingBusinessInfo, dispatch);
  }

  // Step 3: Merge heuristic + AI results
  const finalServices: DetectedService[] = [];
  const seenNames = new Set<string>();

  // AI-confirmed services get highest confidence
  if (aiResults?.services) {
    for (const serviceName of aiResults.services) {
      const heuristic = heuristicResults.find(
        h => h.name.toLowerCase() === serviceName.toLowerCase()
      );
      seenNames.add(serviceName.toLowerCase());

      finalServices.push({
        name: serviceName,
        confidence: heuristic ? Math.max(heuristic.confidence, 0.8) : 0.7,
        evidence: heuristic?.evidence || [],
        pageType: heuristic?.pageType || 'service',
      });
    }
  }

  // Add remaining heuristic results not confirmed by AI
  for (const h of heuristicResults) {
    if (!seenNames.has(h.name.toLowerCase())) {
      finalServices.push(h);
    }
  }

  // Step 4: Match to existing URLs
  const serviceNames = finalServices.map(s => s.name);
  const matched = matchServicesToExistingUrls(serviceNames, crawledUrls);

  for (const match of matched) {
    const service = finalServices.find(s => s.name === match.name);
    if (service && match.existingUrl) {
      service.matchedUrl = match.existingUrl;
      service.matchedTitle = match.existingTitle;
    }
  }

  return {
    detectedServices: finalServices,
    detectedIndustry: aiResults?.industry,
    detectedAudience: aiResults?.audience,
    websiteType: aiResults?.websiteType as BusinessProfile['websiteType'],
  };
}
