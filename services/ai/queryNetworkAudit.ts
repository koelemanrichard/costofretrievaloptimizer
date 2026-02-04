// services/ai/queryNetworkAudit.ts
// Query Network Audit Service for competitive content analysis and gap identification

import type {
  BusinessInfo,
  QueryIntent,
  QueryNetworkNode,
  SerpCompetitorData,
  CompetitorEAV,
  InformationDensityScore,
  ContentGap,
  HeadingHierarchy,
  QueryNetworkAnalysisResult,
  QueryNetworkRecommendation,
  QueryNetworkAuditConfig,
  QueryNetworkAuditProgress,
  AttributeCategory
} from '../../types';

import { GoogleGenAI } from "@google/genai";
import { fetchSerpResults } from '../serpApiService';
import { extractPageContent } from '../jinaService';
import { validateEntityAuthority } from '../googleKnowledgeGraphService';

// Progress callback type
type ProgressCallback = (progress: QueryNetworkAuditProgress) => void;

/**
 * Execute a prompt against the configured AI provider and return raw text response
 */
async function executePrompt(prompt: string, businessInfo: BusinessInfo): Promise<string> {
  const provider = businessInfo.aiProvider || 'gemini';

  switch (provider) {
    case 'gemini': {
      if (!businessInfo.geminiApiKey) {
        throw new Error('Gemini API key not configured');
      }
      const ai = new GoogleGenAI({ apiKey: businessInfo.geminiApiKey });
      const model = businessInfo.aiModel || 'gemini-2.5-flash';
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          maxOutputTokens: 8192,
          responseMimeType: 'text/plain',
        },
      });
      return response.text || '';
    }

    case 'anthropic': {
      if (!businessInfo.anthropicApiKey || !businessInfo.supabaseUrl) {
        throw new Error('Anthropic API key or Supabase URL not configured');
      }
      const proxyUrl = `${businessInfo.supabaseUrl}/functions/v1/anthropic-proxy`;
      const model = businessInfo.aiModel || 'claude-sonnet-4-5-20250929';

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-anthropic-api-key': businessInfo.anthropicApiKey,
          'apikey': businessInfo.supabaseAnonKey || '',
          'Authorization': `Bearer ${businessInfo.supabaseAnonKey || ''}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      const textBlock = data.content?.find((b: any) => b.type === 'text');
      return textBlock?.text || '';
    }

    case 'openai': {
      if (!businessInfo.openAiApiKey) {
        throw new Error('OpenAI API key not configured');
      }
      const model = businessInfo.aiModel || 'gpt-4o';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessInfo.openAiApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }

    case 'openrouter': {
      if (!businessInfo.openRouterApiKey) {
        throw new Error('OpenRouter API key not configured');
      }
      const model = businessInfo.aiModel || 'anthropic/claude-3.5-sonnet';
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessInfo.openRouterApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }

    case 'perplexity': {
      if (!businessInfo.perplexityApiKey) {
        throw new Error('Perplexity API key not configured');
      }
      const model = businessInfo.aiModel || 'llama-3.1-sonar-large-128k-online';
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessInfo.perplexityApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Generate a network of related queries from a seed keyword
 */
export async function generateQueryNetwork(
  seedKeyword: string,
  businessInfo: BusinessInfo,
  maxQueries: number = 20
): Promise<QueryNetworkNode[]> {
  const prompt = `Generate a comprehensive query network for the seed keyword: "${seedKeyword}"

Context:
- Industry: ${businessInfo.industry}
- Target Market: ${businessInfo.targetMarket}
- Language: ${businessInfo.language}

Generate ${maxQueries} related search queries that users might search for when researching this topic.

For each query, provide:
1. The query text
2. Search intent classification: "informational", "commercial", "transactional", or "navigational"
3. Related variations (2-3 similar queries)
4. Questions users might ask (2-3 questions)

Return as JSON array:
[
  {
    "query": "the search query",
    "intent": "informational",
    "relatedQueries": ["variation 1", "variation 2"],
    "questions": ["question 1?", "question 2?"]
  }
]

Focus on queries that would help understand:
- Core definitional queries (what is X)
- Comparative queries (X vs Y)
- Commercial queries (best X, X reviews)
- Process queries (how to X)
- Attribute queries (X specifications, X features)`;

  try {
    const response = await executePrompt(prompt, businessInfo);

    // Parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[QueryNetworkAudit] Failed to parse query network response');
      return [];
    }

    const queries = JSON.parse(jsonMatch[0]) as QueryNetworkNode[];

    // Add search volume and difficulty placeholders (would come from DataForSEO)
    return queries.map(q => ({
      ...q,
      searchVolume: undefined,
      difficulty: undefined
    }));
  } catch (error) {
    console.error('[QueryNetworkAudit] Error generating query network:', error);
    return [];
  }
}

/**
 * Classify query intent using AI
 */
export async function classifyQueryIntent(
  query: string,
  businessInfo: BusinessInfo
): Promise<QueryIntent> {
  const prompt = `Classify the search intent of this query: "${query}"

Return ONLY one of these values:
- informational (user wants to learn/understand)
- commercial (user is researching before purchase)
- transactional (user wants to buy/sign up now)
- navigational (user looking for specific site/page)

Response:`;

  try {
    const response = await executePrompt(prompt, businessInfo);
    const intent = response.toLowerCase().trim() as QueryIntent;

    if (['informational', 'commercial', 'transactional', 'navigational'].includes(intent)) {
      return intent;
    }

    return 'informational'; // Default
  } catch (error) {
    console.error('[QueryNetworkAudit] Error classifying intent:', error);
    return 'informational';
  }
}

/**
 * Fetch SERP results for a query and extract competitor data
 */
export async function fetchCompetitorData(
  query: string,
  businessInfo: BusinessInfo,
  maxCompetitors: number = 10
): Promise<SerpCompetitorData[]> {
  if (!businessInfo.dataforseoLogin || !businessInfo.dataforseoPassword) {
    console.warn('[QueryNetworkAudit] DataForSEO credentials not configured');
    return [];
  }

  try {
    const serpResults = await fetchSerpResults(
      query,
      businessInfo.dataforseoLogin,
      businessInfo.dataforseoPassword,
      businessInfo.targetMarket || 'United States',
      businessInfo.language || 'en',
      { supabaseUrl: businessInfo.supabaseUrl, supabaseAnonKey: businessInfo.supabaseAnonKey }
    );

    return serpResults.slice(0, maxCompetitors).map((result, index) => ({
      url: result.link,
      title: result.title,
      position: index + 1,
      domain: new URL(result.link).hostname,
      featuredSnippet: false // Not captured in current SERP API response
    }));
  } catch (error) {
    console.error('[QueryNetworkAudit] Error fetching SERP results:', error);
    return [];
  }
}

/**
 * Extract page content and analyze heading hierarchy
 */
export async function analyzePageStructure(
  url: string,
  businessInfo: BusinessInfo
): Promise<HeadingHierarchy | null> {
  if (!businessInfo.jinaApiKey) {
    console.warn('[QueryNetworkAudit] Jina API key not configured');
    return null;
  }

  try {
    const content = await extractPageContent(url, businessInfo.jinaApiKey, {
      supabaseUrl: businessInfo.supabaseUrl,
      supabaseAnonKey: businessInfo.supabaseAnonKey
    });

    // Calculate hierarchy score
    let hierarchyScore = 100;
    const issues: string[] = [];

    // Check for H1
    const h1s = content.headings.filter(h => h.level === 1);
    if (h1s.length === 0) {
      hierarchyScore -= 20;
      issues.push('Missing H1 heading');
    } else if (h1s.length > 1) {
      hierarchyScore -= 10;
      issues.push('Multiple H1 headings detected');
    }

    // Check heading hierarchy (no skipping levels)
    let prevLevel = 1;
    for (const heading of content.headings) {
      if (heading.level > prevLevel + 1) {
        hierarchyScore -= 5;
        issues.push(`Heading level skipped: H${prevLevel} to H${heading.level}`);
      }
      prevLevel = heading.level;
    }

    // Check for reasonable number of headings
    if (content.headings.length < 3) {
      hierarchyScore -= 15;
      issues.push('Too few headings for content length');
    }

    return {
      url,
      headings: content.headings.map(h => ({
        level: h.level,
        text: h.text,
        wordCount: content.wordCount || 0
      })),
      hierarchyScore: Math.max(0, hierarchyScore),
      issues
    };
  } catch (error) {
    console.error('[QueryNetworkAudit] Error analyzing page structure:', error);
    return null;
  }
}

/**
 * Extract EAVs (Entity-Attribute-Value triples) from competitor content
 */
export async function extractCompetitorEAVs(
  url: string,
  content: string,
  businessInfo: BusinessInfo,
  seedEntity: string
): Promise<CompetitorEAV[]> {
  const prompt = `Extract Entity-Attribute-Value (EAV) semantic triples from this content.

Focus on facts about: "${seedEntity}"

Content:
${content.substring(0, 8000)}

For each fact found, extract:
1. Entity: The subject being described
2. Attribute: The property or characteristic
3. Value: The specific value or description
4. Confidence: 0-1 based on how explicit the information is
5. Category: UNIQUE (only this source has it), RARE (few sources), COMMON (many sources), ROOT (fundamental)

Return as JSON array:
[
  {
    "entity": "entity name",
    "attribute": "attribute name",
    "value": "the value",
    "confidence": 0.9,
    "category": "COMMON"
  }
]

Extract 10-20 EAVs focusing on factual, specific information.`;

  try {
    const response = await executePrompt(prompt, businessInfo);

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const eavs = JSON.parse(jsonMatch[0]) as Array<{
      entity: string;
      attribute: string;
      value: string;
      confidence: number;
      category: string;
    }>;

    return eavs.map(eav => ({
      entity: eav.entity,
      attribute: eav.attribute,
      value: eav.value,
      source: url,
      confidence: eav.confidence,
      category: eav.category as AttributeCategory
    }));
  } catch (error) {
    console.error('[QueryNetworkAudit] Error extracting EAVs:', error);
    return [];
  }
}

/**
 * Calculate information density score for content
 */
export function calculateInformationDensity(
  content: string,
  eavs: CompetitorEAV[]
): InformationDensityScore {
  // Count sentences (rough approximation)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const sentenceCount = Math.max(1, sentences.length);

  // Count unique entities and attributes
  const uniqueEntities = new Set(eavs.map(e => e.entity.toLowerCase()));
  const uniqueAttributes = new Set(eavs.map(e => e.attribute.toLowerCase()));

  // Calculate facts per sentence
  const factsPerSentence = eavs.length / sentenceCount;

  // Calculate density score (0-100)
  // Target: ~0.5 facts per sentence is optimal
  let densityScore = Math.min(100, factsPerSentence * 200);

  // Bonus for unique information
  const uniqueEAVs = eavs.filter(e => e.category === 'UNIQUE' || e.category === 'RARE');
  densityScore += Math.min(20, uniqueEAVs.length * 2);

  return {
    factsPerSentence: Math.round(factsPerSentence * 100) / 100,
    uniqueEntitiesCount: uniqueEntities.size,
    uniqueAttributesCount: uniqueAttributes.size,
    totalEAVs: eavs.length,
    densityScore: Math.min(100, Math.round(densityScore))
  };
}

/**
 * Identify content gaps between own content and competitors
 */
export function identifyContentGaps(
  ownEAVs: CompetitorEAV[],
  competitorEAVs: CompetitorEAV[]
): ContentGap[] {
  const ownAttributes = new Set(
    ownEAVs.map(e => `${e.entity.toLowerCase()}:${e.attribute.toLowerCase()}`)
  );

  // Group competitor EAVs by entity:attribute
  const competitorAttributeMap = new Map<string, CompetitorEAV[]>();

  for (const eav of competitorEAVs) {
    const key = `${eav.entity.toLowerCase()}:${eav.attribute.toLowerCase()}`;
    if (!competitorAttributeMap.has(key)) {
      competitorAttributeMap.set(key, []);
    }
    competitorAttributeMap.get(key)!.push(eav);
  }

  const gaps: ContentGap[] = [];

  for (const [key, eavs] of competitorAttributeMap) {
    if (!ownAttributes.has(key)) {
      const [entity, attribute] = key.split(':');
      const sources = [...new Set(eavs.map(e => e.source))];
      const frequency = sources.length;

      // Determine priority based on frequency
      let priority: 'high' | 'medium' | 'low';
      if (frequency >= 5) {
        priority = 'high';
      } else if (frequency >= 2) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      gaps.push({
        missingAttribute: `${entity} - ${attribute}`,
        foundInCompetitors: sources,
        frequency,
        priority,
        suggestedContent: eavs[0]?.value
      });
    }
  }

  // Sort by frequency (most common gaps first)
  gaps.sort((a, b) => b.frequency - a.frequency);

  return gaps;
}

/**
 * Generate actionable recommendations from analysis
 */
export function generateRecommendations(
  result: Partial<QueryNetworkAnalysisResult>
): QueryNetworkRecommendation[] {
  const recommendations: QueryNetworkRecommendation[] = [];

  // Content gap recommendations (when own content was analyzed)
  if (result.contentGaps?.length) {
    const highPriorityGaps = result.contentGaps.filter(g => g.priority === 'high');

    if (highPriorityGaps.length > 0) {
      recommendations.push({
        type: 'content_gap',
        priority: 'critical',
        title: 'Address Critical Content Gaps',
        description: `${highPriorityGaps.length} attributes covered by most competitors are missing from your content.`,
        affectedQueries: [],
        estimatedImpact: 'High - These are standard expectations for this topic',
        suggestedAction: `Add content covering: ${highPriorityGaps.slice(0, 5).map(g => g.missingAttribute).join(', ')}`
      });
    }

    const mediumPriorityGaps = result.contentGaps.filter(g => g.priority === 'medium');
    if (mediumPriorityGaps.length > 0) {
      recommendations.push({
        type: 'content_gap',
        priority: 'high',
        title: 'Fill Secondary Content Gaps',
        description: `${mediumPriorityGaps.length} attributes found in some competitors could differentiate your content.`,
        affectedQueries: [],
        estimatedImpact: 'Medium - Opportunity for differentiation',
        suggestedAction: `Consider adding: ${mediumPriorityGaps.slice(0, 5).map(g => g.missingAttribute).join(', ')}`
      });
    }
  }

  // Competitor insights recommendations (always generate based on competitor data)
  if (result.competitorEAVs?.length) {
    // Identify most common attributes across competitors
    const attributeFrequency = new Map<string, { count: number; example: string }>();
    for (const eav of result.competitorEAVs) {
      const key = `${eav.entity}:${eav.attribute}`;
      const existing = attributeFrequency.get(key);
      if (existing) {
        existing.count++;
      } else {
        attributeFrequency.set(key, { count: 1, example: eav.value });
      }
    }

    // Find high-frequency attributes (covered by multiple competitors)
    const commonAttributes = [...attributeFrequency.entries()]
      .filter(([_, data]) => data.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    if (commonAttributes.length > 0) {
      recommendations.push({
        type: 'content_gap',
        priority: 'high',
        title: 'Cover Key Competitor Topics',
        description: `${commonAttributes.length} attributes are covered by multiple competitors. Ensure your content addresses these.`,
        affectedQueries: [],
        estimatedImpact: 'High - These represent industry-standard content expectations',
        suggestedAction: `Key topics to cover: ${commonAttributes.slice(0, 5).map(([key]) => key.split(':')[1]).join(', ')}`
      });
    }

    // Find UNIQUE/RARE EAVs - opportunities for differentiation
    const uniqueEAVs = result.competitorEAVs.filter(e => e.category === 'UNIQUE' || e.category === 'RARE');
    if (uniqueEAVs.length > 0) {
      const uniqueAttributes = [...new Set(uniqueEAVs.map(e => e.attribute))].slice(0, 5);
      recommendations.push({
        type: 'new_topic',
        priority: 'medium',
        title: 'Differentiation Opportunities',
        description: `Found ${uniqueEAVs.length} unique/rare attributes from competitors that could help differentiate your content.`,
        affectedQueries: [],
        estimatedImpact: 'Medium - Unique content improves authority',
        suggestedAction: `Consider covering: ${uniqueAttributes.join(', ')}`
      });
    }
  }

  // Information density recommendations
  if (result.informationDensity) {
    const own = result.informationDensity.own;
    const avg = result.informationDensity.competitorAverage;

    if (own && own.densityScore < avg.densityScore - 10) {
      recommendations.push({
        type: 'density_improvement',
        priority: 'high',
        title: 'Increase Information Density',
        description: `Your content density score (${own.densityScore}) is below competitor average (${avg.densityScore}).`,
        affectedQueries: [],
        estimatedImpact: 'High - More facts per sentence improves perceived expertise',
        suggestedAction: 'Add more specific facts, statistics, and detailed specifications to your content.'
      });
    } else if (!own) {
      // No own content analyzed - provide general density guidance
      recommendations.push({
        type: 'density_improvement',
        priority: 'medium',
        title: 'Target Competitor Information Density',
        description: `Top competitors average ${avg.totalEAVs} facts with ${avg.factsPerSentence} facts per sentence. Use this as your benchmark.`,
        affectedQueries: [],
        estimatedImpact: 'Medium - Matching competitor density establishes baseline',
        suggestedAction: `Aim for at least ${avg.totalEAVs} distinct facts in your content with ~${avg.factsPerSentence} facts per sentence.`
      });
    }

    if (own && own.uniqueEntitiesCount < avg.uniqueEntitiesCount * 0.7) {
      recommendations.push({
        type: 'density_improvement',
        priority: 'medium',
        title: 'Increase Entity Coverage',
        description: `Your content covers fewer unique entities (${own.uniqueEntitiesCount}) than competitors (${avg.uniqueEntitiesCount}).`,
        affectedQueries: [],
        estimatedImpact: 'Medium - Broader entity coverage improves topical authority',
        suggestedAction: 'Mention more related entities and concepts within your content.'
      });
    }
  }

  // Structure recommendations
  if (result.headingAnalysis?.length) {
    const poorStructure = result.headingAnalysis.filter(h => h.hierarchyScore < 70);

    if (poorStructure.length > result.headingAnalysis.length * 0.3) {
      recommendations.push({
        type: 'structure_fix',
        priority: 'medium',
        title: 'Improve Content Structure',
        description: `${poorStructure.length} pages have suboptimal heading hierarchies.`,
        affectedQueries: [],
        estimatedImpact: 'Medium - Clear structure aids both users and search engines',
        suggestedAction: 'Ensure proper H1-H6 hierarchy without skipping levels.'
      });
    }
  }

  // Query coverage recommendations
  if (result.queryNetwork?.length) {
    // Gather all questions from queries
    const allQuestions = result.queryNetwork.flatMap(q => q.questions);

    if (allQuestions.length > 0) {
      recommendations.push({
        type: 'new_topic',
        priority: 'high',
        title: 'Answer User Questions',
        description: `Found ${allQuestions.length} questions users are asking. Answering these can capture featured snippets.`,
        affectedQueries: result.queryNetwork.filter(q => q.questions.length > 0).map(q => q.query),
        estimatedImpact: 'High - Direct answers to questions improve rankings and featured snippet eligibility',
        suggestedAction: `Create FAQ content or dedicated sections answering: "${allQuestions.slice(0, 3).join('", "')}"`
      });
    }

    // Intent-based recommendations
    const intentCounts = {
      informational: result.queryNetwork.filter(q => q.intent === 'informational').length,
      commercial: result.queryNetwork.filter(q => q.intent === 'commercial').length,
      transactional: result.queryNetwork.filter(q => q.intent === 'transactional').length,
      navigational: result.queryNetwork.filter(q => q.intent === 'navigational').length,
    };

    const dominantIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0];

    if (dominantIntent[1] > result.queryNetwork.length * 0.4) {
      const intentStrategies: Record<string, string> = {
        informational: 'Create comprehensive educational content with definitions, guides, and how-tos.',
        commercial: 'Develop comparison content, reviews, and buying guides.',
        transactional: 'Optimize landing pages with clear CTAs and conversion elements.',
        navigational: 'Ensure strong brand presence and site structure.'
      };

      recommendations.push({
        type: 'new_topic',
        priority: 'medium',
        title: `Optimize for ${dominantIntent[0].charAt(0).toUpperCase() + dominantIntent[0].slice(1)} Intent`,
        description: `${Math.round((dominantIntent[1] / result.queryNetwork.length) * 100)}% of queries have ${dominantIntent[0]} intent.`,
        affectedQueries: result.queryNetwork.filter(q => q.intent === dominantIntent[0]).map(q => q.query),
        estimatedImpact: 'Medium - Aligning content with dominant intent improves relevance',
        suggestedAction: intentStrategies[dominantIntent[0]]
      });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

/**
 * Run a complete Query Network Audit
 */
export async function runQueryNetworkAudit(
  config: QueryNetworkAuditConfig,
  businessInfo: BusinessInfo,
  onProgress?: ProgressCallback
): Promise<QueryNetworkAnalysisResult> {
  const updateProgress = (
    phase: QueryNetworkAuditProgress['phase'],
    currentStep: string,
    completedSteps: number,
    totalSteps: number
  ) => {
    if (onProgress) {
      onProgress({
        phase,
        currentStep,
        totalSteps,
        completedSteps,
        progress: Math.round((completedSteps / totalSteps) * 100)
      });
    }
  };

  const maxQueries = config.maxQueries || 10;
  const maxCompetitors = config.maxCompetitors || 5;
  const totalSteps = 5;

  try {
    // Step 1: Generate Query Network
    updateProgress('generating_network', 'Generating query network...', 0, totalSteps);
    const queryNetwork = await generateQueryNetwork(
      config.seedKeyword,
      businessInfo,
      maxQueries
    );

    // Step 2: Fetch SERP Results
    updateProgress('fetching_serps', 'Fetching SERP results...', 1, totalSteps);
    const serpResults = new Map<string, SerpCompetitorData[]>();

    for (const query of queryNetwork.slice(0, Math.min(5, queryNetwork.length))) {
      const competitors = await fetchCompetitorData(query.query, businessInfo, maxCompetitors);
      serpResults.set(query.query, competitors);

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Step 3: Extract EAVs from top competitors
    updateProgress('extracting_eavs', 'Extracting competitor information...', 2, totalSteps);
    const allCompetitorEAVs: CompetitorEAV[] = [];
    const headingAnalysis: HeadingHierarchy[] = [];

    // Get unique competitor URLs
    const uniqueUrls = new Set<string>();
    for (const competitors of serpResults.values()) {
      for (const comp of competitors.slice(0, 3)) { // Top 3 per query
        uniqueUrls.add(comp.url);
      }
    }

    for (const url of [...uniqueUrls].slice(0, maxCompetitors)) {
      try {
        // Extract page content
        if (businessInfo.jinaApiKey) {
          const content = await extractPageContent(url, businessInfo.jinaApiKey, {
            supabaseUrl: businessInfo.supabaseUrl,
            supabaseAnonKey: businessInfo.supabaseAnonKey
          });

          // Extract EAVs
          const eavs = await extractCompetitorEAVs(
            url,
            content.content,
            businessInfo,
            config.seedKeyword
          );
          allCompetitorEAVs.push(...eavs);

          // Analyze heading structure
          const hierarchy = await analyzePageStructure(url, businessInfo);
          if (hierarchy) {
            headingAnalysis.push(hierarchy);
          }
        }
      } catch (error) {
        console.error(`[QueryNetworkAudit] Error processing ${url}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Step 4: Analyze own content (if configured)
    updateProgress('analyzing_gaps', 'Analyzing content gaps...', 3, totalSteps);
    let ownEAVs: CompetitorEAV[] | undefined;

    if (config.includeOwnContent && config.targetDomain && businessInfo.jinaApiKey) {
      try {
        // Find own content in SERP results
        for (const competitors of serpResults.values()) {
          const ownResult = competitors.find(c =>
            c.domain.includes(config.targetDomain!)
          );

          if (ownResult) {
            const content = await extractPageContent(
              ownResult.url,
              businessInfo.jinaApiKey,
              {
                supabaseUrl: businessInfo.supabaseUrl,
                supabaseAnonKey: businessInfo.supabaseAnonKey
              }
            );

            ownEAVs = await extractCompetitorEAVs(
              ownResult.url,
              content.content,
              businessInfo,
              config.seedKeyword
            );
            break;
          }
        }
      } catch (error) {
        console.error('[QueryNetworkAudit] Error analyzing own content:', error);
      }
    }

    // Calculate information density
    const competitorAvgDensity = calculateInformationDensity(
      '', // Content not needed for average
      allCompetitorEAVs
    );

    // Find top competitor by EAV count
    const eavsByUrl = new Map<string, CompetitorEAV[]>();
    for (const eav of allCompetitorEAVs) {
      if (!eavsByUrl.has(eav.source)) {
        eavsByUrl.set(eav.source, []);
      }
      eavsByUrl.get(eav.source)!.push(eav);
    }

    let topCompetitorUrl = '';
    let maxEAVs = 0;
    for (const [url, eavs] of eavsByUrl) {
      if (eavs.length > maxEAVs) {
        maxEAVs = eavs.length;
        topCompetitorUrl = url;
      }
    }

    const topCompetitorDensity = calculateInformationDensity(
      '',
      eavsByUrl.get(topCompetitorUrl) || []
    );

    // Identify content gaps
    const contentGaps = ownEAVs
      ? identifyContentGaps(ownEAVs, allCompetitorEAVs)
      : [];

    // Step 5: Entity validation (if configured)
    updateProgress('validating_entities', 'Validating entity authority...', 4, totalSteps);

    if (config.includeEntityValidation && businessInfo.googleKnowledgeGraphApiKey) {
      await validateEntityAuthority(
        config.seedKeyword,
        config.targetDomain,
        businessInfo.googleKnowledgeGraphApiKey,
        config.language
      );
    }

    // Build result
    const result: QueryNetworkAnalysisResult = {
      seedKeyword: config.seedKeyword,
      queryNetwork,
      serpResults,
      competitorEAVs: allCompetitorEAVs,
      ownContentEAVs: ownEAVs,
      contentGaps,
      informationDensity: {
        own: ownEAVs
          ? calculateInformationDensity('', ownEAVs)
          : undefined,
        competitorAverage: competitorAvgDensity,
        topCompetitor: topCompetitorDensity
      },
      headingAnalysis,
      recommendations: [],
      timestamp: new Date().toISOString()
    };

    // Generate recommendations
    result.recommendations = generateRecommendations(result);

    updateProgress('complete', 'Audit complete', 5, totalSteps);

    return result;
  } catch (error) {
    console.error('[QueryNetworkAudit] Audit failed:', error);

    if (onProgress) {
      onProgress({
        phase: 'error',
        currentStep: 'Audit failed',
        totalSteps: 5,
        completedSteps: 0,
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    throw error;
  }
}

/**
 * Generate a summary report suitable for business stakeholders
 */
export function generateBusinessSummary(result: QueryNetworkAnalysisResult): string {
  const criticalRecs = result.recommendations.filter(r => r.priority === 'critical');
  const highRecs = result.recommendations.filter(r => r.priority === 'high');

  let summary = `# Query Network Analysis: ${result.seedKeyword}\n\n`;

  // Executive summary
  summary += `## Executive Summary\n\n`;
  summary += `Analyzed **${result.queryNetwork.length}** related queries and **${result.competitorEAVs.length}** competitor data points.\n\n`;

  if (criticalRecs.length > 0) {
    summary += `**${criticalRecs.length} critical issues** require immediate attention.\n`;
  }

  if (result.contentGaps.length > 0) {
    const highGaps = result.contentGaps.filter(g => g.priority === 'high');
    summary += `Found **${highGaps.length} high-priority content gaps** where competitors outperform your content.\n\n`;
  }

  // Key metrics
  summary += `## Key Metrics\n\n`;
  summary += `| Metric | Your Content | Competitor Avg | Top Competitor |\n`;
  summary += `|--------|--------------|----------------|----------------|\n`;

  if (result.informationDensity.own) {
    summary += `| Information Density | ${result.informationDensity.own.densityScore} | `;
  } else {
    summary += `| Information Density | N/A | `;
  }
  summary += `${result.informationDensity.competitorAverage.densityScore} | `;
  summary += `${result.informationDensity.topCompetitor.densityScore} |\n`;

  // Priority actions
  summary += `\n## Priority Actions\n\n`;

  for (const rec of [...criticalRecs, ...highRecs].slice(0, 5)) {
    summary += `### ${rec.title}\n`;
    summary += `**Priority:** ${rec.priority.toUpperCase()}\n\n`;
    summary += `${rec.description}\n\n`;
    summary += `**Recommended Action:** ${rec.suggestedAction}\n\n`;
  }

  return summary;
}

/**
 * Generate a detailed technical report
 */
export function generateTechnicalReport(result: QueryNetworkAnalysisResult): string {
  let report = `# Technical Audit Report: ${result.seedKeyword}\n\n`;
  report += `Generated: ${result.timestamp}\n\n`;

  // Query Network Analysis
  report += `## Query Network Analysis\n\n`;
  report += `| Query | Intent | Related Queries | Questions |\n`;
  report += `|-------|--------|-----------------|------------|\n`;

  for (const query of result.queryNetwork.slice(0, 20)) {
    report += `| ${query.query} | ${query.intent} | ${query.relatedQueries.length} | ${query.questions.length} |\n`;
  }

  // Competitor EAV Breakdown
  report += `\n## Competitor EAV Analysis\n\n`;
  report += `Total EAVs extracted: ${result.competitorEAVs.length}\n\n`;

  const eavsByCategory = new Map<string, number>();
  for (const eav of result.competitorEAVs) {
    const cat = eav.category || 'UNKNOWN';
    eavsByCategory.set(cat, (eavsByCategory.get(cat) || 0) + 1);
  }

  report += `| Category | Count |\n`;
  report += `|----------|-------|\n`;
  for (const [cat, count] of eavsByCategory) {
    report += `| ${cat} | ${count} |\n`;
  }

  // Content Gaps Detail
  report += `\n## Content Gaps (Detailed)\n\n`;

  for (const gap of result.contentGaps.slice(0, 20)) {
    report += `### ${gap.missingAttribute}\n`;
    report += `- Priority: ${gap.priority}\n`;
    report += `- Found in ${gap.frequency} competitors\n`;
    report += `- Sources: ${gap.foundInCompetitors.slice(0, 3).join(', ')}\n`;
    if (gap.suggestedContent) {
      report += `- Example value: ${gap.suggestedContent}\n`;
    }
    report += `\n`;
  }

  // Heading Hierarchy Analysis
  report += `## Page Structure Analysis\n\n`;

  for (const page of result.headingAnalysis) {
    report += `### ${page.url}\n`;
    report += `- Hierarchy Score: ${page.hierarchyScore}/100\n`;
    if (page.issues.length > 0) {
      report += `- Issues: ${page.issues.join('; ')}\n`;
    }
    report += `\n`;
  }

  return report;
}
