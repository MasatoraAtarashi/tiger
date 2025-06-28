import { Box, Text , useInput } from 'ink';
import React, { useState } from 'react';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ message, onConfirm, onCancel }) => {
  const [selected, setSelected] = useState<'yes' | 'no'>('yes');

  useInput((_input, key) => {
    if (key.leftArrow || key.rightArrow) {
      setSelected(selected === 'yes' ? 'no' : 'yes');
    } else if (key.return) {
      if (selected === 'yes') {
        onConfirm();
      } else {
        onCancel();
      }
    } else if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
      <Text>{message}</Text>
      <Box marginTop={1}>
        <Text color={selected === 'yes' ? 'green' : 'gray'} bold={selected === 'yes'}>
          [Yes]
        </Text>
        <Text> </Text>
        <Text color={selected === 'no' ? 'red' : 'gray'} bold={selected === 'no'}>
          [No]
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
        Use arrow keys to select, Enter to confirm, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
};