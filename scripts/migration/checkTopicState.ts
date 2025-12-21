/**
 * Check Topic State Script
 *
 * Checks the current state of the topics in the database to diagnose display issues.
 *
 * Run: npx tsx scripts/migration/checkTopicState.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.migration
dotenv.config({ path: path.join(process.cwd(), '.env.migration') });

const SUPABASE_URL = process.env.TARGET_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

const MAP_ID = '2ea28b9d-77bb-458c-9aca-7e79722fcda4';

async function main() {
  console.log('='.repeat(70));
  console.log('CHECK TOPIC STATE');
  console.log('='.repeat(70));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Get all topics for this map
  console.log(`\nFetching all topics for map: ${MAP_ID}\n`);

  const { data: topics, error } = await supabase
    .from('topics')
    .select('id, title, type, slug, parent_topic_id')
    .eq('map_id', MAP_ID)
    .order('type')
    .order('title');

  if (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }

  console.log(`Found ${topics?.length || 0} topics\n`);

  // Group by type
  const coreTopics = topics?.filter(t => t.type === 'core') || [];
  const outerTopics = topics?.filter(t => t.type === 'outer') || [];
  const childTopics = topics?.filter(t => t.type === 'child') || [];

  console.log(`CORE Topics (${coreTopics.length}):`);
  console.log('-'.repeat(70));
  coreTopics.forEach(t => {
    console.log(`  [${t.type}] ${t.title}`);
    console.log(`         ID: ${t.id}`);
    console.log(`       Slug: ${t.slug}`);
    console.log(`     Parent: ${t.parent_topic_id || 'null (root)'}`);
    console.log();
  });

  // Filter to just Technisch Beheer and its children
  const technischBeheerCore = topics?.find(t =>
    t.title === 'Technisch Beheer & Onderhoud' && t.type === 'core'
  );

  if (technischBeheerCore) {
    console.log('\n' + '='.repeat(70));
    console.log('TECHNISCH BEHEER HIERARCHY');
    console.log('='.repeat(70));

    console.log(`\nCORE: ${technischBeheerCore.title}`);
    console.log(`      ID: ${technischBeheerCore.id}`);
    console.log(`    Type: ${technischBeheerCore.type}`);
    console.log(`  Parent: ${technischBeheerCore.parent_topic_id || 'null (root)'}`);

    // Find all topics with this as parent
    const children = topics?.filter(t => t.parent_topic_id === technischBeheerCore.id) || [];
    console.log(`\nOUTER/CHILD Topics with parent=${technischBeheerCore.id} (${children.length}):`);
    children.forEach(t => {
      console.log(`  └─ [${t.type}] ${t.title}`);
      console.log(`            ID: ${t.id}`);
      console.log(`          Slug: ${t.slug}`);
    });

    // Check if there are any with wrong parent
    const searchTerms = ['Werkbonnen', 'MJOP', 'Leveranciers', 'Klachten', 'Inspectie', 'Planmatig', 'Bouwkundige'];
    const relevantTopics = topics?.filter(t =>
      searchTerms.some(term => t.title.toLowerCase().includes(term.toLowerCase()))
    ) || [];

    console.log(`\n\nALL TOPICS matching search terms (${relevantTopics.length}):`);
    relevantTopics.forEach(t => {
      const isCorrectParent = t.parent_topic_id === technischBeheerCore.id;
      const parentStatus = t.parent_topic_id === null ? '(no parent - ROOT)' :
                          isCorrectParent ? '(correct parent)' :
                          `(WRONG parent: ${t.parent_topic_id})`;
      console.log(`  [${t.type.padEnd(5)}] ${t.title}`);
      console.log(`          Parent: ${t.parent_topic_id || 'null'} ${parentStatus}`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Core topics:  ${coreTopics.length}`);
  console.log(`  Outer topics: ${outerTopics.length}`);
  console.log(`  Child topics: ${childTopics.length}`);
  console.log(`  TOTAL:        ${topics?.length}`);
}

main().catch(console.error);
