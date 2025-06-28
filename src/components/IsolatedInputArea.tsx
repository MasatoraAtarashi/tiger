import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import React, { useCallback, useState } from 'react';

interface IsolatedInputAreaProps {
  onSubmit: (message: string) => void;
  isProcessing: boolean;
}

// Isolated input component to prevent re-renders from propagating up
export const IsolatedInputArea = React.memo<IsolatedInputAreaProps>(({ onSubmit, isProcessing }) => {
  const [input, setInput] = useState('');

  const handleSubmit = useCallback((value: string): void => {
    if (value.trim()) {
      onSubmit(value);
      setInput('');
    }
  }, [onSubmit]);

  return (
    <Box>
      <Text bold color="yellow">
        {'> '}
      </Text>
      <TextInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        placeholder={isProcessing ? 'Processing...' : 'Type your message...'}
        focus={!isProcessing}
      />
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return prevProps.isProcessing === nextProps.isProcessing &&
         prevProps.onSubmit === nextProps.onSubmit;
});

IsolatedInputArea.displayName = 'IsolatedInputArea';