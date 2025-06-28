import { Box, Text } from 'ink';
import React from 'react';

interface FallbackInputProps {
  value: string;
  isProcessing: boolean;
}

// Non-interactive input display for when raw mode is not supported
export const FallbackInput: React.FC<FallbackInputProps> = ({ value, isProcessing }) => {
  return (
    <Box>
      <Text bold color="yellow">
        {'> '}
      </Text>
      <Text dimColor>
        {value || (isProcessing ? 'Processing...' : 'Non-interactive mode - use standard input')}
      </Text>
    </Box>
  );
};