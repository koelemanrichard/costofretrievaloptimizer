/**
 * Comprehensive Save Operations Validation Script
 *
 * Tests all save operations to ensure they:
 * 1. Complete within timeout (30s)
 * 2. Return proper success/error responses
 * 3. Actually persist data (verified by read-back)
 *
 * Run with: SUPABASE_SERVICE_ROLE_KEY="..." npx tsx scripts/test/validateSaveOperations.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://shtqshmmsrmtquuhyupl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

// Helper to measure test duration
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  console.log(`\n[TEST] Starting: ${name}`);

  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    console.log(`[PASS] ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration, error: errorMsg });
    console.log(`[FAIL] ${name} (${duration}ms): ${errorMsg}`);
  }
}

// Test timeout helper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// ================== TEST FUNCTIONS ==================

/**
 * Test 1: Verify topical_maps table can be updated (EAV save)
 */
async function testTopicalMapUpdate(): Promise<void> {
  // Get a test map
  const { data: maps, error: fetchError } = await supabase
    .from('topical_maps')
    .select('id, eavs, business_info')
    .limit(1)
    .single();

  if (fetchError || !maps) {
    throw new Error(`Failed to fetch test map: ${fetchError?.message || 'No maps found'}`);
  }

  const mapId = maps.id;
  const originalEavs = maps.eavs || [];

  // Create a test EAV to add
  const testEav = {
    entity: 'Test Entity',
    attribute: 'test_attribute',
    value: 'test_value_' + Date.now(),
    category: 'COMMON',
    classification: 'TYPE',
    source: 'validation_script'
  };

  // Add the test EAV
  const updatedEavs = [...originalEavs, testEav];

  // Update with timeout
  const { data: updateResult, error: updateError } = await withTimeout(
    supabase
      .from('topical_maps')
      .update({ eavs: updatedEavs, updated_at: new Date().toISOString() })
      .eq('id', mapId)
      .select('id, eavs'),
    30000,
    'topical_maps update'
  );

  if (updateError) {
    throw new Error(`Update failed: ${updateError.message}`);
  }

  if (!updateResult || updateResult.length === 0) {
    throw new Error('Update returned no data - possible RLS issue');
  }

  // Verify by reading back
  const { data: verifyData, error: verifyError } = await supabase
    .from('topical_maps')
    .select('eavs')
    .eq('id', mapId)
    .single();

  if (verifyError || !verifyData) {
    throw new Error(`Verification read failed: ${verifyError?.message}`);
  }

  const savedEavs = verifyData.eavs || [];
  const foundTestEav = savedEavs.find((e: any) => e.value === testEav.value);

  if (!foundTestEav) {
    throw new Error('Test EAV was not found in saved data - write may have failed silently');
  }

  // Clean up - remove test EAV
  const cleanedEavs = savedEavs.filter((e: any) => e.value !== testEav.value);
  await supabase
    .from('topical_maps')
    .update({ eavs: cleanedEavs })
    .eq('id', mapId);

  console.log('  - EAV update verified successfully');
}

/**
 * Test 2: Verify user_settings table can be updated
 */
async function testUserSettingsUpdate(): Promise<void> {
  // Get a test user settings record
  const { data: settings, error: fetchError } = await supabase
    .from('user_settings')
    .select('id, user_id, ai_provider')
    .limit(1)
    .single();

  if (fetchError || !settings) {
    throw new Error(`Failed to fetch test settings: ${fetchError?.message || 'No settings found'}`);
  }

  const originalProvider = settings.ai_provider;
  const testProvider = 'test_provider_' + Date.now();

  // Update with timeout
  const { data: updateResult, error: updateError } = await withTimeout(
    supabase
      .from('user_settings')
      .update({ ai_provider: testProvider, updated_at: new Date().toISOString() })
      .eq('id', settings.id)
      .select('id, ai_provider'),
    30000,
    'user_settings update'
  );

  if (updateError) {
    throw new Error(`Update failed: ${updateError.message}`);
  }

  if (!updateResult || updateResult.length === 0) {
    throw new Error('Update returned no data - possible RLS issue');
  }

  // Verify by reading back
  const { data: verifyData, error: verifyError } = await supabase
    .from('user_settings')
    .select('ai_provider')
    .eq('id', settings.id)
    .single();

  if (verifyError || !verifyData) {
    throw new Error(`Verification read failed: ${verifyError?.message}`);
  }

  if (verifyData.ai_provider !== testProvider) {
    throw new Error(`Settings mismatch: expected "${testProvider}", got "${verifyData.ai_provider}"`);
  }

  // Restore original value
  await supabase
    .from('user_settings')
    .update({ ai_provider: originalProvider })
    .eq('id', settings.id);

  console.log('  - Settings update verified successfully');
}

