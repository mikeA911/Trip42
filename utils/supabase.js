// Supabase configuration and utilities
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { debugLog, debugError, debugNetworkRequest, debugNetworkResponse } from './utils/debugUtils';

// Temporary debug functions to avoid import error
const debugLog = (...args) => console.log('[DEBUG]', ...args);
const debugError = (...args) => console.error('[ERROR]', ...args);
const debugNetworkRequest = (url, method, headers, body) => console.log('[NETWORK REQUEST]', method, url);
const debugNetworkResponse = (url, status, headers, result) => console.log('[NETWORK RESPONSE]', status, url);

// Helper function to convert blob to base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const supabaseUrl = 'https://ofialssoolmzckjjngst.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9maWFsc3Nvb2xtemNrampuZ3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDQxMTMsImV4cCI6MjA3MjUyMDExM30.Dcch9cqaiqaRPQopBB384EYXq4CCIHkcDFvvFVHkXwk';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Get user profile from userId
export const getUserProfile = async (userId) => {
  try {
    console.log('Getting user profile for userId:', userId);

    // First try to get from users table (which has avatar column)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name, avatar')
      .eq('id', userId)
      .single();

    if (userData && !userError) {
      console.log('Retrieved user profile from users table:', userData);
      return {
        display_name: userData.name,
        email: null, // users table doesn't have email
        avatar_url: userData.avatar
      };
    }

    // Fallback to user_profiles table if not found in users table
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('display_name, email, avatar_url')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error getting user profile:', profileError);
      return { display_name: null, email: null, avatar_url: null };
    }

    console.log('Retrieved user profile from user_profiles table:', profileData);
    return profileData || { display_name: null, email: null, avatar_url: null };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { display_name: null, email: null, avatar_url: null };
  }
};

// Get user email from userId
export const getUserEmail = async (userId) => {
  try {
    console.log('Getting user email for userId:', userId);

    const response = await fetch('https://ofialssoolmzckjjngst.supabase.co/functions/v1/admin-get-user-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      throw new Error(`Failed to get user email: ${response.status}`);
    }

    const data = await response.json();
    console.log('Retrieved user email:', data.email);
    return data.email;
  } catch (error) {
    console.error('Error getting user email:', error);
    throw error;
  }
};

