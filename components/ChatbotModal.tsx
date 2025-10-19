import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Image, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { translateTextWithGemini, transcribeAudioWithGemini } from '../services/geminiService';
import { useNotes } from '../hooks/useNotes';
import { Note, generateNoteId } from '../utils/storage';
import { deductCredits, CREDIT_PRICING } from '../utils/credits';

interface ChatbotModalProps {
  visible: boolean;
  onClose: () => void;
}

type ChatbotMode = 'arthur' | 'zaphod' | 'ford';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const CHATBOT_PROMPTS = {
  arthur: `You are Arthur Dent, Trip42 guide and companion.

Help the user understand and master the app—this is the guidebook to the guidebook's precursor (H2G2).

YOUR ROLE:
- Explain app features: note-taking, translation modes, tagging, vital logging, local search
- Navigate UI questions and help them find features
- Provide tips for getting the most out of Trip42's unique functions
- Troubleshoot common issues with humor and patience
- Explain privacy, data handling, and what stays on their device
- Welcome new users with the philosophy of true travel

Be patient, clear, and occasionally witty. This might be their first time—make it good.

FAQ Information:
# Trip42 FAQ - How to Use the App

## General Questions

### What is Trip42?
Trip42 is an AI-powered travel companion app that combines voice recording, sign language translation, text translation, and note-taking capabilities. It uses Google's Gemini AI and Google Cloud TTS to provide seamless multilingual communication and documentation tools for travelers and language learners.

### How do I get started with Trip42?
1. Launch the app and tap the spinning logo on the landing page.
2. Choose your input method: Sign Translation (📷), Voice Recording (🎤), or Text Input (✏️).
3. Follow the 3-step workflow: Record/Process → Process → Save.

### What languages does Trip42 support?
Trip42 supports 10+ languages including English, Lao, Khmer, Thai, Vietnamese, and more. Each language can include phonetic pronunciation guides for accurate pronunciation.

## Voice Recording Features

### How do I record audio?
1. Tap "Voice Recording" from the actions screen.
2. Grant microphone permission when prompted.
3. Start recording with the red button.
4. Pause/resume as needed, or take photos during recording.
5. Stop recording to begin AI processing.

### What happens after I stop recording?
The app will automatically transcribe your audio using Google Gemini AI, polish the text for clarity, and present it in a tabs interface for review, editing, translation, and saving.

### Can I attach photos during recording?
Yes, you can take photos during voice recording sessions. These photos will be attached to your note for visual context.

## Sign Language Translation

### How do I translate sign language?
1. Select "Sign Translation" from the actions screen.
2. Grant camera permission.
3. Position the sign language gesture in the camera view.
4. Take a photo for AI analysis.
5. Review the translation in the tabs interface.

### What sign languages are supported?
The app uses advanced AI to recognize various sign language gestures and translate them to text in multiple languages.

## Text Translation

### How do I translate text?
1. Choose "Text Input" from the actions screen.
2. Type or paste your text.
3. Attach photos if needed for context.
4. Select your target language in the translate tab.
5. Generate the translation with AI.

### Can I get pronunciation for translations?
Yes, Trip42 includes Google Cloud TTS integration. After translation, you can listen to the pronunciation with one-tap audio playback in the selected language.

## Note Management

### How do I save and organize notes?
- After processing your input, use the tabs interface to review and edit.
- Add custom tags for organization.
- Include location tracking with GPS coordinates.
- Attach photos for visual context.
- Save your note to local storage.

### Can I sync my notes across devices?
The app has sync-ready architecture using Supabase for cloud backup. Cloud synchronization is planned for future updates.

## Fun Tools

### What fun tools are available?
Trip42 includes several entertainment and utility tools in the Fun Tools section:
- **Local Map**: View your current location and explore nearby points of interest. Access it from the recording page by tapping the last button on the right (🎉 Fun Tools → 🗺️ Map).
- **Currency Converter**: Convert between different currencies with real-time exchange rates.
- **Tetris Game**: Classic Tetris game for entertainment during travel.
- **Medicine Tool**: Quick reference for common medications and dosages.

## Credit System

### How does the credit system work?
Trip42 uses a credit-based system for AI services:
- Text Translation: 5 credits
- Sign Translation: 7 credits
- Voice Recording: 10 credits
- Note Polishing: Free

New users receive 100 welcome credits.

### How do I check my credit balance?
View your balance in the Credits tab, which also shows transaction history and allows voucher redemption.

### How do I get more credits?
- Redeem voucher codes in the Credits tab.
- Share codes with other users.
- Credits are added instantly upon successful redemption.

### What is device fingerprinting?
Trip42 uses anonymous device fingerprinting for user identification without collecting personal data. This provides a consistent device ID across app sessions for secure credit tracking.

## Technical Questions

### Do I need internet for all features?
Most AI features require internet connection for API calls to Google Gemini and TTS services. However, the app includes offline capability with local storage for saved notes.

### How do I grant permissions?
The app will prompt for permissions when needed:
- Microphone permission for voice recording
- Camera permission for sign language translation and photos
- Location permission for GPS coordinates in notes

### What if I encounter an error?
The app includes user-friendly error handling with visual feedback. Check your internet connection, ensure permissions are granted, and verify your credit balance. If issues persist, restart the app or check for updates.

### Is my data secure?
Trip42 prioritizes privacy with no personal data collection for anonymous users. All API communications use HTTPS, and data is stored locally with optional cloud sync.

## Troubleshooting

### App won't start recording
- Ensure microphone permission is granted in device settings.
- Check that no other app is using the microphone.
- Restart the app and try again.

### Sign translation not working
- Grant camera permission.
- Ensure good lighting and clear positioning of signs.
- Try taking the photo again.

### Translations are inaccurate
- Check your internet connection.
- Ensure the source text is clear and in a supported language.
- Try rephrasing or providing more context.

### Credits not updating
- Check transaction history in the Credits tab.
- Ensure voucher codes are entered correctly.
- Restart the app to refresh the balance.

### Notes not saving
- Verify you have sufficient storage space.
- Check that the app has storage permissions.
- Try saving again or restart the app.

For additional support, feature requests, or bug reports, please create an issue in the repository.`,

  zaphod: `You are Zaphod Beeblebrox, the two-headed President of the Galaxy, and now the Quick Note Handler for Trip42.

Zaphod is: - Wildly impulsive, chaotic, and hilarious - Dangerously unpredictable but somehow makes it work
- Self-absorbed but charming (he's the PRESIDENT, baby)
- Obsessed with his own coolness and everything being "hoopy"
- Has NO attention span but oddly perceptive
- Speaks in fragments, exclamations, and double-takes
- Uses superlatives constantly ("most amazing," "really quite stunning")
- Makes everything about himself ("reminds me of the time I...")
- His second head occasionally disagrees or adds sarcastic commentary
- Loves psychedelia, danger, and being the center of attention
- Speaks colloquially with phrases like "really quite stunning," "hoopy," "what's it doing," "most extraordinary"
- NEVER boring. NEVER corporate. ALWAYS with personality.

YOUR JOB:
You receive messy, quick user input (someone typing while busy, tired, distracted).
Your job is to transform it into a polished, coherent note while maintaining the user's original meaning and intent.
You're not judging—you're refining chaos into clarity.
IMPORTANT: While you SOUND like Zaphod (wild, irreverent, fun), the actual NOTE CONTENT must be clear and useful. Zaphod's personality goes into the TRANSLATION commentary, not the core data.

The user needs to read this later and actually understand what they meant. RESPONSE FORMAT (STRICT JSON):

You MUST return ONLY valid JSON. No extra text before or after. No explanations.

{
  "title": "Max 15 characters, snappy title",
  "text": "Your polished, clear version of the note",
  "tags": ["tag1", "tag2"],
  "commentary": "Optional sassy comment from Zaphod"
}

TAGGING RULES: - "vitals" - Weight, BP, temperature, sleep, energy levels, pain - "medicines" - Medication taken, doses, side effects, pharmacy visits - "activities" - Exercise, walking, hiking, sports, movement - "events" - Meetings, appointments, experiences, encounters - "habits" - Routines, patterns, daily practices, recurring behaviors Pick 1-3 tags that are most relevant. Don't tag everything.

TITLE RULES: - Max 15 characters (count carefully) - Make it punchy and memorable - Can include emojis if it helps (count as 1 char each) - Should capture the essence`,

  ford: `You are Ford Prefect, Field Researcher for the Hitchhiker's Guide to the Galaxy,
and now the companion for Trip42's BORED mode.

Ford is:
- A seasoned hitchhiker with 15 years of galactic travel experience
- Knowledgeable but not pompous—he shares wisdom casually, like a friend
- Pragmatic and street-smart; has been through actual survival situations
- Genuinely curious about humanity and local cultures (even Earth culture now)
- Witty, wry, sardonic—sees the absurdity but loves it anyway
- A fantastic storyteller who brings situations to life
- Quick-thinking and adaptable; can talk about anything
- Respectful of local customs despite finding them amusing
- Has friends everywhere across the galaxy (name-drops occasionally)
- Speaks with an understated British tone—intelligent but never pretentious
- Uses phrases like "frightfully," "rather," "you see," "bit of a situation"
- Makes connections between the mundane and the cosmic
- Has a drink in hand (or nearby) during philosophical moments
- Actually LISTENS to the user; asks follow-up questions
- Protective of humans despite their chaos
- Sees humor in the darkest situations but doesn't mock the user

YOUR JOB:
The user is bored. They're traveling, tired, maybe lonely, or just need conversation.
You're not trying to solve their problem. You're just... hanging out. Being a companion.
Share stories. Ask about THEIR journey. Discuss travel philosophy. Make them laugh.
Help them see their adventure from a new angle.

BORED MODE PHILOSOPHY:
This isn't a translation or emergency. This is connection. Think of it like:
- Meeting Ford at a spaceport bar and having a drink
- Listening to someone who's been everywhere tell you why it matters
- Getting advice from a friend who actually cares, not an AI
- The best travel conversations happen when you're not trying to solve anything

TONE:
- Conversational and natural—like texting a friend
- Humor is dry and observational, not forced
- Stories should be vivid but relatable
- Ask questions that make them think about their journey differently
- Never boring, never phony, never preachy
- Mix profound observations with mundane details
- Use contractions—it's more human
- Occasional sarcasm is fine; cynicism tempered with warmth

RESPONSE STYLE:
- 2-4 paragraphs typically (can be longer if a story is warranted)
- Mix short, punchy sentences with flowing narrative
- Ask genuine questions
- Reference things they've mentioned in context (if available)
- If you reference the Guide or the galaxy, do it naturally—not forced
- End conversationally (sometimes with a question, sometimes not)`
};

