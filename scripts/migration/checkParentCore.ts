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
  // Check the parent core topic "vastgoed management software"
  const { data: parent } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('id', '0c34bc53-7469-4c87-97a8-11c9c75c912d')
    .single();

  console.log('Parent topic (should be core):');
  console.log(JSON.stringify(parent, null, 2));

  // Check Technisch Beheer
  const { data: child } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('id', '686694f6-c71f-4e24-9af7-a7452c3028a0')
    .single();

  console.log('\nTechnisch Beheer (should be outer with parent above):');
  console.log(JSON.stringify(child, null, 2));

  // Count by type in this map
  const mapId = '2ea28b9d-77bb-458c-9aca-7e79722fcda4';

  const { count: coreCount } = await supabase
    .from('topics')
    .select('*', { count: 'exact', head: true })
    .eq('map_id', mapId)
    .eq('type', 'core');

  const { count: outerCount } = await supabase
    .from('topics')
    .select('*', { count: 'exact', head: true })
    .eq('map_id', mapId)
    .eq('type', 'outer');

  const { count: childCount } = await supabase
    .from('topics')
    .select('*', { count: 'exact', head: true })
    .eq('map_id', mapId)
    .eq('type', 'child');

  console.log('\nTopic counts in map:');
  console.log(`  Core: ${coreCount}`);
  console.log(`  Outer: ${outerCount}`);
  console.log(`  Child: ${childCount}`);
}

main().catch(console.error);
