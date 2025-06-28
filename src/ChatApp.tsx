import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import React, { useEffect } from 'react';

import { InputArea } from './components/InputArea.js';
import { MessageList } from './components/MessageList.js';
import { useChat } from './hooks/useChat.js';

export const ChatApp: React.FC = () => {
  const { exit } = useApp();
  const { session, sendMessage } = useChat();

  useEffect(() => {
    // Ctrl+C または Ctrl+D で終了
    const handleExit = (): void => {
      exit();
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

    return () => {
      process.removeListener('SIGINT', handleExit);
      process.removeListener('SIGTERM', handleExit);
    };
  }, [exit]);

  const handleSubmit = (message: string): void => {
    if (message.toLowerCase() === '/exit' || message.toLowerCase() === '/quit') {
      exit();
      return;
    }
    void sendMessage(message);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="yellow">
          Tiger CLI - Local LLM-powered coding agent
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>Type your message or use /exit to quit</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <MessageList messages={session.messages} />
      </Box>

      <Box>
        {session.isProcessing ? (
          <Box>
            <Text color="green">
              <Spinner type="dots" />
            </Text>
            <Text> Tiger is thinking...</Text>
          </Box>
        ) : (
          <InputArea onSubmit={handleSubmit} isProcessing={session.isProcessing} />
        )}
      </Box>
    </Box>
  );
};
