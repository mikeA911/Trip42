// src/media-storage/MediaStorage.ts
import { supportsOPFS, isBrowser, isReactNative } from "./platformDetector";
import * as opfs from "./adapters/web-opfs";
import * as idb from "./adapters/indexeddb-fallback";
import * as native from "./adapters/native-expo";

/** Generate unique media ID */
export function generateMediaId(): string {
  return `media_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Make canonical media path */
export function makeMediaPath(noteId: string, filename?: string) {
  const safeName = filename ? filename.replace(/\s+/g, "_") : generateMediaId();
  return `trip42-media/${noteId}/${safeName}`;
}

/** Image compression + thumbnail (browser-only) */
export async function compressImage(file: File | Blob, maxWidth = 1600, maxHeight = 1600, quality = 0.8): Promise<Blob> {
  if (!(file instanceof Blob)) throw new Error("compressImage expects a Blob/File");
  // load image
  const img = await loadImageFromBlob(file);
  const { width, height } = getScaledDimensions(img.width, img.height, maxWidth, maxHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  return await blobFromCanvas(canvas, "image/jpeg", quality);
}

export async function generateThumbnail(file: File | Blob, thumbMax = 320): Promise<Blob> {
  const img = await loadImageFromBlob(file);
  const { width, height } = getScaledDimensions(img.width, img.height, thumbMax, thumbMax);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  return await blobFromCanvas(canvas, "image/jpeg", 0.7);
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function getScaledDimensions(w: number, h: number, maxW: number, maxH: number) {
  let ratio = Math.min(maxW / w, maxH / h, 1);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function blobFromCanvas(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.8): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => {
      if (!b) resolve(new Blob());
      else resolve(b);
    }, type, quality);
  });
}

/** Save media for a note:
 *  - compress image & create thumbnail
 *  - store both under media/{noteId}/
 *  - return the path of the full image (and optionally thumbnail path)
 */
export async function saveMediaForNote(noteId: string, file: File | Blob, suggestedName?: string) {
  // Suggested filename
  const baseName = suggestedName || `media_${Date.now()}.jpg`;
  const fullName = baseName;
  const thumbName = `thumb_${baseName}`;

  if (!isBrowser && isReactNative) {
    // native adapter (placeholder)
    return await native.writeNativeFile(`${noteId}/${fullName}`, file as Blob);
  }

  // If image (detect by type)
  const isImage = (file as File).type?.startsWith?.("image") ?? true;

  if (isImage) {
    // compress & thumbnail (browser)
    const compressed = await compressImage(file as File, 1600, 1600, 0.8);
    const thumb = await generateThumbnail(file as File, 320);

    const path = makeMediaPath(noteId, fullName);
    const thumbPath = makeMediaPath(noteId, thumbName);

    if (supportsOPFS) {
      await opfs.writeFile(path, compressed);
      await opfs.writeFile(thumbPath, thumb);
    } else {
      await idb.idbPut(path, compressed);
      await idb.idbPut(thumbPath, thumb);
    }
    return { path, thumbPath };
  } else {
    // non-image: store raw blob
    const path = makeMediaPath(noteId, fullName);
    if (supportsOPFS) await opfs.writeFile(path, file as Blob);
    else await idb.idbPut(path, file as Blob);
    return { path, thumbPath: undefined };
  }
}

/** Get File object for path (for uploads) */
export async function getFileForPath(path: string): Promise<File> {
  if (!isBrowser && isReactNative) {
    // Native must be implemented in native adapter (expo-file-system reading)
    throw new Error("Native getFileForPath should be implemented in native adapter.");
  }
  if (supportsOPFS) {
    const f = await opfs.readFile(path);
    return f;
  } else {
    const blob = await idb.idbGet(path);
    if (!blob) throw new Error("File not found: " + path);
    return new File([blob], path.split("/").pop() || "file.bin", { type: blob.type || "application/octet-stream" });
  }
}

/** Create preview URL for UI */
export async function getPreviewURL(path: string): Promise<string> {
  const file = await getFileForPath(path);
  return URL.createObjectURL(file);
}

/** Delete a single path */
export async function deleteMediaPath(path: string) {
  if (!isBrowser && isReactNative) {
    // native remove -> implement in native adapter later
    return;
  }
  if (supportsOPFS) {
    // OPFS removeEntry expects file name; when called with media/noteId/file.jpg it will delete file
    await opfs.removeEntry(path, { recursive: false });
  } else {
    await idb.idbDelete(path);
  }
}

/** Delete all media under note directory (bulk delete)
 * When OPFS available use recursive remove; otherwise use idbDeletePrefix
 */
export async function deleteMediaForNote(noteId: string) {
  const dirPath = `trip42-media/${noteId}`;
  if (!isBrowser && isReactNative) {
    await native.deleteNativeFolder(noteId);
    return;
  }
  if (supportsOPFS) {
    await opfs.removeEntry(dirPath, { recursive: true });
  } else {
    // IndexedDB bulk delete by prefix
    await idb.idbDeletePrefix(dirPath);
  }
}

/** Prepare a File/Blob for upload to storage */
export async function prepareMediaForUpload(path: string): Promise<File> {
  return await getFileForPath(path);
}
