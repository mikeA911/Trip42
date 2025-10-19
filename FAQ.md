# Trip42 FAQ - How to Use the App

## General Questions

### What is Trip42?
Trip42 is an AI-powered travel companion app that combines voice recording, sign language translation, text translation, and note-taking capabilities. It uses Google's Gemini AI and Google Cloud TTS to provide seamless multilingual communication and documentation tools for travelers and language learners.

### How do I get started with Trip42?
1. Launch the app and tap the spinning logo on the landing page.
2. Choose your input method: Sign Translation (📷), Voice Recording (🎤), or Text Input (✏️).
3. Follow the 3-step workflow: Record/Process → Process → Save.

### What languages does Trip42 support?
Trip42 supports 10+ languages including English, Lao, Khmer, Thai, Vietnamese, and more. Each language can include phonetic pronunciation guides for accurate pronunciation.

## Voice Recording Features

### How do I record audio?
1. Tap "Voice Recording" from the actions screen.
2. Grant microphone permission when prompted.
3. Start recording with the red button.
4. Pause/resume as needed, or take photos during recording.
5. Stop recording to begin AI processing.

### What happens after I stop recording?
The app will automatically transcribe your audio using Google Gemini AI, polish the text for clarity, and present it in a tabs interface for review, editing, translation, and saving.

### Can I attach photos during recording?
Yes, you can take photos during voice recording sessions. These photos will be attached to your note for visual context.

## Sign Language Translation

### How do I translate sign language?
1. Select "Sign Translation" from the actions screen.
2. Grant camera permission.
3. Position the sign language gesture in the camera view.
4. Take a photo for AI analysis.
5. Review the translation in the tabs interface.

### What sign languages are supported?
The app uses advanced AI to recognize various sign language gestures and translate them to text in multiple languages.

## Text Translation

### How do I translate text?
1. Choose "Text Input" from the actions screen.
2. Type or paste your text.
3. Attach photos if needed for context.
4. Select your target language in the translate tab.
5. Generate the translation with AI.

### Can I get pronunciation for translations?
Yes, Trip42 includes Google Cloud TTS integration. After translation, you can listen to the pronunciation with one-tap audio playback in the selected language.

## Note Management

### How do I save and organize notes?
- After processing your input, use the tabs interface to review and edit.
- Add custom tags for organization.
- Include location tracking with GPS coordinates.
- Attach photos for visual context.
- Save your note to local storage.

### Can I sync my notes across devices?
The app has sync-ready architecture using Supabase for cloud backup. Cloud synchronization is planned for future updates.

## Credit System

### How does the credit system work?
Trip42 uses a credit-based system for AI services:
- Text Translation: 5 credits
- Sign Translation: 7 credits
- Voice Recording: 10 credits
- Note Polishing: Free

New users receive 100 welcome credits.

### How do I check my credit balance?
View your balance in the Credits tab, which also shows transaction history and allows voucher redemption.

### How do I get more credits?
- Redeem voucher codes in the Credits tab.
- Share codes with other users.
- Credits are added instantly upon successful redemption.

### What is device fingerprinting?
Trip42 uses anonymous device fingerprinting for user identification without collecting personal data. This provides a consistent device ID across app sessions for secure credit tracking.

## Technical Questions

### Do I need internet for all features?
Most AI features require internet connection for API calls to Google Gemini and TTS services. However, the app includes offline capability with local storage for saved notes.

### How do I grant permissions?
The app will prompt for permissions when needed:
- Microphone permission for voice recording
- Camera permission for sign language translation and photos
- Location permission for GPS coordinates in notes

### What if I encounter an error?
The app includes user-friendly error handling with visual feedback. Check your internet connection, ensure permissions are granted, and verify your credit balance. If issues persist, restart the app or check for updates.

### Is my data secure?
Trip42 prioritizes privacy with no personal data collection for anonymous users. All API communications use HTTPS, and data is stored locally with optional cloud sync.

## Troubleshooting

### App won't start recording
- Ensure microphone permission is granted in device settings.
- Check that no other app is using the microphone.
- Restart the app and try again.

### Sign translation not working
- Grant camera permission.
- Ensure good lighting and clear positioning of signs.
- Try taking the photo again.

### Translations are inaccurate
- Check your internet connection.
- Ensure the source text is clear and in a supported language.
- Try rephrasing or providing more context.

### Credits not updating
- Check transaction history in the Credits tab.
- Ensure voucher codes are entered correctly.
- Restart the app to refresh the balance.

### Notes not saving
- Verify you have sufficient storage space.
- Check that the app has storage permissions.
- Try saving again or restart the app.

For additional support, feature requests, or bug reports, please create an issue in the repository.