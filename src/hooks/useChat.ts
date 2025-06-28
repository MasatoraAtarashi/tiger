import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { ConfigLoader } from '../config/loader.js';
import { TigerConfig } from '../config/types.js';
import { Chat } from '../core/chat.js';
import { LLMProviderFactory } from '../llm/factory.js';
import { ReadFileTool } from '../tools/readFile.js';
import { Message, ChatSession } from '../types.js';
import { Logger } from '../utils/logger.js';

interface DebugInfo {
  lastRequest?: {
    model: string;
    messageCount: number;
    temperature: number;
    timestamp: Date;
  };
  lastResponse?: {
    tokenCount?: number;
    duration?: number;
    toolCalls?: string[];
  };
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  provider: string;
  model: string;
}

export const useChat = (): {
  session: ChatSession;
  sendMessage: (content: string) => Promise<void>;
  isConnected: boolean;
  debugInfo?: DebugInfo;
} => {
  const [session, setSession] = useState<ChatSession>({
    messages: [],
    isProcessing: false,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | undefined>();
  const chatRef = useRef<Chat | null>(null);
  const configRef = useRef<TigerConfig | null>(null);
  const logger = Logger.getInstance();

  // LLMプロバイダーを初期化
  useEffect(() => {
    const initializeChat = async (): Promise<void> => {
      try {
        setDebugInfo((prev) => ({
          ...prev!,
          connectionStatus: 'connecting',
          provider: 'ollama',
          model: 'llama3',
        }));

        const config = await ConfigLoader.getInstance().load();
        configRef.current = config;

        // デバッグモードの設定
        if (config.options?.debug) {
          logger.setDebugMode(true);
        }

        const provider = LLMProviderFactory.create(config.llm);

        // ヘルスチェック
        const healthy = await provider.healthCheck();
        if (!healthy) {
          throw new Error('Failed to connect to LLM provider');
        }

        const chat = new Chat({
          provider,
          model: config.defaultModel,
          systemPrompt: config.systemPrompt,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });

        // ツールを登録
        chat.registerTool(new ReadFileTool());

        chatRef.current = chat;
        setIsConnected(true);

        if (config.options?.debug) {
          setDebugInfo({
            connectionStatus: 'connected',
            provider: config.llm.type,
            model: config.defaultModel || config.llm.defaultModel || 'llama3',
          });
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setIsConnected(false);

        // 初期化エラーメッセージを表示
        const errorMessage: Message = {
          id: uuidv4(),
          role: 'system',
          content: `Failed to connect to Ollama. Please make sure Ollama is running (ollama serve).`,
          timestamp: new Date(),
        };

        setSession((prev) => ({
          ...prev,
          messages: [errorMessage],
        }));
      }
    };

    void initializeChat();
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!chatRef.current) {
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: 'Chat is not initialized. Please check your LLM provider connection.',
        timestamp: new Date(),
      };

      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
      }));
      return;
    }

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setSession((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isProcessing: true,
    }));

    try {
      // LLMにメッセージを送信
      chatRef.current.addUserMessage(content);

      const startTime = Date.now();

      // デバッグ情報を更新
      if (configRef.current?.options?.debug) {
        setDebugInfo((prev) => ({
          ...prev!,
          lastRequest: {
            model:
              configRef.current?.defaultModel || configRef.current?.llm.defaultModel || 'llama3',
            messageCount: chatRef.current?.getMessages().length || 0,
            temperature: configRef.current?.temperature || 0.7,
            timestamp: new Date(),
          },
        }));
      }

      // ストリーミングレスポンスを使用
      const config = await ConfigLoader.getInstance().load();
      if (config.options?.streamByDefault) {
        let streamContent = '';

        for await (const event of chatRef.current.streamComplete()) {
          if (event.type === 'content') {
            streamContent += event.content;
            // ストリーミング中のメッセージを更新
            setSession((prev) => {
              const messages = [...prev.messages];
              const lastMessage = messages[messages.length - 1];

              if (
                lastMessage &&
                lastMessage.role === 'assistant' &&
                lastMessage.id === 'streaming'
              ) {
                lastMessage.content = streamContent;
              } else {
                messages.push({
                  id: 'streaming',
                  role: 'assistant',
                  content: streamContent,
                  timestamp: new Date(),
                });
              }

              return { ...prev, messages };
            });
          } else if (event.type === 'message') {
            // 最終的なメッセージで置き換え
            setSession((prev) => ({
              ...prev,
              messages: prev.messages.map((msg) => (msg.id === 'streaming' ? event.message : msg)),
              isProcessing: false,
            }));

            // デバッグ情報を更新
            if (configRef.current?.options?.debug) {
              setDebugInfo((prev) => ({
                ...prev!,
                lastResponse: {
                  duration: Date.now() - startTime,
                  tokenCount: streamContent.length, // 概算
                },
              }));
            }
          }
        }
      } else {
        // 非ストリーミングレスポンス
        const response = await chatRef.current.complete();
        setSession((prev) => ({
          ...prev,
          messages: [...prev.messages, response],
          isProcessing: false,
        }));
      }
    } catch (error) {
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };

      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isProcessing: false,
      }));
    }
  }, []);

  return { session, sendMessage, isConnected, debugInfo };
};
