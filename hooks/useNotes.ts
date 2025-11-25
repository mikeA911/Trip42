import { useState, useEffect } from 'react';
import { Note, getNotes, saveNote, deleteNote, updateNote } from '../utils/storage';

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      console.log('DEBUG: useNotes loadNotes called');
      setLoading(true);
      const storedNotes = await getNotes();
      console.log('DEBUG: useNotes loaded notes count:', storedNotes.length);
      setNotes(storedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (note: Note) => {
    try {
      console.log('DEBUG: useNotes addNote called with note id:', note.id);
      console.log('DEBUG: useNotes note type:', note.noteType, 'attachedMedia count:', note.attachedMedia?.length || 0);

      console.log('DEBUG: useNotes calling saveNote...');
      await saveNote(note);
      console.log('DEBUG: useNotes saveNote completed successfully');

      console.log('DEBUG: useNotes updating state...');
      setNotes(prev => {
        const newNotes = [note, ...prev];
        console.log('DEBUG: useNotes note added to state, new count:', newNotes.length);
        return newNotes;
      });

      console.log('DEBUG: useNotes addNote completed successfully');
    } catch (error) {
      console.error('DEBUG: Error in useNotes addNote:', error);
      console.error('DEBUG: Error type:', typeof error);
      console.error('DEBUG: Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  };

  const removeNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Error removing note:', error);
      throw error;
    }
  };

  const editNote = async (updatedNote: Note) => {
    try {
      await updateNote(updatedNote);
      setNotes(prev => prev.map(note =>
        note.id === updatedNote.id ? updatedNote : note
      ));
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  };

  const getNoteById = (noteId: string): Note | undefined => {
    return notes.find(note => note.id === noteId);
  };

  const getNotesByTag = (tag: string): Note[] => {
    return notes.filter(note => note.tags.includes(tag));
  };

  const getNotesByType = (type: Note['noteType']): Note[] => {
    return notes.filter(note => note.noteType === type);
  };

  return {
    notes,
    loading,
    addNote,
    removeNote,
    editNote,
    getNoteById,
    getNotesByTag,
    getNotesByType,
    refreshNotes: loadNotes
  };
};