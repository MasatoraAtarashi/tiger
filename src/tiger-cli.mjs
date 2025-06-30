import React, { useState, useEffect } from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { spawn } from 'child_process';
import { SimpleLogger } from './simple-logger.mjs';

// ロガーインスタンスを作成
const logger = new SimpleLogger();

// TypeScriptのtigerモジュールを動的にロード
const runTigerChat = async (userInput) => {
  // ユーザー入力をログに記録
  logger.log('user', userInput);
  
  return new Promise((resolve) => {
    const child = spawn('npx', ['ts-node', '--transpile-only', '-e', `
      const { tigerChat } = require('./src/tiger');
      const { Logger } = require('./src/logger');
      const logger = new Logger();
      
      tigerChat('${userInput.replace(/'/g, "\\'")}', logger)
        .then((result) => {
          console.log(JSON.stringify(result));
          logger.close();
        })
        .catch((error) => {
          console.error(JSON.stringify({ error: error.message || error.toString() }));
          logger.close();
        });
    `], { cwd: process.cwd() });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      logger.log('error', `Process stderr: ${data.toString()}`);
    });
    
    child.on('close', (code) => {
      try {
        if (output.trim()) {
          const parsedOutput = JSON.parse(output);
          if (parsedOutput.error) {
            logger.log('error', `Child process error: ${parsedOutput.error}`);
            resolve({
              response: parsedOutput.error,
              logs: [{ type: 'error', message: parsedOutput.error }]
            });
          } else {
            resolve(parsedOutput);
          }
        } else {
          logger.log('error', `No output from child process, exit code: ${code}`);
          resolve({
            response: 'Error processing request',
            logs: [{ type: 'error', message: 'No output from process' }]
          });
        }
      } catch (error) {
        logger.log('error', `Failed to parse output: ${error.message}`, { output });
        resolve({
          response: 'Error processing request',
          logs: [{ type: 'error', message: error.toString() }]
        });
      }
    });
  });
};

const TigerCLI = () => {
  const [messages, setMessages] = useState([
    { role: 'system', content: '🐯 Welcome to Tiger - Your CLI Coding Agent!' },
    { role: 'system', content: 'I can help you with file operations, shell commands, and more.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toolLogs, setToolLogs] = useState([]);
  const [currentLogPath, setCurrentLogPath] = useState(null);
  const { exit } = useApp();
  
  // ロガーの初期化
  useEffect(() => {
    setCurrentLogPath(logger.getLogFilePath());
    setMessages(prev => [...prev, {
      role: 'system',
      content: `📝 Session log: ${logger.getLogFilePath()}`
    }]);
    
    return () => {
      logger.close();
    };
  }, []);

  const processUserInput = async (userInput) => {
    setIsProcessing(true);
    setToolLogs([]);
    
    try {
      const result = await runTigerChat(userInput);
      
      // ログを表示
      if (result.logs) {
        for (const log of result.logs) {
          setToolLogs(prev => [...prev, log]);
          // ツールログも記録
          logger.log(log.type, log.message);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // レスポンスを追加
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.response 
      }]);
      // アシスタントの応答をログに記録
      logger.log('assistant', result.response);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message}` 
      }]);
      // エラーをログに記録
      logger.log('error', error.message);
    }
    
    setIsProcessing(false);
  };

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    if (key.return) {
      if (inputValue.trim()) {
        const userMessage = inputValue.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        processUserInput(userMessage);
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
      React.createElement(Text, { bold: true, color: 'cyan' }, '🐯 Tiger CLI Agent'),
      React.createElement(Text, { color: 'gray' }, 'Powered by Ollama + Mastra')
    ),
    
    // メッセージ履歴
    React.createElement(Box, { flexDirection: 'column', marginTop: 1, minHeight: 10 },
      messages.slice(-6).map((msg, index) => 
        React.createElement(Box, { key: index, marginBottom: 1 },
          React.createElement(Text, { 
            color: msg.role === 'user' ? 'green' : msg.role === 'system' ? 'gray' : 'cyan',
            wrap: 'wrap'
          },
            msg.role === 'user' ? '👤 You: ' : msg.role === 'system' ? '💻 ' : '🐯 Tiger: ',
            msg.content
          )
        )
      )
    ),
    
    // ツールログ表示
    isProcessing && toolLogs.length > 0 && React.createElement(Box, { 
      borderStyle: 'classic', 
      borderColor: 'yellow', 
      padding: 1, 
      marginTop: 1,
      flexDirection: 'column'
    },
      React.createElement(Box, { marginBottom: toolLogs.length > 0 ? 1 : 0 },
        React.createElement(Spinner, { type: 'dots' }),
        React.createElement(Text, { color: 'yellow' }, ' Processing...')
      ),
      toolLogs.map((log, index) => 
        React.createElement(Box, { key: index },
          React.createElement(Text, { 
            color: log.type === 'info' ? 'blue' : 
                   log.type === 'tool' ? 'magenta' :
                   log.type === 'exec' ? 'yellow' : 
                   log.type === 'error' ? 'red' : 'green'
          }, log.message)
        )
      )
    ),
    
    // 入力フィールド
    React.createElement(Box, { borderStyle: 'single', borderColor: 'green', padding: 1, marginTop: 1 },
      React.createElement(Text, { color: 'green' },
        isProcessing ? '⏳ Tiger is thinking...' : `> ${inputValue}█`
      )
    ),
    
    // ヘルプテキスト
    React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
      React.createElement(Text, { dimColor: true }, 'Commands: "List files", "Read <filename>", "Run <command>"'),
      React.createElement(Text, { dimColor: true }, 'Press ESC or Ctrl+C to exit'),
      currentLogPath && React.createElement(Text, { dimColor: true }, `Log file: ${currentLogPath}`)
    )
  );
};

render(React.createElement(TigerCLI));