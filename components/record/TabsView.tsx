import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, Alert, Modal, FlatList } from 'react-native';
import { speakTextWithGoogleTTS, getVoiceForLanguage } from '../../services/googleTTSService';
import { Note, getSettings, saveSettings } from '../../utils/storage';

interface Translation {
  text: string;
  phonetic?: string;
}

interface RecordingCurrentNote {
  rawTranscription: string;
  polishedNote: string;
  signImageUrl: string | undefined;
  audioUri: string | undefined;
}

interface Language {
   code: string;
   name: string;
   flag: string;
}

interface TabsViewProps {
  recordingViewMode: string;
  setRecordingViewMode: (mode: string) => void;
  activeRecordingTab: string;
  setActiveRecordingTab: (tab: string) => void;
  recordingCurrentNote: RecordingCurrentNote;
  setRecordingCurrentNote: (note: RecordingCurrentNote) => void;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  availableLanguages: Language[];
  showLanguageDropdown: boolean;
  setShowLanguageDropdown: (show: boolean) => void;
  newLanguageCode: string;
  setNewLanguageCode: (code: string) => void;
  newLanguageName: string;
  setNewLanguageName: (name: string) => void;
  translatedText: Translation | null;
  multipleTranslations: { [key: string]: Translation };
  isProcessing: boolean;
  onTranslate: () => void;
  onAddLanguage: () => void;
  onSpeakTranslation: () => void;
  onSpeakTranslationForLang: (langCode: string) => void;
  onSaveNote: (includeGps: boolean, tags: string[]) => void;
  onCancel: () => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  tagInput: string;
  setTagInput: (input: string) => void;
  onAddTag: (tag: string) => void;
  onShowTagInfo: (tag: string) => void;
  onCancelTranslation: () => void;
}

