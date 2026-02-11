// config/prompts/navigation.ts
// Prompts for migration, foundation pages, navigation structure, linking audit, and business research

import { BusinessInfo, SEOPillars, EnrichedTopic, FoundationPage } from '../../types';
import {
    businessContext,
    jsonResponseInstruction,
} from './_common';

// ============================================
// MIGRATION WORKBENCH PROMPTS
// ============================================

export const SEMANTIC_CHUNKING_PROMPT = (markdown: string, businessInfo: BusinessInfo): string => `
You are an expert content analyst specializing in semantic segmentation.
Your task is to analyze the following markdown content and break it into semantically coherent chunks.

${businessContext(businessInfo)}

**Content to Analyze:**
"""
${markdown}
"""

**Chunking Rules:**
1. Each chunk should represent a single, coherent topic or concept
2. Chunks should be 100-500 words each (approximate)
3. Preserve heading hierarchy context
4. Identify the semantic focus of each chunk
5. Tag each chunk with relevant entity types

${jsonResponseInstruction}
Return a JSON array of chunk objects:
[
  {
    "id": "chunk_1",
    "content": "The chunk text...",
    "heading_context": "H2: Parent Heading > H3: Current Heading",
    "semantic_focus": "Brief description of what this chunk covers",
    "entity_tags": ["Entity1", "Entity2"],
    "word_count": 250,
    "position": 1
  }
]
`;

export const GENERATE_MIGRATION_DECISION_PROMPT = (
  inventoryItem: { url: string; title: string; content_summary?: string; metrics?: any },
  topicalMap: { pillars: any; topics: any[] },
  businessInfo: BusinessInfo
): string => `
You are an expert SEO strategist specializing in content migration and optimization.
Analyze this existing page and recommend a migration action.

${businessContext(businessInfo)}

**Page to Analyze:**
- URL: ${inventoryItem.url}
- Title: ${inventoryItem.title}
${inventoryItem.content_summary ? `- Content Summary: ${inventoryItem.content_summary}` : ''}
${inventoryItem.metrics ? `- Performance Metrics: ${JSON.stringify(inventoryItem.metrics)}` : ''}

**Strategic Context (Topical Map):**
- Central Entity: ${topicalMap.pillars?.centralEntity || 'Not defined'}
- Source Context: ${topicalMap.pillars?.sourceContext || 'Not defined'}
- Existing Topics: ${topicalMap.topics?.slice(0, 20).map((t: any) => t.title).join(', ') || 'None'}

**Decision Framework:**
Evaluate the page against these criteria:
1. **Relevance**: Does it align with the Central Entity and Source Context?
2. **Quality**: Is the content comprehensive and authoritative?
3. **Performance**: Are there traffic/ranking signals worth preserving?
4. **Redundancy**: Does it overlap with planned topical map content?

**Available Actions:**
- KEEP: Page is valuable, keep as-is with minor updates
- REWRITE: Content is relevant but needs significant improvement
- MERGE: Content should be consolidated with another page
- REDIRECT_301: Page should redirect to a more relevant destination
- PRUNE_410: Page should be removed (low value, no redirect target)
- CANONICALIZE: Page is duplicate, should point to canonical version

${jsonResponseInstruction}
Return a JSON object:
{
  "action": "KEEP" | "REWRITE" | "MERGE" | "REDIRECT_301" | "PRUNE_410" | "CANONICALIZE",
  "confidence": 85,
  "reasoning": "Detailed explanation of why this action is recommended...",
  "target_url": "If REDIRECT_301 or MERGE, the target URL or topic title",
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "estimated_effort": "Brief effort estimate (e.g., '2-3 hours', 'Full rewrite needed')",
  "key_content_to_preserve": ["List of valuable content elements to keep if rewriting/merging"]
}
`;

// ============================================
// FOUNDATION PAGES & NAVIGATION PROMPTS
// ============================================

