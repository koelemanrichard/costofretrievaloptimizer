
import { BaseStrategy } from './BaseStrategy';
import { SEOPillars, EnrichedTopic, ContentBrief, ResponseCode, KnowledgeGraph, SemanticTriple } from '../../../types';

export class ServiceStrategy extends BaseStrategy {

    getInitialMapPrompt(pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[]): string {
        const basePrompt = super.getInitialMapPrompt(pillars, eavs, competitors);
        return `${basePrompt}

        **STRATEGY OVERRIDE: SERVICE BUSINESS (LOCAL/PROFESSIONAL)**
        - **Authority:** Topics must demonstrate **Expertise, Authority, and Trust (E-A-T)**.
        - **Structure:** Separate 'Service Pages' (Transactional) from 'Educational Guides' (Informational).
        - **Spokes:** Must include 'Process', 'Costs', 'Case Studies', and 'Common Problems'.
        `;
    }

    getBriefPrompt(topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, responseCode: ResponseCode): string {
        const basePrompt = super.getBriefPrompt(topic, allTopics, pillars, kg, responseCode);

        // Check if this is a monetization topic requiring 4 Pillars analysis
        const isMonetizationTopic = topic.topic_class === 'monetization' ||
            topic.metadata?.topic_class === 'monetization';

        const fourPillarsOverride = isMonetizationTopic ? `
        **MONEY PAGE 4 PILLARS REQUIREMENTS (Koray Tugberk GÜBÜR's Framework)**
        This is a MONETIZATION page - apply the 4 Pillars framework:

        1. **VERBALIZATION (Sales Psychology)**
           - Include benefit-focused headlines (not feature-focused)
           - Use power words in CTAs: "Get", "Unlock", "Transform", "Discover"
           - Add social proof language: "trusted by", "proven", "guaranteed"
           - Create urgency where appropriate: "limited", "today", "now"

        2. **CONTEXTUALIZATION (Macro to Micro Bridge)**
           - Start with industry/market context before introducing solution
           - Agitate the problem before presenting solution
           - Differentiate from competitors explicitly
           - Bridge from general need to specific offering

        3. **MONETIZATION (Value Exchange)**
           - Clear pricing or value proposition above the fold
           - Multiple CTA opportunities (not just one at bottom)
           - Risk reversal elements: guarantees, testimonials, certifications
           - Clear next-step pathways

        4. **VISUALIZATION (Visual Proof)**
           - Hero image with strong entity relevance
           - Trust badges and certifications
           - Before/after or process visuals
           - Testimonial photos or video placeholders
           - Visual data (charts, infographics) where applicable
        ` : '';

        return `${basePrompt}

        **STRATEGY OVERRIDE: SERVICE TRUST**
        - **Proof Elements:** Mandate a 'Proof' section (Case Studies, Testimonials, Certifications) in every Core Topic brief.
        - **Linking:** Enforce 'River Flow': Informational articles MUST link to Service Pages using exact service predicates (e.g., 'Hire X', 'Contact Y').
        ${fourPillarsOverride}
        `;
    }

    getEavPrompt(pillars: SEOPillars): string {
        const basePrompt = super.getEavPrompt(pillars);
        return `${basePrompt}

        **STRATEGY OVERRIDE: SERVICE ATTRIBUTES**
        - **Focus:** Credibility and Process.
        - **Required Classifications:**
            - **CORE_DEFINITION:** Service Type, Deliverables.
            - **SEARCH_DEMAND:** Cost/Rates, Turnaround Time, Service Area.
            - **COMPETITIVE_EXPANSION:** Unique Methodology, Certifications, Awards.
        `;
    }
}
