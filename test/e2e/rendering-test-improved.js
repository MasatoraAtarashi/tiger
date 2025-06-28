#!/usr/bin/env node
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

class ImprovedRenderingTest {
  constructor() {
    this.logFile = 'test-detailed.log';
  }

  async runTigerAndCapture(input, duration = 8000) {
    return new Promise((resolve) => {
      const frames = [];
      const startTime = Date.now();
      
      console.log('🚀 Starting Tiger process...');
      const tiger = spawn('node', ['dist/cli.js', '--no-logo'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '0' }
      });

      let fullOutput = '';
      let errorOutput = '';

      // Capture stdout
      tiger.stdout.on('data', (data) => {
        const text = data.toString();
        const timestamp = Date.now();
        fullOutput += text;
        
        frames.push({
          time: timestamp,
          relativeTime: timestamp - startTime,
          content: text,
          length: text.length,
        });
      });

      // Capture stderr
      tiger.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Send input after initial rendering
      setTimeout(() => {
        console.log(`📝 Sending input: "${input}"`);
        tiger.stdin.write(input + '\n');
      }, 3000);

      // Collect data for specified duration
      setTimeout(() => {
        console.log('⏹️  Stopping capture...');
        tiger.stdin.write('/exit\n');
        setTimeout(() => {
          tiger.kill('SIGTERM');
          
          // Save detailed log
          const log = frames.map((f, i) => 
            `=== Frame ${i + 1} at ${f.relativeTime}ms (size: ${f.length} bytes) ===\n${f.content}`
          ).join('\n');
          writeFileSync(this.logFile, log);
          
          resolve({
            frames,
            fullOutput,
            errorOutput,
            totalDuration: Date.now() - startTime,
          });
        }, 500);
      }, duration);
    });
  }

  analyzeInitialRendering(frames) {
    console.log('\n🔍 INITIAL RENDERING ANALYSIS (First 3 seconds):');
    
    const initialFrames = frames.filter(f => f.relativeTime < 3000);
    console.log(`Frames in first 3 seconds: ${initialFrames.length}`);
    
    // Check for repeated "TIGER CONSOLE" header
    const tigerConsoleCount = initialFrames.filter(f => 
      f.content.includes('🐯 TIGER CONSOLE v1.0 🐯')
    ).length;
    
    if (tigerConsoleCount > 1) {
      console.log(`❌ PROBLEM: TIGER CONSOLE header appeared ${tigerConsoleCount} times`);
      return true;
    } else {
      console.log('✅ TIGER CONSOLE header appeared only once');
    }
    
    // Check for excessive frame updates in initial phase
    if (initialFrames.length > 20) {
      console.log(`❌ PROBLEM: Too many frames (${initialFrames.length}) in initial phase`);
      return true;
    }
    
    return false;
  }

  analyzeRenderingPatterns(frames) {
    console.log('\n🔍 RENDERING PATTERN ANALYSIS:');
    
    // Group frames by 500ms windows
    const windows = {};
    frames.forEach(frame => {
      const window = Math.floor(frame.relativeTime / 500);
      if (!windows[window]) windows[window] = [];
      windows[window].push(frame);
    });
    
    // Find windows with excessive updates
    const problematicWindows = Object.entries(windows)
      .filter(([_, frames]) => frames.length > 5)
      .map(([window, frames]) => ({
        timeRange: `${window * 500}-${(window + 1) * 500}ms`,
        count: frames.length
      }));
    
    if (problematicWindows.length > 0) {
      console.log('❌ PROBLEM: Excessive updates in time windows:');
      problematicWindows.forEach(({ timeRange, count }) => {
        console.log(`   - ${count} updates in ${timeRange}`);
      });
      return true;
    } else {
      console.log('✅ No excessive updates in any 500ms window');
    }
    
    // Check for escape sequences
    const escapeSequenceFrames = frames.filter(f => 
      f.content.includes('[2K') || f.content.includes('[1A')
    );
    
    if (escapeSequenceFrames.length > frames.length * 0.3) {
      console.log(`❌ PROBLEM: Too many escape sequences (${escapeSequenceFrames.length}/${frames.length} frames)`);
      return true;
    }
    
    return false;
  }

  checkToolExecution(result) {
    console.log('\n🔧 TOOL EXECUTION ANALYSIS:');
    
    const { fullOutput, frames } = result;
    
    // Check if LLM responded
    const hasLLMResponse = frames.some(f => 
      f.content.includes('Tiger:') || 
      f.content.includes('I will create') ||
      f.content.includes('I\'ll create')
    );
    
    if (!hasLLMResponse) {
      console.log('❌ PROBLEM: No LLM response detected');
      console.log('   Last frame content:', frames[frames.length - 1]?.content?.substring(0, 100));
      return true;
    } else {
      console.log('✅ LLM responded');
    }
    
    // Check for tool_use
    const hasToolUse = fullOutput.includes('<tool_use>') || 
                      fullOutput.includes('tool_use>') ||
                      fullOutput.includes('write_file');
    
    if (!hasToolUse) {
      console.log('❌ PROBLEM: No tool_use found in output');
      return true;
    } else {
      console.log('✅ Tool use detected');
    }
    
    // Check if file was created
    const fileCreated = existsSync('test.txt');
    if (!fileCreated) {
      console.log('❌ PROBLEM: File was NOT created');
      return true;
    } else {
      console.log('✅ File was created');
      unlinkSync('test.txt');
    }
    
    return false;
  }

  async run() {
    console.log('🧪 Tiger E2E Improved Test');
    console.log('=' * 60);
    
    try {
      const result = await this.runTigerAndCapture(
        'Create a file named test.txt with content hello world'
      );
      
      console.log(`\n📊 Capture Summary:`);
      console.log(`Total frames: ${result.frames.length}`);
      console.log(`Total duration: ${result.totalDuration}ms`);
      console.log(`Output size: ${result.fullOutput.length} bytes`);
      
      const initialRenderingIssue = this.analyzeInitialRendering(result.frames);
      const renderingPatternIssue = this.analyzeRenderingPatterns(result.frames);
      const toolExecutionIssue = this.checkToolExecution(result);
      
      console.log('\n' + '=' * 60);
      console.log('📊 FINAL RESULTS:');
      console.log(`Initial rendering issues: ${initialRenderingIssue ? '❌ YES' : '✅ NO'}`);
      console.log(`Rendering pattern issues: ${renderingPatternIssue ? '❌ YES' : '✅ NO'}`);
      console.log(`Tool execution issues: ${toolExecutionIssue ? '❌ YES' : '✅ NO'}`);
      
      if (result.errorOutput) {
        console.log('\n⚠️  Errors detected:');
        console.log(result.errorOutput);
      }
      
      console.log(`\n💾 Detailed log saved to: ${this.logFile}`);
      
      const hasAnyIssue = initialRenderingIssue || renderingPatternIssue || toolExecutionIssue;
      process.exit(hasAnyIssue ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Test failed with error:', error);
      process.exit(1);
    }
  }
}

const test = new ImprovedRenderingTest();
test.run().catch(console.error);