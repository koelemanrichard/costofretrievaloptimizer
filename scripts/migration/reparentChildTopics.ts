/**
 * Reparent Child Topics to Correct Outer Parents
 *
 * Child topics (level 3) should be under outer topics (level 2), not directly under core.
 *
 * Run: npx tsx scripts/migration/reparentChildTopics.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.migration') });

const SUPABASE_URL = process.env.TARGET_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

// Outer topic IDs
const OUTER_TOPICS = {
  'Klachten & Meldingen Registratie': '4d8d4d8f-a253-493f-abaf-6b4193747c25',
  'Werkbonnen App & Management': 'e76933b4-84a7-4e03-b5f2-af4334a8b035',
  'Vastgoed Inspectie Software': 'd687997f-918a-40c8-bd4e-c45637bc1031',
  'MJOP Software (Meerjarenonderhoudsplan)': '1c2b0011-2bb7-45ea-b386-1612d36c558b',
  'Leveranciersbeheer Vastgoed': '98b9ebd8-c342-4ab3-b210-6198a90a8db1',
  'Planmatig Onderhoud Beheren': 'a82244fb-f789-4e09-8b4a-f2ce8e73aa23',
  'Bouwkundige Dossieropbouw': '956aca57-2f91-401b-bc9b-d7b86c2a0be9',
};

// Mapping child topics to their correct outer parents
const CHILD_TO_PARENT: Record<string, string> = {
  'Digitale Woning Inspectie App': OUTER_TOPICS['Vastgoed Inspectie Software'],
  'Leveranciersportaal voor Onderhoud': OUTER_TOPICS['Leveranciersbeheer Vastgoed'],
  'Meerjarenonderhoudsplan (MJOP) Software': OUTER_TOPICS['MJOP Software (Meerjarenonderhoudsplan)'],
  'Meldingenbeheer & Ticketsysteem': OUTER_TOPICS['Klachten & Meldingen Registratie'],
  'Werkbonnen Management Systeem': OUTER_TOPICS['Werkbonnen App & Management'],
  'Kostenbesparing door Automatisering': OUTER_TOPICS['Planmatig Onderhoud Beheren'],
  // "Planmatig Onderhoud Beheren" (child) is a duplicate - will handle separately
};

async function main() {
  console.log('='.repeat(60));
  console.log('REPARENT CHILD TOPICS');
  console.log('='.repeat(60));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const CORE_TOPIC_ID = '686694f6-c71f-4e24-9af7-a7452c3028a0';

  // Get all child-type topics under the core topic
  const { data: childTopics } = await supabase
    .from('topics')
    .select('id, title, type')
    .eq('parent_topic_id', CORE_TOPIC_ID)
    .eq('type', 'child');

  console.log(`\nFound ${childTopics?.length} child topics directly under core:`);

  for (const child of childTopics || []) {
    const newParentId = CHILD_TO_PARENT[child.title];

    if (newParentId) {
      // Get parent name for logging
      const parentName = Object.entries(OUTER_TOPICS).find(([_, id]) => id === newParentId)?.[0];

      console.log(`\n  ${child.title}`);
      console.log(`    → Moving to: ${parentName}`);

      const { error } = await supabase
        .from('topics')
        .update({ parent_topic_id: newParentId })
        .eq('id', child.id);

      if (error) {
        console.log(`    ❌ Error: ${error.message}`);
      } else {
        console.log(`    ✅ Done`);
      }
    } else if (child.title === 'Planmatig Onderhoud Beheren') {
      // This is a duplicate - rename it to distinguish from outer topic
      console.log(`\n  ${child.title}`);
      console.log(`    → Renaming to avoid duplicate`);

      const { error } = await supabase
        .from('topics')
        .update({
          title: 'Planmatig Onderhoud - Werkprocessen',
          parent_topic_id: OUTER_TOPICS['Planmatig Onderhoud Beheren']
        })
        .eq('id', child.id);

      if (error) {
        console.log(`    ❌ Error: ${error.message}`);
      } else {
        console.log(`    ✅ Renamed and reparented`);
      }
    } else {
      console.log(`\n  ${child.title}`);
      console.log(`    ⚠️ No mapping found - keeping under core`);
    }
  }

  // Verify final hierarchy
  console.log('\n' + '='.repeat(60));
  console.log('FINAL HIERARCHY');
  console.log('='.repeat(60));

  // Get core topic
  const { data: core } = await supabase
    .from('topics')
    .select('id, title, type')
    .eq('id', CORE_TOPIC_ID)
    .single();

  console.log(`\n[${core?.type}] ${core?.title}`);

  // Get outer topics
  const { data: outerTopics } = await supabase
    .from('topics')
    .select('id, title, type')
    .eq('parent_topic_id', CORE_TOPIC_ID)
    .order('title');

  for (const outer of outerTopics || []) {
    console.log(`  └─ [${outer.type}] ${outer.title}`);

    // Get child topics for this outer topic
    const { data: children } = await supabase
      .from('topics')
      .select('id, title, type')
      .eq('parent_topic_id', outer.id)
      .order('title');

    for (const child of children || []) {
      console.log(`       └─ [${child.type}] ${child.title}`);
    }
  }
}

main().catch(console.error);
