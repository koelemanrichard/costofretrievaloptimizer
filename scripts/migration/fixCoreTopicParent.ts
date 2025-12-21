/**
 * Fix Core Topic Parent - Sets parent_topic_id to null for core topic
 *
 * Run: npx tsx scripts/migration/fixCoreTopicParent.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.migration') });

const SUPABASE_URL = process.env.TARGET_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

const CORE_TOPIC_ID = '686694f6-c71f-4e24-9af7-a7452c3028a0';

async function main() {
  console.log('='.repeat(60));
  console.log('FIX CORE TOPIC PARENT');
  console.log('='.repeat(60));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Get current state
  console.log('\n[Step 1] Current state:');
  const { data: before } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('id', CORE_TOPIC_ID)
    .single();

  console.log('Before:', before);

  // Fix: Core topic should have no parent
  console.log('\n[Step 2] Setting parent_topic_id to null...');
  const { data, error } = await supabase
    .from('topics')
    .update({ parent_topic_id: null, updated_at: new Date().toISOString() })
    .eq('id', CORE_TOPIC_ID)
    .select('id, title, type, parent_topic_id');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Updated:', data);
  }

  // Verify
  console.log('\n[Step 3] Verifying:');
  const { data: after } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('id', CORE_TOPIC_ID)
    .single();

  console.log('After:', after);

  if (after?.type === 'core' && after?.parent_topic_id === null) {
    console.log('\n✅ SUCCESS: Core topic now has no parent');
  } else {
    console.log('\n❌ FAILED: Topic still has issues');
  }

  // Check for duplicates
  console.log('\n' + '='.repeat(60));
  console.log('CHECKING FOR DUPLICATE TOPICS');
  console.log('='.repeat(60));

  const { data: dupes } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id, map_id, created_at')
    .ilike('title', '%Technisch Beheer%')
    .order('created_at', { ascending: true });

  console.log('\nAll "Technisch Beheer" topics found:', dupes?.length);
  dupes?.forEach((t, i) => {
    console.log(`\n[${i + 1}] ${t.type.toUpperCase()}: ${t.title}`);
    console.log(`    ID: ${t.id}`);
    console.log(`    Parent: ${t.parent_topic_id || 'null'}`);
    console.log(`    Map: ${t.map_id}`);
    console.log(`    Created: ${t.created_at}`);
  });
}

main().catch(console.error);
