#!/usr/bin/env node

import React, { useState, useEffect } from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { spawn } from 'child_process';
import { SimpleLogger } from './simple-logger.mjs';

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




// TypeScriptのtigerモジュールを動的にロード
const runTigerChat = async (userInput, skipConfirmation = false) => {
  // ユーザー入力をログに記録
  logger.log('user', userInput);

  return new Promise((resolve) => {
    const child = spawn('npx', ['ts-node', '--project', 'tsconfig.node.json', '--transpile-only', '-e', `
      const { tigerChat } = require('./src/tiger');
      const { Logger } = require('./src/logger');
      const logger = new Logger();
      
      tigerChat('${userInput.replace(/'/g, "\\'")}', logger, ${skipConfirmation})
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
  const [messages, setMessages] = useState([]);
  const [showLogo, setShowLogo] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toolLogs, setToolLogs] = useState([]);
  const [currentLogPath, setCurrentLogPath] = useState(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [selectedOption, setSelectedOption] = useState(0);
  const [config, setConfig] = useState(null);
  const [contextUsage, setContextUsage] = useState({ used: 0, total: 128000 }); // デフォルト値
  const { exit } = useApp();

  // ロガーの初期化とロゴ表示
  useEffect(() => {
    setCurrentLogPath(logger.getLogFilePath());

    // 設定を読み込む（TypeScriptモジュールを動的にロード）
    const loadConfigAsync = async () => {
      try {
        const configModule = await new Promise((resolve) => {
          const child = spawn('npx', ['ts-node', '--project', 'tsconfig.node.json', '--transpile-only', '-e', `
            const { loadConfig } = require('./src/config');
            const config = loadConfig();
            console.log(JSON.stringify(config));
          `], { cwd: process.cwd() });

          let output = '';
          child.stdout.on('data', (data) => {
            output += data.toString();
          });

          child.on('close', () => {
            try {
              resolve(JSON.parse(output));
            } catch {
              // エラーの場合はデフォルト設定を使用
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

        // コンテキストサイズを設定
        if (configModule && configModule.contextSize) {
          setContextUsage(prev => ({ ...prev, total: configModule.contextSize }));
        }
      } catch {
        // エラーの場合はデフォルト設定
        const defaultConfig = {
          model: 'llama3.2:3b',
          timeout: 60000,
          maxIterations: 10,
          contextSize: 128000
        };
        setConfig(defaultConfig);
        setContextUsage(prev => ({ ...prev, total: defaultConfig.contextSize }));
      }
    };

    loadConfigAsync();

    // VERSIONファイルからコミットハッシュを取得
    const getCommitHash = () => {
      try {
        const fs = require('fs');
        const path = require('path');
        const versionPath = path.join(__dirname, 'VERSION');
        const hash = fs.readFileSync(versionPath, 'utf-8').trim();
        return hash || 'unknown';
      } catch {
        return 'dev';
      }
    };

    // ロゴを表示してからメッセージを追加
    setTimeout(() => {
      setShowLogo(false);
      const commitHash = getCommitHash();
      setMessages([
        { role: 'system', content: 'Tips for getting started:' },
        { role: 'system', content: '• Ask questions, edit files, or run commands' },
        { role: 'system', content: '• Be specific for the best results' },
        { role: 'system', content: '• Type /help for more information' },
        { role: 'system', content: '' },
        { role: 'system', content: `Version ${commitHash} • /quit to exit` }
      ]);
    }, 2000);

    return () => {
      logger.close();
    };
  }, []);

  const processUserInput = async (userInput, skipConfirmation = false) => {
    setIsProcessing(true);
    setToolLogs([]);

    // コンテキスト使用量を計算（簡易的な推定）
    const messageCount = messages.length;
    const avgCharsPerMessage = 100;
    const estimatedTokens = Math.floor((messageCount * avgCharsPerMessage + userInput.length) / 4);
    setContextUsage(prev => ({ ...prev, used: estimatedTokens }));

    try {
      const result = await runTigerChat(userInput, skipConfirmation);

      // ログを表示
      if (result.logs) {
        for (const log of result.logs) {
          setToolLogs(prev => [...prev, log]);
          // ツールログも記録
          logger.log(log.type, log.message);

          // メッセージの種類によって表示速度を調整
          let delay = 150; // デフォルト遅延
          if (log.type === 'info') {
            delay = 100; // info メッセージは早く
          } else if (log.type === 'tool' || log.type === 'exec') {
            delay = 200; // ツール実行は少し遅く
          } else if (log.type === 'success' || log.type === 'error') {
            delay = 250; // 結果表示は少し長め
          }

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // 確認が必要な場合
      if (result.requiresConfirmation) {
        setPendingConfirmation(result.requiresConfirmation);
      }

      // レスポンスを追加
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.response
      }]);
      // アシスタントの応答をログに記録
      logger.log('assistant', result.response);

      // コンテキスト使用量を更新
      if (result.contextInfo) {
        setContextUsage(prev => ({
          ...prev,
          used: Math.min(prev.used + result.contextInfo.tokensUsed, prev.total)
        }));
      }
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
      if (pendingConfirmation && key.escape) {
        // ESCで確認をキャンセル
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Tool execution cancelled.'
        }]);
        setPendingConfirmation(null);
        setSelectedOption(0);
        return;
      }
      exit();
      return;
    }

    // 確認メニューの操作
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
        if (selectedOption === 0) {
          // Yes - 実行
          const lastUserMessage = messages.filter(m => m.role === 'user').pop();
          if (lastUserMessage) {
            processUserInput(lastUserMessage.content, true);
          }
          setPendingConfirmation(null);
          setSelectedOption(0);
        } else if (selectedOption === 1) {
          // Yes, and don't ask again (将来の実装用)
          const lastUserMessage = messages.filter(m => m.role === 'user').pop();
          if (lastUserMessage) {
            processUserInput(lastUserMessage.content, true);
          }
          setPendingConfirmation(null);
          setSelectedOption(0);
        } else if (selectedOption === 2) {
          // No
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Tool execution cancelled. What would you like me to do instead?'
          }]);
          setPendingConfirmation(null);
          setSelectedOption(0);
        }
        return;
      }
      if ((input >= '1' && input <= '3')) {
        // 数字キーでの選択
        const option = parseInt(input) - 1;
        setSelectedOption(option);
        // 自動的に選択を確定
        setTimeout(() => {
          if (option === 0 || option === 1) {
            // 元のユーザーリクエストを再送信（確認をスキップ）
            const lastUserMessage = messages.filter(m => m.role === 'user').pop();
            if (lastUserMessage) {
              processUserInput(lastUserMessage.content, true);
            }
            setPendingConfirmation(null);
            setSelectedOption(0);
          } else if (option === 2) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: 'Tool execution cancelled. What would you like me to do instead?'
            }]);
            setPendingConfirmation(null);
            setSelectedOption(0);
          }
        }, 100);
        return;
      }
      return;
    }

    if (key.return) {
      if (inputValue.trim()) {
        const userMessage = inputValue.trim();

        // /quitコマンドのチェック
        if (userMessage.toLowerCase() === '/quit') {
          exit();
          return;
        }

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

  // ロゴ表示中
  if (showLogo) {
    return React.createElement(Box, {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%'
    },
    React.createElement(Box, { flexDirection: 'column', alignItems: 'center' },
      // グラデーションロゴ
      React.createElement(Box, { flexDirection: 'column' },
        TIGER_ASCII_LINES.map((line, lineIndex) => {
          // 枠線と空白行はグレーで表示
          if (lineIndex === 0 || lineIndex === 1 || lineIndex === 8 || lineIndex === 9) {
            return React.createElement(Text, {
              key: lineIndex,
              color: 'gray',
              bold: true
            }, line);
          }

          // TIGERの文字が含まれる行（2-7行目）
          if (lineIndex >= 2 && lineIndex <= 7) {
            return React.createElement(Box, { key: lineIndex },
              // 各文字を個別に色付け
              React.createElement(Text, { color: 'gray', bold: true }, line.substring(0, 3)), // "│  "
              React.createElement(Text, { color: 'yellow', bold: true }, line.substring(3, 12)), // T
              React.createElement(Text, { color: 'yellowBright', bold: true }, line.substring(12, 16)), // 間
              React.createElement(Text, { color: 'yellow', bold: true }, line.substring(16, 26)), // I & G
              React.createElement(Text, { color: 'yellowBright', bold: true }, line.substring(26, 37)), // 間 & E
              React.createElement(Text, { color: 'yellow', bold: true }, line.substring(37, 45)), // R
              React.createElement(Text, { color: 'gray', bold: true }, line.substring(45)) // " │"
            );
          }

          return React.createElement(Text, {
            key: lineIndex,
            color: 'gray',
            bold: true
          }, line);
        })
      ),
      React.createElement(Box, { marginTop: 3 },
        React.createElement(Spinner, { type: 'bouncingBar' }),
        React.createElement(Text, { color: 'gray', dimColor: true }, ' ')
      )
    )
    );
  }

  return React.createElement(Box, { flexDirection: 'column', padding: 1 },
    // ヘッダー（虎柄風のボーダー）
    React.createElement(Box, { borderStyle: 'double', borderColor: 'yellow', flexDirection: 'column', padding: 1 },
      React.createElement(Box, { justifyContent: 'center' },
        React.createElement(Text, { bold: true, color: 'yellow' }, '🐯 TIGER CLI AGENT 🐯')
      ),
      React.createElement(Box, { justifyContent: 'center' },
        React.createElement(Text, { color: 'gray' }, 'Powered by Ollama + Mastra')
      ),
      // モデルとコンテキスト情報
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
          `${contextUsage.used.toLocaleString()}/${contextUsage.total.toLocaleString()} `
          ),
          React.createElement(Text, { color: 'gray' },
            `(${Math.round(contextUsage.used / contextUsage.total * 100)}%)`
          )
        )
      )
    ),

    // メッセージ履歴
    React.createElement(Box, { flexDirection: 'column', marginTop: 1, minHeight: 10 },
      messages.slice(-6).map((msg, index) =>
        React.createElement(Box, { key: index, marginBottom: 1 },
          React.createElement(Text, {
            color: msg.role === 'user' ? 'green' : msg.role === 'system' ? 'gray' : 'cyan',
            wrap: 'wrap'
          },
          msg.role === 'user' ? '🐯 You: ' : msg.role === 'system' ? '🐯 ' : '🐯 Tiger: ',
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
                log.type === 'error' ? 'red' : 'green',
          dimColor: log.type === 'info' // info メッセージは少し薄く
        }, log.message)
      )
    )
    ),

    // 確認ダイアログまたは入力フィールド
    pendingConfirmation ?
      React.createElement(Box, { borderStyle: 'double', borderColor: 'cyan', padding: 1, marginTop: 1, flexDirection: 'column' },
        React.createElement(Box, { marginBottom: 1 },
          React.createElement(Text, { bold: true, color: 'cyan' }, `🐯 ${pendingConfirmation.tool.toUpperCase()}`)
        ),
        React.createElement(Box, { marginBottom: 1 },
          React.createElement(Text, { color: 'white' },
            `Tiger wants to execute ${pendingConfirmation.tool} with:`
          )
        ),
        React.createElement(Box, { marginBottom: 1, paddingLeft: 2 },
          React.createElement(Text, { color: 'gray' },
            JSON.stringify(pendingConfirmation.args, null, 2).split('\n').map((line, i) =>
              i === 0 ? line : '  ' + line
            ).join('\n')
          )
        ),
        React.createElement(Box, { marginTop: 1 },
          React.createElement(Text, { bold: true }, 'Do you want to allow this action?')
        ),
        React.createElement(Box, { flexDirection: 'column', marginTop: 1 },
          React.createElement(Text, { color: selectedOption === 0 ? 'green' : 'gray' },
            `${selectedOption === 0 ? '❯' : ' '} 1. Yes`
          ),
          React.createElement(Text, { color: selectedOption === 1 ? 'yellow' : 'gray' },
            `${selectedOption === 1 ? '❯' : ' '} 2. Yes, and don't ask again for ${pendingConfirmation.tool}`
          ),
          React.createElement(Text, { color: selectedOption === 2 ? 'red' : 'gray' },
            `${selectedOption === 2 ? '❯' : ' '} 3. No, and tell Tiger what to do differently (esc)`
          )
        )
      ) :
      React.createElement(Box, { borderStyle: 'bold', borderColor: 'yellow', padding: 1, marginTop: 1 },
        React.createElement(Text, { color: isProcessing ? 'yellow' : 'green' },
          isProcessing ? '🐯 Tiger is thinking...' : `> ${inputValue}█`
        )
      ),

    // ヘルプテキスト
    React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
      React.createElement(Text, { dimColor: true }, 'Commands: "List files", "Read <filename>", "Run <command>"'),
      React.createElement(Text, { dimColor: true }, 'Type /quit or press ESC/Ctrl+C to exit'),
      currentLogPath && React.createElement(Text, { dimColor: true }, `Log file: ${currentLogPath}`)
    )
  );
};

render(React.createElement(TigerCLI));