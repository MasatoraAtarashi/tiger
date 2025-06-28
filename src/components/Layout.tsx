import { Box, Text } from 'ink';
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  statusBar: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, statusBar }) => {
  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box 
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        width="100%"
      >
        <Box flexGrow={1} justifyContent="center">
          <Text bold color="cyan">
            🐯 TIGER CONSOLE v1.0 🐯
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
      <Box
        borderStyle="single"
        borderColor="green"
        paddingX={1}
        width="100%"
      >
        {statusBar}
      </Box>

      {/* Footer */}
      <Box 
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        width="100%"
        justifyContent="space-between"
      >
        <Text dimColor>
          [TAB] Complete
        </Text>
        <Text dimColor>
          [/help] Commands
        </Text>
        <Text dimColor>
          [CTRL+C] Exit
        </Text>
      </Box>
    </Box>
  );
};