import { Box, Text } from 'ink';
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  statusBar: React.ReactNode;
}

// Memoize static header component
const Header = React.memo(() => (
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
));
Header.displayName = 'Header';

// Memoize static footer component
const Footer = React.memo(() => (
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
));
Footer.displayName = 'Footer';

// Memoize the entire Layout component
export const Layout = React.memo<LayoutProps>(({ children, statusBar }) => {
  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Header />

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
      <Footer />
    </Box>
  );
});
Layout.displayName = 'Layout';