/**
 * Business Profiler Prompt
 *
 * Short, focused prompt for identifying business services/products
 * from crawl data. Used by the business profiler service.
 *
 * @module config/prompts/businessProfiler
 */

import type { BusinessInfo } from '../../types';
import { getLanguageAndRegionInstruction, jsonResponseInstruction } from './_common';

export const PROFILE_BUSINESS_PROMPT = (
  pageList: string,
  heuristicCandidates: string,
  businessInfo: BusinessInfo
): string => {
  const languageInstruction = getLanguageAndRegionInstruction(
    businessInfo.language,
    businessInfo.region
  );

  return `${languageInstruction}

You are analyzing a website's page structure to identify its core business services or products.

**Heuristic candidates detected from URL patterns:**
${heuristicCandidates || 'None detected'}

**Website pages (title | URL):**
${pageList}

**Task:** Identify the core services/products this business offers. Return ONLY the confirmed services — remove any that are blog posts, info pages, or non-service content.

${jsonResponseInstruction}
Return a JSON object:
{
  "services": ["Service Name 1", "Service Name 2"],
  "industry": "detected industry",
  "audience": "target audience description",
  "websiteType": "ecommerce | saas | b2b_services | blog | local_business"
}

Keep service names concise (2-4 words). Maximum 15 services.`;
};
