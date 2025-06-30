#!/usr/bin/env node

import React, { useState, useEffect, useRef } from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { spawn } from 'child_process';
import { SimpleLogger } from './simple-logger.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ロガーインスタンスを作成
const logger = new SimpleLogger();

// TIGERのASCIIアート（スタイリッシュ版）
const TIGER_ASCII_LINES = [
  '╭─────────────────────────────────────────────╮',
  '│                                             │',
  '│  ████████╗ ██╗  ██████╗  ███████╗ ██████╗  │',
  '│  ╚══██╔══╝ ██║ ██╔════╝  ██╔════╝ ██╔══██╗ │',
  '│     ██║    ██║ ██║  ███╗ █████╗   ██████╔╝ │',
  '│     ██║    ██║ ██║   ██║ ██╔══╝   ██╔══██╗ │',
  '│     ██║    ██║ ╚██████╔╝ ███████╗ ██║  ██║ │',
  '│     ╚═╝    ╚═╝  ╚═════╝  ╚══════╝ ╚═╝  ╚═╝ │',
  '│                                             │',
  '╰─────────────────────────────────────────────╯'
];

const TigerCLI = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [selectedOption, setSelectedOption] = useState(0);
  const [config, setConfig] = useState(null);
  const [contextUsage, setContextUsage] = useState({ used: 0, total: 128000 });
  const [toolProgress, setToolProgress] = useState({ current: '', count: 0 });
  const { exit } = useApp();

  // デバウンスされたツール進捗の更新
  const updateToolProgressDebounced = useRef(null);

  // 起動時の設定読み込み
  useEffect(() => {
    const loadConfigAsync = async () => {
      try {
        const configModule = await new Promise((resolve, reject) => {
          const configProcess = spawn('node', ['-e', `
            try {
              const config = require('./dist/config.js').loadConfig();
              console.log(JSON.stringify(config));
            } catch {
              console.log(JSON.stringify({
                model: 'llama3.2:3b',
                timeout: 60000,
                maxIterations: 10,
                contextSize: 128000
              }));
            }
          `], { cwd: process.cwd() });

          let output = '';
          configProcess.stdout.on('data', (data) => {
            output += data.toString();
          });

          configProcess.on('close', () => {
            try {
              resolve(JSON.parse(output));
            } catch {
              resolve({
                model: 'llama3.2:3b',
                timeout: 60000,
                maxIterations: 10,
                contextSize: 128000
              });
            }
          });
        });

        setConfig(configModule);
        setContextUsage(prev => ({ ...prev, total: configModule.contextSize || 128000 }));
      } catch (error) {
        setConfig({
          model: 'llama3.2:3b',
          timeout: 60000,
          maxIterations: 10,
          contextSize: 128000
        });
      }
    };

    loadConfigAsync();

    // ロゴを2秒後に非表示
    setTimeout(() => setShowLogo(false), 2000);
  }, []);

  // VERSIONファイルからコミットハッシュを取得
  const getCommitHash = () => {
    try {
      const fs = require('fs');
      const versionPath = path.join(__dirname, 'VERSION');
      const hash = fs.readFileSync(versionPath, 'utf-8').trim();
      return hash || 'unknown';
    } catch (error) {
      return 'dev';
    }
  };

  // Tiger実行（スムーズなプログレス表示）
  const processUserInput = async (userInput, skipConfirmation = false) => {
    setIsProcessing(true);
    setToolProgress({ current: '', count: 0 });

    logger.log('user', userInput);

    let accumulatedLogs = [];

    const tiger = spawn('node', [
      path.join(__dirname, '..', 'dist', 'tiger-cli-wrapper.js'),
      userInput,
      skipConfirmation ? 'true' : 'false'
    ]);

    tiger.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('LOG:')) {
          const log = JSON.parse(line.substring(4));

          // ツールの実行状況をデバウンスして更新
          if (log.type === 'tool' || log.type === 'exec') {
            if (updateToolProgressDebounced.current) {
              clearTimeout(updateToolProgressDebounced.current);
            }

            updateToolProgressDebounced.current = setTimeout(() => {
              setToolProgress(prev => ({
                current: log.message,
                count: prev.count + 1
              }));
            }, 100);
          }
        } else if (line.startsWith('RESPONSE:')) {
          const response = JSON.parse(line.substring(9));

          setIsProcessing(false);
          setToolProgress({ current: '', count: 0 });

          if (response.requiresConfirmation) {
            setPendingConfirmation(response.requiresConfirmation);
          }

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: response.response
          }]);

          logger.log('assistant', response.response);

          if (response.contextInfo) {
            setContextUsage(prev => ({
              ...prev,
              used: Math.min(prev.used + response.contextInfo.tokensUsed, prev.total)
            }));
          }
        }
      }
    });

    tiger.stderr.on('data', (data) => {
      const error = data.toString();
      setIsProcessing(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error}`
      }]);
      logger.log('error', error);
    });
  };

  // 入力処理
  useInput((input, key) => {
    if (key.escape || (key.ctrl && key.input === 'c')) {
      logger.close();
      exit();
    }

    // 確認ダイアログ表示中の処理
    if (pendingConfirmation) {
      if (key.upArrow) {
        setSelectedOption(prev => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedOption(prev => Math.min(2, prev + 1));
        return;
      }
      if (key.return) {
        if (selectedOption === 0 || selectedOption === 1) {
          const lastUserMessage = messages.filter(m => m.role === 'user').pop();
          if (lastUserMessage) {
            processUserInput(lastUserMessage.content, true);
          }
          setPendingConfirmation(null);
          setSelectedOption(0);
        } else if (selectedOption === 2) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Tool execution cancelled.'
          }]);
          setPendingConfirmation(null);
          setSelectedOption(0);
        }
        return;
      }
    }

    if (!pendingConfirmation && !isProcessing) {
      if (key.return && input.trim()) {
        if (input === '/quit') {
          logger.close();
          exit();
          return;
        }

        setMessages(prev => [...prev, { role: 'user', content: input }]);
        processUserInput(input);
        setInput('');
      } else if (key.backspace || key.delete) {
        setInput(prev => prev.slice(0, -1));
      } else if (!key.ctrl && !key.meta && input && typeof input === 'string') {
        setInput(prev => prev + input);
      }
    }
  });

  // ロゴレンダリング
  const renderLogo = () => {
    return React.createElement(Box, {
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: 2
    },
    TIGER_ASCII_LINES.map((line, lineIndex) => {
      if (lineIndex >= 2 && lineIndex <= 7) {
        return React.createElement(Box, { key: lineIndex },
          React.createElement(Text, { color: 'gray', bold: true }, line.substring(0, 3)),
          React.createElement(Text, { color: 'yellow', bold: true }, line.substring(3, 12)),
          React.createElement(Text, { color: 'yellowBright', bold: true }, line.substring(12, 16)),
          React.createElement(Text, { color: '#FFA500', bold: true }, line.substring(16, 24)),
          React.createElement(Text, { color: '#FF8C00', bold: true }, line.substring(24, 28)),
          React.createElement(Text, { color: '#FFA500', bold: true }, line.substring(28, 37)),
          React.createElement(Text, { color: 'yellowBright', bold: true }, line.substring(37, 41)),
          React.createElement(Text, { color: 'yellow', bold: true }, line.substring(41, 49)),
          React.createElement(Text, { color: 'gray', bold: true }, line.substring(49))
        );
      }
      return React.createElement(Text, { key: lineIndex, color: 'gray', bold: true }, line);
    })
    );
  };

  return React.createElement(Box, { flexDirection: 'column' },
    // ロゴ（起動時のみ）
    showLogo && messages.length === 0 && renderLogo(),

    // ヘッダー
    React.createElement(Box, {
      borderStyle: 'round',
      borderColor: 'yellow',
      paddingLeft: 1,
      paddingRight: 1,
      marginBottom: 1,
      flexDirection: 'column'
    },
    React.createElement(Box, { justifyContent: 'space-between' },
      React.createElement(Text, { bold: true, color: 'yellow' },
        `🐯 Tiger CLI v${getCommitHash()}`
      ),
      React.createElement(Text, { color: 'gray' },
        `Log: ${logger.getLogPath()}`
      )
    ),
    React.createElement(Box, { justifyContent: 'space-between', marginTop: 1 },
      React.createElement(Text, { color: 'cyan' },
        `Model: ${config ? config.model : 'loading...'}`
      ),
      React.createElement(Box, {},
        React.createElement(Text, { color: 'gray' }, 'Context: '),
        React.createElement(Text, {
          color: contextUsage.used / contextUsage.total > 0.8 ? 'red' :
            contextUsage.used / contextUsage.total > 0.6 ? 'yellow' : 'green'
        },
        `${Math.round(contextUsage.used / contextUsage.total * 100)}%`
        )
      )
    )
    ),

    // メッセージ履歴（最後の6件のみ表示）
    React.createElement(Box, { flexDirection: 'column', marginTop: 1, minHeight: 10 },
      messages.slice(-6).map((msg, index) =>
        React.createElement(Box, { key: index, marginBottom: 1 },
          React.createElement(Text, {
            color: msg.role === 'user' ? 'green' : 'cyan',
            wrap: 'wrap'
          },
          msg.role === 'user' ? '🐯 You: ' : '🐯 Tiger: ',
          msg.content
          )
        )
      )
    ),

    // スムーズなプログレス表示
    isProcessing && React.createElement(Box, {
      marginTop: 1,
      paddingLeft: 2
    },
    React.createElement(Text, { color: 'yellow' },
      React.createElement(Spinner, { type: 'dots' }),
      ` ${toolProgress.current || 'Processing...'}`,
      toolProgress.count > 0 && ` (${toolProgress.count} actions)`
    )
    ),

    // 確認ダイアログ
    pendingConfirmation && React.createElement(Box, {
      borderStyle: 'double',
      borderColor: 'yellow',
      padding: 1,
      marginTop: 1,
      flexDirection: 'column'
    },
    React.createElement(Text, { color: 'yellow', bold: true },
      '⚠️  Tool Confirmation Required'
    ),
    React.createElement(Text, { color: 'white' },
      `Tool: ${pendingConfirmation.tool}`
    ),
    React.createElement(Text, { color: 'gray' },
      `Args: ${JSON.stringify(pendingConfirmation.args, null, 2)}`
    ),
    React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
      ['✅ Yes, execute this tool', '✅ Yes, and don\'t ask again', '❌ No, cancel'].map((option, index) =>
        React.createElement(Text, {
          key: index,
          color: selectedOption === index ? 'green' : 'white',
          bold: selectedOption === index
        },
        selectedOption === index ? '▶ ' : '  ',
        option
        )
      )
    )
    ),

    // 入力欄
    React.createElement(Box, {
      borderStyle: 'round',
      borderColor: 'green',
      paddingLeft: 1,
      paddingRight: 1,
      marginTop: 1
    },
    React.createElement(Text, { color: 'green' }, '> '),
    React.createElement(Text, { color: 'white' }, input),
    !isProcessing && React.createElement(Text, { color: 'gray' }, '█')
    ),

    // フッター
    React.createElement(Box, { marginTop: 1 },
      React.createElement(Text, { color: 'gray' },
        'Commands: /quit or ESC/Ctrl+C to exit'
      )
    )
  );
};

const app = render(React.createElement(TigerCLI));

// プロセス終了時の処理
process.on('SIGINT', () => {
  logger.close();
  app.unmount();
  process.exit();
});

process.on('SIGTERM', () => {
  logger.close();
  app.unmount();
  process.exit();
});