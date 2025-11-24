import { Alert, Platform, Clipboard } from 'react-native';
import * as Linking from 'expo-linking';

// Share note via different platforms
export const shareNote = async (platform, selectedNote) => {
  console.log('🎯 DEBUG: shareNote called with platform:', platform);
  console.log('🎯 DEBUG: selectedNote:', selectedNote ? selectedNote.id : 'none');

  if (!selectedNote) {
    console.log('🎯 DEBUG: No selected note, returning');
    return;
  }

  const noteTitle = selectedNote.title || 'Note';
  const noteContent = selectedNote.text || '';
  const timestamp = new Date(selectedNote.timestamp).toLocaleString();

  console.log('🎯 DEBUG: Building share text for note:', noteTitle);

  // Build the share text with additional information
  let shareText = `*${noteTitle}*\n\n${noteContent}`;

  // Add tags if available
  if (selectedNote.tags && selectedNote.tags.length > 0) {
    shareText += `\n\n🏷️ *Tags:* ${selectedNote.tags.join(', ')}`;
    console.log('🎯 DEBUG: Added tags to share text');
  }

  // Add location if available
  if (selectedNote.location) {
    const { latitude, longitude } = selectedNote.location;
    shareText += `\n\n📍 *Location:* ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    console.log('🎯 DEBUG: Added location to share text');
  }

  // Add timestamp
  shareText += `\n\n_Sent from ikeNotes on ${timestamp}_`;
  console.log('🎯 DEBUG: Final share text length:', shareText.length);

  // Check if there are images/media to attach
  // Use attachedMedia as the primary source, fallback to legacy properties if needed
  const mediaList = selectedNote.attachedMedia || [];
  const hasImages = mediaList.length > 0 ||
                    (selectedNote.attachedImages && selectedNote.attachedImages.length > 0) ||
                    selectedNote.signImageUrl;

  console.log('🎯 DEBUG: Has images/media:', hasImages);
  console.log('🎯 DEBUG: attachedMedia count:', mediaList.length);
  console.log('🎯 DEBUG: attachedImages count:', selectedNote.attachedImages?.length || 0);
  console.log('🎯 DEBUG: has signImageUrl:', !!selectedNote.signImageUrl);

  if (hasImages) {
    // Count total images
    let imageCount = mediaList.length;
    if (imageCount === 0) {
      // Fallback to legacy counts
      imageCount = (selectedNote.attachedImages?.length || 0) + (selectedNote.signImageUrl ? 1 : 0);
    }

    console.log('🎯 DEBUG: Total image count:', imageCount);

    // Show user options for sharing with images
    Alert.alert(
      'Share Note with Media',
      `This note has ${imageCount} media file${imageCount > 1 ? 's' : ''}.\n\nChoose how to share:`,
      [
        {
          text: 'Share Text + Media',
          onPress: () => {
            console.log('🎯 DEBUG: User chose Share Text + Media');
            shareNoteWithImages(shareText, platform, selectedNote);
          }
        },
        {
          text: 'Share Text Only',
          onPress: () => {
            console.log('🎯 DEBUG: User chose Share Text Only');
            shareNoteTextOnly(shareText, platform);
          },
          style: 'default'
        },
        {
          text: 'Copy Media Links',
          onPress: () => {
            console.log('🎯 DEBUG: User chose Copy Media Links');
            copyImagePathsToClipboard(selectedNote);
          },
          style: 'default'
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  } else {
    console.log('🎯 DEBUG: No images, proceeding with text-only sharing');
    // Use deep linking for text-only sharing
    await shareNoteTextOnly(shareText, platform);
  }
};

// Share note with images/media
export const shareNoteWithImages = async (shareText, platform, selectedNote) => {
  try {
    // Show uploading progress
    Alert.alert('Uploading Media', 'Please wait while we upload your media for sharing...');

    // Collect all media URIs
    let mediaUris = [];
    
    // Use attachedMedia if available (new standard)
    if (selectedNote.attachedMedia && selectedNote.attachedMedia.length > 0) {
      mediaUris = [...selectedNote.attachedMedia];
    } else {
      // Fallback to legacy properties
      // Add sign image if available
      if (selectedNote.signImageUrl) {
        mediaUris.push(selectedNote.signImageUrl);
      }

      // Add attached images if available
      if (selectedNote.attachedImages && selectedNote.attachedImages.length > 0) {
        mediaUris = [...mediaUris, ...selectedNote.attachedImages];
      }
    }

    console.log(`Uploading ${mediaUris.length} media files for sharing...`);

    // Upload all media to sharing bucket and get URLs
    const { uploadImageForSharing } = await import('../supabase');
    const uploadedUrls = [];

    for (let i = 0; i < mediaUris.length; i++) {
      try {
        console.log(`Uploading media ${i + 1}/${mediaUris.length}...`);
        // Check if it's a media ID (not a URI) and resolve it if needed
        // But uploadImageForSharing expects a URI or base64
        // If it's a local file path, uploadImageForSharing handles it
        const publicUrl = await uploadImageForSharing(mediaUris[i]);
        uploadedUrls.push(publicUrl);
        console.log(`Media ${i + 1} uploaded successfully`);
      } catch (uploadError) {
        console.error(`Failed to upload media ${i + 1}:`, uploadError);
        // Continue with other media even if one fails
      }
    }

    if (uploadedUrls.length === 0) {
      throw new Error('Failed to upload any media');
    }

    // Add media URLs to the share text
    shareText += '\n\n📎 *Media:*';
    uploadedUrls.forEach((url, index) => {
      // Determine label based on note type and index
      let label = `File ${index + 1}`;
      
      if (selectedNote.noteType === 'sign_translation' && index === 0) {
        label = 'Sign Image';
      } else if (selectedNote.noteType === 'voice_recording' && index === 0) {
        label = 'Audio Recording';
      } else {
        label = `Media ${index + 1}`;
      }
      
      shareText += `\n${label}: ${url}`;
    });

    if (uploadedUrls.length < mediaUris.length) {
      const failedCount = mediaUris.length - uploadedUrls.length;
      shareText += `\n\n⚠️ ${failedCount} file${failedCount > 1 ? 's' : ''} failed to upload`;
    }


    // Now share the text with image URLs
    await shareNoteTextOnly(shareText, platform);

    Alert.alert(
      'Shared Successfully',
      `Note shared to ${platform} with ${uploadedUrls.length} image link${uploadedUrls.length > 1 ? 's' : ''}!\n\nImages will be accessible for 30 days.`,
      [{ text: 'OK' }]
    );

  } catch (error) {
    console.error('Error sharing with images:', error);
    Alert.alert(
      'Upload Failed',
      'Failed to upload images for sharing. Would you like to share the text only?',
      [
        { text: 'Share Text Only', onPress: () => shareNoteTextOnly(shareText, platform) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }
};

// Share note text only
export const shareNoteTextOnly = async (shareText, platform) => {
  console.log('🎯 DEBUG: shareNoteTextOnly called with platform:', platform);
  console.log('🎯 DEBUG: shareText length:', shareText.length);
  console.log('🎯 DEBUG: shareText preview:', shareText.substring(0, 100) + '...');

  let url = '';

  try {
    switch (platform) {
      case 'telegram':
        url = `tg://msg?text=${encodeURIComponent(shareText)}`;
        console.log('🎯 DEBUG: Telegram URL generated:', url.substring(0, 100) + '...');
        break;
      case 'whatsapp':
        url = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
        console.log('🎯 DEBUG: WhatsApp URL generated:', url.substring(0, 100) + '...');
        break;
      case 'messenger':
        // For Messenger, we need to use a different approach
        if (Platform.OS === 'ios') {
          url = `fb-messenger://share?link=${encodeURIComponent('https://ikenotes.app')}&message=${encodeURIComponent(shareText)}`;
        } else {
          // Android Messenger URL scheme
          url = `fb-messenger://compose?text=${encodeURIComponent(shareText)}`;
        }
        console.log('🎯 DEBUG: Messenger URL generated:', url.substring(0, 100) + '...');
        break;
      default:
        console.log('🎯 DEBUG: Unknown platform:', platform);
        return;
    }

    console.log('🎯 DEBUG: Checking if URL can be opened:', url.substring(0, 50) + '...');
    const supported = await Linking.canOpenURL(url);
    console.log('🎯 DEBUG: URL supported:', supported);

    if (supported) {
      console.log('🎯 DEBUG: Opening URL...');
      await Linking.openURL(url);
      console.log('🎯 DEBUG: URL opened successfully');
    } else {
      console.log('🎯 DEBUG: URL not supported, showing app install alert');
      Alert.alert('App Not Installed', `Please install ${platform.charAt(0).toUpperCase() + platform.slice(1)} to share notes.`);
    }
  } catch (error) {
    console.error(`Error sharing to ${platform}:`, error);
    console.log('🎯 DEBUG: Share failed with error:', error.message);
    Alert.alert('Share Failed', `Unable to share to ${platform.charAt(0).toUpperCase() + platform.slice(1)}.`);
  }
};

