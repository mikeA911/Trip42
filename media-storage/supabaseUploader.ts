// src/media-storage/supabaseUploader.ts
import { createClient } from "@supabase/supabase-js";
import { prepareMediaForUpload } from "./MediaStorage";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function uploadNoteMediaToSupabase(note: { id: string; attachedMedia: string[] }) {
  const bucket = "media";
  const uploadedUrls: string[] = [];
  for (const path of note.attachedMedia) {
    try {
      const file = await prepareMediaForUpload(path);
      const destPath = `${path}`; // preserves folderish structure
      const { error } = await supabase.storage.from(bucket).upload(destPath, file, { upsert: true });
      if (error) throw error;

      // Get public URL
      const { data } = supabase.storage.from(bucket).getPublicUrl(destPath);
      uploadedUrls.push(data.publicUrl);
    } catch (e) {
      console.error("upload error for", path, e);
      throw e;
    }
  }
  return uploadedUrls;
}
