import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { translateTextWithGemini, translateSignWithGemini, transcribeAudioWithGemini, polishNoteWithGemini } from '../services/geminiService';
import { speakTextWithGoogleTTS, getVoiceForLanguage } from '../services/googleTTSService';
import { Note, generateNoteId, getSettings } from '../utils/storage';
import { deductCredits, CREDIT_PRICING, getCredits, checkCreditsAndNotify } from '../utils/credits';
import { LANGUAGES } from './SettingsPage';
import ActionsView from './record/ActionsView';
import RecordingView from './record/RecordingView';
import TypingView from './record/TypingView';
import TabsView from './record/TabsView';

type AppScreen = 'landing' | 'notes' | 'record' | 'settings' | 'credits' | 'link' | 'upload' | 'fun' | 'map' | 'medicine' | 'calculator' | 'currency' | 'tetris' | 'profile';

interface RecordTranslateProps {
  onSaveNote: (note: Note) => void;
  setCurrentScreen: (screen: any) => void;
}

export const RecordTranslate: React.FC<RecordTranslateProps> = ({ onSaveNote, setCurrentScreen }) => {
  // Recording view mode states
  const [recordingViewMode, setRecordingViewMode] = useState<'actions' | 'recording' | 'typing' | 'tabs'>('actions');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingCurrentNote, setRecordingCurrentNote] = useState({
    rawTranscription: '',
    polishedNote: '',
    signImageUrl: undefined as string | undefined,
    audioUri: undefined as string | undefined
  });
  const [noteTitle, setNoteTitle] = useState('');
  const [typedText, setTypedText] = useState('');
  const [activeRecordingTab, setActiveRecordingTab] = useState<'polished' | 'original' | 'translate'>('polished');

  // Translation states
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [availableLanguages, setAvailableLanguages] = useState(LANGUAGES);

  // Load user preferred language and enabled languages from settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        setTargetLanguage(settings.uiLanguage || 'en');

        // Filter LANGUAGES to only include enabled languages
        const enabledLangCodes = settings.enabledLanguages || ['en', 'lo', 'km', 'th', 'vi', 'zh', 'ja', 'ko', 'uk', 'fil'];
        const enabledLangs = LANGUAGES.filter(lang => enabledLangCodes.includes(lang.code));
        setAvailableLanguages(enabledLangs);
      } catch (error) {
        console.error('Error loading settings:', error);
        setTargetLanguage('en');
        // Fallback to default enabled languages
        const defaultEnabled = ['en', 'lo', 'km', 'th', 'vi', 'zh', 'ja', 'ko', 'uk', 'fil'];
        const defaultLangs = LANGUAGES.filter(lang => defaultEnabled.includes(lang.code));
        setAvailableLanguages(defaultLangs);
      }
    };
    loadSettings();
  }, []);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [newLanguageCode, setNewLanguageCode] = useState('');
  const [newLanguageName, setNewLanguageName] = useState('');
  const [translatedText, setTranslatedText] = useState<{ text: string; phonetic?: string } | null>(null);
  const [multipleTranslations, setMultipleTranslations] = useState<{ [key: string]: { text: string; phonetic?: string } }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  // Other states
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<string[]>([]);
  const [savedNotes, setSavedNotes] = useState<any[]>([]);
  const [deviceId] = useState('device-123'); // Mock device ID
  const [credits, setCredits] = useState(0);
  const [activeTab, setActiveTab] = useState('record'); // Mock active tab
  const [isProcessingGlobal, setIsProcessingGlobal] = useState(false);

  // Load credits on component mount
  useEffect(() => {
    const loadCredits = async () => {
      try {
        const creditsData = await getCredits();
        setCredits(creditsData.balance);
      } catch (error) {
        console.error('Error loading credits:', error);
      }
    };
    loadCredits();
  }, []);

  const recordingRef = useRef<Audio.Recording | null>(null);

  // Handler functions for the new component structure
  const handleSignTranslation = async () => {
    try {
      // Check credits first
      const hasCredits = await checkCreditsAndNotify(CREDIT_PRICING.SIGN_TRANSLATION, 'Sign Language Translation');
      if (!hasCredits) {
        // Show alert and offer to navigate to credits page
        Alert.alert(
          'Insufficient Credits',
          `You need ${CREDIT_PRICING.SIGN_TRANSLATION} credits for sign language translation, but you don't have enough.\n\nWould you like to go to the Credits page to get more credits?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Go to Credits',
              onPress: () => setCurrentScreen('credits')
            }
          ]
        );
        return;
      }

      // Deduct credits for sign translation
      const creditDeducted = await deductCredits(CREDIT_PRICING.SIGN_TRANSLATION, 'Sign Language Translation');
      if (!creditDeducted) {
        Alert.alert('Error', 'Failed to process credits. Please try again.');
        return;
      }

      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required for sign translation');
        return;
      }

      setIsProcessing(true);
      setProcessingMessage('Marvin is analyzing...');

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64Image = result.assets[0].base64;
        if (base64Image) {
          const translationResult = await translateSignWithGemini(base64Image, targetLanguage);

          // Set the translated text and move to tabs for editing
          setRecordingCurrentNote({
            rawTranscription: translationResult.translation,
            polishedNote: translationResult.translation,
            signImageUrl: result.assets[0].uri,
            audioUri: undefined
          });

          // Add the sign image to attached media
          setAttachedMedia([result.assets[0].uri]);

          setRecordingViewMode('tabs');
          setActiveRecordingTab('polished');
        }
      }
    } catch (error) {
      console.error('Sign translation error:', error);
      Alert.alert('Error', 'Failed to process sign translation');
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  const handleVoiceRecording = async () => {
    // Check credits first
    const hasCredits = await checkCreditsAndNotify(CREDIT_PRICING.VOICE_RECORDING, 'Voice Recording + AI Processing');
    if (!hasCredits) {
      // Show alert and offer to navigate to credits page
      Alert.alert(
        'Insufficient Credits',
        `You need ${CREDIT_PRICING.VOICE_RECORDING} credits for voice recording, but you don't have enough.\n\nWould you like to go to the Credits page to get more credits?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Credits',
            onPress: () => setCurrentScreen('credits')
          }
        ]
      );
      return;
    }

    // Deduct credits for voice recording
    const creditDeducted = await deductCredits(CREDIT_PRICING.VOICE_RECORDING, 'Voice Recording + AI Processing');
    if (!creditDeducted) {
      Alert.alert('Error', 'Failed to process credits. Please try again.');
      return;
    }

    // Start recording immediately
    console.log('DEBUG: Starting voice recording - setting view mode to recording');
    setRecordingViewMode('recording');
    setIsRecording(true);
    console.log('DEBUG: Set isRecording to true');
    // Start the actual recording
    await handleStartRecording();
  };

  const handleStartRecording = async () => {
    try {
      console.log('DEBUG: handleStartRecording called');
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Audio recording permission is required');
        return;
      }

      // Prepare recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: 2, // MPEG_4
          audioEncoder: 3, // AAC
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: 127, // High
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });
      await recording.startAsync();

      recordingRef.current = recording;
      setRecording(recording);
      console.log('DEBUG: Recording started successfully, recordingRef set');
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const handleTextInput = () => {
    setRecordingViewMode('typing');
  };

  const handleStopRecording = async () => {
    try {
      console.log('DEBUG: handleStopRecording called in RecordTranslate');
      if (!recordingRef.current) {
        console.log('DEBUG: No recording ref found');
        return;
      }

      console.log('DEBUG: Setting isRecording to false');
      setIsRecording(false);
      console.log('DEBUG: Stopping and unloading recording');
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      console.log('DEBUG: Got URI:', uri);

      if (uri) {
        console.log('DEBUG: Starting transcription');
        setIsTranscribing(true);
        // Transcribe the audio
        const transcribedText = await transcribeAudioWithGemini(uri);
        console.log('DEBUG: Transcription completed:', transcribedText);

        // Polish the transcription
        console.log('DEBUG: Starting polish');
        const polished = await polishNoteWithGemini(transcribedText);
        console.log('DEBUG: Polish completed:', polished.polishedNote);

        console.log('DEBUG: Setting recording current note');
        setRecordingCurrentNote({
          rawTranscription: transcribedText,
          polishedNote: polished.polishedNote,
          signImageUrl: undefined,
          audioUri: uri
        });

        // Add the audio URI to attached media
        console.log('DEBUG: Adding audio URI to attached media');
        setAttachedMedia(prev => [...prev, uri]);

        console.log('DEBUG: Setting view mode to tabs');
        setRecordingViewMode('tabs');
        setActiveRecordingTab('polished');
        console.log('DEBUG: Navigation to tabs completed');
      } else {
        console.log('DEBUG: No URI received from recording');
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process recording');
    } finally {
      console.log('DEBUG: Finally block - setting isTranscribing to false');
      setIsTranscribing(false);
      setRecording(null);
      recordingRef.current = null;
    }
  };

  const handlePauseRecording = async () => {
    if (recordingRef.current) {
      await recordingRef.current.pauseAsync();
    }
  };

  const handleResumeRecording = async () => {
    if (recordingRef.current) {
      await recordingRef.current.startAsync();
    }
  };

  const handleTranslate = async () => {
    if (!recordingCurrentNote.polishedNote.trim()) {
      Alert.alert('Error', 'No text to translate');
      return;
    }

    // Check credits first
    const hasCredits = await checkCreditsAndNotify(CREDIT_PRICING.TEXT_TRANSLATION, 'Text Translation');
    if (!hasCredits) {
      // Show alert and offer to navigate to credits page
      Alert.alert(
        'Insufficient Credits',
        `You need ${CREDIT_PRICING.TEXT_TRANSLATION} credits for text translation, but you don't have enough.\n\nWould you like to go to the Credits page to get more credits?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Credits',
            onPress: () => setCurrentScreen('credits')
          }
        ]
      );
      return;
    }

    // Deduct credits for text translation
    const creditDeducted = await deductCredits(CREDIT_PRICING.TEXT_TRANSLATION, 'Text Translation');
    if (!creditDeducted) {
      Alert.alert('Error', 'Failed to process credits. Please try again.');
      return;
    }

    try {
      setIsProcessing(true);
      const result = await translateTextWithGemini(recordingCurrentNote.polishedNote, targetLanguage);
      setTranslatedText(result);
      setMultipleTranslations(prev => ({
        ...prev,
        [targetLanguage]: result
      }));
    } catch (error) {
      console.error('Translation error:', error);
      Alert.alert('Error', 'Failed to translate text');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddLanguage = () => {
    if (newLanguageCode.trim() && newLanguageName.trim()) {
      const newLang = {
        code: newLanguageCode.trim().toLowerCase(),
        name: newLanguageName.trim(),
        flag: '🏳️'
      };
      setAvailableLanguages(prev => [...prev, newLang]);
      setNewLanguageCode('');
      setNewLanguageName('');
      setShowLanguageDropdown(false);

      // Add to enabled languages in settings
      const addToEnabledLanguages = async () => {
        try {
          const settings = await getSettings();
          const enabledLanguages = settings.enabledLanguages || [];
          if (!enabledLanguages.includes(newLang.code)) {
            const updatedSettings = {
              ...settings,
              enabledLanguages: [...enabledLanguages, newLang.code]
            };
            await import('../utils/storage').then(({ saveSettings }) => saveSettings(updatedSettings));
          }
        } catch (error) {
          console.error('Error adding language to settings:', error);
        }
      };
      addToEnabledLanguages();
    }
  };

  const handleSaveNote = async (includeGps: boolean, tags: string[]) => {
    if (!recordingCurrentNote.polishedNote.trim()) {
      Alert.alert('Error', 'No content to save');
      return;
    }

    try {
      let location = undefined;
      if (includeGps) {
        location = await getCurrentLocation();
      }

      const note: Note = {
        id: generateNoteId(),
        title: noteTitle || `Note ${new Date().toLocaleDateString()}`,
        text: recordingCurrentNote.polishedNote,
        timestamp: new Date().toISOString(),
        tags: tags,
        translations: Object.keys(multipleTranslations).length > 0 ?
          Object.fromEntries(Object.entries(multipleTranslations).map(([k, v]) => [k, v.text])) : {},
        location: location || undefined,
        attachedMedia: attachedMedia,
        noteType: recordingCurrentNote.signImageUrl ? 'sign_translation' : recordingCurrentNote.audioUri ? 'voice_recording' : 'text_note',
        // Audio URI is now stored in attachedMedia array
      };

      onSaveNote(note);

      // Reset form
      setRecordingViewMode('actions');
      setRecordingCurrentNote({ rawTranscription: '', polishedNote: '', signImageUrl: undefined, audioUri: undefined });
      setNoteTitle('');
      setTypedText('');
      setTranslatedText(null);
      setMultipleTranslations({});
      setTags([]);
      setAttachedMedia([]);

      Alert.alert('Success', 'Note saved successfully!');
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const handleAddTag = (tag: string) => {
    const newTag = tag.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags(prev => [...prev, newTag]);
    }
    setTagInput('');
  };

  const handleCancelTranslation = () => {
    setIsProcessing(false);
  };

  const speakTranslation = async () => {
    try {
      console.log('=== SPEAKING CURRENT TRANSLATION ===');
      if (!translatedText || !translatedText.text) {
        Alert.alert('Error', 'No translation text to speak');
        return;
      }

      // Get the language for the current translation
      const currentLang = targetLanguage;
      console.log('Speaking translation in language:', currentLang);

      // Get appropriate voice for the language
      const voice = getVoiceForLanguage(currentLang);

      // Generate audio using Google Cloud TTS
      const { audioData, contentType } = await speakTextWithGoogleTTS(translatedText.text, currentLang, voice);

      // For now, show a success message (in a real implementation, you'd play the audio)
      Alert.alert('TTS Success', `Audio generated for ${currentLang} using Google Cloud TTS`);

    } catch (error) {
      console.error('Error speaking translation:', error);
      Alert.alert('Error', 'Failed to generate speech for translation');
    }
  };

  const speakTranslationForLang = async (langCode: string) => {
    try {
      console.log('=== SPEAKING TRANSLATION FOR LANGUAGE ===', langCode);
      const translation = multipleTranslations[langCode];

      if (!translation || !translation.text) {
        Alert.alert('Error', 'No translation text to speak');
        return;
      }

      console.log('Speaking translation in language:', langCode);

      // Get appropriate voice for the language
      const voice = getVoiceForLanguage(langCode);

      // Generate audio using Google Cloud TTS
      const { audioData, contentType } = await speakTextWithGoogleTTS(translation.text, langCode, voice);

      // For now, show a success message (in a real implementation, you'd play the audio)
      Alert.alert('TTS Success', `Audio generated for ${langCode} using Google Cloud TTS`);

    } catch (error) {
      console.error('Error speaking translation for language:', error);
      Alert.alert('Error', 'Failed to generate speech for translation');
    }
  };

  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number; accuracy?: number } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };


  // Render the appropriate view based on recordingViewMode
  const renderCurrentView = () => {
    if (isRecording || recordingViewMode === 'recording') {
      return (
        <RecordingView
          recordingText={recordingCurrentNote.rawTranscription}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          onStopRecording={handleStopRecording}
          onStartRecording={handleVoiceRecording}
          onPauseRecording={handlePauseRecording}
          onResumeRecording={handleResumeRecording}
          recording={recording}
          attachedMedia={attachedMedia}
          setAttachedMedia={setAttachedMedia}
        />
      );
    }

    if (recordingViewMode === 'actions') {
      return (
        <ActionsView
          onSignTranslation={handleSignTranslation}
          onVoiceRecording={handleVoiceRecording}
          onTextInput={handleTextInput}
          onHome={() => setCurrentScreen('landing')}
          onNotes={() => setCurrentScreen('notes')}
          onManageNotes={() => setCurrentScreen('manageNotes')}
          onSettings={() => setCurrentScreen('settings')}
          onCredits={() => setCurrentScreen('credits')}
          onFunTools={() => setCurrentScreen('fun')}
          isProcessing={isProcessingGlobal}
        />
      );
    }

    if (recordingViewMode === 'typing') {
      return (
        <TypingView
          typedText={typedText}
          setTypedText={setTypedText}
          onDone={() => {
            if (!typedText.trim()) {
              Alert.alert('Error', 'Note content cannot be empty.');
              return;
            }
            const newTitle = typedText.split(' ').slice(0, 5).join(' ');
            setNoteTitle(newTitle);
            setRecordingCurrentNote({ rawTranscription: typedText, polishedNote: typedText, signImageUrl: undefined, audioUri: undefined });
            setRecordingViewMode('tabs');
            setActiveRecordingTab('polished');
          }}
          onCancel={() => setRecordingViewMode('actions')}
          attachedMedia={attachedMedia}
          setAttachedMedia={setAttachedMedia}
        />
      );
    }

    if (recordingViewMode === 'tabs') {
      return (
        <TabsView
          recordingViewMode={recordingViewMode}
          setRecordingViewMode={(mode: string) => setRecordingViewMode(mode as 'actions' | 'recording' | 'typing' | 'tabs')}
          activeRecordingTab={activeRecordingTab}
          setActiveRecordingTab={(tab: string) => setActiveRecordingTab(tab as 'polished' | 'original' | 'translate')}
          recordingCurrentNote={recordingCurrentNote}
          setRecordingCurrentNote={(note) => setRecordingCurrentNote(note)}
          targetLanguage={targetLanguage}
          setTargetLanguage={setTargetLanguage}
          availableLanguages={availableLanguages}
          showLanguageDropdown={showLanguageDropdown}
          setShowLanguageDropdown={setShowLanguageDropdown}
          newLanguageCode={newLanguageCode}
          setNewLanguageCode={setNewLanguageCode}
          newLanguageName={newLanguageName}
          setNewLanguageName={setNewLanguageName}
          translatedText={translatedText}
          multipleTranslations={multipleTranslations}
          isProcessing={isProcessing}
          onTranslate={handleTranslate}
          onAddLanguage={handleAddLanguage}
          onSpeakTranslation={speakTranslation}
          onSpeakTranslationForLang={speakTranslationForLang}
          onSaveNote={handleSaveNote}
          onCancel={() => {
            setRecordingViewMode('actions');
            setActiveRecordingTab('polished');
          }}
          tags={tags}
          setTags={setTags}
          tagInput={tagInput}
          setTagInput={setTagInput}
          onAddTag={handleAddTag}
          onShowTagInfo={() => {}} // TODO: Implement tag info
          onCancelTranslation={handleCancelTranslation}
        />
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Credits display in top right */}
      <View style={styles.creditsDisplay}>
        <Text style={styles.creditsText}>{credits}c</Text>
      </View>
      {renderCurrentView()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  creditsDisplay: {
    position: 'absolute' as const,
    top: 10,
    right: 20,
    backgroundColor: '#f59e0b',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 1000,
  },
  creditsText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
});