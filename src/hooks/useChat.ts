import { useConnection } from './useConnection.js';
import { useMessageHandling } from './useMessageHandling.js';

export const useChat = (): ReturnType<typeof useMessageHandling> & {
  isConnected: boolean;
  debugInfo?: {
    connectionStatus: 'connected' | 'disconnected' | 'connecting';
    provider: string;
    model: string;
  };
} => {
  const { connectionInfo, chatRef, config } = useConnection();
  const { session, sendMessage, taskManager, pendingConfirmation, handleConfirmation } = useMessageHandling(chatRef, config);

  return {
    session,
    sendMessage,
    isConnected: connectionInfo.isConnected,
    debugInfo: config?.options?.debug ? {
      connectionStatus: connectionInfo.connectionStatus,
      provider: connectionInfo.provider,
      model: connectionInfo.model,
    } : undefined,
    taskManager,
    pendingConfirmation,
    handleConfirmation,
  };
};