import JSZip from 'jszip';
import { Note } from './storage';
import { getFileForPath } from '../media-storage/MediaStorage';
import * as MediaStorage from '../media-storage/MediaStorage';

export interface ExportManifest {
  version: string;
  exportedAt: string;
  appVersion: string;
  noteCount: number;
  mediaCount: number;
  totalSize: number;
}

/**
 * Convert internal media paths to relative paths for export
 * Internal: "trip42-media/note123/img001.jpg"
 * Export: "media/note123/img001.jpg"
 */
function convertToRelativePath(internalPath: string): string {
  return internalPath.replace('trip42-media/', 'media/');
}

/**
 * Convert relative paths back to internal paths for import
 * Export: "media/note123/img001.jpg"
 * Internal: "trip42-media/note123/img001.jpg"
 */
export function convertToInternalPath(relativePath: string): string {
  return relativePath.replace('media/', 'trip42-media/');
}

/**
 * Create a ZIP bundle export with the structure:
 * Notes-2025-11-26.t42
 * ├── notes.json         ← notes with relative media paths
 * ├── media/
 * │   ├── note123/img001.jpg
 * │   ├── note123/thumb_img001.jpg
 * │   └── note456/recording001.m4a
 * └── manifest.json      ← metadata
 */
export async function createTrip42Bundle(notes: Note[]): Promise<Blob> {
  console.log('createTrip42Bundle: Starting export for', notes.length, 'notes');
  const zip = new JSZip();

  // Prepare notes with relative paths
  const exportNotes = notes.map(note => ({
    ...note,
    attachedMedia: note.attachedMedia.map(convertToRelativePath)
  }));

  // Add notes.json
  zip.file('notes.json', JSON.stringify(exportNotes, null, 2));

  // Collect all media files with improved error handling
  const mediaFiles: { path: string; file: File }[] = [];
  let failedMediaCount = 0;

  for (const note of notes) {
    console.log(`createTrip42Bundle: Processing note ${note.id} with ${note.attachedMedia?.length || 0} media files`);
    
    for (const mediaPath of note.attachedMedia || []) {
      try {
        // Add timeout for individual media file loading
        const filePromise = getFileForPath(mediaPath);
        const timeoutPromise = new Promise<File>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout loading media: ${mediaPath}`)), 10000)
        );

        const file = await Promise.race([filePromise, timeoutPromise]);
        const relativePath = convertToRelativePath(mediaPath);
        mediaFiles.push({ path: relativePath, file });
        console.log(`createTrip42Bundle: Successfully loaded media ${mediaPath} -> ${relativePath} (${file.size} bytes)`);
      } catch (error) {
        failedMediaCount++;
        console.warn(`createTrip42Bundle: Failed to load media file ${mediaPath}:`, error);
        // Continue processing other media files instead of failing completely
      }
    }
  }

  console.log(`createTrip42Bundle: Loaded ${mediaFiles.length} media files, ${failedMediaCount} failed`);

  // Add media files to ZIP
  for (const { path, file } of mediaFiles) {
    try {
      zip.file(path, file);
    } catch (error) {
      console.warn(`createTrip42Bundle: Failed to add ${path} to ZIP:`, error);
    }
  }

  // Create manifest
  const manifest: ExportManifest = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    appVersion: 'PWA-Beta-11',
    noteCount: notes.length,
    mediaCount: mediaFiles.length,
    totalSize: mediaFiles.reduce((total, { file }) => total + file.size, 0)
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Generate ZIP blob with timeout
  console.log('createTrip42Bundle: Generating ZIP blob...');
  try {
    const zipBlob = await Promise.race([
      zip.generateAsync({ type: 'blob' }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('ZIP generation timeout')), 15000)
      )
    ]);
    console.log('createTrip42Bundle: ZIP generation completed successfully');
    return zipBlob;
  } catch (error) {
    console.error('createTrip42Bundle: ZIP generation failed:', error);
    throw new Error(`Failed to generate ZIP bundle: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Export notes as a .t42 ZIP bundle and trigger download
 */
export async function exportNotesAsTrip42Bundle(notes: Note[], customName?: string): Promise<void> {
  console.log('exportNotesAsTrip42Bundle: Starting export for', notes.length, 'notes');
  
  try {
    // Add timeout for the entire export process
    const exportPromise = createTrip42Bundle(notes);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Export process timeout')), 45000)
    );

    const zipBlob = await Promise.race([exportPromise, timeoutPromise]);
    console.log('exportNotesAsTrip42Bundle: ZIP bundle created, size:', zipBlob.size, 'bytes');

    const url = URL.createObjectURL(zipBlob);

    const dateStr = new Date().toISOString().split('T')[0];
    const defaultName = `Notes-${dateStr}`;
    const filename = `${customName || defaultName}.t42`;

    console.log('exportNotesAsTrip42Bundle: Triggering download for', filename);

    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    console.log('exportNotesAsTrip42Bundle: Download triggered successfully');
  } catch (error) {
    console.error('exportNotesAsTrip42Bundle: Failed to export notes:', error);
    throw new Error(`Failed to create export bundle: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse a .trip42 ZIP bundle and extract notes and media
 */
export async function parseTrip42Bundle(zipBlob: Blob): Promise<{
  notes: Note[];
  manifest: ExportManifest;
  mediaFiles: { path: string; blob: Blob }[];
}> {
  const zip = new JSZip();
  const zipContents = await zip.loadAsync(zipBlob);

  // Read manifest
  const manifestFile = zipContents.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Invalid bundle: missing manifest.json');
  }
  const manifestContent = await manifestFile.async('text');
  const manifest: ExportManifest = JSON.parse(manifestContent);

  // Read notes
  const notesFile = zipContents.file('notes.json');
  if (!notesFile) {
    throw new Error('Invalid bundle: missing notes.json');
  }
  const notesContent = await notesFile.async('text');
  const exportNotes = JSON.parse(notesContent);

  // Convert relative paths back to internal paths
  const notes: Note[] = exportNotes.map((note: any) => ({
    ...note,
    attachedMedia: note.attachedMedia.map(convertToInternalPath)
  }));

  // Extract media files
  const mediaFiles: { path: string; blob: Blob }[] = [];

  // Get all files in the ZIP
  zipContents.forEach(async (relativePath, file) => {
    if (relativePath.startsWith('media/') && !file.dir) {
      const blob = await file.async('blob');
      mediaFiles.push({ path: relativePath, blob });
    }
  });

  return { notes, manifest, mediaFiles };
}

/**
 * Import notes and media from a .trip42 bundle
 */
export async function importTrip42Bundle(zipBlob: Blob): Promise<{
  importedNotes: Note[];
  importedMediaCount: number;
}> {
  const { notes, mediaFiles } = await parseTrip42Bundle(zipBlob);

  // Store media files in OPFS/IndexedDB
  for (const { path, blob } of mediaFiles) {
    const internalPath = convertToInternalPath(path);

    // Store the blob using the media storage system
    // We need to extract the noteId and filename from the path
    const pathParts = internalPath.split('/');
    if (pathParts.length >= 3) {
      const noteId = pathParts[1]; // trip42-media/{noteId}/filename
      const filename = pathParts.slice(2).join('/'); // filename.ext

      // Create a File object from the blob
      const file = new File([blob], filename, { type: blob.type });

      // Store using the media storage system
      await MediaStorage.saveMediaForNote(noteId, file, filename);
    }
  }

  return {
    importedNotes: notes,
    importedMediaCount: mediaFiles.length
  };
}