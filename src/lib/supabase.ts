import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Function to kill all sessions
export const killAllSessions = async () => {
  try {
    // Sign out from current session
    await supabase.auth.signOut({ scope: 'global' });
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Wait a bit to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    console.error('Error killing sessions:', error);
    throw error;
  }
};