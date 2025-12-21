/**
 * setupHelpScreenshotsBucket.ts
 *
 * Creates the Supabase Storage bucket for help screenshots.
 * Run with: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/setupHelpScreenshotsBucket.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://shtqshmmsrmtquuhyupl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('Setting up help-screenshots bucket...\n');

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('Failed to list buckets:', listError.message);
    process.exit(1);
  }

  const bucketExists = buckets.some(b => b.name === 'help-screenshots');

  if (bucketExists) {
    console.log('✅ Bucket "help-screenshots" already exists');
  } else {
    // Create bucket
    const { error: createError } = await supabase.storage.createBucket('help-screenshots', {
      public: true, // Public bucket so screenshots can be viewed without auth
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    });

    if (createError) {
      console.error('Failed to create bucket:', createError.message);
      process.exit(1);
    }

    console.log('✅ Created bucket "help-screenshots"');
  }

  console.log('\n✅ Setup complete!');
}

main().catch(console.error);
