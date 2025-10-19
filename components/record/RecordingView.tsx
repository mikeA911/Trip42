import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

interface RecordingViewProps {
  recordingText: string;
  isRecording: boolean;
  isTranscribing: boolean;
  onStopRecording: () => void;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  recording: Audio.Recording | null;
  attachedMedia: string[];
  setAttachedMedia: (media: string[]) => void;
}

const RecordingView: React.FC<RecordingViewProps> = ({
  recordingText,
  isRecording,
  isTranscribing,
  onStopRecording,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  recording,
  attachedMedia,
  setAttachedMedia
}) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState<'ready' | 'recording' | 'paused' | 'stopped'>('ready');
  const [transcriptionSegments, setTranscriptionSegments] = useState<string[]>([]);
  const [audioSegments, setAudioSegments] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);

  // Sync recordingStatus with isRecording prop - only when component first mounts
  useEffect(() => {
    if (isRecording && recordingStatus === 'ready') {
      setRecordingStatus('recording');
    }
  }, []); // Empty dependency array - only run once on mount

  const handleTakePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setAttachedMedia([...attachedMedia, imageUri]);
        // No alert - just return to recording interface
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handlePauseRecording = async () => {
    if (onPauseRecording) {
      await onPauseRecording();
      setRecordingStatus('paused');
      setIsPaused(true);
    }
  };

  const handleResumeRecording = async () => {
    if (onResumeRecording) {
      await onResumeRecording();
      setRecordingStatus('recording');
      setIsPaused(false);
    }
  };

  const handleStopRecording = async () => {
    if (onStopRecording) {
      console.log('DEBUG: Stop recording called');
      await onStopRecording();
      console.log('DEBUG: Setting status to stopped');
      setRecordingStatus('stopped');
      setShowSaveOptions(true);
      console.log('DEBUG: Save options should now show');
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (recordingStatus === 'recording') {
      // Simple audio level simulation for now
      intervalId = setInterval(() => {
        // Simulate audio level for demo (replace with real audio level detection)
        setAudioLevel(Math.random() * 0.8 + 0.2); // Random level between 0.2 and 1.0
      }, 100);
    } else {
      // Clear audio level when not recording
      setAudioLevel(0);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [recordingStatus]);

  // Handle stop recording when status changes to 'ready' (only when user manually stops)
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    setHasInitialized(true);
  }, []);

  useEffect(() => {
    if (hasInitialized && recordingStatus === 'ready' && onStopRecording && !isRecording) {
      // Only call stop if we're not currently recording and component has initialized
      onStopRecording();
    }
  }, [recordingStatus, onStopRecording, isRecording, hasInitialized]);

  return (
    <View style={styles.recordingView}>
      <View style={styles.recordingIndicator}>
        <View style={styles.audioLevelContainer}>
          <View style={styles.ikigaiIcon}>
            <Image
              source={require('../../assets/splash-icon.png')}
              style={[styles.ikigaiImage, recordingStatus === 'recording' && { transform: [{ scale: 1 + audioLevel * 0.5 }] }]}
              resizeMode="contain"
            />
            {recordingStatus === 'recording' && (
              <View style={styles.volumeRings}>
                <View style={[styles.volumeRing, { opacity: audioLevel * 0.8, transform: [{ scale: 1 + audioLevel * 0.3 }] }]} />
                <View style={[styles.volumeRing, { opacity: audioLevel * 0.6, transform: [{ scale: 1 + audioLevel * 0.2 }] }]} />
                <View style={[styles.volumeRing, { opacity: audioLevel * 0.4, transform: [{ scale: 1 + audioLevel * 0.1 }] }]} />
              </View>
            )}
          </View>
        </View>
        <Text style={styles.recordingStatusText}>
          {recordingStatus === 'ready' && 'Tap the red button to start recording'}
          {recordingStatus === 'recording' && 'Recording in progress...'}
          {recordingStatus === 'paused' && 'Recording paused - tap red button to resume'}
          {isTranscribing && 'Transcribing...'}
        </Text>
      </View>

      {/* Initial state - red button to start */}
      {recordingStatus === 'ready' && (
        <TouchableOpacity
          style={[styles.recordButton, styles.recordButtonReady]}
          onPress={() => {
            // Start recording immediately when pressing the microphone button
            setRecordingStatus('recording');
            if (onStartRecording) onStartRecording();
          }}
        >
          <Text style={styles.recordButtonText}>🎤 Start Recording</Text>
        </TouchableOpacity>
      )}

      {/* Recording state - three control buttons */}
      {recordingStatus === 'recording' && (
        <View style={styles.recordingControls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.pauseButton]}
            onPress={handlePauseRecording}
          >
            <Text style={styles.controlButtonText}>⏸️ Pause</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={handleStopRecording}
          >
            <Text style={styles.controlButtonText}>⏹️ Stop</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.cameraButton]}
            onPress={handleTakePhoto}
          >
            <Text style={styles.controlButtonText}>📷 Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stopped state - show save options */}
      {recordingStatus === 'stopped' && showSaveOptions && (
        <View style={styles.saveOptionsContainer}>
          <Text style={styles.savePromptText}>Recording stopped. What would you like to do?</Text>
          <View style={styles.saveButtonsRow}>
            <TouchableOpacity
              style={[styles.saveButton, styles.saveButtonPrimary]}
              onPress={() => {
                // This will trigger the transcription and save process
                // For now, just go back to tabs view
                setRecordingStatus('ready');
                setShowSaveOptions(false);
              }}
            >
              <Text style={styles.saveButtonText}>💾 Save Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, styles.saveButtonSecondary]}
              onPress={() => {
                setRecordingStatus('ready');
                setShowSaveOptions(false);
                if (onStartRecording) onStartRecording();
              }}
            >
              <Text style={styles.saveButtonTextSecondary}>🔄 Start Over</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Recording state - three control buttons */}
      {recordingStatus === 'recording' && (
        <View style={styles.recordingControls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.pauseButton]}
            onPress={handlePauseRecording}
          >
            <Text style={styles.controlButtonText}>⏸️ Pause</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={handleStopRecording}
          >
            <Text style={styles.controlButtonText}>⏹️ Stop</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.cameraButton]}
            onPress={handleTakePhoto}
          >
            <Text style={styles.controlButtonText}>📷 Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Paused state - show continue option */}
      {recordingStatus === 'paused' && isPaused && (
        <View style={styles.saveOptionsContainer}>
          <Text style={styles.savePromptText}>Recording paused. What would you like to do?</Text>
          <View style={styles.saveButtonsRow}>
            <TouchableOpacity
              style={[styles.saveButton, styles.saveButtonPrimary]}
              onPress={handleResumeRecording}
            >
              <Text style={styles.saveButtonText}>▶️ Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, styles.saveButtonSecondary]}
              onPress={() => {
                setRecordingStatus('ready');
                setIsPaused(false);
                setShowSaveOptions(false);
              }}
            >
              <Text style={styles.saveButtonTextSecondary}>❌ Abort</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isTranscribing && <Text style={styles.transcribingText}>Transcribing...</Text>}
    </View>
  );
};

