// src/media-storage/adapters/web-opfs.ts
// OPFS adapter (Chromium-based browsers)
export async function ensureRoot() {
  // @ts-ignore
  return await (navigator as any).storage.getDirectory();
}

export async function ensureDir(dirPath: string) {
  const root = await ensureRoot();
  const parts = dirPath.split("/").filter(Boolean);
  let handle: any = root;
  for (const part of parts) {
    handle = await handle.getDirectoryHandle(part, { create: true });
  }
  return handle;
}

/** Write a blob to a file path like "media/note-xxx/img_1.jpg" */
export async function writeFile(path: string, blob: Blob) {
  const parts = path.split("/").filter(Boolean);
  const filename = parts.pop()!;
  const dirPath = parts.join("/");
  const dirHandle = dirPath ? await ensureDir(dirPath) : await ensureRoot();
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/** Read file and return File object */
export async function readFile(path: string): Promise<File> {
  const parts = path.split("/").filter(Boolean);
  const filename = parts.pop()!;
  let handle: any = await ensureRoot();
  for (const p of parts) handle = await handle.getDirectoryHandle(p);
  const fileHandle = await handle.getFileHandle(filename);
  return await fileHandle.getFile();
}

/** Recursively remove entry (file or directory) */
export async function removeEntry(path: string, options: { recursive?: boolean } = { recursive: false }) {
  const root = await ensureRoot();
  await root.removeEntry(path, options);
}

export function fileToObjectURL(file: File) {
  return URL.createObjectURL(file);
}
