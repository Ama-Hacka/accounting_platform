const { createClient } = require('@supabase/supabase-js');

const url = 'https://xyesprnlsgaflqfnxdhy.supabase.co';
const key = 'sb_publishable_PZjwjdBwg6nCS2wHPghUSw_XP3x47b-';
const supabase = createClient(url, key);

async function run() {
  const userId = '482acaf2-0128-442f-88a2-5b919ac9b30d';
  console.log('Checking docs for user:', userId);
  const { data: docs, error } = await supabase
    .from('user_documents')
    .select('*')
    .eq('user_id', userId);
    
  if (error) console.error('Error:', error);
  else console.log('Docs:', docs);
}

run();
