#!/usr/bin/env node

import { tigerChat } from './dist/tiger.js';
import { Logger } from './dist/logger.js';

const logger = new Logger('test');

console.log('Testing Tiger with simple task...\n');

try {
  const result = await tigerChat('test.txtというファイルを作って、中に"Hello Tiger!"と書いて', logger, true);
  console.log('Response:', result.response);
  console.log('\nLogs:');
  result.logs.forEach(log => {
    console.log(`[${log.type}] ${log.message}`);
  });
  
  // Check if test.txt was created
  console.log('\nChecking if test.txt exists...');
  const fs = await import('fs/promises');
  try {
    const content = await fs.readFile('test.txt', 'utf-8');
    console.log('test.txt content:', content);
  } catch (err) {
    console.log('test.txt not found');
  }
} catch (error) {
  console.error('Error:', error);
}