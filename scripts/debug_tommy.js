const { createClient } = require('@supabase/supabase-js');

const url = 'https://xyesprnlsgaflqfnxdhy.supabase.co';
// Using the key from .env
const key = 'sb_publishable_PZjwjdBwg6nCS2wHPghUSw_XP3x47b-';

const supabase = createClient(url, key);

async function run() {
  console.log('Fetching profiles matching Tommy...');
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .or('first_name.ilike.%Tommy%,last_name.ilike.%Tommy%,email.ilike.%Tommy%');

  if (pError) {
    console.error('Profile Error:', pError);
    return;
  }
  
  console.log('Found profiles:', profiles);

  if (profiles && profiles.length > 0) {
    for (const p of profiles) {
      console.log(`Checking docs for ${p.first_name} ${p.last_name} (${p.id})`);
      const { data: docs, error: dError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', p.id);
        
      if (dError) console.error('Docs Error:', dError);
      else console.log('Docs:', docs);
    }
  }
}

run();
