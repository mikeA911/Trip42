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
  Image,
  Platform
} from 'react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { translateTextWithGemini, translateSignWithGemini, transcribeAudioWithGemini, polishNoteWithGemini } from '../services/geminiService';
import { speakTextWithGoogleTTS, getVoiceForLanguage } from '../services/googleTTSService';
import { Note, generateNoteId } from '../utils/storage';
import { saveMediaForNote } from '../media-storage/MediaStorage';
import { getOrCreateSettings, saveSettings } from '../utils/settings';
import { deductCredits, CREDIT_PRICING, getCredits, checkCreditsAndNotify } from '../utils/credits';
import { LANGUAGES } from './SettingsPage';
import ActionsView from './record/ActionsView';
import RecordingView from './record/RecordingView';
import TypingView from './record/TypingView';
import TabsView from './record/TabsView';
import { useToast } from '../contexts/ToastContext';

type AppScreen = 'landing' | 'notes' | 'record' | 'settings' | 'credits' | 'link' | 'upload' | 'fun' | 'map' | 'medicine' | 'calculator' | 'currency' | 'tetris' | 'profile';

interface RecordTranslateProps {
  onSaveNote: (note: Note) => void;
  setCurrentScreen: (screen: any) => void;
  aiTheme: string;
}

export const RecordTranslate: React.FC<RecordTranslateProps> = ({ onSaveNote, setCurrentScreen, aiTheme }) => {
  const { showSuccess, showError } = useToast();
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
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [newLanguageCode, setNewLanguageCode] = useState('');
  const [newLanguageName, setNewLanguageName] = useState('');
  const [translatedText, setTranslatedText] = useState<{ text: string; phonetic?: string } | null>(null);
  const [multipleTranslations, setMultipleTranslations] = useState<{ [key: string]: { text: string; phonetic?: string } }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);

  // Other states
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<string[]>([]);
  const [savedNotes, setSavedNotes] = useState<any[]>([]);
  const [deviceId] = useState('device-123'); // Mock device ID
  const [credits, setCredits] = useState(0);
  const [activeTab, setActiveTab] = useState('record'); // Mock active tab
  const [isProcessingGlobal, setIsProcessingGlobal] = useState(false);
  const [tempNoteId, setTempNoteId] = useState<string>(''); // Temporary note ID for media storage

  // Load credits on component mount
  useEffect(() => {
    const loadCredits = async () => {
      try {
        const creditsData = await getCredits();
        setCredits(creditsData.balance);
      } catch (error) {
        // Error loading credits - continue without credits display
      }
    };
    loadCredits();
  }, []);

  // Load and filter available languages based on enabled languages from settings
  useEffect(() => {
    const loadAvailableLanguages = async () => {
      try {
        const settings = await getOrCreateSettings();
        const enabled = settings.enabledLanguages || [];
        if (enabled.length > 0) {
          const filtered = LANGUAGES.filter(lang => enabled.includes(lang.code));
          setAvailableLanguages(filtered);
        } else {
          setAvailableLanguages(LANGUAGES);
        }
      } catch (error) {
        setAvailableLanguages(LANGUAGES);
      }
    };
    loadAvailableLanguages();
  }, []);

  const recordingRef = useRef<Audio.Recording | null>(null);

  const handleAutoSaveSignTranslation = async (currentMedia?: string[]) => {
    // Auto-save sign translation notes for better UX
    console.log('DEBUG: handleAutoSaveSignTranslation called');
    console.log('DEBUG: polishedNote:', recordingCurrentNote.polishedNote);
    console.log('DEBUG: tempNoteId:', tempNoteId);
    console.log('DEBUG: currentMedia:', currentMedia);
    console.log('DEBUG: attachedMedia:', attachedMedia);
    
    if (!recordingCurrentNote.polishedNote.trim()) {
      console.log('DEBUG: No polished note to save, skipping auto-save');
      Alert.alert('ERROR in auto-save', 'No polished note content to save');
      return;
    }

    try {
      console.log('DEBUG: Creating note object for auto-save');
      const note: Note = {
        id: tempNoteId,
        title: `Sign Translation - ${new Date().toLocaleDateString()}`,
        text: recordingCurrentNote.polishedNote,
        timestamp: new Date().toISOString(),
        tags: ['sign-translation'],
        translations: {},
        attachedMedia: currentMedia || attachedMedia,
        noteType: 'sign_translation',
      };

      console.log('DEBUG: Note object created:', JSON.stringify(note, null, 2));
      console.log('DEBUG: Calling onSaveNote...');
      Alert.alert('Step 5.5', `About to call onSaveNote with note ID: ${tempNoteId.substring(0, 10)}...`);
      await onSaveNote(note);
      console.log('DEBUG: onSaveNote completed successfully');
      Alert.alert('Step 6', 'onSaveNote completed successfully!');
    } catch (error) {
      console.error('DEBUG: Auto-save failed with error:', error);
      console.error('DEBUG: Error details:', JSON.stringify(error, null, 2));
      // Show error to user so they know what went wrong
      Alert.alert('ERROR in onSaveNote', `Failed to save sign translation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handler functions for the new component structure
  const handleSignTranslation = async () => {
    try {
      console.log('DEBUG: handleSignTranslation started');

      // Check if we're running in a PWA or web environment - do this FIRST
      const isWebPlatform = Platform.OS === 'web';

      if (isWebPlatform) {
        console.log('DEBUG: Using web platform flow');
        window.alert('INIT: Sign translation starting (web mode)');
        // For web, we need to trigger file input IMMEDIATELY during user gesture
        // Do credits/ID generation after file is selected
        await handleWebSignTranslationWithEarlyInput();
        return;
      }

      // Native path continues with original flow
      window.alert('INIT: Sign translation started');

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

      

      console.log('DEBUG: Credits deducted successfully');

      // Generate the note ID BEFORE checking platform (needed for both web and native)
      const noteId = generateNoteId();
      setTempNoteId(noteId);
      console.log('DEBUG: Generated note ID:', noteId);
      Alert.alert('INIT', `Ready! Note ID: ${noteId.substring(0, 10)}...`);

      

      console.log('DEBUG: Using native platform flow');

      // Original native logic for iOS/Android
      // Request camera permissions
      console.log('DEBUG: Requesting camera permissions');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        console.log('DEBUG: Camera permission denied');
        Alert.alert('Permission needed', 'Camera permission is required for sign translation');
        return;
      }

      console.log('DEBUG: Camera permission granted');

      setIsProcessing(true);
      setProcessingMessage('Marvin is analyzing...');

      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5,
        base64: true,
      });

      

      if (!result.canceled && result.assets[0]) {
        console.log('DEBUG: Image captured');
        Alert.alert('Step 1', 'Image captured');
        const base64Image = result.assets[0].base64;
        if (base64Image) {
          console.log('DEBUG: Calling translateSignWithGemini');
          const translationResult = await translateSignWithGemini(base64Image, targetLanguage);

          console.log('DEBUG: Translation result received');
          Alert.alert('Step 2', `Translated: ${translationResult.translation.substring(0, 50)}...`);

          // Set the translated text and move to tabs for editing
          console.log('DEBUG: Setting recording current note state');
          setRecordingCurrentNote({
            rawTranscription: translationResult.translation,
            polishedNote: translationResult.translation,
            signImageUrl: result.assets[0].uri,
            audioUri: undefined
          });

          console.log('DEBUG: Note state set, preparing to save image');
          Alert.alert('Step 3', `Note state set. NoteID: ${noteId.substring(0, 10)}... Starting image save...`);

          // Save the sign image using new media storage
          try {
            console.log('DEBUG: Starting image save process');
            const file = result.assets[0];
            console.log('DEBUG: Fetching blob from uri:', file.uri);
            const blob = await fetch(file.uri).then(r => r.blob());
            console.log('DEBUG: Blob fetched, creating File object');
            const fileObj = new File([blob], file.fileName || 'sign.jpg', { type: file.type || 'image/jpeg' });

            console.log('DEBUG: Calling saveMediaForNote with noteId:', noteId);
            const saveResult = await saveMediaForNote(noteId, fileObj, file.fileName || 'sign.jpg');
            console.log('DEBUG: saveMediaForNote result:', saveResult);
            const { path } = saveResult as { path: string; thumbPath?: string };

            console.log('DEBUG: Setting attached media to:', path);
            setAttachedMedia([path]);
            Alert.alert('Step 4', `Image saved at: ${path.substring(0, 40)}...`);

            setRecordingViewMode('tabs');
            setActiveRecordingTab('polished');

            console.log('DEBUG: Starting auto-save...');
            Alert.alert('Step 5', 'Calling handleAutoSaveSignTranslation...');

            // Auto-save sign translation notes immediately for better UX
            await handleAutoSaveSignTranslation([path]);
            Alert.alert('Success!', 'Note saved successfully!');
          } catch (error) {
            console.error('DEBUG: Failed to save sign image:', error);
            console.error('DEBUG: Error details:', JSON.stringify(error, null, 2));
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            Alert.alert('ERROR at image save', `Failed to save image: ${errorMsg}. Please try again.`);
            setIsProcessing(false);
            setProcessingMessage('');
            return; // Don't proceed with translation if file saving fails
          }
          // Note: Auto-save success message removed since it's misleading when save fails
        } else {
          console.log('DEBUG: No base64 image available');
          Alert.alert('ERROR', 'No base64 image data');
        }
      } else {
        console.log('DEBUG: Image picker was cancelled');
      }
    } catch (error) {
      console.error('DEBUG: Sign translation failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      showError(`Sign translation failed: ${errorMsg}`);
      Alert.alert('Error', `Failed to process sign translation: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  const handleWebSignTranslationWithEarlyInput = async () => {
    return new Promise<void>((resolve, reject) => {
      console.log('DEBUG: handleWebSignTranslationWithEarlyInput called');

      // Create file input IMMEDIATELY while in user gesture context
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment');

      console.log('DEBUG: File input element created');

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          console.log('DEBUG: Web file selected');
          window.alert('WEB Step 1: Image file selected, checking credits...');
          
          // NOW check credits AFTER file is selected
          try {
            const hasCredits = await checkCreditsAndNotify(CREDIT_PRICING.SIGN_TRANSLATION, 'Sign Language Translation');
            if (!hasCredits) {
              window.alert('ERROR: Insufficient credits');
              resolve();
              return;
            }

            // Deduct credits
            const creditDeducted = await deductCredits(CREDIT_PRICING.SIGN_TRANSLATION, 'Sign Language Translation');
            if (!creditDeducted) {
              window.alert('ERROR: Failed to process credits');
              resolve();
              return;
            }

            window.alert('WEB Step 2: Credits deducted, generating note ID...');

            // Generate note ID
            const noteId = generateNoteId();
            setTempNoteId(noteId);
            console.log('DEBUG: Generated note ID:', noteId);

            window.alert(`WEB Step 3: Note ID: ${noteId.substring(0, 10)}...`);
            
          } catch (error) {
            window.alert(`ERROR in credits/ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
            resolve();
            return;
          }

          setIsProcessing(true);
          setProcessingMessage('Marvin is analyzing...');

          try {
            console.log('DEBUG: Converting file to base64');
            // Convert file to base64 data URL for React Native compatibility
            const reader = new FileReader();
            reader.onload = async (e) => {
              const result = e.target?.result as string;
              
              // Extract base64 data (remove data:image/jpeg;base64, prefix if present)
              const base64Data = result.split(',')[1] || result;

              console.log('DEBUG: Calling translateSignWithGemini');
              const translationResult = await translateSignWithGemini(base64Data, targetLanguage);

              console.log('DEBUG: Translation result:', translationResult);
              window.alert(`WEB Step 4: Translated: ${translationResult.translation.substring(0, 50)}...`);
              

              // For web/PWA, save using new media storage
              let savedWebImageUri: string;
              try {
                console.log('DEBUG: Saving web image with tempNoteId:', tempNoteId);
                window.alert(`WEB Step 5: Saving image with ID: ${tempNoteId.substring(0, 10)}...`);
                const response = await fetch(result);
                const blob = await response.blob();
                const file = new File([blob], `sign_${Date.now()}.jpg`, { type: 'image/jpeg' });

                const saveResult = await saveMediaForNote(tempNoteId, file, file.name);
                const { path } = saveResult as { path: string; thumbPath?: string };

                savedWebImageUri = path;
                console.log('DEBUG: Web image saved successfully at:', savedWebImageUri);
                window.alert(`WEB Step 6: Image saved at: ${savedWebImageUri.substring(0, 40)}...`);
              } catch (saveError) {
                console.error('DEBUG: Failed to save web image:', saveError);
                console.error('DEBUG: Save error details:', JSON.stringify(saveError, null, 2));
                window.alert(`ERROR at web image save: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
                return; // Don't proceed with translation if file saving fails
              }

              // Set the translated text and move to tabs for editing
              setRecordingCurrentNote({
                rawTranscription: translationResult.translation,
                polishedNote: translationResult.translation,
                signImageUrl: savedWebImageUri,
                audioUri: undefined
              });

              console.log('DEBUG: Setting recording current note');
              window.alert('WEB Step 7: Note state set, calling auto-save...');

              // Add the file URI to attached media
              setAttachedMedia([savedWebImageUri]);
              console.log('DEBUG: Attached media set to:', [savedWebImageUri]);

              setRecordingViewMode('tabs');
              setActiveRecordingTab('polished');

              console.log('DEBUG: Calling handleAutoSaveSignTranslation');

              // Auto-save sign translation notes immediately for better UX
              await handleAutoSaveSignTranslation([savedWebImageUri]);
              window.alert('WEB Success: Note saved successfully!');
            };
            reader.readAsDataURL(file);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('DEBUG: Outer catch error:', error);
            window.alert(`ERROR in web processing outer: ${errorMsg}`);
          } finally {
            setIsProcessing(false);
            setProcessingMessage('');
          }
        } else {
          console.log('DEBUG: No file selected');
          window.alert('WEB: No file selected - user cancelled');
        }
        resolve();
      };

      // Trigger input click IMMEDIATELY while still in user gesture
      console.log('DEBUG: Triggering input.click()');
      input.click();
      console.log('DEBUG: input.click() called - file picker should open');
    });
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

    // Generate the final note ID for media storage
    const noteId = generateNoteId();
    setTempNoteId(noteId);

    // Start recording immediately
    setRecordingViewMode('recording');
    setIsRecording(true);
    // Start the actual recording
    await handleStartRecording();
  };

  const handleStartRecording = async () => {
    try {
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
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const handleTextInput = () => {
    // Generate the final note ID for media storage (will be used when saving)
    const noteId = generateNoteId();
    setTempNoteId(noteId);
    setRecordingViewMode('typing');
  };

  const handleStopRecording = async () => {
    try {
      if (!recordingRef.current) {
        return;
      }

      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      let uri = recordingRef.current.getURI();

      if (uri) {

        setIsTranscribing(true);
        setIsProcessingRecording(true);
        setProcessingMessage('Transcribing audio...');

        try {
          // Transcribe the audio
          const transcribedText = await transcribeAudioWithGemini(uri);

          if (!transcribedText || transcribedText.trim() === '') {
            throw new Error('Transcription returned empty result');
          }

          setProcessingMessage('Polishing transcription...');

          // Polish the transcription
          const polished = await polishNoteWithGemini(transcribedText);

          if (!polished.polishedNote || polished.polishedNote.trim() === '') {
            throw new Error('Polishing returned empty result');
          }

          setRecordingCurrentNote({
            rawTranscription: transcribedText,
            polishedNote: polished.polishedNote,
            signImageUrl: undefined,
            audioUri: uri
          });

          // Save audio using new media storage
          try {
            
            const response = await fetch(uri!);
            const blob = await response.blob();
            const file = new File([blob], `recording_${Date.now()}.m4a`, { type: 'audio/m4a' });

            const saveResult = await saveMediaForNote(tempNoteId, file, file.name);
            const { path } = saveResult as { path: string; thumbPath?: string };

            setAttachedMedia(prev => [...prev, path]);
          } catch (error) {
            console.error('Failed to save audio file:', error);
            Alert.alert('Error', 'Failed to save audio file. Please try recording again.');
            // Reset to recording view so user can try again
            setRecordingViewMode('recording');
            return;
          }

          setRecordingViewMode('tabs');
          setActiveRecordingTab('polished');

        } catch (processingError) {
          Alert.alert('Processing Error', `Failed to process recording: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`);
          // Reset to recording view so user can try again
          setRecordingViewMode('recording');
        }
      } else {
        Alert.alert('Error', 'No recording data found');
        setRecordingViewMode('recording');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
      setRecordingViewMode('recording');
    } finally {
      setIsTranscribing(false);
      setIsProcessingRecording(false);
      setProcessingMessage('');
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
          const settings = await getOrCreateSettings();
          const enabledLanguages = settings.enabledLanguages || [];
          if (!enabledLanguages.includes(newLang.code)) {
            const updatedSettings = {
              ...settings,
              enabledLanguages: [...enabledLanguages, newLang.code]
            };
            await saveSettings(updatedSettings);
          }
        } catch (error) {
          console.error("Failed to add language to settings:", error);
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

      
      // Use attached media URIs directly (files are saved locally)
      const processedMedia = attachedMedia;

      
      const note: Note = {
        id: tempNoteId, // Use the ID that was used for media storage
        title: noteTitle || `Note ${new Date().toLocaleDateString()}`,
        text: recordingCurrentNote.polishedNote,
        timestamp: new Date().toISOString(),
        tags: tags,
        translations: Object.keys(multipleTranslations).length > 0 ?
          Object.fromEntries(Object.entries(multipleTranslations).map(([k, v]) => [k, v.text])) : {},
        location: location || undefined,
        attachedMedia: processedMedia,
        noteType: recordingCurrentNote.signImageUrl ? 'sign_translation' : recordingCurrentNote.audioUri ? 'voice_recording' : 'text_note',
        originalText: recordingCurrentNote.rawTranscription,
        // Audio URI is now stored in attachedMedia array
      };


      
      await onSaveNote(note);
      

      
      // Reset form
      setRecordingViewMode('actions');
      setRecordingCurrentNote({ rawTranscription: '', polishedNote: '', signImageUrl: undefined, audioUri: undefined });
      setNoteTitle('');
      setTypedText('');
      setTranslatedText(null);
      setMultipleTranslations({});
      setTags([]);
      setAttachedMedia([]);

    } catch (error) {
      console.error('Error in handleSaveNote:', error);
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
      if (!translatedText || !translatedText.text) {
        Alert.alert('Error', 'No translation text to speak');
        return;
      }

      // Get the language for the current translation
      const currentLang = targetLanguage;

      // Get appropriate voice for the language
      const voice = getVoiceForLanguage(currentLang);

      // Generate audio using Google Cloud TTS
      const { audioData, contentType } = await speakTextWithGoogleTTS(translatedText.text, currentLang, voice);

      // For now, audio generation is complete (in a real implementation, you'd play the audio)

    } catch (error) {
      Alert.alert('Error', 'Failed to generate speech for translation');
    }
  };

  const speakTranslationForLang = async (langCode: string) => {
    try {
      const translation = multipleTranslations[langCode];

      if (!translation || !translation.text) {
        Alert.alert('Error', 'No translation text to speak');
        return;
      }

      // Get appropriate voice for the language
      const voice = getVoiceForLanguage(langCode);

      // Generate audio using Google Cloud TTS
      const { audioData, contentType } = await speakTextWithGoogleTTS(translation.text, langCode, voice);

      // For now, audio generation is complete (in a real implementation, you'd play the audio)

    } catch (error) {
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
          isProcessingRecording={isProcessingRecording}
          onStopRecording={handleStopRecording}
          onStartRecording={handleVoiceRecording}
          onPauseRecording={handlePauseRecording}
          onResumeRecording={handleResumeRecording}
          recording={recording}
          attachedMedia={attachedMedia}
          setAttachedMedia={setAttachedMedia}
          noteId={tempNoteId}
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
          noteId={tempNoteId}
          onMediaChange={(paths: string[]) => setAttachedMedia(paths)}
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
          attachedMedia={attachedMedia}
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
