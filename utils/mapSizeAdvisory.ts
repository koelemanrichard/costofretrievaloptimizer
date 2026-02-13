// utils/mapSizeAdvisory.ts
// Centralized map size advisory logic for user warnings

import { SERVICE_REGISTRY } from '../config/serviceRegistry';

export type AdvisoryLevel = 'info' | 'warning' | 'critical';

export interface MapSizeAdvisory {
  level: AdvisoryLevel;
  message: string;
  suggestion: string;
}

/**
 * Returns a map size advisory based on topic count, or null if under threshold.
 */
export function getMapSizeAdvisory(topicCount: number): MapSizeAdvisory | null {
  const { optimalMax, warningThreshold, performanceRisk, splitAdvisory } = SERVICE_REGISTRY.limits.topicMap;

  if (topicCount >= splitAdvisory) {
    return {
      level: 'critical',
      message: `This map has ${topicCount} topics — well beyond the recommended maximum of ${optimalMax}.`,
      suggestion: 'Consider splitting into 2–3 focused maps (e.g., by service category or audience segment). Large maps cause slower AI analysis, degraded UI performance, and diminishing SEO returns.'
    };
  }

  if (topicCount >= performanceRisk) {
    return {
      level: 'warning',
      message: `This map has ${topicCount} topics. Performance may degrade above ${performanceRisk}.`,
      suggestion: 'Consider consolidating redundant topics or splitting the map. Use "Find Merge Opportunities" to identify candidates.'
    };
  }

  if (topicCount >= warningThreshold) {
    return {
      level: 'info',
      message: `This map has ${topicCount} topics — above the optimal range of 80–${optimalMax}.`,
      suggestion: 'Holistic SEO research shows diminishing returns beyond ~150 topics per map. Ensure each topic serves a distinct search intent.'
    };
  }

  return null;
}
