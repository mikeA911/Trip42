import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Note {
  id: string;
  title: string;
  text: string;
  timestamp: string;
  tags: string[];
  translations: { [language: string]: string };
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  attachedMedia: string[];
  noteType: 'text_note' | 'voice_recording' | 'sign_translation' | 'photo_translation' | 'zaphod_note' | 'ford_note' | 'arthur_note' | 'marvin_note' | 'archive';
  originalText?: string;
  polishedText?: string;
}

const NOTES_KEY = 'hitchtrip_notes';
const SETTINGS_KEY = 'hitchtrip_settings';

export const saveNote = async (note: Note): Promise<void> => {
  try {
    const existingNotes = await getNotes();
    const updatedNotes = [note, ...existingNotes];
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
  } catch (error) {
    console.error('Error saving note:', error);
    throw error;
  }
};

export const getNotes = async (): Promise<Note[]> => {
  try {
    const notesJson = await AsyncStorage.getItem(NOTES_KEY);
    return notesJson ? JSON.parse(notesJson) : [];
  } catch (error) {
    console.error('Error getting notes:', error);
    return [];
  }
};

export const deleteNote = async (noteId: string): Promise<void> => {
  try {
    const existingNotes = await getNotes();
    const updatedNotes = existingNotes.filter(note => note.id !== noteId);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
};

export const updateNote = async (updatedNote: Note): Promise<void> => {
  try {
    const existingNotes = await getNotes();
    const updatedNotes = existingNotes.map(note =>
      note.id === updatedNote.id ? updatedNote : note
    );
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  }
};

export const saveSettings = async (settings: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

export const getSettings = async (): Promise<any> => {
  try {
    const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
    return settingsJson ? JSON.parse(settingsJson) : {
      uiLanguage: 'en',
      defaultTargetLanguage: 'lo',
      theme: 'dark'
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return {
      uiLanguage: 'en',
      defaultTargetLanguage: 'lo',
      theme: 'dark'
    };
  }
};

export const generateNoteId = (): string => {
  return `note-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};