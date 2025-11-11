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

  // Check if there are images to attach
  const hasImages = (selectedNote.attachedImages && selectedNote.attachedImages.length > 0) ||
                    selectedNote.signImageUrl;

  console.log('🎯 DEBUG: Has images:', hasImages);
  console.log('🎯 DEBUG: attachedImages count:', selectedNote.attachedImages?.length || 0);
  console.log('🎯 DEBUG: has signImageUrl:', !!selectedNote.signImageUrl);

  if (hasImages) {
    // Count total images
    const imageCount = (selectedNote.attachedImages?.length || 0) +
                      (selectedNote.signImageUrl ? 1 : 0);

    console.log('🎯 DEBUG: Total image count:', imageCount);

    // Show user options for sharing with images
    Alert.alert(
      'Share Note with Images',
      `This note has ${imageCount} image${imageCount > 1 ? 's' : ''}.\n\nChoose how to share:`,
      [
        {
          text: 'Share Text + Images',
          onPress: () => {
            console.log('🎯 DEBUG: User chose Share Text + Images');
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
          text: 'Copy Image Paths',
          onPress: () => {
            console.log('🎯 DEBUG: User chose Copy Image Paths');
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

// Share note with images
export const shareNoteWithImages = async (shareText, platform, selectedNote) => {
  try {
    // Show uploading progress
    Alert.alert('Uploading Images', 'Please wait while we upload your images for sharing...');

    // Collect all image URIs
    let imageUris = [];

    // Add sign image if available
    if (selectedNote.signImageUrl) {
      imageUris.push(selectedNote.signImageUrl);
    }

    // Add attached images if available
    if (selectedNote.attachedImages && selectedNote.attachedImages.length > 0) {
      imageUris = [...imageUris, ...selectedNote.attachedImages];
    }

    console.log(`Uploading ${imageUris.length} images for sharing...`);

    // Upload all images to sharing bucket and get URLs
    const { uploadImageForSharing } = await import('../supabase');
    const uploadedUrls = [];

    for (let i = 0; i < imageUris.length; i++) {
      try {
        console.log(`Uploading image ${i + 1}/${imageUris.length}...`);
        const publicUrl = await uploadImageForSharing(imageUris[i]);
        uploadedUrls.push(publicUrl);
        console.log(`Image ${i + 1} uploaded successfully`);
      } catch (uploadError) {
        console.error(`Failed to upload image ${i + 1}:`, uploadError);
        // Continue with other images even if one fails
      }
    }

    if (uploadedUrls.length === 0) {
      throw new Error('Failed to upload any images');
    }

    // Add image URLs to the share text
    shareText += '\n\n🖼️ *Images:*';
    uploadedUrls.forEach((url, index) => {
      const imageType = index === 0 && selectedNote.signImageUrl ? 'Sign' :
                       index === 0 ? 'Photo' : `Photo ${index + 1}`;
      shareText += `\n${imageType}: ${url}`;
    });

    if (uploadedUrls.length < imageUris.length) {
      const failedCount = imageUris.length - uploadedUrls.length;
      shareText += `\n\n⚠️ ${failedCount} image${failedCount > 1 ? 's' : ''} failed to upload`;
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

    // Check if there are images to upload
    const hasImages = (selectedNote.attachedImages && selectedNote.attachedImages.length > 0) ||
                      selectedNote.signImageUrl;

    let uploadedUrls = [];
    let hasMedia = false;

    if (hasImages) {
      // Count total images
      const imageCount = (selectedNote.attachedImages?.length || 0) +
                        (selectedNote.signImageUrl ? 1 : 0);

      

      // Show uploading progress
      Alert.alert('Uploading Images', 'Please wait while we upload your images for sharing...');

      // Collect all image URIs
      let imageUris = [];

      // Add sign image if available
      if (selectedNote.signImageUrl) {
        imageUris.push(selectedNote.signImageUrl);
      }

      // Add attached images if available
      if (selectedNote.attachedImages && selectedNote.attachedImages.length > 0) {
        imageUris = [...imageUris, ...selectedNote.attachedImages];
      }

      // Upload all images to sharing bucket and get URLs
      const { uploadImageForSharing } = await import('../supabase');

      for (let i = 0; i < imageUris.length; i++) {
        try {
          console.log(`Uploading image ${i + 1}/${imageUris.length}...`);
          const publicUrl = await uploadImageForSharing(imageUris[i]);
          uploadedUrls.push(publicUrl);
          console.log(`Image ${i + 1} uploaded successfully`);
        } catch (uploadError) {
          console.error(`Failed to upload image ${i + 1}:`, uploadError);
          // Continue with other images even if one fails
        }
      }

      if (uploadedUrls.length === 0) {
        throw new Error('Failed to upload any images');
      }

      // Add image URLs to clipboard text
      clipboardText += '\n\n🖼️ *Images:*';
      uploadedUrls.forEach((url, index) => {
        const imageType = index === 0 && selectedNote.signImageUrl ? 'Sign' :
                          index === 0 ? 'Photo' : `Photo ${index + 1}`;
        clipboardText += `\n${imageType}: ${url}`;
      });

      if (uploadedUrls.length < imageUris.length) {
        const failedCount = imageUris.length - uploadedUrls.length;
        clipboardText += `\n\n⚠️ ${failedCount} image${failedCount > 1 ? 's' : ''} failed to upload`;
      }

      hasMedia = true;
      console.log('All images uploaded for clipboard copy');
    } else {
      // No images, add media URLs directly (for audio and any existing URLs)
      // Add sign image URL if available (shouldn't happen if hasImages is false, but safety check)
      if (selectedNote.signImageUrl) {
        clipboardText += '\n\n🖼️ *Sign Image:*';
        clipboardText += `\n${selectedNote.signImageUrl}`;
        hasMedia = true;
      }

      // Add attached images URLs if available (shouldn't happen if hasImages is false, but safety check)
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

// Copy image URLs to clipboard (upload to sharing bucket first)
export const copyImagePathsToClipboard = async (selectedNote) => {
  try {
    console.log('Copying image URLs to clipboard - uploading to sharing bucket first...');

    // Show uploading progress
    Alert.alert('Uploading Images', 'Please wait while we upload your images for sharing...');

    let imageUrls = [];
    const { uploadImageForSharing } = await import('../supabase');

    // Upload sign image if available
    if (selectedNote.signImageUrl) {
      try {
        console.log('Uploading sign image for clipboard copy...');
        const publicUrl = await uploadImageForSharing(selectedNote.signImageUrl);
        imageUrls.push(`Sign Image: ${publicUrl}`);
        console.log('Sign image uploaded successfully');
      } catch (uploadError) {
        console.error('Failed to upload sign image:', uploadError);
        // Continue without this image
      }
    }

    // Upload attached images if available
    if (selectedNote.attachedImages && selectedNote.attachedImages.length > 0) {
      for (let i = 0; i < selectedNote.attachedImages.length; i++) {
        try {
          console.log(`Uploading attached image ${i + 1}/${selectedNote.attachedImages.length}...`);
          const publicUrl = await uploadImageForSharing(selectedNote.attachedImages[i]);
          imageUrls.push(`Photo ${i + 1}: ${publicUrl}`);
          console.log(`Attached image ${i + 1} uploaded successfully`);
        } catch (uploadError) {
          console.error(`Failed to upload attached image ${i + 1}:`, uploadError);
          // Continue with other images
        }
      }
    }

    if (imageUrls.length === 0) {
      throw new Error('Failed to upload any images');
    }

    const urlsText = imageUrls.join('\n');
    Clipboard.setString(urlsText);

    Alert.alert(
      'Image URLs Copied',
      `Image URLs have been copied to clipboard!\n\nImages will be accessible for 30 days.\n\nYou can now share these links in your messaging app.`,
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('Error copying image URLs:', error);
    Alert.alert('Error', 'Failed to upload and copy image URLs to clipboard.');
  }
};