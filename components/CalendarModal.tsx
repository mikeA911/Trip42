import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Dimensions, StyleSheet, TextInput } from 'react-native';

const { width, height } = Dimensions.get('window');

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  savedNotes?: any[];
  onSaveNote?: (note: any) => void;
  onNavigateToNotes?: () => void;
}

export default function CalendarModal({
  visible,
  onClose,
  savedNotes = [],
  onSaveNote,
  onNavigateToNotes
}: CalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<ScrollView>(null);

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getMonthsToShow = () => {
    const months = [];
    for (let i = -1; i <= 1; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i);
      months.push(date);
    }
    return months;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  useEffect(() => {
    if (scrollContainerRef.current && visible) {
      // Scroll to center the current month (middle position)
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({ x: width * 0.8, animated: false });
      }, 100);
    }
  }, [visible]);

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date | null) => {
    if (!selectedDate || !date) return false;
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const hasNotesForDate = (date: Date | null) => {
    if (!date) return false;
    const dateString = date.toDateString();
    return savedNotes.some(note => {
      const noteDate = new Date(note.timestamp);
      return noteDate.toDateString() === dateString;
    });
  };

  const getNotesForDate = (date: Date | null) => {
    if (!date) return [];
    const dateString = date.toDateString();
    return savedNotes.filter(note => {
      const noteDate = new Date(note.timestamp);
      return noteDate.toDateString() === dateString;
    });
  };

  const handleDateClick = (date: Date | null) => {
    if (!date) return;

    const notes = getNotesForDate(date);
    if (notes.length > 0) {
      // Show notes modal
      setSelectedDate(date);
      // For now, just navigate to notes or show alert
      if (onNavigateToNotes) {
        onNavigateToNotes();
        onClose();
      }
    } else {
      // Allow creating note for any date (past, present, or future)
      setSelectedDate(date);
      setShowNoteModal(true);
    }
  };

  const saveNote = () => {
    if (!selectedDate || !onSaveNote) return;

    const now = new Date();
    const isFutureDate = selectedDate > now;
    const isPastDate = selectedDate < now && selectedDate.toDateString() !== now.toDateString();

    const newNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      title: noteTitle,
      text: noteText,
      timestamp: selectedDate.toISOString(),
      tags: isFutureDate ? ['plan'] : isPastDate ? ['memory'] : [],
      noteType: 'text_note' as const,
      isSynced: false,
      translations: {},
      attachedMedia: []
    };

    onSaveNote(newNote);
    setShowNoteModal(false);
    setSelectedDate(null);
    setNoteTitle('');
    setNoteText('');
  };

  const cancelNote = () => {
    setShowNoteModal(false);
    setSelectedDate(null);
    setNoteTitle('');
    setNoteText('');
  };

  const isCurrentMonth = (monthDate: Date) => {
    return monthDate.getMonth() === currentDate.getMonth() &&
           monthDate.getFullYear() === currentDate.getFullYear();
  };

  const months = getMonthsToShow();

  const getTitleText = () => {
    const monthWidth = width * 0.8;
    const currentMonthIndex = Math.round(scrollPosition / monthWidth);

    if (currentMonthIndex === 0) {
      // Leftmost position - showing previous and current month
      const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
      const currMonth = currentDate;
      return `${monthNames[prevMonth.getMonth()]} - ${monthNames[currMonth.getMonth()]}`;
    } else if (currentMonthIndex === 1) {
      // Center position - showing current month
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (currentMonthIndex === 2) {
      // Rightmost position - showing current and next month
      const currMonth = currentDate;
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
      return `${monthNames[currMonth.getMonth()]} - ${monthNames[nextMonth.getMonth()]}`;
    }

    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Date</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={{ fontSize: 24, color: '#666' }}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.navigation}>
              <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
                <Text style={{ fontSize: 24, color: '#777' }}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {getTitleText()}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                <Text style={{ fontSize: 24, color: '#777' }}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dayNames}>
              {dayNames.map(day => (
                <Text key={day} style={styles.dayName}>{day}</Text>
              ))}
            </View>

            <ScrollView
              ref={scrollContainerRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.calendarScroll}
              onScroll={(event) => {
                const scrollX = event.nativeEvent.contentOffset.x;
                setScrollPosition(scrollX);
              }}
              scrollEventThrottle={16}
            >
              {months.map((monthDate, monthIdx) => {
                const days = getDaysInMonth(monthDate);
                const isCurrent = isCurrentMonth(monthDate);

                return (
                  <View
                    key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
                    style={[
                      styles.monthContainer,
                      { opacity: isCurrent ? 1 : 0.5 }
                    ]}
                  >
                    <View style={styles.grid}>
                      {days.map((date, idx) => {
                        const hasNotes = hasNotesForDate(date);
                        const today = isToday(date);
                        const selected = isSelected(date);

                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => handleDateClick(date)}
                            disabled={!date}
                            style={[
                              styles.dayButton,
                              !date && styles.dayButtonDisabled,
                              today && styles.dayButtonToday,
                              selected && styles.dayButtonSelected,
                              date && !today && !selected && styles.dayButtonDefault
                            ]}
                          >
                            <Text style={[
                              styles.dayText,
                              today && styles.dayTextToday,
                              selected && styles.dayTextSelected,
                              hasNotes && styles.dayTextWithNotes
                            ]}>
                              {date ? date.getDate() : ''}
                            </Text>
                            {hasNotes && (
                              <View style={styles.noteDot} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {selectedDate && (
              <View style={styles.selectedDateContainer}>
                <Text style={styles.selectedDateLabel}>Selected Date:</Text>
                <Text style={styles.selectedDateText}>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (selectedDate) {
                    onClose();
                  }
                }}
                disabled={!selectedDate}
                style={[styles.confirmButton, !selectedDate && styles.confirmButtonDisabled]}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNoteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelNote}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.noteModalContent}>
            <Text style={styles.noteModalTitle}>
              Create Note for {selectedDate?.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>

            <Text style={styles.noteTitleLabel}>Title:</Text>
            <TextInput
              style={styles.noteTitleInput}
              placeholder="Note Title"
              value={noteTitle}
              onChangeText={setNoteTitle}
            />

            <Text style={styles.noteTextLabel}>Content:</Text>
            <TextInput
              style={styles.noteTextInput}
              placeholder="Note content..."
              value={noteText}
              onChangeText={setNoteText}
              multiline={true}
              textAlignVertical="top"
            />

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
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height * 0.8,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dayNames: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  dayName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    width: 32,
    textAlign: 'center',
  },
  calendarScroll: {
    maxHeight: 300,
  },
  monthContainer: {
    width: width * 0.8,
    paddingHorizontal: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: 7 * 36, // 7 days * (32 width + 4 margin) = 252
  },
  dayButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 16,
    position: 'relative',
  },
  dayButtonDisabled: {
    backgroundColor: 'transparent',
  },
  dayButtonToday: {
    backgroundColor: '#dbeafe',
  },
  dayButtonSelected: {
    backgroundColor: '#3b82f6',
  },
  dayButtonDefault: {
    backgroundColor: 'transparent',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  dayTextToday: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayTextWithNotes: {
    color: '#059669',
  },
  noteDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  selectedDateContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedDateLabel: {
    fontSize: 12,
    color: '#666',
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
  noteTitleLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  noteTitleInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
  },
  noteTextLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
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
  saveButton: {
    backgroundColor: '#f59e0b',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});