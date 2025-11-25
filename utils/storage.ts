import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// IndexedDB wrapper for PWA media storage
const indexedDBStorage = {
  dbName: 'Trip42Media',
  storeName: 'media',

  async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      db.close();
    } catch (error) {
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      return new Promise<string | null>((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      db.close();
    } catch (error) {
      throw error;
    }
  }
};

// Storage wrapper for notes - try AsyncStorage first, fallback to localStorage
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    console.log('DEBUG: storage.getItem called for key:', key);

    // Try AsyncStorage first (works in native apps and some PWAs)
    try {
      console.log('DEBUG: Trying AsyncStorage.getItem first');
      const result = await AsyncStorage.getItem(key);
      console.log('DEBUG: AsyncStorage.getItem successful, result:', result ? 'found' : 'null');
      return result;
    } catch (asyncError) {
      console.log('DEBUG: AsyncStorage.getItem failed, trying localStorage:', asyncError instanceof Error ? asyncError.message : String(asyncError));

      // Fallback to localStorage (works in PWAs)
      try {
        const result = localStorage.getItem(key);
        console.log('DEBUG: localStorage.getItem result:', result ? 'found' : 'null');
        return result;
      } catch (localError) {
        console.error('DEBUG: Both AsyncStorage and localStorage failed for getItem:', localError);
        return null;
      }
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    console.log('DEBUG: storage.setItem called for key:', key, 'value length:', value.length);

    // Try AsyncStorage first (works in native apps and some PWAs)
    try {
      console.log('DEBUG: Trying AsyncStorage.setItem first');
      await AsyncStorage.setItem(key, value);
      console.log('DEBUG: AsyncStorage.setItem successful');
      return;
    } catch (asyncError) {
      console.log('DEBUG: AsyncStorage.setItem failed, trying localStorage:', asyncError instanceof Error ? asyncError.message : String(asyncError));

      // Fallback to localStorage (works in PWAs)
      try {
        localStorage.setItem(key, value);
        console.log('DEBUG: localStorage.setItem successful');
        return;
      } catch (localError) {
        console.error('DEBUG: Both AsyncStorage and localStorage failed for setItem:', localError);
        throw localError;
      }
    }
  },

  removeItem: async (key: string): Promise<void> => {
    console.log('DEBUG: storage.removeItem called for key:', key);

    // Try AsyncStorage first
    try {
      console.log('DEBUG: Trying AsyncStorage.removeItem first');
      await AsyncStorage.removeItem(key);
      console.log('DEBUG: AsyncStorage.removeItem successful');
      return;
    } catch (asyncError) {
      console.log('DEBUG: AsyncStorage.removeItem failed, trying localStorage:', asyncError instanceof Error ? asyncError.message : String(asyncError));

      // Fallback to localStorage
      try {
        localStorage.removeItem(key);
        console.log('DEBUG: localStorage.removeItem successful');
        return;
      } catch (localError) {
        console.error('DEBUG: Both AsyncStorage and localStorage failed for removeItem:', localError);
        throw localError;
      }
    }
  }
};

// Media storage for PWAs - uses IndexedDB to store file data separately
export const mediaStorage = {
  async saveMedia(mediaId: string, dataUrl: string): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('DEBUG: Saving media to IndexedDB:', mediaId, 'size:', dataUrl.length);
      await indexedDBStorage.setItem(mediaId, dataUrl);
    } else {
      // For native apps, media is already saved to filesystem
      console.log('DEBUG: Media storage not needed for native apps');
    }
  },

  async getMedia(mediaId: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      console.log('DEBUG: Loading media from IndexedDB:', mediaId);
      return await indexedDBStorage.getItem(mediaId);
    } else {
      // For native apps, return the file URI directly
      return null;
    }
  },

  async deleteMedia(mediaId: string): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('DEBUG: Deleting media from IndexedDB:', mediaId);
      await indexedDBStorage.removeItem(mediaId);
    } else {
      // For native apps, file deletion is handled elsewhere
      console.log('DEBUG: Media deletion not needed for native apps');
    }
  }
};

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
  attachedMedia: string[]; // Stores local file URIs for media stored on device filesystem
  noteType: 'text_note' | 'voice_recording' | 'sign_translation' | 'photo_translation' | 'zaphod_note' | 'ford_note' | 'arthur_note' | 'marvin_note' | 'archive';
  originalText?: string;
  polishedText?: string;
}

