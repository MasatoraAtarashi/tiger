#!/usr/bin/env node

import { tigerChat } from './dist/tiger.js';
import { Logger } from './dist/logger.js';

const logger = new Logger('test');

console.log('Testing Tiger with Fibonacci task...\n');

try {
  const result = await tigerChat('フィボナッチ数を計算するPythonプログラムを作って', logger, true);
  console.log('Response:', result.response);
  console.log('\nLogs:');
  result.logs.forEach(log => {
    console.log(`[${log.type}] ${log.message}`);
  });
} catch (error) {
  console.error('Error:', error);
}