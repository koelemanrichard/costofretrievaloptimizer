/**
 * forceReuploadScreenshots.ts
 *
 * Deletes old screenshots from Supabase Storage and re-uploads the new ones.
 * This ensures cache is busted and new images are served.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://blucvnmncvwzlwxoyoum.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'help-screenshots');

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Files to upload with their storage paths
const UPLOADS = [
  {
    localPath: 'project-management/dashboard-overview.png',
    storagePath: 'project-management/managing-projects/dashboard-overview.png'
  },
  {
    localPath: 'getting-started/new-project-modal.png',
    storagePath: 'getting-started/creating-first-project/new-project-modal.png'
  },
  {
    localPath: 'settings/settings-modal.png',
    storagePath: 'settings/api-keys/settings-modal.png'
  }
];

async function main() {
  console.log('🔄 Force re-uploading screenshots to Supabase Storage\n');

  for (const upload of UPLOADS) {
    const localFile = path.join(SCREENSHOT_DIR, upload.localPath);

    if (!fs.existsSync(localFile)) {
      console.log(`⚠️ Local file not found: ${localFile}`);
      continue;
    }

    console.log(`Processing: ${upload.storagePath}`);

    // Delete existing file first
    const { error: deleteError } = await supabase.storage
      .from('help-screenshots')
      .remove([upload.storagePath]);

    if (deleteError) {
      console.log(`  Delete: ${deleteError.message}`);
    } else {
      console.log(`  Deleted old file`);
    }

    // Read and upload new file
    const buffer = fs.readFileSync(localFile);

    const { error: uploadError } = await supabase.storage
      .from('help-screenshots')
      .upload(upload.storagePath, buffer, {
        contentType: 'image/png',
        cacheControl: '0', // No cache
        upsert: true
      });

    if (uploadError) {
      console.log(`  ❌ Upload failed: ${uploadError.message}`);
    } else {
      console.log(`  ✅ Uploaded successfully`);

      // Get public URL
      const { data } = supabase.storage
        .from('help-screenshots')
        .getPublicUrl(upload.storagePath);

      console.log(`  URL: ${data.publicUrl}`);
    }

    console.log('');
  }

  console.log('Done! Please hard refresh the help page (Ctrl+Shift+R)');
}

main().catch(console.error);
