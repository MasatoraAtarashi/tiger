import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

export const App: React.FC = () => {
  const [message, setMessage] = useState('Hello World from Tiger CLI! 🐯');
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      exit();
    }
    
    if (input === 'h') {
      setMessage('Welcome to Tiger - Your local LLM-powered coding agent!');
    }
    
    if (input === 'r') {
      setMessage('Hello World from Tiger CLI! 🐯');
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text color="yellow" bold>
          {message}
        </Text>
      </Box>
      
      <Box flexDirection="column">
        <Text dimColor>Commands:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>
            <Text color="green">h</Text> - Show help message
          </Text>
          <Text>
            <Text color="green">r</Text> - Reset message
          </Text>
          <Text>
            <Text color="green">q/ESC</Text> - Quit
          </Text>
        </Box>
      </Box>
    </Box>
  );
};