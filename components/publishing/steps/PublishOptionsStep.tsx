/**
 * Publish Options Step
 *
 * Step 4 of Style & Publish modal.
 * WordPress publishing with style injection options.
 *
 * @module components/publishing/steps/PublishOptionsStep
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Label } from '../../ui/Label';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import type { EnrichedTopic, ContentBrief } from '../../../types';
import type {
  PublishingStyle,
  LayoutConfiguration,
  StyledContentOutput,
  StyleInjectionMethod,
} from '../../../types/publishing';
import type { WordPressConnection, PublishOptions } from '../../../types/wordpress';
import { useAppState } from '../../../state/appState';
import { getConnectionsForUser } from '../../../services/wordpress/connectionService';
import { publishTopic } from '../../../services/wordpress/publicationService';
import { getSupabaseClient } from '../../../services/supabaseClient';

// ============================================================================
// Types
// ============================================================================

interface PublishOptionsStepProps {
  topic: EnrichedTopic;
  brief?: ContentBrief;
  style: PublishingStyle;
  layout: LayoutConfiguration;
  styledContent: StyledContentOutput;
  supabaseUrl: string;
  supabaseAnonKey: string;
  onSuccess: () => void;
}

interface FormState {
  connectionId: string;
  postType: 'post' | 'page';
  status: 'draft' | 'publish' | 'pending';
  categoryId: string;
  tags: string;
  focusKeyword: string;
  metaDescription: string;
  injectionMethod: StyleInjectionMethod;
  includeProgressBar: boolean;
  includeTocScript: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const PublishOptionsStep: React.FC<PublishOptionsStepProps> = ({
  topic,
  brief,
  style,
  layout,
  styledContent,
  supabaseUrl,
  supabaseAnonKey,
  onSuccess,
}) => {
  const { state } = useAppState();

  // Get supabase client
  const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

  // Form state
  const [form, setForm] = useState<FormState>({
    connectionId: '',
    postType: 'post',
    status: 'draft',
    categoryId: '',
    tags: (topic.title || '').toLowerCase().replace(/\s+/g, ', '),
    focusKeyword: brief?.targetKeyword || topic.title || '',
    metaDescription: brief?.metaDescription || '',
    injectionMethod: 'scoped-css',
    includeProgressBar: layout.components.readingExperience?.progressBar ?? true,
    includeTocScript: layout.components.toc?.enabled ?? true,
  });

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [connections, setConnections] = useState<WordPressConnection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);

  // Load WordPress connections
  useEffect(() => {
    const loadConnections = async () => {
      setIsLoadingConnections(true);
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No authenticated user');
          setConnections([]);
          return;
        }

        // Fetch real WordPress connections for this user
        const userConnections = await getConnectionsForUser(supabase, user.id);

        // Filter to only verified connections
        const verifiedConnections = userConnections.filter(
          conn => conn.status === 'verified' || conn.status === 'pending'
        );

        setConnections(verifiedConnections);

        // Set default connection if available
        if (verifiedConnections.length > 0) {
          setForm(f => ({ ...f, connectionId: verifiedConnections[0].id }));
        }
      } catch (error) {
        console.error('Error loading connections:', error);
        setConnections([]);
      } finally {
        setIsLoadingConnections(false);
      }
    };

    loadConnections();
  }, []);

  // Update form field
  const updateField = useCallback(<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setForm(f => ({ ...f, [field]: value }));
  }, []);

  // Handle publish
  const handlePublish = useCallback(async () => {
    if (!form.connectionId) {
      setPublishError('Please select a WordPress site');
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Build publish options
      const publishOptions: PublishOptions = {
        status: form.status,
        post_type: form.postType,
        // Parse tags from comma-separated string
        tags: form.tags
          ? form.tags.split(',').map(t => t.trim()).filter(Boolean).map(() => 0) // Note: Would need to resolve tag names to IDs
          : undefined,
        categories: form.categoryId ? [parseInt(form.categoryId, 10)] : undefined,
        // SEO settings
        yoast_meta: {
          focus_keyword: form.focusKeyword,
          meta_description: form.metaDescription,
        },
        rankmath_meta: {
          focus_keyword: form.focusKeyword,
          meta_description: form.metaDescription,
        },
        // Styled content configuration
        styled_content: {
          html: styledContent.html,
          css: styledContent.css,
          injection_method: form.injectionMethod,
          include_scripts: form.includeProgressBar || form.includeTocScript,
        },
        // Store style and layout config for future reference
        style_config: style,
        layout_config: layout,
      };

      // Get the article draft content (we use the raw markdown stored on the topic)
      // The publication service will use the styled_content if provided
      const articleDraft = styledContent.html; // Using styled HTML as the base content

      // Call the real publication service
      const result = await publishTopic(
        supabase,
        user.id,
        form.connectionId,
        topic,
        articleDraft,
        brief,
        publishOptions
      );

      if (!result.success) {
        throw new Error(result.error || 'Publication failed');
      }

      console.log('[Style & Publish] Successfully published:', {
        publicationId: result.publication?.id,
        wpPostId: result.wpPost?.id,
        wpPostUrl: result.wpPost?.link,
      });

      onSuccess();
    } catch (error) {
      console.error('Error publishing:', error);
      setPublishError(error instanceof Error ? error.message : 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  }, [form, styledContent, style, layout, topic, brief, onSuccess]);

  return (
    <div className="space-y-6">
      {/* WordPress Connection */}
      <div className="space-y-3">
        <Label>WordPress Site</Label>
        {isLoadingConnections ? (
          <div className="p-4 bg-gray-800 rounded-lg text-gray-400 text-sm">
            Loading connections...
          </div>
        ) : connections.length === 0 ? (
          <div className="p-4 bg-gray-800 rounded-lg border border-yellow-500/30">
            <p className="text-yellow-400 text-sm mb-2">No WordPress sites connected</p>
            <p className="text-gray-400 text-xs">
              Connect a WordPress site in Settings to enable publishing.
              Your styled content is ready and can be copied manually.
            </p>
          </div>
        ) : (
          <Select
            value={form.connectionId}
            onChange={e => updateField('connectionId', e.target.value)}
          >
            <option value="">Select a site...</option>
            {connections.map(conn => (
              <option key={conn.id} value={conn.id}>
                {conn.site_name || conn.site_url}
                {conn.site_name ? ` (${conn.site_url})` : ''}
                {conn.status === 'pending' ? ' [Pending verification]' : ''}
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* Post Settings */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Post Type</Label>
          <Select
            value={form.postType}
            onChange={e => updateField('postType', e.target.value as 'post' | 'page')}
          >
            <option value="post">Post</option>
            <option value="page">Page</option>
          </Select>
        </div>

        <div>
          <Label>Status</Label>
          <Select
            value={form.status}
            onChange={e => updateField('status', e.target.value as 'draft' | 'publish' | 'pending')}
          >
            <option value="draft">Draft</option>
            <option value="publish">Publish</option>
            <option value="pending">Pending Review</option>
          </Select>
        </div>

        <div>
          <Label>Category</Label>
          <Select
            value={form.categoryId}
            onChange={e => updateField('categoryId', e.target.value)}
          >
            <option value="">Uncategorized</option>
            {/* Categories would be loaded from WordPress */}
          </Select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <Input
          value={form.tags}
          onChange={e => updateField('tags', e.target.value)}
          placeholder="Comma-separated tags"
        />
      </div>

      {/* SEO Settings */}
      <div className="space-y-3 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h4 className="text-sm font-medium text-white">SEO Settings</h4>

        <div>
          <Label>Focus Keyword</Label>
          <Input
            value={form.focusKeyword}
            onChange={e => updateField('focusKeyword', e.target.value)}
          />
        </div>

        <div>
          <Label>Meta Description</Label>
          <Textarea
            value={form.metaDescription}
            onChange={e => updateField('metaDescription', e.target.value)}
            rows={2}
            maxLength={160}
          />
          <p className="text-xs text-gray-500 mt-1">
            {form.metaDescription.length}/160 characters
          </p>
        </div>
      </div>

      {/* Style Injection Settings */}
      <div className="space-y-3 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h4 className="text-sm font-medium text-white">Style Injection</h4>

        <div>
          <Label>Method</Label>
          <Select
            value={form.injectionMethod}
            onChange={e => updateField('injectionMethod', e.target.value as StyleInjectionMethod)}
          >
            <option value="scoped-css">Scoped CSS (Recommended)</option>
            <option value="inline-styles">Inline Styles</option>
            <option value="theme-override">Theme Override</option>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            {form.injectionMethod === 'scoped-css' && 'Uses low-specificity selectors that work with any theme'}
            {form.injectionMethod === 'inline-styles' && 'Embeds CSS directly in the post (may conflict with theme)'}
            {form.injectionMethod === 'theme-override' && 'Overrides theme styles (may affect other content)'}
          </p>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.includeProgressBar}
              onChange={e => updateField('includeProgressBar', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500"
            />
            <span className="text-sm text-gray-300">Include progress bar script</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.includeTocScript}
              onChange={e => updateField('includeTocScript', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500"
            />
            <span className="text-sm text-gray-300">Include ToC/FAQ scripts</span>
          </label>
        </div>
      </div>

      {/* Error display */}
      {publishError && (
        <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{publishError}</p>
        </div>
      )}

      {/* Publish Summary */}
      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-400 mb-2">Ready to Publish</h4>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Title: <span className="text-white">{topic.title}</span></li>
          <li>• Template: <span className="text-white">{layout.template}</span></li>
          <li>• Style: <span className="text-white">{style.name}</span></li>
          <li>• Components: <span className="text-white">{styledContent.components.length} detected</span></li>
          <li>• SEO: <span className={styledContent.seoValidation.isValid ? 'text-green-400' : 'text-yellow-400'}>
            {styledContent.seoValidation.isValid ? 'Valid' : `${styledContent.seoValidation.warnings.length} warnings`}
          </span></li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        {/* Copy/Download buttons */}
        <div className="flex items-center gap-2">
          {/* Copy Styled HTML button - complete with CSS */}
          <Button
            variant="secondary"
            onClick={() => {
              // Generate complete standalone HTML with embedded CSS
              const completeHtml = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${topic.title}</title>
  <style>
${styledContent.css}
  </style>
</head>
<body>
${styledContent.html}
</body>
</html>`;
              navigator.clipboard.writeText(completeHtml);
            }}
          >
            📋 Copy Complete HTML
          </Button>

          {/* Download HTML button */}
          <Button
            variant="ghost"
            onClick={() => {
              // Generate complete standalone HTML with embedded CSS
              const completeHtml = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${topic.title}</title>
  <style>
${styledContent.css}
  </style>
</head>
<body>
${styledContent.html}
</body>
</html>`;
              // Create blob and download
              const blob = new Blob([completeHtml], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${topic.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.html`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
          >
            ⬇️ Download HTML
          </Button>
        </div>

        {/* Publish button */}
        <Button
          variant="primary"
          onClick={handlePublish}
          disabled={isPublishing || (!form.connectionId && connections.length > 0)}
        >
          {isPublishing ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Publishing...
            </>
          ) : (
            <>
              🚀 {form.status === 'publish' ? 'Publish Now' : form.status === 'draft' ? 'Save Draft' : 'Submit for Review'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PublishOptionsStep;
