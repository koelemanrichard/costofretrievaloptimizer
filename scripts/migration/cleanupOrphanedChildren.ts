/**
 * Cleanup Orphaned Child Topics
 *
 * The child topics that were parented to the deleted duplicate should be removed
 * as they are duplicates of the existing outer topics.
 *
 * Run: npx tsx scripts/migration/cleanupOrphanedChildren.ts
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
  console.log('CLEANUP ORPHANED CHILD TOPICS');
  console.log('='.repeat(60));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Get all children of the core topic
  console.log('\n[Step 1] Getting all children of core topic...');
  const { data: children } = await supabase
    .from('topics')
    .select('id, title, type, created_at')
    .eq('parent_topic_id', CORE_TOPIC_ID)
    .order('title');

  console.log(`\nFound ${children?.length} children:`);
  children?.forEach(c => {
    console.log(`  [${c.type}] ${c.title} (created: ${c.created_at?.split('T')[0]})`);
  });

  // Identify the 7 original outer topics (the ones we want to keep)
  const KEEP_OUTER_IDS = [
    '4d8d4d8f-a253-493f-abaf-6b4193747c25', // Klachten & Meldingen Registratie
    'e76933b4-84a7-4e03-b5f2-af4334a8b035', // Werkbonnen App & Management
    'd687997f-918a-40c8-bd4e-c45637bc1031', // Vastgoed Inspectie Software
    '1c2b0011-2bb7-45ea-b386-1612d36c558b', // MJOP Software
    '98b9ebd8-c342-4ab3-b210-6198a90a8db1', // Leveranciersbeheer Vastgoed
    'a82244fb-f789-4e09-8b4a-f2ce8e73aa23', // Planmatig Onderhoud Beheren
    '956aca57-2f91-401b-bc9b-d7b86c2a0be9', // Bouwkundige Dossieropbouw
  ];

  // Find child topics that should be deleted
  const childrenToDelete = children?.filter(c =>
    c.type === 'child' && !KEEP_OUTER_IDS.includes(c.id)
  ) || [];

  console.log(`\n[Step 2] Child topics to delete (${childrenToDelete.length}):`);
  childrenToDelete.forEach(c => {
    console.log(`  - ${c.title} (${c.id})`);
  });

  if (childrenToDelete.length === 0) {
    console.log('  (none)');
    return;
  }

  // Delete the orphaned child topics
  console.log('\n[Step 3] Deleting orphaned child topics...');
  for (const child of childrenToDelete) {
    // First check if this topic has any content briefs
    const { data: briefs } = await supabase
      .from('content_briefs')
      .select('id')
      .eq('topic_id', child.id);

    if (briefs?.length) {
      console.log(`  Skipping ${child.title} - has ${briefs.length} content briefs`);
      continue;
    }

    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', child.id);

    if (error) {
      console.log(`  Error deleting ${child.title}:`, error.message);
    } else {
      console.log(`  Deleted: ${child.title}`);
    }
  }

  // Verify final state
  console.log('\n' + '='.repeat(60));
  console.log('FINAL STATE');
  console.log('='.repeat(60));

  const { data: finalChildren } = await supabase
    .from('topics')
    .select('id, title, type')
    .eq('parent_topic_id', CORE_TOPIC_ID)
    .order('title');

  console.log(`\nChildren of Technisch Beheer & Onderhoud (${finalChildren?.length}):`);
  finalChildren?.forEach(c => {
    console.log(`  └─ [${c.type}] ${c.title}`);
  });
}

main().catch(console.error);
