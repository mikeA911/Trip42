import Constants from 'expo-constants';

export const GEMINI_API: string = Constants.expoConfig?.extra?.GEMINI_API || '';
export const GOOGLE_MAPS_API: string = Constants.expoConfig?.extra?.GOOGLE_MAPS_API || '';
export const SUPABASE_URL: string = Constants.expoConfig?.extra?.SUPABASE_URL || '';
export const SUPABASE_ANON_KEY: string = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || '';