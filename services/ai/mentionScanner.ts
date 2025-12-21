// services/ai/mentionScanner.ts
// Mention/Entity Authority Scanner for E-A-T validation and reputation analysis

import type {
  BusinessInfo,
  MentionScannerConfig,
  MentionScannerProgress,
  MentionScannerResult,
  MentionScannerRecommendation,
  ReputationSignal,
  EntityCoOccurrence,
  EATBreakdown,
  EntityAuthorityResult,
} from '../../types';

import { GoogleGenAI } from "@google/genai";
import { validateEntityAuthority } from '../googleKnowledgeGraphService';
import { verifyEntity as verifyWikipediaEntity } from '../wikipediaService';

// Progress callback type
type ProgressCallback = (progress: MentionScannerProgress) => void;

/**
 * Execute a prompt against the configured AI provider
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

    default: {
      // Fallback to Gemini for other providers
      if (!businessInfo.geminiApiKey) {
        throw new Error('No AI API key configured');
      }
      const ai = new GoogleGenAI({ apiKey: businessInfo.geminiApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { maxOutputTokens: 8192 },
      });
      return response.text || '';
    }
  }
}

/**
 * Validate entity identity across Wikipedia, Wikidata, and Knowledge Graph
 */
export async function validateEntityIdentity(
  entityName: string,
  domain: string | undefined,
  businessInfo: BusinessInfo
): Promise<EntityAuthorityResult> {
  return validateEntityAuthority(
    entityName,
    domain,
    businessInfo.googleKnowledgeGraphApiKey,
    businessInfo.language || 'en'
  );
}

/**
 * Analyze reputation signals for an entity using AI
 */
export async function analyzeReputationSignals(
  entityName: string,
  industry: string | undefined,
  businessInfo: BusinessInfo
): Promise<ReputationSignal[]> {
  const prompt = `Analyze the typical reputation signals for the entity "${entityName}"${industry ? ` in the ${industry} industry` : ''}.

Based on common patterns for entities like this, identify what reputation signals would typically be found:

Return as JSON array:
[
  {
    "source": "Platform or source name",
    "sourceType": "review_platform" | "news" | "social" | "industry" | "government",
    "sentiment": "positive" | "neutral" | "negative",
    "mentionCount": estimated number,
    "avgRating": optional rating 1-5
  }
]

Consider:
- Review platforms (G2, Capterra, Trustpilot, Google Reviews)
- News mentions (industry publications, mainstream media)
- Social media presence
- Industry recognition (awards, certifications)
- Government/regulatory mentions

Return 5-10 relevant signals.`;

  try {
    const response = await executePrompt(prompt, businessInfo);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    return JSON.parse(jsonMatch[0]) as ReputationSignal[];
  } catch (error) {
    console.error('[MentionScanner] Error analyzing reputation:', error);
    return [];
  }
}

/**
 * Find entity co-occurrences and topical associations
 */
export async function findCoOccurrences(
  entityName: string,
  industry: string | undefined,
  businessInfo: BusinessInfo
): Promise<EntityCoOccurrence[]> {
  const prompt = `Identify entities that commonly co-occur with "${entityName}"${industry ? ` in the ${industry} industry` : ''}.

Find entities that are frequently mentioned alongside this entity in content:

Return as JSON array:
[
  {
    "entity": "Entity name",
    "frequency": estimated frequency 1-100,
    "contexts": ["context 1", "context 2"],
    "associationType": "competitor" | "partner" | "industry_term" | "related_brand"
  }
]

Consider:
- Direct competitors
- Technology/service partners
- Industry terminology
- Related brands or products
- Key influencers or thought leaders

Return 10-15 relevant co-occurrences.`;

  try {
    const response = await executePrompt(prompt, businessInfo);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    return JSON.parse(jsonMatch[0]) as EntityCoOccurrence[];
  } catch (error) {
    console.error('[MentionScanner] Error finding co-occurrences:', error);
    return [];
  }
}

/**
 * Calculate E-A-T (Expertise, Authority, Trust) breakdown
 */
