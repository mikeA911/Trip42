import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sharedStyles } from '../styles';
import { useToast } from '../contexts/ToastContext';

interface SettingsPageProps {
  onBack: () => void;
}

interface UserSettings {
  uiLanguage: string;
  userCurrency: string;
  customTags: string[];
  locationPermission: 'always' | 'prompt' | 'never';
  enabledTags: string[];
  enabledLanguages: string[];
  aiTheme: string;
}

// Permanent tags with icons and descriptions - sorted alphabetically
const PERMANENT_TAGS = [
  { name: 'activities', icon: '🏃', description: 'Physical activities, exercise, sports' },
  { name: 'Creativity', icon: '🎨', description: 'Creative activities and inspiration' },
  { name: 'Energy', icon: '⚡', description: 'Energy levels throughout the day' },
  { name: 'events', icon: '📅', description: 'Appointments, meetings, important dates' },
  { name: 'Fitness', icon: '💪', description: 'Physical fitness and exercise' },
  { name: 'Focus', icon: '🎯', description: 'Concentration and attention span' },
  { name: 'habits', icon: '🎯', description: 'Habits to track or avoid' },
  { name: 'Health', icon: '🏥', description: 'General health tracking and wellness' },
  { name: 'Ideas', icon: '💡', description: 'Creative ideas and inspiration' },
  { name: 'medicine', icon: '💊', description: 'Medicine intake, prescriptions, dosages' },
  { name: 'Mood', icon: '😊', description: 'Emotional state and mood tracking' },
  { name: 'Nutrition', icon: '🥗', description: 'Diet and nutritional intake' },
  { name: 'Personal', icon: '🏠', description: 'Personal thoughts and reflections' },
  { name: 'Sleep', icon: '😴', description: 'Sleep patterns and quality' },
  { name: 'vitals', icon: '❤️', description: 'Health measurements like blood pressure, heart rate' },
  { name: 'Work', icon: '💼', description: 'Work-related notes and tasks' }
];

// Suggested tags for quick selection - now empty since we combined them
const SUGGESTED_TAGS = [];

