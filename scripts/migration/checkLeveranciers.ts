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
  // Check Leveranciersportaal topic
  const { data } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .ilike('title', '%Leveranciersportaal%');

  console.log('Found Leveranciersportaal topics:');
  console.log(JSON.stringify(data, null, 2));

  // Check if the parent exists
  if (data && data.length > 0) {
    for (const topic of data) {
      if (topic.parent_topic_id) {
        const { data: parent } = await supabase
          .from('topics')
          .select('id, title, type')
          .eq('id', topic.parent_topic_id)
          .single();
        console.log(`\nParent of ${topic.title}:`, parent);
      } else {
        console.log(`\n${topic.title} has no parent!`);
      }
    }
  }
}

main().catch(console.error);
