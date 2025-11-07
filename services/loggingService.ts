import { supabase } from '../supabase';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

type EventType = 'interact' | 'navigate' | 'error' | 'performance' | 'app_start' | 'voucher_redemption' | 'load_theme_on_start' | 'default_theme_on_start';

interface LogData {
  event_type: EventType;
  [key: string]: any;
}

export const logEvent = async (data: LogData) => {
  if (!supabase) {
    console.error('Supabase client is not initialized. Cannot log event.');
    return;
  }

  try {
    const deviceId = await getDeviceId();
    const appVersion = Constants.expoConfig?.version;
    const creditBalance = await getCreditBalance();
    const theme = await getTheme();

    const { details, ...restData } = data;
    const logPayload = {
      ...restData,
      device_id: deviceId,
      app_version: appVersion,
      os_name: Device.osName,
      os_version: Device.osVersion,
      credit_balance: creditBalance,
      theme: theme,
    };

    const { error } = await supabase.from('mobile_app_logs').insert([logPayload]);

    if (error) {
      console.error('Error logging event to Supabase:', error);
    }
  } catch (error) {
    console.error('Failed to prepare or send log event:', error);
  }
};

const getDeviceId = async () => {
  try {
    // A more robust unique ID would be better, but this is a simple approach
    let id = await AsyncStorage.getItem('deviceId');
    if (!id) {
      const newId = Constants.installationId || `fallback-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      await AsyncStorage.setItem('deviceId', newId);
      id = newId;
    }
    return id;
  } catch (e) {
    return 'unknown';
  }
};

const getCreditBalance = async (): Promise<number | null> => {
  try {
    const creditsData = await AsyncStorage.getItem('userCredits');
    if (creditsData) {
      const parsed = JSON.parse(creditsData);
      return parsed.balance || 0;
    }
    return null;
  } catch (e) {
    return null;
  }
};

const getTheme = async (): Promise<string | null> => {
  try {
    const settings = await AsyncStorage.getItem('hitchtrip_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.aiTheme || 'h2g2';
    }
    return 'h2g2'; // Default theme
  } catch (e) {
    return null;
  }
};