/**
 * Monetization Prompt Utilities
 *
 * Pure utility functions for monetization topic detection and prompt enhancement.
 * These are separate from the briefOptimization service to avoid circular dependencies
 * when used in config files.
 */

import { getKeywordsForLanguage, KeywordCategory } from '../config/moneyPageKeywords';

/**
 * Check if a topic should receive monetization enhancement
 */
export function shouldApplyMonetizationEnhancement(topicClass?: string): boolean {
  return topicClass === 'monetization';
}

/**
 * Get monetization prompt enhancement for initial brief generation
 * This should be injected into GENERATE_CONTENT_BRIEF_PROMPT for monetization topics
 */
export function getMonetizationPromptEnhancement(language: string): string {
  const benefitWords = getKeywordsForLanguage('benefit', language).slice(0, 8);
  const powerWords = getKeywordsForLanguage('power', language).slice(0, 8);
  const ctaWords = getKeywordsForLanguage('cta', language).slice(0, 6);
  const socialProofWords = getKeywordsForLanguage('socialProof', language).slice(0, 6);
  const pricingWords = getKeywordsForLanguage('pricing', language).slice(0, 6);
  const riskReversalWords = getKeywordsForLanguage('riskReversal', language).slice(0, 5);
  const roiWords = getKeywordsForLanguage('roi', language).slice(0, 5);
  const urgencyWords = getKeywordsForLanguage('urgency', language).slice(0, 5);

  return `
---

## **MONEY PAGE PRE-OPTIMIZATION (4 PILLARS)**

This is a **MONETIZATION** topic. The content brief MUST be pre-optimized for commercial conversion.
Follow these requirements EXACTLY - the brief will be scored against these keywords:

### 1. VERBALIZATION (25% of score)
**Title** MUST include at least ONE of these ${language} benefit words:
\`${benefitWords.join(', ')}\`

**Meta Description** MUST include at least TWO of these ${language} power words:
\`${powerWords.join(', ')}\`

**Outline** MUST mention social proof AND risk reversal:
- Social proof: \`${socialProofWords.join(', ')}\`
- Risk reversal: \`${riskReversalWords.join(', ')}\`
- Urgency: \`${urgencyWords.join(', ')}\`

### 2. MONETIZATION (30% of score - MOST IMPORTANT)
**CTA field** is REQUIRED. It MUST start with one of:
\`${ctaWords.join(', ')}\`

**Outline** MUST include pricing and ROI language:
- Pricing: \`${pricingWords.join(', ')}\`
- ROI: \`${roiWords.join(', ')}\`

### 3. CONTEXTUALIZATION (25% of score)
**Meta Description** MUST contain unique value proposition keywords:
\`unique, uniek, exclusief, exclusive, first, eerste, proprietary, innovative\`

**Outline** MUST establish industry context and target audience.

### 4. VISUALIZATION (20% of score)
**visuals.featuredImagePrompt** is REQUIRED (minimum 20 words):
Describe a professional hero image that reinforces the central entity.

**visuals.imageAltText** is REQUIRED:
SEO-optimized alt text including the central entity.

### Critical Output Requirements:
1. \`cta\` field MUST be present and non-empty
2. \`visuals.featuredImagePrompt\` MUST be 20+ words
3. \`visuals.imageAltText\` MUST be present
4. Title MUST contain a benefit word from the list above
5. At least ONE structured_outline section should mention pricing

**Write ALL content in ${language.toUpperCase()}. Use the EXACT keywords listed above.**

---`;
}
