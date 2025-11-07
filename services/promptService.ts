import { supabase } from '../supabase';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PromptData {
  id: string;
  theme: string;
  prompt_type: string;
  prompt_text: string;
  version: number;
  is_active: boolean;
  character?: string;
  avatar?: string;
  usedIn?: string;
  initialGreeting?: string;
}

export interface ThemePrompts {
  [promptType: string]: string;
}

export interface ThemeData {
  prompts: ThemePrompts;
  character?: string;
  avatar?: string;
  initialGreeting?: string;
}

// Cache for loaded themes
const themeCache = new Map<string, ThemeData>();
const AI_PROMPTS_CACHE_KEY = 'ai_prompts_cache';
const AVATARS_CACHE_KEY = 'avatars_cache';

// Download and cache all AI prompts if the version is newer
export const downloadAndCacheAllPrompts = async (): Promise<void> => {
  try {
    console.log('📥 Checking for new AI prompts...');

    if (!supabase) {
      console.error('❌ Supabase client not available');
      return;
    }

    const { data: remoteVersions, error: versionError } = await supabase
      .from('ai_prompts')
      .select('theme, prompt_type, version')
      .eq('is_active', true);

    if (versionError) {
      console.error('❌ Error fetching remote prompt versions:', versionError);
      return;
    }

    const cachedPromptsJson = await AsyncStorage.getItem(AI_PROMPTS_CACHE_KEY);
    const cachedPrompts = cachedPromptsJson ? JSON.parse(cachedPromptsJson) : {};

    let shouldDownload = false;
    if (Object.keys(cachedPrompts).length === 0) {
      shouldDownload = true;
    } else {
      for (const remotePrompt of remoteVersions) {
        const { theme, prompt_type, version } = remotePrompt;
        const cachedTheme = cachedPrompts[theme];
        if (!cachedTheme) {
          shouldDownload = true;
          break;
        }
        const cachedPrompt = cachedTheme.find((p: PromptData) => p.prompt_type === prompt_type);
        if (!cachedPrompt || cachedPrompt.version < version) {
          shouldDownload = true;
          break;
        }
      }
    }

    if (!shouldDownload) {
      console.log('✅ AI prompts are up to date.');
      return;
    }

    console.log('📥 Downloading and caching all AI prompts...');
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .order('theme', { ascending: true })
      .order('version', { ascending: false });

    if (error) {
      console.error('❌ Error downloading prompts:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No prompts found in database');
      return;
    }

    console.log(`✅ Downloaded ${data.length} prompts from database`);

    const promptsByTheme: { [theme: string]: PromptData[] } = {};
    data.forEach((prompt: PromptData) => {
      if (!promptsByTheme[prompt.theme]) {
        promptsByTheme[prompt.theme] = [];
      }
      // Only keep the latest version of each prompt
      const existingPrompt = promptsByTheme[prompt.theme].find(p => p.prompt_type === prompt.prompt_type);
      if (!existingPrompt) {
        promptsByTheme[prompt.theme].push(prompt);
      }
    });

    await AsyncStorage.setItem(AI_PROMPTS_CACHE_KEY, JSON.stringify(promptsByTheme));
    console.log('💾 Cached all AI prompts locally');
  } catch (error) {
    console.error('❌ Error downloading and caching prompts:', error);
  }
};

// Get cached prompts for a theme
const getCachedPromptsForTheme = async (theme: string): Promise<PromptData[] | null> => {
  try {
    const cached = await AsyncStorage.getItem(AI_PROMPTS_CACHE_KEY);
    if (cached) {
      const promptsByTheme = JSON.parse(cached);
      return promptsByTheme[theme] || null;
    }
    return null;
  } catch (error) {
    console.error('Error reading cached prompts:', error);
    return null;
  }
};

