/**
 * linkScreenshotsToArticles.ts
 *
 * Links uploaded screenshots to the correct help articles.
 * Run with: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/linkScreenshotsToArticles.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://blucvnmncvwzlwxoyoum.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mapping of storage paths to the correct article slugs
const SCREENSHOT_MAPPINGS = [
  {
    storagePath: 'getting-started/creating-your-first-project/new-project-modal.png',
    categorySlug: 'getting-started',
    articleSlug: 'creating-first-project',
    filename: 'new-project-modal.png',
    altText: 'New project creation dialog with name and description fields',
    caption: 'Create a new project to start building your topical map'
  },
  {
    storagePath: 'topical-map-creation/business-information-setup/business-info-form.png',
    categorySlug: 'topical-map-creation',
    articleSlug: 'business-info-setup',
    filename: 'business-info-form.png',
    altText: 'Business information form with company name, domain, and industry fields',
    caption: 'Enter your business details to customize the topical map'
  },
  {
    storagePath: 'topical-map-creation/seo-pillar-wizard/seo-pillar-wizard.png',
    categorySlug: 'topical-map-creation',
    articleSlug: 'central-entity-selection',
    filename: 'seo-pillar-wizard.png',
    altText: 'SEO Pillar Wizard showing Central Entity configuration step',
    caption: 'Configure your Central Entity and Source Context'
  },
  {
    storagePath: 'topical-map-creation/understanding-eavs/eav-discovery-wizard.png',
    categorySlug: 'topical-map-creation',
    articleSlug: 'understanding-eavs',
    filename: 'eav-discovery-wizard.png',
    altText: 'EAV Discovery Wizard showing entity-attribute-value triple configuration',
    caption: 'Discover and configure semantic triples for your content strategy'
  },
  {
    storagePath: 'working-with-topics/core-vs-outer-topics/topic-tree-view.png',
    categorySlug: 'working-with-topics',
    articleSlug: 'core-vs-outer-topics',
    filename: 'topic-tree-view.png',
    altText: 'Topic tree showing hierarchical structure with core and outer topics',
    caption: 'Topics are organized in a hierarchical tree structure'
  },
  {
    storagePath: 'working-with-topics/editing-topics/topic-detail-panel.png',
    categorySlug: 'working-with-topics',
    articleSlug: 'editing-organizing-topics',
    filename: 'topic-detail-panel.png',
    altText: 'Topic detail panel showing title, description, and metadata fields',
    caption: 'Edit topic details in the side panel'
  },
  {
    storagePath: 'content-briefs/understanding-briefs/content-brief-modal.png',
    categorySlug: 'content-briefs',
    articleSlug: 'understanding-content-briefs',
    filename: 'content-brief-modal.png',
    altText: 'Content Brief modal showing SERP analysis and structured outline sections',
    caption: 'Content briefs provide AI-generated writing guidelines'
  },
  {
    storagePath: 'article-generation/multi-pass-overview/content-generation-progress.png',
    categorySlug: 'article-generation',
    articleSlug: 'multi-pass-overview',
    filename: 'content-generation-progress.png',
    altText: 'Content generation progress showing multi-pass AI writing workflow',
    caption: 'Track progress through the 9-pass content generation pipeline'
  },
  {
    storagePath: 'article-generation/reviewing-content/drafting-modal.png',
    categorySlug: 'article-generation',
    articleSlug: 'viewing-editing-content',
    filename: 'drafting-modal.png',
    altText: 'Drafting modal with article preview and editing tools',
    caption: 'Review and edit generated article content'
  },
  {
    storagePath: 'analysis-tools/knowledge-domain/knowledge-domain-modal.png',
    categorySlug: 'analysis-tools',
    articleSlug: 'knowledge-domain',
    filename: 'knowledge-domain-modal.png',
    altText: 'Knowledge Domain modal showing topic clusters and semantic relationships',
    caption: 'Visualize semantic relationships between topics'
  },
  {
    storagePath: 'analysis-tools/contextual-coverage/contextual-coverage-modal.png',
    categorySlug: 'analysis-tools',
    articleSlug: 'contextual-coverage',
    filename: 'contextual-coverage-modal.png',
    altText: 'Contextual Coverage modal showing topic coverage analysis',
    caption: 'Analyze how well your content covers the topic space'
  },
  {
    storagePath: 'analysis-tools/linking-audit/linking-audit-results.png',
    categorySlug: 'analysis-tools',
    articleSlug: 'linking-audit',
    filename: 'linking-audit-results.png',
    altText: 'Linking Audit showing internal linking opportunities and gaps',
    caption: 'Identify internal linking opportunities between topics'
  },
  {
    storagePath: 'settings/api-keys/settings-modal.png',
    categorySlug: 'settings',
    articleSlug: 'api-keys',
    filename: 'settings-modal.png',
    altText: 'Settings modal showing API key configuration for various AI providers',
    caption: 'Configure API keys for Gemini, OpenAI, Anthropic, and more'
  },
  {
    storagePath: 'project-management/project-dashboard/dashboard-overview.png',
    categorySlug: 'project-management',
    articleSlug: 'managing-projects',
    filename: 'dashboard-overview.png',
    altText: 'Project dashboard showing topic tree, analysis tools, and content metrics',
    caption: 'The main dashboard provides an overview of your content strategy'
  }
];

async function getArticleId(categorySlug: string, articleSlug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('help_articles')
    .select('id')
    .eq('slug', articleSlug)
    .eq('help_categories.slug', categorySlug)
    .single();

  // Fallback - join with categories
  if (!data) {
    const { data: data2 } = await supabase.rpc('get_help_article_by_slug', {
      p_category_slug: categorySlug,
      p_article_slug: articleSlug
    });
    return data2?.[0]?.id || null;
  }

  return data?.id || null;
}

async function main() {
  console.log('Linking screenshots to articles...\n');

  let linked = 0;
  let failed = 0;

  for (const mapping of SCREENSHOT_MAPPINGS) {
    console.log(`Processing: ${mapping.storagePath}`);

    // Get article ID using the RPC function
    const { data: articleData } = await supabase.rpc('get_help_article_by_slug', {
      p_category_slug: mapping.categorySlug,
      p_article_slug: mapping.articleSlug
    });

    const articleId = articleData?.[0]?.id;

    if (!articleId) {
      console.log(`  ⚠️ Article not found: ${mapping.categorySlug}/${mapping.articleSlug}`);
      failed++;
      continue;
    }

    // Check if screenshot record already exists
    const { data: existing } = await supabase
      .from('help_screenshots')
      .select('id')
      .eq('article_id', articleId)
      .eq('storage_path', mapping.storagePath)
      .single();

    if (existing) {
      console.log(`  ✓ Already linked`);
      linked++;
      continue;
    }

    // Insert screenshot record
    const { error: insertError } = await supabase
      .from('help_screenshots')
      .insert({
        article_id: articleId,
        storage_path: mapping.storagePath,
        storage_bucket: 'help-screenshots',
        filename: mapping.filename,
        alt_text: mapping.altText,
        caption: mapping.caption,
        sort_order: 0
      });

    if (insertError) {
      console.log(`  ❌ Failed to insert: ${insertError.message}`);
      failed++;
    } else {
      console.log(`  ✅ Linked to article`);
      linked++;
    }
  }

  console.log(`\n📊 Summary: ${linked} linked, ${failed} failed`);
}

main().catch(console.error);
