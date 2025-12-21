/**
 * Fix Topic Hierarchy Script
 *
 * This script fixes the topic types and parent relationships that were incorrectly modified.
 *
 * Changes to make:
 * 1. Technisch Beheer & Onderhoud (686694f6...) - Change from 'outer' back to 'core', parent_id = null
 * 2. All the "outer" topics that should be under Technisch Beheer - fix parent_topic_id and type
 *
 * From the backup, the correct structure is:
 * - Technisch Beheer & Onderhoud (686694f6...) - type: core, parent: null
 *   └─ Klachten & Meldingen Registratie (4d8d4d8f...) - type: outer, parent: 686694f6...
 *   └─ Werkbonnen App & Management (e76933b4...) - type: outer, parent: 686694f6...
 *   └─ Vastgoed Inspectie Software (d687997f...) - type: outer, parent: 686694f6...
 *   └─ MJOP Software (1c2b0011...) - type: outer, parent: 686694f6...
 *   └─ Leveranciersbeheer Vastgoed (98b9ebd8...) - type: outer, parent: 686694f6...
 *   └─ Planmatig Onderhoud Beheren (a82244fb...) - type: outer, parent: 686694f6...
 *   └─ Bouwkundige Dossieropbouw (956aca57...) - type: outer, parent: 686694f6...
 *
 * Run: npx tsx scripts/migration/fixTopicHierarchy.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.migration') });

const SUPABASE_URL = process.env.TARGET_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

// The correct parent topic (Technisch Beheer & Onderhoud)
const TECHNISCH_BEHEER_ID = '686694f6-c71f-4e24-9af7-a7452c3028a0';

// Topics that should be children (outer) of Technisch Beheer
const TOPIC_FIXES = [
  {
    id: '686694f6-c71f-4e24-9af7-a7452c3028a0',
    title: 'Technisch Beheer & Onderhoud',
    correctType: 'core',
    correctParentId: null,
    correctSlug: 'technisch-beheer-onderhoud'
  },
  {
    id: '4d8d4d8f-a253-493f-abaf-6b4193747c25',
    title: 'Klachten & Meldingen Registratie',
    correctType: 'outer',
    correctParentId: TECHNISCH_BEHEER_ID,
    correctSlug: 'technisch-beheer-onderhoud/klachten-meldingen-registratie'
  },
  {
    id: 'e76933b4-84a7-4e03-b5f2-af4334a8b035',
    title: 'Werkbonnen App & Management',
    correctType: 'outer',
    correctParentId: TECHNISCH_BEHEER_ID,
    correctSlug: 'technisch-beheer-onderhoud/werkbonnen-app-management'
  },
  {
    id: 'd687997f-918a-40c8-bd4e-c45637bc1031',
    title: 'Vastgoed Inspectie Software',
    correctType: 'outer',
    correctParentId: TECHNISCH_BEHEER_ID,
    correctSlug: 'technisch-beheer-onderhoud/vastgoed-inspectie-software'
  },
  {
    id: '1c2b0011-2bb7-45ea-b386-1612d36c558b',
    title: 'MJOP Software (Meerjarenonderhoudsplan)',
    correctType: 'outer',
    correctParentId: TECHNISCH_BEHEER_ID,
    correctSlug: 'technisch-beheer-onderhoud/mjop-software-meerjarenonderhoudsplan'
  },
  {
    id: '98b9ebd8-c342-4ab3-b210-6198a90a8db1',
    title: 'Leveranciersbeheer Vastgoed',
    correctType: 'outer',
    correctParentId: TECHNISCH_BEHEER_ID,
    correctSlug: 'technisch-beheer-onderhoud/leveranciersbeheer-vastgoed'
  },
  {
    id: 'a82244fb-f789-4e09-8b4a-f2ce8e73aa23',
    title: 'Planmatig Onderhoud Beheren',
    correctType: 'outer',
    correctParentId: TECHNISCH_BEHEER_ID,
    correctSlug: 'technisch-beheer-onderhoud/planmatig-onderhoud-beheren'
  },
  {
    id: '956aca57-2f91-401b-bc9b-d7b86c2a0be9',
    title: 'Bouwkundige Dossieropbouw',
    correctType: 'outer',
    correctParentId: TECHNISCH_BEHEER_ID,
    correctSlug: 'technisch-beheer-onderhoud/bouwkundige-dossieropbouw'
  }
];

async function main() {
  console.log('='.repeat(70));
  console.log('FIX TOPIC HIERARCHY');
  console.log('='.repeat(70));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Step 1: Get current state
  console.log('\n[Step 1] Checking current state...');
  const { data: currentTopics, error: fetchError } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id, slug')
    .in('id', TOPIC_FIXES.map(t => t.id));

  if (fetchError) {
    console.error('ERROR fetching topics:', fetchError.message);
    process.exit(1);
  }

  console.log(`Found ${currentTopics?.length || 0} topics to fix:\n`);

  // Step 2: Apply fixes - CORE topic first
  console.log('[Step 2] Fixing core topic first (Technisch Beheer & Onderhoud)...');

  const coreFix = TOPIC_FIXES.find(t => t.correctType === 'core')!;
  const currentCore = currentTopics?.find(t => t.id === coreFix.id);

  console.log(`\n  Current: type=${currentCore?.type}, parent=${currentCore?.parent_topic_id || 'null'}`);
  console.log(`  Correct: type=${coreFix.correctType}, parent=${coreFix.correctParentId || 'null'}`);

  const { error: coreError } = await supabase
    .from('topics')
    .update({
      type: coreFix.correctType,
      parent_topic_id: coreFix.correctParentId,
      slug: coreFix.correctSlug,
      updated_at: new Date().toISOString()
    })
    .eq('id', coreFix.id);

  if (coreError) {
    console.error(`  ERROR updating core topic:`, coreError.message);
  } else {
    console.log(`  SUCCESS: Updated to type=${coreFix.correctType}`);
  }

  // Step 3: Fix outer topics
  console.log('\n[Step 3] Fixing outer topics...');

  const outerFixes = TOPIC_FIXES.filter(t => t.correctType === 'outer');

  for (const fix of outerFixes) {
    const current = currentTopics?.find(t => t.id === fix.id);
    console.log(`\n  Fixing: "${fix.title}"`);
    console.log(`    Current: type=${current?.type}, parent=${current?.parent_topic_id || 'null'}`);
    console.log(`    Correct: type=${fix.correctType}, parent=${fix.correctParentId}`);

    const { error } = await supabase
      .from('topics')
      .update({
        type: fix.correctType,
        parent_topic_id: fix.correctParentId,
        slug: fix.correctSlug,
        updated_at: new Date().toISOString()
      })
      .eq('id', fix.id);

    if (error) {
      console.error(`    ERROR:`, error.message);
    } else {
      console.log(`    SUCCESS`);
    }
  }

  // Step 4: Verify fixes
  console.log('\n[Step 4] Verifying fixes...');
  const { data: fixedTopics, error: verifyError } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id, slug')
    .in('id', TOPIC_FIXES.map(t => t.id));

  if (verifyError) {
    console.error('ERROR verifying:', verifyError.message);
  } else {
    console.log('\nFinal state:');
    fixedTopics?.forEach(t => {
      const typeOk = TOPIC_FIXES.find(f => f.id === t.id)?.correctType === t.type ? '✓' : '✗';
      const parentOk = TOPIC_FIXES.find(f => f.id === t.id)?.correctParentId === t.parent_topic_id ? '✓' : '✗';
      console.log(`  [${t.type}] ${t.title} (type:${typeOk} parent:${parentOk})`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('HIERARCHY FIX COMPLETE');
  console.log('='.repeat(70));
  console.log('\nPlease reload the application to see the corrected hierarchy.');
}

main().catch(console.error);
