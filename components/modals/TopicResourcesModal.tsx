// components/TopicResourcesModal.tsx
// Unified view of all generated artifacts for a topic

import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../../state/appState';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { getSupabaseClient } from '../../services/supabaseClient';
import { Modal } from '../ui/Modal';
import type {
  EnrichedTopic,
  ContentBrief,
  ContentGenerationJob,
  EnhancedSchemaResult,
  AuditDetails
} from '../../types';

interface TopicResourcesModalProps {
  isOpen: boolean;
  topic: EnrichedTopic | null;
  onClose: () => void;
}

interface ResourceStatus {
  exists: boolean;
  status: 'completed' | 'in_progress' | 'pending' | 'not_started' | 'failed';
  lastUpdated?: string;
  data?: unknown;
}

interface TopicResources {
  brief: ResourceStatus & { data?: ContentBrief };
  draft: ResourceStatus & { data?: string; wordCount?: number };
  schema: ResourceStatus & { data?: EnhancedSchemaResult; pageType?: string; entityCount?: number };
  audit: ResourceStatus & { data?: AuditDetails; score?: number };
}

const TopicResourcesModal: React.FC<TopicResourcesModalProps> = ({
  isOpen,
  topic,
  onClose
}) => {
  const { state, dispatch } = useAppState();
  const { businessInfo, topicalMaps, activeMapId } = state;

  const [isLoading, setIsLoading] = useState(false);
  const [resources, setResources] = useState<TopicResources | null>(null);
  const [job, setJob] = useState<ContentGenerationJob | null>(null);

  const activeMap = topicalMaps.find(m => m.id === activeMapId);
  const brief = topic ? activeMap?.briefs?.[topic.id] : null;

  // Fetch resources when modal opens
  useEffect(() => {
    if (!isOpen || !topic) {
      setResources(null);
      return;
    }

    const fetchResources = async () => {
      setIsLoading(true);
      try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

        // Initialize resources
        const newResources: TopicResources = {
          brief: { exists: false, status: 'not_started' },
          draft: { exists: false, status: 'not_started' },
          schema: { exists: false, status: 'not_started' },
          audit: { exists: false, status: 'not_started' }
        };

        // Check for brief
        if (brief) {
          newResources.brief = {
            exists: true,
            status: 'completed',
            data: brief,
            lastUpdated: brief.created_at
          };

          // Check for draft from brief
          if (brief.articleDraft) {
            newResources.draft = {
              exists: true,
              status: 'completed',
              data: brief.articleDraft,
              wordCount: brief.articleDraft.split(/\s+/).filter(Boolean).length
            };
          }
        }

        // Fetch content generation job for more detailed info
        const { data: jobData } = await supabase
          .from('content_generation_jobs')
          .select('*')
          .eq('brief_id', brief?.id || topic.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (jobData) {
          setJob(jobData as unknown as ContentGenerationJob);
          const jobStatus = jobData.status as string;

          // Update draft status from job
          if (jobData.draft_content) {
            const draftContent = jobData.draft_content as string;
            newResources.draft = {
              exists: true,
              status: 'completed',
              data: draftContent,
              wordCount: draftContent.split(/\s+/).filter(Boolean).length,
              lastUpdated: jobData.updated_at
            };
          } else if (jobStatus === 'in_progress') {
            newResources.draft = {
              exists: false,
              status: 'in_progress'
            };
          }

          // Update schema status from job
          if (jobData.schema_data) {
            const schemaData = jobData.schema_data as unknown as EnhancedSchemaResult;
            newResources.schema = {
              exists: true,
              status: 'completed',
              data: schemaData,
              pageType: schemaData.pageType,
              entityCount: schemaData.resolvedEntities?.length || 0,
              lastUpdated: jobData.updated_at
            };
          } else if (jobStatus === 'in_progress' && jobData.current_pass >= 9) {
            newResources.schema = {
              exists: false,
              status: 'in_progress'
            };
          } else if (jobData.current_pass < 9 && jobStatus !== 'failed') {
            newResources.schema = {
              exists: false,
              status: 'pending'
            };
          }

          // Update audit status from job
          if (jobData.audit_details && jobData.final_audit_score != null) {
            newResources.audit = {
              exists: true,
              status: 'completed',
              data: jobData.audit_details as unknown as AuditDetails,
              score: jobData.final_audit_score,
              lastUpdated: jobData.updated_at
            };
          } else if (jobStatus === 'in_progress' && jobData.current_pass >= 8) {
            newResources.audit = {
              exists: false,
              status: 'in_progress'
            };
          } else if (jobData.current_pass < 8 && jobStatus !== 'failed') {
            newResources.audit = {
              exists: false,
              status: 'pending'
            };
          }
        }

        setResources(newResources);
      } catch (err) {
        console.error('[TopicResourcesModal] Error fetching resources:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, [isOpen, topic, brief, businessInfo]);

  const getStatusBadge = (status: ResourceStatus['status']) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-600 text-green-100',
      in_progress: 'bg-yellow-600 text-yellow-100',
      pending: 'bg-gray-600 text-gray-200',
      not_started: 'bg-gray-800 text-gray-400',
      failed: 'bg-red-600 text-red-100'
    };
    const labels: Record<string, string> = {
      completed: 'Completed',
      in_progress: 'In Progress',
      pending: 'Pending',
      not_started: 'Not Started',
      failed: 'Failed'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const handleViewBrief = () => {
    if (!topic) return;
    dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: topic });
    dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'contentBrief', visible: true } });
    onClose();
  };

  const handleViewDraft = () => {
    if (!topic || !brief) return;
    dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: topic });
    dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'drafting', visible: true } });
    onClose();
  };

  const handleViewSchema = () => {
    if (!resources?.schema.data) return;
    dispatch({ type: 'SET_SCHEMA_RESULT', payload: resources.schema.data });
    dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'schema', visible: true } });
    onClose();
  };

  const handleViewAudit = () => {
    if (!topic || !brief) return;
    dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: topic });
    dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'audit', visible: true } });
    onClose();
  };

  const handleDownloadAll = useCallback(() => {
    if (!topic || !resources) return;

    const exportData: Record<string, unknown> = {
      topic: {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        url_slug_hint: topic.url_slug_hint
      }
    };

    if (resources.brief.data) {
      exportData.brief = resources.brief.data;
    }

    if (resources.draft.data) {
      exportData.draft = {
        content: resources.draft.data,
        wordCount: resources.draft.wordCount
      };
    }

    if (resources.schema.data) {
      exportData.schema = {
        pageType: resources.schema.pageType,
        entityCount: resources.schema.entityCount,
        schemaJson: resources.schema.data.schemaString,
        validation: resources.schema.data.validation
      };
    }

    if (resources.audit.data) {
      exportData.audit = {
        score: resources.audit.score,
        details: resources.audit.data
      };
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topic-resources-${topic.url_slug_hint || topic.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    dispatch({ type: 'SET_NOTIFICATION', payload: 'Resources exported successfully!' });
  }, [topic, resources, dispatch]);

  const handleDownloadSchema = useCallback(() => {
    if (!resources?.schema.data || !topic) return;

    const schemaHtml = `<script type="application/ld+json">\n${resources.schema.data.schemaString}\n</script>`;
    const blob = new Blob([schemaHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema-${topic.url_slug_hint || topic.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [topic, resources]);

  const handleDownloadDraft = useCallback(() => {
    if (!resources?.draft.data || !topic) return;

    const blob = new Blob([resources.draft.data as string], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `draft-${topic.url_slug_hint || topic.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [topic, resources]);

  if (!topic) return null;

  const customHeader = (
    <div className="flex-1">
      <h2 className="text-xl font-bold text-white">Topic Resources</h2>
      <p className="text-sm text-gray-400 mt-1 truncate max-w-lg">{topic.title}</p>
    </div>
  );

  const footer = (
    <div className="flex justify-between items-center w-full">
      <div className="text-xs text-gray-500">
        {resources && (
          <>{Object.values(resources).filter(r => r.exists).length} of 4 resources available</>
        )}
      </div>
      <div className="flex gap-2">
        {resources && Object.values(resources).some(r => r.exists) && (
          <Button onClick={handleDownloadAll} variant="secondary" className="text-xs" aria-label="Download all resources as JSON">
            Download All (JSON)
          </Button>
        )}
        <Button onClick={onClose} variant="ghost" className="text-xs">
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Topic Resources"
      description={`View all generated resources for "${topic.title}"`}
      maxWidth="max-w-2xl"
      customHeader={customHeader}
      footer={footer}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12" aria-live="polite">
          <Loader className="w-8 h-8" />
          <span className="ml-3 text-gray-400">Loading resources...</span>
        </div>
      ) : resources ? (
        <div className="space-y-4" role="list" aria-label="Topic resources">
          {/* Content Brief */}
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700" role="listitem">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">📋</span>
                <div>
                  <h3 className="font-semibold text-white">Content Brief</h3>
                  <p className="text-xs text-gray-400">Strategic outline and SEO guidance</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(resources.brief.status)}
                {resources.brief.exists && (
                  <Button onClick={handleViewBrief} variant="secondary" className="text-xs py-1 px-2">
                    View
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Article Draft */}
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700" role="listitem">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">📝</span>
                <div>
                  <h3 className="font-semibold text-white">Article Draft</h3>
                  <p className="text-xs text-gray-400">
                    {resources.draft.exists
                      ? `${resources.draft.wordCount?.toLocaleString()} words`
                      : 'Generated through 9-pass optimization'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(resources.draft.status)}
                {resources.draft.exists && (
                  <>
                    <Button onClick={handleViewDraft} variant="secondary" className="text-xs py-1 px-2">
                      View
                    </Button>
                    <Button onClick={handleDownloadDraft} variant="ghost" className="text-xs py-1 px-2" aria-label="Download draft">
                      ↓
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* JSON-LD Schema */}
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700" role="listitem">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">🔗</span>
                <div>
                  <h3 className="font-semibold text-white">JSON-LD Schema</h3>
                  <p className="text-xs text-gray-400">
                    {resources.schema.exists
                      ? `${resources.schema.pageType} • ${resources.schema.entityCount} entities`
                      : 'Structured data markup'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(resources.schema.status)}
                {resources.schema.exists && (
                  <>
                    <Button onClick={handleViewSchema} variant="secondary" className="text-xs py-1 px-2">
                      View
                    </Button>
                    <Button onClick={handleDownloadSchema} variant="ghost" className="text-xs py-1 px-2" aria-label="Download schema">
                      ↓
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Audit Results */}
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700" role="listitem">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">✅</span>
                <div>
                  <h3 className="font-semibold text-white">Content Audit</h3>
                  <p className="text-xs text-gray-400">
                    {resources.audit.exists
                      ? `Score: ${resources.audit.score}%`
                      : 'Quality and compliance checks'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(resources.audit.status)}
                {resources.audit.exists && resources.audit.score != null && (
                  <span className={`text-sm font-bold ${
                    resources.audit.score >= 80 ? 'text-green-400' :
                    resources.audit.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {resources.audit.score}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Generation Job Status */}
          {job && (
            <div className="p-3 bg-gray-900/50 rounded border border-gray-700" role="status">
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Content Generation Job</span>
                <span className="capitalize">{job.status} • Pass {job.current_pass}/9</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          No resources found for this topic.
        </div>
      )}
    </Modal>
  );
};

export default TopicResourcesModal;
