import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

interface ConfirmationDialogProps {
  message: string;
  details?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  message,
  details,
  onConfirm,
  onCancel,
}) => {
  const [selected, setSelected] = useState(0); // 0: Yes, 1: No

  useInput((input, key) => {
    if (key.leftArrow || key.rightArrow) {
      setSelected(selected === 0 ? 1 : 0);
    } else if (key.return) {
      if (selected === 0) {
        onConfirm();
      } else {
        onCancel();
      }
    } else if (input === 'y' || input === 'Y') {
      onConfirm();
    } else if (input === 'n' || input === 'N' || key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="yellow" padding={1}>
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow" bold>
          ⚠️  確認が必要です
        </Text>
        <Box marginTop={1}>
          <Text>{message}</Text>
        </Box>
        {details && (
          <Box marginTop={1}>
            <Text dimColor>{details}</Text>
          </Box>
        )}
      </Box>
      
      <Box gap={4}>
        <Box>
          <Text 
            color={selected === 0 ? 'greenBright' : 'gray'} 
            bold={selected === 0}
          >
            {selected === 0 ? '▶ ' : '  '}
            Yes (Y)
          </Text>
        </Box>
        <Box>
          <Text 
            color={selected === 1 ? 'redBright' : 'gray'}
            bold={selected === 1}
          >
            {selected === 1 ? '▶ ' : '  '}
            No (N)
          </Text>
        </Box>
      </Box>
      
      <Box marginTop={1}>
        <Text dimColor>
          ← → で選択、Enter で決定、ESC でキャンセル
        </Text>
      </Box>
    </Box>
  );
};