export function calculateEATBreakdown(
  entityAuthority: EntityAuthorityResult,
  reputationSignals: ReputationSignal[],
  coOccurrences: EntityCoOccurrence[]
): EATBreakdown {
  // Expertise signals
  const expertiseSignals: string[] = [];
  let expertiseScore = 50; // Base score

  if (entityAuthority.wikipedia?.found) {
    expertiseSignals.push('Wikipedia presence indicates recognized expertise');
    expertiseScore += 15;
  }

  if (entityAuthority.wikidata) {
    expertiseSignals.push('Wikidata entry confirms structured knowledge');
    expertiseScore += 10;
  }

  const industryMentions = reputationSignals.filter(s => s.sourceType === 'industry');
  if (industryMentions.length > 0) {
    expertiseSignals.push(`${industryMentions.length} industry source mentions`);
    expertiseScore += Math.min(15, industryMentions.length * 5);
  }

  // Authority signals
  const authoritySignals: string[] = [];
  let authorityScore = 50;

  if (entityAuthority.knowledgeGraph) {
    authoritySignals.push('Google Knowledge Graph presence');
    authorityScore += 20;
  }

  const positiveReviews = reputationSignals.filter(s => s.sentiment === 'positive');
  if (positiveReviews.length > 0) {
    authoritySignals.push(`${positiveReviews.length} positive review sources`);
    authorityScore += Math.min(15, positiveReviews.length * 5);
  }

  const partnerAssociations = coOccurrences.filter(c => c.associationType === 'partner');
  if (partnerAssociations.length > 0) {
    authoritySignals.push(`${partnerAssociations.length} partner associations`);
    authorityScore += Math.min(10, partnerAssociations.length * 3);
  }

  // Trust signals
  const trustSignals: string[] = [];
  let trustScore = 50;

  const governmentMentions = reputationSignals.filter(s => s.sourceType === 'government');
  if (governmentMentions.length > 0) {
    trustSignals.push('Government/regulatory recognition');
    trustScore += 15;
  }

  const avgRatings = reputationSignals
    .filter(s => s.avgRating !== undefined)
    .map(s => s.avgRating!);
  if (avgRatings.length > 0) {
    const avgRating = avgRatings.reduce((a, b) => a + b, 0) / avgRatings.length;
    if (avgRating >= 4) {
      trustSignals.push(`High average rating: ${avgRating.toFixed(1)}/5`);
      trustScore += 15;
    } else if (avgRating >= 3) {
      trustSignals.push(`Moderate average rating: ${avgRating.toFixed(1)}/5`);
      trustScore += 5;
    }
  }

  const negativeSignals = reputationSignals.filter(s => s.sentiment === 'negative');
  if (negativeSignals.length > 0) {
    trustSignals.push(`${negativeSignals.length} negative mentions detected`);
    trustScore -= negativeSignals.length * 5;
  }

  return {
    expertise: {
      score: Math.min(100, Math.max(0, expertiseScore)),
      signals: expertiseSignals,
    },
    authority: {
      score: Math.min(100, Math.max(0, authorityScore)),
      signals: authoritySignals,
    },
    trust: {
      score: Math.min(100, Math.max(0, trustScore)),
      signals: trustSignals,
    },
  };
}

/**
 * Generate recommendations based on analysis
 */
export function generateRecommendations(
  entityAuthority: EntityAuthorityResult,
  reputationSignals: ReputationSignal[],
  eatBreakdown: EATBreakdown
): MentionScannerRecommendation[] {
  const recommendations: MentionScannerRecommendation[] = [];

  // Identity recommendations
  if (!entityAuthority.wikipedia?.found) {
    recommendations.push({
      type: 'identity',
      priority: 'high',
      title: 'Create Wikipedia Presence',
      description: 'No Wikipedia article found for this entity.',
      suggestedAction: 'Consider creating a Wikipedia article following notability guidelines, or ensure existing articles reference your entity.',
      estimatedImpact: 'High - Wikipedia is a major trust signal for search engines.',
    });
  }

  if (!entityAuthority.knowledgeGraph) {
    recommendations.push({
      type: 'authority',
      priority: 'high',
      title: 'Establish Knowledge Graph Presence',
      description: 'Entity not found in Google Knowledge Graph.',
      suggestedAction: 'Implement comprehensive Schema.org markup, claim Google Business Profile, and build authoritative backlinks.',
      estimatedImpact: 'High - Knowledge Graph presence improves SERP visibility.',
    });
  }

  // Reputation recommendations
  const reviewSignals = reputationSignals.filter(s => s.sourceType === 'review_platform');
  if (reviewSignals.length < 3) {
    recommendations.push({
      type: 'reputation',
      priority: 'medium',
      title: 'Expand Review Presence',
      description: `Only ${reviewSignals.length} review platform(s) detected.`,
      suggestedAction: 'Actively solicit reviews on major platforms like G2, Capterra, Trustpilot, or industry-specific review sites.',
      estimatedImpact: 'Medium - More reviews increase trust signals.',
    });
  }

  const negativeSignals = reputationSignals.filter(s => s.sentiment === 'negative');
  if (negativeSignals.length > 2) {
    recommendations.push({
      type: 'reputation',
      priority: 'critical',
      title: 'Address Negative Sentiment',
      description: `${negativeSignals.length} sources show negative sentiment.`,
      suggestedAction: 'Implement reputation management strategy: respond to negative reviews, address concerns publicly, and create positive content.',
      estimatedImpact: 'Critical - Negative sentiment directly impacts trust.',
    });
  }

  // E-A-T recommendations
  if (eatBreakdown.expertise.score < 60) {
    recommendations.push({
      type: 'authority',
      priority: 'high',
      title: 'Strengthen Expertise Signals',
      description: `Expertise score is ${eatBreakdown.expertise.score}/100.`,
      suggestedAction: 'Publish thought leadership content, obtain industry certifications, and seek speaking opportunities at industry events.',
      estimatedImpact: 'High - Expertise is fundamental to E-A-T.',
    });
  }

  if (eatBreakdown.trust.score < 60) {
    recommendations.push({
      type: 'trust',
      priority: 'high',
      title: 'Build Trust Signals',
      description: `Trust score is ${eatBreakdown.trust.score}/100.`,
      suggestedAction: 'Display certifications, security badges, and testimonials. Ensure transparent business practices and clear contact information.',
      estimatedImpact: 'High - Trust is essential for YMYL topics.',
    });
  }

  // Visibility recommendations
  const socialSignals = reputationSignals.filter(s => s.sourceType === 'social');
  if (socialSignals.length < 2) {
    recommendations.push({
      type: 'visibility',
      priority: 'medium',
      title: 'Increase Social Media Presence',
      description: 'Limited social media visibility detected.',
      suggestedAction: 'Maintain active presence on relevant social platforms, engage with industry conversations, and share valuable content.',
      estimatedImpact: 'Medium - Social signals contribute to overall authority.',
    });
  }

  return recommendations;
}

