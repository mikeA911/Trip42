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
