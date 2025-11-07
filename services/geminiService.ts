import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { getPrompt } from '../prompts';
import { getThemeCharacter } from './promptService';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API;
// Remove console.log that exposes API key status
// console.log('=== GEMINI SERVICE: GEMINI_API key loaded:', GEMINI_API_KEY ? 'YES' : 'NO');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

export interface TranslationResult {
  text: string;
  phonetic?: string;
}

export interface NotePolishResult {
  title: string;
  polishedNote: string;
}

export const translateTextWithGemini = async (
  text: string,
  targetLanguage: string,
  uiLanguage: string = 'en',
  onCancel?: (cancelFn: () => void) => void,
  systemPrompt?: string,
  theme: string = 'h2g2'
): Promise<TranslationResult> => {
  try {
    if (!text || text.trim() === '') {
      throw new Error('Text to translate is empty');
    }

    let prompt: string;
    if (systemPrompt) {
      prompt = systemPrompt;
    } else {
      const themePrompt = await getPrompt(theme, 'translation');
      if (themePrompt) {
        prompt = themePrompt.replace('{targetLanguage}', targetLanguage).replace('{text}', text);
      } else {
        prompt = `Translate the following text to ${targetLanguage}. Provide the translation and if applicable, include phonetic pronunciation in parentheses.

Text: "${text}"

Please respond with just the translation, no additional explanations.`;
      }
    }

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    if (onCancel) {
      onCancel(() => {
        controller.abort();
        clearTimeout(timeoutId);
      });
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean up the response
    const cleanText = translatedText.replace(/^\*+|\*+$/g, '').trim();

    return {
      text: cleanText,
      phonetic: undefined // For now, we'll skip phonetic as it's complex
    };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Translation was cancelled');
    }
    throw new Error(`Translation failed: ${error.message}`);
  }
};

export const translateSignWithGemini = async (
  base64Image: string,
  targetLanguage: string,
  onCancel?: (cancelFn: () => void) => void,
  theme: string = 'h2g2'
): Promise<{ title: string; translation: string }> => {
  try {
    let prompt: string;
    const themePrompt = await getPrompt(theme, 'signTranslation');
    if (themePrompt) {
      prompt = themePrompt.replace('{targetLanguage}', targetLanguage);
    } else {
      prompt = `Analyze this image of a sign and translate any text you find to ${targetLanguage}. Provide a brief title for the sign and the translation.

Please respond in this format:
Title: [brief title]
Translation: [translated text]`;
    }

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    if (onCancel) {
      onCancel(() => {
        controller.abort();
        clearTimeout(timeoutId);
      });
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Sign translation failed: ${response.status}`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the response
    const titleMatch = result.match(/Title:\s*(.+?)(?:\n|$)/i);
    const translationMatch = result.match(/Translation:\s*(.+?)(?:\n|$)/i);

    const title = titleMatch ? titleMatch[1].trim() : 'Sign Translation';
    const translation = translationMatch ? translationMatch[1].trim() : result;

    return { title, translation };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Sign translation was cancelled');
    }
    throw new Error(`Sign translation failed: ${error.message}`);
  }
};

export const transcribeAudioWithGemini = async (
  audioUri: string,
  onCancel?: (cancelFn: () => void) => void,
  theme: string = 'h2g2'
): Promise<string> => {
  try {
    let audioBase64: string;

    // Handle web vs native platforms differently
    if (Platform.OS === 'web') {
      console.log('DEBUG: Using web audio processing');
      // For web, fetch the blob and convert to base64
      const response = await fetch(audioUri);
      const blob = await response.blob();
      audioBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix if present
          const base64 = result.split(',')[1] || result;
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      });
    } else {
      console.log('DEBUG: Using native audio processing');
      // Read audio file as base64 for native platforms
      audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: 'base64',
      });
    }

    const themePrompt = await getPrompt(theme, 'transcription');
    const prompt = themePrompt || 'Transcribe this audio recording. Provide only the transcription text, no additional explanations or formatting.';

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'audio/m4a', // Adjust based on your recording format
              data: audioBase64
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    if (onCancel) {
      onCancel(() => {
        controller.abort();
        clearTimeout(timeoutId);
      });
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const data = await response.json();
    const transcription = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return transcription.trim();

  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Transcription was cancelled');
    }
    throw new Error(`Transcription failed: ${error.message}`);
  }
};

export const polishNoteWithGemini = async (
  transcription: string,
  onCancel?: (cancelFn: () => void) => void,
  theme: string = 'h2g2'
): Promise<NotePolishResult> => {
  try {
    if (!transcription || transcription.trim() === '') {
      throw new Error('Transcription is empty');
    }

    let prompt: string;
    const themePrompt = await getPrompt(theme, 'notePolishing');
    if (themePrompt) {
      // Ensure we replace both placeholders
      prompt = themePrompt
        .replace('{transcription}', transcription)
        .replace('(original transcription)', transcription);
    } else {
      prompt = `Please polish and improve this note, then give it a good title. Format your response as:

Title: [concise title]
Note: [polished and improved version of the text]

Original note: "${transcription}"`;
    }

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    if (onCancel) {
      onCancel(() => {
        controller.abort();
        clearTimeout(timeoutId);
      });
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Note polishing failed: ${response.status}`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse title and note
    const titleMatch = result.match(/Title:\s*(.+?)(?:\n|$)/i);
    const noteMatch = result.match(/Note:\s*(.+?)(?:\n|$)/i);

    const title = titleMatch ? titleMatch[1].trim() : 'Voice Note';
    const polishedNote = noteMatch ? noteMatch[1].trim() : result.replace(/Title:\s*.+?\n/i, '').trim();

    return { title, polishedNote };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Note polishing was cancelled');
    }
    throw new Error(`Note polishing failed: ${error.message}`);
  }
};

