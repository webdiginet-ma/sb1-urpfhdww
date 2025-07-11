import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 [Supabase] Configuration check:');
console.log('- URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('- Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

let supabase;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ [Supabase] Missing environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl || 'MISSING');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'MISSING');
  
  // Create a dummy client to prevent crashes
  supabase = createClient('https://dummy.supabase.co', 'dummy-key');
} else {
  console.log('✅ [Supabase] Creating client with valid configuration');
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-web'
      }
    }
  });
}

export { supabase };