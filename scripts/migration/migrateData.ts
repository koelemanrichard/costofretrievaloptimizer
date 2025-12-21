/**
 * Supabase Data Migration Script
 *
 * Imports backed up data to the target (new) Supabase project.
 * Handles foreign key dependencies by importing in the correct order.
 *
 * Usage: npx tsx scripts/migration/migrateData.ts --backup ./backup/2025-12-15T...
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load migration environment variables
dotenv.config({ path: '.env.migration' });

const TARGET_URL = process.env.TARGET_SUPABASE_URL;
const TARGET_SERVICE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;

// Tables in FK-safe order (same as backup)
const TABLES_IN_ORDER = [
  // Independent tables
  'user_settings',
  'help_categories',

  // Project hierarchy
  'projects',
  'topical_maps',
  'topics',
  'content_briefs',

  // Map-dependent tables
  'foundation_pages',
  'navigation_structures',
  'navigation_sync_status',
  'site_schema_entities',
  'audit_results',
  'linking_audit_results',
  'performance_snapshots',

  // User-dependent settings
  'content_generation_settings',
  'prompt_templates',
  'entity_resolution_cache',

  // Brief-dependent
  'content_generation_jobs',
  'brief_compliance_checks',

  // Job-dependent
  'content_generation_sections',
  'content_versions',

  // Project-dependent (site inventory)
  'site_inventory',
  'transition_snapshots',
  'semantic_analysis_results',

  // Audit-dependent
  'audit_history',
  'linking_fix_history',

  // Help system
  'help_articles',
  'help_article_versions',
  'help_screenshots',
];

interface MigrationResult {
  table: string;
  sourceRows: number;
  importedRows: number;
  skippedRows: number;
  errors: string[];
}

// Sort topics so parents come before children
function sortTopicsForImport(topics: any[]): any[] {
  const sorted: any[] = [];
  const remaining = new Map<string, any>();
  const imported = new Set<string>();

  for (const topic of topics) {
    remaining.set(topic.id, topic);
  }

  let iterations = 0;
  const maxIterations = topics.length + 1;

  while (remaining.size > 0 && iterations < maxIterations) {
    iterations++;
    for (const [id, topic] of remaining) {
      if (!topic.parent_topic_id || imported.has(topic.parent_topic_id)) {
        sorted.push(topic);
        imported.add(id);
        remaining.delete(id);
      }
    }
    // If stuck, add remaining with null parent
    if (iterations === maxIterations - 1 && remaining.size > 0) {
      for (const [, topic] of remaining) {
        sorted.push({ ...topic, parent_topic_id: null });
      }
      break;
    }
  }

  return sorted;
}

async function importTable(
  supabase: SupabaseClient,
  tableName: string,
  backupPath: string,
  dryRun: boolean = false
): Promise<MigrationResult> {
  const result: MigrationResult = {
    table: tableName,
    sourceRows: 0,
    importedRows: 0,
    skippedRows: 0,
    errors: []
  };

  const filePath = path.join(backupPath, 'tables', `${tableName}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️ ${tableName}: No backup file found, skipping`);
    return result;
  }

  try {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    result.sourceRows = data.length;

    if (data.length === 0) {
      console.log(`  ⚪ ${tableName}: Empty table, skipping`);
      return result;
    }

    // Sort topics to ensure parents come before children
    if (tableName === 'topics') {
      console.log(`  📥 ${tableName}: Sorting ${data.length} rows (parents first)...`);
      data = sortTopicsForImport(data);
    } else {
      console.log(`  📥 ${tableName}: Importing ${data.length} rows...`);
    }

    if (dryRun) {
      console.log(`    🔍 DRY RUN - would import ${data.length} rows`);
      result.importedRows = data.length;
      return result;
    }

    // Import in batches of 100 to avoid timeout
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      const { error } = await supabase
        .from(tableName)
        .upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        result.errors.push(`Batch ${Math.floor(i / batchSize)}: ${error.message}`);
        result.skippedRows += batch.length;
      } else {
        result.importedRows += batch.length;
      }

      // Progress indicator
      if (data.length > batchSize) {
        const progress = Math.min(100, Math.round(((i + batchSize) / data.length) * 100));
        process.stdout.write(`\r    Progress: ${progress}%`);
      }
    }

    if (data.length > batchSize) {
      process.stdout.write('\n');
    }

    if (result.errors.length > 0) {
      console.log(`    ⚠️ Imported ${result.importedRows}/${result.sourceRows} rows (${result.errors.length} errors)`);
    } else {
      console.log(`    ✅ Imported ${result.importedRows} rows`);
    }

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    result.errors.push(errorMsg);
    console.error(`    ❌ Failed: ${errorMsg}`);
    return result;
  }
}

async function migrateStorage(
  supabase: SupabaseClient,
  backupPath: string,
  dryRun: boolean = false
): Promise<{ bucket: string; uploaded: number; errors: string[] }[]> {
  console.log('\n📦 Migrating storage buckets...');
  const results: { bucket: string; uploaded: number; errors: string[] }[] = [];

  const storagePath = path.join(backupPath, 'storage');
  if (!fs.existsSync(storagePath)) {
    console.log('  ℹ️ No storage backup found');
    return results;
  }

  const buckets = fs.readdirSync(storagePath);

  for (const bucketName of buckets) {
    const bucketPath = path.join(storagePath, bucketName);
    if (!fs.statSync(bucketPath).isDirectory()) continue;

    console.log(`  📁 Migrating bucket: ${bucketName}`);
    const bucketResult = { bucket: bucketName, uploaded: 0, errors: [] as string[] };

    // Create bucket if it doesn't exist
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: bucketName === 'help-screenshots' // Make help-screenshots public
    });

    if (createError && !createError.message.includes('already exists')) {
      console.error(`    ⚠️ Could not create bucket: ${createError.message}`);
    }

    // Upload files
    const files = fs.readdirSync(bucketPath);
    for (const fileName of files) {
      const filePath = path.join(bucketPath, fileName);
      if (!fs.statSync(filePath).isFile()) continue;

      if (dryRun) {
        bucketResult.uploaded++;
        continue;
      }

      try {
        const fileBuffer = fs.readFileSync(filePath);
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, fileBuffer, {
            upsert: true
          });

        if (uploadError) {
          bucketResult.errors.push(`${fileName}: ${uploadError.message}`);
        } else {
          bucketResult.uploaded++;
        }
      } catch (err) {
        bucketResult.errors.push(`${fileName}: Upload failed`);
      }
    }

    console.log(`    ✅ Uploaded ${bucketResult.uploaded}/${files.length} files`);
    results.push(bucketResult);
  }

  return results;
}

async function main() {
  console.log('🚀 Supabase Data Migration\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const backupIndex = args.indexOf('--backup');
  const dryRunFlag = args.includes('--dry-run');
  const skipStorageFlag = args.includes('--skip-storage');
  const tablesOnlyFlag = args.includes('--tables-only');

  if (backupIndex === -1 || !args[backupIndex + 1]) {
    console.error('❌ Please specify backup directory:');
    console.error('   npx tsx scripts/migration/migrateData.ts --backup ./backup/2025-12-15T...');
    console.error('\nOptions:');
    console.error('   --dry-run       Preview without making changes');
    console.error('   --skip-storage  Skip storage migration');
    console.error('   --tables-only   Only migrate specified tables (comma-separated)');
    process.exit(1);
  }

  const backupPath = args[backupIndex + 1];

  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup directory not found: ${backupPath}`);
    process.exit(1);
  }

  // Validate environment
  if (!TARGET_URL || !TARGET_SERVICE_KEY) {
    console.error('❌ Missing TARGET environment variables in .env.migration');
    process.exit(1);
  }

  console.log(`📍 Target: ${TARGET_URL}`);
  console.log(`📂 Backup: ${backupPath}`);
  if (dryRunFlag) console.log('🔍 DRY RUN MODE - No changes will be made');
  console.log('');

  // Load manifest
  const manifestPath = path.join(backupPath, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    console.log(`📋 Backup from: ${manifest.timestamp}`);
    console.log(`   Source: ${manifest.sourceUrl}`);
    console.log('');
  }

  // Create target Supabase client
  const supabase = createClient(TARGET_URL, TARGET_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Migrate tables
  console.log('📊 Migrating database tables...\n');
  const tableResults: MigrationResult[] = [];

  for (const tableName of TABLES_IN_ORDER) {
    const result = await importTable(supabase, tableName, backupPath, dryRunFlag);
    tableResults.push(result);
  }

  // Migrate storage
  let storageResults: { bucket: string; uploaded: number; errors: string[] }[] = [];
  if (!skipStorageFlag) {
    storageResults = await migrateStorage(supabase, backupPath, dryRunFlag);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 MIGRATION SUMMARY');
  console.log('='.repeat(50));

  const totalSource = tableResults.reduce((sum, r) => sum + r.sourceRows, 0);
  const totalImported = tableResults.reduce((sum, r) => sum + r.importedRows, 0);
  const totalErrors = tableResults.reduce((sum, r) => sum + r.errors.length, 0);

  console.log(`\n📊 Tables: ${tableResults.length}`);
  console.log(`   Source rows: ${totalSource.toLocaleString()}`);
  console.log(`   Imported: ${totalImported.toLocaleString()}`);

  if (totalErrors > 0) {
    console.log(`   ⚠️ Errors: ${totalErrors}`);
  }

  if (storageResults.length > 0) {
    const totalUploaded = storageResults.reduce((sum, r) => sum + r.uploaded, 0);
    console.log(`\n📦 Storage files uploaded: ${totalUploaded}`);
  }

  // Show tables with errors
  const tablesWithErrors = tableResults.filter(r => r.errors.length > 0);
  if (tablesWithErrors.length > 0) {
    console.log('\n⚠️ Tables with errors:');
    tablesWithErrors.forEach(t => {
      console.log(`   ${t.table}:`);
      t.errors.slice(0, 3).forEach(e => console.log(`     - ${e}`));
      if (t.errors.length > 3) {
        console.log(`     ... and ${t.errors.length - 3} more`);
      }
    });
  }

  if (dryRunFlag) {
    console.log('\n🔍 DRY RUN complete - no changes were made');
    console.log('   Remove --dry-run flag to perform actual migration');
  } else {
    console.log('\n✅ Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Run verification: npx tsx scripts/migration/verifyMigration.ts');
    console.log('2. Update environment variables with new project credentials');
    console.log('3. Test application functionality');
  }
}

main().catch(console.error);