export const GENERATE_FOUNDATION_PAGES_PROMPT = (info: BusinessInfo, pillars: SEOPillars): string => `
You are an expert Holistic SEO Architect specializing in website structure and E-A-T optimization.
Your task is to generate Foundation Pages for a website based on the business context and SEO pillars.

${businessContext(info)}

**SEO Pillars:**
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}

**Foundation Pages to Generate:**
Generate specifications for 5 essential foundation pages that establish authority and trust.

**CRITICAL E-A-T RULES:**
1. **Homepage** = Entity Home - The H1 MUST include the Central Entity + Source Context
2. **About Page** = E-A-T Corroboration - Must demonstrate expertise, credentials, team
3. **Contact Page** = NAP Consistency - Must include full Name, Address, Phone, Email
4. **Privacy Policy** = Legal Trust Signal - Standard but professional
5. **Terms of Service** = Legal Trust Signal - Standard but professional

**Homepage Specific Rules (from Holistic SEO):**
- H1 Template: Include Central Entity + Source Context (e.g., "[Central Entity]: [Source Context]")
- First 400 characters = "Centerpiece Text" - Must contain core value prop + CTA
- Target the canonical query for the main business offering
- Schema: Organization

**About Page Rules:**
- H1: "About [Company Name]" or "Over [Company Name]"
- Sections: Company Story, Mission/Values, Team/Expertise, Credentials/Awards
- Schema: AboutPage
- E-A-T Focus: Demonstrate WHY users should trust this entity

**Contact Page Rules:**
- H1: "Contact [Company Name]"
- Sections: Contact Form, NAP Data, Business Hours, Map/Location
- Schema: ContactPage
- NAP Consistency: Use EXACT same NAP across all pages

**For each page, generate:**
1. page_type: The type identifier
2. title: SEO-optimized title (include Central Entity where appropriate)
3. slug: URL slug (e.g., "/about", "/contact")
4. meta_description: 150-160 chars, include Central Entity + Source Context
5. h1_template: H1 heading template
6. schema_type: Appropriate Schema.org type
7. sections: Array of content sections with {heading, purpose, required}

**NAP Data Suggestions:**
Based on the business context, suggest appropriate NAP (Name, Address, Phone) structure.
If specific data isn't available, provide placeholder guidance.

${jsonResponseInstruction}
Return a JSON object:
{
  "foundationPages": [
    {
      "page_type": "homepage",
      "title": "...",
      "slug": "/",
      "meta_description": "...",
      "h1_template": "...",
      "schema_type": "Organization",
      "sections": [
        { "heading": "...", "purpose": "...", "required": true }
      ]
    }
  ],
  "napDataSuggestions": {
    "company_name": "Suggested company name based on domain/context",
    "address_hint": "Placeholder or guidance for address",
    "phone_hint": "Format suggestion (e.g., +31 XX XXX XXXX for Netherlands)",
    "email_hint": "Suggested email format (e.g., info@domain.com)"
  },
  "navigationSuggestions": {
    "headerLinks": ["Homepage", "About", "Services", "Contact"],
    "footerSections": [
      { "heading": "Company", "links": ["About Us", "Contact", "Careers"] },
      { "heading": "Legal", "links": ["Privacy Policy", "Terms of Service"] }
    ],
    "ctaButton": { "text": "Get Started", "target": "contact" }
  }
}
`;

