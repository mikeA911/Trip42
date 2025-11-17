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
    if (!notesJson) return [];

    const parsedNotes = JSON.parse(notesJson);

    // Validate and filter out corrupted notes
    const validNotes = parsedNotes.filter((note: any) => {
      return note &&
             typeof note.id === 'string' &&
             typeof note.title === 'string' &&
             typeof note.text === 'string' &&
             typeof note.timestamp === 'string' &&
             Array.isArray(note.tags) &&
             typeof note.translations === 'object' &&
             Array.isArray(note.attachedMedia) &&
             typeof note.noteType === 'string';
    });

    // If some notes were filtered out, save the cleaned list
    if (validNotes.length !== parsedNotes.length) {
      console.warn(`Filtered out ${parsedNotes.length - validNotes.length} corrupted notes`);
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(validNotes));
    }

    return validNotes;
  } catch (error) {
    console.error('Error getting notes:', error);
    // If parsing fails completely, try to clear corrupted data
    try {
      await AsyncStorage.removeItem(NOTES_KEY);
      console.warn('Cleared corrupted notes data');
    } catch (clearError) {
      console.error('Error clearing corrupted data:', clearError);
    }
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


export const generateNoteId = (): string => {
  return `note-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};