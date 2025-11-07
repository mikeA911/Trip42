import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSettings } from '../types/settings';

const SETTINGS_KEY = 'hitchtrip_settings';

export const defaultSettings: UserSettings = {
  uiLanguage: 'en',
  userCurrency: 'USD',
  customTags: [],
  locationPermission: 'prompt',
  enabledTags: ['activities', 'events', 'habits', 'medicine', 'vitals'],
  enabledLanguages: ['en', 'lo', 'km', 'th', 'vi', 'zh', 'ja', 'ko', 'uk', 'fil'],
  aiTheme: 'h2g2',
};

export const getOrCreateSettings = async (): Promise<UserSettings> => {
  try {
    const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      // Ensure all keys are present, supplement with default if not
      return { ...defaultSettings, ...settings };
    } else {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
      return defaultSettings;
    }
  } catch (error) {
    console.error('Failed to get or create settings, returning default:', error);
    return defaultSettings;
  }
};

export const saveSettings = async (settings: UserSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};