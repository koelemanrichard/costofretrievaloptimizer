/**
 * useReportGeneration Hook
 *
 * Comprehensive hook for generating reports from different parts of the application.
 * Handles data transformation, modal state, and export functionality.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  TopicalMap,
  ContentBrief,
  ContentGenerationJob,
  EnrichedTopic,
  SiteInventoryItem
} from '../types';
import {
  ReportType,
  TopicalMapReportData,
  ContentBriefReportData,
  ArticleDraftReportData,
  MigrationReportData
} from '../types/reports';
import {
  transformTopicalMapData,
  transformContentBriefData,
  transformArticleDraftData,
  transformMigrationData
} from '../services/reportDataTransformers';

interface UseReportGenerationOptions {
  // Topical Map context
  topicalMap?: TopicalMap;
  topics?: EnrichedTopic[];

  // Content Brief context
  brief?: ContentBrief | null;
  topic?: EnrichedTopic;

  // Article Draft context
  job?: ContentGenerationJob | null;

  // Migration context
  inventory?: SiteInventoryItem[];
  projectName?: string;
  domain?: string;
}

interface UseReportGenerationReturn {
  // Modal state
  isModalOpen: boolean;
  openModal: (type: ReportType) => void;
  closeModal: () => void;
  currentReportType: ReportType | null;

  // Transformed data
  reportData: TopicalMapReportData | ContentBriefReportData | ArticleDraftReportData | MigrationReportData | null;

  // Availability checks
  canGenerateTopicalMapReport: boolean;
  canGenerateContentBriefReport: boolean;
  canGenerateArticleDraftReport: boolean;
  canGenerateMigrationReport: boolean;
}

export const useReportGeneration = (options: UseReportGenerationOptions = {}): UseReportGenerationReturn => {
  const {
    topicalMap,
    topics = [],
    brief,
    topic,
    job,
    inventory = [],
    projectName,
    domain
  } = options;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentReportType, setCurrentReportType] = useState<ReportType | null>(null);

  // Availability checks
  const canGenerateTopicalMapReport = useMemo(() => {
    return !!topicalMap && topics.length > 0;
  }, [topicalMap, topics.length]);

  const canGenerateContentBriefReport = useMemo(() => {
    return !!brief;
  }, [brief]);

  const canGenerateArticleDraftReport = useMemo(() => {
    return !!job && !!brief && (job.status === 'completed' || !!job.draft_content);
  }, [job, brief]);

  const canGenerateMigrationReport = useMemo(() => {
    return inventory.length > 0;
  }, [inventory.length]);

  // Transform data based on report type
  const reportData = useMemo(() => {
    if (!currentReportType) return null;

    try {
      switch (currentReportType) {
        case 'topical-map':
          if (!topicalMap || topics.length === 0) return null;
          return transformTopicalMapData(topicalMap, topics);

        case 'content-brief':
          if (!brief) return null;
          return transformContentBriefData(brief, topic);

        case 'article-draft':
          if (!job || !brief) return null;
          return transformArticleDraftData(job, brief);

        case 'migration':
          if (inventory.length === 0) return null;
          return transformMigrationData(
            inventory,
            topics,
            undefined, // auditResult - optional
            projectName,
            domain
          );

        default:
          return null;
      }
    } catch (error) {
      console.error(`[useReportGeneration] Failed to transform data for ${currentReportType}:`, error);
      return null;
    }
  }, [currentReportType, topicalMap, topics, brief, topic, job, inventory, projectName, domain]);

  const openModal = useCallback((type: ReportType) => {
    setCurrentReportType(type);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    // Don't clear reportType immediately to allow modal fade-out
    setTimeout(() => setCurrentReportType(null), 300);
  }, []);

  return {
    isModalOpen,
    openModal,
    closeModal,
    currentReportType,
    reportData,
    canGenerateTopicalMapReport,
    canGenerateContentBriefReport,
    canGenerateArticleDraftReport,
    canGenerateMigrationReport
  };
};

/**
 * Simplified hook for single report type
 */
export const useTopicalMapReport = (topicalMap?: TopicalMap, topics?: EnrichedTopic[]) => {
  const hook = useReportGeneration({ topicalMap, topics });
  return {
    isOpen: hook.isModalOpen && hook.currentReportType === 'topical-map',
    open: () => hook.openModal('topical-map'),
    close: hook.closeModal,
    data: hook.reportData as TopicalMapReportData | null,
    canGenerate: hook.canGenerateTopicalMapReport
  };
};

export const useContentBriefReport = (brief?: ContentBrief | null, topic?: EnrichedTopic) => {
  const hook = useReportGeneration({ brief, topic });
  return {
    isOpen: hook.isModalOpen && hook.currentReportType === 'content-brief',
    open: () => hook.openModal('content-brief'),
    close: hook.closeModal,
    data: hook.reportData as ContentBriefReportData | null,
    canGenerate: hook.canGenerateContentBriefReport
  };
};

export const useArticleDraftReport = (job?: ContentGenerationJob | null, brief?: ContentBrief | null) => {
  const hook = useReportGeneration({ job, brief });
  return {
    isOpen: hook.isModalOpen && hook.currentReportType === 'article-draft',
    open: () => hook.openModal('article-draft'),
    close: hook.closeModal,
    data: hook.reportData as ArticleDraftReportData | null,
    canGenerate: hook.canGenerateArticleDraftReport
  };
};

export const useMigrationReport = (
  inventory?: SiteInventoryItem[],
  topics?: EnrichedTopic[],
  projectName?: string,
  domain?: string
) => {
  const hook = useReportGeneration({ inventory, topics, projectName, domain });
  return {
    isOpen: hook.isModalOpen && hook.currentReportType === 'migration',
    open: () => hook.openModal('migration'),
    close: hook.closeModal,
    data: hook.reportData as MigrationReportData | null,
    canGenerate: hook.canGenerateMigrationReport
  };
};

export default useReportGeneration;
