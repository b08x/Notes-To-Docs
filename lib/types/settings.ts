export type AIProvider = 'google' | 'openai' | 'anthropic';

export type ModelTier = 'fast' | 'reasoning';

export interface ProviderSettings {
  id: AIProvider;
  name: string;
  models: {
    fast: string;
    reasoning: string;
  };
}

export const PROVIDERS: Record<AIProvider, ProviderSettings> = {
  google: {
    id: 'google',
    name: 'Google Gemini',
    models: {
      fast: 'gemini-2.5-flash',
      reasoning: 'gemini-3-pro-preview'
    }
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    models: {
      fast: 'gpt-4o-mini',
      reasoning: 'gpt-4o'
    }
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    models: {
      fast: 'claude-3-haiku-20240307',
      reasoning: 'claude-3-5-sonnet-20240620'
    }
  }
};

export interface UserSettings {
  activeProvider: AIProvider;
  activeModelTier: ModelTier;
  apiKeys: {
    google: string;
    openai: string;
    anthropic: string;
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  activeProvider: 'google',
  activeModelTier: 'reasoning',
  apiKeys: {
    google: '',
    openai: '',
    anthropic: ''
  }
};