export const marvinCurrencyConversion = async (
  query: string,
  systemPrompt: string,
  onCancel?: (cancelFn: () => void) => void,
  theme: string = 'h2g2'
): Promise<string> => {
  console.log('DEBUG - marvinCurrencyConversion called with query:', query);
  console.log('DEBUG - systemPrompt length:', systemPrompt.length);

  try {
    if (!query || query.trim() === '') {
      throw new Error('Query is empty');
    }

    console.log('DEBUG - Building request body...');
    let finalPrompt: string;
    if (systemPrompt) {
      finalPrompt = systemPrompt;
    } else {
      const themePrompt = await getPrompt(theme, 'currencyConversion');
      finalPrompt = themePrompt || 'Please perform currency conversion calculations.';
    }

    const requestBody = {
      contents: [{
        parts: [{ text: `${finalPrompt}\n\n${query}` }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      }
    };

    console.log('DEBUG - Request body built, setting up controller...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('DEBUG - Timeout reached, aborting...');
      controller.abort();
    }, 30000);

    if (onCancel) {
      onCancel(() => {
        controller.abort();
        clearTimeout(timeoutId);
      });
    }

    console.log('DEBUG - Making fetch request to Gemini API...');
    console.log('DEBUG - API URL:', `${GEMINI_API_URL}?key=${GEMINI_API_KEY.substring(0, 10)}...`);

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    console.log('DEBUG - Fetch response received, status:', response.status);
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log('DEBUG - Response not ok, throwing error...');
      throw new Error(`Marvin currency conversion failed: ${response.status}`);
    }

    console.log('DEBUG - Parsing response JSON...');
    const data = await response.json();
    console.log('DEBUG - Response data:', data);

    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('DEBUG - Extracted result:', result);

    // Clean up the response
    const cleanText = result.replace(/^\*+|\*+$/g, '').trim();
    console.log('DEBUG - Cleaned text:', cleanText);

    return cleanText;

  } catch (error: any) {
    console.log('DEBUG - Error in marvinCurrencyConversion:', error);
    if (error.name === 'AbortError') {
      throw new Error('Currency conversion was cancelled');
    }
    throw new Error(`Currency conversion failed: ${error.message}`);
  }
};