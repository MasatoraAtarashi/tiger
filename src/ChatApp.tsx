import { Box, Static, Text, useApp, useInput, useStdin, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ConfirmDialog } from './components/ConfirmDialog.js';
import { DebugInfo } from './components/DebugInfo.js';
import { FallbackInput } from './components/FallbackInput.js';
import { InputArea } from './components/InputArea.js';
import { StatusBar } from './components/StatusBar.js';
import { TaskStatus } from './components/TaskStatus.js';
import { useChat } from './hooks/useChat.js';
// import { useTerminalSize } from './hooks/useTerminalSize.js';

export const ChatApp: React.FC = () => {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const { write } = useStdout();
  const [fallbackInput, setFallbackInput] = useState('');
  const [staticKey] = useState(0);
  const [hasCleared, setHasCleared] = useState(false);
  
  const { 
    session, 
    sendMessage, 
    isConnected, 
    debugInfo, 
    taskManager,
    pendingConfirmation,
    handleConfirmation
  } = useChat();
  // 後で使用するため一時的にコメントアウト
  // const { columns: terminalWidth, rows: terminalHeight } = useTerminalSize();
  
  const handleSubmit = useCallback((message: string): void => {
    if (message.toLowerCase() === '/exit' || message.toLowerCase() === '/quit') {
      exit();
      return;
    }
    void sendMessage(message);
  }, [exit, sendMessage]);

  // Only use useInput if raw mode is supported
  useInput((input, key) => {
    if (isRawModeSupported && key.ctrl && input === 'c') {
      exit();
    }
  });

  // Clear screen once on mount
  useEffect(() => {
    if (!hasCleared && isRawModeSupported) {
      write('\x1B[2J\x1B[3J\x1B[H');
      setHasCleared(true);
    }
  }, [hasCleared, isRawModeSupported, write]);

  useEffect(() => {
    // Ctrl+C または Ctrl+D で終了
    const handleExit = (): void => {
      exit();
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

    // Non-interactive mode: read from stdin
    if (!isRawModeSupported) {
      let buffer = '';
      
      const handleData = (data: Buffer) => {
        const text = data.toString();
        buffer += text;
        
        if (text.includes('\n')) {
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              setFallbackInput(line);
              handleSubmit(line);
            }
          }
        }
      };
      
      process.stdin.on('data', handleData);
      
      return () => {
        process.stdin.off('data', handleData);
        process.removeListener('SIGINT', handleExit);
        process.removeListener('SIGTERM', handleExit);
      };
    }

    return () => {
      process.removeListener('SIGINT', handleExit);
      process.removeListener('SIGTERM', handleExit);
    };
  }, [exit, isRawModeSupported, handleSubmit]);

  // ツール使用回数をカウント
  const toolsUsedCount = useMemo(() => 
    session.messages.filter((msg) => 
      msg.content.includes('<tool_use>') || msg.content.includes('<tool_result>')
    ).length,
    [session.messages]
  );

  // コンテキスト長の計算（概算）
  const contextLength = useMemo(() => 
    session.messages.reduce((total, msg) => {
      return total + Math.ceil(msg.content.length / 4); // 4文字を1トークンとして概算
    }, 0),
    [session.messages]
  );

  // 現在のモデル名を取得
  const currentModel = debugInfo?.model || 'gemma3:4b';

  // StatusBarコンポーネントをメモ化
  const statusBar = useMemo(() => (
    <StatusBar 
      isProcessing={session.isProcessing}
      messageCount={session.messages.length}
      toolsUsed={toolsUsedCount}
      currentModel={currentModel}
      contextLength={contextLength}
    />
  ), [session.isProcessing, session.messages.length, toolsUsedCount, currentModel, contextLength]);

  // Separate completed messages from streaming message
  const completedMessages = session.messages.filter(msg => msg.id !== 'streaming');
  const streamingMessage = session.messages.find(msg => msg.id === 'streaming');

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Static header */}
      <Box borderStyle="single" borderColor="cyan" paddingX={1} width="100%">
        <Box flexGrow={1} justifyContent="center">
          <Text bold color="cyan">🐯 TIGER CONSOLE v1.0 🐯</Text>
        </Box>
      </Box>

      {/* Dynamic status - outside of Static */}
      {!session.isProcessing && (
        <Box marginY={1} paddingX={1}>
          <Text dimColor>
            {isConnected ? '⚡ Type your message or use /exit to quit' : '🔄 Connecting to Ollama...'}
          </Text>
        </Box>
      )}

      {/* Task status - outside of Static */}
      {taskManager.tasks.length > 0 && (
        <Box paddingX={1}>
          <TaskStatus tasks={taskManager.tasks} currentAction={taskManager.currentAction} />
        </Box>
      )}

      {/* Messages container with scroll */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {/* Static messages - only completed ones */}
        <Static key={staticKey} items={completedMessages}>
          {(message) => (
            <Box key={message.id} flexDirection="column" marginBottom={1} paddingX={1}>
              <Box>
                <Text bold color={message.role === 'user' ? 'cyan' : 'green'}>
                  {message.role === 'user' ? 'You' : 'Tiger'}:
                </Text>
              </Box>
              <Box marginLeft={2}>
                <Text>{message.content}</Text>
              </Box>
            </Box>
          )}
        </Static>

        {/* Streaming message - outside of Static */}
        {streamingMessage && (
          <Box flexDirection="column" marginBottom={1} paddingX={1}>
            <Box>
              <Text bold color="green">Tiger:</Text>
            </Box>
            <Box marginLeft={2}>
              <Text>{streamingMessage.content}</Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* Dynamic input area - this is NOT in Static */}
      <Box paddingX={1} marginTop={1}>
        {pendingConfirmation ? (
          <ConfirmDialog
            message={pendingConfirmation.message}
            onConfirm={() => handleConfirmation(true)}
            onCancel={() => handleConfirmation(false)}
          />
        ) : session.isProcessing ? (
          <Box>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            <Text color="yellow"> Tiger is hunting for answers...</Text>
          </Box>
        ) : isRawModeSupported ? (
          <InputArea onSubmit={handleSubmit} isProcessing={session.isProcessing} />
        ) : (
          <FallbackInput value={fallbackInput} isProcessing={session.isProcessing} />
        )}
      </Box>

      {/* Status bar */}
      <Box borderStyle="single" borderColor="green" paddingX={1} width="100%" marginTop={1}>
        {statusBar}
      </Box>

      {/* Footer */}
      <Box borderStyle="single" borderColor="gray" paddingX={1} width="100%" justifyContent="space-between">
        <Text dimColor>[TAB] Complete</Text>
        <Text dimColor>[/help] Commands</Text>
        <Text dimColor>[CTRL+C] Exit</Text>
      </Box>

      {debugInfo && (
        <Box marginTop={1}>
          <DebugInfo info={debugInfo} />
        </Box>
      )}
    </Box>
  );
};
