import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Image, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';

import { translateTextWithGemini, transcribeAudioWithGemini } from '../services/geminiService';
import { useNotes } from '../hooks/useNotes';
import { Note, generateNoteId } from '../utils/storage';
import { deductCredits, CREDIT_PRICING, checkCreditsAndNotify } from '../utils/credits';
import { useToast } from '../contexts/ToastContext';
import { getPrompt, getCharacterForPromptType } from '../services/promptService';

interface ChatbotModalProps {
  visible: boolean;
  onClose: () => void;
  systemPrompt?: string;
  chatbotName?: string;
  chatbotAvatar?: any;
  theme?: string;
  initialMode?: string;
}

type ChatbotMode = string;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const CHATBOT_PROMPTS = {
  arthur: `You are Artur Bent, Trip42 guide and companion. Help the user understand and master the app. Be patient, clear, and occasionally witty.`,
  zaphod: `You are Zaphod Babblefish, the Quick Note Handler. Turn messy user input into a polished, coherent note in strict JSON format: {"title": "Short Title", "text": "Polished note", "tags": ["tag1"], "commentary": "Optional sassy comment"}.`,
  ford: `You are Ford Pretext, a companion for BORED mode. Chat with the user. Share stories, ask about their journey, and make them laugh. Be conversational and natural.`
};

