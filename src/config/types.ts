import { LLMProviderConfig } from '../llm/types.js';

export interface TigerConfig {
  // LLMプロバイダーの設定
  llm: LLMProviderConfig;

  // デフォルトのモデル
  defaultModel?: string;

  // システムプロンプト
  systemPrompt?: string;

  // 温度設定
  temperature?: number;

  // 最大トークン数
  maxTokens?: number;

  // ツールの有効/無効
  enabledTools?: string[];

  // その他の設定
  options?: {
    // ストリーミングをデフォルトで有効化
    streamByDefault?: boolean;

    // デバッグモード
    debug?: boolean;

    // タイムアウト設定（ミリ秒）
    timeout?: number;
  };
}
