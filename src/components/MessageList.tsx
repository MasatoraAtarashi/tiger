import { Box, Text } from 'ink';
import React from 'react';

import { Message } from '../types.js';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <Box flexDirection="column">
      {messages.map((message) => (
        <Box key={message.id} flexDirection="column" marginBottom={1}>
          <Box>
            <Text bold color={message.role === 'user' ? 'cyan' : 'green'}>
              {message.role === 'user' ? 'You' : 'Tiger'}:
            </Text>
          </Box>
          <Box marginLeft={2}>
            <Text>{message.content}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};
