#!/usr/bin/env node
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import pty from 'node-pty';

class InteractiveRenderingTest {
  constructor() {
    this.logFile = 'test-interactive.log';
  }

  async runInteractiveTiger(input, duration = 8000) {
    return new Promise((resolve) => {
      const frames = [];
      const startTime = Date.now();
      
      console.log('🚀 Starting Tiger in interactive mode...');
      
      // Use pseudo-terminal to simulate real terminal
      const tiger = pty.spawn('node', ['dist/cli.js', '--no-logo'], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: process.env
      });

      let fullOutput = '';

      // Capture output
      tiger.onData((data) => {
        const timestamp = Date.now();
        fullOutput += data;
        
        frames.push({
          time: timestamp,
          relativeTime: timestamp - startTime,
          content: data,
          length: data.length,
        });
      });

      // Send input after initial rendering
      setTimeout(() => {
        console.log(`📝 Sending input: "${input}"`);
        tiger.write(input + '\r');
      }, 3000);

      // Stop after duration
      setTimeout(() => {
        console.log('⏹️  Stopping capture...');
        tiger.write('/exit\r');
        
        setTimeout(() => {
          tiger.kill();
          
          // Save detailed log
          const log = frames.map((f, i) => 
            `=== Frame ${i + 1} at ${f.relativeTime}ms (size: ${f.length} bytes) ===\n${f.content}`
          ).join('\n');
          writeFileSync(this.logFile, log);
          
          resolve({
            frames,
            fullOutput,
            totalDuration: Date.now() - startTime,
          });
        }, 500);
      }, duration);
    });
  }

  analyzeInitialRendering(frames) {
    console.log('\n🔍 INITIAL RENDERING ANALYSIS (First 2 seconds):');
    
    const initialFrames = frames.filter(f => f.relativeTime < 2000);
    console.log(`Frames in first 2 seconds: ${initialFrames.length}`);
    
    // Count specific patterns
    const patterns = {
      'TIGER CONSOLE header': /🐯 TIGER CONSOLE v1\.0 🐯/g,
      'Clear screen sequences': /\x1b\[2J|\x1b\[H|\x1bc/g,
      'Cursor movements': /\x1b\[\d+[ABCD]/g,
      'Line erasures': /\x1b\[2K|\x1b\[1A/g,
    };
    
    for (const [name, pattern] of Object.entries(patterns)) {
      const count = initialFrames.reduce((sum, f) => {
        const matches = f.content.match(pattern);
        return sum + (matches ? matches.length : 0);
      }, 0);
      
      if (count > 0) {
        console.log(`   ${name}: ${count} occurrences`);
      }
    }
    
    // Check for repeated full renders
    const fullRenders = initialFrames.filter(f => 
      f.content.includes('TIGER CONSOLE') && f.content.length > 500
    );
    
    if (fullRenders.length > 1) {
      console.log(`❌ PROBLEM: Full screen rendered ${fullRenders.length} times in initial phase`);
      return true;
    }
    
    if (initialFrames.length > 50) {
      console.log(`❌ PROBLEM: Too many frames (${initialFrames.length}) in first 2 seconds`);
      return true;
    }
    
    return false;
  }

  async run() {
    console.log('🧪 Tiger Interactive Mode Test');
    console.log('=' * 60);
    
    try {
      const result = await this.runInteractiveTiger(
        'Create a file named test.txt with content hello world'
      );
      
      console.log(`\n📊 Capture Summary:`);
      console.log(`Total frames: ${result.frames.length}`);
      console.log(`Total duration: ${result.totalDuration}ms`);
      console.log(`Average frame size: ${Math.round(result.fullOutput.length / result.frames.length)} bytes`);
      
      const hasRenderingIssue = this.analyzeInitialRendering(result.frames);
      
      console.log('\n' + '=' * 60);
      console.log('📊 RESULTS:');
      console.log(`Initial rendering issues: ${hasRenderingIssue ? '❌ YES' : '✅ NO'}`);
      console.log(`\n💾 Detailed log saved to: ${this.logFile}`);
      
      process.exit(hasRenderingIssue ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Test failed with error:', error);
      process.exit(1);
    }
  }
}

// Check if node-pty is available
try {
  await import('node-pty');
  const test = new InteractiveRenderingTest();
  test.run().catch(console.error);
} catch (error) {
  console.error('❌ node-pty is required for interactive testing');
  console.error('Run: npm install node-pty');
  process.exit(1);
}