// components/modals/drafting/PublishingExport.tsx
// Handles HTML export, package download, WordPress publishing, and social media transformations

import { useCallback, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { useDraftingContext } from './DraftingContext';
import { replaceImagePlaceholdersWithUrls } from './ImageManager';
import { ImagePlaceholder, ContentBrief } from '../../../types';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { batchedIn } from '../../../utils/supabaseBatchQuery';
import { slugify } from '../../../utils/helpers';
import {
  convertMarkdownToBasicHtml,
  convertMarkdownToSemanticHtml,
  extractCenterpiece,
  buildFullHtmlDocument,
  validateForExport,
  cleanForExport,
  appendRelatedTopicsToContent,
  RelatedTopicLink,
  generateSlug,
} from '../../../services/contentAssemblyService';
import type { ArticleTransformationSource, TransformationConfig, SocialCampaign, SocialPost } from '../../../types/social';
import { transformArticleToSocialPosts } from '../../../services/social/transformation/contentTransformer';

export interface PublishingExportHook {
  // Copy/Download
  handleCopyHtml: () => Promise<void>;
  handleDownloadHtml: (embedImages: boolean) => Promise<void>;
  handleDownloadPackage: () => Promise<void>;

  // Related topics
  handleAddRelatedTopics: () => Promise<void>;

  // Social media
  socialTransformSource: ArticleTransformationSource | null;
  handleSocialTransform: (config: TransformationConfig) => Promise<{
    campaign: SocialCampaign;
    posts: SocialPost[];
    complianceReport: {
      overall_score: number;
      entity_consistency: { score: number; issues: string[] };
      eav_coverage: { score: number; issues: string[] };
      information_density: { score: number; issues: string[] };
      semantic_distance: { score: number; issues: string[] };
      hub_spoke_coverage: { score: number; issues: string[] };
    };
  }>;

  // Modal states
  showPublishModal: boolean;
  setShowPublishModal: (show: boolean) => void;
  showStylePublishModal: boolean;
  setShowStylePublishModal: (show: boolean) => void;
  showSocialModal: boolean;
  setShowSocialModal: (show: boolean) => void;
  showCampaignsModal: boolean;
  setShowCampaignsModal: (show: boolean) => void;
}

/**
 * Hook for publishing and export operations
 */
export function usePublishingExport(imagePlaceholders: ImagePlaceholder[]): PublishingExportHook {
  const {
    brief,
    draftContent,
    setDraftContent,
    setHasUnsavedChanges,
    databaseJobInfo,
    businessInfo,
    activeMapId,
    activeMap,
    activeBriefTopic,
    userId,
    dispatch,
  } = useDraftingContext();

  // Modal states
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showStylePublishModal, setShowStylePublishModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);

  /**
   * Copy optimized HTML to clipboard
   */
  const handleCopyHtml = useCallback(async () => {
    if (!brief || !draftContent) return;

    const contentWithImages = replaceImagePlaceholdersWithUrls(draftContent, imagePlaceholders);
    const semanticHtml = convertMarkdownToSemanticHtml(contentWithImages);
    const cleanedHtml = cleanForExport(semanticHtml);
    const imagesFound = (cleanedHtml.match(/<img/g) || []).length;

    try {
      await navigator.clipboard.writeText(cleanedHtml);
      const imageNote = imagesFound > 0
        ? ` (${imagesFound} images included)`
        : '';
      dispatch({ type: 'SET_NOTIFICATION', payload: `Optimized HTML copied!${imageNote}` });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to copy to clipboard.' });
    }
  }, [brief, draftContent, imagePlaceholders, dispatch]);

  /**
   * Download HTML file
   */
  const handleDownloadHtml = useCallback(async (embedImages: boolean) => {
    if (!brief || !draftContent) return;

    const slug = brief.slug || generateSlug(brief.title) || 'article';
    let contentWithImages = replaceImagePlaceholdersWithUrls(draftContent, imagePlaceholders);

    // If embedding images, convert URLs to base64
    if (embedImages) {
      for (const img of imagePlaceholders) {
        const url = img.generatedUrl || img.userUploadUrl;
        if (url && !url.startsWith('data:')) {
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            contentWithImages = contentWithImages.replace(url, base64);
          } catch (err) {
            console.warn('[PublishingExport] Failed to embed image:', url);
          }
        }
      }
    }

    const semanticHtml = convertMarkdownToSemanticHtml(contentWithImages);
    const cleanedHtml = cleanForExport(semanticHtml);

    // Build full HTML document
    const fullHtml = buildFullHtmlDocument(cleanedHtml, {
      title: brief.title,
      metaDescription: brief.metaDescription,
      language: businessInfo.language || 'en',
      schemaScript: databaseJobInfo?.schemaData ? JSON.stringify(databaseJobInfo.schemaData) : undefined,
      authorName: businessInfo.authorName,
    });

    // Download
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.html`;
    a.click();
    URL.revokeObjectURL(url);

    dispatch({ type: 'SET_NOTIFICATION', payload: `HTML downloaded: ${slug}.html` });
  }, [brief, draftContent, imagePlaceholders, databaseJobInfo?.schemaData, businessInfo, dispatch]);

  /**
   * Download complete article package
   */
  const handleDownloadPackage = useCallback(async () => {
    if (!brief || !draftContent) return;

    const slug = brief.slug || generateSlug(brief.title) || 'article';
    const wordCount = draftContent.split(/\s+/).length;
    const frameworkRules = brief.contentAudit?.frameworkRules || [];
    const passingRules = frameworkRules.filter((r: any) => r.isPassing).length;
    const auditScore = databaseJobInfo?.auditScore || (frameworkRules.length > 0 ? Math.round((passingRules / frameworkRules.length) * 100) : null);

    const schemaData = databaseJobInfo?.schemaData;
    const schemaScript = schemaData ? `
  <script type="application/ld+json">
${JSON.stringify(schemaData, null, 2)}
  </script>` : '';

    // Get featured image for Open Graph
    const featuredImage = imagePlaceholders.find(img => img.type === 'HERO');
    const ogImage = featuredImage?.generatedUrl || featuredImage?.userUploadUrl || '';

    // Build Open Graph meta tags
    const ogTags = `
  <meta property="og:type" content="article">
  <meta property="og:title" content="${brief.title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${(brief.metaDescription || '').replace(/"/g, '&quot;')}">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${brief.title.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${(brief.metaDescription || '').replace(/"/g, '&quot;')}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ''}
  <meta property="article:published_time" content="${new Date().toISOString()}">
  ${businessInfo.authorName ? `<meta property="article:author" content="${businessInfo.authorName.replace(/"/g, '&quot;')}">` : ''}`;

    // Create Article HTML
    const articleHtml = buildFullHtmlDocument(
      convertMarkdownToBasicHtml(replaceImagePlaceholdersWithUrls(draftContent, imagePlaceholders)),
      {
        title: brief.title,
        metaDescription: brief.metaDescription,
        language: businessInfo.language || 'en',
        schemaScript: schemaData ? JSON.stringify(schemaData) : undefined,
        authorName: businessInfo.authorName,
        ogTags: ogTags,
      }
    );

    // Create Content Brief document
    const briefDoc = `