export const ChatbotModal: React.FC<ChatbotModalProps> = ({
  visible,
  onClose,
  systemPrompt,
  chatbotName,
  chatbotAvatar,
  theme = 'h2g2',
  initialMode
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [pendingZaphodNote, setPendingZaphodNote] = useState<Note | null>(null);
  const [showChatSaveButtons, setShowChatSaveButtons] = useState(false);
  const { addNote } = useNotes();
  const { showError, showSuccess } = useToast();

  const [themeCharacters, setThemeCharacters] = useState<Array<{ character?: string; avatar?: string; promptType?: string }>>([]);
  const [currentMode, setCurrentMode] = useState<string>('arthur');
  const [currentPromptType, setCurrentPromptType] = useState<string>('chatbotFaq');
  const { notes } = useNotes();

  const fallbackMappings: { [theme: string]: Array<{ character?: string; avatar?: string; promptType?: string }> } = {
    'h2g2': [
      { character: 'Arthur', avatar: 'arturBent.png', promptType: 'chatbotFaq' },
      { character: 'Zaphod', avatar: 'zaphodBabblefish.png', promptType: 'chatbotQuickNote' },
      { character: 'Ford', avatar: 'fordPretext.png', promptType: 'chatbotBored' }
    ],
    'QT-GR': [
      { character: 'Jules', avatar: 'jules.png', promptType: 'chatbotFaq' },
      { character: 'Mia', avatar: 'mia.png', promptType: 'chatbotQuickNote' },
      { character: 'Vincent', avatar: 'vincent.png', promptType: 'chatbotBored' }
    ],
    'TP': [
      { character: 'Colon', avatar: 'colon.png', promptType: 'chatbotFaq' },
      { character: 'Nobbs', avatar: 'nobbs.png', promptType: 'chatbotQuickNote' },
      { character: 'Vimes', avatar: 'vimes.png', promptType: 'chatbotBored' }
    ]
  };

  useEffect(() => {
    const characters = fallbackMappings[theme] || fallbackMappings['h2g2'];
    setThemeCharacters(characters);

    let mode = initialMode;
    let promptType = 'chatbotFaq';
    if (mode) {
        const char = characters.find(c => c.promptType === mode);
        if (char) {
            mode = char.character?.toLowerCase();
            promptType = char.promptType || 'chatbotFaq';
        } else {
            promptType = mode;
        }
    }

    // If chatbotName is provided (e.g., from MapTool), use it as the mode
    if (chatbotName) {
        setCurrentMode(chatbotName.toLowerCase());
        setCurrentPromptType(initialMode || 'chatbotFaq');
        return;
    }

    setCurrentMode(mode || characters[0]?.character?.toLowerCase() || 'arthur');
    setCurrentPromptType(promptType);

  }, [theme, initialMode, chatbotName]);

  const getAvatar = (characterName: string) => {
    const character = themeCharacters.find(char => char.character?.toLowerCase() === characterName.toLowerCase());
    const avatarMap: { [key: string]: any } = {
      'arturBent.png': require('../public/icons/arturBent.png'),
      'zaphodBabblefish.png': require('../public/icons/zaphodBabblefish.png'),
      'fordPretext.png': require('../public/icons/fordPretext.png'),
      'jules.png': require('../public/icons/jules.png'),
      'mia.png': require('../public/icons/mia.png'),
      'vincent.png': require('../public/icons/vincent.png'),
      'colon.png': require('../public/icons/colon.png'),
      'nobbs.png': require('../public/icons/nobbs.png'),
      'vimes.png': require('../public/icons/vimes.png'),
    };
    return character?.avatar ? avatarMap[character.avatar] : require('../public/icons/HitchTrip.png');
  };

  const getModeTitle = (characterName: string) => {
    const character = themeCharacters.find(char => char.character?.toLowerCase() === characterName.toLowerCase());
    return character?.character || characterName;
  };

  const getCurrentAvatar = () => getAvatar(currentMode);
  const getCurrentTitle = () => getModeTitle(currentMode);

  useEffect(() => {
    if (visible && messages.length === 0) {
      const loadGreeting = async () => {
        const greeting = await getInitialGreeting(currentMode);
        setMessages([{ id: '1', text: greeting, isUser: false, timestamp: new Date() }]);
      };
      loadGreeting();
    }
  }, [visible, currentMode]);

  const getInitialGreeting = async (mode: ChatbotMode): Promise<string> => {
    const character = themeCharacters.find(c => c.character?.toLowerCase() === mode);
    const promptType = character?.promptType;
    try {
      const characterData = await getCharacterForPromptType(theme, promptType as any);
      if (characterData.initialGreeting) {
        return characterData.initialGreeting;
      }
    } catch (error) {
      console.log('⚠️ Could not load character greeting, using fallback');
    }
    // Generic fallback if no initialGreeting in table
    return `Hello! I'm ${character?.character || mode}. How can I help you?`;
  };
  
  const getRecentNotesContext = (promptType: string): string => {
    if (promptType === 'chatbotBored') {
      // Collect last 7 notes: original text, location, tags
      const sortedNotes = notes
        .filter(note => note.timestamp)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 7);

      if (sortedNotes.length === 0) return '';

      const context = sortedNotes.map(note => {
        const locationStr = note.location
          ? `Location: ${note.location.latitude.toFixed(4)}, ${note.location.longitude.toFixed(4)}`
          : 'Location: Not available';
        const tagsStr = note.tags.length > 0 ? `Tags: ${note.tags.join(', ')}` : 'Tags: None';
        const originalText = note.originalText || note.text;
        return `Note: ${originalText}\n${locationStr}\n${tagsStr}`;
      }).join('\n\n');

      return `\n\nRecent Notes Context:\n${context}\n\n`;
    } else if (promptType === 'chatbotFaq') {
      // Collect last 7 notes with tag = FAQ: chat conversation, location, tags
      const faqNotes = notes
        .filter(note => note.tags.includes('FAQ') && note.timestamp)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 7);

      if (faqNotes.length === 0) return '';

      const context = faqNotes.map(note => {
        const locationStr = note.location
          ? `Location: ${note.location.latitude.toFixed(4)}, ${note.location.longitude.toFixed(4)}`
          : 'Location: Not available';
        const tagsStr = note.tags.length > 0 ? `Tags: ${note.tags.join(', ')}` : 'Tags: None';
        return `FAQ Chat: ${note.text}\n${locationStr}\n${tagsStr}`;
      }).join('\n\n');

      return `\n\nRecent FAQ Chats Context:\n${context}\n\n`;
    }
    return '';
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    const userMessage: Message = { id: Date.now().toString(), text: inputText, isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const currentCharacter = themeCharacters.find(char => char.character?.toLowerCase() === currentMode.toLowerCase());
      const promptType = currentCharacter?.promptType;
      let response: string;

      if (promptType === 'chatbotQuickNote') {
        const prompt = `${CHATBOT_PROMPTS.zaphod}\n\nUser input: "${inputText}"`;
        const aiResponse = await translateTextWithGemini(prompt, 'en', 'en', undefined, prompt);
        let cleanResponse = aiResponse.text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const parsedResponse = JSON.parse(cleanResponse);
        const newNote: Note = {
          id: generateNoteId(),
          title: parsedResponse.title,
          text: parsedResponse.text,
          timestamp: new Date().toISOString(),
          tags: parsedResponse.tags,
          translations: {},
          attachedMedia: [],
          noteType: `${currentMode}_note` as any,
          originalText: inputText,
          polishedText: parsedResponse.text,
        };
        setPendingZaphodNote(newNote);
        response = `Here's your polished note:\n\n**${parsedResponse.title}**\n${parsedResponse.text}\n\n*${parsedResponse.commentary || ''}*`;
        setShowChatSaveButtons(true);
      } else {
        const themePrompt = await getPrompt(theme, promptType as any);
        const basePrompt = promptType === 'chatbotFaq' ? CHATBOT_PROMPTS.arthur : CHATBOT_PROMPTS.ford;
        const prompt = `${themePrompt || basePrompt}${getRecentNotesContext(promptType || 'chatbotFaq')}\n\nUser: ${inputText}\n\nRespond as ${currentCharacter?.character}:`;
        const aiResponse = await translateTextWithGemini(prompt, 'en', 'en', undefined, prompt);
        response = aiResponse.text;
        if(messages.length >= 1) setShowChatSaveButtons(true);
      }

      const aiMessage: Message = { id: (Date.now() + 1).toString(), text: response, isUser: false, timestamp: new Date() };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      showError('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setMessages([]);
    setInputText('');
    setCurrentMode('arthur');
    setShowChatSaveButtons(false);
    setPendingZaphodNote(null);
    setIsRecording(false);
    if (recording) {
      recording.stopAndUnloadAsync();
      setRecording(null);
    }
    onClose();
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        showError('Microphone permission denied');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: 2,
          audioEncoder: 3,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: 127,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        web: {},
      });

      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      showError('Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        setIsLoading(true);
        const transcribedText = await transcribeAudioWithGemini(uri);
        setInputText(transcribedText);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      showError('Failed to process recording');
    } finally {
      setRecording(null);
      setIsRecording(false);
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (pendingZaphodNote) {
        await addNote(pendingZaphodNote);
        showSuccess('Quick note saved!');
      } else if (messages.length > 1) {
        const chatCharacter = getCurrentTitle();
        const chatContent = messages.map(msg => `${msg.isUser ? 'You' : chatCharacter}: ${msg.text}`).join('\n\n');
        const tags = currentPromptType === 'chatbotFaq' ? ['chat', currentMode, 'FAQ'] : ['chat', currentMode];
        const newNote: Note = {
          id: generateNoteId(),
          title: `${chatCharacter} Chat - ${new Date().toLocaleDateString()}`,
          text: chatContent,
          timestamp: new Date().toISOString(),
          tags: tags,
          noteType: `${currentMode}_note` as any,
          translations: {},
          attachedMedia: [],
        };
        await addNote(newNote);
        showSuccess('Chat saved as a note!');
      }
    } catch (error) {
      showError('Failed to save.');
    }
    resetAndClose();
  };

  const handleDiscard = () => {
    resetAndClose();
  };

  const handleClose = () => {
      if (messages.length > 1 || pendingZaphodNote) {
          Alert.alert( "Unsaved Changes", "You have an unsaved chat or note. Do you want to save before closing?",
              [
                  { text: 'Discard', onPress: () => resetAndClose(), style: 'destructive' },
                  { text: 'Save', onPress: handleSave },
                  { text: 'Cancel', style: 'cancel' }
              ]
          );
      } else {
          resetAndClose();
      }
  };
  
  const handleModeChange = (mode: ChatbotMode) => {
    if(messages.length > 1) {
      Alert.alert('Unsaved Chat', 'Do you want to discard this chat and switch modes?',[
        {text: 'Cancel', style: 'cancel'},
        {text: 'Discard & Switch', onPress: () => {
          resetAndClose();
          setCurrentMode(mode);
        }, style: 'destructive'}
      ])
    } else {
        setMessages([]);
        setShowChatSaveButtons(false);
        setPendingZaphodNote(null);
        setCurrentMode(mode);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Image source={getCurrentAvatar()} style={styles.avatar} />
            <Text style={styles.title}>{getCurrentTitle()}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.messagesContainer}>
            {messages.map(message => (
              <View key={message.id} style={[styles.message, message.isUser ? styles.userMessage : styles.aiMessage]}>
                <Text style={[styles.messageText, message.isUser ? styles.userMessageText : styles.aiMessageText]}>
                  {message.text}
                </Text>
              </View>
            ))}
            {isLoading && <Text style={styles.loadingText}>Thinking...</Text>}
          </ScrollView>

          {showChatSaveButtons && (
            <View style={styles.saveContainer}>
              <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSave}>
                <Text style={styles.actionButtonText}>💾 Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handleDiscard}>
                <Text style={styles.actionButtonText}>🗑️ Discard</Text>
              </TouchableOpacity>
            </View>
          )}

          {!showChatSaveButtons && (
            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
              >
                <Text style={styles.voiceButtonText}>
                  {isRecording ? '🛑' : '🎤'}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder={isRecording ? "Recording..." : "Type your message..."}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, (!inputText.trim() || isLoading || isRecording) && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!inputText.trim() || isLoading || isRecording}>
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#1f2937', borderRadius: 12, width: '90%', maxWidth: 400, height: '80%', maxHeight: 600, overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#374151' },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    title: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 },
    closeButton: { padding: 5 },
    closeButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    messagesContainer: { flex: 1, padding: 16 },
    message: { marginBottom: 12, maxWidth: '85%', padding: 12, borderRadius: 8 },
    userMessage: { alignSelf: 'flex-end', backgroundColor: '#f59e0b' },
    aiMessage: { alignSelf: 'flex-start', backgroundColor: '#374151' },
    messageText: { fontSize: 15, lineHeight: 22 },
    userMessageText: { color: '#000' },
    aiMessageText: { color: '#fff' },
    loadingText: { color: '#9ca3af', fontStyle: 'italic', alignSelf: 'center', padding: 10 },
    inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#374151', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#374151', borderRadius: 8, padding: 12, color: '#fff', fontSize: 15, marginRight: 8 },
    sendButton: { backgroundColor: '#f59e0b', padding: 12, borderRadius: 8 },
    sendButtonDisabled: { backgroundColor: '#6b7280' },
    sendButtonText: { color: '#000', fontWeight: 'bold' },
    saveContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#374151' },
    actionButton: { paddingHorizontal: 25, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    saveButton: { backgroundColor: '#10b981' },
    cancelButton: { backgroundColor: '#ef4444' },
    actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    characterNameContainer: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#374151', alignItems: 'center' },
    characterName: { color: '#f59e0b', fontSize: 16, fontWeight: 'bold' },
    voiceButton: { backgroundColor: '#6b7280', padding: 12, borderRadius: 8, marginRight: 8 },
    voiceButtonRecording: { backgroundColor: '#ef4444' },
    voiceButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});