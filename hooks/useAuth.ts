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
        const themeToUse = settings?.aiTheme || 'h2g2';
        setAiTheme(themeToUse);

        if (settings?.aiTheme && settings.aiTheme !== 'h2g2') {
          // Custom theme loaded
          await logEvent({ event_type: 'load_theme_on_start', details: { theme: settings.aiTheme } });
        } else {
          // Default theme used
          await logEvent({ event_type: 'default_theme_on_start', details: { theme: 'h2g2' } });
        }
      } catch (error) {
        console.error('Failed to load theme settings:', error);
        // Fallback to default theme and log it
        setAiTheme('h2g2');
        await logEvent({ event_type: 'default_theme_on_start', details: { theme: 'h2g2', error: error instanceof Error ? error.message : String(error) } });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { aiTheme, setAiTheme, purchasedThemes, loading };
};