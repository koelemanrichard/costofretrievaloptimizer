/**
 * Check Map Ownership - Verifies the topical map owner matches expected user
 *
 * Run: npx tsx scripts/migration/checkMapOwnership.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.migration') });

const SUPABASE_URL = process.env.TARGET_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

const MAP_ID = '2ea28b9d-77bb-458c-9aca-7e79722fcda4';

async function main() {
  console.log('='.repeat(60));
  console.log('CHECK MAP OWNERSHIP');
  console.log('='.repeat(60));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Get map info
  console.log('\n[1] Map Info:');
  const { data: map, error: mapError } = await supabase
    .from('topical_maps')
    .select('id, name, user_id, created_at')
    .eq('id', MAP_ID)
    .single();

  if (mapError) {
    console.log('Error:', mapError.message);
    return;
  }

  console.log(`  Name: ${map.name}`);
  console.log(`  ID: ${map.id}`);
  console.log(`  User ID: ${map.user_id}`);
  console.log(`  Created: ${map.created_at}`);

  // Get user info
  console.log('\n[2] User Info (map owner):');
  const { data: users } = await supabase.auth.admin.listUsers();
  const owner = users?.users?.find(u => u.id === map.user_id);

  if (owner) {
    console.log(`  Email: ${owner.email}`);
    console.log(`  ID: ${owner.id}`);
    console.log(`  Last sign-in: ${owner.last_sign_in_at}`);
  } else {
    console.log('  Owner not found in auth.users!');
  }

  // Check a few topics
  console.log('\n[3] Topic ownership check (sample):');
  const { data: topics } = await supabase
    .from('topics')
    .select('id, title, user_id')
    .eq('map_id', MAP_ID)
    .limit(5);

  topics?.forEach(t => {
    const match = t.user_id === map.user_id ? '✅' : '❌';
    console.log(`  ${match} ${t.title}`);
    console.log(`     Topic user_id: ${t.user_id}`);
    console.log(`     Map user_id:   ${map.user_id}`);
  });

  // Check RLS would work for this user
  console.log('\n[4] RLS Check Simulation:');
  console.log(`  For updates to work via RLS, auth.uid() must equal: ${map.user_id}`);
  console.log('  The frontend user must be logged in with this account.');
}

main().catch(console.error);
