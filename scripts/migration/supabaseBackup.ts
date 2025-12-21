/**
 * Supabase Backup Orchestrator
 *
 * Creates a complete backup of the Supabase project including:
 * - All table data as JSON
 * - Storage bucket files
 * - Migration manifest with row counts
 *
 * Usage: npx tsx scripts/migration/supabaseBackup.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load migration environment variables
dotenv.config({ path: '.env.migration' });

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_SERVICE_KEY = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
const BACKUP_DIR = process.env.BACKUP_DIR || './backup';

// Tables in FK-safe order (no dependencies first)
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

interface BackupManifest {
  timestamp: string;
  sourceUrl: string;
  tables: {
    name: string;
    rowCount: number;
    file: string;
  }[];
  storage: {
    bucket: string;
    fileCount: number;
    totalSize: number;
  }[];
  errors: string[];
}

async function createBackupDir(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, timestamp);

  fs.mkdirSync(path.join(backupPath, 'tables'), { recursive: true });
  fs.mkdirSync(path.join(backupPath, 'storage'), { recursive: true });

  console.log(`📁 Created backup directory: ${backupPath}`);
  return backupPath;
}

async function backupTable(
  supabase: SupabaseClient,
  tableName: string,
  backupPath: string
): Promise<{ rowCount: number; error?: string }> {
  console.log(`  📋 Backing up ${tableName}...`);

  try {
    // Fetch all data with pagination (Supabase default limit is 1000)
    const allData: any[] = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error(`    ❌ Error: ${error.message}`);
        return { rowCount: 0, error: error.message };
      }

      if (data && data.length > 0) {
        allData.push(...data);
        offset += pageSize;
        // If we got less than pageSize, we've reached the end
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    const rowCount = allData.length;
    const filePath = path.join(backupPath, 'tables', `${tableName}.json`);

    fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
    console.log(`    ✅ ${rowCount} rows saved`);

    return { rowCount };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`    ❌ Exception: ${errorMsg}`);
    return { rowCount: 0, error: errorMsg };
  }
}

async function backupStorage(
  supabase: SupabaseClient,
  backupPath: string
): Promise<{ bucket: string; fileCount: number; totalSize: number; error?: string }[]> {
  console.log('\n📦 Backing up storage buckets...');
  const results: { bucket: string; fileCount: number; totalSize: number; error?: string }[] = [];

  try {
    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error(`  ❌ Error listing buckets: ${bucketsError.message}`);
      return [{ bucket: 'error', fileCount: 0, totalSize: 0, error: bucketsError.message }];
    }

    if (!buckets || buckets.length === 0) {
      console.log('  ℹ️ No storage buckets found');
      return [];
    }

    for (const bucket of buckets) {
      console.log(`  📁 Backing up bucket: ${bucket.name}`);
      const bucketPath = path.join(backupPath, 'storage', bucket.name);
      fs.mkdirSync(bucketPath, { recursive: true });

      let fileCount = 0;
      let totalSize = 0;

      // List files in bucket
      const { data: files, error: listError } = await supabase.storage
        .from(bucket.name)
        .list('', { limit: 1000 });

      if (listError) {
        console.error(`    ❌ Error listing files: ${listError.message}`);
        results.push({ bucket: bucket.name, fileCount: 0, totalSize: 0, error: listError.message });
        continue;
      }

      // Download each file
      for (const file of files || []) {
        if (file.name) {
          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from(bucket.name)
              .download(file.name);

            if (downloadError) {
              console.error(`    ⚠️ Could not download ${file.name}: ${downloadError.message}`);
              continue;
            }

            if (fileData) {
              const buffer = Buffer.from(await fileData.arrayBuffer());
              fs.writeFileSync(path.join(bucketPath, file.name), buffer);
              fileCount++;
              totalSize += buffer.length;
            }
          } catch (err) {
            console.error(`    ⚠️ Error downloading ${file.name}`);
          }
        }
      }

      console.log(`    ✅ ${fileCount} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
      results.push({ bucket: bucket.name, fileCount, totalSize });
    }

    return results;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`  ❌ Storage backup failed: ${errorMsg}`);
    return [{ bucket: 'error', fileCount: 0, totalSize: 0, error: errorMsg }];
  }
}

async function main() {
  console.log('🚀 Supabase Backup Orchestrator\n');

  // Validate environment
  if (!SOURCE_URL || !SOURCE_SERVICE_KEY) {
    console.error('❌ Missing environment variables. Please create .env.migration file.');
    console.error('   Copy .env.migration.example to .env.migration and fill in your values.');
    process.exit(1);
  }

  console.log(`📍 Source: ${SOURCE_URL}\n`);

  // Create Supabase client with service role
  const supabase = createClient(SOURCE_URL, SOURCE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Create backup directory
  const backupPath = await createBackupDir();

  // Initialize manifest
  const manifest: BackupManifest = {
    timestamp: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    tables: [],
    storage: [],
    errors: []
  };

  // Backup tables
  console.log('\n📊 Backing up database tables...\n');

  for (const tableName of TABLES_IN_ORDER) {
    const result = await backupTable(supabase, tableName, backupPath);
    manifest.tables.push({
      name: tableName,
      rowCount: result.rowCount,
      file: `tables/${tableName}.json`
    });
    if (result.error) {
      manifest.errors.push(`${tableName}: ${result.error}`);
    }
  }

  // Backup storage
  const storageResults = await backupStorage(supabase, backupPath);
  manifest.storage = storageResults;

  // Save manifest
  const manifestPath = path.join(backupPath, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 BACKUP SUMMARY');
  console.log('='.repeat(50));

  const totalRows = manifest.tables.reduce((sum, t) => sum + t.rowCount, 0);
  const totalFiles = manifest.storage.reduce((sum, s) => sum + s.fileCount, 0);
  const totalSize = manifest.storage.reduce((sum, s) => sum + s.totalSize, 0);

  console.log(`\n📊 Tables: ${manifest.tables.length}`);
  console.log(`   Total rows: ${totalRows.toLocaleString()}`);

  console.log(`\n📦 Storage buckets: ${manifest.storage.length}`);
  console.log(`   Total files: ${totalFiles.toLocaleString()}`);
  console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  if (manifest.errors.length > 0) {
    console.log(`\n⚠️ Errors: ${manifest.errors.length}`);
    manifest.errors.forEach(e => console.log(`   - ${e}`));
  }

  console.log(`\n✅ Backup complete: ${backupPath}`);
  console.log(`📄 Manifest saved: ${manifestPath}`);

  // Table summary
  console.log('\n📋 Table row counts:');
  manifest.tables.forEach(t => {
    const status = t.rowCount > 0 ? '✅' : '⚪';
    console.log(`   ${status} ${t.name}: ${t.rowCount.toLocaleString()}`);
  });
}

main().catch(console.error);
