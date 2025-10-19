import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  Share,
  TextInput,
  ScrollView,
  Image,
  Platform
} from 'react-native';
import { Note, getSettings, saveSettings } from '../utils/storage';
import { LANGUAGES } from '../components/SettingsPage';
import { useNotes } from '../hooks/useNotes';
import * as ImagePicker from 'expo-image-picker';

interface ManageNotesModalProps {
  visible: boolean;
  onClose: () => void;
}

interface FilterOptions {
  dateRange: 'all' | 'today' | 'before' | 'after';
  tags: string[];
  noteType: Note['noteType'] | 'all';
}

interface SortOptions {
  field: 'date' | 'title' | 'tag';
  direction: 'asc' | 'desc';
}

const ManageNotesModal: React.FC<ManageNotesModalProps> = ({ visible, onClose }) => {
  const { notes, removeNote, editNote, refreshNotes } = useNotes();
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'all',
    tags: [],
    noteType: 'all'
  });
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [showNoteDetail, setShowNoteDetail] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [tagFilterText, setTagFilterText] = useState('');
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([
    'vitals', 'medicine', 'events', 'activities', 'habits',
    'Work', 'Personal', 'Ideas', 'Health', 'Fitness', 'Nutrition', 'Sleep', 'Mood', 'Energy', 'Focus', 'Creativity'
  ]);
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>([]);
  // Always sort by date newest first
  const sortOptions = { field: 'date' as const, direction: 'desc' as const };
  const [searchText, setSearchText] = useState('');

  // Function to save custom tags to settings
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

  useEffect(() => {
    if (visible) {
      refreshNotes();
      setSelectedNotes(new Set());
      setShowNoteDetail(false);
      setSelectedNote(null);
      setSearchText('');
      // Load custom tags from settings and merge with default tags
      loadCustomTags();
      // Load enabled languages from settings
      loadEnabledLanguages();
    }
  }, [visible]); // Remove notes from dependency array to prevent infinite loop

  const loadCustomTags = async () => {
    try {
      const settings = await getSettings();
      const customTags = settings.customTags || [];
      const uniqueTags = Array.from(new Set(notes.flatMap(note => note.tags || [])));
      const defaultTags = [
        'vitals', 'medicine', 'events', 'activities', 'habits',
        'Work', 'Personal', 'Ideas', 'Health', 'Fitness', 'Nutrition', 'Sleep', 'Mood', 'Energy', 'Focus', 'Creativity'
      ];
      const allUniqueTags = Array.from(new Set([...defaultTags, ...uniqueTags, ...customTags]));
      setAllTags(allUniqueTags);
    } catch (error) {
      console.error('Error loading custom tags:', error);
      // Fallback to default behavior
      const uniqueTags = Array.from(new Set(notes.flatMap(note => note.tags || [])));
      const defaultTags = [
        'vitals', 'medicine', 'events', 'activities', 'habits',
        'Work', 'Personal', 'Ideas', 'Health', 'Fitness', 'Nutrition', 'Sleep', 'Mood', 'Energy', 'Focus', 'Creativity'
      ];
      const allUniqueTags = Array.from(new Set([...defaultTags, ...uniqueTags]));
      setAllTags(allUniqueTags);
    }
  };

  const loadEnabledLanguages = async () => {
    try {
      const settings = await getSettings();
      setEnabledLanguages(settings.enabledLanguages || ['en', 'lo', 'km', 'th', 'vi', 'zh', 'ja', 'ko', 'uk', 'fil']);
    } catch (error) {
      console.error('Error loading enabled languages:', error);
      setEnabledLanguages(['en', 'lo', 'km', 'th', 'vi', 'zh', 'ja', 'ko', 'uk', 'fil']);
    }
  };

  useEffect(() => {
    applyFiltersAndSort();
  }, [notes, filters, searchText]); // Removed sortOptions from dependencies since it's now constant

  const applyFiltersAndSort = () => {
    let filtered = [...notes];

    // Search filter - find closest matches
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      const scoredNotes = filtered.map(note => {
        const titleIndex = note.title.toLowerCase().indexOf(searchLower);
        const textIndex = note.text.toLowerCase().indexOf(searchLower);

        // Calculate relevance score (lower is better)
        let score = 999;
        if (titleIndex !== -1) {
          score = titleIndex; // Exact title matches get priority
        } else if (textIndex !== -1) {
          score = 100 + textIndex; // Content matches get lower priority
        }

        return { note, score };
      }).filter(item => item.score < 999) // Only include matches
        .sort((a, b) => a.score - b.score); // Sort by relevance

      filtered = scoredNotes.map(item => item.note);
    }

    // Date filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(note => {
        const noteDate = new Date(note.timestamp);

        switch (filters.dateRange) {
          case 'today':
            return noteDate >= today;
          case 'before':
            return noteDate < today;
          case 'after':
            return noteDate >= today;
          default:
            return true;
        }
      });
    }

    // Tag filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(note =>
        filters.tags.some(tag => (note.tags || []).includes(tag))
      );
    }

    // Note type filter
    if (filters.noteType !== 'all') {
      filtered = filtered.filter(note => note.noteType === filters.noteType);
    }

    // Always sort by date newest first
    filtered.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime;
    });

    setFilteredNotes(filtered);
  };

  const handleSelectAll = () => {
    if (selectedNotes.size === filteredNotes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(filteredNotes.map(note => note.id)));
    }
  };

  const handleNoteSelect = (noteId: string) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    setSelectedNotes(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedNotes.size === 0) return;

    Alert.alert(
      'Delete Notes',
      `Delete ${selectedNotes.size} selected note${selectedNotes.size > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const noteId of selectedNotes) {
                await removeNote(noteId);
              }
              setSelectedNotes(new Set());
              refreshNotes();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete notes');
            }
          }
        }
      ]
    );
  };

  const handleSaveSelected = async () => {
    if (selectedNotes.size === 0) return;

    try {
      const notesToSave = notes.filter(note => selectedNotes.has(note.id));

      const jsonBlob = JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        notes: notesToSave
      }, null, 2);

      if (Platform.OS === 'web') {
        // For web, download the file
        const blob = new Blob([jsonBlob], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trip42_notes_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // For native, use Share API
        await Share.share({
          message: jsonBlob,
          title: `Trip42 Notes Export - ${notesToSave.length} notes`
        });
      }

      Alert.alert('Success', 'Notes exported successfully!');
    } catch (error) {
      console.error('Error saving notes:', error);
      Alert.alert('Error', 'Failed to export notes');
    }
  };

  const handleShareSelected = async () => {
    if (selectedNotes.size === 0) return;

    try {
      const notesToShare = notes.filter(note => selectedNotes.has(note.id));

      // Create JSON blob first
      await handleSaveSelected();

      // Then share via Telegram (placeholder - would need Telegram sharing implementation)
      Alert.alert('Share', 'Notes saved and ready to share via Telegram!');
    } catch (error) {
      console.error('Error sharing notes:', error);
      Alert.alert('Error', 'Failed to share notes');
    }
  };

  const handleNotePress = (note: Note) => {
    if (selectedNotes.size > 0) {
      // In select mode, only checkbox should select/deselect
      // Do nothing on note press - user must tap checkbox specifically
    } else {
      setSelectedNote(note);
      setShowNoteDetail(true);
    }
  };

  const handleAddMediaToNote = async () => {
    if (!selectedNote) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Media library permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const mediaUri = result.assets[0].uri;
        const updatedNote = {
          ...selectedNote,
          attachedMedia: [...selectedNote.attachedMedia, mediaUri]
        };

        await editNote(updatedNote);
        setSelectedNote(updatedNote);
        refreshNotes();
      }
    } catch (error) {
      console.error('Error adding media:', error);
      Alert.alert('Error', 'Failed to add media');
    }
  };

  const handleSaveMediaFromNote = async (mediaUri: string) => {
    try {
      if (Platform.OS === 'web') {
        // For web, trigger download
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trip42_media_${Date.now()}.${mediaUri.includes('.mp3') ? 'mp3' : 'jpg'}`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // For native, use Share API to share the media
        await Share.share({
          url: mediaUri,
          title: 'Trip42 Media'
        });
      }
      Alert.alert('Success', 'Media shared/saved successfully!');
    } catch (error) {
      console.error('Error saving media:', error);
      Alert.alert('Error', 'Failed to save/share media');
    }
  };

  const handleShareNote = async () => {
    if (!selectedNote) return;

    try {
      let message = `${selectedNote.title}\n\n${selectedNote.text}`;

      // Include original text if it's a Zaphod note
      if (selectedNote.noteType === 'zaphod_note' && selectedNote.originalText) {
        message += `\n\nOriginal: ${selectedNote.originalText}`;
      }

      if ((selectedNote.tags || []).length > 0) {
        message += `\n\nTags: ${(selectedNote.tags || []).map(tag => `#${tag}`).join(' ')}`;
      }

      // Include location if available and user preference allows
      if (selectedNote.location) {
        // Check location permission setting
        const settings = await getSettings();
        if (settings.locationPermission === 'always') {
          message += `\n\nLocation: ${selectedNote.location.latitude.toFixed(4)}, ${selectedNote.location.longitude.toFixed(4)}`;
        }
      }

      await Share.share({
        message,
        title: `Shared note from Trip42: ${selectedNote.title}`
      });
    } catch (error) {
      console.error('Error sharing note:', error);
      Alert.alert('Error', 'Failed to share note');
    }
  };

  const handleDeleteNote = () => {
    if (!selectedNote) return;

    Alert.alert(
      'Delete Note',
      'Delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeNote(selectedNote.id);
              setShowNoteDetail(false);
              setSelectedNote(null);
              refreshNotes();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete note');
            }
          }
        }
      ]
    );
  };

  const getTypeIcon = (type: Note['noteType']) => {
    switch (type) {
      case 'voice_recording': return '🎙️';
      case 'sign_translation': return '📷';
      case 'photo_translation': return '🖼️';
      case 'zaphod_note': return '🤖';
      case 'ford_note': return '🚀';
      case 'arthur_note': return '👔';
      case 'marvin_note': return '😔';
      case 'archive': return '📦';
      default: return '📝';
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const renderNoteItem = ({ item }: { item: Note }) => {
    const isSelected = selectedNotes.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.noteItem, isSelected && styles.noteItemSelected]}
        onPress={() => handleNotePress(item)}
      >
        <View style={styles.noteHeader}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => handleNoteSelect(item.id)}
          >
            <Text style={styles.checkboxText}>{isSelected ? '☑' : '□'}</Text>
          </TouchableOpacity>

          <View style={styles.noteInfo}>
            <View style={styles.noteTitleRow}>
              <Text style={styles.typeIcon}>{getTypeIcon(item.noteType)}</Text>
              <Text style={styles.noteTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
            <Text style={styles.noteDate}>{formatDate(item.timestamp)}</Text>
          </View>

          <TouchableOpacity
            style={styles.mediaIndicator}
            onPress={() => handleNotePress(item)}
          >
            <Text style={styles.mediaText}>
              {item.attachedMedia && item.attachedMedia.length > 0 ? `📎 ${item.attachedMedia.length}` : '📄'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.notePreview} numberOfLines={2}>
          {item.text}
        </Text>

        {(item.tags || []).length > 0 && (
          <View style={styles.tagsContainer}>
            {(item.tags || []).slice(0, 3).map(tag => (
              <Text key={tag} style={styles.tag}>
                #{tag}
              </Text>
            ))}
            {(item.tags || []).length > 3 && (
              <Text style={styles.moreTags}>+{(item.tags || []).length - 3}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderNoteDetail = () => {
    if (!selectedNote) return null;

    return (
      <Modal visible={showNoteDetail} animationType="slide" onRequestClose={() => setShowNoteDetail(false)}>
        <View style={styles.detailContainer}>
          <ScrollView style={styles.detailContent}>
            {/* Note Text - Display first */}
            <Text style={styles.noteText}>{selectedNote.text}</Text>

            {/* Original Text if different */}
            {selectedNote.originalText && selectedNote.originalText !== selectedNote.text && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Original:</Text>
                <Text style={styles.originalText}>{selectedNote.originalText}</Text>
              </View>
            )}

            {/* Polished Text if different */}
            {selectedNote.polishedText && selectedNote.polishedText !== selectedNote.text && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Polished:</Text>
                <Text style={styles.polishedText}>{selectedNote.polishedText}</Text>
              </View>
            )}

            {/* Translations */}
            {selectedNote.translations && Object.keys(selectedNote.translations).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Translations:</Text>
                {Object.entries(selectedNote.translations).map(([lang, text]) => (
                  <View key={lang} style={styles.translationItem}>
                    <Text style={styles.translationLang}>{lang}:</Text>
                    <Text style={styles.translationText}>{text}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Media Section */}
            {selectedNote.attachedMedia && selectedNote.attachedMedia.length > 0 && (
              <View style={styles.mediaSection}>
                <Text style={styles.sectionTitle}>Media:</Text>
                {selectedNote.attachedMedia.map((mediaUri, index) => (
                  <View key={index} style={styles.mediaItem}>
                    {mediaUri.includes('.mp3') || mediaUri.includes('.wav') ? (
                      <View style={styles.audioItem}>
                        <Text style={styles.audioIndicator}>🎵 Audio File</Text>
                        <TouchableOpacity
                          style={styles.playButton}
                          onPress={() => {
                            // TODO: Implement audio playback
                            Alert.alert('Play', 'Audio playback not implemented yet');
                          }}
                        >
                          <Text style={styles.playButtonText}>▶️ Play</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.imageItem}>
                        <Image source={{ uri: mediaUri }} style={styles.mediaImage} />
                        <TouchableOpacity
                          style={styles.saveMediaButton}
                          onPress={() => handleSaveMediaFromNote(mediaUri)}
                        >
                          <Text style={styles.saveMediaText}>💾 Save</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Tags */}
            {(selectedNote.tags || []).length > 0 && (
              <View style={styles.tagsSection}>
                <Text style={styles.sectionTitle}>Tags:</Text>
                <View style={styles.tagsContainer}>
                  {(selectedNote.tags || []).map(tag => (
                    <Text key={tag} style={styles.tag}>
                      #{tag}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {/* Timestamp */}
            <Text style={styles.timestamp}>
              Created: {new Date(selectedNote.timestamp).toLocaleString()}
            </Text>
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.bottomActionButton} onPress={() => setShowNoteDetail(false)}>
              <Text style={styles.bottomActionText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomActionButton} onPress={() => {
              Alert.alert(
                'Add to Note',
                'Choose what to add:',
                [
                  { text: 'Photo', onPress: handleAddMediaToNote },
                  { text: 'Tag', onPress: () => {
                    // TODO: Implement tag addition
                    Alert.alert('Tag', 'Tag addition not implemented yet');
                  }},
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}>
              <Text style={styles.bottomActionText}>📎 Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomActionButton} onPress={() => {
              Alert.alert(
                'Share note to Telegram',
                'Share this note to Telegram?',
                [
                  { text: 'Share', onPress: async () => {
                    try {
                      let message = `${selectedNote.title}\n\n${selectedNote.text}`;

                      if ((selectedNote.tags || []).length > 0) {
                        message += `\n\nTags: ${(selectedNote.tags || []).map(tag => `#${tag}`).join(' ')}`;
                      }

                      // For now, just share text. Media sharing would need more complex implementation
                      await Share.share({
                        message,
                        title: `Shared note from Trip42: ${selectedNote.title}`
                      });
                    } catch (error) {
                      console.error('Error sharing note:', error);
                      Alert.alert('Error', 'Failed to share note');
                    }
                  }},
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}>
              <Text style={styles.bottomActionText}>📤 Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomActionButton} onPress={() => {
              // TODO: Implement more options
              Alert.alert('More', 'More options not implemented yet');
            }}>
              <Text style={styles.bottomActionText}>⋯ More</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manage Notes</Text>
          <View />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title or content..."
            placeholderTextColor="#6b7280"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.filtersRow}>
            {/* Period Filter Dropdown */}
            <TouchableOpacity
              style={styles.filterDropdown}
              onPress={() => {
                setShowPeriodSelector(!showPeriodSelector);
                setShowTagSelector(false);
              }}
            >
              <Text style={styles.filterDropdownText}>
                {filters.dateRange === 'all' ? 'All Periods' :
                 filters.dateRange === 'today' ? 'Today' :
                 filters.dateRange === 'before' ? `Before ${selectedDate.toLocaleDateString()}` :
                 filters.dateRange === 'after' ? `After ${selectedDate.toLocaleDateString()}` : 'All Periods'}
              </Text>
              <Text style={styles.filterDropdownArrow}>{!showPeriodSelector ? '▼' : '▲'}</Text>
            </TouchableOpacity>

            {/* Tags Filter Dropdown */}
            <TouchableOpacity
              style={styles.filterDropdown}
              onPress={() => {
                setShowTagSelector(!showTagSelector);
                setShowPeriodSelector(false);
              }}
            >
              <Text style={styles.filterDropdownText}>
                {filters.tags.length > 0 ? `${filters.tags.length} tags selected` : 'All Tags'}
              </Text>
              <Text style={styles.filterDropdownArrow}>{!showTagSelector ? '▼' : '▲'}</Text>
            </TouchableOpacity>
          </View>

          {showTagSelector && (
            <View style={styles.tagSelectorDropdown}>
              <ScrollView style={styles.tagList}>
                {/* Period Options */}
                <TouchableOpacity
                  style={[styles.tagOption, filters.dateRange === 'all' && styles.tagOptionSelected]}
                  onPress={() => setFilters(prev => ({ ...prev, dateRange: 'all' }))}
                >
                  <Text style={[styles.tagOptionText, filters.dateRange === 'all' && styles.tagOptionTextSelected]}>
                    📅 All Periods
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tagOption, filters.dateRange === 'today' && styles.tagOptionSelected]}
                  onPress={() => setFilters(prev => ({ ...prev, dateRange: 'today' }))}
                >
                  <Text style={[styles.tagOptionText, filters.dateRange === 'today' && styles.tagOptionTextSelected]}>
                    📆 Today
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tagOption, filters.dateRange === 'before' && styles.tagOptionSelected]}
                  onPress={() => setFilters(prev => ({ ...prev, dateRange: 'before' }))}
                >
                  <Text style={[styles.tagOptionText, filters.dateRange === 'before' && styles.tagOptionTextSelected]}>
                    ⏪ Before
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tagOption, filters.dateRange === 'after' && styles.tagOptionSelected]}
                  onPress={() => setFilters(prev => ({ ...prev, dateRange: 'after' }))}
                >
                  <Text style={[styles.tagOptionText, filters.dateRange === 'after' && styles.tagOptionTextSelected]}>
                    ⏩ After
                  </Text>
                </TouchableOpacity>

                {/* Separator */}
                <View style={styles.filterSeparator} />

                {/* Tag Options */}
                {allTags.map(tag => {
                  // Define icons for permanent tags
                  const permanentTagIcons: { [key: string]: string } = {
                    'vitals': '❤️',
                    'medicine': '💊',
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

                  const icon = permanentTagIcons[tag] || '🏷️';

                  return (
                    <TouchableOpacity
                      key={`tag-${tag}`}
                      style={[styles.tagOption, filters.tags.includes(tag) && styles.tagOptionSelected]}
                      onPress={() => {
                        const newTags = filters.tags.includes(tag)
                          ? filters.tags.filter(t => t !== tag)
                          : [...filters.tags, tag];
                        setFilters(prev => ({ ...prev, tags: newTags }));
                      }}
                    >
                      <Text style={[styles.tagOptionText, filters.tags.includes(tag) && styles.tagOptionTextSelected]}>
                        {icon} {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TextInput
                style={styles.customTagInput}
                placeholder="Add custom tag"
                placeholderTextColor="#6b7280"
                value={tagFilterText}
                onChangeText={setTagFilterText}
                onSubmitEditing={() => {
                  if (tagFilterText.trim()) {
                    const newTag = tagFilterText.trim();
                    if (!allTags.includes(newTag)) {
                      setAllTags(prev => [...prev, newTag]);
                      // Save custom tag to settings
                      saveCustomTag(newTag);
                    }
                    if (!filters.tags.includes(newTag)) {
                      setFilters(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
                    }
                    setTagFilterText('');
                  }
                }}
              />
            </View>
          )}
        </View>

        {/* Selection Header */}
        <View style={styles.selectionHeader}>
          <TouchableOpacity style={styles.selectButton} onPress={handleSelectAll}>
            <Text style={styles.selectText}>
              {selectedNotes.size === filteredNotes.length && filteredNotes.length > 0 ? '☑' : '□'} Select ({filteredNotes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notes List */}
        <FlatList
          data={filteredNotes}
          renderItem={renderNoteItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

        {renderNoteDetail()}
      </View>
    </Modal>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  closeButton: {
    fontSize: 24,
    color: '#f59e0b',
    fontWeight: 'bold' as const,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#fff',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  filtersScroll: {
    marginBottom: 10,
  },
  filterButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#f59e0b',
  },
  filterText: {
    color: '#d1d5db',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#000',
    fontWeight: 'bold' as const,
  },
  filterInputs: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
    marginRight: 10,
  },
  typeFilter: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  typeFilterActive: {
    backgroundColor: '#f59e0b',
  },
  typeFilterText: {
    color: '#d1d5db',
    fontSize: 14,
  },
  typeFilterTextActive: {
    color: '#000',
    fontWeight: 'bold' as const,
  },
  selectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  selectButton: {
    flex: 1,
  },
  selectText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  actionButtons: {
    flexDirection: 'row' as const,
  },
  actionButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  deleteButtonText: {
    color: '#fff',
  },
  listContainer: {
    padding: 10,
  },
  noteItem: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  noteItemSelected: {
    borderColor: '#f59e0b',
    backgroundColor: '#2d3748',
  },
  noteHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 10,
  },
  checkboxText: {
    fontSize: 18,
  },
  noteInfo: {
    flex: 1,
  },
  noteTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#fff',
    flex: 1,
  },
  noteDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  mediaIndicator: {
    marginLeft: 10,
  },
  mediaText: {
    fontSize: 14,
    color: '#f59e0b',
  },
  notePreview: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },
  tag: {
    fontSize: 12,
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  moreTags: {
    fontSize: 12,
    color: '#6b7280',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  detailHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    fontSize: 18,
    color: '#f59e0b',
    fontWeight: 'bold' as const,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#fff',
    flex: 1,
    textAlign: 'center' as const,
  },
  detailActions: {
    flexDirection: 'row' as const,
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  noteText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    marginBottom: 20,
  },
  mediaSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#f59e0b',
    marginBottom: 10,
  },
  mediaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
    backgroundColor: '#1f2937',
    padding: 10,
    borderRadius: 8,
  },
  mediaImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  audioIndicator: {
    fontSize: 16,
    color: '#f59e0b',
    marginRight: 10,
  },
  saveMediaButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveMediaText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  tagsSection: {
    marginBottom: 20,
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic' as const,
  },
  tagSelectorButton: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginRight: 10,
  },
  tagSelectorText: {
    color: '#f59e0b',
    fontSize: 14,
    flex: 1,
  },
  tagSelectorArrow: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  tagSelectorDropdown: {
    position: 'absolute' as const,
    top: '100%' as const,
    left: 0,
    right: 0,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    zIndex: 1000,
    maxHeight: 200,
  },
  tagList: {
    maxHeight: 150,
  },
  tagOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  tagOptionSelected: {
    backgroundColor: '#f59e0b',
  },
  tagOptionText: {
    color: '#d1d5db',
    fontSize: 14,
  },
  tagOptionTextSelected: {
    color: '#000',
    fontWeight: 'bold' as const,
  },
  customTagInput: {
    backgroundColor: '#374151',
    borderRadius: 5,
    padding: 8,
    color: '#fff',
    fontSize: 14,
    margin: 10,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  searchInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  sortContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
  },
  sortLabel: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold' as const,
    marginRight: 10,
  },
  sortButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  sortButtonActive: {
    backgroundColor: '#f59e0b',
  },
  sortButtonText: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  sortButtonTextActive: {
    color: '#000',
  },
  section: {
    marginBottom: 20,
  },
  originalText: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic' as const,
  },
  polishedText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  translationItem: {
    marginBottom: 10,
  },
  translationLang: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold' as const,
    marginBottom: 5,
  },
  translationText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  audioItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: '#1f2937',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  playButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  playButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  imageItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#1f2937',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  bottomActions: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: '#000',
  },
  bottomActionButton: {
    padding: 10,
    alignItems: 'center' as const,
  },
  bottomActionText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  deleteActionButton: {
    backgroundColor: '#dc2626',
    borderRadius: 6,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  filtersRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  filterDropdown: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginHorizontal: 5,
  },
  filterDropdownText: {
    color: '#f59e0b',
    fontSize: 14,
  },
  filterDropdownArrow: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  filterSeparator: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 10,
  },
};

export default ManageNotesModal;