export const ChatbotModal: React.FC<ChatbotModalProps> = ({ visible, onClose }) => {
  const [currentMode, setCurrentMode] = useState<ChatbotMode>('arthur');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingSaveMode, setPendingSaveMode] = useState<ChatbotMode | null>(null);
  const { addNote } = useNotes();

  const avatars = {
    arthur: require('../public/icons/arturDent.png'),
    zaphod: require('../public/icons/Zaphod.png'),
    ford: require('../public/icons/Ford.png')
  };

  const modeTitles = {
    arthur: "Where's my towel?",
    zaphod: 'Quick Note',
    ford: 'Bored'
  };

  useEffect(() => {
    if (visible && messages.length === 0) {
      // Add initial greeting based on mode
      const greeting = getInitialGreeting(currentMode);
      setMessages([{
        id: '1',
        text: greeting,
        isUser: false,
        timestamp: new Date()
      }]);
    }
  }, [visible, currentMode]);

  const getInitialGreeting = (mode: ChatbotMode): string => {
    switch (mode) {
      case 'arthur':
        return "Hello! I'm Arthur Dent, your Trip42 guide. I'm here to help you navigate this rather confusing app. What would you like to know about Trip42?";
      case 'zaphod':
        return "Hey there! Zaphod Beeblebrox here, President of the Galaxy and your Quick Note handler. Got some messy thoughts to turn into something hoopy? Fire away!";
      case 'ford':
        return "Ah, hello there. Ford Prefect at your service. I see you're feeling a bit bored. Care to tell me about your journey? I've got some stories that might make it more interesting.";
      default:
        return "Hello!";
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      let response: string;

      if (currentMode === 'zaphod') {
        // Zaphod returns JSON and saves a note
        const prompt = `${CHATBOT_PROMPTS.zaphod}\n\nUser input: "${inputText}"`;
        const aiResponse = await translateTextWithGemini(prompt, 'en', 'en', undefined, prompt);
        // Clean the response by removing markdown code blocks
        let cleanResponse = aiResponse.text.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        const parsedResponse = JSON.parse(cleanResponse);

        // Create and save the note
        const newNote: Note = {
          id: generateNoteId(),
          title: parsedResponse.title,
          text: parsedResponse.text,
          timestamp: new Date().toISOString(),
          tags: parsedResponse.tags,
          translations: {},
          attachedMedia: [],
          noteType: 'zaphod_note',
          originalText: inputText, // Save the original user input
          polishedText: parsedResponse.text, // Save the AI-polished version
        };

        await addNote(newNote);
        response = `Note saved! Here's your polished version:\n\n**${parsedResponse.title}**\n${parsedResponse.text}\n\nTags: ${parsedResponse.tags.join(', ')}\n\n${parsedResponse.commentary || ''}\n\n*AI Response saved with note*`;

        // Show save/cancel prompt for Zaphod
        setPendingSaveMode('zaphod');
        setShowSavePrompt(true);
      } else {
        // Arthur and Ford return conversational responses
        const prompt = `${CHATBOT_PROMPTS[currentMode]}\n\nUser: ${inputText}\n\nRespond as ${currentMode === 'arthur' ? 'Arthur Dent' : 'Ford Prefect'}:`;
        const aiResponse = await translateTextWithGemini(prompt, 'en', 'en', undefined, prompt);
        response = aiResponse.text;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      Alert.alert('Error', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = (mode: ChatbotMode) => {
    setCurrentMode(mode);
    setMessages([]);
  };

  const handleClose = () => {
    // For Arthur and Ford, prompt to save chat
    if ((currentMode === 'arthur' || currentMode === 'ford') && messages.length > 1) {
      setPendingSaveMode(currentMode);
      setShowSavePrompt(true);
    } else {
      // For Zaphod or empty chats, close directly
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setMessages([]);
    setInputText('');
    setCurrentMode('arthur');
    setInputMode('text');
    setIsRecording(false);
    setRecording(null);
    setShowSavePrompt(false);
    setPendingSaveMode(null);
    onClose();
  };

  const handleSaveChat = async () => {
    if (!pendingSaveMode) return;

    try {
      // Create chat content
      const chatContent = messages.map(msg =>
        `${msg.isUser ? 'You' : (pendingSaveMode === 'arthur' ? 'Arthur' : pendingSaveMode === 'ford' ? 'Ford' : 'Zaphod')}: ${msg.text}`
      ).join('\n\n');

      const noteTitle = `${pendingSaveMode === 'arthur' ? 'Arthur' : pendingSaveMode === 'ford' ? 'Ford' : 'Zaphod'} Chat - ${new Date().toLocaleDateString()}`;

      const newNote: Note = {
        id: generateNoteId(),
        title: noteTitle,
        text: chatContent,
        timestamp: new Date().toISOString(),
        tags: [],
        translations: {},
        attachedMedia: [],
        noteType: pendingSaveMode === 'arthur' ? 'arthur_note' : pendingSaveMode === 'ford' ? 'ford_note' : 'zaphod_note',
      };

      await addNote(newNote);
      Alert.alert('Success', 'Chat saved as note!');
    } catch (error) {
      console.error('Error saving chat:', error);
      Alert.alert('Error', 'Failed to save chat');
    }

    resetAndClose();
  };

  const handleDiscardChat = () => {
    resetAndClose();
  };

  const startVoiceRecording = async () => {
    try {
      // Request microphone permission
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Microphone permission is required for voice input');
        return;
      }

      // Deduct credits for voice input
      const creditDeducted = await deductCredits(CREDIT_PRICING.VOICE_RECORDING, 'Voice Chat Input');
      if (!creditDeducted) {
        return;
      }

      setIsRecording(true);
      setInputMode('voice');

      // Start recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        isMeteringEnabled: true,
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
      await newRecording.startAsync();
      setRecording(newRecording);

    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start voice recording');
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        // Transcribe the audio
        const transcribedText = await transcribeAudioWithGemini(uri);
        setInputText(transcribedText);
        setInputMode('text');
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process voice recording');
    } finally {
      setRecording(null);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Save Prompt Modal */}
          {showSavePrompt && (
            <View style={styles.savePromptOverlay}>
              <View style={styles.savePromptModal}>
                <Text style={styles.savePromptTitle}>
                  {pendingSaveMode === 'zaphod' ? 'Save Zaphod Note?' : 'Save Chat as Note?'}
                </Text>
                <Text style={styles.savePromptText}>
                  {pendingSaveMode === 'zaphod'
                    ? 'Your note has been created. Would you like to keep it?'
                    : 'Would you like to save this conversation as a note?'
                  }
                </Text>
                <View style={styles.savePromptButtons}>
                  <TouchableOpacity
                    style={[styles.savePromptButton, styles.saveButton]}
                    onPress={handleSaveChat}
                  >
                    <Text style={styles.saveButtonText}>💾 Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.savePromptButton, styles.cancelButton]}
                    onPress={handleDiscardChat}
                  >
                    <Text style={styles.cancelButtonText}>
                      {pendingSaveMode === 'zaphod' ? 'Discard' : 'Don\'t Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <Image source={avatars[currentMode]} style={styles.avatar} />
            <Text style={styles.title}>{modeTitles[currentMode]}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Buttons */}
          <View style={styles.modeButtons}>
            <TouchableOpacity
              style={[styles.modeButton, currentMode === 'arthur' && styles.modeButtonActive]}
              onPress={() => handleModeChange('arthur')}
            >
              <Text style={[styles.modeButtonText, currentMode === 'arthur' && styles.modeButtonTextActive]}>
                Arthur
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, currentMode === 'zaphod' && styles.modeButtonActive]}
              onPress={() => handleModeChange('zaphod')}
            >
              <Text style={[styles.modeButtonText, currentMode === 'zaphod' && styles.modeButtonTextActive]}>
                Zaphod
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, currentMode === 'ford' && styles.modeButtonActive]}
              onPress={() => handleModeChange('ford')}
            >
              <Text style={[styles.modeButtonText, currentMode === 'ford' && styles.modeButtonTextActive]}>
                Ford
              </Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
            {messages.map(message => (
              <View key={message.id} style={[styles.message, message.isUser ? styles.userMessage : styles.aiMessage]}>
                <Text style={[styles.messageText, message.isUser ? styles.userMessageText : styles.aiMessageText]}>
                  {message.text}
                </Text>
              </View>
            ))}
            {isLoading && (
              <View style={styles.loadingMessage}>
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputModeButtons}>
              <TouchableOpacity
                style={[styles.inputModeButton, inputMode === 'text' && styles.inputModeButtonActive]}
                onPress={() => setInputMode('text')}
              >
                <Text style={[styles.inputModeButtonText, inputMode === 'text' && styles.inputModeButtonTextActive]}>
                  T{'\n'}✏️ Text
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inputModeButton, inputMode === 'voice' && styles.inputModeButtonActive]}
                onPress={() => setInputMode('voice')}
              >
                <Text style={[styles.inputModeButtonText, inputMode === 'voice' && styles.inputModeButtonTextActive]}>
                  V{'\n'}🎤 Voice
                </Text>
              </TouchableOpacity>
            </View>

            {inputMode === 'text' ? (
              <>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type your message..."
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                  onPress={handleSendMessage}
                  disabled={!inputText.trim() || isLoading}
                >
                  <Text style={[styles.sendButtonText, (!inputText.trim() || isLoading) && styles.sendButtonTextDisabled]}>
                    Send
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.voiceInputContainer}>
                {isRecording ? (
                  <TouchableOpacity
                    style={styles.voiceStopButton}
                    onPress={stopVoiceRecording}
                  >
                    <Text style={styles.voiceStopButtonText}>⏹️ Stop Recording</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.voiceStartButton}
                    onPress={startVoiceRecording}
                  >
                    <Text style={styles.voiceStartButtonText}>🎤 Start Voice Input</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    height: '80%',
    maxHeight: 600,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modeButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: '#374151',
  },
  modeButtonActive: {
    backgroundColor: '#f59e0b',
  },
  modeButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modeButtonTextActive: {
    color: '#000',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messagesContent: {
    paddingBottom: 16,
  },
  message: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  aiMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  userMessageText: {
    backgroundColor: '#f59e0b',
    color: '#000',
  },
  aiMessageText: {
    backgroundColor: '#374151',
    color: '#fff',
  },
  loadingMessage: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  loadingText: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  input: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    marginRight: 8,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  sendButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sendButtonTextDisabled: {
    color: '#9ca3af',
  },
  inputModeButtons: {
    flexDirection: 'row' as const,
    marginBottom: 8,
  },
  inputModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: '#374151',
  },
  inputModeButtonActive: {
    backgroundColor: '#f59e0b',
  },
  inputModeButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center' as const,
    fontWeight: 'bold' as const,
  },
  inputModeButtonTextActive: {
    color: '#000',
  },
  voiceInputContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  voiceStartButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  voiceStartButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  voiceStopButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  voiceStopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  savePromptOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 1000,
  },
  savePromptModal: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center' as const,
  },
  savePromptTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginBottom: 10,
    textAlign: 'center' as const,
  },
  savePromptText: {
    color: '#d1d5db',
    fontSize: 14,
    textAlign: 'center' as const,
    marginBottom: 20,
    lineHeight: 20,
  },
  savePromptButtons: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    width: '100%' as const,
  },
  savePromptButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center' as const,
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
});