// Upload image to Supabase Storage
export const uploadImageToStorage = async (imageUri, userId, type = 'images') => {
  try {
    console.log('Starting image upload to Supabase Storage...');

    // Use userId for file path organization as specified
    console.log('Using userId for file organization:', userId);

    // Get file extension from URI
    const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;

    // Create unique path using userId
    const filePath = `${userId}/${type}/${fileName}`;
    console.log('Full file path:', filePath);

    // Convert image URI to array buffer (React Native compatible)
    console.log('Fetching image from URI:', imageUri);
    const response = await fetch(imageUri);
    console.log('Response status:', response.status, 'headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log('Array buffer created:', { size: uint8Array.length, type: `image/${fileExtension}` });

    console.log('Uploading to path:', filePath);

    // Skip bucket check entirely - let upload fail gracefully if bucket doesn't exist
    console.log('Attempting upload without bucket check...');

    // Upload to Supabase Storage

    // Test basic storage connectivity first
    console.log('Testing storage connectivity...');
    try {
      const { data: testData, error: testError } = await supabase.storage.listBuckets();
      console.log('Storage test result:', { buckets: testData?.length || 0, error: testError });
    } catch (testErr) {
      console.log('Storage connectivity test failed:', testErr);
    }

    // Upload to Supabase Storage
    console.log('Attempting upload with config:', {
      bucket: 'ikeNotesMedia',
      path: filePath,
      contentType: `image/${fileExtension}`,
      arraySize: uint8Array.length
    });

    const { data, error } = await supabase.storage
      .from('ikeNotesMedia')
      .upload(filePath, uint8Array, {
        contentType: `image/${fileExtension}`,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ikeNotesMedia')
      .getPublicUrl(filePath);

    console.log('Image uploaded successfully:', publicUrl);
    return publicUrl;

  } catch (error) {
    console.error('Error uploading image:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText
    });
    throw new Error(`Failed to upload image: ${error.message || 'Network request failed'}`);
  }
};

// Upload audio to Supabase Storage
export const uploadAudioToStorage = async (audioUri, userId) => {
  try {
    console.log('Starting audio upload to Supabase Storage...');

    // Use userId for file path organization as specified
    console.log('Using userId for audio file organization:', userId);

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.m4a`;
    const filePath = `${userId}/audio/${fileName}`;

    // Convert audio URI to array buffer (React Native compatible)
    const response = await fetch(audioUri);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log('Uploading audio to path:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('ikeNotesMedia')
      .upload(filePath, uint8Array, {
        contentType: 'audio/m4a',
        upsert: false
      });

    if (error) {
      console.error('Supabase audio upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ikeNotesMedia')
      .getPublicUrl(filePath);

    console.log('Audio uploaded successfully:', publicUrl);
    return publicUrl;

  } catch (error) {
    console.error('Error uploading audio:', error);
    throw error;
  }
};

// Upload image to sharing bucket (ikeNoteSharing) - using base64 for React Native compatibility
export const uploadImageForSharing = async (imageUri) => {
  try {
    console.log('Starting image upload to sharing bucket...');

    // Get file extension from URI
    const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `share-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;

    // Use sharing bucket path (no user folder needed for sharing)
    const filePath = `shared/${fileName}`;
    console.log('Sharing file path:', filePath);

    // Convert image URI to base64 for React Native compatibility
    console.log('Fetching image from URI:', imageUri);
    const response = await fetch(imageUri);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // Get the response as array buffer, then convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '');
    const base64Data = btoa(binaryString);

    console.log('Image converted to base64, size:', base64Data.length);

    // Upload to ikeNoteSharing bucket using base64 data
    console.log('Uploading to ikeNoteSharing bucket...');

    // Convert base64 back to Uint8Array for Supabase upload
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const { data, error } = await supabase.storage
      .from('ikeNoteSharing')
      .upload(filePath, binaryData, {
        contentType: `image/${fileExtension}`,
        upsert: false
      });

    if (error) {
      console.error('Supabase sharing upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ikeNoteSharing')
      .getPublicUrl(filePath);

    console.log('Image uploaded to sharing bucket:', publicUrl);
    return publicUrl;

  } catch (error) {
    console.error('Error uploading image for sharing:', error);
    throw new Error(`Failed to upload image for sharing: ${error.message || 'Network request failed'}`);
  }
};

// Verify if device is properly linked to user account
export const verifyDeviceLinking = async (userId, deviceId) => {
  try {
    console.log('Verifying device linking for user:', userId, 'device:', deviceId);

    if (!userId || !deviceId) {
      console.log('Missing userId or deviceId for verification');
      return false;
    }

    // Check if the device is linked to this user
    // First try user_devices table (if it exists)
    try {
      const { data, error } = await supabase
        .from('user_devices')
        .select('id')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        // If table doesn't exist, fall back to alternative verification
        if (error.message?.includes('user_devices')) {
          console.log('user_devices table not found, using alternative verification');
          return await verifyDeviceLinkingAlternative(userId, deviceId);
        }
        console.error('Error verifying device linking:', error);
        return false;
      }

      const isLinked = !!data;
      console.log('Device linking verification result:', isLinked);
      return isLinked;
    } catch (tableError) {
      console.log('user_devices table error, using alternative verification');
      return await verifyDeviceLinkingAlternative(userId, deviceId);
    }

  } catch (error) {
    console.error('Error in verifyDeviceLinking:', error);
    return false;
  }
};

// Alternative device linking verification using linkcodes table
export const verifyDeviceLinkingAlternative = async (userId, deviceId) => {
  try {
    console.log('Using linkcodes table for device linking verification');

    // Check if there's a completed linkcode for this user with this device ID
    const { data: completedLinks, error } = await supabase
      .from('linkcodes')
      .select('id, deviceid, status, createdat')
      .eq('userid', userId)
      .eq('status', 'completed')
      .eq('deviceid', deviceId)
      .order('createdat', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking linkcodes:', error);
      return false;
    }

    // If there's a completed linkcode with matching device ID, device is linked
    const isLinked = completedLinks && completedLinks.length > 0;
    console.log('Linkcodes verification result:', isLinked, completedLinks);
    return isLinked;

  } catch (error) {
    console.error('Error in linkcodes verification:', error);
    return false;
  }
};

// Get credits for user or device
export const getCredits = async (identifier, isRegistered = false) => {
  try {
    console.log('💰 === GETTING CREDITS ===');
    console.log('💰 Identifier:', identifier);
    console.log('💰 Is registered:', isRegistered);

    if (isRegistered && identifier) {
      // Registered user - get credits from users table
      console.log('💰 Getting credits for REGISTERED user:', identifier);
      console.log('💰 Query: users table, id =', identifier);

      const { data, error } = await supabase
        .from('users')
        .select('creditbalance, credithistory')
        .eq('id', identifier)
        .single();

      console.log('💰 Query result - data:', data, 'error:', error);

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching user credits:', error);
        console.log('💰 FALLBACK: Returning default 100 credits');
        return 100; // Default credits on error
      }

      if (error && error.code === 'PGRST116') {
        console.log('💰 User not found in database, returning 0 credits');
        return 0;
      }

      const credits = data?.creditbalance || 0;
      const history = data?.credithistory || [];
      console.log(`💰 Credits for REGISTERED user ${identifier}:`, credits);
      console.log(`💰 Credit history entries:`, history.length);
      console.log('💰 === CREDITS FETCH COMPLETE ===');
      return credits;

    } else if (identifier) {
      // Anonymous user - get credits by device_id from users table
      console.log('💰 Getting credits for ANONYMOUS device:', identifier);
      console.log('💰 Query: users table, deviceid =', identifier);

      const { data, error } = await supabase
        .from('users')
        .select('creditbalance, credithistory, id, isanonymous')
        .eq('deviceid', identifier)
        .single();

      console.log('💰 Query result - data:', data, 'error:', error);

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching device credits:', error);
        console.log('💰 FALLBACK: Returning default 100 credits');
        return 100; // Default credits on error
      }

      if (error && error.code === 'PGRST116') {
        console.log('💰 Device not found in database - creating NEW anonymous user');

        // Generate UUID for anonymous user
        const generateUUID = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };

        // Create new anonymous user record
        const newUser = {
          id: generateUUID(), // Generated UUID for anonymous user
          deviceid: identifier,
          isanonymous: true,
          role: 'Mobile User',
          name: 'Anonymous User',
          creditbalance: 100, // Welcome credits
          credithistory: [{
            date: new Date().toISOString(),
            amount: 100,
            description: 'Welcome Credits'
          }],
          subscriptions: [{
            id: 'sub_ikelog_free',
            name: 'ikeLog',
            status: 'active',
            renewalDate: 'N/A'
          }],
          linkeddevices: [],
          draftApplication: null,
          distributorAgreementConsent: null
        };

        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert(newUser)
          .select('creditbalance, credithistory, id, isanonymous')
          .single();

        if (createError) {
          console.error('❌ Error creating new anonymous user:', createError);
          console.log('💰 FALLBACK: Returning default 100 credits');
          return 100;
        }

        console.log('💰 Created new anonymous user:', createdUser.id);
        console.log(`💰 Credits for NEW anonymous user ${identifier}:`, createdUser.creditbalance);
        console.log('💰 === CREDITS FETCH COMPLETE ===');
        return createdUser.creditbalance || 100;
      }

      const credits = data?.creditbalance || 0;
      const history = data?.credithistory || [];
      const userId = data?.id;
      const isAnon = data?.isanonymous;

      console.log(`💰 Credits for ANONYMOUS device ${identifier}:`, credits);
      console.log(`💰 Associated user ID:`, userId);
      console.log(`💰 Is marked as anonymous in DB:`, isAnon);
      console.log(`💰 Credit history entries:`, history.length);
      console.log('💰 === CREDITS FETCH COMPLETE ===');
      return credits;

    } else {
      console.error('❌ No identifier provided for credit lookup');
      console.log('💰 FALLBACK: Returning default 100 credits');
      return 100; // Default credits
    }
  } catch (error) {
    console.error('❌ Error in getCredits:', error);
    console.log('💰 FALLBACK: Returning default 100 credits due to exception');
    return 100;
  }
};

