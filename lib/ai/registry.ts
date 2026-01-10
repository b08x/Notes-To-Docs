import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { AIProvider, ModelTier, PROVIDERS, UserSettings } from '../types/settings';

export class AIRegistry {
  static getModel(settings: UserSettings) {
    const providerId = settings.activeProvider;
    const tier = settings.activeModelTier;
    const apiKey = settings.apiKeys[providerId];
    const modelId = PROVIDERS[providerId].models[tier];

    if (!apiKey) {
      throw new Error(`Missing API Key for ${PROVIDERS[providerId].name}`);
    }

    switch (providerId) {
      case 'google':
        const google = createGoogleGenerativeAI({ apiKey });
        return google(modelId);
      
      case 'openai':
        const openai = createOpenAI({ apiKey });
        return openai(modelId);
      
      case 'anthropic':
        const anthropic = createAnthropic({ apiKey });
        return anthropic(modelId);
      
      default:
        throw new Error(`Unsupported provider: ${providerId}`);
    }
  }
}