import React from 'react';
import { View, TouchableOpacity, Text, Image } from 'react-native';

interface ActionsViewProps {
  onSignTranslation: () => void;
  onVoiceRecording: () => void;
  onTextInput: () => void;
  onHome: () => void;
  onNotes: () => void;
  onSettings: () => void;
  onCredits: () => void;
  onFunTools: () => void;
  onManageNotes: () => void;
  isProcessing: boolean;
}

const ActionsView: React.FC<ActionsViewProps> = ({
  onSignTranslation,
  onVoiceRecording,
  onTextInput,
  onHome,
  onNotes,
  onSettings,
  onCredits,
  onFunTools,
  onManageNotes,
  isProcessing
}) => {
  return (
    <View style={styles.actionsContainer}>
      <View style={styles.mainButtonsColumn}>
        <TouchableOpacity
          style={[styles.mainIconButton, isProcessing && styles.disabledButton]}
          onPress={onSignTranslation}
          disabled={isProcessing}
        >
          <Image
            source={require('../../public/icons/signtransla8.png')}
            style={[styles.signIcon, isProcessing && styles.disabledIcon]}
            resizeMode="contain"
          />
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <Image
                source={require('../../assets/marvin.png')}
                style={styles.marvinAvatar}
                resizeMode="contain"
              />
              <Text style={styles.processingText}>Marvin is analyzing...</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mainIconButton}
          onPress={onVoiceRecording}
        >
          <Text style={styles.mainIconButtonIcon}>🎤</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mainIconButton}
          onPress={onTextInput}
        >
          <Text style={styles.mainIconButtonIcon}>✏️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerButtonsRow}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={onHome}
        >
          <Text style={styles.footerButtonIcon}>🏠</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={onManageNotes}
        >
          <Text style={styles.footerButtonIcon}>📝</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={onSettings}
        >
          <Text style={styles.footerButtonIcon}>⚙️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={onCredits}
        >
          <Text style={styles.footerButtonIcon}>💰</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={onFunTools}
        >
          <Text style={styles.footerButtonIcon}>🎉</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = {
  actionsContainer: {
    flex: 1,
    justifyContent: 'space-between' as const,
    padding: 20,
  },
  mainButtonsColumn: {
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: 50,
  },
  mainIconButton: {
    backgroundColor: 'transparent',
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  mainIconButtonIcon: {
    fontSize: 40,
    color: '#f59e0b',
  },
  signIcon: {
    width: 40,
    height: 40,
  },
  footerButtonsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    alignItems: 'center' as const,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerButton: {
    backgroundColor: '#1f2937',
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  footerButtonIcon: {
    fontSize: 24,
    color: '#f59e0b',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledIcon: {
    opacity: 0.6,
  },
  processingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderRadius: 50,
  },
  marvinAvatar: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  processingText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
  },
};

export default ActionsView;