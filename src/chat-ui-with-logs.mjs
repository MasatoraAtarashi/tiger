import React, { useState, useEffect } from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';

const ChatUIWithLogs = () => {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Welcome to Tiger CLI Agent!' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toolLogs, setToolLogs] = useState([]);
  const { exit } = useApp();

  // 模擬ツール実行ログ
  const simulateToolExecution = async (userInput) => {
    setIsProcessing(true);
    setToolLogs([]);
    
    // ステップ1: LLM推論
    setToolLogs(prev => [...prev, { type: 'info', message: '🤔 Thinking...' }]);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // ステップ2: ツール選択
    setToolLogs(prev => [...prev, { type: 'tool', message: '🔧 Selected tool: ls' }]);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // ステップ3: ツール実行
    setToolLogs(prev => [...prev, { type: 'exec', message: '⚡ Executing: ls -la' }]);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // ステップ4: 結果処理
    setToolLogs(prev => [...prev, { type: 'success', message: '✅ Tool executed successfully' }]);
    
    // レスポンスを追加
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `I executed the command for: "${userInput}". Here are the results...` 
    }]);
    
    setIsProcessing(false);
  };

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    if (key.return) {
      if (inputValue.trim()) {
        // ユーザーメッセージを追加
        setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
        
        // ツール実行をシミュレート
        simulateToolExecution(inputValue);
        
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
    // ヘッダー
    React.createElement(Box, { borderStyle: 'round', borderColor: 'cyan', flexDirection: 'column', padding: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, '🐯 Tiger CLI Agent')
    ),
    
    // メッセージ履歴
    React.createElement(Box, { flexDirection: 'column', marginTop: 1, height: 8 },
      messages.slice(-4).map((msg, index) => 
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
    
    // ツールログ表示エリア
    isProcessing && React.createElement(Box, { 
      borderStyle: 'classic', 
      borderColor: 'yellow', 
      padding: 1, 
      marginTop: 1,
      flexDirection: 'column'
    },
      React.createElement(Box, { marginBottom: 1 },
        React.createElement(Spinner, { type: 'dots' }),
        React.createElement(Text, { color: 'yellow' }, ' Processing...')
      ),
      toolLogs.map((log, index) => 
        React.createElement(Box, { key: index },
          React.createElement(Text, { 
            color: log.type === 'info' ? 'blue' : 
                   log.type === 'tool' ? 'magenta' :
                   log.type === 'exec' ? 'yellow' : 'green'
          }, log.message)
        )
      )
    ),
    
    // 入力フィールド
    React.createElement(Box, { borderStyle: 'single', borderColor: 'green', padding: 1, marginTop: 1 },
      React.createElement(Text, { color: 'green' },
        isProcessing ? '⏳ Processing...' : `> ${inputValue}█`
      )
    ),
    
    // ヘルプテキスト
    React.createElement(Box, { marginTop: 1 },
      React.createElement(Text, { dimColor: true }, 'Press ESC or Ctrl+C to exit')
    )
  );
};

render(React.createElement(ChatUIWithLogs));