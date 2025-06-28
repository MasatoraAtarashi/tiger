import { Box, Text } from 'ink';
import React from 'react';

interface GameUIProps {
  children: React.ReactNode;
  title?: string;
  statusBar?: React.ReactNode;
}

export const GameUI: React.FC<GameUIProps> = ({ children, title = 'TIGER CONSOLE', statusBar }) => {
  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box 
        borderStyle="double"
        borderColor="yellow"
        paddingX={1}
        width="100%"
      >
        <Box flexGrow={1} justifyContent="center">
          <Text bold color="yellow">
            ⚡ {title} ⚡
          </Text>
        </Box>
      </Box>

      {/* Main Content */}
      <Box 
        flexDirection="column"
        flexGrow={1}
        borderStyle="single"
        borderLeft={true}
        borderRight={true}
        borderTop={false}
        borderBottom={false}
        borderColor="cyan"
        paddingX={1}
      >
        {children}
      </Box>

      {/* Status Bar */}
      {statusBar && (
        <Box
          borderStyle="single"
          borderColor="green"
          paddingX={1}
          width="100%"
        >
          {statusBar}
        </Box>
      )}

      {/* Footer */}
      <Box 
        borderStyle="double"
        borderColor="yellow"
        paddingX={1}
        width="100%"
        justifyContent="space-between"
      >
        <Text dimColor>
          [ESC] Menu
        </Text>
        <Text dimColor>
          [TAB] Complete
        </Text>
        <Text dimColor>
          [CTRL+C] Exit
        </Text>
      </Box>
    </Box>
  );
};

// HP/MP風のステータスバー
interface StatusBarProps {
  isProcessing: boolean;
  messageCount: number;
  toolsUsed: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ isProcessing, messageCount, toolsUsed }) => {
  return (
    <Box justifyContent="space-between" width="100%">
      <Box gap={2}>
        <Text>
          <Text color="red">❤️ HP: </Text>
          <Text color="green">████████</Text>
          <Text color="gray">██</Text>
          <Text> 80/100</Text>
        </Text>
        <Text>
          <Text color="blue">💫 MP: </Text>
          <Text color="cyan">██████</Text>
          <Text color="gray">████</Text>
          <Text> 60/100</Text>
        </Text>
      </Box>
      <Box gap={2}>
        <Text>
          <Text color="yellow">📝 Messages: </Text>
          <Text bold>{messageCount}</Text>
        </Text>
        <Text>
          <Text color="magenta">🔧 Tools Used: </Text>
          <Text bold>{toolsUsed}</Text>
        </Text>
        <Text>
          <Text color={isProcessing ? 'yellow' : 'green'}>
            {isProcessing ? '⚡ PROCESSING' : '✅ READY'}
          </Text>
        </Text>
      </Box>
    </Box>
  );
};