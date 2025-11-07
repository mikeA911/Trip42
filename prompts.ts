import { getPrompt as getPromptFromService, getThemeCharacter, clearThemeCache } from './services/promptService';

export interface Prompts {
  themes: {
    [themeName: string]: {
      translation?: string;
      signTranslation?: string;
      transcription?: string;
      notePolishing?: string;
      currencyConversion?: string;
      chatbotMap?: string;
      chatbotMeds?: string;
      chatbotBored?: string;
      chatbotTools?: string;
    };
  };
}

// Async version that loads from Supabase
export const getPrompt = async (theme: string, promptType: keyof Prompts['themes'][string]): Promise<string | undefined> => {
  return await getPromptFromService(theme, promptType);
};

// Legacy sync version for backward compatibility - returns undefined, components should use async version
export const getPromptSync = (theme: string, promptType: keyof Prompts['themes'][string]): string | undefined => {
  console.warn('getPromptSync is deprecated. Use getPrompt async function instead.');
  return undefined;
};

// Export theme character/avatar loading functions
export { getThemeCharacter, clearThemeCache };

// Legacy prompts object for backward compatibility - will be empty
export const prompts: Prompts = {
  themes: {}
};