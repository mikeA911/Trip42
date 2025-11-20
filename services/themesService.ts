import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

export interface Theme {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

const CACHE_KEY = 'themes_cache';
const CACHE_EXPIRY_HOURS = 24; // Cache for 24 hours

interface CachedThemes {
  themes: Theme[];
  timestamp: number;
}

const isCacheValid = (timestamp: number): boolean => {
  const now = Date.now();
  const cacheAge = now - timestamp;
  const expiryTime = CACHE_EXPIRY_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds
  return cacheAge < expiryTime;
};

const getCachedThemes = async (): Promise<Theme[] | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);

    if (cachedData) {
      const parsed: CachedThemes = JSON.parse(cachedData);
      if (isCacheValid(parsed.timestamp)) {
        return parsed.themes;
      } else {
        // Cache is stale, remove it
        await AsyncStorage.removeItem(CACHE_KEY);
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading themes cache:', error);
    return null;
  }
};

const setCachedThemes = async (themes: Theme[]): Promise<void> => {
  try {
    const cacheData: CachedThemes = {
      themes,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error writing themes cache:', error);
  }
};

export const fetchThemes = async (): Promise<Theme[]> => {
  try {
    // First try to get from cache
    const cachedThemes = await getCachedThemes();
    if (cachedThemes) {
      console.log('Using cached themes');
      return cachedThemes;
    }

    // Cache miss or expired, fetch from Supabase
    if (!supabase) {
      console.error('Supabase client not available');
      return [];
    }

    console.log('Fetching themes from Supabase');
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching themes:', error);
      return [];
    }

    const themes = data || [];

    // Cache the fetched themes
    if (themes.length > 0) {
      await setCachedThemes(themes);
    }

    return themes;
  } catch (error) {
    console.error('Error fetching themes:', error);
    return [];
  }
};

// Function to clear themes cache (useful for development/testing)
export const clearThemesCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    console.log('Themes cache cleared');
  } catch (error) {
    console.error('Error clearing themes cache:', error);
  }
};