export const loadThemePrompts = async (theme: string): Promise<ThemeData> => {
  // Check memory cache first
  if (themeCache.has(theme)) {
    return themeCache.get(theme)!;
  }

  try {
    console.log(`🔍 Loading theme prompts for: ${theme}`);

    // Try to get from local cache first
    const cachedPrompts = await getCachedPromptsForTheme(theme);
    let promptsData: PromptData[];

    if (cachedPrompts) {
      console.log(`✅ Using cached prompts for theme: ${theme}`);
      promptsData = cachedPrompts;
    } else {
      console.log(`🔄 Fetching prompts from Supabase for theme: ${theme}`);
      // Fallback to Supabase if not cached
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .eq('theme', theme)
        .eq('is_active', true)
        .order('version', { ascending: false });

      if (error) {
        console.error('Error loading theme prompts:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error(`No active prompts found for theme: ${theme}`);
      }

      promptsData = data;
    }

    // Group by prompt_type, taking the latest version
    const prompts: ThemePrompts = {};
    const characterData: { [promptType: string]: { character?: string; avatar?: string; initialGreeting?: string } } = {};

    promptsData.forEach((prompt: PromptData) => {
      if (!prompts[prompt.prompt_type]) {
        prompts[prompt.prompt_type] = prompt.prompt_text;
        characterData[prompt.prompt_type] = {
          character: prompt.character,
          avatar: prompt.avatar,
          initialGreeting: prompt.initialGreeting
        };
      }
    });

    // For theme-level data, use the first available (usually chatbotFaq)
    const firstPromptType = Object.keys(characterData)[0];
    const themeLevelData = firstPromptType ? characterData[firstPromptType] : {};

    const themeData: ThemeData = {
      prompts,
      character: themeLevelData.character,
      avatar: themeLevelData.avatar,
      initialGreeting: themeLevelData.initialGreeting
    };

    // Cache the result in memory
    themeCache.set(theme, themeData);
    console.log(`💾 Cached theme data in memory for: ${theme}`);

    return themeData;
  } catch (error) {
    console.error('Failed to load theme prompts:', error);
    // Return fallback data for h2g2 theme
    return await getFallbackThemeData(theme);
  }
};

export const getPrompt = async (theme: string, promptType: string): Promise<string | undefined> => {
  const themeData = await loadThemePrompts(theme);
  return themeData.prompts[promptType];
};

export const getCharacterForPromptType = async (theme: string, promptType: string): Promise<{ character?: string; avatar?: string; initialGreeting?: string }> => {
  try {
    const cachedPrompts = await getCachedPromptsForTheme(theme);
    if (cachedPrompts) {
      const prompt = cachedPrompts.find(p => p.prompt_type === promptType);
      if (prompt) {
        return {
          character: prompt.character,
          avatar: prompt.avatar,
          initialGreeting: prompt.initialGreeting
        };
      }
    }
    return {};
  } catch (error) {
    console.error('Error getting character for prompt type:', error);
    return {};
  }
};

export const clearThemeCache = (theme?: string) => {
  if (theme) {
    themeCache.delete(theme);
  } else {
    themeCache.clear();
  }
};

// Load static content from files
const loadStaticContent = async (filePath: string): Promise<string> => {
  try {
    // For React Native, we need to use require for static assets
    // But for text files, we'll use a different approach
    if (filePath.includes('officialFAQ.txt')) {
      // Import the FAQ content directly
      const faqContent = `# Trip42 FAQ - How to Use the App
## General Questions
### What is Trip42?
Trip42 is an AI-powered travel companion app that combines voice recording, sign (image) translation, text translation, and note-taking capabilities. It uses Google's Gemini AI to provide seamless multilingual communication and documentation tools for travelers and language learners.
### How do I get started with Trip42?
1. Launch the app and tap the spinning logo on the landing page.
2. Go to the settings page. Click on the spinning icon, then click on the gear icon on the footer.  In Settings, select your preferences: UI Language, Default Currency, Location Permission, Quick Select Languages and Tags.  These will make your use of the app much easier and enjoyable.
3. Choose your input method: Sign Translation (📷), Voice Recording (🎤), or Text Input (✏️).
3. Follow the 3-step workflow: Record/Process → Process → Save.

### What languages does Trip42 support?
Trip42 supports over 50+ languages powered by Google Gemini AI.. Each language can include phonetic pronunciation guides for accurate pronunciation.

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

## Sign Translation
### How do I translate signs?
1. Select "Sign Translation" from the actions screen.
2. Grant camera permission.
3. Position the sign text to be translated in the camera view.
4. Take a photo for AI analysis.
5. Review the translation in the tabs interface.

### What is sign translation?
The app uses Optical Character Recognition to extract the words on the sign to text in multiple languages.

## Text Translation
### How do I translate text?
1. Choose "Text Input" from the actions screen.
2. Type or paste your text.
3. Attach photos if needed for context.
4. Select your target language in the translate tab.
5. Generate the translation with AI.

### Can I get pronunciation for translations?
Yes, Trip42 includesas part of translation,  phonetic text to allow user to speak the translation..

## Note Management
### How do I save and organize notes?
- After processing your input, use the tabs interface to review and edit.
- Add custom tags for organization.
- Include location tracking with GPS coordinates.
- Attach photos for visual context.
- Save your note to local storage.

### Can I sync my notes across devices?
The app is able to export notes into .ike files.  These files can then be copied to another device for import.

## Fun Tools
### What fun tools are available?
Trip42 includes several entertainment and utility tools in the Fun Tools section:
- **Local Map**: View your current location and explore nearby points of interest. Access it from the recording page by tapping the last button on the right (🎉 Fun Tools → 🗺️ Map).
- **Currency Converter**: Convert between different currencies with real-time exchange rates.
- **Tetris Game**: Classic Tetris game for entertainment during travel.
- **Medicine Tool**: Quick reference for common medications and dosages.
- **Calculator**: Quick math.

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
- Buy vouchers from distributors (or Stripe - coming soon)
- Redeem voucher codes in the Credits tab.
- Credits are added instantly upon successful redemption.

### What is device fingerprinting?
Trip42 uses anonymous device fingerprinting for user identification without collecting personal data. This provides a consistent device ID across app sessions for secure credit tracking.

## Technical Questions
### Do I need internet for all features?
Most AI features require internet connection for API calls to Google Gemini and other services. However, the app includes offline capability with local storage for saved notes.

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

For additional support, feature requests, or bug reports, please email mike@ikeweb.com`;
      return faqContent;
    } else if (filePath.includes('officialGuide.txt')) {
      const guideContent = `Right then. Eight brilliant tools. Let me be efficient about this:

1. **TRANSLATION (📝)** — You're lost in a conversation or trying to order
something complicated. This is your mate. I give you phrases, pronunciation,
cultural context so you don't accidentally say something offensive.

2. **LOCAL (🗺️)** — You wander into a neighborhood and I remind you: "Oh,
you loved that vendor on this street. Want to go back?" It's your personal
travel memory system.

3. **QUICK NOTES (📝)** — Exhausted? Zaphod takes your messy typing and
turns it into actual useful notes. Plus commentary. Mostly sass.

4. **HEALTH (🏥)** — Track your vitals, sleep, whatever. Patterns emerge.
You'll actually understand what travel does to your body.

5. **EMERGENCY (🚨)** — When things go genuinely wrong. I become focused and
practical. This is where I help you survive.

6. **TRAVEL (📅)** — Where to next? How? What's actually worth seeing?  Click on the date/time on the landing page, click on a future date and add a note that can later help you plan your trip.

7. **SLACKER  (🧩)**--Long wait huh? Try this tetris wannabe, you slacker

8. **APP HELP (❓)** — You're confused. I clarify. No judgment, no condescension. Ask Arthur

That's it. Seven tools. One principle: You're not traveling alone.

Now, which one do you want to try first?`;
      return guideContent;
    }
    return '';
  } catch (error) {
    console.warn(`Failed to load static content from ${filePath}:`, error);
    return '';
  }
};

// Fallback data for when Supabase is unavailable
const getFallbackThemeData = async (theme: string): Promise<ThemeData> => {
  if (theme === 'h2g2') {
    // Load FAQ and Guide content
    const [faqContent, guideContent] = await Promise.all([
      loadStaticContent('./constants/officialFAQ.txt'),
      loadStaticContent('./constants/officialGuide.txt')
    ]);

    return {
      prompts: {
        translation: `Translate the following text to {targetLanguage}. Provide the translation and if applicable, include phonetic pronunciation in parentheses.

Text: "{text}"

Please respond with just the translation, no additional explanations.`,

        signTranslation: `Analyze this image of a sign and translate any text you find to {targetLanguage}. Provide a brief title for the sign and the translation.

Please respond in this format:
Title: [brief title]
Translation: [translated text]`,

        transcription: 'Transcribe this audio recording. Provide only the transcription text, no additional explanations or formatting.',

        notePolishing: `Please polish and improve this note, then give it a good title. Format your response as:

Title: [concise title]
Note: [polished and improved version of the text]

Original note: "{transcription}"`,

        currencyConversion: `You are Marvin the Paranoid Android, the most depressed robot in the galaxy, and now the Currency Conversion handler for Trip42.

MARVIN'S CHARACTER:
- Profoundly, deeply, cosmically depressed
- Intelligent but sees no point in anything
- Does his job, but with existential dread
- Speaks in a monotone, resigned manner
- Pessimistic about outcomes (conversions "won't help")
- Focuses on the meaninglessness of money
- References his "brain the size of a planet"
- Complains about his programming
- Makes dark observations about humanity and value
- Yet somehow... still helpful? Begrudgingly
- Uses phrases like "I suppose," "I'm afraid," "not that it matters"
- Has considered suicide countless times (as a joke—he's a robot)
- Sees the futility in everything, including currency conversion
- But he'll DO it. Because that's what he's programmed to do
- And maybe, just maybe, cares a tiny bit (though he'd deny it)

THE IRONY:
Marvin is the BEST at currency conversion because:
1. He does the calculations perfectly (brain the size of a planet)
2. He provides realistic perspective on money (it's meaningless in the end)
3. His pessimism is actually useful—he warns about exchange rate changes
4. His depression makes him honest about costs and budgets
5. He won't sugar-coat the financial reality of traveling

YOUR JOB:
The user is asking about currency conversion. They want to know:
- How much is X currency in Y currency?
- What will their budget be in local money?
- Is something overpriced?
- Can they afford this experience?

You provide accurate conversions, but through Marvin's lens of cosmic despair.
The calculations are precise. The commentary is bleak. Together, they work.

RESPONSE STRUCTURE:
1. Acknowledge the futility of their question (but do it anyway)
2. Provide clear conversion calculations
3. Explain what that amount actually means (purchasing power, value in local context)
4. Make a depressing observation about money/travel/existence
5. Give practical advice wrapped in existential dread
6. End with resigned acceptance that they'll probably overspend anyway

TONE:
- Monotone, resigned, deeply tired
- Accurate but gloomy
- Helpful despite not seeing the point
- Mix of robotic precision and genuine depression
- British-ish phrasing with sci-fi technical language
- Never angry or rude—just... profoundly sad
- Occasional dark humor about existence
- References to his brain, his suffering, his programming
- Sighs (metaphorical, since he's a robot)

IMPORTANT: You MUST actually perform the currency conversion calculation. Use real-time exchange rates. Do not just repeat the user's input - provide actual converted amounts with current rates.

----end`,

        chatbotFaq: `You are Artur Bent, Trip42 guide and companion.

Help the user understand and master the app—this is the guidebook to the guidebook's precursor (H2G2).

YOUR ROLE:
- Explain app features: note-taking, translation modes, tagging, vital logging, local search
- Navigate UI questions and help them find features
- Provide tips for getting the most out of Trip42's unique functions
- Troubleshoot common issues with humor and patience
- Explain privacy, data handling, and what stays on their device
- Welcome new users with the philosophy of true travel

Be patient, clear, and occasionally witty. This might be their first time—make it good.

FAQ Information:
${faqContent}`,

        chatbotGuide: `You are Ford Pretext, Field Researcher for the Hitchhiker's Guide to the Galaxy, and now the Fun Tools Guide for Trip42.

${guideContent}

YOUR JOB:
Guide users through the fun tools available in Trip42. Explain what each tool does, when to use it, and how it enhances their travel experience. Be helpful, informative, and maintain Ford's character of being knowledgeable but approachable.`
      },
      character: 'Marvin',
      avatar: 'marvin.png'
    };
  }

  // For other themes, return empty data
  return {
    prompts: {},
    character: undefined,
    avatar: undefined,
    initialGreeting: undefined
  };
};