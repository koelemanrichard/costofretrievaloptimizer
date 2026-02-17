import { v4 as uuidv4 } from 'uuid';
import type { SEOPillars } from '../../types';
import { FreshnessProfile } from '../../types';
import type { DiscoveredCluster } from './siteStructureDiscovery';

export interface AugmentedMapInput {
  clusters: DiscoveredCluster[];
  orphans: { id: string; url: string }[];
  suggestedHierarchy: { parentCluster: string; childClusters: string[] }[];
  pillars: SEOPillars;
}

export interface AugmentedTopic {
  id: string;
  map_id: string;
  title: string;
  slug: string;
  description: string;
  type: 'core' | 'outer' | 'child';
  freshness: FreshnessProfile;
  parent_topic_id: string | null;
  source: 'discovered' | 'generated' | 'manual';
  coveredByInventoryIds: string[];
}

export interface AugmentedMapResult {
  topics: AugmentedTopic[];
  discoveredCount: number;
  gapCount: number;
}

interface AugmentedMapGeneratorConfig {
  generateGapsFn: (prompt: string) => Promise<{ gapTopics: { title: string; type: string; description: string }[] }>;
}

export class AugmentedMapGenerator {
  private config: AugmentedMapGeneratorConfig;

  constructor(config: AugmentedMapGeneratorConfig) {
    this.config = config;
  }

  async generate(input: AugmentedMapInput): Promise<AugmentedMapResult> {
    const topics: AugmentedTopic[] = [];

    // Phase 1: Convert discovered clusters to topics
    for (const cluster of input.clusters) {
      const topic: AugmentedTopic = {
        id: uuidv4(),
        map_id: '',
        title: cluster.suggestedTopicTitle,
        slug: this.slugify(cluster.suggestedTopicTitle),
        description: `Discovered from ${cluster.pages.length} existing page(s)`,
        type: cluster.coreOrOuter,
        freshness: FreshnessProfile.EVERGREEN,
        parent_topic_id: null,
        source: 'discovered',
        coveredByInventoryIds: cluster.pages.map(p => p.id),
      };
      topics.push(topic);
    }

    // Phase 2: Set hierarchy from discovered parent-child relationships
    for (const h of input.suggestedHierarchy) {
      const parent = topics.find(t => t.title === h.parentCluster);
      if (parent) {
        for (const childCE of h.childClusters) {
          const child = topics.find(t => t.title === childCE);
          if (child) {
            child.parent_topic_id = parent.id;
          }
        }
      }
    }

    // Phase 3: Ask AI to identify gap topics
    const existingTopicTitles = topics.map(t => t.title);
    const prompt = this.buildGapPrompt(input.pillars, existingTopicTitles);

    try {
      const gapResponse = await this.config.generateGapsFn(prompt);

      for (const gap of gapResponse.gapTopics || []) {
        const gapTopic: AugmentedTopic = {
          id: uuidv4(),
          map_id: '',
          title: gap.title,
          slug: this.slugify(gap.title),
          description: gap.description,
          type: gap.type === 'core' ? 'core' : 'outer',
          freshness: FreshnessProfile.EVERGREEN,
          parent_topic_id: null,
          source: 'generated',
          coveredByInventoryIds: [],
        };
        topics.push(gapTopic);
      }
    } catch (err) {
      console.warn('[AugmentedMapGenerator] Gap analysis failed:', err);
    }

    return {
      topics,
      discoveredCount: topics.filter(t => t.source === 'discovered').length,
      gapCount: topics.filter(t => t.source === 'generated').length,
    };
  }

  private buildGapPrompt(pillars: SEOPillars, existingTopics: string[]): string {
    return `You are a Holistic SEO strategist. Given:

CENTRAL ENTITY: ${pillars.centralEntity}
SOURCE CONTEXT: ${pillars.sourceContext}
CENTRAL SEARCH INTENT: ${pillars.centralSearchIntent}

EXISTING TOPICS ALREADY COVERED:
${existingTopics.map(t => `- ${t}`).join('\n')}

Identify 5-15 GAP topics that are MISSING for complete topical authority on "${pillars.centralEntity}".
Only suggest topics NOT already covered above.

Return JSON: {
  "gapTopics": [
    { "title": "string", "type": "core|outer", "description": "string" }
  ]
}`;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