/**
 * Run a complete Mention Scanner audit
 */
export async function runMentionScanner(
  config: MentionScannerConfig,
  businessInfo: BusinessInfo,
  onProgress?: ProgressCallback
): Promise<MentionScannerResult> {
  const updateProgress = (
    phase: MentionScannerProgress['phase'],
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
        progress: Math.round((completedSteps / totalSteps) * 100),
      });
    }
  };

  const totalSteps = 4;

  try {
    // Step 1: Validate entity identity
    updateProgress('verifying_identity', 'Verifying entity identity...', 0, totalSteps);
    const entityAuthority = await validateEntityIdentity(
      config.entityName,
      config.domain,
      businessInfo
    );

    // Step 2: Analyze reputation signals
    updateProgress('scanning_reputation', 'Scanning reputation signals...', 1, totalSteps);
    const reputationSignals = await analyzeReputationSignals(
      config.entityName,
      config.industry,
      businessInfo
    );

    // Determine overall sentiment
    const sentimentCounts = {
      positive: reputationSignals.filter(s => s.sentiment === 'positive').length,
      neutral: reputationSignals.filter(s => s.sentiment === 'neutral').length,
      negative: reputationSignals.filter(s => s.sentiment === 'negative').length,
    };

    let overallSentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
    if (sentimentCounts.positive > sentimentCounts.negative * 2) {
      overallSentiment = 'positive';
    } else if (sentimentCounts.negative > sentimentCounts.positive * 2) {
      overallSentiment = 'negative';
    } else if (sentimentCounts.positive > 0 && sentimentCounts.negative > 0) {
      overallSentiment = 'mixed';
    } else {
      overallSentiment = 'neutral';
    }

    // Step 3: Find co-occurrences
    updateProgress('analyzing_cooccurrences', 'Analyzing entity co-occurrences...', 2, totalSteps);
    const coOccurrences = await findCoOccurrences(
      config.entityName,
      config.industry,
      businessInfo
    );

    // Extract topical associations
    const topicalAssociations = coOccurrences
      .filter(c => c.associationType === 'industry_term')
      .map(c => c.entity);

    // Step 4: Calculate E-A-T score
    updateProgress('calculating_score', 'Calculating E-A-T score...', 3, totalSteps);
    const eatBreakdown = calculateEATBreakdown(
      entityAuthority,
      reputationSignals,
      coOccurrences
    );

    // Calculate overall E-A-T score (weighted average)
    const eatScore = Math.round(
      eatBreakdown.expertise.score * 0.3 +
      eatBreakdown.authority.score * 0.4 +
      eatBreakdown.trust.score * 0.3
    );

    // Generate recommendations
    const recommendations = generateRecommendations(
      entityAuthority,
      reputationSignals,
      eatBreakdown
    );

    updateProgress('complete', 'Scan complete', 4, totalSteps);

    return {
      entityName: config.entityName,
      domain: config.domain,
      timestamp: new Date().toISOString(),
      entityAuthority,
      reputationSignals,
      overallSentiment,
      coOccurrences,
      topicalAssociations,
      eatBreakdown,
      eatScore,
      recommendations,
    };
  } catch (error) {
    console.error('[MentionScanner] Scan failed:', error);

    if (onProgress) {
      onProgress({
        phase: 'error',
        currentStep: 'Scan failed',
        totalSteps: 4,
        completedSteps: 0,
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    throw error;
  }
}

/**
 * Generate a business-friendly summary of the scan
 */
export function generateBusinessSummary(result: MentionScannerResult): string {
  let summary = `# Entity Authority Report: ${result.entityName}\n\n`;

  // Executive summary
  summary += `## Executive Summary\n\n`;
  summary += `**E-A-T Score:** ${result.eatScore}/100\n\n`;
  summary += `**Verification Status:** ${result.entityAuthority.verificationStatus}\n\n`;
  summary += `**Overall Sentiment:** ${result.overallSentiment}\n\n`;

  // E-A-T breakdown
  summary += `## E-A-T Breakdown\n\n`;
  summary += `| Dimension | Score | Key Signals |\n`;
  summary += `|-----------|-------|-------------|\n`;
  summary += `| Expertise | ${result.eatBreakdown.expertise.score}/100 | ${result.eatBreakdown.expertise.signals.slice(0, 2).join(', ') || 'None detected'} |\n`;
  summary += `| Authority | ${result.eatBreakdown.authority.score}/100 | ${result.eatBreakdown.authority.signals.slice(0, 2).join(', ') || 'None detected'} |\n`;
  summary += `| Trust | ${result.eatBreakdown.trust.score}/100 | ${result.eatBreakdown.trust.signals.slice(0, 2).join(', ') || 'None detected'} |\n`;

  // Priority actions
  const criticalRecs = result.recommendations.filter(r => r.priority === 'critical' || r.priority === 'high');
  if (criticalRecs.length > 0) {
    summary += `\n## Priority Actions\n\n`;
    for (const rec of criticalRecs.slice(0, 5)) {
      summary += `### ${rec.title}\n`;
      summary += `**Priority:** ${rec.priority.toUpperCase()}\n\n`;
      summary += `${rec.description}\n\n`;
      summary += `**Action:** ${rec.suggestedAction}\n\n`;
    }
  }

  return summary;
}

/**
 * Generate a technical report of the scan
 */
export function generateTechnicalReport(result: MentionScannerResult): string {
  let report = `# Technical Authority Report: ${result.entityName}\n\n`;
  report += `Generated: ${result.timestamp}\n\n`;

  // Identity verification
  report += `## Identity Verification\n\n`;
  report += `| Source | Status | Details |\n`;
  report += `|--------|--------|--------|\n`;
  report += `| Wikipedia | ${result.entityAuthority.wikipedia?.found ? '✓' : '✗'} | ${result.entityAuthority.wikipedia?.pageUrl || 'Not found'} |\n`;
  report += `| Wikidata | ${result.entityAuthority.wikidata ? '✓' : '✗'} | ${result.entityAuthority.wikidata?.id || 'Not found'} |\n`;
  report += `| Knowledge Graph | ${result.entityAuthority.knowledgeGraph ? '✓' : '✗'} | ${result.entityAuthority.knowledgeGraph?.type?.join(', ') || 'Not found'} |\n`;

  // Reputation signals
  report += `\n## Reputation Signals (${result.reputationSignals.length} sources)\n\n`;
  report += `| Source | Type | Sentiment | Mentions |\n`;
  report += `|--------|------|-----------|----------|\n`;
  for (const signal of result.reputationSignals) {
    report += `| ${signal.source} | ${signal.sourceType} | ${signal.sentiment} | ${signal.mentionCount} |\n`;
  }

  // Co-occurrences
  report += `\n## Entity Co-occurrences (${result.coOccurrences.length} entities)\n\n`;
  for (const cooc of result.coOccurrences.slice(0, 10)) {
    report += `- **${cooc.entity}** (${cooc.associationType}): ${cooc.contexts.slice(0, 2).join('; ')}\n`;
  }

  // All recommendations
  report += `\n## All Recommendations\n\n`;
  for (const rec of result.recommendations) {
    report += `### [${rec.priority.toUpperCase()}] ${rec.title}\n`;
    report += `Type: ${rec.type}\n\n`;
    report += `${rec.description}\n\n`;
    report += `Action: ${rec.suggestedAction}\n\n`;
    report += `Impact: ${rec.estimatedImpact}\n\n`;
  }

  return report;
}
