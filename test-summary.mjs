#!/usr/bin/env node

import { tigerChat } from './dist/tiger.js';
import { Logger } from './dist/logger.js';

const logger = new Logger('test');

console.log('Testing Tiger with README summary task...\n');

try {
  const result = await tigerChat('README.mdの内容を要約したsummary.mdを作って', logger, true);
  console.log('Response:', result.response);
  console.log('\nLogs:');
  result.logs.forEach(log => {
    console.log(`[${log.type}] ${log.message}`);
  });
  
  // Check if summary.md was created
  console.log('\nChecking if summary.md exists...');
  const fs = await import('fs/promises');
  try {
    const content = await fs.readFile('summary.md', 'utf-8');
    console.log('summary.md content:', content.substring(0, 200) + '...');
  } catch (err) {
    console.log('summary.md not found');
  }
} catch (error) {
  console.error('Error:', error);
}