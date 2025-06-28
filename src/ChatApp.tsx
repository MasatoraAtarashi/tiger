import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import React, { useEffect, useMemo } from 'react';

import { DebugInfo } from './components/DebugInfo.js';
import { StatusBar } from './components/GameUI.js';
import { InputArea } from './components/InputArea.js';
import { Layout } from './components/Layout.js';
import { MessageList } from './components/MessageList.js';
import { useChat } from './hooks/useChat.js';

export const ChatApp: React.FC = () => {
  const { exit } = useApp();
  const { session, sendMessage, isConnected, debugInfo } = useChat();

  useEffect(() => {
    // Ctrl+C または Ctrl+D で終了
    const handleExit = (): void => {
      exit();
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

    return () => {
      process.removeListener('SIGINT', handleExit);
      process.removeListener('SIGTERM', handleExit);
    };
  }, [exit]);

  const handleSubmit = (message: string): void => {
    if (message.toLowerCase() === '/exit' || message.toLowerCase() === '/quit') {
      exit();
      return;
    }
    void sendMessage(message);
  };

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

  return (
    <Layout statusBar={statusBar}>
      {!session.isProcessing && (
        <Box marginBottom={1}>
          <Text dimColor>
            {isConnected ? '⚡ Type your message or use /exit to quit' : '🔄 Connecting to Ollama...'}
          </Text>
        </Box>
      )}

      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        <MessageList messages={session.messages} />
      </Box>

      <Box>
        {session.isProcessing ? (
          <Box>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            <Text color="yellow"> Tiger is hunting for answers...</Text>
          </Box>
        ) : (
          <InputArea onSubmit={handleSubmit} isProcessing={session.isProcessing} />
        )}
      </Box>

      {debugInfo && (
        <Box marginTop={1}>
          <DebugInfo info={debugInfo} />
        </Box>
      )}
    </Layout>
  );
};
