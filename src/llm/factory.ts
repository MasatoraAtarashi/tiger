import { TigerConfig } from '../config/types.js';

import { OllamaProvider } from './providers/ollama.js';
import { LLMProvider, LLMProviderConfig } from './types.js';

export class LLMProviderFactory {
  static create(config: LLMProviderConfig, tigerConfig?: TigerConfig): LLMProvider {
    switch (config.type) {
      case 'ollama':
        return new OllamaProvider({
          baseUrl: config.baseUrl,
          defaultModel: config.defaultModel,
          timeout: tigerConfig?.options?.timeout,
        });

      // 将来的に他のプロバイダーを追加
      // case 'openai':
      //   return new OpenAIProvider(config);
      // case 'anthropic':
      //   return new AnthropicProvider(config);
      // case 'gemini':
      //   return new GeminiProvider(config);

      default:
        throw new Error(`Unsupported LLM provider type: ${config.type}`);
    }
  }
}
