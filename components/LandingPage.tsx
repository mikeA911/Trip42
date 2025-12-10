import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, Image, Text, Modal, ScrollView, Alert, Dimensions, StyleSheet, Easing, TextInput, Platform } from 'react-native';
import { PanGestureHandler, State, PanGestureHandlerGestureEvent, PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import { QUOTES } from '../constants/quotes';
import { ChatbotModal } from './ChatbotModal';
import CalendarModal from './CalendarModal';
import { fetchRandomQuote, Quote, getCachedThemeIcons, fetchQuotesByTheme } from '../services/quotesService';
import { downloadAndCacheAllPrompts } from '../services/promptService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const LANDING_IMAGES = [
  require('../assets/trip42.png'), // Trip42 logo
  require('../public/icons/arturBent.png'),
  require('../public/icons/fordPretext.png'),
  require('../public/icons/marvin.png'),
  require('../public/icons/zaphodBabblefish.png'),
];

interface LandingPageProps {
  onNavigateToNotes: () => void;
  onNavigateToRecord: () => void;
  savedNotes?: any[];
  onSaveNote?: (note: any) => void;
  aiTheme?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToNotes,
  onNavigateToRecord,
  savedNotes = [],
  onSaveNote,
  aiTheme = 'h2g2'
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [spinCount, setSpinCount] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showChatbot, setShowChatbot] = useState<{ visible: boolean; mode: string }>({ visible: false, mode: '' });
  const [showChatbotSelector, setShowChatbotSelector] = useState(false);
  const [isQuoteMode, setIsQuoteMode] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [selectedDateForNote, setSelectedDateForNote] = useState<Date | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showPwaInfoModal, setShowPwaInfoModal] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [purchasedThemes, setPurchasedThemes] = useState<string[]>(['h2g2']);
  const [themeIcons, setThemeIcons] = useState<{ [character: string]: string }>({});

  const spinValue = useRef(new Animated.Value(0)).current;
  const pulsateValue = useRef(new Animated.Value(1)).current;
  const verticalSpinValue = useRef(new Animated.Value(0)).current;
  const wobbleValue = useRef(new Animated.Value(0)).current;
  const dotMoveX = useRef(new Animated.Value(0)).current;
  const dotMoveY = useRef(new Animated.Value(0)).current;

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load user credits, purchased themes, and theme icons

  // Pulsating animation for the red dot
  useEffect(() => {
    const pulsateAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsateValue, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(pulsateValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    pulsateAnimation.start();

    return () => pulsateAnimation.stop();
  }, []);

  // Very slow movement across screen for the red dot
  useEffect(() => {
    const safeWidth = width - 80;
    const safeHeight = height - 100;
    
    const moveAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(dotMoveX, {
            toValue: safeWidth * 0.8,
            duration: 20000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(dotMoveY, {
            toValue: safeHeight * 0.3,
            duration: 20000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(dotMoveX, {
            toValue: safeWidth * 0.2,
            duration: 20000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(dotMoveY, {
            toValue: safeHeight * 0.7,
            duration: 20000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(dotMoveX, {
            toValue: safeWidth * 0.6,
            duration: 20000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(dotMoveY, {
            toValue: safeHeight * 0.1,
            duration: 20000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(dotMoveX, {
            toValue: 0,
            duration: 20000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(dotMoveY, {
            toValue: 0,
            duration: 20000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      ])
    );
    moveAnimation.start();

    return () => moveAnimation.stop();
  }, []);


  // Remove automatic quote cycling - quotes only show after spins

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setCurrentQuote(null);
    setSpinCount(prev => prev + 1);

    // Coin-like spin animation - vertical axis rotation like a coin on a flat surface
    const coinSpinAnimation = Animated.timing(spinValue, {
      toValue: 2160, // 6 full spins (like a coin spinning)
      duration: 2000, // Duration for coin-like spin
      easing: Easing.out(Easing.quad), // Quadratic easing for realistic slowdown
      useNativeDriver: false,
    });

    coinSpinAnimation.start(async () => {
      spinValue.setValue(0); // Reset for next spin
      // Always default to trip42 icon
      let nextIndex = 0;
      if (isQuoteMode) {
        // Return to trip42 icon on next spin after quote
        setIsQuoteMode(false);
      }
      setCurrentImageIndex(nextIndex);
      setIsSpinning(false);

      // Show random quote after 4-10 spins (less frequent)
      const minSpins = 4;
      const maxSpins = 10;
      const randomSpinThreshold = Math.floor(Math.random() * (maxSpins - minSpins + 1)) + minSpins;

      if (spinCount >= randomSpinThreshold - 1) {
        // Check theme access logic
        const deadline = new Date('2026-04-02T00:00:00.000Z');
        const now = new Date();
        const isBeforeDeadline = now < deadline;

        // Check if theme is purchased or is h2g2 (free)
        const isThemePurchased = purchasedThemes.includes(aiTheme) || aiTheme === 'h2g2';

        if (isThemePurchased || isBeforeDeadline) {
          // Allow access if purchased or before deadline
          const quote = await fetchRandomQuote(aiTheme);
          if (quote) {
            setCurrentQuote(quote);
            setSpinCount(0);
            // Change to character icon when quote is displayed
            if (quote.icon) {
              // Use character icon from database
              setCurrentImageIndex(-1); // Special index to indicate using remote icon
            } else {
              // Fallback to random avatar if no icon in database
              const avatarIndices = [1, 2, 3, 4]; // Indices of avatar images (excluding trip42)
              const randomAvatarIndex = avatarIndices[Math.floor(Math.random() * avatarIndices.length)];
              setCurrentImageIndex(randomAvatarIndex);
            }
            setIsQuoteMode(true);
          }
        } else {
          // After deadline - require purchase for new themes
          const creditCost = 250;
          Alert.alert(
            'Theme Not Purchased',
            `The ${aiTheme} theme requires purchase (${creditCost} credits). Would you like to purchase it?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Purchase',
                onPress: async () => {
                  if (userCredits >= creditCost) {
                    const newCredits = userCredits - creditCost;
                    const newPurchasedThemes = [...purchasedThemes, aiTheme];

                    try {
                      await AsyncStorage.setItem('userCredits', newCredits.toString());
                      await AsyncStorage.setItem('purchasedThemes', JSON.stringify(newPurchasedThemes));
                      setUserCredits(newCredits);
                      setPurchasedThemes(newPurchasedThemes);
                      Alert.alert('Success', `Theme ${aiTheme} purchased successfully!`);
                    } catch (error) {
                      console.error('Error saving purchase:', error);
                      Alert.alert('Error', 'Failed to complete purchase');
                    }
                  } else {
                    Alert.alert('Insufficient Credits', `You need ${creditCost} credits to purchase this theme.`);
                  }
                }
              }
            ]
          );
        }
      }
    });
  };

  const handleImagePress = () => {
    if (isSpinning) return;
    onNavigateToRecord();
  };

  // Calendar functions
  const navigateMonth = (direction: number) => {
    setCalendarDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const selectDate = (day: number) => {
    const selectedDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    const dateString = selectedDate.toDateString();

    // Check if there are existing notes for this date
    const existingNotes = savedNotes.filter(note => {
      const noteDate = new Date(note.timestamp);
      return noteDate.toDateString() === dateString;
    });

    if (existingNotes.length > 0) {
      // Show dialog asking if user wants to create a new note or view existing ones
      Alert.alert(
        'Notes Found',
        `You have ${existingNotes.length} note(s) for ${selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}. What would you like to do?`,
        [
          { text: 'View Notes', onPress: () => {
            setCurrentTime(selectedDate);
            setShowCalendar(false);
            onNavigateToNotes();
          }},
          { text: 'Create New Note', onPress: () => {
            createNoteForDate(selectedDate);
          }},
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else {
      // No existing notes, ask if user wants to create one
      Alert.alert(
        'Create Note',
        `Create a new text note for ${selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}?`,
        [
          { text: 'Create Note', onPress: () => createNoteForDate(selectedDate) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const createNoteForDate = (selectedDate: Date) => {
    // Set the current time to the selected date
    setCurrentTime(selectedDate);

    // Pre-fill the note title with the date
    const dateTitle = selectedDate.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Open the note creation modal
    setSelectedDateForNote(selectedDate);
    setNoteTitle(dateTitle);
    setNoteText('');
    setIsInputFocused(false);
    setShowNoteModal(true);
    setShowCalendar(false);
  };

  const saveNote = () => {
    if (!selectedDateForNote || !onSaveNote) return;

    // Check if the selected date is in the future
    const now = new Date();
    const isFutureDate = selectedDateForNote > now;

    const newNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      title: noteTitle,
      text: noteText,
      timestamp: selectedDateForNote.toISOString(),
      tags: isFutureDate ? ['plan'] : [],
      noteType: 'text_note' as const,
      isSynced: false,
      translations: {},
      attachedMedia: []
    };

    onSaveNote(newNote);
    Alert.alert('Note Created', `A new note has been created for ${selectedDateForNote.toLocaleDateString([], { month: 'short', day: 'numeric' })}${isFutureDate ? ' with #plan tag' : ''}.`);

    setShowNoteModal(false);
    setSelectedDateForNote(null);
    setNoteTitle('');
    setNoteText('');
  };

  const cancelNote = () => {
    setShowNoteModal(false);
    setSelectedDateForNote(null);
    setNoteTitle('');
    setNoteText('');
    setIsInputFocused(false);
  };

  const hasNotesForDate = (year: number, month: number, day: number) => {
    const dateString = new Date(year, month, day).toDateString();
    return savedNotes.some(note => {
      const noteDate = new Date(note.timestamp);
      return noteDate.toDateString() === dateString;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getWeeklyCalendarData = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Calculate how many weeks we need to show
    const totalCells = startingDayOfWeek + daysInMonth;
    const totalWeeks = Math.ceil(totalCells / 7);

    const weeks = [];

    for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
      const week = [];

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayNumber = weekIndex * 7 + dayIndex - startingDayOfWeek + 1;

        if (dayNumber >= 1 && dayNumber <= daysInMonth) {
          week.push({
            day: dayNumber,
            month: month,
            year: year
          });
        } else {
          week.push(null);
        }
      }

      weeks.push(week);
    }

    return weeks;
  };

  const getNotesForDate = (year: number, month: number, day: number) => {
    const dateString = new Date(year, month, day).toDateString();
    return savedNotes.filter(note => {
      const noteDate = new Date(note.timestamp);
      return noteDate.toDateString() === dateString;
    });
  };

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    // Handle ongoing gesture
  };

  const onHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (isSpinning) return;

    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      if (Math.abs(translationX) > 50) {
        handleSpin();
      }
    }
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.movingDot,
          {
            left: Animated.add(20, dotMoveX),
            top: Animated.add(50, dotMoveY),
            transform: [{ scale: pulsateValue }]
          },
        ]}
      >
        <TouchableOpacity
          style={styles.dotTouchable}
          onPress={() => setShowChatbotSelector(true)}
        >
          <View style={styles.pulsatingDot} />
        </TouchableOpacity>
      </Animated.View>

      <TouchableOpacity
        style={styles.dateTimeContainer}
        onPress={() => setShowCalendar(true)}
      >
        <Text style={styles.dateText}>
          {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </Text>
        <Text style={styles.clockText}>
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.versionContainer}
        onPress={() => Platform.OS === 'web' && setShowPwaInfoModal(true)}
      >
        <Text style={styles.versionText}>PWA-Beta-11</Text>
      </TouchableOpacity>

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <View style={styles.logoContainer}>
          <TouchableOpacity
            onPress={handleImagePress}
            disabled={isSpinning}
          >
            <View style={styles.logoTouchable}>
              {currentImageIndex === -1 && currentQuote?.icon ? (
                <Animated.Image
                  source={{ uri: currentQuote.icon }}
                  style={[
                    styles.logo,
                    {
                      transform: [{
                        rotateY: spinValue.interpolate({
                          inputRange: [0, 2160],
                          outputRange: ['0deg', '2160deg']
                        })
                      }]
                    }
                  ]}
                  resizeMode="contain"
                />
              ) : (
                <Animated.Image
                  source={LANDING_IMAGES[currentImageIndex]}
                  style={[
                    styles.logo,
                    {
                      transform: [{
                        rotateY: spinValue.interpolate({
                          inputRange: [0, 2160],
                          outputRange: ['0deg', '2160deg']
                        })
                      }]
                    }
                  ]}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </PanGestureHandler>

      {currentQuote && (
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteSourceText}>{currentQuote.source} - {currentQuote.character}</Text>
          <Text style={styles.quoteText}>"{currentQuote.quote}"</Text>
        </View>
      )}

      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        savedNotes={savedNotes}
        onSaveNote={onSaveNote}
        onNavigateToNotes={onNavigateToNotes}
      />

      {/* Chatbot Selector Modal */}
      <Modal
        visible={showChatbotSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowChatbotSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.noteModalContent}>
            <Text style={styles.chatbotSelectorTitle}>What can I help you with?</Text>

            <TouchableOpacity
              style={styles.chatbotOption}
              onPress={() => {
                setShowChatbotSelector(false);
                setShowChatbot({ mode: 'chatbotFaq', visible: true });
              }}
            >
              <Text style={styles.chatbotOptionEmoji}>❓</Text>
              <View style={styles.chatbotOptionText}>
                <Text style={styles.chatbotOptionTitle}>Wut?</Text>
                <Text style={styles.chatbotOptionDesc}>Get help with Trip42 features</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatbotOption}
              onPress={() => {
                console.log('🎯 Selected Quick Note for theme:', aiTheme);
                setShowChatbotSelector(false);
                setShowChatbot({ mode: 'chatbotQuickNote', visible: true });
              }}
            >
              <Text style={styles.chatbotOptionEmoji}>📝</Text>
              <View style={styles.chatbotOptionText}>
                <Text style={styles.chatbotOptionTitle}>Quick Note</Text>
                <Text style={styles.chatbotOptionDesc}>Turn messy thoughts into notes</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatbotOption}
              onPress={() => {
                setShowChatbotSelector(false);
                setShowChatbot({ mode: 'chatbotBored', visible: true });
              }}
            >
              <Text style={styles.chatbotOptionEmoji}>😴</Text>
              <View style={styles.chatbotOptionText}>
                <Text style={styles.chatbotOptionTitle}>Bored</Text>
                <Text style={styles.chatbotOptionDesc}>Chat and explore your journey</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatbotCancelButton}
              onPress={() => setShowChatbotSelector(false)}
            >
              <Text style={styles.chatbotCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ChatbotModal
        visible={showChatbot.visible}
        onClose={() => setShowChatbot({ mode: '', visible: false })}
        theme={aiTheme}
        initialMode={showChatbot.mode}
      />

      <Modal
        visible={showNoteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelNote}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.noteModalContent}>
            <Text style={styles.noteModalTitle}>
              Create Note for {selectedDateForNote?.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>

            <TextInput
              style={styles.noteTitleInput}
              placeholder="Note Title"
              value={noteTitle}
              onChangeText={setNoteTitle}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
            />

            <TextInput
              style={styles.noteTextInput}
              placeholder="Note content..."
              value={noteText}
              onChangeText={setNoteText}
              multiline={true}
              textAlignVertical="top"
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
            />

            {isInputFocused && (
              <View style={styles.noteModalButtons}>
                <TouchableOpacity
                  style={[styles.noteModalButton, styles.cancelButton]}
                  onPress={cancelNote}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.noteModalButton, styles.saveButton]}
                  onPress={saveNote}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPwaInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPwaInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pwaInfoModalContent}>
            <Text style={styles.pwaInfoModalTitle}>PWA Limitations</Text>
            <ScrollView style={styles.pwaInfoScrollView}>
              <Text style={styles.pwaInfoSectionTitle}>Hardware/Platform Limitations:</Text>

              <Text style={styles.pwaInfoSubTitle}>📱 Device-Specific Features</Text>
              <Text style={styles.pwaInfoText}>
                • Camera access: Limited compared to native camera APIs. Web browsers have restrictions on camera permissions and quality.{'\n'}
                • Microphone access: Web audio recording is less reliable than native audio APIs, especially for continuous recording.{'\n'}
                • GPS accuracy: Web geolocation is less precise and has different permission models.{'\n'}
                • File system access: Cannot access device files as comprehensively as native apps.{'\n'}
                • Device sensors: Limited access to accelerometer, gyroscope, etc.
              </Text>

              <Text style={styles.pwaInfoSubTitle}>🔔 Push Notifications</Text>
              <Text style={styles.pwaInfoText}>
                • Background notifications: PWAs cannot receive push notifications when the app is closed (unlike native apps).{'\n'}
                • Rich notifications: Limited customization compared to native notification systems.
              </Text>

              <Text style={styles.pwaInfoSubTitle}>📱 App Store Integration</Text>
              <Text style={styles.pwaInfoText}>
                • No app store presence: Cannot be distributed through Apple App Store or Google Play Store.{'\n'}
                • Installation process: Users must manually add to home screen vs. one-click app store installs.
              </Text>

              <Text style={styles.pwaInfoSectionTitle}>Performance Limitations:</Text>

              <Text style={styles.pwaInfoSubTitle}>⚡ Processing Power</Text>
              <Text style={styles.pwaInfoText}>
                • Background processing: PWAs cannot run background tasks when closed.{'\n'}
                • Resource usage: Web browsers limit CPU/memory usage compared to native apps.{'\n'}
                • Offline capabilities: Service workers provide caching but are more limited than native offline storage.
              </Text>

              <Text style={styles.pwaInfoSubTitle}>🔋 Battery & Resources</Text>
              <Text style={styles.pwaInfoText}>
                • Battery optimization: PWAs cannot access native battery optimization features.{'\n'}
                • Background location: Cannot track location in background like native apps.
              </Text>

              <Text style={styles.pwaInfoSectionTitle}>Feature Limitations:</Text>

              <Text style={styles.pwaInfoSubTitle}>🎙️ Audio/Video Processing</Text>
              <Text style={styles.pwaInfoText}>
                • Real-time audio processing: Web Audio API is less powerful than native audio frameworks.{'\n'}
                • Video recording: Limited compared to native camera APIs.
              </Text>

              <Text style={styles.pwaInfoSubTitle}>📁 File Management</Text>
              <Text style={styles.pwaInfoText}>
                • Local file access: Cannot access full device file system.{'\n'}
                • Document picker: Limited file selection capabilities.
              </Text>

              <Text style={styles.pwaInfoSubTitle}>🔗 System Integration</Text>
              <Text style={styles.pwaInfoText}>
                • Deep linking: Less robust deep linking compared to native apps.{'\n'}
                • Share sheet: Cannot integrate with native share systems as seamlessly.
              </Text>

              <Text style={styles.pwaInfoSectionTitle}>User Experience Differences:</Text>

              <Text style={styles.pwaInfoSubTitle}>🎨 UI/UX</Text>
              <Text style={styles.pwaInfoText}>
                • Gestures: Some native gestures may not work the same way.{'\n'}
                • Status bar: Cannot control status bar appearance.{'\n'}
                • Navigation: Browser navigation (back button, etc.) may interfere.
              </Text>

              <Text style={styles.pwaInfoSubTitle}>🔒 Security & Permissions</Text>
              <Text style={styles.pwaInfoText}>
                • Permission model: Different permission dialogs and persistence.{'\n'}
                • Secure storage: Limited secure storage options compared to native keychains.
              </Text>

              <Text style={styles.pwaInfoSectionTitle}>Distribution & Updates:</Text>

              <Text style={styles.pwaInfoSubTitle}>📦 Updates</Text>
              <Text style={styles.pwaInfoText}>
                • Automatic updates: PWAs update when users refresh, not automatically like app stores.{'\n'}
                • Version control: Less control over when users get updates.
              </Text>

              <Text style={styles.pwaInfoSubTitle}>🌐 Browser Compatibility</Text>
              <Text style={styles.pwaInfoText}>
                • Feature support: Some features may not work in all browsers.{'\n'}
                • Performance: Performance varies significantly between browsers.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.pwaInfoCloseButton}
              onPress={() => setShowPwaInfoModal(false)}
            >
              <Text style={styles.pwaInfoCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatbotSelectorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  chatbotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  chatbotOptionEmoji: {
    fontSize: 24,
    marginRight: 15,
  },
  chatbotOptionText: {
    flex: 1,
  },
  chatbotOptionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  chatbotOptionDesc: {
    color: '#9ca3af',
    fontSize: 14,
  },
  chatbotCancelButton: {
    backgroundColor: '#6b7280',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  chatbotCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateTimeContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    alignItems: 'flex-end',
  },
  dateText: {
    color: '#ffff00',
    fontSize: 14,
    fontWeight: 'bold',
  },
  clockText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  versionContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  versionText: {
    color: '#6b7280',
    fontSize: 12,
  },
  pwaIndicatorText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 'bold' as const,
    marginTop: 2,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoTouchable: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 100,
    resizeMode: 'cover',
  },
  quoteContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  quoteSourceText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 5,
  },
  quoteText: {
    fontSize: 18,
    color: '#ffff00',
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 20,
    width: width * 0.9,
    maxWidth: 400,
  },
  calendarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  calendarNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  navButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  navButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  calendarHeaderText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    width: 7 * 40, // 7 columns * (36 width + 4 margin) = 280px
  },
  calendarScrollView: {
    maxHeight: height * 0.5,
    marginTop: 10,
  },
  weekContainer: {
    marginBottom: 5,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  dayNameContainer: {
    width: 100,
    alignItems: 'flex-start',
  },
  dayNameText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dayDateContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 10,
  },
  dayDateSelected: {
    backgroundColor: '#f59e0b',
  },
  dayDateWithNotes: {
    backgroundColor: '#10b981',
  },
  dayDateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayDateTextSelected: {
    color: '#000',
  },
  dayDateTextWithNotes: {
    color: '#fff',
  },
  dayNotesContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  notesScrollView: {
    flexDirection: 'row',
  },
  notePreview: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    maxWidth: 120,
  },
  notePreviewText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noNotesText: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
  },
  calendarDay: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 5,
    position: 'relative',
  },
  noteModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 20,
    width: width * 0.9,
    maxWidth: 400,
  },
  noteModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  noteTitleInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
  },
  noteTextInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    height: 120,
    marginBottom: 15,
  },
  noteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  noteModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#f59e0b',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calendarDaySelected: {
    backgroundColor: '#f59e0b',
  },
  calendarDayWithNotes: {
    backgroundColor: '#10b981',
  },
  calendarDayText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  calendarDayTextSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
  calendarDayTextWithNotes: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noteIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  calendarCloseButton: {
    backgroundColor: '#6b7280',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  calendarCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  movingDot: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotTouchable: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulsatingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8b4513',
    shadowColor: '#8b4513',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 6,
  },
  pwaInfoModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 20,
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height * 0.8,
  },
  pwaInfoModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  pwaInfoScrollView: {
    maxHeight: height * 0.6,
  },
  pwaInfoSectionTitle: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginTop: 15,
    marginBottom: 10,
  },
  pwaInfoSubTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold' as const,
    marginTop: 10,
    marginBottom: 5,
  },
  pwaInfoText: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  pwaInfoCloseButton: {
    backgroundColor: '#f59e0b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
    marginTop: 20,
  },
  pwaInfoCloseButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
});