// Copy complete note details to clipboard
export const copyNoteToClipboard = async (selectedNote) => {
  try {
    const noteTitle = selectedNote.title || 'Note';
    const noteContent = selectedNote.text || '';
    const timestamp = new Date(selectedNote.timestamp).toLocaleString();

    // Build the complete share text with all details
    let clipboardText = `*${noteTitle}*\n\n${noteContent}`;

    // Add tags if available
    if (selectedNote.tags && selectedNote.tags.length > 0) {
      clipboardText += `\n\n🏷️ *Tags:* ${selectedNote.tags.join(', ')}`;
    }

    // Add location if available
    if (selectedNote.location) {
      const { latitude, longitude } = selectedNote.location;
      clipboardText += `\n\n📍 *Location:* ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }

    // Check if there are media files to upload
    const mediaList = selectedNote.attachedMedia || [];
    const hasMediaFiles = mediaList.length > 0 ||
                          (selectedNote.attachedImages && selectedNote.attachedImages.length > 0) ||
                          selectedNote.signImageUrl;

    let uploadedUrls = [];
    let hasMedia = false;

    if (hasMediaFiles) {
      // Show uploading progress
      Alert.alert('Uploading Media', 'Please wait while we upload your media for sharing...');

      // Collect all media URIs
      let mediaUris = [];

      if (mediaList.length > 0) {
        mediaUris = [...mediaList];
      } else {
        // Fallback
        if (selectedNote.signImageUrl) {
          mediaUris.push(selectedNote.signImageUrl);
        }
        if (selectedNote.attachedImages && selectedNote.attachedImages.length > 0) {
          mediaUris = [...mediaUris, ...selectedNote.attachedImages];
        }
      }

      // Upload all media to sharing bucket and get URLs
      const { uploadImageForSharing } = await import('../supabase');

      for (let i = 0; i < mediaUris.length; i++) {
        try {
          console.log(`Uploading media ${i + 1}/${mediaUris.length}...`);
          const publicUrl = await uploadImageForSharing(mediaUris[i]);
          uploadedUrls.push(publicUrl);
          console.log(`Media ${i + 1} uploaded successfully`);
        } catch (uploadError) {
          console.error(`Failed to upload media ${i + 1}:`, uploadError);
          // Continue with other media even if one fails
        }
      }

      if (uploadedUrls.length === 0) {
        throw new Error('Failed to upload any media');
      }

      // Add media URLs to clipboard text
      clipboardText += '\n\n📎 *Media:*';
      uploadedUrls.forEach((url, index) => {
        let label = `File ${index + 1}`;
        if (selectedNote.noteType === 'sign_translation' && index === 0) {
          label = 'Sign Image';
        } else if (selectedNote.noteType === 'voice_recording' && index === 0) {
          label = 'Audio Recording';
        } else {
          label = `Media ${index + 1}`;
        }
        clipboardText += `\n${label}: ${url}`;
      });

      if (uploadedUrls.length < mediaUris.length) {
        const failedCount = mediaUris.length - uploadedUrls.length;
        clipboardText += `\n\n⚠️ ${failedCount} file${failedCount > 1 ? 's' : ''} failed to upload`;
      }

      hasMedia = true;
      console.log('All media uploaded for clipboard copy');
    } else {
      // No media files to upload, but check for existing URLs in legacy fields
      // Add sign image URL if available
      if (selectedNote.signImageUrl && !selectedNote.signImageUrl.startsWith('file://')) {
        clipboardText += '\n\n🖼️ *Sign Image:*';
        clipboardText += `\n${selectedNote.signImageUrl}`;
        hasMedia = true;
      }

      // Add attached images URLs if available
      if (selectedNote.attachedImages && selectedNote.attachedImages.length > 0) {
        const remoteImages = selectedNote.attachedImages.filter(url => !url.startsWith('file://'));
        if (remoteImages.length > 0) {
          if (!hasMedia) {
            clipboardText += '\n\n🖼️ *Images:*';
            hasMedia = true;
          } else {
            clipboardText += '\n\n📎 *Attached Images:*';
          }
          remoteImages.forEach((url, index) => {
            clipboardText += `\nPhoto ${index + 1}: ${url}`;
          });
        }
      }
    }

    // Add audio URL
    if (selectedNote.audioUri) {
      clipboardText += '\n\n🎵 *Audio:*';
      clipboardText += `\n${selectedNote.audioUri}`;
      hasMedia = true;
    }

    // Add translations if available
    if (selectedNote.translations && Object.keys(selectedNote.translations).length > 0) {
      clipboardText += '\n\n🌐 *Translations:*';
      Object.entries(selectedNote.translations).forEach(([lang, translation]) => {
        clipboardText += `\n${lang.toUpperCase()}: ${translation}`;
      });
    }

    // Add timestamp
    clipboardText += `\n\n📅 *Created:* ${timestamp}`;
    clipboardText += '\n\n_Sent from ikeNotes_';

    // Copy to clipboard
    Clipboard.setString(clipboardText);

    const successMessage = hasImages
      ? `Note copied to clipboard with ${uploadedUrls.length} image link${uploadedUrls.length > 1 ? 's' : ''}!\n\nImages will be accessible for 30 days.`
      : 'Complete note details including all media URLs have been copied to clipboard.';

    Alert.alert(
      'Note Copied!',
      successMessage,
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('Error copying note to clipboard:', error);
    Alert.alert(
      'Upload Failed',
      'Failed to upload images for clipboard copy. Please try again or share via platform instead.',
      [{ text: 'OK' }]
    );
  }
};

// Fallback function to copy note with local image paths when upload fails
const copyNoteToClipboardWithLocalImages = async (selectedNote) => {
  try {
    const noteTitle = selectedNote.title || 'Note';
    const noteContent = selectedNote.text || '';
    const timestamp = new Date(selectedNote.timestamp).toLocaleString();

    // Build the complete share text with all details
    let clipboardText = `*${noteTitle}*\n\n${noteContent}`;

    // Add tags if available
    if (selectedNote.tags && selectedNote.tags.length > 0) {
      clipboardText += `\n\n🏷️ *Tags:* ${selectedNote.tags.join(', ')}`;
    }

    // Add location if available
    if (selectedNote.location) {
      const { latitude, longitude } = selectedNote.location;
      clipboardText += `\n\n📍 *Location:* ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }

    // Add media URLs (using local paths)
    let hasMedia = false;

    // Add sign image URL
    if (selectedNote.signImageUrl) {
      clipboardText += '\n\n🖼️ *Sign Image:*';
      clipboardText += `\n${selectedNote.signImageUrl}`;
      hasMedia = true;
    }

    // Add attached images URLs
    if (selectedNote.attachedImages && selectedNote.attachedImages.length > 0) {
      if (!hasMedia) {
        clipboardText += '\n\n🖼️ *Images:*';
        hasMedia = true;
      } else {
        clipboardText += '\n\n📎 *Attached Images:*';
      }
      selectedNote.attachedImages.forEach((url, index) => {
        clipboardText += `\nPhoto ${index + 1}: ${url}`;
      });
    }

    // Add audio URL
    if (selectedNote.audioUri) {
      clipboardText += '\n\n🎵 *Audio:*';
      clipboardText += `\n${selectedNote.audioUri}`;
      hasMedia = true;
    }

    // Add translations if available
    if (selectedNote.translations && Object.keys(selectedNote.translations).length > 0) {
      clipboardText += '\n\n🌐 *Translations:*';
      Object.entries(selectedNote.translations).forEach(([lang, translation]) => {
        clipboardText += `\n${lang.toUpperCase()}: ${translation}`;
      });
    }

    // Add timestamp
    clipboardText += `\n\n📅 *Created:* ${timestamp}`;
    clipboardText += '\n\n_Sent from ikeNotes_';

    // Copy to clipboard
    Clipboard.setString(clipboardText);

    Alert.alert(
      'Note Copied!',
      'Complete note details with local image paths have been copied to clipboard.',
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('Error copying note with local images:', error);
    Alert.alert('Error', 'Failed to copy note to clipboard.');
  }
};

// Show share options
export const showShareOptions = (selectedNote, onShareViaEmail = null) => {
  console.log('🎯 DEBUG: showShareOptions called');
  console.log('🎯 DEBUG: selectedNote for sharing:', selectedNote ? selectedNote.title : 'none');

  const shareOptions = [
    {
      text: 'Copy to Clipboard',
      onPress: () => {
        console.log('🎯 DEBUG: Copy to Clipboard selected from share options');
        copyNoteToClipboard(selectedNote);
      }
    },
    {
      text: 'Cancel',
      style: 'cancel',
      onPress: () => {
        console.log('🎯 DEBUG: Cancel selected from share options');
      }
    },
    {
      text: 'Telegram',
      onPress: () => {
        console.log('🎯 DEBUG: Telegram selected from share options');
        shareNote('telegram', selectedNote);
      }
    },
    {
      text: 'WhatsApp',
      onPress: () => {
        console.log('🎯 DEBUG: WhatsApp selected from share options');
        shareNote('whatsapp', selectedNote);
      }
    },
    {
      text: 'Messenger',
      onPress: () => {
        console.log('🎯 DEBUG: Messenger selected from share options');
        shareNote('messenger', selectedNote);
      }
    }
  ];

  // Add email sharing option if callback provided
  if (onShareViaEmail) {
    shareOptions.splice(1, 0, {
      text: '📧 Share via Email',
      onPress: () => {
        console.log('🎯 DEBUG: Email sharing selected from share options');
        onShareViaEmail(selectedNote.id);
      }
    });
  }

  shareOptions.push({ text: 'Cancel', style: 'cancel' });

  Alert.alert(
    'Share Note',
    'Choose a platform to share this note:',
    shareOptions
  );
};

// Copy media URLs to clipboard (upload to sharing bucket first)
export const copyImagePathsToClipboard = async (selectedNote) => {
  try {
    console.log('Copying media URLs to clipboard - uploading to sharing bucket first...');

    // Show uploading progress
    Alert.alert('Uploading Media', 'Please wait while we upload your media for sharing...');

    let mediaUrls = [];
    const { uploadImageForSharing } = await import('../supabase');

    // Collect media URIs
    let mediaUris = [];
    if (selectedNote.attachedMedia && selectedNote.attachedMedia.length > 0) {
      mediaUris = [...selectedNote.attachedMedia];
    } else {
      if (selectedNote.signImageUrl) mediaUris.push(selectedNote.signImageUrl);
      if (selectedNote.attachedImages) mediaUris = [...mediaUris, ...selectedNote.attachedImages];
    }

    for (let i = 0; i < mediaUris.length; i++) {
      try {
        console.log(`Uploading media ${i + 1}/${mediaUris.length}...`);
        const publicUrl = await uploadImageForSharing(mediaUris[i]);
        
        let label = `Media ${i + 1}`;
        if (selectedNote.noteType === 'sign_translation' && i === 0) label = 'Sign Image';
        else if (selectedNote.noteType === 'voice_recording' && i === 0) label = 'Audio';
        
        mediaUrls.push(`${label}: ${publicUrl}`);
        console.log(`Media ${i + 1} uploaded successfully`);
      } catch (uploadError) {
        console.error(`Failed to upload media ${i + 1}:`, uploadError);
      }
    }

    if (mediaUrls.length === 0) {
      throw new Error('Failed to upload any media');
    }

    const urlsText = mediaUrls.join('\n');
    Clipboard.setString(urlsText);

    Alert.alert(
      'Media URLs Copied',
      `Media URLs have been copied to clipboard!\n\nFiles will be accessible for 30 days.\n\nYou can now share these links in your messaging app.`,
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('Error copying media URLs:', error);
    Alert.alert('Error', 'Failed to upload and copy media URLs to clipboard.');
  }
};