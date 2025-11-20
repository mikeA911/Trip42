import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, Image, Alert, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useToast } from '../../contexts/ToastContext';
import { saveMedia, getMedia, deleteMedia } from '../../utils/storage';

interface TypingViewProps {
  typedText: string;
  setTypedText: (text: string) => void;
  onDone: () => void;
  onCancel: () => void;
  attachedMedia?: string[];
  setAttachedMedia?: (media: string[]) => void;
}

const TypingView: React.FC<TypingViewProps> = ({
  typedText,
  setTypedText,
  onDone,
  onCancel,
  attachedMedia = [],
  setAttachedMedia = () => {}
}) => {
  const { showSuccess, showError } = useToast();
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  useEffect(() => {
    const loadMedia = async () => {
      const urls: string[] = [];
      for (const mediaItem of attachedMedia) {
        if (mediaItem.startsWith('data:')) {
          // Old format: data URL
          urls.push(mediaItem);
        } else {
          // New format: media ID
          const url = await getMedia(mediaItem);
          if (url) {
            urls.push(url);
          }
        }
      }
      setMediaUrls(urls);
    };
    loadMedia();
  }, [attachedMedia]);
  const handlePhotoOptions = () => {
    const isWebPlatform = Platform.OS === 'web' && typeof document !== 'undefined';

    if (isWebPlatform) {
      // For PWA, call file picker directly - preserves user activation
      handleWebPhotoAttach('gallery');
    } else {
      // For native platforms, show full options
      Alert.alert(
        'Attach Photo',
        'Choose photo source:',
        [
          {
            text: '📷 Take Photo',
            onPress: () => handleAttachPhoto('camera')
          },
          {
            text: '🖼️ Choose from Gallery',
            onPress: () => handleAttachPhoto('gallery')
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleAttachPhoto = async (source: 'camera' | 'gallery' = 'camera') => {
    try {
      const isWebPlatform = Platform.OS === 'web';
      
      if (isWebPlatform) {
        // Handle web/PWA environment with file input
        handleWebPhotoAttach(source);
        return;
      }

      // Native logic for iOS/Android
      let permissionStatus;
      let pickerFunction;
      let permissionMessage;

      if (source === 'camera') {
        permissionStatus = await ImagePicker.requestCameraPermissionsAsync();
        pickerFunction = ImagePicker.launchCameraAsync;
        permissionMessage = 'Camera permission is required to attach photos';
      } else {
        permissionStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
        pickerFunction = ImagePicker.launchImageLibraryAsync;
        permissionMessage = 'Media library permission is required to attach photos';
      }

      if (permissionStatus.status !== 'granted') {
        Alert.alert('Permission needed', permissionMessage);
        return;
      }

      // Launch camera or gallery
      const result = await pickerFunction({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const mimeType = result.assets[0].type || 'image/jpeg';

        let dataUrl: string;
        const base64 = result.assets[0].base64;

        if (base64) {
          dataUrl = `data:${mimeType};base64,${base64}`;
        } else {
          // Fallback: read file as base64 using FileSystem
          try {
            const rawBase64 = await FileSystem.readAsStringAsync(imageUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            dataUrl = `data:${mimeType};base64,${rawBase64}`;
          } catch (fileError) {
            console.error('Failed to read file as base64:', fileError);
            showError('Failed to process photo data');
            return;
          }
        }

        try {
          const mediaId = await saveMedia(dataUrl);
          setAttachedMedia([...attachedMedia, mediaId]);
          showSuccess('Photo attached successfully!');
        } catch (error) {
          console.error('Failed to save media:', error);
          showError('Failed to save photo');
        }
      }
    } catch (error) {
      console.error('Error attaching photo:', error);
      showError('Failed to attach photo. This feature may not be available in your current environment.');
    }
  };

  const handleWebPhotoAttach = async (source: 'camera' | 'gallery') => {
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
            try {
              const mediaId = await saveMedia(result);
              setAttachedMedia([...attachedMedia, mediaId]);
              showSuccess(`Photo attached: ${file.name}`);
            } catch (error) {
              showError('Failed to save photo');
            }
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
      showError('Photo attachment failed in PWA');
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const mediaItem = attachedMedia[index];
            if (!mediaItem.startsWith('data:')) {
              // New format: delete from storage
              try {
                await deleteMedia(mediaItem);
              } catch (error) {
                console.error('Error deleting media:', error);
              }
            }
            setAttachedMedia(attachedMedia.filter((_, i) => i !== index));
          }
        }
      ]
    );
  };

  return (
    <View style={styles.typingView}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Type your note here..."
          value={typedText}
          onChangeText={setTypedText}
          autoFocus
        />

        {/* Attached Photos Display */}
        {mediaUrls.length > 0 && (
          <View style={styles.photosContainer}>
            <Text style={styles.photosTitle}>Attached Media ({mediaUrls.length})</Text>
            <View style={styles.photosGrid}>
              {mediaUrls.map((imageUri, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri: imageUri }} style={styles.photoThumbnail} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <Text style={styles.removePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Attach Photo Button */}
        <TouchableOpacity style={styles.attachButton} onPress={handlePhotoOptions}>
          <Text style={styles.attachButtonText}>📷 Attach Photo</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneButton} onPress={onDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = {
  typingView: {
    flex: 1,
    padding: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  textArea: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    minHeight: 200,
    textAlignVertical: 'top' as const,
    marginBottom: 20,
  },
  photosContainer: {
    marginBottom: 20,
  },
  photosTitle: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginBottom: 10,
  },
  photosGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  photoItem: {
    position: 'relative' as const,
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden' as const,
  },
  photoThumbnail: {
    width: '100%' as const,
    height: '100%' as const,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute' as const,
    top: 2,
    right: 2,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  attachButton: {
    backgroundColor: '#1f2937',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center' as const,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  attachButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  doneButton: {
    backgroundColor: '#f59e0b',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  doneButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  buttonRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center' as const,
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
};

export default TypingView;