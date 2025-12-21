/**
 * addScreenshotsToArticles.ts
 *
 * Updates help article content to include screenshot references.
 * Run with: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/addScreenshotsToArticles.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://shtqshmmsrmtquuhyupl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Screenshot references to add to articles
// Format: after which heading or text to insert the screenshot
const SCREENSHOT_INSERTIONS: Record<string, {
  storagePath: string;
  altText: string;
  insertAfter: string; // Text/heading after which to insert
}[]> = {
  'creating-first-project': [{
    storagePath: 'getting-started/creating-your-first-project/new-project-modal.png',
    altText: 'New project creation dialog',
    insertAfter: '## Creating a New Project'
  }],
  'business-info-setup': [{
    storagePath: 'topical-map-creation/business-information-setup/business-info-form.png',
    altText: 'Business information form',
    insertAfter: '## Accessing Business Info'
  }],
  'central-entity-selection': [{
    storagePath: 'topical-map-creation/seo-pillar-wizard/seo-pillar-wizard.png',
    altText: 'SEO Pillar Wizard - Central Entity step',
    insertAfter: '## Central Entity Step'
  }],
  'understanding-eavs': [{
    storagePath: 'topical-map-creation/understanding-eavs/eav-discovery-wizard.png',
    altText: 'EAV Discovery Wizard',
    insertAfter: '## What is an EAV?'
  }],
  'core-vs-outer-topics': [{
    storagePath: 'working-with-topics/core-vs-outer-topics/topic-tree-view.png',
    altText: 'Topic tree with core and outer sections',
    insertAfter: '## Visual Identification'
  }],
  'editing-organizing-topics': [{
    storagePath: 'working-with-topics/editing-topics/topic-detail-panel.png',
    altText: 'Topic detail panel',
    insertAfter: '## Editing a Topic'
  }],
  'understanding-content-briefs': [{
    storagePath: 'content-briefs/understanding-briefs/content-brief-modal.png',
    altText: 'Content brief modal',
    insertAfter: '## Brief Structure Overview'
  }],
  'multi-pass-overview': [{
    storagePath: 'article-generation/multi-pass-overview/content-generation-progress.png',
    altText: 'Multi-pass content generation progress',
    insertAfter: '## How It Works'
  }],
  'viewing-editing-content': [{
    storagePath: 'article-generation/reviewing-content/drafting-modal.png',
    altText: 'Article drafting modal',
    insertAfter: '## The Drafting Modal'
  }],
  'knowledge-domain': [{
    storagePath: 'analysis-tools/knowledge-domain/knowledge-domain-modal.png',
    altText: 'Knowledge Domain visualization',
    insertAfter: '## Opening Knowledge Domain'
  }],
  'contextual-coverage': [{
    storagePath: 'analysis-tools/contextual-coverage/contextual-coverage-modal.png',
    altText: 'Contextual Coverage analysis',
    insertAfter: '## How to Use'
  }],
  'linking-audit': [{
    storagePath: 'analysis-tools/linking-audit/linking-audit-results.png',
    altText: 'Linking Audit results',
    insertAfter: '## Running the Audit'
  }],
  'api-keys': [{
    storagePath: 'settings/api-keys/settings-modal.png',
    altText: 'API Keys settings panel',
    insertAfter: '## Accessing API Keys'
  }],
  'managing-projects': [{
    storagePath: 'project-management/project-dashboard/dashboard-overview.png',
    altText: 'Project dashboard overview',
    insertAfter: '## Dashboard Overview'
  }]
};

async function main() {
  console.log('Adding screenshot references to articles...\n');

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [articleSlug, screenshots] of Object.entries(SCREENSHOT_INSERTIONS)) {
    console.log(`Processing: ${articleSlug}`);

    // Get article content
    const { data: article, error: fetchError } = await supabase
      .from('help_articles')
      .select('id, content')
      .eq('slug', articleSlug)
      .single();

    if (fetchError || !article) {
      console.log(`  ⚠️ Article not found: ${articleSlug}`);
      failed++;
      continue;
    }

    let content = article.content;
    let modified = false;

    for (const screenshot of screenshots) {
      // Check if screenshot reference already exists
      if (content.includes(screenshot.storagePath)) {
        console.log(`  ✓ Screenshot already in content`);
        continue;
      }

      // Find the insertion point
      const insertIndex = content.indexOf(screenshot.insertAfter);
      if (insertIndex === -1) {
        // Try to find a good place at the beginning
        const firstHeadingMatch = content.match(/^(# .+\n+)/);
        if (firstHeadingMatch) {
          const screenshotMarkdown = `\n![${screenshot.altText}](storage:${screenshot.storagePath})\n`;
          content = firstHeadingMatch[0] + screenshotMarkdown + content.slice(firstHeadingMatch[0].length);
          modified = true;
          console.log(`  📷 Added screenshot after title`);
        } else {
          console.log(`  ⚠️ Could not find insertion point: "${screenshot.insertAfter.substring(0, 30)}..."`);
        }
        continue;
      }

      // Find the end of the line containing the insertion point
      const lineEnd = content.indexOf('\n', insertIndex + screenshot.insertAfter.length);
      const insertPosition = lineEnd !== -1 ? lineEnd + 1 : content.length;

      // Insert screenshot markdown
      const screenshotMarkdown = `\n![${screenshot.altText}](storage:${screenshot.storagePath})\n`;
      content = content.slice(0, insertPosition) + screenshotMarkdown + content.slice(insertPosition);
      modified = true;
      console.log(`  📷 Added screenshot after "${screenshot.insertAfter}"`);
    }

    if (modified) {
      // Update article content
      const { error: updateError } = await supabase
        .from('help_articles')
        .update({ content })
        .eq('id', article.id);

      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  ✅ Updated article`);
        updated++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n📊 Summary: ${updated} updated, ${skipped} skipped, ${failed} failed`);
}

main().catch(console.error);
