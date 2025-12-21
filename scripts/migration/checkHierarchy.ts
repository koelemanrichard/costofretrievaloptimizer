/**
 * Check Full Hierarchy
 */
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.migration') });

const supabase = createClient(
  process.env.TARGET_SUPABASE_URL!,
  process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Check the parent core topic
  const parentId = '0c34bc53-7469-4c87-97a8-11c9c75c912d';
  const { data: parent } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('id', parentId)
    .single();

  console.log('='.repeat(60));
  console.log('CURRENT HIERARCHY');
  console.log('='.repeat(60));

  if (parent) {
    console.log(`\n[${parent.type.toUpperCase()}] ${parent.title}`);
    console.log(`  ID: ${parent.id}`);

    // Get Technisch Beheer (outer under this core)
    const { data: technischBeheer } = await supabase
      .from('topics')
      .select('id, title, type, parent_topic_id')
      .eq('id', '686694f6-c71f-4e24-9af7-a7452c3028a0')
      .single();

    if (technischBeheer) {
      console.log(`  └─ [${technischBeheer.type.toUpperCase()}] ${technischBeheer.title}`);
      console.log(`      ID: ${technischBeheer.id}`);
      console.log(`      Parent: ${technischBeheer.parent_topic_id}`);

      // Get children of Technisch Beheer
      const { data: children } = await supabase
        .from('topics')
        .select('id, title, type')
        .eq('parent_topic_id', technischBeheer.id)
        .order('title');

      console.log(`\n      Children (${children?.length || 0}):`);
      children?.forEach(c => {
        console.log(`        └─ [${c.type.toUpperCase()}] ${c.title}`);
      });
    }
  } else {
    console.log('Parent not found:', parentId);
  }

  // Check for orphaned topics
  console.log('\n' + '='.repeat(60));
  console.log('CHECKING FOR DISPLAY ISSUES');
  console.log('='.repeat(60));

  // Outer topics without a core parent
  const { data: outerTopics } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('map_id', '2ea28b9d-77bb-458c-9aca-7e79722fcda4')
    .eq('type', 'outer');

  const { data: coreTopics } = await supabase
    .from('topics')
    .select('id')
    .eq('map_id', '2ea28b9d-77bb-458c-9aca-7e79722fcda4')
    .eq('type', 'core');

  const coreIds = new Set(coreTopics?.map(t => t.id));

  console.log('\nOuter topics with valid core parent:');
  outerTopics?.forEach(t => {
    const hasValidParent = t.parent_topic_id && coreIds.has(t.parent_topic_id);
    const status = hasValidParent ? '✅' : '❌';
    console.log(`  ${status} ${t.title} (parent: ${t.parent_topic_id || 'null'})`);
  });

  // Child topics
  const { data: childTopics } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('map_id', '2ea28b9d-77bb-458c-9aca-7e79722fcda4')
    .eq('type', 'child');

  const outerIds = new Set(outerTopics?.map(t => t.id));

  console.log('\nChild topics with valid outer parent:');
  childTopics?.forEach(t => {
    const hasValidParent = t.parent_topic_id && outerIds.has(t.parent_topic_id);
    const status = hasValidParent ? '✅' : '❌';
    console.log(`  ${status} ${t.title} (parent: ${t.parent_topic_id || 'null'})`);
  });
}

main().catch(console.error);
