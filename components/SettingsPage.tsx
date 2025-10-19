import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sharedStyles } from '../styles';

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

// Languages sorted alphabetically by name
export const LANGUAGES = [
  { code: 'af', name: 'Afrikaans' },
  { code: 'sq', name: 'Albanian' },
  { code: 'am', name: 'Amharic' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hy', name: 'Armenian' },
  { code: 'az', name: 'Azerbaijani' },
  { code: 'eu', name: 'Basque' },
  { code: 'be', name: 'Belarusian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'my', name: 'Burmese' },
  { code: 'ca', name: 'Catalan' },
  { code: 'ny', name: 'Chichewa' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hr', name: 'Croatian' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' },
  { code: 'et', name: 'Estonian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fil', name: 'Filipino' },
  { code: 'fr', name: 'French' },
  { code: 'gl', name: 'Galician' },
  { code: 'ka', name: 'Georgian' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'ha', name: 'Hausa' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ga', name: 'Irish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'jv', name: 'Javanese' },
  { code: 'kn', name: 'Kannada' },
  { code: 'kk', name: 'Kazakh' },
  { code: 'km', name: 'Khmer' },
  { code: 'rw', name: 'Kinyarwanda' },
  { code: 'ko', name: 'Korean' },
  { code: 'lo', name: 'Lao' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'mg', name: 'Malagasy' },
  { code: 'ms', name: 'Malay' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mt', name: 'Maltese' },
  { code: 'mr', name: 'Marathi' },
  { code: 'mn', name: 'Mongolian' },
  { code: 'ne', name: 'Nepali' },
  { code: 'no', name: 'Norwegian' },
  { code: 'or', name: 'Oriya' },
  { code: 'om', name: 'Oromo' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'sd', name: 'Sindhi' },
  { code: 'si', name: 'Sinhala' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'so', name: 'Somali' },
  { code: 'es', name: 'Spanish' },
  { code: 'ss', name: 'Swati' },
  { code: 'st', name: 'Sesotho' },
  { code: 'sn', name: 'Shona' },
  { code: 'sv', name: 'Swedish' },
  { code: 'sw', name: 'Swahili' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'tg', name: 'Tajik' },
  { code: 'th', name: 'Thai' },
  { code: 'ti', name: 'Tigrinya' },
  { code: 'tk', name: 'Turkmen' },
  { code: 'tn', name: 'Tswana' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'uz', name: 'Uzbek' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'cy', name: 'Welsh' },
  { code: 'xh', name: 'Xhosa' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'zu', name: 'Zulu' },
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

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
   const [settings, setSettings] = useState<UserSettings>({
     uiLanguage: 'en',
     userCurrency: 'USD',
     customTags: [],
     locationPermission: 'prompt',
     enabledTags: [],
     enabledLanguages: []
   });
   const [tempEnabledTags, setTempEnabledTags] = useState<string[]>([]);
   const [tempEnabledLanguages, setTempEnabledLanguages] = useState<string[]>([]);
   const [newTag, setNewTag] = useState('');
   const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
   const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
   const [showLocationDropdown, setShowLocationDropdown] = useState(false);
   const [showTagsSelector, setShowTagsSelector] = useState(false);
   const [showLanguagesSelector, setShowLanguagesSelector] = useState(false);

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
        setSettings(JSON.parse(savedSettings));
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
      Alert.alert('Error', 'Failed to save settings');
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
      Alert.alert('Error', 'Tag already exists or is a permanent tag');
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
            <View style={sharedStyles.dropdownList}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={sharedStyles.dropdownItem}
                  onPress={() => {
                    updateSetting('uiLanguage', lang.code);
                    setShowLanguageDropdown(false);
                  }}
                >
                  <Text style={sharedStyles.dropdownItemText}>{lang.name}</Text>
                </TouchableOpacity>
              ))}
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
            <View style={sharedStyles.dropdownList}>
              {CURRENCIES.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={sharedStyles.dropdownItem}
                  onPress={() => {
                    updateSetting('userCurrency', currency.code);
                    setShowCurrencyDropdown(false);
                  }}
                >
                  <Text style={sharedStyles.dropdownItemText}>
                    {currency.symbol} {currency.name}
                  </Text>
                </TouchableOpacity>
              ))}
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

        {/* Languages to Display */}
        <View style={sharedStyles.settingsSection}>
          <Text style={sharedStyles.settingsLabel}>Languages to Display</Text>
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
                Alert.alert('Success', 'Language settings saved successfully!');
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
            <TouchableOpacity
              style={sharedStyles.dropdownButton}
              onPress={() => setShowTagsSelector(!showTagsSelector)}
            >
              <Text style={sharedStyles.dropdownButtonText}>
                {tempEnabledTags.length} tags selected
              </Text>
              <Text style={sharedStyles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            {showTagsSelector && (
              <View style={[sharedStyles.tagsSelectorContainer, { maxHeight: 300, borderWidth: 1, borderColor: '#374151' }]}>
                <ScrollView
                  style={sharedStyles.tagsSelectorList}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  contentContainerStyle={{ paddingBottom: 10 }}
                >
                  {PERMANENT_TAGS.map((tag) => (
                    <TouchableOpacity
                      key={`tag-${tag.name}`}
                      style={sharedStyles.tagSelectorItem}
                      onPress={() => {
                        const newEnabledTags = tempEnabledTags.includes(tag.name)
                          ? tempEnabledTags.filter(t => t !== tag.name)
                          : [...tempEnabledTags, tag.name];
                        setTempEnabledTags(newEnabledTags);
                      }}
                    >
                      <Text style={sharedStyles.checkboxText}>
                        {tempEnabledTags.includes(tag.name) ? '☑' : '□'}
                      </Text>
                      <Text style={sharedStyles.tagSelectorText}>{tag.icon} {tag.name}</Text>
                    </TouchableOpacity>
                  ))}

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
                Alert.alert('Success', 'Tag settings saved successfully!');
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