#!/usr/bin/env node
import { spawn } from 'child_process';

console.log('🧪 Simple Rendering Detection Test');
console.log('=================================\n');

// This test can't fully reproduce the TTY rendering issue,
// but it can detect some symptoms

const tiger = spawn('node', ['dist/cli.js', '--no-logo'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, FORCE_COLOR: '1' }
});

let outputBuffer = '';
let frameCount = 0;

tiger.stdout.on('data', (data) => {
  frameCount++;
  outputBuffer += data.toString();
});

tiger.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

// Send input after initial load
setTimeout(() => {
  console.log('Sending test input...');
  tiger.stdin.write('test\n');
  
  setTimeout(() => {
    tiger.stdin.write('/exit\n');
    
    setTimeout(() => {
      tiger.kill();
      
      // Analyze output
      console.log(`\nFrames captured: ${frameCount}`);
      console.log(`Total output size: ${outputBuffer.length} bytes`);
      
      // In non-TTY mode, we expect minimal frames
      // In TTY mode with the bug, there would be many more
      if (frameCount > 5) {
        console.log('\n⚠️  WARNING: High frame count detected');
        console.log('This might indicate rendering issues in TTY mode.');
        console.log('Run "npm run dev" manually to verify.');
      } else {
        console.log('\n✓ Frame count is reasonable for non-TTY mode');
      }
      
      // Check for the known issue marker
      if (outputBuffer.includes('Non-interactive mode')) {
        console.log('\n📝 Note: Test ran in non-interactive mode.');
        console.log('The full rendering issue can only be reproduced in a real terminal.');
        console.log('See test/e2e/verify-rendering-issue.md for manual testing instructions.');
      }
      
      process.exit(0);
    }, 500);
  }, 2000);
}, 2000);