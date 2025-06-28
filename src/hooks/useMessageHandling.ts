import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { TigerConfig } from '../config/types.js';
import { Chat } from '../core/chat.js';
import { confirmationManager } from '../core/confirmation-manager.js';
import { Message, ChatSession } from '../types.js';
import { Logger } from '../utils/logger.js';

import { useTaskManager } from './useTaskManager.js';

const UPDATE_INTERVAL = 3;

export const useMessageHandling = (
  chat: Chat | null,
  config: TigerConfig | null,
): {
  session: ChatSession;
  sendMessage: (content: string) => Promise<void>;
  taskManager: ReturnType<typeof useTaskManager>;
  pendingConfirmation: {
    tool: string;
    message: string;
    args: Record<string, unknown>;
  } | null;
  handleConfirmation: (approved: boolean) => void;
} => {
  const [session, setSession] = useState<ChatSession>({
    messages: [],
    isProcessing: false,
  });
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    tool: string;
    message: string;
    args: Record<string, unknown>;
  } | null>(null);
  
  const logger = Logger.getInstance();
  const taskManager = useTaskManager();

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!chat || session.isProcessing) return;

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
      chat.addUserMessage(content);

      if (config?.options?.streamByDefault !== false) {
        const stream = chat.streamComplete();
        let streamContent = '';
        let updateCounter = 0;

        for await (const event of stream) {
          logger.debug('useMessageHandling', `Received event: ${event.type}`, event);
          
          if (event.type === 'content') {
            streamContent += event.content;
            updateCounter++;
            
            if (event.content.includes('<tool_use>')) {
              const toolMatch = event.content.match(/<tool_use>(\w+)/);
              if (toolMatch) {
                taskManager.setCurrentAction(`ツール実行中: ${toolMatch[1]}`);
              }
            } else if (event.content.includes('<tool_result>')) {
              taskManager.setCurrentAction('ツール結果を処理中...');
            }
            
            if (streamContent.match(/(完了|成功|終了|completed|done|finished)/i)) {
              const inProgressTask = taskManager.tasks.find(t => t.status === 'in_progress');
              if (inProgressTask) {
                taskManager.updateTask(inProgressTask.id, { status: 'completed' });
              }
            }
            
            const taskStartPatterns = [
              /(今から|次に|まず|Now|Next|First).*(実行|作成|読み込|確認|解析)/i,
              /(タスク|Task)\s*(\d+)[:：]/i
            ];
            
            for (const pattern of taskStartPatterns) {
              const match = streamContent.match(pattern);
              if (match) {
                const nextTask = taskManager.tasks.find(t => t.status === 'pending');
                if (nextTask) {
                  taskManager.updateTask(nextTask.id, { status: 'in_progress' });
                }
                break;
              }
            }
            
            if (updateCounter % UPDATE_INTERVAL === 0) {
              logger.debug('useMessageHandling', `Stream content updated: ${streamContent.length} chars`);
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
            }
          } else if (event.type === 'done') {
            logger.debug('useMessageHandling', `Stream complete. Total content: ${streamContent}`);
            
            if (streamContent.includes('タスク') || streamContent.includes('1.') || streamContent.includes('-')) {
              taskManager.parseAndAddTasks(streamContent);
            }
            
            taskManager.setCurrentAction(undefined);
            
            const finalMessage: Message = {
              id: uuidv4(),
              role: 'assistant',
              content: streamContent || '[No response from LLM]',
              timestamp: new Date(),
            };
            
            setSession((prev) => ({
              ...prev,
              messages: prev.messages.map((msg) => 
                msg.id === 'streaming' ? finalMessage : msg
              ),
              isProcessing: false,
            }));

            break;
          } else if (event.type === 'error') {
            throw event.error;
          } else if ('confirmationRequired' in event && event.type === 'confirmationRequired') {
            setPendingConfirmation({
              tool: event.tool,
              message: event.message,
              args: event.args
            });
            break;
          }
        }
      } else {
        const response = await chat.complete();
        setSession((prev) => ({
          ...prev,
          messages: [...prev.messages, response],
          isProcessing: false,
        }));
      }
    } catch (error) {
      logger.error('useMessageHandling', 'Error sending message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
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
  }, [chat, session.isProcessing, config, taskManager, logger]);

  const handleConfirmation = useCallback((approved: boolean) => {
    if (confirmationManager.hasPendingConfirmation()) {
      confirmationManager.respond(approved);
      setPendingConfirmation(null);
    }
  }, []);

  return {
    session,
    sendMessage,
    taskManager,
    pendingConfirmation,
    handleConfirmation,
  };
};