// Get Ikigai teachings
export const getIkigaiTeachings = async () => {
  try {
    const { data, error } = await supabase
      .from('teachings')
      .select('text')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching teachings:', error);
      return [];
    }

    return data?.map(item => item.text) || [];
  } catch (error) {
    console.error('Error in getIkigaiTeachings:', error);
    return [];
  }
};

// Get settings
export const getSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getSettings:', error);
    return null;
  }
};

// Get about information
export const getAbout = async () => {
  try {
    const { data, error } = await supabase
      .from('about')
      .select('text')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching about:', error);
      return '';
    }

    return data?.text || '';
  } catch (error) {
    console.error('Error in getAbout:', error);
    return '';
  }
};

// Load notes from Supabase for a user
export const loadNotesFromSupabase = async (userId, sinceDate = null) => {
  try {
    console.log('Loading notes from Supabase for user:', userId, sinceDate ? `since ${sinceDate}` : 'all notes');

    // Build query
    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    // Add date filter if provided
    if (sinceDate) {
      query = query.gte('created_at', sinceDate);
    }

    const { data: notesData, error: notesError } = await query;

    if (notesError) {
      console.error('Error loading notes:', notesError);
      return [];
    }

    if (!notesData || notesData.length === 0) {
      console.log('No notes found for user');
      return [];
    }

    // Process each note - all data is already in the notes table
    const processedNotes = notesData.map(note => ({
      id: note.id,
      title: note.title,
      timestamp: note.created_at,
      tags: note.tags || [],
      noteType: note.note_type,
      location: note.location,
      attachedImages: note.attached_images || [],
      audioUri: note.audio_url,
      signImageUrl: note.sign_image_url,
      translations: note.translations || {},
      text: note.original_text,
      rawTranscription: note.original_text,
      polishedNote: note.polished_text
    }));

    console.log('Successfully loaded', processedNotes.length, 'notes from Supabase');
    return processedNotes;

  } catch (error) {
    console.error('Error loading notes from Supabase:', error);
    return [];
  }
};

