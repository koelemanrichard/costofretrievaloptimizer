/**
 * Check Specific Topics Script
 *
 * Checks the current state of the specific missing topics.
 *
 * Run: npx tsx scripts/migration/checkSpecificTopics.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.migration') });

const SUPABASE_URL = process.env.TARGET_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

const TOPIC_IDS = [
  '686694f6-c71f-4e24-9af7-a7452c3028a0', // Technisch Beheer & Onderhoud (core)
  '4d8d4d8f-a253-493f-abaf-6b4193747c25', // Klachten & Meldingen Registratie
  'e76933b4-84a7-4e03-b5f2-af4334a8b035', // Werkbonnen App & Management
  'd687997f-918a-40c8-bd4e-c45637bc1031', // Vastgoed Inspectie Software
  '1c2b0011-2bb7-45ea-b386-1612d36c558b', // MJOP Software (Meerjarenonderhoudsplan)
  '98b9ebd8-c342-4ab3-b210-6198a90a8db1', // Leveranciersbeheer Vastgoed
  'a82244fb-f789-4e09-8b4a-f2ce8e73aa23', // Planmatig Onderhoud Beheren
  '956aca57-2f91-401b-bc9b-d7b86c2a0be9', // Bouwkundige Dossieropbouw
];

async function main() {
  console.log('Checking specific topics by ID...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: topics, error } = await supabase
    .from('topics')
    .select('id, title, type, slug, parent_topic_id, map_id')
    .in('id', TOPIC_IDS);

  if (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }

  console.log(`Found ${topics?.length || 0} topics:\n`);

  topics?.forEach(t => {
    console.log(`Title:     ${t.title}`);
    console.log(`ID:        ${t.id}`);
    console.log(`Type:      ${t.type}`);
    console.log(`Map ID:    ${t.map_id}`);
    console.log(`Parent ID: ${t.parent_topic_id || 'null (root)'}`);
    console.log(`Slug:      ${t.slug}`);
    console.log('-'.repeat(60));
  });

  // Also check if there's a different "Technisch Beheer" in the same map
  const MAP_ID = '2ea28b9d-77bb-458c-9aca-7e79722fcda4';
  console.log(`\n\nSearching for "Technisch" in map ${MAP_ID}:\n`);

  const { data: technischTopics, error: err2 } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('map_id', MAP_ID)
    .ilike('title', '%technisch%');

  if (err2) {
    console.error('ERROR:', err2.message);
  } else {
    console.log(`Found ${technischTopics?.length || 0} topics with "Technisch":`);
    technischTopics?.forEach(t => {
      console.log(`  [${t.type}] ${t.title} (${t.id.slice(0, 8)}...) parent: ${t.parent_topic_id || 'null'}`);
    });
  }
}

main().catch(console.error);
