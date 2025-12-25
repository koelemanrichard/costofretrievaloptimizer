/**
 * Competitive Intelligence Wrapper
 *
 * A convenience wrapper that combines the useCompetitiveIntelligence hook
 * with the TopicSerpPanel component for easy integration.
 *
 * Created: December 25, 2024
 */

import React, { useCallback } from 'react';
import { EnrichedTopic, BusinessInfo } from '../../types';
import { useCompetitiveIntelligence } from '../../hooks/useCompetitiveIntelligence';
import { SerpMode } from '../../services/serpService';
import TopicSerpPanel from './TopicSerpPanel';

interface CompetitiveIntelligenceWrapperProps {
  /** Topic to analyze */
  topic: EnrichedTopic;
  /** Business info with API keys */
  businessInfo: BusinessInfo;
  /** Optional class name */
  className?: string;
}

/**
 * Wrapper component that handles all the competitive intelligence logic
 * and renders the TopicSerpPanel with the correct props.
 */
const CompetitiveIntelligenceWrapper: React.FC<CompetitiveIntelligenceWrapperProps> = ({
  topic,
  businessInfo,
  className,
}) => {
  const {
    status,
    progress,
    progressDetail,
    intelligence,
    error,
    analyze,
    isDeepModeAvailable,
  } = useCompetitiveIntelligence(businessInfo);

  // Wrap analyze to match the expected signature (mode only)
  const handleAnalyze = useCallback((mode: SerpMode) => {
    analyze(topic.title, mode, topic.id);
  }, [analyze, topic.title, topic.id]);

  return (
    <TopicSerpPanel
      topic={topic.title}
      intelligence={intelligence}
      isLoading={status === 'loading'}
      progress={progress}
      progressDetail={progressDetail}
      error={error || undefined}
      onAnalyze={handleAnalyze}
      deepModeAvailable={isDeepModeAvailable}
      className={className}
    />
  );
};

export default CompetitiveIntelligenceWrapper;