// Sync notes to cloud using batch sync-notes function (new strategy)
export const syncNotesToCloud = async (notesToSync, deviceId) => {
  try {
    debugLog('🔄 SYNC-TO-CLOUD: Starting sync process');
    debugLog('🔄 SYNC-TO-CLOUD: Notes to sync count:', notesToSync.length);
    debugLog('🔄 SYNC-TO-CLOUD: Device ID:', deviceId);

    // Use the stored userId from device linking (no QR code required)
    let userId = null;

    // Get from AsyncStorage (from device linking, not QR sync)
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      debugLog('🔄 SYNC-TO-CLOUD: Retrieved userId from AsyncStorage:', storedUserId);
      if (storedUserId) {
        userId = storedUserId;
        debugLog('✅ SYNC-TO-CLOUD: Using linked userId:', userId);
      } else {
        debugLog('⚠️ SYNC-TO-CLOUD: No userId found in AsyncStorage, will use anonymous UUID');
        // Generate anonymous UUID for testing
        userId = '00000000-0000-0000-0000-000000000000';
        debugLog('✅ SYNC-TO-CLOUD: Using anonymous userId:', userId);
      }
    } catch (error) {
      debugError('❌ SYNC-TO-CLOUD: Error getting linked userId:', error);
      debugLog('⚠️ SYNC-TO-CLOUD: Falling back to anonymous user due to error');
      userId = '00000000-0000-0000-0000-000000000000';
      debugLog('✅ SYNC-TO-CLOUD: Using anonymous userId:', userId);
    }

    // Prepare notes data for batch sync
    const localNotes = [];
    const mediaFiles = [];

    for (const note of notesToSync) {
      try {
        // Generate a proper UUID for the note if it doesn't have one
        let noteId = note.id;
        if (noteId && noteId.startsWith('local-')) {
          // Generate a proper UUID for local notes
          noteId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          console.log(`Converting local note ID ${note.id} to UUID ${noteId}`);
        }

        // Normalize note format for sync-notes function
        let noteType = 'text_note';
        if (note.noteType) {
          if (note.noteType === 'sign') noteType = 'sign_translation';
          else if (note.noteType === 'voice') noteType = 'voice_recording';
          else if (note.noteType === 'text') noteType = 'text_note';
          else if (note.noteType === 'app') noteType = 'app';
        } else {
          // fallback to old logic
          if (note.signImageUrl) {
            noteType = 'sign_translation';
          } else if (note.audioUri || note.originalAudioUrl) {
            noteType = 'voice_recording';
          }
        }

        const normalizedNote = {
          id: noteId,
          title: note.title || 'Untitled Note',
          timestamp: note.timestamp || note.createdAt || note.created_at || new Date().toISOString(),
          rawTranscription: note.rawTranscription || note.text || '',
          polishedNote: note.polishedNote || note.text || '',
          translations: note.translations || {},
          noteType: noteType,
          signImageUrl: note.signImageUrl,
          attachedImages: note.attachedImages || note.attachedImageUrls || [],
          audioUri: note.audioUri || note.originalAudioUrl,
          location: note.location || note.gps,
          tags: note.tags || [],
          updatedAt: note.updatedAt || note.timestamp || new Date().toISOString(),
          isDeleted: note.isDeleted || false
        };

        localNotes.push(normalizedNote);

        // Prepare media files for this note
        const noteMediaFiles = [];

        // Add sign image
        if (note.signImageUrl && note.signImageUrl.startsWith('file://')) {
          try {
            const response = await fetch(note.signImageUrl);
            const blob = await response.blob();
            const base64Data = await blobToBase64(blob);
            noteMediaFiles.push({
              fileData: base64Data,
              fileName: `sign-${noteId}.jpg`,
              fileType: 'image',
              mimeType: 'image/jpeg',
              fileSize: blob.size,
              localUri: note.signImageUrl
            });
          } catch (error) {
            console.error('Error reading sign image:', error);
          }
        }

        // Add attached images
        if (note.attachedImages && note.attachedImages.length > 0) {
          console.log('Note has', note.attachedImages.length, 'attached images');
          for (let index = 0; index < note.attachedImages.length; index++) {
            const imageUri = note.attachedImages[index];
            console.log(`Image ${index}:`, imageUri);
            if (imageUri.startsWith('file://')) {
              try {
                const response = await fetch(imageUri);
                const blob = await response.blob();
                const base64Data = await blobToBase64(blob);
                noteMediaFiles.push({
                  fileData: base64Data,
                  fileName: `image-${noteId}-${index}.jpg`,
                  fileType: 'image',
                  mimeType: 'image/jpeg',
                  fileSize: blob.size,
                  localUri: imageUri
                });
                console.log(`Added image ${index} to media files`);
              } catch (error) {
                console.error(`Error reading attached image ${index}:`, error);
              }
            } else {
              console.log(`Skipping image ${index} - not a file:// URI`);
            }
          }
        } else {
          console.log('Note has no attached images');
        }

        // Add audio
        if (note.audioUri && note.audioUri.startsWith('file://')) {
          try {
            const response = await fetch(note.audioUri);
            const blob = await response.blob();
            const base64Data = await blobToBase64(blob);
            noteMediaFiles.push({
              fileData: base64Data,
              fileName: `audio-${noteId}.m4a`,
              fileType: 'audio',
              mimeType: 'audio/m4a',
              fileSize: blob.size,
              localUri: note.audioUri
            });
          } catch (error) {
            console.error('Error reading audio file:', error);
          }
        }

        if (noteMediaFiles.length > 0) {
          mediaFiles.push({
            noteId: noteId,
            files: noteMediaFiles
          });
        }

      } catch (error) {
        console.error('Error processing note for sync:', error);
      }
    }

    debugLog('📤 SYNC-TO-CLOUD: Prepared', localNotes.length, 'notes for batch sync');
    debugLog('📎 SYNC-TO-CLOUD: Prepared', mediaFiles.length, 'media groups for upload');

    // Prepare request body for sync-notes function
    const requestBody = {
      localNotes: localNotes,
      lastSyncTimestamp: new Date().toISOString(),
      deviceId: deviceId,
      userId: userId
    };

    // Add media files if any
    if (mediaFiles.length > 0) {
      requestBody.mediaFiles = mediaFiles;
      debugLog('📎 SYNC-TO-CLOUD: Including media files in request');
    }

    const requestUrl = 'https://ofialssoolmzckjjngst.supabase.co/functions/v1/sync-notes';
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey
    };

    debugNetworkRequest(requestUrl, 'POST', requestHeaders, requestBody);

    // Call the sync-notes edge function for batch upload
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });

    debugLog('🌐 SYNC-TO-CLOUD: HTTP response status:', response.status);
    debugLog('🌐 SYNC-TO-CLOUD: HTTP response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      debugError('❌ SYNC-TO-CLOUD: HTTP response error:', { status: response.status, body: errorText });
      debugError('❌ SYNC-TO-CLOUD: Full response details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText
      });
      throw new Error(`Sync failed: ${response.status} ${errorText}`);
    }

    debugLog('✅ SYNC-TO-CLOUD: HTTP request successful, parsing response...');
    const result = await response.json();
    debugNetworkResponse(requestUrl, response.status, Object.fromEntries(response.headers.entries()), result);
    debugLog('📊 SYNC-TO-CLOUD: Batch sync result:', result);

    const syncResult = {
      success: true,
      uploaded: result.uploaded || 0,
      mediaUploaded: result.mediaUploadedCount || 0,
      downloaded: result.downloaded || 0,
      conflicts: result.conflicts || []
    };

    debugLog(`✅ SYNC-TO-CLOUD: Batch sync completed successfully: ${syncResult.uploaded} notes, ${syncResult.mediaUploaded} media files`);

    return syncResult;

  } catch (error) {
    debugError('❌ SYNC-TO-CLOUD: Critical error in syncNotesToCloud function:', error);
    throw error;
  }
};

