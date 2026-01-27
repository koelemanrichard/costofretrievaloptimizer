/**
 * Check if design tables exist in the database
 * Run with: npx tsx tmp/check_tables.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log('='.repeat(70));
  console.log('CHECKING DATABASE TABLES');
  console.log('='.repeat(70));
  console.log('\nSupabase URL:', supabaseUrl);

  const tables = [
    'brand_design_dna',
    'brand_design_systems',
    'design_profiles',
    'project_design_defaults',
    'topical_map_design_rules',
    'design_preferences'
  ];

  for (const table of tables) {
    try {
      const { data, error, status } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (error) {
        if (status === 406 || error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log(`  [X] ${table}: TABLE DOES NOT EXIST (${status})`);
        } else if (error.code === 'PGRST116') {
          // No rows found - table exists
          console.log(`  [OK] ${table}: exists (empty)`);
        } else {
          console.log(`  [?] ${table}: ${error.message} (${status})`);
        }
      } else {
        console.log(`  [OK] ${table}: exists (has data)`);
      }
    } catch (e) {
      console.log(`  [X] ${table}: ERROR - ${e}`);
    }
  }

  console.log('\n' + '='.repeat(70));
}

checkTables().catch(console.error);
