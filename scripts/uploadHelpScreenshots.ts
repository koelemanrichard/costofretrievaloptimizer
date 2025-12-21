/**
 * uploadHelpScreenshots.ts
 *
 * Uploads screenshots to Supabase Storage and creates records in help_screenshots table.
 * Run with: npx tsx scripts/uploadHelpScreenshots.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://shtqshmmsrmtquuhyupl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SCREENSHOT_DIR = 'docs/help-screenshots';
const STORAGE_BUCKET = 'help-screenshots';

// Map screenshot filenames to article slugs and descriptions
const SCREENSHOT_MAPPINGS: Record<string, { articleSlug: string; altText: string; caption?: string }> = {
  '001-auth-login-empty.png': { articleSlug: 'first-15-minutes', altText: 'Login screen with email and password fields' },
  '002-auth-signup-tab.png': { articleSlug: 'first-15-minutes', altText: 'Sign up tab for new user registration' },
  '005-projects-selection.png': { articleSlug: 'creating-loading-projects', altText: 'Project selection screen showing existing projects' },
  '008-workspace-main.png': { articleSlug: 'project-workspace', altText: 'Main project workspace with map options' },
  '012-dashboard-main.png': { articleSlug: 'navigating-dashboard', altText: 'Map dashboard showing topics and navigation' },
  '019-dashboard-analysis-dropdown.png': { articleSlug: 'analysis-overview', altText: 'Analysis tools dropdown menu' },
  '021-modal-seo-pillars-filled.png': { articleSlug: 'step-2-seo-pillars', altText: 'SEO Pillars modal with CE, SC, CSI fields' },
  '022-modal-eav-manager-main.png': { articleSlug: 'step-3-eav-discovery', altText: 'EAV Manager showing semantic triples' },
  '025-topic-detail-panel.png': { articleSlug: 'managing-topics', altText: 'Topic detail panel with editing options' },
  '026-modal-content-brief-view.png': { articleSlug: 'understanding-briefs', altText: 'Content brief modal with outline and SEO data' },
  '029-modal-export-settings.png': { articleSlug: 'exporting-strategy', altText: 'Export settings modal with format options' },
  '031-site-analysis-main.png': { articleSlug: 'site-analysis-overview', altText: 'Site Analysis dashboard' },
  '032-admin-main.png': { articleSlug: 'admin-overview', altText: 'Admin Console main dashboard' },
  'modal-settings.png': { articleSlug: 'api-configuration', altText: 'Settings modal with API key configuration' },
  'modal-drafting.png': { articleSlug: 'generating-drafts', altText: 'Article drafting modal with progress tracking' },
};

async function ensureBucketExists() {
  console.log('Checking storage bucket...');

  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);

  if (!bucketExists) {
    console.log(`Creating bucket: ${STORAGE_BUCKET}`);
    const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    });
    if (error) {
      console.error('Failed to create bucket:', error.message);
      // Bucket might already exist, continue anyway
    }
  }
  console.log('Bucket ready');
}

async function getArticleIdBySlug(slug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('help_articles')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data.id;
}

async function uploadScreenshot(filename: string): Promise<{ path: string; publicUrl: string } | null> {
  const filePath = path.join(SCREENSHOT_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`  File not found: ${filePath}`);
    return null;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const storagePath = `screenshots/${filename}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (uploadError) {
    console.log(`  Upload failed: ${uploadError.message}`);
    return null;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return {
    path: storagePath,
    publicUrl: urlData.publicUrl
  };
}

async function createScreenshotRecord(
  articleId: string,
  storagePath: string,
  altText: string,
  caption?: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('help_screenshots')
    .insert({
      article_id: articleId,
      storage_path: storagePath,
      storage_bucket: STORAGE_BUCKET,
      alt_text: altText,
      caption: caption || null,
      sort_order: 0
    })
    .select('id')
    .single();

  if (error) {
    console.log(`  Record creation failed: ${error.message}`);
    return null;
  }

  return data.id;
}

async function main() {
  console.log('='.repeat(60));
  console.log('HELP SCREENSHOT UPLOADER');
  console.log('='.repeat(60));
  console.log(`\nUsing Supabase URL: ${SUPABASE_URL}\n`);

  // Ensure bucket exists
  await ensureBucketExists();

  // Get all PNG files in screenshot directory
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\nFound ${files.length} screenshots to upload\n`);

  let uploaded = 0;
  let linked = 0;

  for (const filename of files) {
    console.log(`Processing: ${filename}`);

    // Upload to storage
    const result = await uploadScreenshot(filename);
    if (!result) continue;

    uploaded++;
    console.log(`  Uploaded: ${result.publicUrl}`);

    // Check if we have a mapping for this file
    const mapping = SCREENSHOT_MAPPINGS[filename];
    if (mapping) {
      const articleId = await getArticleIdBySlug(mapping.articleSlug);
      if (articleId) {
        const screenshotId = await createScreenshotRecord(
          articleId,
          result.path,
          mapping.altText,
          mapping.caption
        );
        if (screenshotId) {
          linked++;
          console.log(`  Linked to article: ${mapping.articleSlug}`);
        }
      } else {
        console.log(`  Article not found: ${mapping.articleSlug}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('UPLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nUploaded: ${uploaded} screenshots`);
  console.log(`Linked to articles: ${linked} screenshots`);
}

main().catch(console.error);
