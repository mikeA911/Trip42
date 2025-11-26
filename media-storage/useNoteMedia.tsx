// src/media-storage/useNoteMedia.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import * as MediaStorage from "./MediaStorage";
import type { Note } from "../utils/storage"; // import Note type from utils/storage

export function useNoteMedia(note: Note) {
  const [mediaPaths, setMediaPaths] = useState<string[]>(note.attachedMedia ?? []);
  const [previewMap, setPreviewMap] = useState<Record<string, string>>({});
  const mountedRef = useRef(true);

  useEffect(() => {
    setMediaPaths(note.attachedMedia ?? []);
  }, [note.attachedMedia]);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      const prev: Record<string, string> = {};
      for (const p of mediaPaths) {
        try {
          const url = await MediaStorage.getPreviewURL(p);
          prev[p] = url;
        } catch (e) {
          console.warn("preview err", e);
        }
      }
      if (mountedRef.current) setPreviewMap(prev);
    })();
    return () => {
      mountedRef.current = false;
      Object.values(previewMap).forEach(u => {
        try { URL.revokeObjectURL(u); } catch {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaPaths]);

  const addMedia = useCallback(async (file: File | Blob, suggestedName?: string) => {
    const { path, thumbPath } = await MediaStorage.saveMediaForNote(note.id, file, suggestedName) as { path: string; thumbPath?: string };
    const next = [...mediaPaths, path];
    setMediaPaths(next);
    return { path, thumbPath };
  }, [mediaPaths, note.id]);

  const removeMedia = useCallback(async (path: string) => {
    await MediaStorage.deleteMediaPath(path);
    const next = mediaPaths.filter(p => p !== path);
    setMediaPaths(next);
    return next;
  }, [mediaPaths]);

  return { mediaPaths, previewMap, addMedia, removeMedia };
}
