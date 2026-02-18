// services/ai/knowledgePanelBuilder.ts

/**
 * KnowledgePanelBuilder
 *
 * Analyzes and scores readiness for Google Knowledge Panel generation.
 * Knowledge Panels require consistent entity data across authoritative sources:
 * - Wikipedia/Wikidata presence
 * - Structured data coverage (schema.org)
 * - Social profiles linked
 * - Consistent NAP (Name, Address, Phone) for local entities
 * - Citations from authoritative sources
 */

export interface KnowledgePanelReadiness {
  /** Overall readiness score (0-100) */
  overallScore: number;
  /** Readiness level */
  level: 'not_ready' | 'building' | 'eligible' | 'strong';
  /** Detailed scores per dimension */
  dimensions: KPDimensionScores;
  /** Action items to improve readiness */
  actionItems: KPActionItem[];
  /** Entity type detected */
  entityType: 'person' | 'organization' | 'place' | 'product' | 'event' | 'other';
}

export interface KPDimensionScores {
  /** Schema.org structured data completeness */
  structuredData: number;
  /** Wikipedia/Wikidata presence */
  knowledgeBase: number;
  /** Social profile linking */
  socialProfiles: number;
  /** Citation consistency across web */
  citationConsistency: number;
  /** Image availability and quality */
  imageReadiness: number;
  /** Authority signals */
  authoritySignals: number;
}

export interface KPActionItem {
  /** Priority (1=highest) */
  priority: number;
  /** Category */
  category: keyof KPDimensionScores;
  /** Action description */
  action: string;
  /** Impact level */
  impact: 'high' | 'medium' | 'low';
  /** Current status */
  status: 'missing' | 'partial' | 'complete';
}

export interface EntityPresenceData {
  /** Entity name */
  entityName: string;
  /** Has Wikipedia article? */
  hasWikipedia?: boolean;
  /** Has Wikidata entry? */
  hasWikidata?: boolean;
  /** Wikidata QID if available */
  wikidataQid?: string;
  /** Schema types present on website */
  schemaTypes?: string[];
  /** Social profiles found */
  socialProfiles?: string[];
  /** Has logo/image? */
  hasLogo?: boolean;
  /** Has description/about? */
  hasDescription?: boolean;
  /** NAP consistency (for local businesses) */
  napConsistent?: boolean;
  /** Number of citing sources */
  citationCount?: number;
  /** Has sameAs links in schema? */
  sameAsLinks?: string[];
  /** Website has About page? */
  hasAboutPage?: boolean;
  /** Website has Contact page? */
  hasContactPage?: boolean;
}

export class KnowledgePanelBuilder {
  /**
   * Evaluate Knowledge Panel readiness for an entity.
   */
  static evaluate(data: EntityPresenceData): KnowledgePanelReadiness {
    const dimensions = this.scoreDimensions(data);
    const overallScore = this.calculateOverall(dimensions);
    const level = this.determineLevel(overallScore);
    const actionItems = this.generateActionItems(data, dimensions);
    const entityType = this.detectEntityType(data);

    return {
      overallScore,
      level,
      dimensions,
      actionItems,
      entityType,
    };
  }

  private static scoreDimensions(data: EntityPresenceData): KPDimensionScores {
    return {
      structuredData: this.scoreStructuredData(data),
      knowledgeBase: this.scoreKnowledgeBase(data),
      socialProfiles: this.scoreSocialProfiles(data),
      citationConsistency: this.scoreCitationConsistency(data),
      imageReadiness: this.scoreImageReadiness(data),
      authoritySignals: this.scoreAuthoritySignals(data),
    };
  }

  private static scoreStructuredData(data: EntityPresenceData): number {
    let score = 0;
    const types = data.schemaTypes || [];

    // Core entity type present
    if (types.some(t => ['Organization', 'Person', 'LocalBusiness', 'Product'].includes(t))) {
      score += 30;
    }

    // WebSite schema
    if (types.includes('WebSite')) score += 10;

    // BreadcrumbList
    if (types.includes('BreadcrumbList')) score += 10;

    // sameAs links
    if (data.sameAsLinks && data.sameAsLinks.length > 0) {
      score += Math.min(20, data.sameAsLinks.length * 5);
    }

    // Description/about
    if (data.hasDescription) score += 15;

    // Logo
    if (data.hasLogo) score += 15;

    return Math.min(100, score);
  }

  private static scoreKnowledgeBase(data: EntityPresenceData): number {
    let score = 0;
    if (data.hasWikidata) score += 50;
    if (data.hasWikipedia) score += 50;
    if (data.wikidataQid) score += 10; // Bonus for known QID
    return Math.min(100, score);
  }

  private static scoreSocialProfiles(data: EntityPresenceData): number {
    const profiles = data.socialProfiles || [];
    if (profiles.length === 0) return 0;

    // Each verified profile adds points, diminishing returns
    const perProfile = 25;
    return Math.min(100, profiles.length * perProfile);
  }

