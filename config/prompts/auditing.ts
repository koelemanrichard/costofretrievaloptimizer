// config/prompts/auditing.ts
// Prompts for content integrity auditing, schema generation, and GSC analysis

import { BusinessInfo, ContentBrief, GscRow } from '../../types';
import { KnowledgeGraph } from '../../lib/knowledgeGraph';
import {
    businessContext,
    jsonResponseInstruction,
} from './_common';

export const AUDIT_CONTENT_INTEGRITY_PROMPT = (brief: ContentBrief, draft: string, info: BusinessInfo): string => `
You are a strict SEO content auditor. Audit the provided article draft against its content brief and framework rules.

Content Brief: ${JSON.stringify(brief, null, 2)}
Article Draft (Markdown):
---
${draft.substring(0, 5000)}... (truncated)
---

${businessContext(info)}

Audit Criteria:
1.  **eavCheck**: Are the semantic vectors (EAVs) included?
2.  **linkCheck**: Are the internal linking suggestions implemented?
3.  **linguisticModality**: Score 0-100 on authoritativeness.
4.  **frameworkRules**: Check for compliance:
    - "Do Not Delay the Answer": Does it answer quickly?
    - "PoST Consistency in Lists": Are list items parallel?
    - "Bold the Answer, Not the Keyword".
    - "Mandatory N-Grams": Does the text contain specific keywords/phrases from the Value Proposition ("${info.valueProp}") in the Introduction and Conclusion?

${jsonResponseInstruction}
Provide a JSON object with: "overallSummary", "eavCheck", "linkCheck", "linguisticModality", "frameworkRules".
`;

export const GENERATE_SCHEMA_PROMPT = (brief: ContentBrief, info?: BusinessInfo): string => `
You are an expert in Schema.org and JSON-LD. Generate the schema for this article.

- Primary type: Article/BlogPosting.
- Include standard properties.
- **Authorship Signals:** Use a Person schema for the author (if known) and Organization schema for the publisher to boost E-E-A-T.

Content Brief:
${JSON.stringify(brief, null, 2)}

${info ? businessContext(info) : ''}

${jsonResponseInstruction}
Respond with "schema" (stringified JSON) and "reasoning".
`;


export const ANALYZE_GSC_DATA_PROMPT = (gscRows: GscRow[], knowledgeGraph: KnowledgeGraph, info?: BusinessInfo): string => {
    const kgTerms = knowledgeGraph
        ? Array.from(knowledgeGraph.getNodes().values()).map(n => n.term).join(', ')
        : "No knowledge graph available.";

    return `
You are an expert SEO data analyst. Identify "Opportunity Queries" from GSC data.

GSC Data (Top 100 rows):
${JSON.stringify(gscRows.slice(0, 100), null, 2)}

Knowledge Graph Terms:
${kgTerms}

${info ? businessContext(info) : ''}

For the top 5-7 opportunities (High Impressions, Low CTR), provide:
- "query", "impressions", "ctr".
- "reasoning": Why is this an opportunity?
- "relatedKnowledgeTerms": Related terms from the graph.

${jsonResponseInstruction}
Return a JSON array of opportunity objects.
`;
};
