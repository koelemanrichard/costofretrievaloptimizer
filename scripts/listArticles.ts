import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://blucvnmncvwzlwxoyoum.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('help_articles')
    .select(`
      id,
      slug,
      title,
      help_categories (
        slug
      )
    `)
    .order('slug');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nArticles in database:\n');
  data?.forEach((article: any) => {
    console.log(`  ${article.help_categories?.slug}/${article.slug}`);
  });
  console.log(`\nTotal: ${data?.length} articles`);
}

main();
