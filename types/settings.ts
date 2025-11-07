export interface UserSettings {
  uiLanguage: string;
  userCurrency: string;
  customTags: string[];
  locationPermission: 'always' | 'prompt' | 'never';
  enabledTags: string[];
  enabledLanguages: string[];
  aiTheme: string;
}