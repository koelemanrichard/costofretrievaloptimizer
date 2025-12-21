/**
 * Cleanup Duplicate Topics
 *
 * Removes duplicate "Technisch Beheer & Onderhoud" topics in map 2ea28b9d
 * and verifies children point to the correct parent.
 *
 * Run: npx tsx scripts/migration/cleanupDuplicates.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.migration') });

const SUPABASE_URL = process.env.TARGET_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

const MAP_ID = '2ea28b9d-77bb-458c-9aca-7e79722fcda4';

// The correct core topic
const CORRECT_CORE_ID = '686694f6-c71f-4e24-9af7-a7452c3028a0';

// Duplicate topics to remove
const DUPLICATE_IDS = [
  'fd4d23cc-9715-41ba-980c-9dc14b86e67f', // Orphaned OUTER
  '27211242-db8e-4fa7-ba51-872e3304849e', // Duplicate OUTER created today
];

// Expected children of the core topic
const EXPECTED_CHILDREN = [
  { id: '4d8d4d8f-a253-493f-abaf-6b4193747c25', title: 'Klachten & Meldingen Registratie' },
  { id: 'e76933b4-84a7-4e03-b5f2-af4334a8b035', title: 'Werkbonnen App & Management' },
  { id: 'd687997f-918a-40c8-bd4e-c45637bc1031', title: 'Vastgoed Inspectie Software' },
  { id: '1c2b0011-2bb7-45ea-b386-1612d36c558b', title: 'MJOP Software' },
  { id: '98b9ebd8-c342-4ab3-b210-6198a90a8db1', title: 'Leveranciersbeheer Vastgoed' },
  { id: 'a82244fb-f789-4e09-8b4a-f2ce8e73aa23', title: 'Planmatig Onderhoud Beheren' },
  { id: '956aca57-2f91-401b-bc9b-d7b86c2a0be9', title: 'Bouwkundige Dossieropbouw' },
];

async function main() {
  console.log('='.repeat(60));
  console.log('CLEANUP DUPLICATE TOPICS');
  console.log('='.repeat(60));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Step 1: Check current state of children
  console.log('\n[Step 1] Checking children of core topic...');
  for (const child of EXPECTED_CHILDREN) {
    const { data } = await supabase
      .from('topics')
      .select('id, title, parent_topic_id')
      .eq('id', child.id)
      .single();

    const status = data?.parent_topic_id === CORRECT_CORE_ID ? '✅' : '❌';
    console.log(`${status} ${child.title}`);
    console.log(`   Parent: ${data?.parent_topic_id || 'null'}`);
    console.log(`   Expected: ${CORRECT_CORE_ID}`);
  }

  // Step 2: Fix any children with wrong parent
  console.log('\n[Step 2] Ensuring all children point to correct parent...');
  for (const child of EXPECTED_CHILDREN) {
    const { data, error } = await supabase
      .from('topics')
      .update({ parent_topic_id: CORRECT_CORE_ID })
      .eq('id', child.id)
      .select('id, title');

    if (error) {
      console.log(`Error updating ${child.title}:`, error.message);
    } else if (data?.length) {
      console.log(`Updated: ${data[0].title}`);
    }
  }

  // Step 3: Check if duplicates have any children
  console.log('\n[Step 3] Checking if duplicates have children...');
  for (const dupeId of DUPLICATE_IDS) {
    const { data: children } = await supabase
      .from('topics')
      .select('id, title')
      .eq('parent_topic_id', dupeId);

    console.log(`\nDuplicate ${dupeId}:`);
    if (children?.length) {
      console.log(`  Has ${children.length} children - reparenting...`);
      for (const child of children) {
        const { error } = await supabase
          .from('topics')
          .update({ parent_topic_id: CORRECT_CORE_ID })
          .eq('id', child.id);

        if (error) {
          console.log(`  Error reparenting ${child.title}:`, error.message);
        } else {
          console.log(`  Reparented: ${child.title}`);
        }
      }
    } else {
      console.log(`  No children - safe to delete`);
    }
  }

  // Step 4: Delete duplicate topics
  console.log('\n[Step 4] Deleting duplicate topics...');
  for (const dupeId of DUPLICATE_IDS) {
    const { data, error } = await supabase
      .from('topics')
      .delete()
      .eq('id', dupeId)
      .select('id, title');

    if (error) {
      console.log(`Error deleting ${dupeId}:`, error.message);
    } else if (data?.length) {
      console.log(`Deleted: ${data[0].title} (${dupeId})`);
    } else {
      console.log(`Not found or already deleted: ${dupeId}`);
    }
  }

  // Step 5: Verify final state
  console.log('\n' + '='.repeat(60));
  console.log('FINAL STATE');
  console.log('='.repeat(60));

  const { data: core } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('id', CORRECT_CORE_ID)
    .single();

  console.log('\nCore topic:');
  console.log(`  ${core?.title}`);
  console.log(`  Type: ${core?.type}`);
  console.log(`  Parent: ${core?.parent_topic_id || 'null'}`);

  const { data: children } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('parent_topic_id', CORRECT_CORE_ID)
    .order('title');

  console.log(`\nChildren (${children?.length}):`);
  children?.forEach(child => {
    console.log(`  └─ ${child.title} [${child.type}]`);
  });

  // Check for any remaining duplicates
  console.log('\n\nRemaining "Technisch Beheer" topics in map:');
  const { data: remaining } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('map_id', MAP_ID)
    .ilike('title', '%Technisch Beheer%');

  remaining?.forEach(t => {
    console.log(`  [${t.type}] ${t.title} (${t.id})`);
  });
}

main().catch(console.error);
