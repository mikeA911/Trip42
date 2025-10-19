import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Image, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

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
  const handleAttachPhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to attach photos');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setAttachedMedia([...attachedMedia, imageUri]);
        Alert.alert('Success', 'Photo attached successfully!');
      }
    } catch (error) {
      console.error('Error attaching photo:', error);
      Alert.alert('Error', 'Failed to attach photo');
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
        <TouchableOpacity style={styles.attachButton} onPress={handleAttachPhoto}>
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