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
  Platform,
  Linking
} from 'react-native';
import { Note, getSettings, saveSettings, saveNote } from '../utils/storage';
import { LANGUAGES } from '../components/SettingsPage';
import { useNotes } from '../hooks/useNotes';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { supabase, uploadImageForSharing } from '../supabase';
import { polishNoteWithGemini } from '../services/geminiService';

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
  const [enabledTags, setEnabledTags] = useState<string[]>([]);
  const [showTagSelectorModal, setShowTagSelectorModal] = useState(false);
  const [selectedTagsForNote, setSelectedTagsForNote] = useState<string[]>([]);
  const [showMoreOptionsModal, setShowMoreOptionsModal] = useState(false);
  const [showEditPolishedTextModal, setShowEditPolishedTextModal] = useState(false);
  const [editingPolishedText, setEditingPolishedText] = useState('');
  const [isCreatingPolishedNote, setIsCreatingPolishedNote] = useState(false);
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
      // Load enabled tags from settings
      loadEnabledTags();
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
      setEnabledLanguages(['en', 'lo', 'km', 'th', 'vi', 'zh', 'ja', 'ko', 'uk', 'fil']);
    }
  };

  const loadEnabledTags = async () => {
    try {
      const settings = await getSettings();
      setEnabledTags(settings.enabledTags || []);
    } catch (error) {
      setEnabledTags([]);
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

  const handleExportSelected = async () => {
    if (selectedNotes.size === 0) return;

    try {
      const notesToExport = notes.filter(note => selectedNotes.has(note.id));

      // Create IKE file format for each note
      const exportPromises = notesToExport.map(async (note) => {
        const exportNote = { ...note };

        // Process attached media - convert URIs to base64 blobs
        if (exportNote.attachedMedia && exportNote.attachedMedia.length > 0) {
          const processedMedia: string[] = [];

          for (let i = 0; i < exportNote.attachedMedia.length; i++) {
            const mediaUri = exportNote.attachedMedia[i];

            try {
              let base64Data: string;

              if (Platform.OS === 'web') {
                // For web, fetch the blob and convert to base64
                const response = await fetch(mediaUri);
                const blob = await response.blob();
                base64Data = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = () => reject(new Error('FileReader failed'));
                  reader.readAsDataURL(blob);
                });
              } else {
                // For native, read file as base64
                const rawBase64 = await FileSystem.readAsStringAsync(mediaUri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                const isAudio = mediaUri.includes('.mp3') || mediaUri.includes('.wav') || mediaUri.includes('.m4a');
                const mimeType = isAudio ? 'audio/mpeg' : 'image/jpeg';
                base64Data = `data:${mimeType};base64,${rawBase64}`;
              }

              processedMedia.push(base64Data);
            } catch (mediaError) {
              processedMedia.push(mediaUri); // Keep original URI if processing fails
            }
          }

          exportNote.attachedMedia = processedMedia;
        }

        return exportNote;
      });

      const processedNotes = await Promise.all(exportPromises);

      if (Platform.OS === 'web') {
        // For web, create individual .ike files or a zip
        if (processedNotes.length === 1) {
          // Single note - download as .ike file
          const noteJson = JSON.stringify(processedNotes[0], null, 2);
          const blob = new Blob([noteJson], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${processedNotes[0].title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ike`;
          a.click();
          URL.revokeObjectURL(url);
          Alert.alert('Success', `Note exported as ${processedNotes[0].title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ike`);
        } else {
          // Multiple notes - create a collection file
          const collectionData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            notes: processedNotes
          };
          const jsonBlob = JSON.stringify(collectionData, null, 2);
          const blob = new Blob([jsonBlob], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `trip42_notes_${new Date().toISOString().split('T')[0]}.ike`;
          a.click();
          URL.revokeObjectURL(url);
          Alert.alert('Success', `${processedNotes.length} notes exported as collection!`);
        }
      } else {
        // For native platforms
        if (processedNotes.length === 1) {
          // Single note - save as .ike file
          const noteJson = JSON.stringify(processedNotes[0], null, 2);
          const fileName = `${processedNotes[0].title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ike`;

          try {
            const documentsDir = FileSystem.documentDirectory;
            if (documentsDir) {
              const fileUri = `${documentsDir}${fileName}`;
              await FileSystem.writeAsStringAsync(fileUri, noteJson, {
                encoding: FileSystem.EncodingType.UTF8,
              });
              Alert.alert('Success', `Note saved to Documents as ${fileName}`);
            } else {
              throw new Error('No documents directory available');
            }
          } catch (saveError) {
            console.error('Error saving file:', saveError);
            Alert.alert('Error', 'Failed to save note file');
          }
        } else {
          // Multiple notes - share as JSON collection
          const collectionData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            notes: processedNotes
          };
          const jsonBlob = JSON.stringify(collectionData, null, 2);
          await Share.share({
            message: jsonBlob,
            title: `Trip42 Notes Export - ${processedNotes.length} notes`
          });
          Alert.alert('Success', `${processedNotes.length} notes exported!`);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export notes');
    }
  };

  const handleShareSelected = async () => {
    if (selectedNotes.size === 0) return;

    try {
      const notesToShare = notes.filter(note => selectedNotes.has(note.id));

      // Create JSON blob first
      await handleExportSelected();

      // Then share via Telegram (placeholder - would need Telegram sharing implementation)
      Alert.alert('Share', 'Notes saved and ready to share via Telegram!');
    } catch (error) {
      Alert.alert('Error', 'Failed to share notes');
    }
  };

  const handleImportNotes = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, use file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ike';
        input.multiple = true;
        input.onchange = async (event) => {
          const files = (event.target as HTMLInputElement).files;
          if (files) {
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              if (file.name.endsWith('.ike')) {
                const text = await file.text();
                try {
                  const importedNote: Note = JSON.parse(text);
                  // Validate the imported note has required fields
                  if (importedNote.id && importedNote.title && importedNote.text && importedNote.timestamp) {
                    await saveNote(importedNote);
                    Alert.alert('Success', `Imported note: ${importedNote.title}`);
                  } else {
                    Alert.alert('Error', `Invalid note format in ${file.name}`);
                  }
                } catch (parseError) {
                  Alert.alert('Error', `Failed to parse ${file.name}`);
                }
              }
            }
            refreshNotes();
          }
        };
        input.click();
      } else {
        // For native, use DocumentPicker
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          multiple: true,
        });

        if (!result.canceled && result.assets) {
          for (const asset of result.assets) {
            if (asset.name?.endsWith('.ike')) {
              const text = await FileSystem.readAsStringAsync(asset.uri);
              try {
                const importedNote: Note = JSON.parse(text);
                // Validate the imported note has required fields
                if (importedNote.id && importedNote.title && importedNote.text && importedNote.timestamp) {
                  await saveNote(importedNote);
                  Alert.alert('Success', `Imported note: ${importedNote.title}`);
                } else {
                  Alert.alert('Error', `Invalid note format in ${asset.name}`);
                }
              } catch (parseError) {
                Alert.alert('Error', `Failed to parse ${asset.name}`);
              }
            }
          }
          refreshNotes();
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import notes');
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
      Alert.alert('Error', 'Failed to save/share media');
    }
  };

  const handleCopyText = async (text: string, label: string = 'text') => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Success', `${label} copied to clipboard!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy text');
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

      // Share with attached media if available
      if (selectedNote.attachedMedia && selectedNote.attachedMedia.length > 0) {
        try {
          Alert.alert('Sharing', 'Uploading media to cloud storage...');

          const mediaUri = selectedNote.attachedMedia[0];

          // Use the working uploadImageForSharing function from utils/supabase.js
          const mediaUrl = await uploadImageForSharing(mediaUri);

          // Share with media URL in message
          const shareMessage = `${message}\n\n📎 Media: ${mediaUrl}\n\n*Note: Media files are automatically deleted after 30 days for privacy*`;

          // Try Telegram first, fallback to regular share
          const telegramUrl = `tg://msg?text=${encodeURIComponent(shareMessage)}`;
          const canOpen = await Linking.canOpenURL(telegramUrl);

          if (canOpen) {
            await Linking.openURL(telegramUrl);
            Alert.alert('Success', 'Note shared to Telegram with media link!');
          } else {
            await Share.share({
              message: shareMessage,
              title: `Shared note from Trip42: ${selectedNote.title}`
            });
          }

          // Shared with Supabase media URL
        } catch (mediaError) {
          Alert.alert('Media Upload Failed', 'Sharing note text only. Media could not be uploaded.');

          // Fallback to text-only sharing
          const telegramUrl = `tg://msg?text=${encodeURIComponent(message + '\n\n[Media upload failed]')}`;
          const canOpen = await Linking.canOpenURL(telegramUrl);

          if (canOpen) {
            await Linking.openURL(telegramUrl);
            Alert.alert('Shared', 'Note shared to Telegram (media upload failed)');
          } else {
            await Share.share({
              message: message + '\n\n[Media attached but upload failed]',
              title: `Shared note from Trip42: ${selectedNote.title}`
            });
          }
        }
      } else {
        // Text-only sharing
        const telegramUrl = `tg://msg?text=${encodeURIComponent(message)}`;
        const canOpen = await Linking.canOpenURL(telegramUrl);

        if (canOpen) {
          await Linking.openURL(telegramUrl);
          Alert.alert('Success', 'Note shared to Telegram!');
        } else {
          await Share.share({
            message,
            title: `Shared note from Trip42: ${selectedNote.title}`
          });
        }

        // Share options (text only)
      }

      if (selectedNote.attachedMedia && selectedNote.attachedMedia.length > 1) {
        Alert.alert(
          'Additional Media',
          `Shared first media file. Use 💾 Save button for ${selectedNote.attachedMedia.length - 1} additional file(s).`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share note');
    }
  };

  const handleExportNote = async () => {
    if (!selectedNote) return;

    try {
      Alert.alert('Exporting', 'Preparing note with media...');

      // Create a copy of the note for export
      const exportNote = { ...selectedNote };

      // Process attached media - convert URIs to base64 blobs
      if (exportNote.attachedMedia && exportNote.attachedMedia.length > 0) {
        const processedMedia: string[] = [];

        for (let i = 0; i < exportNote.attachedMedia.length; i++) {
          const mediaUri = exportNote.attachedMedia[i];
          // Processing media

          try {
            let base64Data: string;

            if (Platform.OS === 'web') {
              // For web, fetch the blob and convert to base64
              const response = await fetch(mediaUri);
              const blob = await response.blob();
              base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                  resolve(reader.result as string);
                };
                reader.onerror = () => {
                  reject(new Error('FileReader failed'));
                };
                reader.readAsDataURL(blob);
              });
            } else {
              // For native, read file as base64
              const rawBase64 = await FileSystem.readAsStringAsync(mediaUri, {
                encoding: FileSystem.EncodingType.Base64,
              });

              // Add data URL prefix based on file type
              const isAudio = mediaUri.includes('.mp3') || mediaUri.includes('.wav') || mediaUri.includes('.m4a');
              const mimeType = isAudio ? 'audio/mpeg' : 'image/jpeg';
              base64Data = `data:${mimeType};base64,${rawBase64}`;
            }

            processedMedia.push(base64Data);
          } catch (mediaError) {
            console.error('Error processing media:', mediaError);
            // Keep original URI if processing fails
            processedMedia.push(mediaUri);
          }
        }

        exportNote.attachedMedia = processedMedia;
      }

      const noteJson = JSON.stringify(exportNote, null, 2);

      const fileName = `${selectedNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ike`;

      if (Platform.OS === 'web') {
        // For web, download the file
        const blob = new Blob([noteJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Success', `Note exported as ${fileName}`);
      } else {
        // For native, save directly to documents directory
        try {
          const documentsDir = FileSystem.documentDirectory;
          if (documentsDir) {
            const fileUri = `${documentsDir}${fileName}`;

            await FileSystem.writeAsStringAsync(fileUri, noteJson, {
              encoding: FileSystem.EncodingType.UTF8,
            });

            Alert.alert('Success', `Note saved to Documents as ${fileName}\n\nLocation: ${fileUri}`);
          } else {
            throw new Error('No documents directory available');
          }
        } catch (saveError) {
          Alert.alert('Error', 'Failed to save note file');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Failed to export note: ${errorMessage}`);
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

  const handleEditPolishedText = () => {
    if (!selectedNote) return;
    setEditingPolishedText(selectedNote.polishedText || '');
    setShowEditPolishedTextModal(true);
  };

  const handleSavePolishedText = async () => {
    if (!selectedNote) return;

    try {
      const updatedNote = {
        ...selectedNote,
        polishedText: editingPolishedText.trim()
      };
      await editNote(updatedNote);
      setSelectedNote(updatedNote);
      setShowEditPolishedTextModal(false);
      refreshNotes();
      Alert.alert('Success', 'Polished text updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update polished text');
    }
  };

  const handleCreatePolishedNote = async () => {
    if (!selectedNote) return;

    setIsCreatingPolishedNote(true);
    try {
      const sourceText = selectedNote.originalText || selectedNote.text;
      const result = await polishNoteWithGemini(sourceText);

      const updatedNote = {
        ...selectedNote,
        polishedText: result.polishedNote,
        title: result.title // Optionally update title if it's better
      };

      await editNote(updatedNote);
      setSelectedNote(updatedNote);
      refreshNotes();
      Alert.alert('Success', 'Polished note created!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create polished note');
    } finally {
      setIsCreatingPolishedNote(false);
    }
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
            <View style={styles.detailContentContainer}>
              {/* Note Text - Display first */}
              <TouchableOpacity onLongPress={() => handleCopyText(selectedNote.text, 'Note text')}>
                <Text style={styles.noteText} selectable={true}>{selectedNote.text}</Text>
              </TouchableOpacity>

              {/* Original Text if different */}
              {selectedNote.originalText && selectedNote.originalText !== selectedNote.text && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Original:</Text>
                  <TouchableOpacity onLongPress={() => handleCopyText(selectedNote.originalText!, 'Original text')}>
                    <Text style={styles.originalText} selectable={true}>{selectedNote.originalText}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Polished Text Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Polished:</Text>
                  <View style={styles.polishedActions}>
                    {selectedNote.polishedText && selectedNote.polishedText !== selectedNote.text && (
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={handleEditPolishedText}
                      >
                        <Text style={styles.editButtonText}>✏️ Edit</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.createPolishedButton, isCreatingPolishedNote && styles.disabledButton]}
                      onPress={handleCreatePolishedNote}
                      disabled={isCreatingPolishedNote}
                    >
                      <Text style={[styles.createPolishedButtonText, isCreatingPolishedNote && styles.disabledText]}>
                        {isCreatingPolishedNote ? '🤖 Creating...' : selectedNote.polishedText ? '🔄 Recreate' : '✨ Create'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {selectedNote.polishedText && selectedNote.polishedText !== selectedNote.text ? (
                  <TouchableOpacity onPress={() => {
                    setEditingPolishedText(selectedNote.polishedText || '');
                    setShowEditPolishedTextModal(true);
                  }}>
                    <Text style={styles.polishedText} selectable={true}>{selectedNote.polishedText}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.noPolishedText}>No polished version available. Create one above.</Text>
                )}
              </View>

              {/* Translations */}
              {selectedNote.translations && Object.keys(selectedNote.translations).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Translations:</Text>
                  {Object.entries(selectedNote.translations).map(([lang, text]) => (
                    <View key={lang} style={styles.translationItem}>
                      <Text style={styles.translationLang}>{lang}:</Text>
                      <TouchableOpacity onLongPress={() => handleCopyText(text, `${lang} translation`)}>
                        <Text style={styles.translationText} selectable={true}>{text}</Text>
                      </TouchableOpacity>
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
                            <Text style={styles.saveMediaText}>💾 Save to local file</Text>
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
              <View style={styles.timestampContainer}>
                <Text style={styles.timestamp}>
                  Created: {new Date(selectedNote.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
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
                    setSelectedTagsForNote(selectedNote?.tags || []);
                    setShowTagSelectorModal(true);
                  }},
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}>
              <Text style={styles.bottomActionText}>📎 Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomActionButton} onPress={() => handleCopyText(selectedNote.text, 'Note text')}>
              <Text style={styles.bottomActionText}>📋 Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomActionButton} onPress={handleShareNote}>
              <Text style={styles.bottomActionText}>📤 Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomActionButton} onPress={() => setShowMoreOptionsModal(true)}>
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
                      style={[styles.tagOption, filters.tags.includes(tag) && styles.tagOptionSelected, !enabledTags.includes(tag) && { backgroundColor: '#2d3748', opacity: 0.5 }]}
                      onPress={() => {
                        const newTags = filters.tags.includes(tag)
                          ? filters.tags.filter(t => t !== tag)
                          : [...filters.tags, tag];
                        setFilters(prev => ({ ...prev, tags: newTags }));
                      }}
                      disabled={!enabledTags.includes(tag)}
                    >
                      <Text style={[styles.tagOptionText, filters.tags.includes(tag) && styles.tagOptionTextSelected, !enabledTags.includes(tag) && { color: '#6b7280' }]}>
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
          <TouchableOpacity style={styles.importButton} onPress={handleImportNotes}>
            <Text style={styles.importText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectButton} onPress={handleSelectAll}>
            <Text style={styles.selectText}>
              {selectedNotes.size === filteredNotes.length && filteredNotes.length > 0 ? '☑' : '□'} Select ({filteredNotes.length})
            </Text>
          </TouchableOpacity>
          {selectedNotes.size > 0 && (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={handleExportSelected}>
                <Text style={styles.actionButtonText}>📤 Export ({selectedNotes.size})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleDeleteSelected}>
                <Text style={styles.actionButtonText}>🗑️ Delete ({selectedNotes.size})</Text>
              </TouchableOpacity>
            </>
          )}
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

        {/* More Options Modal */}
        <Modal visible={showMoreOptionsModal} animationType="fade" transparent={true}>
          <View style={styles.moreOptionsModalOverlay}>
            <View style={styles.moreOptionsModalContent}>
              <Text style={styles.moreOptionsModalTitle}>More Options</Text>

              <TouchableOpacity
                style={styles.moreOptionButton}
                onPress={() => {
                  setShowMoreOptionsModal(false);
                  handleExportNote();
                }}
              >
                <Text style={styles.moreOptionText}>📤 Export Note</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.moreOptionButton, styles.deleteOptionButton]}
                onPress={() => {
                  setShowMoreOptionsModal(false);
                  handleDeleteNote();
                }}
              >
                <Text style={styles.moreOptionText}>🗑️ Delete Note</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.moreOptionCancelButton}
                onPress={() => setShowMoreOptionsModal(false)}
              >
                <Text style={styles.moreOptionCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Edit Polished Text Modal - Using Alert for better modal stacking */}
        {showEditPolishedTextModal && (
          <Modal visible={true} animationType="fade" transparent={true} presentationStyle="overFullScreen">
            <View style={styles.editModalOverlay}>
              <View style={styles.editModalContent}>
                <Text style={styles.editModalTitle}>Edit Polished Text</Text>

                <TextInput
                  style={styles.editTextInput}
                  multiline={true}
                  value={editingPolishedText}
                  onChangeText={setEditingPolishedText}
                  placeholder="Enter polished text..."
                  placeholderTextColor="#9ca3af"
                  autoFocus={true}
                />

                <View style={styles.editModalButtons}>
                  <TouchableOpacity
                    style={styles.editModalCancelButton}
                    onPress={() => setShowEditPolishedTextModal(false)}
                  >
                    <Text style={styles.editModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editModalSaveButton}
                    onPress={handleSavePolishedText}
                  >
                    <Text style={styles.editModalSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Tag Selector Modal - Rendered at the end to ensure it's on top */}
        <TagSelectorModal
          visible={showTagSelectorModal}
          onClose={() => setShowTagSelectorModal(false)}
          selectedTags={selectedTagsForNote}
          onTagsChange={setSelectedTagsForNote}
          onConfirm={(finalSelectedTags) => {
            if (selectedNote) {
              const updatedNote = {
                ...selectedNote,
                tags: finalSelectedTags
              };
              editNote(updatedNote);
              setSelectedNote(updatedNote);
              refreshNotes();
              setShowTagSelectorModal(false);
            }
          }}
        />
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
  importButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  importText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold' as const,
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
  saveMediaToLocalText: {
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
  timestampContainer: {
    marginTop: 20,
  },
  detailContentContainer: {
    flex: 1,
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
  tagOptionTextDisabled: {
    color: '#6b7280',
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
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  createPolishedButton: {
    backgroundColor: '#f59e0b',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  createPolishedButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold' as const,
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
  polishedActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  noPolishedText: {
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    padding: 20,
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
  tagSelectorItem: {
    flex: 1,
    backgroundColor: '#4b5563',
    borderRadius: 8,
    padding: 12,
    margin: 4,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  tagSelectorItemSelected: {
    backgroundColor: '#f59e0b',
    borderWidth: 2,
    borderColor: '#fff',
  },
  tagSelectorItemDisabled: {
    backgroundColor: '#2d3748',
    opacity: 0.5,
  },
  tagSelectorItemText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'left' as const,
    fontWeight: 'bold' as const,
  },
  tagSelectorItemTextSelected: {
    color: '#000',
    fontWeight: 'bold' as const,
  },
  tagSelectorItemTextDisabled: {
    color: '#6b7280',
  },
  tagSelectorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 9999,
  },
  tagSelectorModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    width: '90%' as const,
    maxWidth: 400,
    maxHeight: '80%' as const,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    zIndex: 10000,
  },
  tagSelectorModalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#f59e0b',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  tagSelectorList: {
    paddingBottom: 10,
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
    marginRight: 10,
  },
  tagSelectorModalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  tagSelectorModalSaveButton: {
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center' as const,
    marginLeft: 10,
  },
  tagSelectorModalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  tagItemContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-start' as const,
  },
  checkboxSymbol: {
    fontSize: 18,
    marginRight: 8,
    color: '#ffffff',
  },
  checkboxSymbolSelected: {
    color: '#f59e0b',
  },
  tagSelectorScrollView: {
    maxHeight: 300,
    marginBottom: 10,
  },
  tagSelectorOption: {
    backgroundColor: '#4b5563',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  tagSelectorOptionSelected: {
    backgroundColor: '#f59e0b',
    borderColor: '#fff',
  },
  tagSelectorOptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  tagSelectorOptionTextSelected: {
    color: '#000',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#6b7280',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  editModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    width: '90%' as const,
    maxWidth: 400,
    maxHeight: '80%' as const,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#f59e0b',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  editTextInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top' as const,
    marginBottom: 20,
  },
  editModalButtons: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
  },
  editModalCancelButton: {
    backgroundColor: '#6b7280',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center' as const,
    marginRight: 10,
  },
  editModalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  editModalSaveButton: {
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center' as const,
    marginLeft: 10,
  },
  editModalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  moreOptionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 9999,
  },
  moreOptionsModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    width: '80%' as const,
    maxWidth: 300,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    zIndex: 10000,
  },
  moreOptionsModalTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#f59e0b',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  moreOptionButton: {
    backgroundColor: '#374151',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center' as const,
  },
  moreOptionText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  moreOptionCancelButton: {
    backgroundColor: '#6b7280',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  moreOptionCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  deleteOptionButton: {
    backgroundColor: '#dc2626',
  },
};

// Tag Selector Modal Component - Simplified dropdown approach
const TagSelectorModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onConfirm: (finalSelectedTags: string[]) => void;
}> = ({ visible, onClose, selectedTags, onTagsChange, onConfirm }) => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    if (visible) {
      loadAvailableTags();
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
      setAvailableTags([
        'vitals', 'medicines', 'events', 'activities', 'habits',
        'Work', 'Personal', 'Ideas', 'Health', 'Fitness', 'Nutrition', 'Sleep', 'Mood', 'Energy', 'Focus', 'Creativity'
      ]);
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
      // Error saving custom tag - silently fail
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

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.tagSelectorModalOverlay}>
        <View style={styles.tagSelectorModalContent}>
          <Text style={styles.tagSelectorModalTitle}>Select Tags</Text>

          <ScrollView style={styles.tagSelectorScrollView}>
            {availableTags.sort((a, b) => a.localeCompare(b)).map(tag => {
              const isSelected = selectedTags.includes(tag);
              const icon = permanentTagIcons[tag] || '🏷️';

              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagSelectorOption, isSelected && styles.tagSelectorOptionSelected]}
                  onPress={() => handleTagToggle(tag)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tagSelectorOptionText, isSelected && styles.tagSelectorOptionTextSelected]}>
                    {isSelected ? '☑' : '□'} {icon} {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

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
              <Text style={styles.tagSelectorModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tagSelectorModalSaveButton}
              onPress={() => onConfirm(selectedTags)}
            >
              <Text style={styles.tagSelectorModalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ManageNotesModal;