CONTENT BRIEF
=============

TITLE: ${brief.title}
TARGET KEYWORD: ${brief.targetKeyword || 'Not specified'}
SEARCH INTENT: ${brief.searchIntent || 'Not specified'}
WORD COUNT: ${wordCount.toLocaleString()} words

META DESCRIPTION:
${brief.metaDescription || 'Not specified'}

KEY TAKEAWAYS:
${brief.keyTakeaways?.map((t: string, i: number) => `  ${i + 1}. ${t}`).join('\n') || 'None specified'}

CONTENT OUTLINE:
${brief.structured_outline?.map((section: any, i: number) => `
${i + 1}. ${section.heading}
   Format: ${section.format_code || 'Standard'}
`).join('\n') || brief.outline || 'No outline available'}

Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
`.trim();

    // Create Quality Report
    const qualityDoc = `
CONTENT QUALITY REPORT
======================

Article: ${brief.title}
Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Overall Quality Score: ${auditScore ? `${auditScore}/100` : 'Not audited yet'}
Word Count: ${wordCount.toLocaleString()}
Character Count: ${draftContent.length.toLocaleString()}
Optimization Passes: ${databaseJobInfo?.passesCompleted || 'Unknown'}

AUDIT CHECKS:
${brief.contentAudit?.frameworkRules?.map((rule: any) => `
${rule.isPassing ? '✓' : '✗'} ${rule.ruleName}
  ${rule.details}
`).join('\n') || 'No detailed audit available.'}

