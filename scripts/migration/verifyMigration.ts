/**
 * Supabase Migration Verification Script
 *
 * Verifies data integrity after migration by comparing:
 * - Row counts between source and target
 * - Random record spot-checks
 * - Storage file existence
 * - Edge function health checks
 *
 * Usage: npx tsx scripts/migration/verifyMigration.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load migration environment variables
dotenv.config({ path: '.env.migration' });

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_SERVICE_KEY = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
const TARGET_URL = process.env.TARGET_SUPABASE_URL;
const TARGET_SERVICE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;

// Tables to verify
const TABLES_TO_VERIFY = [
  'user_settings',
  'help_categories',
  'projects',
  'topical_maps',
  'topics',
  'content_briefs',
  'foundation_pages',
  'navigation_structures',
  'navigation_sync_status',
  'site_schema_entities',
  'audit_results',
  'linking_audit_results',
  'performance_snapshots',
  'content_generation_settings',
  'prompt_templates',
  'entity_resolution_cache',
  'content_generation_jobs',
  'brief_compliance_checks',
  'content_generation_sections',
  'content_versions',
  'site_inventory',
  'transition_snapshots',
  'semantic_analysis_results',
  'audit_history',
  'linking_fix_history',
  'help_articles',
  'help_article_versions',
  'help_screenshots',
];

// Edge functions to test
const EDGE_FUNCTIONS = [
  'health-check',
  'get-settings',
];

interface VerificationResult {
  table: string;
  sourceCount: number;
  targetCount: number;
  match: boolean;
  sampleChecked: boolean;
  sampleMatch: boolean;
  errors: string[];
}

interface StorageVerification {
  bucket: string;
  sourceFiles: number;
  targetFiles: number;
  match: boolean;
  missingFiles: string[];
}

async function getRowCount(
  supabase: SupabaseClient,
  tableName: string
): Promise<{ count: number; error?: string }> {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: count || 0 };
  } catch (err) {
    return { count: 0, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function getRandomSample(
  supabase: SupabaseClient,
  tableName: string,
  limit: number = 3
): Promise<{ data: any[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(limit);

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [] };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function findRecordById(
  supabase: SupabaseClient,
  tableName: string,
  id: string
): Promise<{ data: any; error?: string }> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

function compareRecords(source: any, target: any): boolean {
  if (!source || !target) return false;

  // Compare JSON stringified versions (handles nested objects)
  const sourceJson = JSON.stringify(source, Object.keys(source).sort());
  const targetJson = JSON.stringify(target, Object.keys(target).sort());

  return sourceJson === targetJson;
}

async function verifyTable(
  sourceClient: SupabaseClient,
  targetClient: SupabaseClient,
  tableName: string
): Promise<VerificationResult> {
  const result: VerificationResult = {
    table: tableName,
    sourceCount: 0,
    targetCount: 0,
    match: false,
    sampleChecked: false,
    sampleMatch: false,
    errors: []
  };

  // Get row counts
  const sourceResult = await getRowCount(sourceClient, tableName);
  const targetResult = await getRowCount(targetClient, tableName);

  if (sourceResult.error) {
    result.errors.push(`Source: ${sourceResult.error}`);
  }
  if (targetResult.error) {
    result.errors.push(`Target: ${targetResult.error}`);
  }

  result.sourceCount = sourceResult.count;
  result.targetCount = targetResult.count;
  result.match = result.sourceCount === result.targetCount;

  // Spot-check random records if counts match and there's data
  if (result.match && result.sourceCount > 0) {
    const { data: samples, error: sampleError } = await getRandomSample(sourceClient, tableName);

    if (sampleError) {
      result.errors.push(`Sample fetch: ${sampleError}`);
    } else if (samples.length > 0) {
      result.sampleChecked = true;
      let allMatch = true;

      for (const sourceRecord of samples) {
        if (sourceRecord.id) {
          const { data: targetRecord, error: findError } = await findRecordById(
            targetClient,
            tableName,
            sourceRecord.id
          );

          if (findError || !compareRecords(sourceRecord, targetRecord)) {
            allMatch = false;
            if (findError) {
              result.errors.push(`Record ${sourceRecord.id}: ${findError}`);
            } else {
              result.errors.push(`Record ${sourceRecord.id}: Data mismatch`);
            }
          }
        }
      }

      result.sampleMatch = allMatch;
    }
  }

  return result;
}

async function verifyStorage(
  sourceClient: SupabaseClient,
  targetClient: SupabaseClient
): Promise<StorageVerification[]> {
  const results: StorageVerification[] = [];

  try {
    // List source buckets
    const { data: sourceBuckets, error: sourceError } = await sourceClient.storage.listBuckets();

    if (sourceError) {
      console.error(`  ❌ Error listing source buckets: ${sourceError.message}`);
      return [];
    }

    for (const bucket of sourceBuckets || []) {
      const verification: StorageVerification = {
        bucket: bucket.name,
        sourceFiles: 0,
        targetFiles: 0,
        match: false,
        missingFiles: []
      };

      // List files in source bucket
      const { data: sourceFiles } = await sourceClient.storage
        .from(bucket.name)
        .list('', { limit: 1000 });

      // List files in target bucket
      const { data: targetFiles } = await targetClient.storage
        .from(bucket.name)
        .list('', { limit: 1000 });

      verification.sourceFiles = sourceFiles?.filter(f => f.name).length || 0;
      verification.targetFiles = targetFiles?.filter(f => f.name).length || 0;

      // Check for missing files
      const targetFileNames = new Set((targetFiles || []).map(f => f.name));
      for (const file of sourceFiles || []) {
        if (file.name && !targetFileNames.has(file.name)) {
          verification.missingFiles.push(file.name);
        }
      }

      verification.match = verification.sourceFiles === verification.targetFiles &&
        verification.missingFiles.length === 0;

      results.push(verification);
    }
  } catch (err) {
    console.error(`  ❌ Storage verification error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  return results;
}

async function testEdgeFunction(
  baseUrl: string,
  functionName: string,
  anonKey: string
): Promise<{ success: boolean; error?: string; responseTime: number }> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
      method: functionName === 'health-check' ? 'GET' : 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      }
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return { success: true, responseTime };
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseTime
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
      responseTime: Date.now() - startTime
    };
  }
}

async function main() {
  console.log('🔍 Supabase Migration Verification\n');

  // Validate environment
  if (!SOURCE_URL || !SOURCE_SERVICE_KEY || !TARGET_URL || !TARGET_SERVICE_KEY) {
    console.error('❌ Missing environment variables in .env.migration');
    console.error('   Required: SOURCE_SUPABASE_URL, SOURCE_SUPABASE_SERVICE_ROLE_KEY');
    console.error('   Required: TARGET_SUPABASE_URL, TARGET_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log(`📍 Source: ${SOURCE_URL}`);
  console.log(`📍 Target: ${TARGET_URL}\n`);

  // Create clients
  const sourceClient = createClient(SOURCE_URL, SOURCE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const targetClient = createClient(TARGET_URL, TARGET_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Verify tables
  console.log('📊 Verifying database tables...\n');
  const tableResults: VerificationResult[] = [];

  for (const tableName of TABLES_TO_VERIFY) {
    process.stdout.write(`  Checking ${tableName}...`);
    const result = await verifyTable(sourceClient, targetClient, tableName);
    tableResults.push(result);

    if (result.match && result.sampleMatch) {
      console.log(` ✅ ${result.sourceCount} rows`);
    } else if (result.match) {
      console.log(` ⚠️ ${result.sourceCount} rows (sample check issues)`);
    } else {
      console.log(` ❌ Mismatch: ${result.sourceCount} → ${result.targetCount}`);
    }
  }

  // Verify storage
  console.log('\n📦 Verifying storage buckets...\n');
  const storageResults = await verifyStorage(sourceClient, targetClient);

  for (const result of storageResults) {
    if (result.match) {
      console.log(`  ✅ ${result.bucket}: ${result.sourceFiles} files`);
    } else {
      console.log(`  ❌ ${result.bucket}: ${result.sourceFiles} → ${result.targetFiles} files`);
      if (result.missingFiles.length > 0) {
        console.log(`     Missing: ${result.missingFiles.slice(0, 5).join(', ')}${result.missingFiles.length > 5 ? '...' : ''}`);
      }
    }
  }

  // Test edge functions
  console.log('\n⚡ Testing edge functions...\n');
  const targetAnonKey = process.env.TARGET_SUPABASE_ANON_KEY;

  if (targetAnonKey) {
    for (const funcName of EDGE_FUNCTIONS) {
      const result = await testEdgeFunction(TARGET_URL, funcName, targetAnonKey);
      if (result.success) {
        console.log(`  ✅ ${funcName}: ${result.responseTime}ms`);
      } else {
        console.log(`  ❌ ${funcName}: ${result.error}`);
      }
    }
  } else {
    console.log('  ⚠️ Skipping: TARGET_SUPABASE_ANON_KEY not set');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 VERIFICATION SUMMARY');
  console.log('='.repeat(50));

  const tablesMatched = tableResults.filter(r => r.match).length;
  const tablesWithSampleIssues = tableResults.filter(r => r.match && !r.sampleMatch && r.sampleChecked).length;
  const tablesMismatched = tableResults.filter(r => !r.match).length;

  console.log(`\n📊 Tables: ${tableResults.length}`);
  console.log(`   ✅ Matched: ${tablesMatched}`);
  if (tablesWithSampleIssues > 0) {
    console.log(`   ⚠️ Sample issues: ${tablesWithSampleIssues}`);
  }
  if (tablesMismatched > 0) {
    console.log(`   ❌ Mismatched: ${tablesMismatched}`);
  }

  const totalSourceRows = tableResults.reduce((sum, r) => sum + r.sourceCount, 0);
  const totalTargetRows = tableResults.reduce((sum, r) => sum + r.targetCount, 0);
  console.log(`\n   Source rows: ${totalSourceRows.toLocaleString()}`);
  console.log(`   Target rows: ${totalTargetRows.toLocaleString()}`);

  if (storageResults.length > 0) {
    const storageMatched = storageResults.filter(r => r.match).length;
    console.log(`\n📦 Storage buckets: ${storageResults.length}`);
    console.log(`   ✅ Matched: ${storageMatched}`);
  }

  // Show issues
  const tablesWithErrors = tableResults.filter(r => r.errors.length > 0 || !r.match);
  if (tablesWithErrors.length > 0) {
    console.log('\n⚠️ Tables needing attention:');
    tablesWithErrors.forEach(t => {
      console.log(`   ${t.table}: ${t.sourceCount} → ${t.targetCount}`);
      t.errors.slice(0, 2).forEach(e => console.log(`     - ${e}`));
    });
  }

  // Final verdict
  const allTablesMatch = tablesMismatched === 0;
  const allStorageMatches = storageResults.every(r => r.match);

  if (allTablesMatch && allStorageMatches) {
    console.log('\n✅ Migration verified successfully!');
    console.log('\nNext steps:');
    console.log('1. Update application environment variables');
    console.log('2. Deploy edge functions: supabase functions deploy --all');
    console.log('3. Test application functionality');
    console.log('4. Send password reset emails to users');
  } else {
    console.log('\n⚠️ Migration has issues that need attention');
    console.log('\nRecommended actions:');
    if (tablesMismatched > 0) {
      console.log('1. Re-run migrateData.ts for mismatched tables');
    }
    if (!allStorageMatches) {
      console.log('2. Re-upload missing storage files');
    }
    console.log('3. Re-run this verification script');
  }
}

main().catch(console.error);
