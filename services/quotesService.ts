import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

export interface Quote {
  id: number;
  Source: string;
  character: string;
  quote: string;
  created_at: string;
  theme: string;
}

const CACHE_KEY_PREFIX = 'quotes_cache_';
const CACHE_EXPIRY_HOURS = 24; // Cache for 24 hours

interface CachedQuotes {
  quotes: Quote[];
  timestamp: number;
  theme: string;
}

const getCacheKey = (theme: string): string => `${CACHE_KEY_PREFIX}${theme}`;

const isCacheValid = (timestamp: number): boolean => {
  const now = Date.now();
  const cacheAge = now - timestamp;
  const expiryTime = CACHE_EXPIRY_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds
  return cacheAge < expiryTime;
};

const getCachedQuotes = async (theme: string): Promise<Quote[] | null> => {
  try {
    const cacheKey = getCacheKey(theme);
    const cachedData = await AsyncStorage.getItem(cacheKey);

    if (cachedData) {
      const parsed: CachedQuotes = JSON.parse(cachedData);
      if (parsed.theme === theme && isCacheValid(parsed.timestamp)) {
        return parsed.quotes;
      } else {
        // Cache is stale or for different theme, remove it
        await AsyncStorage.removeItem(cacheKey);
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading quotes cache:', error);
    return null;
  }
};

const setCachedQuotes = async (theme: string, quotes: Quote[]): Promise<void> => {
  try {
    const cacheKey = getCacheKey(theme);
    const cacheData: CachedQuotes = {
      quotes,
      timestamp: Date.now(),
      theme
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error writing quotes cache:', error);
  }
};

export const fetchQuotesByTheme = async (theme: string): Promise<Quote[]> => {
  try {
    // First try to get from cache
    const cachedQuotes = await getCachedQuotes(theme);
    if (cachedQuotes) {
      console.log(`Using cached quotes for theme: ${theme}`);
      return cachedQuotes;
    }

    // Cache miss or expired, fetch from Supabase
    if (!supabase) {
      console.error('Supabase client not available');
      return [];
    }

    console.log(`Fetching quotes from Supabase for theme: ${theme}`);
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('theme', theme);

    if (error) {
      console.error('Error fetching quotes:', error);
      return [];
    }

    const quotes = data || [];

    // Cache the fetched quotes
    if (quotes.length > 0) {
      await setCachedQuotes(theme, quotes);
    }

    return quotes;
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }
};

export const fetchRandomQuote = async (theme: string): Promise<Quote | null> => {
  try {
    const quotes = await fetchQuotesByTheme(theme);
    if (quotes.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
  } catch (error) {
    console.error('Error fetching random quote:', error);
    return null;
  }
};

// Function to clear cache when credits are added (voucher redemption)
export const clearQuotesCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));

    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`Cleared ${cacheKeys.length} cached quote sets`);
    }
  } catch (error) {
    console.error('Error clearing quotes cache:', error);
  }
};