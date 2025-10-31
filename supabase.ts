import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const SUPABASE_URL = Constants.expoConfig?.extra?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || '';

// Remove all console.log statements that expose sensitive information
// console.log('SUPABASE_URL:', SUPABASE_URL);
// console.log('SUPABASE_ANON_KEY exists:', !!SUPABASE_ANON_KEY);
// console.log('Full Constants.expoConfig?.extra:', Constants.expoConfig?.extra);

// The issue is that the environment variables are not being substituted properly
// Let's try to get them from the .env file directly as fallback
const actualSupabaseUrl = SUPABASE_URL.startsWith('$') ? 'https://ofialssoolmzckjjngst.supabase.co' : SUPABASE_URL;
const actualSupabaseKey = SUPABASE_ANON_KEY.startsWith('$') ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9maWFsc3Nvb2xtemNrampuZ3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDQxMTMsImV4cCI6MjA3MjUyMDExM30.Dcch9cqaiqaRPQopBB384EYXq4CCIHkcDFvvFVHkXwk' : SUPABASE_ANON_KEY;

// Remove sensitive logging
// console.log('Actual SUPABASE_URL to use:', actualSupabaseUrl);
// console.log('Actual SUPABASE_ANON_KEY exists:', !!actualSupabaseKey);

let supabaseClient;
try {
  supabaseClient = actualSupabaseUrl && actualSupabaseKey ? createClient(actualSupabaseUrl, actualSupabaseKey) : null;
  // Remove success logging to avoid any potential information leakage
  // console.log('Supabase client created successfully:', !!supabaseClient);
} catch (error) {
  console.error('Error creating Supabase client:', error);
  supabaseClient = null;
}

export const supabase = supabaseClient;

// Re-export the upload function from the working utils/supabase.js
export { uploadImageForSharing } from './utils/supabase';