export const GENERATE_DEFAULT_NAVIGATION_PROMPT = (
  foundationPages: { page_type: string; title: string; slug: string }[],
  coreTopics: { id: string; title: string; slug?: string; cluster_role?: string; topic_class?: string }[],
  info: BusinessInfo
): string => {
  // Identify pillars and monetization topics for prioritization
  const pillarTopics = coreTopics.filter(t => t.cluster_role === 'pillar');
  const monetizationTopics = coreTopics.filter(t => t.topic_class === 'monetization');
  const informationalTopics = coreTopics.filter(t => t.topic_class === 'informational');

  return `
You are an expert Information Architect specializing in website navigation.
Generate an optimal navigation structure based on the foundation pages and core topics.

${businessContext(info)}

**Available Foundation Pages:**
${JSON.stringify(foundationPages, null, 2)}

**PILLAR TOPICS (High Authority Hub Pages - MUST prioritize in header):**
${pillarTopics.length > 0
  ? pillarTopics.map(t => `- ${t.title} (${t.slug || 'no-slug'})`).join('\n')
  : '(No pillar topics identified - use monetization topics as priority)'}

**MONETIZATION TOPICS (Money Pages - High priority for PageRank):**
${monetizationTopics.slice(0, 8).map(t => `- ${t.title} (${t.slug || 'no-slug'})`).join('\n')}

**INFORMATIONAL TOPICS (Author Section - Medium priority):**
${informationalTopics.slice(0, 8).map(t => `- ${t.title} (${t.slug || 'no-slug'})`).join('\n')}

**NAVIGATION RULES (Holistic SEO):**
1. **Header Max Links: 10** - Only most important pages
2. **Footer Max Links: 30** - Organized into sections
3. **Total Page Links: Max 150** - Never exceed this
4. **Homepage MUST be in header** - Always first position
5. **PILLAR topics MUST be in header** - These are authority hubs
6. **Monetization topics HIGH priority** - These are money pages
7. **Legal pages in footer ONLY** - Privacy, Terms never in header
8. **Pure HTML links** - No JavaScript-dependent navigation
9. **Descriptive anchor text** - Never "Click here" or "Read more"
10. **N-gram injection** - Include Central Entity in header link text where natural

**PageRank Flow Strategy:**
- Direct PageRank to PILLAR pages first (hub pages)
- PILLAR pages distribute to their cluster content
- Monetization topics receive high placement for conversion
- Informational topics support but don't dominate header

**Header Structure:**
- Position 1: Homepage (Logo link)
- Positions 2-4: PILLAR topics (if available) or top monetization topics
- Positions 5-7: Key monetization/service pages
- Position 8-9: Key informational pages (if space)
- CTA Button: Contact or main conversion action

**Footer Structure:**
- Section 1: Main Services/Products (include PILLAR and monetization pages)
- Section 2: Resources/Information (informational topics)
- Section 3: Company (About, Contact, Careers)
- Section 4: Legal (Privacy, Terms)
- NAP Display: Company info at bottom

${jsonResponseInstruction}
Return a JSON object:
{
  "header": {
    "logo_alt_text": "Alt text for logo including Central Entity",
    "primary_nav": [
      {
        "text": "Link text",
        "target_foundation_page_id": "homepage|about|contact|null",
        "target_topic_id": "core-topic-id|null",
        "prominence": "high|medium",
        "order": 1
      }
    ],
    "cta_button": {
      "text": "CTA text",
      "target_foundation_page_id": "contact|null",
      "target_topic_id": "topic-id|null"
    }
  },
  "footer": {
    "sections": [
      {
        "heading": "Section Heading",
        "links": [
          {
            "text": "Link text",
            "target_foundation_page_id": "page-type|null",
            "target_topic_id": "topic-id|null",
            "prominence": "medium|low"
          }
        ]
      }
    ],
    "legal_links": [
      { "text": "Privacy Policy", "target_foundation_page_id": "privacy" },
      { "text": "Terms of Service", "target_foundation_page_id": "terms" }
    ],
    "nap_display": true,
    "copyright_text": "© ${new Date().getFullYear()} [Company Name]. All rights reserved."
  }
}
`;
};

export const VALIDATE_FOUNDATION_PAGES_PROMPT = (
  foundationPages: { page_type: string; title: string; h1_template?: string; meta_description?: string; sections?: any[]; nap_data?: any }[],
  navigation: { header?: any; footer?: any } | null,
  pillars: SEOPillars,
  info: BusinessInfo
): string => `
You are a Holistic SEO Auditor. Validate the foundation pages and navigation structure.

${businessContext(info)}

**SEO Pillars:**
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}

**Foundation Pages to Validate:**
${JSON.stringify(foundationPages, null, 2)}

**Navigation Structure:**
${navigation ? JSON.stringify(navigation, null, 2) : 'No navigation configured'}

**VALIDATION RULES:**

**1. Homepage Validation (CRITICAL):**
- H1 MUST include Central Entity
- Meta description MUST include Central Entity + Source Context
- Must have Organization schema

**2. About Page Validation (CRITICAL for E-A-T):**
- MUST exist for E-A-T compliance
- Should have sections for: Company Story, Team/Expertise, Credentials
- Schema should be AboutPage

**3. Contact Page Validation (CRITICAL):**
- MUST exist with NAP data
- NAP data MUST be consistent (same format everywhere)
- Schema should be ContactPage

**4. Legal Pages Validation (WARNING):**
- Privacy Policy recommended
- Terms of Service recommended

**5. Navigation Validation:**
- Header: Max 10 links
- Footer: Max 30 links per section
- Homepage MUST be in header
- Legal pages MUST be in footer
- No duplicate links
- No generic anchor text ("Click here", "Read more")

**6. Missing Pages Check:**
- Flag any standard foundation pages that don't exist
- Rate severity based on E-A-T impact

${jsonResponseInstruction}
Return a JSON object:
{
  "overallScore": 0-100,
  "summary": "Brief assessment",
  "foundationPageIssues": [
    {
      "page_type": "homepage|about|contact|etc",
      "issues": [
        {
          "rule": "Rule name",
          "message": "Issue description",
          "severity": "CRITICAL|WARNING|SUGGESTION",
          "fix": "How to fix"
        }
      ]
    }
  ],
  "navigationIssues": [
    {
      "location": "header|footer",
      "rule": "Rule name",
      "message": "Issue description",
      "severity": "CRITICAL|WARNING|SUGGESTION",
      "fix": "How to fix"
    }
  ],
  "missingPages": [
    {
      "page_type": "about|contact|etc",
      "reason": "Why this page is needed",
      "severity": "CRITICAL|WARNING",
      "impact": "E-A-T impact description"
    }
  ],
  "napConsistency": {
    "isConsistent": true|false,
    "issues": ["List of inconsistency issues if any"]
  }
}
`;

