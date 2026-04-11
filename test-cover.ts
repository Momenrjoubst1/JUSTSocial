import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('users').select('cover_url').limit(1);
  if (error) {
    console.error('Error fetching cover_url:', error.message);
  } else {
    console.log('Success, cover_url exists or can be queried.');
  }
}

check();
