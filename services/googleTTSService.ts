// Note: TTS functionality is currently mocked for local-only app
// Supabase integration removed for privacy - all data stays on device

export const speakTextWithGoogleTTS = async (text: string, language = 'en-US', voice = 'en-US-Neural2-D') => {
  try {
    if (!text || text.trim() === '') {
      throw new Error('Text to speak is empty');
    }

    // Create the Google Cloud TTS request payload
    const requestPayload = {
      action: 'google-tts',
      text: text,
      languageCode: language,
      voice: {
        languageCode: language,
        name: voice,
        ssmlGender: 'NEUTRAL'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0
      }
    };

    // TODO: Implement TTS functionality - temporarily return mock data
    // Call Supabase Edge Function for Google Cloud TTS
    // const { data, error } = await supabase.functions.invoke('google-cloud-tts', {
    //   body: requestPayload
    // });

    // if (error) {
    //   throw new Error(error.message || 'Failed to generate speech with Google Cloud TTS');
    // }

    // if (!data) {
    //   throw new Error('No TTS data returned from Google Cloud TTS');
    // }

    // Return the audio data
    // const audioData = data.audioContent; // Base64 encoded audio
    // const contentType = 'audio/mp3';

    // if (!audioData) {
    //   throw new Error('No audio data in Google Cloud TTS response');
    // }

    // Mock implementation for now
    const audioData = 'mock-audio-data';
    const contentType = 'audio/mp3';

    return { audioData, contentType };

  } catch (error) {
    console.error('Google Cloud TTS error:', error);
    throw new Error('Failed to generate speech with Google Cloud TTS. Please try again.');
  }
};

// Helper function to get appropriate voice for language
export const getVoiceForLanguage = (language: string) => {
  const voiceMap: { [key: string]: string } = {
    'en': 'en-US-Neural2-D',
    'en-US': 'en-US-Neural2-D',
    'en-GB': 'en-GB-Neural2-A',
    'es': 'es-ES-Neural2-A',
    'es-ES': 'es-ES-Neural2-A',
    'fr': 'fr-FR-Neural2-A',
    'fr-FR': 'fr-FR-Neural2-A',
    'de': 'de-DE-Neural2-A',
    'de-DE': 'de-DE-Neural2-A',
    'it': 'it-IT-Neural2-A',
    'it-IT': 'it-IT-Neural2-A',
    'pt': 'pt-BR-Neural2-A',
    'pt-BR': 'pt-BR-Neural2-A',
    'ja': 'ja-JP-Neural2-B',
    'ja-JP': 'ja-JP-Neural2-B',
    'ko': 'ko-KR-Neural2-A',
    'ko-KR': 'ko-KR-Neural2-A',
    'zh': 'cmn-CN-Neural2-A',
    'zh-CN': 'cmn-CN-Neural2-A',
    'zh-TW': 'cmn-TW-Neural2-A',
    'ar': 'ar-XA-Neural2-A',
    'hi': 'hi-IN-Neural2-A',
    'ru': 'ru-RU-Neural2-A',
    'th': 'th-TH-Neural2-A',
    'vi': 'vi-VN-Neural2-A',
    'lo': 'lo-LA-Neural2-A',
    'km': 'km-KH-Neural2-A',
    'fil': 'fil-PH-Neural2-A',
    'uk': 'uk-UA-Neural2-A'
  };

  return voiceMap[language] || voiceMap[language.split('-')[0]] || 'en-US-Neural2-D';
};