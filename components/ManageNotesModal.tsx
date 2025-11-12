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
import { Note, saveNote } from '../utils/storage';
import { getOrCreateSettings, saveSettings } from '../utils/settings';
import { LANGUAGES } from '../components/SettingsPage';
import { useNotes } from '../hooks/useNotes';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { supabase, uploadImageForSharing, blobToBase64 } from '../utils/supabase'; // Corrected import path
import { polishNoteWithGemini } from '../services/geminiService';
import { Audio } from 'expo-av'; // Import Audio from expo-av
import { getThemeCharacters } from '../services/promptService'; // Import getThemeCharacters

interface ManageNotesModalProps {
  visible: boolean;
  onClose: () => void;
}

// Helper function to determine MIME type from URI
const getMimeType = (uri: string): string => {
  if (uri.includes('.mp3')) return 'audio/mpeg';
  if (uri.includes('.wav')) return 'audio/wav';
  if (uri.includes('.m4a')) return 'audio/mp4';
  if (uri.includes('.jpg') || uri.includes('.jpeg')) return 'image/jpeg';
  if (uri.includes('.png')) return 'image/png';
  if (uri.includes('.gif')) return 'image/gif';
  // Default to image/jpeg if type cannot be determined
  return 'image/jpeg';
};

const ManageNotesModal: React.FC<ManageNotesModalProps> = ({ visible, onClose }) => {
  const { notes, removeNote, editNote, refreshNotes } = useNotes();
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [showNoteDetail, setShowNoteDetail] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showTagSelectorModal, setShowTagSelectorModal] = useState(false);
  const [selectedTagsForNote, setSelectedTagsForNote] = useState<string[]>([]);
  const [showMoreOptionsModal, setShowMoreOptionsModal] = useState(false);
  const [showEditPolishedTextModal, setShowEditPolishedTextModal] = useState(false);
  const [editingPolishedText, setEditingPolishedText] = useState('');
  const [isCreatingPolishedNote, setIsCreatingPolishedNote] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState('');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    if (visible) {
      refreshNotes();
      setSelectedNotes(new Set());
      setShowNoteDetail(false);
      setSelectedNote(null);
    }
  }, [visible]);

  const handleSelectAll = () => {
    if (selectedNotes.size === notes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(notes.map(note => note.id)));
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

    console.log('Starting export for', selectedNotes.size, 'notes');
    setIsExporting(true);
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
                if (mediaUri.startsWith('data:')) {
                  // Already a data URL (base64), use it directly
                  base64Data = mediaUri;
                } else if (mediaUri.startsWith('blob:')) {
                  // Blob URL, fetch and convert to base64
                  const response = await fetch(mediaUri);
                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }
                  const blob = await response.blob();
                  const mimeType = blob.type; // Get MIME type from the blob

                  base64Data = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = reader.result as string;
                      // Extract raw base64 data (remove "data:mime/type;base64," prefix)
                      const rawBase64 = dataUrl.split(',')[1];
                      resolve(rawBase64);
                    };
                    reader.onerror = (e) => reject(new Error('FileReader failed'));
                    reader.readAsDataURL(blob);
                  });
                  base64Data = `data:${mimeType};base64,${base64Data}`;
                } else {
                  // Unknown URI type on web, keep original
                  base64Data = mediaUri;
                }
              } else {
                // For native, read file as base64
                const rawBase64 = await FileSystem.readAsStringAsync(mediaUri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                const mimeType = getMimeType(mediaUri); // Use the new getMimeType helper
                base64Data = `data:${mimeType};base64,${rawBase64}`;
              }

              processedMedia.push(base64Data);
            } catch (mediaError) {
              console.error('Error processing media for export:', mediaError);
              processedMedia.push(mediaUri); // Keep original URI if processing fails
            }
          }

          exportNote.attachedMedia = processedMedia;
        }

        return exportNote;
      });

      const processedNotes = await Promise.all(exportPromises);

      if (Platform.OS === 'web') {
        console.log('Exporting to web platform');
        // For web, use traditional download
        if (processedNotes.length === 1) {
          // Single note - download as .ike file
          const noteJson = JSON.stringify(processedNotes[0], null, 2);
          const blob = new Blob([noteJson], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${processedNotes[0].title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.t42`;
          a.click();
          URL.revokeObjectURL(url);
          console.log('Web export completed successfully');
          Alert.alert(
            'Success',
            `Note exported as ${processedNotes[0].title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.t42\n\nFile saved to Downloads folder.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log('Clearing selections after export');
                  setSelectedNotes(new Set());
                }
              }
            ]
          );
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
          a.download = `trip42_notes_${new Date().toISOString().split('T')[0]}.t42`;
          a.click();
          URL.revokeObjectURL(url);
          Alert.alert(
            'Success',
            `${processedNotes.length} notes exported as collection!\n\nFile saved to Downloads folder.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setSelectedNotes(new Set());
                }
              }
            ]
          );
        }
      } else {
        console.log('Exporting to native platform');
        // For native platforms
        if (processedNotes.length === 1) {
          // Single note - save as .ike file
          const noteJson = JSON.stringify(processedNotes[0], null, 2);
          const fileName = `${processedNotes[0].title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.t42`;

          try {
            const documentsDir = FileSystem.documentDirectory;
            if (documentsDir) {
              const fileUri = `${documentsDir}${fileName}`;
              await FileSystem.writeAsStringAsync(fileUri, noteJson, {
                encoding: FileSystem.EncodingType.UTF8,
              });
              Alert.alert(
                'Success',
                `Note saved to Documents as ${fileName}\n\nLocation: ${fileUri}`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setSelectedNotes(new Set());
                    }
                  }
                ]
              );
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
          Alert.alert(
            'Success',
            `${processedNotes.length} notes exported!\n\nFiles saved to Documents directory.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setSelectedNotes(new Set());
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export notes');
    } finally {
      setIsExporting(false);
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
        input.accept = '.t42';
        input.multiple = true;
        input.onchange = async (event) => {
          const files = (event.target as HTMLInputElement).files;
          if (files) {
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              if (file.name.endsWith('.t42')) {
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
            if (asset.name?.endsWith('.t42')) {
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
      handleNoteSelect(note.id);
    } else {
      setSelectedNote(note);
      setShowNoteDetail(true);
    }
  };

  const handleImagePressForViewer = (uri: string) => {
    setCurrentImageUri(uri);
    setShowImageViewer(true);
  };

  const handlePlayAudio = async (uri: string) => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      setIsPlayingAudio(false);
      if (isPlayingAudio) return; // If it was playing and we stopped it, don't restart
    }

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlayingAudio(false);
            newSound.unloadAsync();
            setSound(null);
          }
        }
      );
      setSound(newSound);
      setIsPlayingAudio(true);
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio.');
      setIsPlayingAudio(false);
    }
  };

  const handleRemoveMediaFromNote = async (mediaUriToRemove: string) => {
    if (!selectedNote) return;

    Alert.alert(
      'Remove Media',
      'Are you sure you want to remove this media from the note? This will not delete the file from your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedMedia = selectedNote.attachedMedia.filter(uri => uri !== mediaUriToRemove);
              const updatedNote = {
                ...selectedNote,
                attachedMedia: updatedMedia
              };
              await editNote(updatedNote);
              setSelectedNote(updatedNote);
              refreshNotes();
              Alert.alert('Success', 'Media removed from note.');
            } catch (error) {
              console.error('Error removing media:', error);
              Alert.alert('Error', 'Failed to remove media from note.');
            }
          }
        }
      ]
    );
  };

  const handlePhotoOptions = () => {
    const isWebPlatform = Platform.OS === 'web' || typeof window !== 'undefined';
    
    if (isWebPlatform) {
      // For PWA, call file picker directly - preserves user activation
      handleWebMediaAttach();
    } else {
      // For native, show photo options
      Alert.alert(
        'Attach Photo',
        'Choose photo source:',
        [
          {
            text: '📷 Take Photo',
            onPress: () => handleAddMediaToNote('camera')
          },
          {
            text: '🖼️ Choose from Gallery',
            onPress: () => handleAddMediaToNote('gallery')
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleAddMediaToNote = async (source: 'camera' | 'gallery' = 'gallery') => {
    console.log('DEBUG: handleAddMediaToNote called, source:', source);
    
    if (!selectedNote) {
      Alert.alert('Error', 'No note selected');
      return;
    }
     
    // Check if we're running in a PWA or web environment
    const isWebPlatform = Platform.OS === 'web';
    console.log('DEBUG: Platform check - isWebPlatform:', isWebPlatform);
     
    if (isWebPlatform) {
      console.log('DEBUG: Web platform detected, calling handleWebMediaAttach');
      // Handle web/PWA environment with file input fallback
      await handleWebMediaAttach();
      return;
    }

    console.log('DEBUG: Native platform detected');
    // Original native logic for iOS/Android
    try {
      let permissionStatus;
      let pickerFunction;
      let permissionMessage;

      if (source === 'camera') {
        permissionStatus = await ImagePicker.requestCameraPermissionsAsync();
        pickerFunction = ImagePicker.launchCameraAsync;
        permissionMessage = 'Camera permission is required';
      } else {
        permissionStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
        pickerFunction = ImagePicker.launchImageLibraryAsync;
        permissionMessage = 'Media library permission is required';
      }

      if (permissionStatus.status !== 'granted') {
        Alert.alert('Permission needed', permissionMessage);
        return;
      }

      const result = await pickerFunction({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        let mediaUriToSave = result.assets[0].uri;

        if (Platform.OS === 'web' && mediaUriToSave.startsWith('blob:')) {
          // On web, if it's a blob URI, convert it to base64 for persistence
          try {
            const response = await fetch(mediaUriToSave);
            const blob = await response.blob();
            const mimeType = blob.type;
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string).split(',')[1]);
              reader.onerror = (e) => reject(new Error('FileReader failed'));
              reader.readAsDataURL(blob);
            });
            mediaUriToSave = `data:${mimeType};base64,${base64}`;
            Alert.alert('Media Added', 'Blob media converted to Base64 for persistence.');
          } catch (error) {
            console.error('Error converting blob to base64:', error);
            Alert.alert('Error', 'Failed to convert media to persistent format. Adding original URI.');
            // Fallback to original URI if conversion fails
          }
        }

        const updatedNote = {
          ...selectedNote,
          attachedMedia: [...selectedNote.attachedMedia, mediaUriToSave]
        };

        await editNote(updatedNote);
        setSelectedNote(updatedNote);
        refreshNotes();
      }
    } catch (error) {
      console.error('Error in handleAddMediaToNote:', error);
      Alert.alert('Error', 'Failed to add media');
    }
  };

  const handleWebMediaAttach = async () => {
    console.log('DEBUG: handleWebMediaAttach called');
    
    try {
      // Simple PWA file input approach
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      
      document.body.appendChild(input);
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const result = event.target?.result as string;
            const updatedNote = {
              ...selectedNote!,
              attachedMedia: [...selectedNote!.attachedMedia, result]
            };

            await editNote(updatedNote);
            setSelectedNote(updatedNote);
            refreshNotes();
            Alert.alert('Success', `Media attached: ${file.name}`);
            document.body.removeChild(input);
          };
          reader.readAsDataURL(file);
        } else {
          document.body.removeChild(input);
        }
      };
      
      input.click();
      
    } catch (error) {
      console.error('PWA file attachment error:', error);
      Alert.alert('Error', 'Photo attachment failed in PWA');
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
        a.download = `trip42_media_${Date.now()}.${
          mediaUri.includes('.mp3') ? 'mp3' :
          mediaUri.includes('.m4a') ? 'm4a' :
          mediaUri.includes('.wav') ? 'wav' : 'jpg'
        }`;
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
        const settings = await getOrCreateSettings();
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
                  const dataUrl = reader.result as string;
                  // Extract raw base64 data (remove "data:mime/type;base64," prefix)
                  base64Data = dataUrl.split(',')[1];
                  resolve(base64Data);
                };
                reader.onerror = () => {
                  reject(new Error('FileReader failed'));
                };
                reader.readAsDataURL(blob);
              });
              const mimeType = getMimeType(mediaUri); // Use the new getMimeType helper
              base64Data = `data:${mimeType};base64,${base64Data}`;
            } else {
              // For native, read file as base64
              const rawBase64 = await FileSystem.readAsStringAsync(mediaUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const mimeType = getMimeType(mediaUri); // Use the new getMimeType helper
              base64Data = `data:${mimeType};base64,${rawBase64}`;
            }

            processedMedia.push(base64Data);
          } catch (mediaError) {
            console.error('Error processing media for export:', mediaError);
            // Keep original URI if processing fails
            processedMedia.push(mediaUri);
          }
        }

        exportNote.attachedMedia = processedMedia;
      }

      const noteJson = JSON.stringify(exportNote, null, 2);

      const fileName = `${selectedNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.t42`;

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

      // Get current AI theme from settings
      const settings = await getOrCreateSettings();
      const aiTheme = settings.aiTheme;

      // Fetch characters for the current theme
      const charactersInTheme = await getThemeCharacters(aiTheme);

      let selectedCharacter: string | undefined;
      let characterDisplayName: string;
      
      if (charactersInTheme.length > 0) {
        selectedCharacter = charactersInTheme[Math.floor(Math.random() * charactersInTheme.length)];
        characterDisplayName = selectedCharacter;
      } else {
        // Fallback if no characters found for the theme
        selectedCharacter = undefined;
        characterDisplayName = 'AI Assistant';
      }

      const result = await polishNoteWithGemini(sourceText, selectedCharacter);

      const updatedNote = {
        ...selectedNote,
        polishedText: result.polishedNote,
        title: result.title // Optionally update title if it's better
      };

      await editNote(updatedNote);
      setSelectedNote(updatedNote);
      refreshNotes();
      Alert.alert('Success', `Polished note created by ${characterDisplayName}!`);
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
        activeOpacity={0.7}
      >
        <View style={styles.noteHeader}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={(e) => {
              e.stopPropagation();
              handleNoteSelect(item.id);
            }}
          >
            <Text style={styles.checkboxText}>{isSelected ? '☑' : '□'}</Text>
          </TouchableOpacity>

          <View style={styles.noteContent}>
            <View style={styles.noteInfo}>
              <View style={styles.noteTitleRow}>
                <Text style={styles.typeIcon}>{getTypeIcon(item.noteType)}</Text>
                <Text style={styles.noteTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
              <Text style={styles.noteDate}>{formatDate(item.timestamp)}</Text>
            </View>

            <Text style={styles.mediaText}>
              {item.attachedMedia && item.attachedMedia.length > 0 ? `📎 ${item.attachedMedia.length}` : '📄'}
            </Text>
          </View>
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
              {(selectedNote.originalText && selectedNote.originalText !== selectedNote.text) || !selectedNote.polishedText ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Original:</Text>
                  <TouchableOpacity onLongPress={() => handleCopyText(selectedNote.originalText || selectedNote.text, 'Original text')}>
                    <Text style={styles.originalText} selectable={true}>{selectedNote.originalText || selectedNote.text}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

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
                      {mediaUri.includes('.mp3') || mediaUri.includes('.wav') || mediaUri.includes('.m4a') ? (
                        <View style={styles.audioItem}>
                          <Text style={styles.audioIndicator}>🔊 Audio</Text>
                          <TouchableOpacity
                            style={styles.playButton}
                            onPress={() => handlePlayAudio(mediaUri)}
                          >
                            <Text style={styles.playButtonText}>{isPlayingAudio ? '⏸️ Pause' : '▶️ Play'}</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.imageItem}
                          onPress={() => handleImagePressForViewer(mediaUri)}
                        >
                          <Image source={{ uri: mediaUri }} style={styles.mediaImage} />
                          <View style={styles.mediaActions}>
                            <TouchableOpacity
                              style={styles.downloadMediaButton}
                              onPress={() => handleSaveMediaFromNote(mediaUri)}
                            >
                              <Text style={styles.downloadMediaText}>⬇️ Download</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.removeMediaButton}
                              onPress={() => handleRemoveMediaFromNote(mediaUri)}
                            >
                              <Text style={styles.removeMediaText}>🗑️ Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
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
              // Direct file picker - preserves user activation, no popup
              handleWebMediaAttach();
            }}>
              <Text style={styles.bottomActionText}>📎 Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomActionButton} onPress={() => handleCopyText(selectedNote.text, 'Note text')}>
              <Text style={styles.bottomActionText}>📋 Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomActionButton} onPress={handleShareNote}>
              <Text style={styles.bottomActionText}>📤 Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <>
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Manage Notes</Text>
            <View />
          </View>

          {/* Selection Header */}
          <View style={styles.selectionHeader}>
            <TouchableOpacity style={styles.selectButton} onPress={handleSelectAll}>
              <Text style={styles.selectText}>
                {selectedNotes.size === notes.length && notes.length > 0 ? '☑' : '□'} Select All
              </Text>
            </TouchableOpacity>
            <Text style={styles.selectedCountText}>
              {selectedNotes.size} selected
            </Text>
            {selectedNotes.size > 0 && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.iconButton, isExporting && styles.disabledButton]}
                  onPress={handleExportSelected}
                  disabled={isExporting}
                >
                  <Text style={[styles.actionButtonText, isExporting && styles.disabledText]}>
                    {isExporting ? '⏳' : '📤'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={handleDeleteSelected}>
                  <Text style={styles.actionButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Notes List */}
          <FlatList
            data={notes}
            renderItem={renderNoteItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
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

      {/* Image Viewer Modal */}
      <Modal visible={showImageViewer} transparent={true} animationType="fade" onRequestClose={() => setShowImageViewer(false)}>
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity style={styles.imageViewerCloseButton} onPress={() => setShowImageViewer(false)}>
            <Text style={styles.imageViewerCloseButtonText}>✕</Text>
          </TouchableOpacity>
          <Image source={{ uri: currentImageUri }} style={styles.fullScreenImage} resizeMode="contain" />
        </View>
      </Modal>
    </>
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
  selectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 15,
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
  selectedCountText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold' as const,
    marginLeft: 10,
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
    fontSize: 20,
    fontWeight: 'bold' as const,
  },
  iconButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
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
    borderWidth: 2,
    borderColor: '#4b5563',
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
    color: '#f59e0b',
  },
  noteInfo: {
    flex: 1,
  },
  noteContent: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
  mediaActions: {
    flexDirection: 'row' as const,
    marginLeft: 10,
    gap: 10,
  },
  downloadMediaButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  downloadMediaText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  removeMediaButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeMediaText: {
    color: '#fff',
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
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold' as const,
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
    fontWeight: 'bold' as const,
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
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  imageViewerCloseButton: {
    position: 'absolute' as const,
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  imageViewerCloseButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold' as const,
  },
  fullScreenImage: {
    width: '100%' as const,
    height: '100%' as const,
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
      const settings = await getOrCreateSettings();
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
      const currentSettings = await getOrCreateSettings();
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