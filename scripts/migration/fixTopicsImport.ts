/**
 * Fix Topics Import
 *
 * Imports topics in the correct order (parents before children)
 * to satisfy FK constraints.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.migration' });

const TARGET_URL = process.env.TARGET_SUPABASE_URL!;
const TARGET_SERVICE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

interface Topic {
  id: string;
  parent_topic_id: string | null;
  [key: string]: any;
}

function sortTopicsForImport(topics: Topic[]): Topic[] {
  const sorted: Topic[] = [];
  const remaining = new Map<string, Topic>();
  const imported = new Set<string>();

  // First, collect all topics
  for (const topic of topics) {
    remaining.set(topic.id, topic);
  }

  // Keep processing until all topics are sorted
  let iterations = 0;
  const maxIterations = topics.length + 1;

  while (remaining.size > 0 && iterations < maxIterations) {
    iterations++;
    let addedAny = false;

    for (const [id, topic] of remaining) {
      // Can add if no parent OR parent already imported
      if (!topic.parent_topic_id || imported.has(topic.parent_topic_id)) {
        sorted.push(topic);
        imported.add(id);
        remaining.delete(id);
        addedAny = true;
      }
    }

    // If no progress made, there might be orphan references - add remaining anyway
    if (!addedAny && remaining.size > 0) {
      console.log(`  ⚠️ ${remaining.size} topics have missing parent references, importing anyway...`);
      for (const [id, topic] of remaining) {
        // Set parent to null for orphaned topics
        sorted.push({ ...topic, parent_topic_id: null });
        remaining.delete(id);
      }
    }
  }

  return sorted;
}

async function main() {
  const backupPath = process.argv[2];

  if (!backupPath) {
    console.error('Usage: npx tsx scripts/migration/fixTopicsImport.ts <backup-path>');
    process.exit(1);
  }

  console.log('🔧 Fixing Topics Import\n');
  console.log(`📍 Target: ${TARGET_URL}`);
  console.log(`📂 Backup: ${backupPath}\n`);

  const supabase = createClient(TARGET_URL, TARGET_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Read topics from backup
  const topicsFile = path.join(backupPath, 'tables', 'topics.json');
  if (!fs.existsSync(topicsFile)) {
    console.error('❌ Topics backup file not found');
    process.exit(1);
  }

  const topics: Topic[] = JSON.parse(fs.readFileSync(topicsFile, 'utf-8'));
  console.log(`📋 Found ${topics.length} topics in backup\n`);

  // Sort topics (parents first)
  console.log('📊 Sorting topics (parents before children)...');
  const sortedTopics = sortTopicsForImport(topics);
  console.log(`✅ Sorted ${sortedTopics.length} topics\n`);

  // Clear existing topics first
  console.log('🗑️ Clearing existing topics...');
  const { error: deleteError } = await supabase
    .from('topics')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.log(`  ⚠️ Delete warning: ${deleteError.message}`);
  }

  // Import in smaller batches
  console.log('\n📥 Importing topics in sorted order...\n');
  const batchSize = 50;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < sortedTopics.length; i += batchSize) {
    const batch = sortedTopics.slice(i, i + batchSize);
    const progress = Math.min(100, Math.round(((i + batchSize) / sortedTopics.length) * 100));

    const { error } = await supabase
      .from('topics')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.log(`  ❌ Batch ${Math.floor(i / batchSize)}: ${error.message}`);
      errors++;
    } else {
      imported += batch.length;
    }

    process.stdout.write(`\r  Progress: ${progress}%`);
  }

  console.log('\n');

  // Now import content_briefs
  console.log('📥 Importing content_briefs...');
  const briefsFile = path.join(backupPath, 'tables', 'content_briefs.json');
  if (fs.existsSync(briefsFile)) {
    const briefs = JSON.parse(fs.readFileSync(briefsFile, 'utf-8'));

    // Clear existing
    await supabase.from('content_briefs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    for (let i = 0; i < briefs.length; i += batchSize) {
      const batch = briefs.slice(i, i + batchSize);
      const { error } = await supabase
        .from('content_briefs')
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        console.log(`  ❌ Briefs batch ${Math.floor(i / batchSize)}: ${error.message}`);
      }
    }
    console.log(`  ✅ Imported ${briefs.length} content briefs`);
  }

  // Now import content_generation_jobs
  console.log('📥 Importing content_generation_jobs...');
  const jobsFile = path.join(backupPath, 'tables', 'content_generation_jobs.json');
  if (fs.existsSync(jobsFile)) {
    const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf-8'));

    await supabase.from('content_generation_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { error } = await supabase
      .from('content_generation_jobs')
      .upsert(jobs, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.log(`  ❌ Jobs: ${error.message}`);
    } else {
      console.log(`  ✅ Imported ${jobs.length} jobs`);
    }
  }

  // Import content_generation_sections
  console.log('📥 Importing content_generation_sections...');
  const sectionsFile = path.join(backupPath, 'tables', 'content_generation_sections.json');
  if (fs.existsSync(sectionsFile)) {
    const sections = JSON.parse(fs.readFileSync(sectionsFile, 'utf-8'));

    await supabase.from('content_generation_sections').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    for (let i = 0; i < sections.length; i += batchSize) {
      const batch = sections.slice(i, i + batchSize);
      const { error } = await supabase
        .from('content_generation_sections')
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        console.log(`  ❌ Sections batch ${Math.floor(i / batchSize)}: ${error.message}`);
      }
    }
    console.log(`  ✅ Imported ${sections.length} sections`);
  }

  console.log('\n==================================================');
  console.log('📋 TOPICS FIX SUMMARY');
  console.log('==================================================');
  console.log(`\n✅ Topics imported: ${imported}/${sortedTopics.length}`);
  if (errors > 0) {
    console.log(`⚠️ Errors: ${errors}`);
  }
  console.log('\nRun verification to check results:');
  console.log('  npx tsx scripts/migration/verifyMigration.ts');
}

main().catch(console.error);
