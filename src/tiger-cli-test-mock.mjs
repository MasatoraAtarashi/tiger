#!/usr/bin/env node

/**
 * Test version of Tiger CLI that uses mock instead of Ollama
 */

import { spawn } from 'child_process';
import { SimpleLogger } from './simple-logger.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ロガーインスタンスを作成
const logger = new SimpleLogger();

// Get command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: tiger-cli-test-mock "your prompt here"');
  process.exit(1);
}

const userInput = args.join(' ');

// TypeScriptのtigerモジュールを実行（モック版を使用）
const runTigerChat = async (userInput) => {
  // ユーザー入力をログに記録
  logger.log('user', userInput);

  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['ts-node', '--transpile-only', '-e', `
      const { tigerChat } = require('${projectRoot}/src/tiger-mock');
      const { Logger } = require('${projectRoot}/src/logger');
      const logger = new Logger();
      
      tigerChat('${userInput.replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}', logger, true)
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
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      logger.log('error', `Process stderr: ${data.toString()}`);
    });

    child.on('close', (code) => {
      try {
        if (output.trim()) {
          const parsedOutput = JSON.parse(output);
          if (parsedOutput.error) {
            logger.log('error', `Child process error: ${parsedOutput.error}`);
            console.error(`Error: ${parsedOutput.error}`);
            reject(new Error(parsedOutput.error));
          } else {
            resolve(parsedOutput);
          }
        } else {
          logger.log('error', `No output from child process, exit code: ${code}`);
          if (errorOutput.trim()) {
            console.error(`Error: ${errorOutput}`);
          }
          reject(new Error('No output from process'));
        }
      } catch (error) {
        logger.log('error', `Failed to parse output: ${error.message}`, { output });
        console.error(`Parse error: ${error.message}`);
        if (output) {
          console.error(`Raw output: ${output}`);
        }
        reject(error);
      }
    });
  });
};

// Main execution
(async () => {
  try {
    console.log(`Processing: "${userInput}"`);

    const result = await runTigerChat(userInput);

    // Display logs
    if (result.logs) {
      console.log('\n--- Execution Log ---');
      for (const log of result.logs) {
        const prefix = log.type === 'error' ? '[ERROR]' :
          log.type === 'info' ? '[INFO]' :
            log.type === 'tool' ? '[TOOL]' :
              log.type === 'exec' ? '[EXEC]' :
                log.type === 'success' ? '[SUCCESS]' : '[LOG]';
        console.log(`${prefix} ${log.message}`);
        logger.log(log.type, log.message);
      }
    }

    // Display response
    console.log('\n--- Response ---');
    console.log(result.response);
    logger.log('assistant', result.response);

    logger.close();
    process.exit(0);
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    logger.log('error', `Fatal error: ${error.message}`);
    logger.close();
    process.exit(1);
  }
})();