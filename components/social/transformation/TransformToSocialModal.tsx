/**
 * TransformToSocialModal Component
 *
 * Main modal for transforming article content into social media posts.
 * Guides users through platform selection, template configuration, preview,
 * and provides full campaign management with export/edit capabilities.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import type {
  SocialMediaPlatform,
  SocialPostTemplate,
  PlatformSelection,
  SocialCampaign,
  SocialPost,
  CampaignComplianceReport,
  ArticleTransformationSource,
  TransformationConfig
} from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';
import { PlatformSelector } from './PlatformSelector';
import { TemplateSelector } from './TemplateSelector';
import { SocialCampaignManager } from '../SocialCampaignManager';

type ModalStep = 'select_platforms' | 'configure' | 'generating' | 'manage';

interface TransformToSocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: ArticleTransformationSource;
  templates?: Record<SocialMediaPlatform, SocialPostTemplate[]>;
  onTransform: (config: TransformationConfig) => Promise<{
    campaign: SocialCampaign;
    posts: SocialPost[];
    complianceReport: CampaignComplianceReport;
  }>;
  onComplete?: (campaign: SocialCampaign, posts: SocialPost[]) => void;
  onUpdatePost?: (postId: string, updates: Partial<SocialPost>) => Promise<boolean>;
  onExportCampaign?: (campaign: SocialCampaign, posts: SocialPost[], format: 'json' | 'text' | 'zip') => Promise<void>;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  userId?: string;
}

const STEP_TITLES: Record<ModalStep, string> = {
  select_platforms: 'Select Platforms',
  configure: 'Configure Templates',
  generating: 'Generating Posts',
  manage: 'Manage Campaign'
};

const DEFAULT_TEMPLATES: Record<SocialMediaPlatform, SocialPostTemplate[]> = {
  linkedin: [],
  twitter: [],
  facebook: [],
  instagram: [],
  pinterest: []
};

export const TransformToSocialModal: React.FC<TransformToSocialModalProps> = ({
  isOpen,
  onClose,
  source,
  templates = DEFAULT_TEMPLATES,
  onTransform,
  onComplete,
  onUpdatePost,
  onExportCampaign,
  supabaseUrl,
  supabaseAnonKey,
  userId
}) => {
  const [step, setStep] = useState<ModalStep>('select_platforms');
  const [selections, setSelections] = useState<PlatformSelection[]>([]);
  const [hubPlatform, setHubPlatform] = useState<SocialMediaPlatform>('linkedin');
  const [utmCampaign, setUtmCampaign] = useState(source.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50));
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [maxSpokePosts, setMaxSpokePosts] = useState(7);

  const [generatedCampaign, setGeneratedCampaign] = useState<SocialCampaign | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<SocialPost[]>([]);
  const [complianceReport, setComplianceReport] = useState<CampaignComplianceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select_platforms');
      setSelections([]);
      setGeneratedCampaign(null);
      setGeneratedPosts([]);
      setComplianceReport(null);
      setError(null);
    }
  }, [isOpen]);

  const handleNext = useCallback(async () => {
    switch (step) {
      case 'select_platforms':
        if (selections.length === 0) {
          setError('Please select at least one platform');
          return;
        }
        setError(null);
        setStep('configure');
        break;

      case 'configure':
        setStep('generating');
        setIsGenerating(true);
        setError(null);

        try {
          const config: TransformationConfig = {
            platforms: selections,
            hub_platform: hubPlatform,
            utm_campaign: utmCampaign,
            include_hashtags: includeHashtags,
            max_spoke_posts: maxSpokePosts
          };

          const result = await onTransform(config);
          setGeneratedCampaign(result.campaign);
          setGeneratedPosts(result.posts);
          setComplianceReport(result.complianceReport);
          setStep('manage');

          // Notify parent
          if (onComplete) {
            onComplete(result.campaign, result.posts);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to generate posts');
          setStep('configure');
        } finally {
          setIsGenerating(false);
        }
        break;

      case 'manage':
        onClose();
        break;
    }
  }, [step, selections, hubPlatform, utmCampaign, includeHashtags, maxSpokePosts, onTransform, onComplete, onClose]);

  const handleBack = useCallback(() => {
    switch (step) {
      case 'configure':
        setStep('select_platforms');
        break;
      case 'manage':
        // Can't go back from manage - campaign is already saved
        break;
    }
  }, [step]);

  // Handle post updates (persisted locally and optionally to DB)
  const handleUpdatePost = useCallback(async (postId: string, updates: Partial<SocialPost>): Promise<boolean> => {
    // Update local state first
    setGeneratedPosts(prev => prev.map(post =>
      post.id === postId ? { ...post, ...updates } : post
    ));

    // If parent handler provided, also persist to DB
    if (onUpdatePost) {
      return onUpdatePost(postId, updates);
    }

    return true;
  }, [onUpdatePost]);

  // Handle marking post as posted
  const handleMarkAsPosted = useCallback(async (postId: string, postUrl?: string): Promise<boolean> => {
    const updates: Partial<SocialPost> = {
      status: 'posted',
      manually_posted_at: new Date().toISOString(),
      platform_post_url: postUrl
    };

    return handleUpdatePost(postId, updates);
  }, [handleUpdatePost]);

  // Handle unmarking post as posted
  const handleUnmarkAsPosted = useCallback(async (postId: string): Promise<boolean> => {
    const updates: Partial<SocialPost> = {
      status: 'ready',
      manually_posted_at: undefined,
      platform_post_url: undefined
    };

    return handleUpdatePost(postId, updates);
  }, [handleUpdatePost]);

  // Handle campaign export
  const handleExportCampaign = useCallback(async (format: 'json' | 'text' | 'zip') => {
    if (!generatedCampaign || !generatedPosts.length) return;

    setIsExporting(true);
    try {
      if (onExportCampaign) {
        await onExportCampaign(generatedCampaign, generatedPosts, format);
      } else {
        // Default export handling
        let content: string;
        let filename: string;
        let mimeType: string;

        const campaignSlug = generatedCampaign.campaign_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'campaign';
        const timestamp = new Date().toISOString().slice(0, 10);

        if (format === 'json') {
          content = JSON.stringify({ campaign: generatedCampaign, posts: generatedPosts }, null, 2);
          filename = `${campaignSlug}-${timestamp}.json`;
          mimeType = 'application/json';
        } else if (format === 'text') {
          content = buildMarkdownExport(generatedCampaign, generatedPosts);
          filename = `${campaignSlug}-${timestamp}.md`;
          mimeType = 'text/markdown';
        } else {
          // ZIP format - simplified fallback
          content = JSON.stringify({ campaign: generatedCampaign, posts: generatedPosts }, null, 2);
          filename = `${campaignSlug}-${timestamp}.json`;
          mimeType = 'application/json';
        }

        // Download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [generatedCampaign, generatedPosts, onExportCampaign]);

  const canProceed = () => {
    switch (step) {
      case 'select_platforms':
        return selections.length > 0;
      case 'configure':
        return selections.every(s => s.template_type);
      case 'generating':
        return false;
      case 'manage':
        return true;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'select_platforms':
        return (
          <div className="space-y-6">
            {/* Source info */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Source Content</h4>
              <p className="text-white font-medium">{source.title}</p>
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{source.meta_description}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span>{source.key_takeaways.length} key takeaways</span>
                <span>{source.schema_entities.length} entities</span>
                <span>{source.contextual_vectors.length} EAVs</span>
              </div>
            </div>

            <PlatformSelector
              selections={selections}
              onChange={setSelections}
              hubPlatform={hubPlatform}
              onHubPlatformChange={setHubPlatform}
              maxSpokePosts={maxSpokePosts}
            />
          </div>
        );

      case 'configure':
        return (
          <div className="space-y-6">
            <TemplateSelector
              selections={selections}
              templates={templates}
              onChange={setSelections}
              hubPlatform={hubPlatform}
            />

            {/* Additional options */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 space-y-4">
              <h4 className="text-sm font-semibold text-gray-300">Campaign Settings</h4>

              {/* UTM Campaign */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">UTM Campaign Name</label>
                <input
                  type="text"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="my-campaign-name"
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Hashtags toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHashtags}
                  onChange={(e) => setIncludeHashtags(e.target.checked)}
                  className="rounded border-gray-600"
                />
                Include hashtags in posts
              </label>

              {/* Max spoke posts */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Spoke Posts</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="7"
                    value={maxSpokePosts}
                    onChange={(e) => setMaxSpokePosts(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-white w-4">{maxSpokePosts}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'generating':
        return (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
            <p className="text-white font-medium">Generating social posts...</p>
            <p className="text-sm text-gray-400 mt-2">
              Creating {selections.reduce((sum, s) => sum + s.post_count, 0)} posts across {selections.length} platforms
            </p>
          </div>
        );

      case 'manage':
        return generatedCampaign ? (
          <SocialCampaignManager
            campaign={generatedCampaign}
            posts={generatedPosts}
            complianceReport={complianceReport || undefined}
            onUpdatePost={handleUpdatePost}
            onMarkAsPosted={handleMarkAsPosted}
            onUnmarkAsPosted={handleUnmarkAsPosted}
            onExportCampaign={handleExportCampaign}
            isExporting={isExporting}
          />
        ) : null;
    }
  };

  const renderFooter = () => {
    if (step === 'generating') {
      return null;
    }

    if (step === 'manage') {
      return (
        <div className="flex items-center justify-end w-full gap-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between w-full">
        <div>
          {step !== 'select_platforms' && (
            <Button variant="ghost" onClick={handleBack}>
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isGenerating}
          >
            {step === 'configure' ? 'Generate Posts' : 'Continue'}
          </Button>
        </div>
      </div>
    );
  };

  // Step indicator (only for setup steps)
  const setupSteps: ModalStep[] = ['select_platforms', 'configure'];
  const currentStepIndex = setupSteps.indexOf(step);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={STEP_TITLES[step]}
      maxWidth={step === 'manage' ? 'max-w-5xl' : 'max-w-4xl'}
      footer={renderFooter()}
    >
      {/* Step indicator (only during setup) */}
      {step !== 'manage' && step !== 'generating' && (
        <div className="flex items-center justify-center gap-2 mb-6">
          {setupSteps.map((s, i) => {
            const isActive = i === currentStepIndex;
            const isComplete = i < currentStepIndex;

            return (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 ${
                  isActive ? 'text-blue-400' : isComplete ? 'text-green-400' : 'text-gray-500'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    isActive ? 'border-blue-400 bg-blue-400/20' :
                    isComplete ? 'border-green-400 bg-green-400/20' :
                    'border-gray-600'
                  }`}>
                    {isComplete ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm">{i + 1}</span>
                    )}
                  </div>
                  <span className="text-sm hidden sm:inline">{STEP_TITLES[s]}</span>
                </div>
                {i < setupSteps.length - 1 && (
                  <div className={`w-8 h-0.5 ${
                    i < currentStepIndex ? 'bg-green-400' : 'bg-gray-600'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className={step === 'manage' ? 'min-h-[500px]' : ''}>
        {renderStepContent()}
      </div>
    </Modal>
  );
};

// Helper function to build markdown export
function buildMarkdownExport(campaign: SocialCampaign, posts: SocialPost[]): string {
  let content = `# Social Media Campaign: ${campaign.campaign_name || 'Untitled'}\n\n`;
  content += `Created: ${new Date(campaign.created_at).toLocaleDateString()}\n`;
  content += `UTM Campaign: ${campaign.utm_campaign || 'N/A'}\n\n`;
  content += `---\n\n`;

  // Group by platform
  const byPlatform = posts.reduce((acc, post) => {
    if (!acc[post.platform]) acc[post.platform] = [];
    acc[post.platform].push(post);
    return acc;
  }, {} as Record<string, SocialPost[]>);

  for (const [platform, platformPosts] of Object.entries(byPlatform)) {
    const config = SOCIAL_PLATFORM_CONFIG[platform as SocialMediaPlatform];
    content += `## ${config.name}\n\n`;

    for (const post of platformPosts) {
      content += `### ${post.is_hub ? 'Hub Post' : `Spoke #${post.spoke_position || 1}`}\n\n`;
      content += `**Type:** ${post.post_type}\n\n`;
      content += `**Content:**\n\n${post.content_text}\n\n`;

      if (post.hashtags && post.hashtags.length > 0) {
        content += `**Hashtags:** ${post.hashtags.map(h => `#${h}`).join(' ')}\n\n`;
      }

      if (post.link_url) {
        content += `**Link:** ${post.link_url}\n\n`;
      }

      if (post.posting_instructions) {
        content += `**Instructions:**\n\n${post.posting_instructions}\n\n`;
      }

      content += `---\n\n`;
    }
  }

  return content;
}

export default TransformToSocialModal;
