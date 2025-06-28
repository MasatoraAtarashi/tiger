import { Box, Text } from 'ink';
import React from 'react';

interface DebugInfoProps {
  info: {
    lastRequest?: {
      model: string;
      messageCount: number;
      temperature: number;
      timestamp: Date;
    };
    lastResponse?: {
      tokenCount?: number;
      duration?: number;
      toolCalls?: string[];
    };
    connectionStatus: 'connected' | 'disconnected' | 'connecting';
    provider: string;
    model: string;
  };
}

export const DebugInfo: React.FC<DebugInfoProps> = ({ info }) => {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" padding={1}>
      <Text bold color="gray">
        [DEBUG MODE]
      </Text>

      <Box marginTop={1}>
        <Text color="gray">Provider: </Text>
        <Text color="cyan">{info.provider}</Text>
        <Text color="gray"> | Model: </Text>
        <Text color="cyan">{info.model}</Text>
        <Text color="gray"> | Status: </Text>
        <Text color={info.connectionStatus === 'connected' ? 'green' : 'yellow'}>
          {info.connectionStatus}
        </Text>
      </Box>

      {info.lastRequest && (
        <Box marginTop={1} flexDirection="column">
          <Text color="gray">Last Request:</Text>
          <Box marginLeft={2}>
            <Text color="gray">
              Messages: {info.lastRequest.messageCount} | Temp: {info.lastRequest.temperature} |
              Time: {info.lastRequest.timestamp.toLocaleTimeString()}
            </Text>
          </Box>
        </Box>
      )}

      {info.lastResponse && (
        <Box marginTop={1} flexDirection="column">
          <Text color="gray">Last Response:</Text>
          <Box marginLeft={2}>
            <Text color="gray">
              {info.lastResponse.tokenCount && `Tokens: ${info.lastResponse.tokenCount} | `}
              {info.lastResponse.duration && `Duration: ${info.lastResponse.duration}ms`}
              {info.lastResponse.toolCalls &&
                info.lastResponse.toolCalls.length > 0 &&
                ` | Tools: ${info.lastResponse.toolCalls.join(', ')}`}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
