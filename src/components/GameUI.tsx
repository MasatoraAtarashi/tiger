import { Box, Text } from 'ink';
import React from 'react';

interface GameUIProps {
  children: React.ReactNode;
  title?: string;
  statusBar?: React.ReactNode;
}

export const GameUI: React.FC<GameUIProps> = React.memo(({ children, title = 'TIGER CONSOLE', statusBar }) => {
  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box 
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        width="100%"
      >
        <Box flexGrow={1} justifyContent="center">
          <Text bold color="cyan">
            🐯 {title} 🐯
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

      {/* Footer - ショートカットヘルプ */}
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
});

// 開発ステータスバー
interface StatusBarProps {
  isProcessing: boolean;
  messageCount: number;
  toolsUsed: number;
  currentModel?: string;
  contextLength?: number;
}

export const StatusBar: React.FC<StatusBarProps> = React.memo(({ 
  isProcessing, 
  messageCount, 
  toolsUsed,
  currentModel = 'gemma3:4b',
  contextLength = 0
}) => {
  // コンテキスト使用率の計算（gemma3:4bの上限は8192トークン）
  const maxContext = 8192;
  const contextPercent = Math.min(100, Math.round((contextLength / maxContext) * 100));
  const contextBarLength = 20;
  const filledBars = Math.round((contextPercent / 100) * contextBarLength);
  
  return (
    <Box justifyContent="space-between" width="100%">
      <Box gap={2}>
        <Text>
          <Text color="cyan">🤖 Model: </Text>
          <Text bold>{currentModel}</Text>
        </Text>
        <Text>
          <Text color="yellow">📊 Context: </Text>
          <Text color={contextPercent > 80 ? 'red' : contextPercent > 60 ? 'yellow' : 'green'}>
            {'█'.repeat(filledBars)}
            <Text color="gray">{'░'.repeat(contextBarLength - filledBars)}</Text>
          </Text>
          <Text> {contextPercent}%</Text>
        </Text>
      </Box>
      <Box gap={2}>
        <Text>
          <Text color="blue">💬 Messages: </Text>
          <Text bold>{messageCount}</Text>
        </Text>
        <Text>
          <Text color="magenta">🔧 Tools: </Text>
          <Text bold>{toolsUsed}</Text>
        </Text>
        <Text>
          <Text color={isProcessing ? 'yellow' : 'green'}>
            {isProcessing ? '⚡ WORKING' : '✅ READY'}
          </Text>
        </Text>
      </Box>
    </Box>
  );
});