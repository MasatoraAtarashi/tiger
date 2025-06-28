import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { Message, ChatSession } from '../types.js';

// モックレスポンス生成（後でローカルLLMに置き換え）
const generateMockResponse = async (userMessage: string): Promise<string> => {
  // シミュレートされた遅延
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const responses = [
    `I understand you said: "${userMessage}". This is a mock response from Tiger.`,
    `Processing your request: "${userMessage}". Tiger is working on it!`,
    `Got it! You mentioned: "${userMessage}". I'm here to help with coding tasks.`,
    `Interesting! About "${userMessage}" - I'll be able to help once connected to a local LLM.`,
  ];

  return responses[Math.floor(Math.random() * responses.length)] ?? responses[0]!;
};

export const useChat = (): {
  session: ChatSession;
  sendMessage: (content: string) => Promise<void>;
} => {
  const [session, setSession] = useState<ChatSession>({
    messages: [],
    isProcessing: false,
  });

  const sendMessage = useCallback(async (content: string) => {
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
      // モックレスポンスを生成（将来的にローカルLLMに置き換え）
      const responseContent = await generateMockResponse(content);

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };

      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isProcessing: false,
      }));
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

  return { session, sendMessage };
};
