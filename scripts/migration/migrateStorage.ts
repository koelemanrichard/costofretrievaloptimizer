/**
 * Direct Storage Migration Script
 *
 * Copies files directly from source to target Supabase storage bucket.
 *
 * Usage: npx tsx scripts/migration/migrateStorage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.migration' });

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL!;
const SOURCE_SERVICE_KEY = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY!;
const TARGET_URL = process.env.TARGET_SUPABASE_URL!;
const TARGET_SERVICE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

async function migrateStorage() {
  console.log('📦 Direct Storage Migration\n');
  console.log(`📍 Source: ${SOURCE_URL}`);
  console.log(`📍 Target: ${TARGET_URL}\n`);

  const sourceClient = createClient(SOURCE_URL, SOURCE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const targetClient = createClient(TARGET_URL, TARGET_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // List all buckets from source
  const { data: buckets, error: bucketsError } = await sourceClient.storage.listBuckets();

  if (bucketsError) {
    console.error(`❌ Error listing buckets: ${bucketsError.message}`);
    return;
  }

  console.log(`Found ${buckets?.length || 0} buckets\n`);

  for (const bucket of buckets || []) {
    console.log(`📁 Migrating bucket: ${bucket.name}`);

    // Create bucket in target if doesn't exist
    const { error: createError } = await targetClient.storage.createBucket(bucket.name, {
      public: bucket.public
    });

    if (createError && !createError.message.includes('already exists')) {
      console.error(`  ⚠️ Could not create bucket: ${createError.message}`);
    }

    let migrated = 0;
    let errors = 0;

    // Recursive function to process folders
    async function processFolder(prefix: string) {
      const { data: items, error: listError } = await sourceClient.storage
        .from(bucket.name)
        .list(prefix, { limit: 1000 });

      if (listError) {
        console.error(`  ❌ Error listing ${prefix || 'root'}: ${listError.message}`);
        return;
      }

      for (const item of items || []) {
        if (!item.name) continue;

        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

        // Check if it's a folder (id is null for folders)
        if (item.id === null) {
          console.log(`  📂 Processing folder: ${fullPath}`);
          await processFolder(fullPath);
        } else {
          // It's a file - download and upload
          try {
            const { data: fileData, error: downloadError } = await sourceClient.storage
              .from(bucket.name)
              .download(fullPath);

            if (downloadError) {
              console.error(`    ⚠️ Could not download ${fullPath}: ${downloadError.message}`);
              errors++;
              continue;
            }

            const arrayBuffer = await fileData.arrayBuffer();
            const { error: uploadError } = await targetClient.storage
              .from(bucket.name)
              .upload(fullPath, arrayBuffer, {
                upsert: true,
                contentType: fileData.type
              });

            if (uploadError) {
              console.error(`    ⚠️ Could not upload ${fullPath}: ${uploadError.message}`);
              errors++;
            } else {
              migrated++;
              console.log(`    ✅ ${fullPath}`);
            }
          } catch (err) {
            console.error(`    ❌ Error with ${fullPath}`);
            errors++;
          }
        }
      }
    }

    await processFolder('');

    console.log(`  📊 Migrated ${migrated} files (${errors} errors)\n`);
  }

  console.log('✅ Storage migration complete!');
}

migrateStorage().catch(console.error);
