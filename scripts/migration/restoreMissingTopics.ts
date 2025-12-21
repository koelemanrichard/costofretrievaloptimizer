/**
 * Restore Missing Topics Script
 *
 * This script restores the missing topics for "Technisch Beheer & Onderhoud"
 * from the December 15 backup to the target Supabase database.
 *
 * Topics to restore (from map_id: 2ea28b9d-77bb-458c-9aca-7e79722fcda4):
 * 1. Technisch Beheer & Onderhoud (core topic) - 686694f6-c71f-4e24-9af7-a7452c3028a0
 * 2. Klachten & Meldingen Registratie - 4d8d4d8f-a253-493f-abaf-6b4193747c25
 * 3. Werkbonnen App & Management - e76933b4-84a7-4e03-b5f2-af4334a8b035
 * 4. Vastgoed Inspectie Software - d687997f-918a-40c8-bd4e-c45637bc1031
 * 5. MJOP Software (Meerjarenonderhoudsplan) - 1c2b0011-2bb7-45ea-b386-1612d36c558b
 * 6. Leveranciersbeheer Vastgoed - 98b9ebd8-c342-4ab3-b210-6198a90a8db1
 * 7. Planmatig Onderhoud Beheren - a82244fb-f789-4e09-8b4a-f2ce8e73aa23
 * 8. Bouwkundige Dossieropbouw - 956aca57-2f91-401b-bc9b-d7b86c2a0be9
 *
 * Run: npx tsx scripts/migration/restoreMissingTopics.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.migration
dotenv.config({ path: path.join(process.cwd(), '.env.migration') });

const SUPABASE_URL = process.env.TARGET_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

// IDs of topics to restore (from map 2ea28b9d-77bb-458c-9aca-7e79722fcda4)
const TOPIC_IDS_TO_RESTORE = [
  '686694f6-c71f-4e24-9af7-a7452c3028a0', // Technisch Beheer & Onderhoud (core)
  '4d8d4d8f-a253-493f-abaf-6b4193747c25', // Klachten & Meldingen Registratie
  'e76933b4-84a7-4e03-b5f2-af4334a8b035', // Werkbonnen App & Management
  'd687997f-918a-40c8-bd4e-c45637bc1031', // Vastgoed Inspectie Software
  '1c2b0011-2bb7-45ea-b386-1612d36c558b', // MJOP Software (Meerjarenonderhoudsplan)
  '98b9ebd8-c342-4ab3-b210-6198a90a8db1', // Leveranciersbeheer Vastgoed
  'a82244fb-f789-4e09-8b4a-f2ce8e73aa23', // Planmatig Onderhoud Beheren
  '956aca57-2f91-401b-bc9b-d7b86c2a0be9', // Bouwkundige Dossieropbouw
];

const MAP_ID = '2ea28b9d-77bb-458c-9aca-7e79722fcda4';
const BACKUP_PATH = path.join(process.cwd(), 'backup/2025-12-15T14-08-36-696Z/tables/topics.json');

async function main() {
  console.log('='.repeat(60));
  console.log('RESTORE MISSING TOPICS');
  console.log('='.repeat(60));

  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('ERROR: Missing TARGET_SUPABASE_URL or TARGET_SUPABASE_SERVICE_ROLE_KEY');
    console.error('Make sure .env.migration file exists and has the required values.');
    process.exit(1);
  }

  console.log(`\nTarget: ${SUPABASE_URL}`);
  console.log(`Backup: ${BACKUP_PATH}`);
  console.log(`Map ID: ${MAP_ID}`);
  console.log(`Topics to restore: ${TOPIC_IDS_TO_RESTORE.length}`);

  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Step 1: Check if map exists in target database
  console.log('\n[Step 1] Checking if map exists in target database...');
  const { data: existingMap, error: mapError } = await supabase
    .from('topical_maps')
    .select('id, name')
    .eq('id', MAP_ID)
    .single();

  if (mapError || !existingMap) {
    console.error(`ERROR: Map ${MAP_ID} does not exist in target database.`);
    console.error('The map must exist before topics can be restored.');
    console.error('Error:', mapError?.message);
    process.exit(1);
  }

  console.log(`Found map: "${existingMap.name}" (${existingMap.id})`);

  // Step 2: Check which topics already exist
  console.log('\n[Step 2] Checking which topics already exist...');
  const { data: existingTopics, error: existingError } = await supabase
    .from('topics')
    .select('id, title')
    .in('id', TOPIC_IDS_TO_RESTORE);

  if (existingError) {
    console.error('ERROR checking existing topics:', existingError.message);
    process.exit(1);
  }

  const existingTopicIds = new Set(existingTopics?.map(t => t.id) || []);
  console.log(`Found ${existingTopicIds.size} topics already in database:`);
  existingTopics?.forEach(t => console.log(`  - ${t.title} (${t.id})`));

  const topicsToInsert = TOPIC_IDS_TO_RESTORE.filter(id => !existingTopicIds.has(id));
  console.log(`\nTopics to restore: ${topicsToInsert.length}`);

  if (topicsToInsert.length === 0) {
    console.log('\nAll topics already exist. Nothing to restore.');
    return;
  }

  // Step 3: Read backup file
  console.log('\n[Step 3] Reading backup file...');
  if (!fs.existsSync(BACKUP_PATH)) {
    console.error(`ERROR: Backup file not found: ${BACKUP_PATH}`);
    process.exit(1);
  }

  const backupContent = fs.readFileSync(BACKUP_PATH, 'utf-8');
  const allBackupTopics = JSON.parse(backupContent);
  console.log(`Loaded ${allBackupTopics.length} topics from backup`);

  // Step 4: Filter topics to restore
  console.log('\n[Step 4] Filtering topics to restore...');
  const topicsFromBackup = allBackupTopics.filter((topic: any) =>
    topicsToInsert.includes(topic.id)
  );

  console.log(`Found ${topicsFromBackup.length} topics in backup:`);
  topicsFromBackup.forEach((t: any) => console.log(`  - ${t.title} (${t.type})`));

  if (topicsFromBackup.length === 0) {
    console.error('ERROR: No topics found in backup file with the specified IDs.');
    process.exit(1);
  }

  // Step 5: Insert topics (core first, then outer)
  console.log('\n[Step 5] Inserting topics...');

  // Sort to insert core topics first (they have no parent)
  const sortedTopics = topicsFromBackup.sort((a: any, b: any) => {
    if (a.type === 'core' && b.type !== 'core') return -1;
    if (a.type !== 'core' && b.type === 'core') return 1;
    return 0;
  });

  for (const topic of sortedTopics) {
    console.log(`\n  Inserting: "${topic.title}" (${topic.type})...`);

    // Remove any fields that might cause issues
    const topicToInsert = {
      id: topic.id,
      map_id: topic.map_id,
      parent_topic_id: topic.parent_topic_id,
      title: topic.title,
      description: topic.description,
      slug: topic.slug,
      type: topic.type,
      freshness: topic.freshness,
      created_at: topic.created_at,
      updated_at: new Date().toISOString(),
      user_id: topic.user_id,
      metadata: topic.metadata
    };

    const { data, error } = await supabase
      .from('topics')
      .insert(topicToInsert)
      .select();

    if (error) {
      console.error(`  ERROR inserting "${topic.title}":`, error.message);

      // Try upsert as fallback
      console.log(`  Trying upsert...`);
      const { data: upsertData, error: upsertError } = await supabase
        .from('topics')
        .upsert(topicToInsert, { onConflict: 'id' })
        .select();

      if (upsertError) {
        console.error(`  UPSERT ERROR:`, upsertError.message);
      } else {
        console.log(`  SUCCESS (upsert): "${topic.title}"`);
      }
    } else {
      console.log(`  SUCCESS: "${topic.title}"`);
    }
  }

  // Step 6: Verify restoration
  console.log('\n[Step 6] Verifying restoration...');
  const { data: restoredTopics, error: verifyError } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('map_id', MAP_ID)
    .in('id', TOPIC_IDS_TO_RESTORE);

  if (verifyError) {
    console.error('ERROR verifying restoration:', verifyError.message);
  } else {
    console.log(`\nVerified ${restoredTopics?.length || 0} topics in database:`);
    restoredTopics?.forEach(t => {
      const parentInfo = t.parent_topic_id ? `parent: ${t.parent_topic_id.slice(0, 8)}...` : 'no parent';
      console.log(`  - ${t.title} (${t.type}, ${parentInfo})`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESTORATION COMPLETE');
  console.log('='.repeat(60));
  console.log('\nPlease reload the application to see the restored topics.');
}

main().catch(console.error);