  private static scoreCitationConsistency(data: EntityPresenceData): number {
    if (data.napConsistent === false) return 20; // Inconsistent NAP is bad

    let score = 0;
    if (data.napConsistent === true) score += 40;
    if (data.citationCount !== undefined) {
      if (data.citationCount >= 50) score += 60;
      else if (data.citationCount >= 20) score += 40;
      else if (data.citationCount >= 5) score += 20;
      else score += 10;
    }

    return Math.min(100, score);
  }

  private static scoreImageReadiness(data: EntityPresenceData): number {
    let score = 0;
    if (data.hasLogo) score += 50;
    // Additional image criteria would check image quality, alt text, etc.
    // Stub for basic scoring
    score += 25; // Base score for having a website
    return Math.min(100, score);
  }

  private static scoreAuthoritySignals(data: EntityPresenceData): number {
    let score = 0;
    if (data.hasAboutPage) score += 25;
    if (data.hasContactPage) score += 25;
    if (data.hasWikipedia) score += 25;
    if ((data.citationCount || 0) >= 10) score += 25;
    return Math.min(100, score);
  }

  private static calculateOverall(dimensions: KPDimensionScores): number {
    // Weighted average
    const weights = {
      structuredData: 0.25,
      knowledgeBase: 0.25,
      socialProfiles: 0.10,
      citationConsistency: 0.15,
      imageReadiness: 0.10,
      authoritySignals: 0.15,
    };

    let total = 0;
    for (const [key, weight] of Object.entries(weights)) {
      total += dimensions[key as keyof KPDimensionScores] * weight;
    }

    return Math.round(total);
  }

  private static determineLevel(score: number): KnowledgePanelReadiness['level'] {
    if (score >= 80) return 'strong';
    if (score >= 60) return 'eligible';
    if (score >= 30) return 'building';
    return 'not_ready';
  }

  private static detectEntityType(data: EntityPresenceData): KnowledgePanelReadiness['entityType'] {
    const types = data.schemaTypes || [];
    if (types.includes('Person')) return 'person';
    if (types.includes('LocalBusiness') || types.includes('Organization')) return 'organization';
    if (types.includes('Place')) return 'place';
    if (types.includes('Product')) return 'product';
    if (types.includes('Event')) return 'event';
    return 'other';
  }

  private static generateActionItems(
    data: EntityPresenceData,
    dimensions: KPDimensionScores
  ): KPActionItem[] {
    const items: KPActionItem[] = [];

    // Structured Data actions
    if (dimensions.structuredData < 50) {
      if (!data.schemaTypes?.some(t => ['Organization', 'Person', 'LocalBusiness'].includes(t))) {
        items.push({
          priority: 1,
          category: 'structuredData',
          action: 'Add primary entity schema (Organization, Person, or LocalBusiness) to homepage.',
          impact: 'high',
          status: 'missing',
        });
      }
      if (!data.sameAsLinks || data.sameAsLinks.length === 0) {
        items.push({
          priority: 2,
          category: 'structuredData',
          action: 'Add sameAs links to social profiles and Wikipedia/Wikidata in schema.',
          impact: 'high',
          status: 'missing',
        });
      }
    }

    // Knowledge Base actions
    if (dimensions.knowledgeBase < 50) {
      if (!data.hasWikidata) {
        items.push({
          priority: 1,
          category: 'knowledgeBase',
          action: 'Create or claim a Wikidata entry for your entity.',
          impact: 'high',
          status: 'missing',
        });
      }
      if (!data.hasWikipedia) {
        items.push({
          priority: 2,
          category: 'knowledgeBase',
          action: 'Work toward Wikipedia notability and create/improve the Wikipedia article.',
          impact: 'high',
          status: 'missing',
        });
      }
    }

    // Social Profiles
    if (dimensions.socialProfiles < 50) {
      items.push({
        priority: 3,
        category: 'socialProfiles',
        action: 'Create and verify profiles on major platforms (LinkedIn, Twitter/X, Facebook, YouTube).',
        impact: 'medium',
        status: (data.socialProfiles?.length || 0) > 0 ? 'partial' : 'missing',
      });
    }

    // Citation Consistency
    if (dimensions.citationConsistency < 50) {
      items.push({
        priority: 2,
        category: 'citationConsistency',
        action: 'Ensure NAP (Name, Address, Phone) is consistent across all web citations and directories.',
        impact: 'high',
        status: data.napConsistent === true ? 'complete' : 'missing',
      });
    }

    // Authority Signals
    if (!data.hasAboutPage) {
      items.push({
        priority: 3,
        category: 'authoritySignals',
        action: 'Create a comprehensive About page with entity details, history, and credentials.',
        impact: 'medium',
        status: 'missing',
      });
    }
    if (!data.hasContactPage) {
      items.push({
        priority: 4,
        category: 'authoritySignals',
        action: 'Create a Contact page with verifiable contact information.',
        impact: 'low',
        status: 'missing',
      });
    }

    // Image
    if (!data.hasLogo) {
      items.push({
        priority: 3,
        category: 'imageReadiness',
        action: 'Add a high-quality logo with proper schema markup (logo property on Organization).',
        impact: 'medium',
        status: 'missing',
      });
    }

    // Sort by priority
    items.sort((a, b) => a.priority - b.priority);

    return items;
  }
}
