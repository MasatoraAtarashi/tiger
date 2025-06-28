import { ToolSchema } from '../tools/types.js';

// メッセージの型定義
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

// ツール呼び出しの型定義
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// ストリーミングイベントの型定義
export type StreamEvent =
  | { type: 'content'; content: string }
  | { type: 'tool_call'; toolCall: ToolCall }
  | { type: 'error'; error: Error }
  | { type: 'done' };

// チャット完了のオプション
export interface ChatCompletionOptions {
  model: string;
  messages: LLMMessage[];
  tools?: ToolSchema[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// チャット完了のレスポンス
export interface ChatCompletionResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// LLMプロバイダーのインターフェース
export interface LLMProvider {
  name: string;

  // 利用可能なモデルのリスト
  listModels(): Promise<string[]>;

  // チャット完了（非ストリーミング）
  chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;

  // チャット完了（ストリーミング）
  streamChatCompletion(options: ChatCompletionOptions): AsyncGenerator<StreamEvent, void, unknown>;

  // ヘルスチェック
  healthCheck(): Promise<boolean>;
}

// プロバイダーの設定
export interface LLMProviderConfig {
  type: 'ollama' | 'openai' | 'anthropic' | 'gemini';
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  options?: Record<string, unknown>;
}