// Languages sorted alphabetically by name with flag emojis
export const LANGUAGES = [
   { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
   { code: 'sq', name: 'Albanian', flag: '🇦🇱' },
   { code: 'am', name: 'Amharic', flag: '🇪🇹' },
   { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
   { code: 'hy', name: 'Armenian', flag: '🇦🇲' },
   { code: 'az', name: 'Azerbaijani', flag: '🇦🇿' },
   { code: 'eu', name: 'Basque', flag: '🇪🇸' },
   { code: 'be', name: 'Belarusian', flag: '🇧🇾' },
   { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
   { code: 'bs', name: 'Bosnian', flag: '🇧🇦' },
   { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
   { code: 'my', name: 'Burmese', flag: '🇲🇲' },
   { code: 'ca', name: 'Catalan', flag: '🇪🇸' },
   { code: 'ny', name: 'Chichewa', flag: '🇲🇼' },
   { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
   { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
   { code: 'cs', name: 'Czech', flag: '🇨🇿' },
   { code: 'da', name: 'Danish', flag: '🇩🇰' },
   { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
   { code: 'en', name: 'English', flag: '🇺🇸' },
   { code: 'et', name: 'Estonian', flag: '🇪🇪' },
   { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
   { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
   { code: 'fr', name: 'French', flag: '🇫🇷' },
   { code: 'gl', name: 'Galician', flag: '🇪🇸' },
   { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
   { code: 'de', name: 'German', flag: '🇩🇪' },
   { code: 'el', name: 'Greek', flag: '🇬🇷' },
   { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
   { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
   { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
   { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
   { code: 'is', name: 'Icelandic', flag: '🇮🇸' },
   { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
   { code: 'ga', name: 'Irish', flag: '🇮🇪' },
   { code: 'it', name: 'Italian', flag: '🇮🇹' },
   { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
   { code: 'jv', name: 'Javanese', flag: '🇮🇩' },
   { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
   { code: 'kk', name: 'Kazakh', flag: '🇰🇿' },
   { code: 'kh', name: 'Khmer', flag: '🇰🇭' },
   { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' },
   { code: 'ko', name: 'Korean', flag: '🇰🇷' },
   { code: 'lo', name: 'Lao', flag: '🇱🇦' },
   { code: 'lv', name: 'Latvian', flag: '🇱🇻' },
   { code: 'lt', name: 'Lithuanian', flag: '🇱🇹' },
   { code: 'mk', name: 'Macedonian', flag: '🇲🇰' },
   { code: 'mg', name: 'Malagasy', flag: '🇲🇬' },
   { code: 'ms', name: 'Malay', flag: '🇲🇾' },
   { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
   { code: 'mt', name: 'Maltese', flag: '🇲🇹' },
   { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
   { code: 'mn', name: 'Mongolian', flag: '🇲🇳' },
   { code: 'ne', name: 'Nepali', flag: '🇳🇵' },
   { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
   { code: 'or', name: 'Oriya', flag: '🇮🇳' },
   { code: 'om', name: 'Oromo', flag: '🇪🇹' },
   { code: 'fa', name: 'Persian', flag: '🇮🇷' },
   { code: 'pl', name: 'Polish', flag: '🇵🇱' },
   { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
   { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
   { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
   { code: 'ru', name: 'Russian', flag: '🇷🇺' },
   { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
   { code: 'sd', name: 'Sindhi', flag: '🇵🇰' },
   { code: 'si', name: 'Sinhala', flag: '🇱🇰' },
   { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
   { code: 'sl', name: 'Slovenian', flag: '🇸🇮' },
   { code: 'so', name: 'Somali', flag: '🇸🇴' },
   { code: 'es', name: 'Spanish', flag: '🇪🇸' },
   { code: 'ss', name: 'Swati', flag: '🇸🇿' },
   { code: 'st', name: 'Sesotho', flag: '🇱🇸' },
   { code: 'sn', name: 'Shona', flag: '🇿🇼' },
   { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
   { code: 'sw', name: 'Swahili', flag: '🇹🇿' },
   { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
   { code: 'te', name: 'Telugu', flag: '🇮🇳' },
   { code: 'tg', name: 'Tajik', flag: '🇹🇯' },
   { code: 'th', name: 'Thai', flag: '🇹🇭' },
   { code: 'ti', name: 'Tigrinya', flag: '🇪🇷' },
   { code: 'tk', name: 'Turkmen', flag: '🇹🇲' },
   { code: 'tn', name: 'Tswana', flag: '🇧🇼' },
   { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
   { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
   { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
   { code: 'uz', name: 'Uzbek', flag: '🇺🇿' },
   { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
   { code: 'cy', name: 'Welsh', flag: '🇬🇧' },
   { code: 'xh', name: 'Xhosa', flag: '🇿🇦' },
   { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
   { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
 ];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛' },
  { code: 'LAK', name: 'Laotian Kip', symbol: '₭' },
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K' }
];

const AI_THEMES = [
  { code: 'h2g2', name: 'Hitchhiker\'s Guide to the Galaxy', description: 'Marvin the Paranoid Android' },
  { code: 'QT-GR', name: 'Quentin Tarantino/Guy Ritchie Films', description: 'Full functionality coming soon...' },
  { code: 'Epic', name: 'Greek & Norse Mythology', description: 'Full functionality coming soon...' },
  { code: 'ikigai', name: 'Ikigai Philosophy', description: 'Full functionality coming soon...' },
  { code: 'lotr', name: 'Lord of the Rings', description: 'Full functionality coming soon...' },
  { code: 'TP-GG', name: 'Terry Pratchett Guards! Guards!', description: 'Full functionality coming soon...' }
];

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<UserSettings>({
    uiLanguage: 'en',
    userCurrency: 'USD',
    customTags: [],
    locationPermission: 'prompt',
    enabledTags: [],
    enabledLanguages: [],
    aiTheme: 'h2g2'
  });
  const { showSuccess, showError } = useToast();
   const [tempEnabledTags, setTempEnabledTags] = useState<string[]>([]);
   const [tempEnabledLanguages, setTempEnabledLanguages] = useState<string[]>([]);
   const [newTag, setNewTag] = useState('');
   const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
   const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
   const [showLocationDropdown, setShowLocationDropdown] = useState(false);
   const [showTagsSelector, setShowTagsSelector] = useState(false);
   const [showLanguagesSelector, setShowLanguagesSelector] = useState(false);
   const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Initialize temp states when settings are loaded
    setTempEnabledTags(settings.enabledTags);
    setTempEnabledLanguages(settings.enabledLanguages);
  }, [settings.enabledTags, settings.enabledLanguages]);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: UserSettings) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      // Remove the success alert for individual setting changes
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Failed to save settings');
    }
  };

  const updateSetting = (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const addCustomTag = () => {
    const tag = newTag.trim();
    if (tag && !settings.customTags.includes(tag) && !PERMANENT_TAGS.some(pt => pt.name === tag)) {
      const newSettings = {
        ...settings,
        customTags: [...settings.customTags, tag]
      };
      saveSettings(newSettings);
      setNewTag('');
    } else if (tag) {
      showError('Tag already exists or is a permanent tag');
    }
  };

  const removeCustomTag = (tagToRemove: string) => {
    const newSettings = {
      ...settings,
      customTags: settings.customTags.filter(tag => tag !== tagToRemove)
    };
    saveSettings(newSettings);
  };

  const getLanguageName = (code: string) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang ? lang.name : code;
  };

  const getCurrencyName = (code: string) => {
    const currency = CURRENCIES.find(c => c.code === code);
    return currency ? `${currency.symbol} ${currency.name}` : code;
  };

  const getThemeName = (code: string) => {
    const theme = AI_THEMES.find(t => t.code === code);
    return theme ? theme.name : code;
  };

  return (
    <ScrollView style={sharedStyles.tabContent}>
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>⚙️ Settings</Text>

        {/* UI Language */}
        <View style={sharedStyles.settingsSection}>
          <Text style={sharedStyles.settingsLabel}>UI Language</Text>
          <TouchableOpacity
            style={sharedStyles.dropdownButton}
            onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
          >
            <Text style={sharedStyles.dropdownButtonText}>
              {getLanguageName(settings.uiLanguage)}
            </Text>
            <Text style={sharedStyles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          {showLanguageDropdown && (
            <View style={[sharedStyles.tagsSelectorContainer, { maxHeight: 300, borderWidth: 1, borderColor: '#374151' }]}>
              <ScrollView
                style={sharedStyles.tagsSelectorList}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={`lang-${lang.code}`}
                    style={sharedStyles.tagSelectorItem}
                    onPress={() => {
                      updateSetting('uiLanguage', lang.code);
                      setShowLanguageDropdown(false);
                    }}
                  >
                    <Text style={sharedStyles.checkboxText}>
                      {settings.uiLanguage === lang.code ? '☑' : '□'}
                    </Text>
                    <Text style={sharedStyles.tagSelectorText}>{lang.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* User Currency */}
        <View style={sharedStyles.settingsSection}>
          <Text style={sharedStyles.settingsLabel}>Default Currency</Text>
          <TouchableOpacity
            style={sharedStyles.dropdownButton}
            onPress={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
          >
            <Text style={sharedStyles.dropdownButtonText}>
              {getCurrencyName(settings.userCurrency)}
            </Text>
            <Text style={sharedStyles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          {showCurrencyDropdown && (
            <View style={[sharedStyles.tagsSelectorContainer, { maxHeight: 300, borderWidth: 1, borderColor: '#374151' }]}>
              <ScrollView
                style={sharedStyles.tagsSelectorList}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {CURRENCIES.map((currency) => (
                  <TouchableOpacity
                    key={`currency-${currency.code}`}
                    style={sharedStyles.tagSelectorItem}
                    onPress={() => {
                      updateSetting('userCurrency', currency.code);
                      setShowCurrencyDropdown(false);
                    }}
                  >
                    <Text style={sharedStyles.checkboxText}>
                      {settings.userCurrency === currency.code ? '☑' : '□'}
                    </Text>
                    <Text style={sharedStyles.tagSelectorText}>
                      {currency.symbol} {currency.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Location Permission */}
        <View style={sharedStyles.settingsSection}>
          <Text style={sharedStyles.settingsLabel}>Location Permission</Text>
          <TouchableOpacity
            style={sharedStyles.dropdownButton}
            onPress={() => setShowLocationDropdown(!showLocationDropdown)}
          >
            <Text style={sharedStyles.dropdownButtonText}>
              {settings.locationPermission === 'always' ? 'Always attach to notes' :
               settings.locationPermission === 'prompt' ? 'Prompt user for each note' :
               'Never attach to notes'}
            </Text>
            <Text style={sharedStyles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          {showLocationDropdown && (
            <View style={sharedStyles.dropdownList}>
              <TouchableOpacity
                style={sharedStyles.dropdownItem}
                onPress={() => {
                  updateSetting('locationPermission', 'always');
                  setShowLocationDropdown(false);
                }}
              >
                <Text style={sharedStyles.dropdownItemText}>Always attach to notes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={sharedStyles.dropdownItem}
                onPress={() => {
                  updateSetting('locationPermission', 'prompt');
                  setShowLocationDropdown(false);
                }}
              >
                <Text style={sharedStyles.dropdownItemText}>Prompt user for each note</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={sharedStyles.dropdownItem}
                onPress={() => {
                  updateSetting('locationPermission', 'never');
                  setShowLocationDropdown(false);
                }}
              >
                <Text style={sharedStyles.dropdownItemText}>Never attach to notes</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* AI Theme */}
        <View style={sharedStyles.settingsSection}>
          <Text style={sharedStyles.settingsLabel}>AI Personality Theme</Text>
          <TouchableOpacity
            style={sharedStyles.dropdownButton}
            onPress={() => setShowThemeDropdown(!showThemeDropdown)}
          >
            <Text style={sharedStyles.dropdownButtonText}>
              {getThemeName(settings.aiTheme)}
            </Text>
            <Text style={sharedStyles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          {showThemeDropdown && (
            <View style={[sharedStyles.tagsSelectorContainer, { maxHeight: 300, borderWidth: 1, borderColor: '#374151' }]}>
              <ScrollView
                style={sharedStyles.tagsSelectorList}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {AI_THEMES.map((theme) => (
                  <TouchableOpacity
                    key={theme.code}
                    style={sharedStyles.tagSelectorItem}
                    onPress={() => {
                      updateSetting('aiTheme', theme.code);
                      setShowThemeDropdown(false);
                    }}
                  >
                    <Text style={sharedStyles.checkboxText}>
                      {settings.aiTheme === theme.code ? '☑' : '□'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={sharedStyles.tagSelectorText}>
                        {theme.name}
                      </Text>
                      <Text style={[sharedStyles.tagSelectorText, { fontSize: 12, color: '#9CA3AF' }]}>
                        {theme.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Languages to Display */}
        <View style={sharedStyles.settingsSection}>
           <Text style={sharedStyles.settingsLabel}>Quick select languages</Text>
           {/* Selected Languages Flags Display */}
           {settings.enabledLanguages.length > 0 && (
             <View style={sharedStyles.selectedLanguagesContainer}>
               <Text style={sharedStyles.selectedLanguagesLabel}>Selected:</Text>
               <View style={sharedStyles.flagsContainer}>
                 {settings.enabledLanguages.slice(0, 8).map(langCode => {
                   const lang = LANGUAGES.find(l => l.code === langCode);
                   return lang ? (
                     <Text key={langCode} style={sharedStyles.flagEmoji}>
                       {lang.flag}
                     </Text>
                   ) : null;
                 })}
                 {settings.enabledLanguages.length > 8 && (
                   <Text style={sharedStyles.moreFlagsText}>
                     +{settings.enabledLanguages.length - 8}
                   </Text>
                 )}
               </View>
             </View>
           )}
           <TouchableOpacity
             style={sharedStyles.dropdownButton}
             onPress={() => setShowLanguagesSelector(!showLanguagesSelector)}
           >
             <Text style={sharedStyles.dropdownButtonText}>
               {settings.enabledLanguages.length} languages selected
             </Text>
             <Text style={sharedStyles.dropdownArrow}>▼</Text>
           </TouchableOpacity>

          {showLanguagesSelector && (
            <View style={[sharedStyles.tagsSelectorContainer, { maxHeight: 300, borderWidth: 1, borderColor: '#374151' }]}>
              <ScrollView
                style={sharedStyles.tagsSelectorList}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={`lang-${lang.code}`}
                    style={sharedStyles.tagSelectorItem}
                    onPress={() => {
                      const newEnabledLanguages = tempEnabledLanguages.includes(lang.code)
                        ? tempEnabledLanguages.filter(l => l !== lang.code)
                        : [...tempEnabledLanguages, lang.code];
                      setTempEnabledLanguages(newEnabledLanguages);
                    }}
                  >
                    <Text style={sharedStyles.checkboxText}>
                      {tempEnabledLanguages.includes(lang.code) ? '☑' : '□'}
                    </Text>
                    <Text style={sharedStyles.tagSelectorText}>{lang.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Languages Save/Cancel Buttons */}
          <View style={sharedStyles.actionButtonsContainer}>
            <TouchableOpacity
              style={[sharedStyles.actionButton, sharedStyles.saveButton]}
              onPress={() => {
                updateSetting('enabledLanguages', tempEnabledLanguages);
                showSuccess('Language settings saved successfully!');
              }}
            >
              <Text style={sharedStyles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sharedStyles.actionButton, sharedStyles.cancelButton]}
              onPress={() => {
                setTempEnabledLanguages(settings.enabledLanguages);
              }}
            >
              <Text style={sharedStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tags Management */}
        <View style={sharedStyles.settingsSection}>
          <Text style={sharedStyles.settingsLabel}>Tags</Text>


          {/* Tags Dropdown */}
          <View style={sharedStyles.tagsSection}>
            <View style={sharedStyles.tagsDropdownContainer}>
              <TouchableOpacity
                style={sharedStyles.dropdownButton}
                onPress={() => setShowTagsSelector(!showTagsSelector)}
              >
                <Text style={sharedStyles.dropdownButtonText}>
                  Add
                </Text>
                <Text style={sharedStyles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              <Text style={sharedStyles.enabledTagsLabel}>Enabled Tags:</Text>
              {tempEnabledTags.length > 0 && (
                <View style={sharedStyles.enabledTagsContainer}>
                  {tempEnabledTags.map(tagName => {
                    const tag = PERMANENT_TAGS.find(t => t.name === tagName);
                    const isCustom = settings.customTags.includes(tagName);

                    return (
                      <TouchableOpacity
                        key={tagName}
                        style={sharedStyles.enabledTagItem}
                        onPress={() => {
                          const newEnabledTags = tempEnabledTags.filter(t => t !== tagName);
                          setTempEnabledTags(newEnabledTags);
                        }}
                      >
                        <Text style={sharedStyles.enabledTagIcon}>
                          {tag ? tag.icon : tagName.startsWith('🏷️') ? '🏷️' : tagName}
                        </Text>
                        <Text style={sharedStyles.enabledTagDelete}>✕</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {showTagsSelector && (
              <View style={[sharedStyles.tagsSelectorContainer, { maxHeight: 300, borderWidth: 1, borderColor: '#374151' }]}>
                <ScrollView
                  style={sharedStyles.tagsSelectorList}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  contentContainerStyle={{ paddingBottom: 10 }}
                >
                  {PERMANENT_TAGS.map((tag) => {
                    const isRequired = ['vitals', 'medicines', 'activities', 'events', 'habits'].includes(tag.name);
                    const isSelected = tempEnabledTags.includes(tag.name);

                    return (
                      <TouchableOpacity
                        key={`tag-${tag.name}`}
                        style={sharedStyles.tagSelectorItem}
                        onPress={() => {
                          const newEnabledTags = isSelected
                            ? tempEnabledTags.filter(t => t !== tag.name)
                            : [...tempEnabledTags, tag.name];
                          setTempEnabledTags(newEnabledTags);
                        }}
                      >
                        <Text style={sharedStyles.checkboxText}>
                          {isSelected ? '☑' : '□'}
                        </Text>
                        <Text style={sharedStyles.tagSelectorText}>
                          {tag.icon} {tag.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Custom Tags */}
                  {settings.customTags.map((tag) => (
                    <TouchableOpacity
                      key={`custom-${tag}`}
                      style={sharedStyles.tagSelectorItem}
                      onPress={() => {
                        const newEnabledTags = tempEnabledTags.includes(tag)
                          ? tempEnabledTags.filter(t => t !== tag)
                          : [...tempEnabledTags, tag];
                        setTempEnabledTags(newEnabledTags);
                      }}
                    >
                      <Text style={sharedStyles.checkboxText}>
                        {tempEnabledTags.includes(tag) ? '☑' : '□'}
                      </Text>
                      <Text style={sharedStyles.tagSelectorText}>🏷️ {tag}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Custom Tags */}
          <View style={sharedStyles.tagsSection}>
            <Text style={sharedStyles.tagsSubLabel}>Custom Tags:</Text>
            <View style={sharedStyles.tagsContainer}>
              {settings.customTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={sharedStyles.customTag}
                  onPress={() => removeCustomTag(tag)}
                >
                  <Text style={sharedStyles.customTagText}>{tag} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Add New Tag */}
            <View style={sharedStyles.addTagContainer}>
              <TextInput
                style={sharedStyles.addTagInput}
                placeholder="Add custom tag..."
                value={newTag}
                onChangeText={setNewTag}
                onSubmitEditing={addCustomTag}
              />
              <TouchableOpacity
                style={sharedStyles.addTagButton}
                onPress={addCustomTag}
              >
                <Text style={sharedStyles.addTagButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tags Save/Cancel Buttons */}
          <View style={sharedStyles.actionButtonsContainer}>
            <TouchableOpacity
              style={[sharedStyles.actionButton, sharedStyles.saveButton]}
              onPress={() => {
                updateSetting('enabledTags', tempEnabledTags);
                showSuccess('Tag settings saved successfully!');
              }}
            >
              <Text style={sharedStyles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sharedStyles.actionButton, sharedStyles.cancelButton]}
              onPress={() => {
                setTempEnabledTags(settings.enabledTags);
              }}
            >
              <Text style={sharedStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={sharedStyles.backButton}
          onPress={onBack}
        >
          <Text style={sharedStyles.backButtonText}>← Back to Recording</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default SettingsPage;
