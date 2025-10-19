import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, Image, Text, Modal, ScrollView, Alert, Dimensions, StyleSheet } from 'react-native';
import { PanGestureHandler, State, PanGestureHandlerGestureEvent, PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import { QUOTES } from '../constants/quotes';
import { ChatbotModal } from './ChatbotModal';

const { width, height } = Dimensions.get('window');

const LANDING_IMAGES = [
  require('../assets/splash-icon.png'), // Trip42 logo
  require('../public/icons/arturDent.png'),
  require('../public/icons/Ford.png'),
  require('../public/icons/marvin.png'),
  require('../public/icons/Zaphod.png'),
];

interface LandingPageProps {
  onNavigateToNotes: () => void;
  onNavigateToRecord: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToNotes,
  onNavigateToRecord
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [spinCount, setSpinCount] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentQuote, setCurrentQuote] = useState('');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showChatbot, setShowChatbot] = useState(false);
  const [isQuoteMode, setIsQuoteMode] = useState(false);

  const spinValue = useRef(new Animated.Value(0)).current;
  const pulsateValue = useRef(new Animated.Value(1)).current;

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Pulsating animation for the red dot
  useEffect(() => {
    const pulsateAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsateValue, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulsateValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulsateAnimation.start();

    return () => pulsateAnimation.stop();
  }, [pulsateValue]);


  // Remove automatic quote cycling - quotes only show after spins

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setCurrentQuote('');
    setSpinCount(prev => prev + 1);

    // Simple spin animation
    Animated.timing(spinValue, {
      toValue: 1080, // 3 full spins
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      spinValue.setValue(0); // Reset for next spin
      // Always default to trip42 icon
      let nextIndex = 0;
      if (isQuoteMode) {
        // Return to trip42 icon on next spin after quote
        setIsQuoteMode(false);
      }
      setCurrentImageIndex(nextIndex);
      setIsSpinning(false);

      // Show random quote after 4-9 spins
      const minSpins = 4;
      const maxSpins = 9;
      const randomSpinThreshold = Math.floor(Math.random() * (maxSpins - minSpins + 1)) + minSpins;

      if (spinCount >= randomSpinThreshold - 1) {
        const randomIndex = Math.floor(Math.random() * QUOTES.length);
        setCurrentQuote(QUOTES[randomIndex]);
        setSpinCount(0);
        // Change to random avatar when quote is displayed
        const avatarIndices = [1, 2, 3, 4]; // Indices of avatar images (excluding trip42)
        const randomAvatarIndex = avatarIndices[Math.floor(Math.random() * avatarIndices.length)];
        setCurrentImageIndex(randomAvatarIndex);
        setIsQuoteMode(true);
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
    const existingNotes = [] as any[]; // We'll need to pass savedNotes as prop

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

    // Navigate to text input mode
    onNavigateToRecord();

    setShowCalendar(false);
  };

  const hasNotesForDate = (year: number, month: number, day: number) => {
    const dateString = new Date(year, month, day).toDateString();
    // We'll need to pass savedNotes as prop to check this
    return false; // Placeholder
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
      {/* Pulsating Red Dot */}
      <Animated.View
        style={[styles.movingDot, {
          left: 20,
          top: 50,
          transform: [{
            scale: pulsateValue
          }]
        }]}
      >
        <TouchableOpacity
          style={styles.dotTouchable}
          onPress={() => setShowChatbot(true)}
        >
          <View style={styles.pulsatingDot} />
        </TouchableOpacity>
      </Animated.View>

      {/* Date and Clock in top right corner - clickable */}
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

      {/* Version in bottom right corner */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>v0.9</Text>
      </View>

      {/* Spinning Logo */}
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
              <Animated.Image
                source={LANDING_IMAGES[currentImageIndex]}
                style={[
                  styles.logo,
                  {
                    transform: [{
                      rotateY: spinValue.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }
                ]}
                resizeMode="cover"
              />
            </View>
          </TouchableOpacity>
        </View>
      </PanGestureHandler>

      {/* Quote Display */}
      {currentQuote && (
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteText}>"{currentQuote}"</Text>
        </View>
      )}

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            <Text style={styles.calendarTitle}>
              {calendarDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </Text>

            {/* Month Navigation */}
            <View style={styles.calendarNavigation}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth(-1)}
              >
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth(1)}
              >
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.calendarHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.calendarHeaderText}>{day}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {getDaysInMonth(calendarDate).map((day, index) => {
                const hasNotes = day && hasNotesForDate(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                const isSelected = day === currentTime.getDate() &&
                  calendarDate.getMonth() === currentTime.getMonth() &&
                  calendarDate.getFullYear() === currentTime.getFullYear();

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      ...(isSelected ? [styles.calendarDaySelected] : []),
                      ...(hasNotes && !isSelected ? [styles.calendarDayWithNotes] : [])
                    ]}
                    onPress={() => day && selectDate(day)}
                    disabled={!day}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      ...(isSelected ? [styles.calendarDayTextSelected] : []),
                      ...(hasNotes && !isSelected ? [styles.calendarDayTextWithNotes] : [])
                    ]}>
                      {day || ''}
                    </Text>
                    {hasNotes && !isSelected && (
                      <View style={styles.noteIndicator} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.calendarCloseButton}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.calendarCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Chatbot Modal */}
      <ChatbotModal
        visible={showChatbot}
        onClose={() => setShowChatbot(false)}
      />
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
  },
  versionText: {
    color: '#6b7280',
    fontSize: 12,
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
    justifyContent: 'space-around',
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 5,
  },
  calendarDaySelected: {
    backgroundColor: '#f59e0b',
  },
  calendarDayWithNotes: {
    backgroundColor: '#10b981',
  },
  calendarDayText: {
    color: '#fff',
    fontSize: 16,
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
});