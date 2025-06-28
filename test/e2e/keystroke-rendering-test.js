#!/usr/bin/env node
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

class KeystrokeRenderingTest {
  constructor() {
    this.logFile = 'test-keystroke.log';
  }

  async runTigerWithKeystrokes() {
    return new Promise((resolve) => {
      const frames = [];
      const startTime = Date.now();
      let frameCount = 0;
      
      console.log('🚀 Starting Tiger process...');
      
      // Force TTY mode by using script command
      const tiger = spawn('script', [
        '-q',
        '/dev/null',
        'node',
        'dist/cli.js',
        '--no-logo'
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let fullOutput = '';

      // Capture stdout
      tiger.stdout.on('data', (data) => {
        const text = data.toString();
        const timestamp = Date.now();
        fullOutput += text;
        frameCount++;
        
        // Record frame info
        frames.push({
          frameNumber: frameCount,
          time: timestamp,
          relativeTime: timestamp - startTime,
          content: text,
          length: text.length,
          hasTigerHeader: text.includes('🐯 TIGER CONSOLE v1.0 🐯'),
          hasFullScreen: text.includes('┌──────────') && text.includes('└──────────'),
          hasClearScreen: text.includes('\x1b[2J') || text.includes('\x1b[H'),
        });
      });

      // Wait for initial render
      setTimeout(() => {
        console.log('📝 Starting keystroke simulation...');
        
        // Type "hello" one character at a time
        const characters = ['h', 'e', 'l', 'l', 'o'];
        let index = 0;
        
        const typeInterval = setInterval(() => {
          if (index < characters.length) {
            console.log(`  Typing: "${characters[index]}"`);
            tiger.stdin.write(characters[index]);
            index++;
          } else {
            clearInterval(typeInterval);
            
            // Wait a bit then exit
            setTimeout(() => {
              console.log('⏹️  Stopping capture...');
              tiger.stdin.write('\n/exit\n');
              
              setTimeout(() => {
                tiger.kill();
                
                // Save detailed log
                const log = frames.map(f => 
                  `=== Frame ${f.frameNumber} at ${f.relativeTime}ms ===\n` +
                  `Size: ${f.length} bytes\n` +
                  `Has TIGER header: ${f.hasTigerHeader}\n` +
                  `Has full screen: ${f.hasFullScreen}\n` +
                  `Has clear screen: ${f.hasClearScreen}\n` +
                  `Content preview: ${f.content.substring(0, 100).replace(/\n/g, '\\n')}...\n`
                ).join('\n');
                
                writeFileSync(this.logFile, log);
                
                resolve({
                  frames,
                  fullOutput,
                  totalFrames: frameCount,
                });
              }, 1000);
            }, 1000);
          }
        }, 500); // 500ms between keystrokes
      }, 2000);
    });
  }

  analyzeKeystrokeRendering(result) {
    console.log('\n🔍 KEYSTROKE RENDERING ANALYSIS:');
    
    const { frames } = result;
    
    // Find frames that occurred during typing (2s-5s window)
    const typingFrames = frames.filter(f => f.relativeTime >= 2000 && f.relativeTime <= 5000);
    console.log(`\nFrames during typing phase: ${typingFrames.length}`);
    
    // Count full screen renders during typing
    const fullScreenRenders = typingFrames.filter(f => f.hasFullScreen);
    console.log(`Full screen renders during typing: ${fullScreenRenders.length}`);
    
    // Count TIGER header appearances
    const headerAppearances = frames.filter(f => f.hasTigerHeader);
    console.log(`Total TIGER header appearances: ${headerAppearances.length}`);
    
    // Count clear screen sequences
    const clearScreens = frames.filter(f => f.hasClearScreen);
    console.log(`Clear screen operations: ${clearScreens.length}`);
    
    // Expected: 1 initial render + maybe 1 after connection
    // NOT expected: 5+ renders (one per keystroke)
    
    let hasIssue = false;
    
    if (fullScreenRenders.length >= 5) {
      console.log(`\n❌ PROBLEM: Full screen rendered ${fullScreenRenders.length} times during typing!`);
      console.log('   This means the entire UI is re-rendering on every keystroke.');
      hasIssue = true;
    }
    
    if (headerAppearances.length >= 5) {
      console.log(`\n❌ PROBLEM: TIGER header appeared ${headerAppearances.length} times!`);
      console.log('   The header should only appear once or twice, not on every keystroke.');
      hasIssue = true;
    }
    
    if (!hasIssue) {
      console.log('\n✅ No excessive re-rendering detected during typing');
    }
    
    // Show frame timeline
    console.log('\n📊 Frame Timeline:');
    typingFrames.forEach((f, i) => {
      const time = Math.round(f.relativeTime / 100) * 100; // Round to nearest 100ms
      const marker = f.hasFullScreen ? '█' : f.hasTigerHeader ? '▓' : '░';
      console.log(`  ${time}ms: ${marker} Frame ${f.frameNumber} (${f.length} bytes)`);
    });
    
    return hasIssue;
  }

  async run() {
    console.log('🧪 Tiger Keystroke Rendering Test');
    console.log('=' * 60);
    console.log('This test types "hello" one character at a time');
    console.log('and checks if the entire screen re-renders on each keystroke.\n');
    
    try {
      const result = await this.runTigerWithKeystrokes();
      
      console.log(`\n📊 Capture Summary:`);
      console.log(`Total frames: ${result.totalFrames}`);
      console.log(`Output size: ${result.fullOutput.length} bytes`);
      
      const hasRenderingIssue = this.analyzeKeystrokeRendering(result);
      
      console.log('\n' + '=' * 60);
      console.log('📊 TEST RESULT:');
      if (hasRenderingIssue) {
        console.log('❌ FAIL: Excessive re-rendering on keystrokes detected!');
      } else {
        console.log('✅ PASS: No excessive re-rendering detected');
      }
      
      console.log(`\n💾 Detailed log saved to: ${this.logFile}`);
      
      process.exit(hasRenderingIssue ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Test failed with error:', error);
      process.exit(1);
    }
  }
}

const test = new KeystrokeRenderingTest();
test.run().catch(console.error);