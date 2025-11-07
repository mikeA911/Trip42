import { useState, useEffect } from 'react';
import { getOrCreateSettings } from '../utils/settings';
import { logEvent } from '../services/loggingService';

export const useAuth = () => {
  const [aiTheme, setAiTheme] = useState('h2g2');
  const [purchasedThemes, setPurchasedThemes] = useState<string[]>(['h2g2', 'QT-GR', 'TP']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const settings = await getOrCreateSettings();
        console.log('🔍 Loaded settings on startup:', JSON.stringify(settings, null, 2));
        if (settings && settings.aiTheme) {
          setAiTheme(settings.aiTheme);
          await logEvent({ event_type: 'load_theme_on_start', details: { theme: settings.aiTheme } });
        }
      } catch (error) {
        console.error('Failed to load theme settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { aiTheme, setAiTheme, purchasedThemes, loading };
};