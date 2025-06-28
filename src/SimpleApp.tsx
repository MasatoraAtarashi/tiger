import { useApp } from 'ink';
import React, { useEffect } from 'react';

import { useChat } from './hooks/useChat.js';

// Simple non-rendering app for testing/piping
export const SimpleApp: React.FC = () => {
  const { exit } = useApp();
  const { sendMessage, session } = useChat();
  
  // Print messages to stdout (only complete messages, not streaming)
  useEffect(() => {
    const lastMessage = session.messages[session.messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.id !== 'streaming') {
      // Clean output - remove escape sequences
      // eslint-disable-next-line no-control-regex
      const cleanContent = lastMessage.content.replace(/\x1b\[[0-9;]*[mGKH]/g, '');
      console.log(`\nTiger: ${cleanContent}\n`);
    }
  }, [session.messages]);

  useEffect(() => {
    // Read from stdin
    let buffer = '';
    
    const handleData = (data: Buffer) => {
      const text = data.toString();
      buffer += text;
      
      if (text.includes('\n')) {
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            if (trimmed === '/exit' || trimmed === '/quit') {
              exit();
            } else {
              console.log(`> ${trimmed}`);
              void sendMessage(trimmed);
            }
          }
        }
      }
    };
    
    process.stdin.on('data', handleData);
    
    return () => {
      process.stdin.off('data', handleData);
    };
  }, [exit, sendMessage]);

  return null;
};