/**
 * Test 3: Verify content_briefs table can be updated
 */
async function testContentBriefUpdate(): Promise<void> {
  // Get a test brief
  const { data: briefs, error: fetchError } = await supabase
    .from('content_briefs')
    .select('id, topic_id, article_draft')
    .limit(1)
    .single();

  if (fetchError || !briefs) {
    throw new Error(`Failed to fetch test brief: ${fetchError?.message || 'No briefs found'}`);
  }

  const briefId = briefs.id;
  const originalDraft = briefs.article_draft;
  const testDraft = 'Test draft content ' + Date.now();

  // Update with timeout
  const { data: updateResult, error: updateError } = await withTimeout(
    supabase
      .from('content_briefs')
      .update({ article_draft: testDraft, updated_at: new Date().toISOString() })
      .eq('id', briefId)
      .select('id, article_draft'),
    30000,
    'content_briefs update'
  );

  if (updateError) {
    throw new Error(`Update failed: ${updateError.message}`);
  }

  if (!updateResult || updateResult.length === 0) {
    throw new Error('Update returned no data - possible RLS issue');
  }

  // Verify by reading back
  const { data: verifyData, error: verifyError } = await supabase
    .from('content_briefs')
    .select('article_draft')
    .eq('id', briefId)
    .single();

  if (verifyError || !verifyData) {
    throw new Error(`Verification read failed: ${verifyError?.message}`);
  }

  if (verifyData.article_draft !== testDraft) {
    throw new Error(`Draft mismatch: expected test draft, got different content`);
  }

  // Restore original value
  await supabase
    .from('content_briefs')
    .update({ article_draft: originalDraft })
    .eq('id', briefId);

  console.log('  - Content brief update verified successfully');
}

/**
 * Test 4: Verify topics table can be updated
 */
async function testTopicUpdate(): Promise<void> {
  // Get a test topic - use description which is a text field
  const { data: topics, error: fetchError } = await supabase
    .from('topics')
    .select('id, title, description')
    .limit(1)
    .single();

  if (fetchError || !topics) {
    throw new Error(`Failed to fetch test topic: ${fetchError?.message || 'No topics found'}`);
  }

  const topicId = topics.id;
  const originalDescription = topics.description;
  const testDescription = 'Test description ' + Date.now();

  // Update with timeout
  const { data: updateResult, error: updateError } = await withTimeout(
    supabase
      .from('topics')
      .update({ description: testDescription, updated_at: new Date().toISOString() })
      .eq('id', topicId)
      .select('id, description'),
    30000,
    'topics update'
  );

  if (updateError) {
    throw new Error(`Update failed: ${updateError.message}`);
  }

  if (!updateResult || updateResult.length === 0) {
    throw new Error('Update returned no data - possible RLS issue');
  }

  // Verify by reading back
  const { data: verifyData, error: verifyError } = await supabase
    .from('topics')
    .select('description')
    .eq('id', topicId)
    .single();

  if (verifyError || !verifyData) {
    throw new Error(`Verification read failed: ${verifyError?.message}`);
  }

  if (verifyData.description !== testDescription) {
    throw new Error(`Description mismatch: expected "${testDescription}", got "${verifyData.description}"`);
  }

  // Restore original value
  await supabase
    .from('topics')
    .update({ description: originalDescription })
    .eq('id', topicId);

  console.log('  - Topic update verified successfully');
}

/**
 * Test 5: Test entity_resolution_cache upsert
 */