Total Images: ${imagePlaceholders.length}
`.trim();

    // Create ZIP package
    const zip = new JSZip();
    zip.file(`${slug}-article.html`, articleHtml);
    zip.file(`${slug}-brief.txt`, briefDoc);
    zip.file(`${slug}-quality.txt`, qualityDoc);
    zip.file(`${slug}.md`, draftContent);

    if (schemaData) {
      zip.file(`${slug}-schema.json`, JSON.stringify(schemaData, null, 2));
    }

    // Add images folder
    const imagesFolder = zip.folder('images');
    for (const img of imagePlaceholders) {
      const url = img.generatedUrl || img.userUploadUrl;
      if (url && !url.startsWith('data:') && imagesFolder) {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const filename = img.metadata?.filename || `image-${img.id}.webp`;
          imagesFolder.file(filename, blob);
        } catch (err) {
          console.warn('[PublishingExport] Failed to include image:', url);
        }
      }
    }

    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-article-package.zip`;
    a.click();
    URL.revokeObjectURL(url);

    dispatch({ type: 'SET_NOTIFICATION', payload: `Package downloaded: ${slug}-article-package.zip` });
  }, [brief, draftContent, imagePlaceholders, databaseJobInfo, businessInfo, dispatch]);

  /**
   * Add Related Topics section to existing content
   */
  const handleAddRelatedTopics = useCallback(async () => {
    if (!brief || !draftContent) return;

    const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

    try {
      const mapId = activeMap?.id;

      if (!mapId) {
        dispatch({ type: 'SET_ERROR', payload: 'No active topical map found.' });
        return;
      }

      // Fetch topics from the map
      const { data: mapTopics, error: topicsError } = await supabase
        .from('topics')
        .select('id, title, slug')
        .eq('map_id', mapId)
        .limit(10);

      if (topicsError) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch related topics.' });
        return;
      }

      if (!mapTopics || mapTopics.length === 0) {
        dispatch({ type: 'SET_NOTIFICATION', payload: 'No other topics found in this map.' });
        return;
      }

      // Filter out the current topic
      const filteredTopics = mapTopics
        .filter(t => t.title.toLowerCase() !== brief.title.toLowerCase())
        .slice(0, 5);

      if (filteredTopics.length === 0) {
        dispatch({ type: 'SET_NOTIFICATION', payload: 'No related topics available to add.' });
        return;
      }

      // Fetch content briefs for these topics
      const topicIds = filteredTopics.map(t => t.id);
      const { data: topicBriefs } = await batchedIn(
        supabase, 'content_briefs', 'topic_id, meta_description, key_takeaways', 'topic_id', topicIds
      );

      const briefsByTopicId = new Map<string, { metaDescription?: string; keyTakeaways?: string[] }>();
      if (topicBriefs) {
        for (const briefData of topicBriefs) {
          briefsByTopicId.set(briefData.topic_id, {
            metaDescription: briefData.meta_description,
            keyTakeaways: briefData.key_takeaways as string[] | undefined,
          });
        }
      }

      // Prepare links with annotation text
      const relatedTopics: RelatedTopicLink[] = filteredTopics.map(t => {
        const topicBrief = briefsByTopicId.get(t.id);
        let annotationText: string | undefined;

        if (topicBrief?.metaDescription) {
          annotationText = topicBrief.metaDescription;
        } else if (topicBrief?.keyTakeaways && topicBrief.keyTakeaways.length > 0) {
          annotationText = topicBrief.keyTakeaways[0];
        }

        return {
          title: t.title,
          slug: t.slug || undefined,
          reasoning: annotationText,
          anchorText: t.title,
          annotation_text_hint: annotationText,
        };
      });

      const centralEntity = activeMap?.pillars?.centralEntity as string | undefined;
      const language = (brief as any).language || 'en';

      // Append Related Topics section
      const updatedContent = appendRelatedTopicsToContent(draftContent, {
        articleTitle: brief.title,
        centralEntity,
        language,
        topics: relatedTopics,
      });

      if (updatedContent === draftContent) {
        dispatch({ type: 'SET_NOTIFICATION', payload: 'Content already has a Related Topics section.' });
        return;
      }

      setDraftContent(updatedContent);
      setHasUnsavedChanges(true);

      dispatch({ type: 'SET_NOTIFICATION', payload: `Added Related Topics section with ${relatedTopics.length} contextual links.` });
    } catch (error) {
      console.error('[PublishingExport] Error adding related topics:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add related topics section.' });
    }
  }, [brief, draftContent, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, activeMap, dispatch, setDraftContent, setHasUnsavedChanges]);

  /**
   * Build source data for social media transformation
   */
  const socialTransformSource: ArticleTransformationSource | null = useMemo(() => {
    if (!brief || !databaseJobInfo?.jobId || !activeBriefTopic?.id) return null;

    const keyTakeaways = brief.keyTakeaways || [];
    const schemaEntities = databaseJobInfo.schemaData?.entities?.map((e: any) => ({
      name: e.name || e.label || '',
      type: e.type || 'Thing',
      wikidata_id: e.wikidataId || e.wikidata_id
    })) || [];

    const contextualVectors = (brief.contextualVectors || []).map((cv: any) => ({
      entity: cv.entity || '',
      attribute: cv.attribute || '',
      value: cv.value || '',
      category: cv.category || 'COMMON'
    }));

    const slug = activeBriefTopic.slug ||
                 activeBriefTopic.url_slug_hint ||
                 slugify(brief.title || activeBriefTopic.title || '');

    let baseUrl = '';
    if (businessInfo.domain) {
      baseUrl = businessInfo.domain.startsWith('http')
        ? businessInfo.domain
        : `https://${businessInfo.domain}`;
    }

    const linkUrl = baseUrl && slug ? `${baseUrl.replace(/\/$/, '')}/${slug}` : '';

    return {
      job_id: databaseJobInfo.jobId,
      topic_id: activeBriefTopic.id,
      title: brief.title || activeBriefTopic.title || 'Untitled',
      meta_description: brief.metaDescription || '',
      link_url: linkUrl,
      language: businessInfo.language || undefined,
      key_takeaways: keyTakeaways,
      schema_entities: schemaEntities,
      contextual_vectors: contextualVectors,
      image_placeholders: imagePlaceholders.map(p => ({
        id: p.id,
        type: p.type,
        alt_text: p.altTextSuggestion || p.description,
        caption: p.description,
        generated_url: p.generatedUrl,
        user_upload_url: p.userUploadUrl,
        status: p.status,
        specs: p.specs ? {
          width: p.specs.width,
          height: p.specs.height,
          aspect_ratio: p.specs.width && p.specs.height
            ? `${p.specs.width}:${p.specs.height}`
            : undefined
        } : undefined
      }))
    };
  }, [brief, databaseJobInfo, activeBriefTopic, businessInfo.domain, businessInfo.language, imagePlaceholders]);

  /**
   * Handler for social media transformation
   */
  const handleSocialTransform = useCallback(async (config: TransformationConfig) => {
    if (!socialTransformSource) {
      throw new Error('No source data available for transformation');
    }

    const result = await transformArticleToSocialPosts(
      socialTransformSource,
      config,
      {
        supabaseUrl: businessInfo.supabaseUrl,
        supabaseAnonKey: businessInfo.supabaseAnonKey,
        userId: userId || ''
      }
    );

    return result;
  }, [socialTransformSource, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, userId]);

  return {
    handleCopyHtml,
    handleDownloadHtml,
    handleDownloadPackage,
    handleAddRelatedTopics,
    socialTransformSource,
    handleSocialTransform,
    showPublishModal,
    setShowPublishModal,
    showStylePublishModal,
    setShowStylePublishModal,
    showSocialModal,
    setShowSocialModal,
    showCampaignsModal,
    setShowCampaignsModal,
  };
}

export default usePublishingExport;
