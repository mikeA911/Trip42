# Trip42 - AI-Powered Travel Companion

Trip42 is a comprehensive mobile application that combines voice recording, sign language translation, text translation, and note-taking capabilities powered by Google's Gemini AI and Google Cloud TTS. Designed for travelers and language learners, it provides seamless multilingual communication and documentation tools.

## 🌟 Features

### 🎙️ Voice Recording & AI Transcription
- **High-quality audio recording** with pause/resume/stop controls
- **Real-time AI transcription** using Google Gemini
- **Automatic text polishing** for clarity and structure
- **Photo attachment** during recording sessions
- **Audio playback** of recorded content

### 🤟 Sign Language Translation
- **Camera-based sign recognition** using advanced AI
- **Real-time sign language translation** to text
- **Multi-language output** support
- **Photo capture** and processing for sign interpretation

### 🌐 Multi-Language Text Translation
- **10+ supported languages** including Lao, Khmer, Thai, Vietnamese, and more
- **Phonetic pronunciation guides** for accurate pronunciation
- **Multiple translation storage** for comparison
- **Custom language addition** capability

### 🔊 Text-to-Speech (TTS)
- **Google Cloud TTS integration** for natural speech synthesis
- **Language-specific voice selection** for authentic pronunciation
- **One-tap audio playback** for translations
- **Multiple language TTS support**

### 📝 Smart Note Management
- **AI-powered note polishing** for better clarity
- **Tag-based organization** with custom tags
- **Location tracking** with GPS coordinates
- **Photo attachments** for visual context
- **Sync-ready architecture** for cloud backup

### 💰 Credit System
- **Device fingerprinting** for anonymous user identification
- **Welcome credits** (100 credits) for new users
- **Service-based pricing**:
  - Text Translation: 5 credits
  - Sign Translation: 7 credits
  - Voice Recording: 10 credits
  - Note Polishing: Free
- **Voucher redemption** system
- **Transaction history** tracking

### 🎯 User Experience
- **Intuitive 3-step workflow**: Record → Process → Save
- **Visual feedback** with processing indicators
- **Error handling** with user-friendly messages
- **Offline capability** with local storage
- **Responsive design** optimized for mobile

## 🛠️ Technical Stack

### Frontend
- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for screen management

### AI & ML Services
- **Google Gemini AI** for:
  - Audio transcription
  - Sign language recognition
  - Text translation
  - Note polishing
- **Google Cloud Text-to-Speech** for pronunciation

### Backend & Storage
- **Supabase** for:
  - Voucher redemption
  - User management
  - Cloud sync capabilities
- **AsyncStorage** for local data persistence

### Device Integration
- **Expo Camera** for photo capture
- **Expo Audio** for recording and playback
- **Expo Location** for GPS coordinates
- **Expo Device** for device fingerprinting

## 📱 Architecture

### Component Structure
```
Trip42/
├── components/
│   ├── record/
│   │   ├── ActionsView.tsx      # Main action selection
│   │   ├── RecordingView.tsx    # Voice recording interface
│   │   ├── TypingView.tsx       # Text input with photos
│   │   └── TabsView.tsx         # Post-processing tabs
│   ├── RecordTranslate.tsx      # Main recording component
│   ├── CreditsTab.tsx           # Credit management
│   ├── NotesList.tsx            # Note display
│   └── LandingPage.tsx          # Welcome screen
├── services/
│   ├── geminiService.ts         # AI service integration
│   └── googleTTSService.ts      # Text-to-speech
├── utils/
│   ├── storage.ts               # Note persistence
│   └── credits.ts               # Credit management
└── hooks/
    └── useNotes.ts              # Note state management
```

### Data Flow
1. **User Interaction** → Component State Updates
2. **AI Processing** → Gemini API calls
3. **Credit Deduction** → Local storage updates
4. **Note Saving** → AsyncStorage persistence
5. **Optional Sync** → Supabase cloud storage

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16+
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator

### Installation Steps

1. **Clone and navigate to the project**
   ```bash
   cd Trip42
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create `.env` file with:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/emulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app

## 📖 Usage Guide

### Getting Started
1. **Launch the app** and tap the spinning logo on the landing page
2. **Choose your input method**:
   - 📷 **Sign Translation**: Take a photo of sign language
   - 🎤 **Voice Recording**: Record audio for transcription
   - ✏️ **Text Input**: Type or paste text to translate

### Voice Recording Workflow
1. **Tap "Voice Recording"** from the actions screen
2. **Grant microphone permission** when prompted
3. **Start recording** with the red button
4. **Pause/resume** as needed, or take photos during recording
5. **Stop recording** to begin AI processing
6. **Review and edit** in the tabs interface
7. **Translate** to multiple languages
8. **Save** your note with tags and location

### Sign Language Translation
1. **Select "Sign Translation"** from actions
2. **Grant camera permission**
3. **Position sign** in camera view
4. **Take photo** for AI analysis
5. **Review translation** in tabs
6. **Listen to pronunciation** with TTS
7. **Save or translate** to other languages

### Text Translation
1. **Choose "Text Input"** from actions
2. **Type or paste** your text
3. **Attach photos** if needed
4. **Select target language** in translate tab
5. **Generate translation** with AI
6. **Listen to pronunciation** with TTS
7. **Save** with custom tags

### Managing Credits
- **View balance** in the Credits tab
- **Redeem vouchers** with promo codes
- **Monitor usage** in transaction history
- **Get notified** when credits are low

## 💳 Credit System Details

### Pricing Structure
| Service | Cost | Description |
|---------|------|-------------|
| Text Translation | 5 credits | AI-powered language translation |
| Sign Translation | 7 credits | Camera-based sign recognition |
| Voice Recording | 10 credits | Audio transcription + AI polishing |
| Note Polishing | Free | AI text improvement |

### Voucher System
- **Redeem codes** in the Credits tab
- **Instant credit addition** upon successful redemption
- **Track redemptions** in transaction history
- **Share codes** with other users

### Device Fingerprinting
- **Anonymous identification** without personal data
- **Consistent device ID** across app sessions
- **Secure credit tracking** for privacy
- **Welcome bonus** for new devices

## 🔧 Configuration

### AI Service Configuration
```typescript
// services/geminiService.ts
const GEMINI_CONFIG = {
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-pro-vision',
  temperature: 0.7
};
```

### Language Support
```typescript
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', phonetic: false },
  { code: 'lo', name: 'Lao', phonetic: true },
  { code: 'km', name: 'Khmer', phonetic: true },
  // ... more languages
];
```

## 🔒 Privacy & Security

- **No personal data collection** for anonymous users
- **Device fingerprinting** instead of user accounts
- **Local storage** with optional cloud sync
- **Secure API communication** with HTTPS
- **Permission-based** camera and microphone access

## 🚀 Future Enhancements

- [ ] **Cloud synchronization** for cross-device access
- [ ] **Offline translation** with downloaded models
- [ ] **Voice commands** for hands-free operation
- [ ] **Collaborative notes** sharing
- [ ] **Advanced AI features** (summarization, categorization)
- [ ] **Multi-language conversations** support

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support, feature requests, or bug reports, please create an issue in the repository.

---

**Built with ❤️ for travelers and language learners worldwide**