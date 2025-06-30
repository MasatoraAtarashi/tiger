#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('Testing Tiger CLI with "ls" command...\n');

try {
  const output = execSync('echo "ls" | node src/tiger-cli.mjs', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit']
  });
  
  console.log('Output:', output);
} catch (error) {
  console.error('Error:', error.message);
  if (error.stdout) console.log('Stdout:', error.stdout);
  if (error.stderr) console.log('Stderr:', error.stderr);
}