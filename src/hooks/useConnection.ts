import { useState, useEffect, useRef } from 'react';

import { ConfigLoader } from '../config/loader.js';
import { TigerConfig } from '../config/types.js';
import { Chat } from '../core/chat.js';
import { LLMProviderFactory } from '../llm/factory.js';
import { toolRegistry } from '../tools/registry.js';
import { Logger } from '../utils/logger.js';

export interface ConnectionInfo {
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  provider: string;
  model: string;
}

export const useConnection = (): {
  connectionInfo: ConnectionInfo;
  chatRef: Chat | null;
  config: TigerConfig | null;
} => {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    isConnected: false,
    connectionStatus: 'disconnected',
    provider: 'ollama',
    model: 'llama3',
  });
  const chatRef = useRef<Chat | null>(null);
  const configRef = useRef<TigerConfig | null>(null);
  const logger = Logger.getInstance();

  useEffect(() => {
    const initializeConnection = async (): Promise<void> => {
      try {
        setConnectionInfo(prev => ({
          ...prev,
          connectionStatus: 'connecting',
        }));

        const config = await ConfigLoader.getInstance().load();
        configRef.current = config;

        if (config.options?.debug) {
          logger.setDebugMode(true);
        }

        const provider = LLMProviderFactory.create(config.llm, config);

        const healthy = await provider.healthCheck();
        if (!healthy) {
          throw new Error('Failed to connect to LLM provider');
        }

        const chat = new Chat({
          provider,
          model: config.defaultModel || config.llm.defaultModel,
          systemPrompt: config.systemPrompt,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });

        const tools = toolRegistry.list();
        for (const toolSchema of tools) {
          const tool = toolRegistry.get(toolSchema.name);
          if (tool) {
            chat.registerTool(tool);
          }
        }

        chatRef.current = chat;

        setConnectionInfo({
          isConnected: true,
          connectionStatus: 'connected',
          provider: config.llm.type,
          model: config.defaultModel || config.llm.defaultModel || 'llama3',
        });

        logger.info('useConnection', 'Successfully connected to LLM provider');
      } catch (error) {
        logger.error('useConnection', 'Failed to initialize chat', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        setConnectionInfo(prev => ({
          ...prev,
          isConnected: false,
          connectionStatus: 'disconnected',
        }));
      }
    };

    void initializeConnection();
  }, [logger]);

  return {
    connectionInfo,
    chatRef: chatRef.current,
    config: configRef.current,
  };
};