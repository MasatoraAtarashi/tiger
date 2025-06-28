import { Box, Text, Static } from 'ink';
import React from 'react';

import { Message } from '../types.js';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = React.memo(({ messages }) => {
  return (
    <Static items={messages}>
      {(message) => (
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
      )}
    </Static>
  );
});
