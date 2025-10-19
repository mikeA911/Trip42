import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Share
} from 'react-native';
import { Note } from '../utils/storage';

interface NotesListProps {
  notes: Note[];
  onNotePress: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  loading?: boolean;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  onNotePress,
  onDeleteNote,
  loading = false
}) => {
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());

  const handleLongPress = (noteId: string) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    setSelectedNotes(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedNotes.size === 0) return;

    Alert.alert(
      'Delete Notes',
      `Delete ${selectedNotes.size} selected note${selectedNotes.size > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            selectedNotes.forEach(noteId => onDeleteNote(noteId));
            setSelectedNotes(new Set());
          }
        }
      ]
    );
  };

  const handleShareSelected = async () => {
    if (selectedNotes.size === 0) return;

    const notesToShare = notes.filter(note => selectedNotes.has(note.id));
    const shareText = notesToShare.map(note =>
      `${note.title}\n${note.text}\n---\n`
    ).join('\n');

    try {
      await Share.share({
        message: shareText,
        title: `Shared ${notesToShare.length} note${notesToShare.length > 1 ? 's' : ''} from Trip42`
      });
    } catch (error) {
      console.error('Error sharing notes:', error);
    }
  };

  const renderNoteItem = ({ item }: { item: Note }) => {
    const isSelected = selectedNotes.has(item.id);

    const getTypeIcon = (type: Note['noteType']) => {
      switch (type) {
        case 'voice_recording': return '🎙️';
        case 'sign_translation': return '📷';
        case 'photo_translation': return '🖼️';
        case 'zaphod_note': return '🤖';
        case 'ford_note': return '🚀';
        case 'arthur_note': return '👔';
        case 'marvin_note': return '😔';
        case 'archive': return '📦';
        default: return '📝';
      }
    };

    const formatDate = (timestamp: string) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) return 'Today';
      if (diffDays === 2) return 'Yesterday';
      if (diffDays <= 7) return `${diffDays - 1} days ago`;
      return date.toLocaleDateString();
    };

    return (
      <TouchableOpacity
        style={[styles.noteItem, isSelected && styles.noteItemSelected]}
        onPress={() => {
          if (selectedNotes.size > 0) {
            handleLongPress(item.id);
          } else {
            onNotePress(item);
          }
        }}
        onLongPress={() => handleLongPress(item.id)}
        delayLongPress={500}
      >
        <View style={styles.noteHeader}>
          <View style={styles.noteTitleRow}>
            <Text style={styles.typeIcon}>{getTypeIcon(item.noteType)}</Text>
            <Text style={styles.noteTitle} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          <Text style={styles.noteDate}>{formatDate(item.timestamp)}</Text>
        </View>

        <Text style={styles.notePreview} numberOfLines={2}>
          {item.text}
        </Text>

        {item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map(tag => (
              <Text key={tag} style={styles.tag}>
                #{tag}
              </Text>
            ))}
            {item.tags.length > 3 && (
              <Text style={styles.moreTags}>+{item.tags.length - 3}</Text>
            )}
          </View>
        )}

        {item.translations && Object.keys(item.translations).length > 0 && (
          <View style={styles.translationIndicator}>
            <Text style={styles.translationText}>
              🌐 {Object.keys(item.translations).length} translation{Object.keys(item.translations).length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading notes...</Text>
      </View>
    );
  }

  if (notes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyTitle}>No notes yet</Text>
        <Text style={styles.emptyText}>
          Start recording or translating to create your first note!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedNotes.size > 0 && (
        <View style={styles.selectionHeader}>
          <Text style={styles.selectionText}>
            {selectedNotes.size} selected
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShareSelected}
            >
              <Text style={styles.actionButtonText}>📤 Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteSelected}
            >
              <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={notes}
        renderItem={renderNoteItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  selectionText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectionActions: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  actionButtonText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  deleteButtonText: {
    color: '#fff',
  },
  listContainer: {
    padding: 10,
  },
  noteItem: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  noteItemSelected: {
    borderColor: '#f59e0b',
    backgroundColor: '#2d3748',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  noteDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  notePreview: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    fontSize: 12,
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  moreTags: {
    fontSize: 12,
    color: '#6b7280',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  translationIndicator: {
    marginTop: 8,
  },
  translationText: {
    fontSize: 12,
    color: '#10b981',
    fontStyle: 'italic',
  },
});