const NOTES_KEY = 'hitchtrip_notes';
const SETTINGS_KEY = 'hitchtrip_settings';

export const saveNote = async (note: Note): Promise<void> => {
  try {
    console.log('DEBUG: saveNote called with note:', {
      id: note.id,
      title: note.title,
      text: note.text?.substring(0, 100),
      timestamp: note.timestamp,
      tags: note.tags,
      attachedMediaCount: note.attachedMedia?.length,
      noteType: note.noteType,
      location: note.location
    });

    console.log('DEBUG: Getting existing notes...');
    const existingNotes = await getNotes();
    console.log('DEBUG: existingNotes count:', existingNotes.length);

    console.log('DEBUG: Creating updated notes array...');
    const updatedNotes = [note, ...existingNotes];
    console.log('DEBUG: updatedNotes count:', updatedNotes.length);

    console.log('DEBUG: Converting to JSON string...');
    const jsonString = JSON.stringify(updatedNotes);
    console.log('DEBUG: JSON string length:', jsonString.length);

    if (jsonString.length > 4 * 1024 * 1024) { // 4MB limit
      console.log('DEBUG: JSON size exceeds 4MB limit');
      throw new Error('Note data too large to save. Please reduce attached media size.');
    }

    console.log('DEBUG: About to save to storage...');
    await storage.setItem(NOTES_KEY, jsonString);
    console.log('DEBUG: note saved successfully to storage');
  } catch (error) {
    console.error('DEBUG: Error saving note:', error);
    console.error('DEBUG: Error type:', typeof error);
    console.error('DEBUG: Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
};

export const getNotes = async (): Promise<Note[]> => {
  try {
    console.log('DEBUG: getNotes called');
    const notesJson = await storage.getItem(NOTES_KEY);
    console.log('DEBUG: notesJson length:', notesJson?.length);
    if (!notesJson) {
      console.log('DEBUG: no notesJson, returning empty array');
      return [];
    }

    const parsedNotes = JSON.parse(notesJson);
    console.log('DEBUG: parsedNotes count:', parsedNotes.length);

    // Validate and filter out corrupted notes
    const validNotes = parsedNotes.filter((note: any) => {
      const isValid = note &&
             typeof note.id === 'string' &&
             typeof note.title === 'string' &&
             typeof note.text === 'string' &&
             typeof note.timestamp === 'string' &&
             Array.isArray(note.tags) &&
             typeof note.translations === 'object' &&
             Array.isArray(note.attachedMedia) &&
             typeof note.noteType === 'string';
      if (!isValid) {
        console.log('DEBUG: invalid note:', {
          id: note?.id,
          title: note?.title,
          hasText: typeof note?.text === 'string',
          hasTimestamp: typeof note?.timestamp === 'string',
          tagsIsArray: Array.isArray(note?.tags),
          translationsIsObject: typeof note?.translations === 'object',
          attachedMediaIsArray: Array.isArray(note?.attachedMedia),
          noteType: note?.noteType
        });
      }
      return isValid;
    });

    console.log('DEBUG: validNotes count:', validNotes.length);

    // If some notes were filtered out, save the cleaned list
    if (validNotes.length !== parsedNotes.length) {
      console.warn(`Filtered out ${parsedNotes.length - validNotes.length} corrupted notes`);
      await storage.setItem(NOTES_KEY, JSON.stringify(validNotes));
    }

    return validNotes;
  } catch (error) {
    console.error('Error getting notes:', error);
    // If parsing fails completely, try to clear corrupted data
    try {
      await storage.removeItem(NOTES_KEY);
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
    await storage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
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
    await storage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  }
};


export const generateNoteId = (): string => {
  return `note-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};
