import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Image, Alert, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '../../contexts/ToastContext';

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
  const handlePhotoOptions = () => {
    console.log('DEBUG: TypingView - handlePhotoOptions called');
    const isWebPlatform = Platform.OS === 'web';
    console.log('DEBUG: TypingView - Platform.OS:', Platform.OS);
     
    if (isWebPlatform) {
      console.log('DEBUG: TypingView - Web platform detected, showing PWA options');
      // For web/PWA, show simplified options
      Alert.alert(
        'Attach Photo (PWA Mode)',
        'Choose a photo from your device:',
        [
          {
            text: '📷 Take Photo / Choose from Gallery',
            onPress: () => {
              console.log('DEBUG: TypingView - PWA photo option selected');
              handleAttachPhoto('gallery') // Use gallery as fallback for camera
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else {
      console.log('DEBUG: TypingView - Native platform detected, showing native options');
      // For native platforms, show full options
      Alert.alert(
        'Attach Photo',
        'Choose photo source:',
        [
          {
            text: '📷 Take Photo',
            onPress: () => {
              console.log('DEBUG: TypingView - Native camera option selected');
              handleAttachPhoto('camera')
            }
          },
          {
            text: '🖼️ Choose from Gallery',
            onPress: () => {
              console.log('DEBUG: TypingView - Native gallery option selected');
              handleAttachPhoto('gallery')
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleAttachPhoto = async (source: 'camera' | 'gallery' = 'camera') => {
    try {
      // Check if we're running in a PWA or web environment
      const isWebPlatform = Platform.OS === 'web';
      
      if (isWebPlatform) {
        // Handle web/PWA environment with file input fallback
        handleWebPhotoAttach(source);
        return;
      }

      // Original native logic for iOS/Android
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
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setAttachedMedia([...attachedMedia, imageUri]);
        showSuccess('Photo attached successfully!');
      }
    } catch (error) {
      console.error('Error attaching photo:', error);
      showError('Failed to attach photo. This feature may not be available in your current environment.');
    }
  };

  const handleWebPhotoAttach = (source: 'camera' | 'gallery') => {
    console.log('DEBUG: handleWebPhotoAttach called, source:', source);
    
    try {
      // Check if we're in a browser environment
      if (typeof document === 'undefined') {
        console.error('Document not available - not in browser environment');
        showError('File attachment not available in this environment');
        return;
      }

      console.log('DEBUG: Creating file input element...');
      
      // Create a hidden file input element for web/PWA
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,video/*,audio/*';
      if (source === 'camera') {
        input.setAttribute('capture', 'environment');
      }
      
      // Clean up any previous input elements to prevent conflicts
      const existingInputs = document.querySelectorAll('input[type="file"]');
      console.log('DEBUG: Found existing inputs:', existingInputs.length);
      existingInputs.forEach(el => el.remove());
      
      // Apply styles to make it truly hidden but still functional
      Object.assign(input.style, {
        position: 'absolute',
        left: '-9999px',
        opacity: '0',
        pointerEvents: 'none',
        width: '1px',
        height: '1px'
      });
      
      document.body.appendChild(input);
      console.log('DEBUG: File input added to DOM');
       
      input.onchange = (event) => {
        console.log('DEBUG: File input onchange triggered');
        try {
          const file = (event.target as HTMLInputElement).files?.[0];
          
          if (!file) {
            console.log('DEBUG: No file selected');
            if (document.body.contains(input)) {
              document.body.removeChild(input);
            }
            return;
          }
          
          console.log('DEBUG: File selected:', file.name, file.type, file.size);
          
          // Convert file to base64 data URL for React Native compatibility
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const result = e.target?.result as string;
              console.log('DEBUG: File converted to base64, length:', result?.length);
              setAttachedMedia([...attachedMedia, result]);
              showSuccess(`Photo attached successfully! (${file.name})`);
            } catch (processError) {
              console.error('ERROR: Error processing file:', processError);
              showError('Failed to process selected file');
            } finally {
              // Clean up the input element
              if (document.body.contains(input)) {
                document.body.removeChild(input);
              }
            }
          };
          
          reader.onerror = (error) => {
            console.error('ERROR: FileReader error:', error);
            showError('Failed to read selected file');
            if (document.body.contains(input)) {
              document.body.removeChild(input);
            }
          };
          
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('ERROR: Error in file selection handler:', error);
          showError('Failed to handle file selection');
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        }
      };

      // Also handle cancel/ESC key scenarios
      input.onabort = () => {
        console.log('DEBUG: File selection cancelled/aborted');
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      };

      console.log('DEBUG: About to trigger file input click...');
      
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        try {
          console.log('DEBUG: Triggering input.click()');
          input.click();
          console.log('DEBUG: input.click() completed');
        } catch (clickError) {
          console.error('ERROR: Failed to trigger input.click():', clickError);
          showError('Failed to open file picker');
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        }
      }, 10);
      
    } catch (error) {
      console.error('ERROR: Error opening file picker:', error);
      showError('Failed to open file picker');
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
          onPress: () => {
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
        {attachedMedia.length > 0 && (
          <View style={styles.photosContainer}>
            <Text style={styles.photosTitle}>Attached Media ({attachedMedia.length})</Text>
            <View style={styles.photosGrid}>
              {attachedMedia.map((imageUri, index) => (
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