const styles = {
  recordingView: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  recordingIndicator: {
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  audioLevelContainer: {
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  recordingPulse: {
    fontSize: 30,
    marginBottom: 5,
  },
  recordingActivePulse: {
    color: '#ef4444',
  },
  pausedPulse: {
    color: '#f59e0b',
  },
  ikigaiIcon: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1f2937',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  ikigaiImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  volumeRings: {
    position: 'absolute' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  volumeRing: {
    position: 'absolute' as const,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#f59e0b',
    opacity: 0.3,
  },
  recordingStatusText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center' as const,
    margin: 20,
  },
  recordButton: {
    backgroundColor: '#ef4444',
    borderRadius: 50,
    width: 120,
    height: 120,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: 30,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  recordButtonReady: {
    backgroundColor: '#ef4444',
  },
  recordButtonResume: {
    backgroundColor: '#ef4444',
  },
  recordingActive: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  paused: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
  },
  recordingControls: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    alignItems: 'center' as const,
    width: '100%' as const,
    marginBottom: 30,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pauseButton: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  stopButton: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  cameraButton: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
  },
  attachButton: {
    backgroundColor: '#1f2937',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  attachButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  transcribingText: {
    color: '#f59e0b',
    fontSize: 14,
    textAlign: 'center' as const,
    marginTop: 5,
  },
  saveOptionsContainer: {
    alignItems: 'center' as const,
    padding: 20,
  },
  savePromptText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  saveButtonsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    width: '100%' as const,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center' as const,
  },
  saveButtonPrimary: {
    backgroundColor: '#f59e0b',
  },
  saveButtonSecondary: {
    backgroundColor: '#374151',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  saveButtonTextSecondary: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
};

export default RecordingView;