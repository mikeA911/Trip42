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
import { deductCredits, CREDIT_PRICING, getCredits } from '../utils/credits';
import ActionsView from './record/ActionsView';
import RecordingView from './record/RecordingView';
import TypingView from './record/TypingView';
import TabsView from './record/TabsView';

type AppScreen = 'landing' | 'notes' | 'record' | 'settings' | 'credits' | 'link' | 'upload' | 'fun' | 'map' | 'medicine' | 'calculator' | 'currency' | 'tetris' | 'profile';

interface RecordTranslateProps {
  onSaveNote: (note: Note) => void;
  setCurrentScreen: (screen: any) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English', phonetic: false },
  { code: 'lo', name: 'Lao', phonetic: true },
  { code: 'km', name: 'Khmer', phonetic: true },
  { code: 'th', name: 'Thai', phonetic: true },
  { code: 'vi', name: 'Vietnamese', phonetic: true },
  { code: 'fil', name: 'Filipino', phonetic: true },
  { code: 'zh', name: 'Chinese', phonetic: true },
  { code: 'ja', name: 'Japanese', phonetic: true },
  { code: 'ko', name: 'Korean', phonetic: true },
];

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
  const [availableLanguages, setAvailableLanguages] = useState([
    { code: 'en', name: 'English', phonetic: false },
    { code: 'lo', name: 'Lao', phonetic: true },
    { code: 'km', name: 'Khmer', phonetic: true },
    { code: 'th', name: 'Thai', phonetic: true },
    { code: 'vi', name: 'Vietnamese', phonetic: true },
    { code: 'fil', name: 'Filipino', phonetic: true },
    { code: 'zh', name: 'Chinese', phonetic: true },
    { code: 'ja', name: 'Japanese', phonetic: true },
    { code: 'ko', name: 'Korean', phonetic: true },
  ]);

  // Load user preferred language from settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        setTargetLanguage(settings.uiLanguage || 'en');
      } catch (error) {
        console.error('Error loading settings:', error);
        setTargetLanguage('en');
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
      // Check and deduct credits for sign translation
      const creditDeducted = await deductCredits(CREDIT_PRICING.SIGN_TRANSLATION, 'Sign Language Translation');
      if (!creditDeducted) {
        return; // Stop if credit deduction failed
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
    // Check and deduct credits for voice recording
    const creditDeducted = await deductCredits(CREDIT_PRICING.VOICE_RECORDING, 'Voice Recording + AI Processing');
    if (!creditDeducted) {
      return; // Stop if credit deduction failed
    }

    // Start recording immediately
    setRecordingViewMode('recording');
    // The RecordingView component will handle starting the actual recording
  };

  const handleTextInput = () => {
    setRecordingViewMode('typing');
  };

  const handleStopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (uri) {
        setIsTranscribing(true);
        // Transcribe the audio
        const transcribedText = await transcribeAudioWithGemini(uri);

        // Polish the transcription
        const polished = await polishNoteWithGemini(transcribedText);

        setRecordingCurrentNote({
          rawTranscription: transcribedText,
          polishedNote: polished.polishedNote,
          signImageUrl: undefined,
          audioUri: uri
        });

        setRecordingViewMode('tabs');
        setActiveRecordingTab('polished');
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process recording');
    } finally {
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

    // Check and deduct credits for text translation
    const creditDeducted = await deductCredits(CREDIT_PRICING.TEXT_TRANSLATION, 'Text Translation');
    if (!creditDeducted) {
      return; // Stop if credit deduction failed
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
        phonetic: true
      };
      setAvailableLanguages(prev => [...prev, newLang]);
      setNewLanguageCode('');
      setNewLanguageName('');
      setShowLanguageDropdown(false);
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