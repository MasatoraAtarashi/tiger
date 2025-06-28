import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import React, { useCallback, useState } from 'react';

interface InputAreaProps {
  onSubmit: (message: string) => void;
  isProcessing: boolean;
}

export const InputArea = React.memo<InputAreaProps>(({ onSubmit, isProcessing }) => {
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
});
InputArea.displayName = 'InputArea';