async function testEntityCacheUpsert(): Promise<void> {
  // Get a user ID to use
  const { data: users } = await supabase.auth.admin.listUsers();
  const userId = users?.users?.[0]?.id;

  if (!userId) {
    throw new Error('No users found for cache test');
  }

  const testEntity = {
    user_id: userId,
    entity_name: 'Test Entity ' + Date.now(),
    entity_type: 'Person',
    wikidata_id: 'Q' + Date.now(),
    wikipedia_url: null,
    resolved_data: { test: true },
    same_as_urls: [],
    confidence_score: 0.95,
    resolution_source: 'wikidata', // Valid source value
    last_verified_at: new Date().toISOString()
  };

  // Upsert with timeout
  const { data: upsertResult, error: upsertError } = await withTimeout(
    supabase
      .from('entity_resolution_cache')
      .upsert(testEntity, { onConflict: 'user_id,entity_name,entity_type' })
      .select('id'),
    30000,
    'entity_resolution_cache upsert'
  );

  if (upsertError) {
    throw new Error(`Upsert failed: ${upsertError.message}`);
  }

  if (!upsertResult || upsertResult.length === 0) {
    throw new Error('Upsert returned no data - possible RLS issue');
  }

  const insertedId = upsertResult[0].id;

  // Verify by reading back
  const { data: verifyData, error: verifyError } = await supabase
    .from('entity_resolution_cache')
    .select('*')
    .eq('id', insertedId)
    .single();

  if (verifyError || !verifyData) {
    throw new Error(`Verification read failed: ${verifyError?.message}`);
  }

  if (verifyData.entity_name !== testEntity.entity_name) {
    throw new Error(`Entity name mismatch: expected "${testEntity.entity_name}", got "${verifyData.entity_name}"`);
  }

  // Clean up - delete test entity
  await supabase
    .from('entity_resolution_cache')
    .delete()
    .eq('id', insertedId);

  console.log('  - Entity cache upsert verified successfully');
}

/**
 * Test 6: Test competitors update on topical_maps
 */
async function testCompetitorsUpdate(): Promise<void> {
  // Get a test map
  const { data: maps, error: fetchError } = await supabase
    .from('topical_maps')
    .select('id, competitors')
    .limit(1)
    .single();

  if (fetchError || !maps) {
    throw new Error(`Failed to fetch test map: ${fetchError?.message || 'No maps found'}`);
  }

  const mapId = maps.id;
  const originalCompetitors = maps.competitors || [];

  // Add a test competitor
  const testCompetitor = 'test-competitor-' + Date.now() + '.com';
  const updatedCompetitors = [...originalCompetitors, testCompetitor];

  // Update with timeout
  const { data: updateResult, error: updateError } = await withTimeout(
    supabase
      .from('topical_maps')
      .update({ competitors: updatedCompetitors, updated_at: new Date().toISOString() })
      .eq('id', mapId)
      .select('id, competitors'),
    30000,
    'topical_maps competitors update'
  );

  if (updateError) {
    throw new Error(`Update failed: ${updateError.message}`);
  }

  if (!updateResult || updateResult.length === 0) {
    throw new Error('Update returned no data - possible RLS issue');
  }

  // Verify by reading back
  const { data: verifyData, error: verifyError } = await supabase
    .from('topical_maps')
    .select('competitors')
    .eq('id', mapId)
    .single();

  if (verifyError || !verifyData) {
    throw new Error(`Verification read failed: ${verifyError?.message}`);
  }

  const savedCompetitors = verifyData.competitors || [];
  if (!savedCompetitors.includes(testCompetitor)) {
    throw new Error('Test competitor was not found in saved data');
  }

  // Clean up - remove test competitor
  const cleanedCompetitors = savedCompetitors.filter((c: string) => c !== testCompetitor);
  await supabase
    .from('topical_maps')
    .update({ competitors: cleanedCompetitors })
    .eq('id', mapId);

  console.log('  - Competitors update verified successfully');
}

// ================== MAIN EXECUTION ==================

async function main() {
  console.log('='.repeat(60));
  console.log('COMPREHENSIVE SAVE OPERATIONS VALIDATION');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);

  // Run all tests
  await runTest('Topical Map Update (EAV Save)', testTopicalMapUpdate);
  await runTest('User Settings Update', testUserSettingsUpdate);
  await runTest('Content Brief Update', testContentBriefUpdate);
  await runTest('Topic Update', testTopicUpdate);
  await runTest('Entity Cache Upsert', testEntityCacheUpsert);
  await runTest('Competitors Update', testCompetitorsUpdate);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Completed: ${new Date().toISOString()}`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
