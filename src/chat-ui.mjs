import React, { useState } from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';

const ChatUI = () => {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Welcome to Tiger CLI Agent!' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    if (key.return) {
      if (inputValue.trim()) {
        // ユーザーメッセージを追加
        setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
        setIsProcessing(true);

        // デモ用: 1秒後にレスポンスを追加
        global.setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Echo: ${inputValue}`
          }]);
          setIsProcessing(false);
        }, 1000);

        setInputValue('');
      }
      return;
    }

    if (key.backspace || key.delete) {
      setInputValue(prev => prev.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setInputValue(prev => prev + input);
    }
  });

  return React.createElement(Box, { flexDirection: 'column', padding: 1 },
    React.createElement(Box, { borderStyle: 'round', borderColor: 'cyan', flexDirection: 'column', padding: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, '🐯 Tiger CLI Agent')
    ),

    React.createElement(Box, { flexDirection: 'column', marginTop: 1, height: 10 },
      messages.slice(-5).map((msg, index) =>
        React.createElement(Box, { key: index, marginBottom: 1 },
          React.createElement(Text, {
            color: msg.role === 'user' ? 'green' : msg.role === 'system' ? 'gray' : 'cyan'
          },
          msg.role === 'user' ? '👤 ' : msg.role === 'system' ? '💻 ' : '🐯 ',
          msg.content
          )
        )
      )
    ),

    React.createElement(Box, { borderStyle: 'single', borderColor: 'green', padding: 1, marginTop: 1 },
      React.createElement(Text, { color: 'green' },
        isProcessing ? '🔄 Processing...' : `> ${inputValue}█`
      )
    ),

    React.createElement(Box, { marginTop: 1 },
      React.createElement(Text, { dimColor: true }, 'Press ESC or Ctrl+C to exit')
    )
  );
};

render(React.createElement(ChatUI));