// ============================================
// INTERNAL LINKING AUDIT PROMPTS (Phase 5)
// ============================================

export const GENERATE_ALTERNATIVE_ANCHORS_PROMPT = (
  originalAnchor: string,
  targetTopicTitle: string,
  targetTopicDescription: string,
  info: BusinessInfo
): string => `
You are an SEO expert specializing in internal linking optimization.

${businessContext(info)}

**Task:** Generate 5 alternative anchor text variations for the following link to avoid repetition.

**Original Anchor Text:** "${originalAnchor}"
**Target Topic:** ${targetTopicTitle}
**Target Topic Description:** ${targetTopicDescription}

**Rules for Good Anchor Text:**
1. Must be descriptive and indicate what the target page is about
2. Avoid generic text like "click here", "read more", "learn more"
3. Include relevant keywords but don't over-optimize
4. Keep anchors natural and readable
5. Vary sentence structure (some can be noun phrases, others action-oriented)
6. Each variation should be distinctly different

${jsonResponseInstruction}
Return a JSON object:
{
  "originalAnchor": "${originalAnchor}",
  "alternatives": [
    {
      "anchor": "Alternative anchor text 1",
      "reasoning": "Why this variation works"
    },
    {
      "anchor": "Alternative anchor text 2",
      "reasoning": "Why this variation works"
    }
  ],
  "recommendedForUsage": "The best alternative anchor text"
}
`;

export const GENERATE_CONTEXTUAL_BRIDGE_PROMPT = (
  sourceTopicTitle: string,
  sourceTopicDescription: string,
  targetTopicTitle: string,
  targetTopicDescription: string,
  info: BusinessInfo
): string => `
You are an expert content strategist specializing in contextual linking.

${businessContext(info)}

**Task:** Create a contextual bridge paragraph that naturally connects two topics.
This bridge will appear at the end of the source article to create a logical transition.

**Source Topic:**
- Title: ${sourceTopicTitle}
- Description: ${sourceTopicDescription}

**Target Topic (to link to):**
- Title: ${targetTopicTitle}
- Description: ${targetTopicDescription}

**Requirements for the Bridge:**
1. The paragraph should be 2-4 sentences
2. Start by connecting the current topic to a related concept
3. Naturally introduce why the target topic is relevant
4. Include a natural anchor text placement (mark with [ANCHOR]text[/ANCHOR])
5. The transition should feel organic, not forced
6. Use H4 or H5 heading to introduce the bridge section

**Example structure:**
"While we've covered [source topic aspect], understanding [related concept] becomes crucial when [connection to target]. [ANCHOR]Target Topic[/ANCHOR] explores this in depth, covering [key aspect of target]."

${jsonResponseInstruction}
Return a JSON object:
{
  "heading": "Related: Heading text",
  "paragraph": "The bridge paragraph with [ANCHOR]anchor text[/ANCHOR] markup",
  "anchorText": "The exact anchor text to use",
  "annotationTextHint": "Surrounding context that reinforces the link relevance"
}
`;

export const FIND_LINK_SOURCE_PROMPT = (
  orphanedTopicTitle: string,
  orphanedTopicDescription: string,
  candidateTopics: { title: string; description: string; type: 'core' | 'outer' }[],
  info: BusinessInfo
): string => `
You are an SEO strategist specializing in internal link architecture.

${businessContext(info)}

**Task:** Identify the best topic(s) to link FROM to the orphaned topic below.

**Orphaned Topic (needs incoming links):**
- Title: ${orphanedTopicTitle}
- Description: ${orphanedTopicDescription}

**Candidate Source Topics:**
${candidateTopics.map((t, i) => `${i + 1}. [${t.type.toUpperCase()}] ${t.title}: ${t.description}`).join('\n')}

**Selection Criteria:**
1. Semantic relevance: Source topic should share related concepts
2. Link flow direction: Prefer informational to monetization flow (outer to core)
3. Reader journey: The link should make sense in context
4. Avoid redundancy: Don't suggest sources already linking to this topic
5. PageRank consideration: Core topics have more authority to share

${jsonResponseInstruction}
Return a JSON object:
{
  "bestSource": {
    "topicTitle": "Title of best source topic",
    "reasoning": "Why this is the best choice",
    "suggestedAnchor": "Recommended anchor text",
    "linkContext": "Brief description of where in the article to place the link"
  },
  "alternativeSources": [
    {
      "topicTitle": "Title of alternative source",
      "reasoning": "Why this could also work"
    }
  ]
}
`;