const TabsView: React.FC<TabsViewProps> = ({
  recordingViewMode,
  setRecordingViewMode,
  activeRecordingTab,
  setActiveRecordingTab,
  recordingCurrentNote,
  setRecordingCurrentNote,
  targetLanguage,
  setTargetLanguage,
  availableLanguages,
  showLanguageDropdown,
  setShowLanguageDropdown,
  newLanguageCode,
  setNewLanguageCode,
  newLanguageName,
  setNewLanguageName,
  translatedText,
  multipleTranslations,
  isProcessing,
  onTranslate,
  onAddLanguage,
  onSpeakTranslation,
  onSpeakTranslationForLang,
  onSaveNote,
  onCancel,
  tags,
  setTags,
  tagInput,
  setTagInput,
  onAddTag,
  onShowTagInfo,
  onCancelTranslation
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [includeGps, setIncludeGps] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [noteTags, setNoteTags] = useState<string[]>([]);

  // Load user preferred language from settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        setTargetLanguage(settings.uiLanguage || 'en');
        console.log('DEBUG: Loaded target language from settings:', settings.uiLanguage);
      } catch (error) {
        console.error('Error loading settings:', error);
        setTargetLanguage('en');
      }
    };
    loadSettings();
  }, []);

  // Update available languages when settings change (passed from parent)
  useEffect(() => {
    // availableLanguages is now passed from parent and filtered by enabledLanguages
    // No need to load here as it's handled in RecordTranslate.tsx
  }, [availableLanguages]);

  // Set default language to English if not defined
  useEffect(() => {
    if (!targetLanguage || targetLanguage === '') {
      setTargetLanguage('en');
    }
  }, [targetLanguage]);

  return (
    <>
    <View style={styles.tabsView}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeRecordingTab === 'polished' && styles.activeTab]}
          onPress={() => setActiveRecordingTab('polished')}
        >
          <Text style={[styles.tabText, activeRecordingTab === 'polished' && styles.activeTabText]}>Polished</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeRecordingTab === 'original' && styles.activeTab]}
          onPress={() => setActiveRecordingTab('original')}
        >
          <Text style={[styles.tabText, activeRecordingTab === 'original' && styles.activeTabText]}>Original</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeRecordingTab === 'translate' && styles.activeTab]}
          onPress={() => setActiveRecordingTab('translate')}
        >
          <Text style={[styles.tabText, activeRecordingTab === 'translate' && styles.activeTabText]}>Translate</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Header with Back Button */}
      {recordingViewMode === 'tabs' && (
        <View style={styles.tabHeader}>
          <TouchableOpacity
            style={styles.tabBackButton}
            onPress={() => {
              setRecordingViewMode('actions');
              setActiveRecordingTab('polished');
            }}
          >
            <Text style={styles.tabBackButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeRecordingTab === 'polished' && (
          <View style={styles.contentArea}>
            {recordingCurrentNote.polishedNote ? (
              <View style={styles.textDisplay}>
                <Text style={styles.displayText}>{recordingCurrentNote.polishedNote}</Text>
              </View>
            ) : (
              <View style={styles.actionPrompt}>
                <Text style={styles.promptText}>Polish your note with AI for clarity and structure.</Text>
                <TouchableOpacity
                  style={[styles.primaryButton, isProcessing && styles.disabledButton]}
                  onPress={() => {}}
                  disabled={isProcessing}
                >
                  <Text style={styles.primaryButtonText}>
                    {isProcessing ? 'Processing...' : 'Polish Note (FREE)'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {activeRecordingTab === 'original' && (
          <View style={styles.contentArea}>
            {/* Sign Image Display */}
            {recordingCurrentNote.signImageUrl && (
              <View style={styles.signImageContainer}>
                <Text style={styles.signImageLabel}>Captured Sign Image</Text>
                <View style={styles.signImageWrapper}>
                  <Image
                    source={{ uri: recordingCurrentNote.signImageUrl }}
                    style={styles.signImage}
                    resizeMode="cover"
                  />
                </View>
              </View>
            )}

            {/* Original Transcription Text */}
            <Text style={styles.originalText}>{recordingCurrentNote.rawTranscription || "No transcription available."}</Text>

            {/* Audio Playback */}
            {recordingCurrentNote.audioUri && (
              <TouchableOpacity
                style={styles.playbackButton}
                onPress={() => {
                  // TODO: Implement audio playback
                }}
              >
                <Text style={styles.playbackButtonText}>🔊 Play Recording</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeRecordingTab === 'translate' && (
          <ScrollView style={styles.contentArea}>
            <View style={styles.translationControls}>
              <Text style={styles.labelText}>Target Language:</Text>

              {/* Language selection dropdown */}
              <View style={styles.languageSelectionContainer}>
                <Text style={styles.quickSelectLabel}>Select target language:</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {availableLanguages.find(lang => lang.code === targetLanguage)?.flag || ''} {availableLanguages.find(lang => lang.code === targetLanguage)?.name || 'Select Language'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                {showLanguageDropdown && (
                  <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={true}>
                    {availableLanguages
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(lang => (
                        <TouchableOpacity
                          key={lang.code}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setTargetLanguage(lang.code);
                            setShowLanguageDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, { fontSize: 16 }]}>
                            {lang.flag} {lang.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                )}
              </View>

              {showLanguageDropdown && (
                <View style={styles.languageDropdownList}>
                  <View style={styles.addLanguageForm}>
                    <TextInput
                      style={styles.addLanguageInput}
                      placeholder="Language code (e.g., fr)"
                      value={newLanguageCode}
                      onChangeText={setNewLanguageCode}
                    />
                    <TextInput
                      style={styles.addLanguageInput}
                      placeholder="Language name (e.g., French)"
                      value={newLanguageName}
                      onChangeText={setNewLanguageName}
                    />
                    <TouchableOpacity
                      style={styles.confirmAddButton}
                      onPress={onAddLanguage}
                    >
                      <Text style={styles.confirmAddButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.translateButtonsContainer}>
                <TouchableOpacity
                  style={[styles.secondaryButton, isProcessing && styles.disabledButton]}
                  onPress={onTranslate}
                  disabled={isProcessing}
                >
                  <Text style={styles.secondaryButtonText}>
                    {isProcessing ? 'Translating...' : 'Translate'}
                  </Text>
                </TouchableOpacity>

                {isProcessing && (
                  <TouchableOpacity
                    style={styles.cancelTranslateButton}
                    onPress={onCancelTranslation}
                  >
                    <Text style={styles.cancelTranslateButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Show all translations */}
            {Object.keys(multipleTranslations).length > 0 && (
              <View style={styles.allTranslationsContainer}>
                <Text style={styles.translationsTitle}>All Translations:</Text>
                {Object.entries(multipleTranslations).map(([langCode, translation]) => (
                  <View key={langCode} style={styles.translationResult}>
                    <Text style={styles.languageLabel}>
                      {availableLanguages.find(l => l.code === langCode)?.name || langCode}:
                    </Text>
                    <Text style={styles.translationText}>{translation.text}</Text>
                    {translation.phonetic && (
                      <Text style={styles.phoneticText}>{translation.phonetic}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Current translation being worked on */}
            {translatedText && !multipleTranslations[targetLanguage] && (
              <View style={styles.translationResult}>
                <Text style={styles.translationText}>{translatedText.text}</Text>
                {translatedText.phonetic && (
                  <Text style={styles.phoneticText}>{translatedText.phonetic}</Text>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Save/Cancel Buttons - Always visible in tabs mode */}
      {recordingViewMode === 'tabs' && (
        <View style={styles.saveCancelContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>❌ Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveNoteButton} onPress={() => setShowSaveModal(true)}>
            <Text style={styles.saveNoteButtonText}>💾 Save Note</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>

    {/* Save Modal */}
    <Modal visible={showSaveModal} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.saveModalContent}>
          <Text style={styles.saveModalTitle}>Save Note</Text>

          <View style={styles.locationSection}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIncludeGps(!includeGps)}
            >
              <Text style={styles.checkboxText}>{includeGps ? '☑' : '□'}</Text>
              <Text style={styles.checkboxLabel}>Include current location</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tagsSection}>
            <Text style={styles.tagsLabel}>Tags:</Text>
            <View style={styles.enabledTagsList}>
              {(() => {
                // Get enabled tags from settings
                const [enabledTags, setEnabledTags] = useState<string[]>([]);

                useEffect(() => {
                  const loadEnabledTags = async () => {
                    try {
                      // Load directly from AsyncStorage like SettingsPage does
                      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                      const savedSettings = await AsyncStorage.getItem('userSettings');
                      if (savedSettings) {
                        const settings = JSON.parse(savedSettings);
                        console.log('DEBUG TabsView: Loaded userSettings:', settings);
                        console.log('DEBUG TabsView: enabledTags from userSettings:', settings.enabledTags);
                        const tags = settings.enabledTags || [];
                        console.log('DEBUG TabsView: Setting enabledTags to:', tags);
                        setEnabledTags(tags);
                      } else {
                        console.log('DEBUG TabsView: No userSettings found');
                        setEnabledTags([]);
                      }
                    } catch (error) {
                      console.error('Error loading enabled tags:', error);
                      setEnabledTags([]);
                    }
                  };
                  loadEnabledTags();
                }, []);

                const permanentTagIcons: { [key: string]: string } = {
                  'vitals': '❤️',
                  'medicines': '💊',
                  'events': '📅',
                  'activities': '🏃',
                  'habits': '🎯',
                  'Work': '💼',
                  'Personal': '🏠',
                  'Ideas': '💡',
                  'Health': '🏥',
                  'Fitness': '💪',
                  'Nutrition': '🥗',
                  'Sleep': '😴',
                  'Mood': '😊',
                  'Energy': '⚡',
                  'Focus': '🎯',
                  'Creativity': '🎨'
                };

                console.log('DEBUG: Rendering enabled tags:', enabledTags);

                if (enabledTags.length === 0) {
                  return (
                    <Text style={styles.checkboxLabel}>No enabled tags found. Configure tags in Settings.</Text>
                  );
                }

                return enabledTags.map(tag => {
                  const isSelected = noteTags.includes(tag);
                  const icon = permanentTagIcons[tag] || '🏷️';

                  console.log('DEBUG: Rendering tag:', tag, 'selected:', isSelected);

                  return (
                    <TouchableOpacity
                      key={tag}
                      style={styles.checkboxContainer}
                      onPress={() => {
                        console.log('DEBUG: Toggled tag:', tag);
                        if (isSelected) {
                          setNoteTags(noteTags.filter(t => t !== tag));
                        } else {
                          setNoteTags([...noteTags, tag]);
                        }
                      }}
                    >
                      <Text style={styles.checkboxText}>{isSelected ? '☑' : '□'}</Text>
                      <Text style={styles.checkboxLabel}>{icon} {tag}</Text>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
          </View>

          <View style={styles.saveModalButtons}>
            <TouchableOpacity
              style={styles.saveModalCancelButton}
              onPress={() => {
                setShowSaveModal(false);
                setIncludeGps(false);
                setNoteTags([]);
              }}
            >
              <Text style={styles.saveModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveModalSaveButton}
              onPress={() => {
                onSaveNote(includeGps, noteTags);
                setShowSaveModal(false);
                setIncludeGps(false);
                setNoteTags([]);
              }}
            >
              <Text style={styles.saveModalSaveText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
};
// Tag Selector Modal Component
const TagSelectorModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}> = ({ visible, onClose, selectedTags, onTagsChange }) => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [enabledTags, setEnabledTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    if (visible) {
      console.log('DEBUG: TagSelectorModal opened');
      loadAvailableTags();
      loadEnabledTags();
    }
  }, [visible]);

  const loadAvailableTags = async () => {
    try {
      const settings = await getSettings();
      const enabledTags = settings.enabledTags || [];
      const customTags = settings.customTags || [];
      const defaultTags = [
        'vitals', 'medicines', 'events', 'activities', 'habits',
        'Work', 'Personal', 'Ideas', 'Health', 'Fitness', 'Nutrition', 'Sleep', 'Mood', 'Energy', 'Focus', 'Creativity'
      ];
      const allTags = Array.from(new Set([...enabledTags, ...customTags, ...defaultTags]));
      setAvailableTags(allTags);
    } catch (error) {
      console.error('Error loading tags:', error);
      setAvailableTags([
        'vitals', 'medicines', 'events', 'activities', 'habits',
        'Work', 'Personal', 'Ideas', 'Health', 'Fitness', 'Nutrition', 'Sleep', 'Mood', 'Energy', 'Focus', 'Creativity'
      ]);
    }
  };

  const loadEnabledTags = async () => {
    try {
      const settings = await getSettings();
      const enabledTags = settings.enabledTags || [];
      setEnabledTags(enabledTags);
    } catch (error) {
      console.error('Error loading enabled tags:', error);
      setEnabledTags([]);
    }
  };

  const saveCustomTag = async (tag: string) => {
    try {
      const currentSettings = await getSettings();
      const customTags = currentSettings.customTags || [];
      if (!customTags.includes(tag)) {
        const updatedSettings = {
          ...currentSettings,
          customTags: [...customTags, tag]
        };
        await saveSettings(updatedSettings);
      }
    } catch (error) {
      console.error('Error saving custom tag:', error);
    }
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleAddNewTag = () => {
    const newTag = newTagInput.trim();
    if (newTag && !availableTags.includes(newTag)) {
      setAvailableTags(prev => [...prev, newTag]);
      saveCustomTag(newTag);
      onTagsChange([...selectedTags, newTag]);
      setNewTagInput('');
    }
  };

  const renderTagItem = ({ item }: { item: string }) => {
    const isSelected = selectedTags.includes(item);
    const isEnabled = enabledTags.includes(item);
    const permanentTagIcons: { [key: string]: string } = {
      'vitals': '❤️',
      'medicines': '💊',
      'events': '📅',
      'activities': '🏃',
      'habits': '🎯',
      'Work': '💼',
      'Personal': '🏠',
      'Ideas': '💡',
      'Health': '🏥',
      'Fitness': '💪',
      'Nutrition': '🥗',
      'Sleep': '😴',
      'Mood': '😊',
      'Energy': '⚡',
      'Focus': '🎯',
      'Creativity': '🎨'
    };

    const icon = permanentTagIcons[item] || '🏷️';

    return (
      <TouchableOpacity
        style={[styles.tagSelectorItem, isSelected && styles.tagSelectorItemSelected, !isEnabled && styles.tagSelectorItemDisabled]}
        onPress={() => handleTagToggle(item)}
        disabled={!isEnabled}
      >
        <Text style={[styles.tagSelectorItemText, isSelected && styles.tagSelectorItemTextSelected, !isEnabled && styles.tagSelectorItemTextDisabled]}>
          {icon} {item}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.tagSelectorModalOverlay}>
        <View style={styles.tagSelectorModalContent}>
          <Text style={styles.tagSelectorModalTitle}>Select Tags</Text>

          <FlatList
            data={availableTags}
            renderItem={renderTagItem}
            keyExtractor={(item) => item}
            numColumns={2}
            contentContainerStyle={styles.tagSelectorList}
          />

          <View style={styles.addNewTagContainer}>
            <TextInput
              style={styles.addNewTagInput}
              placeholder="Add new tag..."
              placeholderTextColor="#9ca3af"
              value={newTagInput}
              onChangeText={setNewTagInput}
              onSubmitEditing={handleAddNewTag}
            />
            <TouchableOpacity
              style={styles.addNewTagButton}
              onPress={handleAddNewTag}
            >
              <Text style={styles.addNewTagButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tagSelectorModalButtons}>
            <TouchableOpacity
              style={styles.tagSelectorModalCancelButton}
              onPress={onClose}
            >
              <Text style={styles.tagSelectorModalCancelText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Location Modal Component
const LocationModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onNext: (includeLocation: boolean) => void;
}> = ({ visible, onClose, onNext }) => {
  const [includeLocation, setIncludeLocation] = useState(false);

  const handleNext = () => {
    onNext(includeLocation);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.saveModalContent}>
          <Text style={styles.saveModalTitle}>Add Location?</Text>
          <Text style={styles.gpsModalText}>
            Would you like to include your current location with this note?
          </Text>

          <View style={styles.locationSection}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIncludeLocation(!includeLocation)}
            >
              <Text style={styles.checkboxText}>{includeLocation ? '☑' : '□'}</Text>
              <Text style={styles.checkboxLabel}>Include current location</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.saveModalButtons}>
            <TouchableOpacity
              style={styles.saveModalCancelButton}
              onPress={() => onNext(false)}
            >
              <Text style={styles.saveModalCancelText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveModalSaveButton}
              onPress={handleNext}
            >
              <Text style={styles.saveModalSaveText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};


const styles = {
  tabsView: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row' as const,
    backgroundColor: '#1f2937',
    margin: 10,
    borderRadius: 10,
    padding: 5,
  },
  tabButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center' as const,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#f59e0b',
  },
  tabText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  activeTabText: {
    color: '#000',
  },
  tabHeader: {
    padding: 15,
  },
  tabBackButton: {
    padding: 5,
  },
  tabBackButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  contentArea: {
    flex: 1,
  },
  textDisplay: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  displayText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  speakButton: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  speakIcon: {
    fontSize: 16,
  },
  translateButton: {
    position: 'absolute' as const,
    bottom: 10,
    right: 10,
    backgroundColor: '#f59e0b',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  translateButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  actionPrompt: {
    alignItems: 'center' as const,
    padding: 20,
  },
  promptText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center' as const,
    minWidth: 200,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  disabledButton: {
    opacity: 0.6,
  },
  originalText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  playbackButton: {
    backgroundColor: '#1f2937',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center' as const,
  },
  playbackButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  translationControls: {
    marginBottom: 20,
  },
  labelText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  languageSelector: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  languageDropdown: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  languageDropdownText: {
    fontSize: 16,
  },
  dropdownArrow: {
    fontSize: 16,
  },
  addLanguageButton: {
    marginLeft: 10,
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  addLanguageButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold' as const,
  },
  quickSelectButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    width: 100,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginLeft: 10,
  },
  quickSelectButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  languageDropdownList: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    marginTop: 5,
    padding: 10,
  },
  languageOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  languageOptionText: {
    fontSize: 16,
  },
  addLanguageForm: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  addLanguageInput: {
    backgroundColor: '#374151',
    borderRadius: 5,
    padding: 8,
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  confirmAddButton: {
    backgroundColor: '#f59e0b',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center' as const,
  },
  confirmAddButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#f59e0b',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  secondaryButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  translateButtonsContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  cancelTranslateButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
    marginLeft: 10,
    alignItems: 'center' as const,
  },
  cancelTranslateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  allTranslationsContainer: {
    marginTop: 20,
  },
  translationsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginBottom: 15,
  },
  translationResult: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  languageLabel: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginBottom: 5,
  },
  translationText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
  phoneticText: {
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic' as const,
  },
  saveCancelContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center' as const,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  saveNoteButton: {
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center' as const,
  },
  saveNoteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  signImageContainer: {
    marginBottom: 20,
  },
  signImageLabel: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginBottom: 10,
    textAlign: 'center' as const,
  },
  signImageWrapper: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center' as const,
  },
  signImage: {
    width: 250,
    height: 200,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  saveModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    width: '90%' as const,
    maxWidth: 400,
  },
  saveModalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#fff',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  saveModalInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  locationSection: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  checkboxText: {
    fontSize: 18,
    marginRight: 10,
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 16,
  },
  tagsSection: {
    marginBottom: 20,
  },
  tagsLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  tagInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  saveModalButtons: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  saveModalCancelButton: {
    backgroundColor: '#6b7280',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center' as const,
  },
  saveModalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  saveModalSaveButton: {
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center' as const,
  },
  saveModalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  modalTagsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },
  modalTagChip: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    margin: 4,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  modalTagText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  modalRemoveTagText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginLeft: 6,
  },
  gpsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  gpsModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    width: '90%' as const,
    maxWidth: 400,
  },
  gpsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#fff',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  gpsModalText: {
    color: '#9ca3af',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  gpsModalButtons: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  gpsModalButton: {
    backgroundColor: '#374151',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center' as const,
  },
  gpsModalButtonPrimary: {
    backgroundColor: '#f59e0b',
  },
  gpsModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  gpsModalButtonTextPrimary: {
    color: '#000',
  },
  tagSelectorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  tagSelectorModalContent: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 20,
    width: '90%' as const,
    maxWidth: 400,
    maxHeight: '80%' as const,
  },
  tagSelectorModalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#fff',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  tagSelectorList: {
    paddingBottom: 10,
  },
  tagSelectorItem: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    margin: 4,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 50,
  },
  tagSelectorItemSelected: {
    backgroundColor: '#f59e0b',
  },
  tagSelectorItemText: {
    color: '#d1d5db',
    fontSize: 14,
    textAlign: 'center' as const,
  },
  tagSelectorItemTextSelected: {
    color: '#000',
    fontWeight: 'bold' as const,
  },
  addNewTagContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 10,
    marginBottom: 20,
  },
  addNewTagInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
  },
  addNewTagButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  addNewTagButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold' as const,
  },
  tagSelectorModalButtons: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
  },
  tagSelectorModalCancelButton: {
    backgroundColor: '#6b7280',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center' as const,
  },
  tagSelectorModalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  tagSelectorButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  tagSelectorButtonText: {
    color: '#f59e0b',
    fontSize: 16,
  },
  tagSelectorButtonArrow: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  selectedTagsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    marginTop: 10,
  },
  selectedTagChip: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    margin: 4,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  selectedTagText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  selectedTagRemoveText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginLeft: 6,
  },
};

export default TabsView;