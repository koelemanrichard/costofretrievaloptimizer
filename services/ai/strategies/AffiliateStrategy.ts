
import { BaseStrategy } from './BaseStrategy';
import { SEOPillars, SemanticTriple, EnrichedTopic, ContentBrief, ResponseCode, KnowledgeGraph, ExpansionMode } from '../../../types';

/**
 * Strategy for Affiliate/Review websites
 * Focus: Product reviews, comparisons, buying guides with trust signals
 * Structure: Commerce-like with emphasis on E-E-A-T and transparent recommendations
 */
export class AffiliateStrategy extends BaseStrategy {

    getInitialMapPrompt(pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[]): string {
        const basePrompt = super.getInitialMapPrompt(pillars, eavs, competitors);
        return `${basePrompt}

**STRATEGY OVERRIDE: AFFILIATE/REVIEW MODEL**
- **Review Types:** Include Single Product Reviews, Multi-Product Comparisons, Category Roundups, and Buying Guides.
- **Hierarchy:** 'Category -> Product Type -> Individual Products' with 'Best Of' hub pages linking to detailed reviews.
- **Trust Signals:** Every review page needs 'Methodology', 'Testing Process', 'Author Expertise', and 'Update History' sections.
- **Spoke Logic:** For Core Topics, include 'vs Competitor', 'Alternatives', 'Buyer's Guide', 'FAQ', and 'Common Problems'.
- **Monetization:** Structure around commercial intent queries with clear 'Best for X' and 'Under $Y' variants.
        `;
    }

    getBriefPrompt(topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, responseCode: ResponseCode): string {
        const basePrompt = super.getBriefPrompt(topic, allTopics, pillars, kg, responseCode);
        return `${basePrompt}

**STRATEGY OVERRIDE: AFFILIATE/REVIEW (TRUST MODEL)**
- **Opening:** Start with clear verdict/recommendation to earn Featured Snippet.
- **E-E-A-T:** Include 'How We Test', 'Our Selection Criteria', and author qualification signals.
- **Structure:** Verdict → Comparison Table → Individual Reviews → Methodology → FAQ.
- **Visuals:** Request 'Product Comparison Table', 'Pros/Cons List', 'Rating Breakdown', 'Feature Matrix'.
- **Linking:** Link from 'Best X for Y' pages to individual product reviews. Cross-link alternatives.
- **Transparency:** Include affiliate disclosure, last updated date, and testing methodology.
        `;
    }

    getEavPrompt(pillars: SEOPillars): string {
        const basePrompt = super.getEavPrompt(pillars);
        return `${basePrompt}

**STRATEGY OVERRIDE: AFFILIATE/REVIEW ATTRIBUTES**
- **Dominant Attribute:** 'Rating' / 'Score' is the central pivot for comparison.
- **Required Classifications:**
    - **CORE_DEFINITION:** Product Category, Brand, Model, Target User.
    - **SEARCH_DEMAND:** Price Range, Rating, Popularity, Best For Use Case.
    - **UNIQUE:** Pros, Cons, Verdict, Testing Results.
    - **COMPOSITE:** Feature Comparison (across products), Value Score (Price/Performance).
- **Review-Specific:** Testing Duration, Sample Size, Comparison Criteria, Update Frequency.
        `;
    }

    getDraftPrompt(brief: ContentBrief): string {
        const basePrompt = super.getDraftPrompt(brief);
        return `${basePrompt}

**STRATEGY OVERRIDE: AFFILIATE CONTENT STYLE**
- **Voice:** Authoritative but accessible. Expert reviewer sharing genuine insights.
- **Structure:** Lead with verdict, follow with evidence.
- **Trust Elements:** Include specific test results, real usage scenarios, and honest limitations.
- **Conversion:** Clear CTA boxes with 'Check Price' or 'View on [Retailer]' after each review section.
- **Updates:** Structure content to be easily updatable when prices/features change.
        `;
    }
}
