import { Box, Text } from 'ink';
import React from 'react';

interface StatusBarProps {
  isProcessing: boolean;
  messageCount: number;
  toolsUsed: number;
  currentModel: string;
  contextLength: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isProcessing,
  messageCount,
  toolsUsed,
  currentModel,
  contextLength,
}) => {
  return (
    <Box 
      borderStyle="single" 
      borderColor="gray" 
      paddingX={1}
      justifyContent="space-between"
    >
      <Box gap={2}>
        <Text color="cyan">Status: {isProcessing ? '🔄 Processing' : '✅ Ready'}</Text>
        <Text dimColor>Messages: {messageCount}</Text>
        <Text dimColor>Tools: {toolsUsed}</Text>
      </Box>
      <Box gap={2}>
        <Text dimColor>Model: {currentModel}</Text>
        <Text dimColor>Context: ~{contextLength} tokens</Text>
      </Box>
    </Box>
  );
};