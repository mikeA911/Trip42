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
      setLoading(true);
      const storedNotes = await getNotes();
      setNotes(storedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (note: Note) => {
    try {
      await saveNote(note);
      setNotes(prev => [note, ...prev]);
    } catch (error) {
      console.error('Error adding note:', error);
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