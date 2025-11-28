// src/media-storage/adapters/native-expo.ts
// Minimal scaffold for Expo (native). Requires expo-file-system on native build.
import * as FileSystem from "expo-file-system";

export const getAppMediaDir = async () => {
  const dir = `${(FileSystem as any).documentDirectory}trip_media/`;
  try {
    const stat = await FileSystem.getInfoAsync(dir);
    if (!stat.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch (e) {
    try { await FileSystem.makeDirectoryAsync(dir, { intermediates: true }); } catch {}
  }
  return dir;
};

/** writeNativeFile returns a file:// URI */
export async function writeNativeFile(relPath: string, blob: Blob | File) {
  const dir = await getAppMediaDir();
  const filename = relPath.split("/").pop()!;
  const localPath = `${dir}${filename}`;
  const arrayBuffer = await (blob as Blob).arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  const base64 = Buffer.from(uint8).toString("base64");
  await FileSystem.writeAsStringAsync(localPath, base64, { encoding: (FileSystem as any).EncodingType.Base64 });
  return `file://${localPath}`;
}

export async function deleteNativeFolder(noteId: string) {
  const dir = `${(await getAppMediaDir())}${noteId}`;
  try {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  } catch (e) { /* ignore */ }
}

/** readNativeFile returns a File object for a relative path */
export async function readNativeFile(relPath: string): Promise<File> {
  const dir = await getAppMediaDir();
  const localPath = `${dir}${relPath.split('/').pop()!}`; // Get filename from path

  try {
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (!fileInfo.exists) {
      throw new Error(`File not found: ${localPath}`);
    }

    // Read as base64
    const base64Data = await FileSystem.readAsStringAsync(localPath, {
      encoding: 'base64',
    });

    // Convert to blob and then to File
    const mimeType = getMimeTypeFromPath(relPath);
    const blob = base64ToBlob(base64Data, mimeType);
    return new File([blob], relPath.split('/').pop() || 'file.bin', { type: mimeType });
  } catch (error) {
    throw new Error(`Failed to read native file: ${error}`);
  }
}

function getMimeTypeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
      return 'audio/mp4';
    default:
      return 'application/octet-stream';
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
