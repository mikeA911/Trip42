import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LandingPage } from './components/LandingPage';
import { NotesList } from './components/NotesList';
import { RecordTranslate } from './components/RecordTranslate';
import ManageNotesModal from './components/ManageNotesModal';
import CreditsTab from './components/CreditsTab';
import FunToolsTab from './components/FunToolsTab';
import MapTool from './components/MapTool';
import MedicineTool from './components/MedicineTool';
import CalculatorTool from './components/CalculatorTool';
import CurrencyConverterTool from './components/CurrencyConverterTool';
import TetrisGame from './components/TetrisGame';
import SettingsPage from './components/SettingsPage';
import { useNotes } from './hooks/useNotes';
import { Note } from './utils/storage';
import { initializeCredits } from './utils/credits';

type AppScreen = 'landing' | 'notes' | 'record' | 'manageNotes' | 'credits' | 'fun' | 'map' | 'medicine' | 'calculator' | 'currency' | 'tetris' | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  const { notes, addNote, removeNote, loading } = useNotes();
  const [aiTheme, setAiTheme] = useState('h2g2');

  // Initialize credits on app start
  useEffect(() => {
    const initCredits = async () => {
      try {
        await initializeCredits();
        console.log('Credits initialized successfully');
      } catch (error) {
        console.error('Failed to initialize credits:', error);
      }
    };

    initCredits();
  }, []);

  // Auto-navigate to record screen when landing page logo is pressed
  const handleLogoPress = () => {
    setCurrentScreen('record');
  };

  const handleSaveNote = async (note: Note) => {
    await addNote(note);
  };

  const handleDeleteNote = async (noteId: string) => {
    await removeNote(noteId);
  };

  const renderHeader = () => {
    if (currentScreen === 'landing') return null;

    return (
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentScreen('landing')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {currentScreen === 'notes' ? 'My Notes' :
             currentScreen === 'record' ? 'Record & Translate' :
             currentScreen === 'manageNotes' ? 'Manage Notes' :
             currentScreen === 'credits' ? 'Credits' :
             currentScreen === 'fun' ? 'Fun Tools' :
             currentScreen === 'currency' ? 'Currency Converter' :
             currentScreen === 'tetris' ? 'Stacker Game' : 'Trip42'}
          </Text>
        </View>
      </View>
    );
  };

  const handleNavigateToTool = (toolId: string) => {
    if (toolId === 'map') {
      setCurrentScreen('map');
    } else if (toolId === 'medicine') {
      setCurrentScreen('medicine');
    } else if (toolId === 'calculator') {
      setCurrentScreen('calculator');
    } else if (toolId === 'currency') {
      setCurrentScreen('currency');
    } else if (toolId === 'tetris') {
      setCurrentScreen('tetris');
    } else {
      // For now, just show an alert - individual tool components will be implemented later
      Alert.alert('Coming Soon', `${toolId} tool is under development.`);
    }
  };

  const handleNavigateToScreen = (screen: string) => {
    if (screen === 'record' || screen === 'notes' || screen === 'manageNotes' || screen === 'fun' || screen === 'credits' || screen === 'landing') {
      setCurrentScreen(screen as AppScreen);
    } else if (screen === 'chatbot-zaphod' || screen === 'chatbot-arthur') {
      // Handle chatbot navigation - for now just show alert
      Alert.alert('Coming Soon', `${screen} chatbot is under development.`);
    } else if (screen === 'calendar') {
      // Handle calendar navigation - for now just show alert
      Alert.alert('Coming Soon', 'Calendar modal is under development.');
    }
  };

  const renderContent = () => {
    switch (currentScreen) {
      case 'landing':
        return (
          <LandingPage
            onNavigateToNotes={() => setCurrentScreen('notes')}
            onNavigateToRecord={handleLogoPress}
            savedNotes={notes}
            onSaveNote={handleSaveNote}
          />
        );
      case 'notes':
        return (
          <NotesList
            notes={notes}
            onNotePress={(note) => {
              // TODO: Implement note detail view
              console.log('Note pressed:', note);
            }}
            onDeleteNote={handleDeleteNote}
            loading={loading}
          />
        );
      case 'record':
        return (
          <RecordTranslate onSaveNote={handleSaveNote} setCurrentScreen={setCurrentScreen} />
        );
      case 'credits':
        return (
          <CreditsTab onBack={() => setCurrentScreen('landing')} />
        );
      case 'fun':
        return (
          <FunToolsTab onNavigateToTool={handleNavigateToTool} onNavigateToScreen={handleNavigateToScreen} />
        );
      case 'map':
        return (
          <MapTool onBack={() => setCurrentScreen('fun')} />
        );
      case 'medicine':
        return (
          <MedicineTool onBack={() => setCurrentScreen('fun')} />
        );
      case 'calculator':
        return (
          <CalculatorTool onBack={() => setCurrentScreen('fun')} />
        );
      case 'currency':
        return (
          <CurrencyConverterTool
            savedNotes={notes}
            setSavedNotes={() => {}}
            setActiveTab={() => {}}
            setRecordingViewMode={() => {}}
            setTypedText={() => {}}
            setNoteTitle={() => {}}
            tags={[]}
            setTags={() => {}}
            aiTheme={aiTheme}
          />
        );
      case 'tetris':
        return (
          <TetrisGame
            onExit={() => setCurrentScreen('fun')}
            onSaveStats={(stats) => {
              // Handle saving game stats as notes
              const gameNote = {
                id: `game-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
                title: `🎮 ${stats.game} Session - Score: ${stats.score}`,
                text: `Game: ${stats.game}\nScore: ${stats.score}\nLevel: ${stats.level}\nLines: ${stats.lines}\nTime: ${stats.timeSpent}s\nDate: ${new Date(stats.date).toLocaleString()}`,
                timestamp: new Date().toISOString(),
                tags: ['game', 'stacker', 'fun'],
                noteType: 'text_note' as const,
                isSynced: false,
                translations: {},
                attachedMedia: []
              };
              addNote(gameNote);
            }}
          />
        );
      case 'manageNotes':
        return (
          <ManageNotesModal
            visible={true}
            onClose={() => setCurrentScreen('record')}
          />
        );
      case 'settings':
        return (
          <SettingsPage onBack={() => setCurrentScreen('record')} />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.container}>
          {renderHeader()}
          <View style={styles.content}>
            {renderContent()}
          </View>
          <StatusBar style="light" />
        </SafeAreaView>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 40,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
});