// Unlink device from user account
export const unlinkDevice = async (userId, deviceId) => {
  try {
    console.log('=== UNLINK DEVICE FUNCTION CALLED ===');
    console.log('Unlinking device:', deviceId, 'from user:', userId);

    if (!userId || !deviceId) {
      console.log('Missing userId or deviceId');
      throw new Error('User ID and device ID are required');
    }

    console.log('Updating linkcodes table...');
    // For now, we'll clear the deviceid from completed linkcodes
    // This effectively "unlinks" the device since verification checks for deviceid match
    const { error, data } = await supabase
      .from('linkcodes')
      .update({ deviceid: null, status: 'expired' })
      .eq('userid', userId)
      .eq('deviceid', deviceId)
      .eq('status', 'completed')
      .select();

    console.log('Linkcodes update result:', { data, error });

    if (error) {
      console.error('Error updating linkcodes for unlinking:', error);
      throw new Error('Failed to unlink device from database');
    }

    console.log('Device unlinked successfully by clearing linkcodes');
    console.log('=== UNLINK DEVICE FUNCTION COMPLETED ===');
    return { success: true, message: 'Device unlinked' };

  } catch (error) {
    console.error('Error unlinking device:', error);
    throw error;
  }
};

// Reconcile notes - download notes updated by web within a time period
export const reconcileNotesFromWeb = async (deviceId, timePeriod = '1 day', noteTypeFilter = null, tagFilter = null) => {
  try {
    console.log('Reconciling notes from web with filters:', { timePeriod, noteTypeFilter, tagFilter });

    // Use the stored userId from device linking
    let userId = null;
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        userId = storedUserId;
        console.log('Using linked userId for reconcile:', userId);
      } else {
        throw new Error('No linked userId found. Please link your device to web account first.');
      }
    } catch (error) {
      console.error('Error getting linked userId:', error);
      throw new Error('Linked userId not found. Please link your device to web account first.');
    }

    // Calculate the since date based on time period
    const sinceDate = new Date();
    const timeAmount = parseInt(timePeriod.split(' ')[0]);
    const timeUnit = timePeriod.split(' ')[1];

    switch (timeUnit) {
      case 'hour':
      case 'hours':
        sinceDate.setHours(sinceDate.getHours() - timeAmount);
        break;
      case 'day':
      case 'days':
        sinceDate.setDate(sinceDate.getDate() - timeAmount);
        break;
      case 'week':
      case 'weeks':
        sinceDate.setDate(sinceDate.getDate() - (timeAmount * 7));
        break;
      case 'month':
      case 'months':
        sinceDate.setMonth(sinceDate.getMonth() - timeAmount);
        break;
      default:
        sinceDate.setDate(sinceDate.getDate() - 1); // Default to 1 day
    }

    const sinceDateISOString = sinceDate.toISOString();
    console.log('Reconciling notes since:', sinceDateISOString);

    // Build query for notes updated by web
    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .eq('updated_by_web', true)
      .gte('updated_at', sinceDateISOString)
      .order('updated_at', { ascending: false });

    // Apply note type filter if provided
    if (noteTypeFilter && noteTypeFilter !== 'all') {
      query = query.eq('note_type', noteTypeFilter);
    }

    // Apply tag filter if provided
    if (tagFilter && tagFilter !== 'all') {
      query = query.contains('tags', [tagFilter]);
    }

    const { data: webUpdatedNotes, error: reconcileError } = await query;

    if (reconcileError) {
      console.error('Error reconciling notes from web:', reconcileError);
      throw reconcileError;
    }

    if (!webUpdatedNotes || webUpdatedNotes.length === 0) {
      console.log('No notes found that were updated by web in the specified period');
      return {
        success: true,
        downloaded: 0,
        notes: []
      };
    }

    console.log(`Found ${webUpdatedNotes.length} notes updated by web`);

    // Process the downloaded notes to match mobile app format
    const processedNotes = webUpdatedNotes.map(note => ({
      id: note.id,
      title: note.title,
      timestamp: note.created_at,
      tags: note.tags || [],
      noteType: note.note_type === 'sign_translation' ? 'sign' :
                note.note_type === 'voice_recording' ? 'voice' :
                note.note_type === 'text_note' ? 'text' :
                note.note_type === 'app' ? 'app' : 'text',
      location: note.location,
      attachedImages: note.attached_images || [],
      audioUri: note.audio_url,
      signImageUrl: note.sign_image_url,
      translations: note.translations || {},
      text: note.original_text,
      rawTranscription: note.original_text,
      polishedNote: note.polished_text,
      // Mark as reconciled
      reconciledFromWeb: true,
      reconciledAt: new Date().toISOString()
    }));

    console.log(`Successfully reconciled ${processedNotes.length} notes from web`);

    return {
      success: true,
      downloaded: processedNotes.length,
      notes: processedNotes,
      sinceDate: sinceDateISOString
    };

  } catch (error) {
    console.error('Error reconciling notes from web:', error);
    throw error;
  }
};