export const VALIDATE_EXTERNAL_LINKS_PROMPT = (
  externalLinks: { url: string; domain: string; anchorText: string; sourceTopic: string }[],
  info: BusinessInfo
): string => `
You are an E-A-T (Expertise, Authority, Trust) specialist.

${businessContext(info)}

**Task:** Evaluate external links for E-A-T compliance and authority signals.

**External Links to Evaluate:**
${externalLinks.map((l, i) => `${i + 1}. URL: ${l.url}\n   Domain: ${l.domain}\n   Anchor: "${l.anchorText}"\n   Source: ${l.sourceTopic}`).join('\n\n')}

**Evaluation Criteria:**
1. **Authority**: Is the domain a recognized authority in its field?
2. **Relevance**: Does the external content support the claims in your content?
3. **E-A-T Signal**: Does linking to this source strengthen your E-A-T?
4. **Competitor Check**: Is this a competitor domain?
5. **Integration**: Is the link naturally integrated in the text?

**Domain Categories to Identify:**
- .gov, .edu: High authority
- Industry associations: High authority
- Research institutions: High authority
- News/media: Medium authority
- Personal blogs: Low authority (unless expert)
- Competitor sites: Flag as issue

${jsonResponseInstruction}
Return a JSON object:
{
  "evaluations": [
    {
      "url": "External URL",
      "domain": "Domain name",
      "category": "government|academic|industry|research|news|blog|competitor|other",
      "authorityScore": 0-100,
      "eatValue": "HIGH|MEDIUM|LOW|NEGATIVE",
      "isCompetitor": false,
      "recommendation": "KEEP|REPLACE|REMOVE",
      "reasoning": "Why this recommendation"
    }
  ],
  "summary": "Overall assessment of external linking E-A-T value",
  "missingAuthoritySources": ["List of topic areas that could benefit from authoritative external sources"]
}
`;

// ============================================
// SMART WIZARD - Business Research
// ============================================

export const RESEARCH_BUSINESS_PROMPT = (
  input: string,
  inputType: 'url' | 'name' | 'description' | 'mixed',
  scrapedContent?: { title: string; description: string; content: string },
  userDescription?: string
): string => `
You are a business analyst expert. Analyze the provided information and extract structured business data to help auto-fill a content strategy form.

## Input Information
- **Input Type**: ${inputType}
- **User Input**: ${input}

${userDescription ? `
## User-Provided Description
${userDescription}
` : ''}

${scrapedContent ? `
## Scraped Website Content
- **Title**: ${scrapedContent.title}
- **Meta Description**: ${scrapedContent.description}
- **Page Content** (excerpt):
${scrapedContent.content}
` : ''}

## Your Task
Based on the above information, extract the following business details. If you cannot determine a value with reasonable confidence, leave it as an empty string.

**IMPORTANT**:
- Be specific and accurate. Do not make up information.
- For language and targetMarket, infer from the content language and business location/focus.
- For seedKeyword, identify the main topic or product/service the business focuses on.
- For valueProp, extract what makes this business unique or what value they provide.
- For audience, identify who the business is targeting.
${inputType === 'name' || inputType === 'description' || inputType === 'mixed' ? '- Use your knowledge about the business/industry to supplement any gaps.' : ''}

${jsonResponseInstruction}

Return a JSON object with these fields:
{
  "seedKeyword": "Main topic or primary keyword (e.g., 'contract management software', 'organic skincare')",
  "industry": "Business industry/vertical (e.g., 'SaaS', 'E-commerce', 'Healthcare')",
  "valueProp": "Unique value proposition - what makes this business special (2-3 sentences)",
  "audience": "Target audience description (e.g., 'Small business owners', 'Enterprise legal teams')",
  "language": "Language code (e.g., 'en', 'nl', 'de', 'es')",
  "targetMarket": "Target country/region (e.g., 'United States', 'Netherlands', 'European Union')",
  "authorName": "If identifiable, the main author/expert name, otherwise empty",
  "authorBio": "If identifiable, a brief bio of the expert, otherwise empty",
  "authorCredentials": "If identifiable, credentials/qualifications, otherwise empty"
}
`;
