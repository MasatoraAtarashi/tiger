#!/usr/bin/env node
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

// Test specifically for the two main issues:
// 1. Rendering problems (duplicate/flickering)
// 2. Tiger not executing tools (not creating files)

class RenderingAndToolTest {
  constructor() {
    this.logFile = 'test-output.log';
  }

  async runTigerAndCapture(input, duration = 5000) {
    return new Promise((resolve) => {
      const frames = [];
      let lastFrame = '';
      let frameCount = 0;
      
      const tiger = spawn('node', ['dist/cli.js', '--no-logo'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Capture each frame
      tiger.stdout.on('data', (data) => {
        const text = data.toString();
        frameCount++;
        
        // Save frame with timestamp
        frames.push({
          time: Date.now(),
          content: text,
          frameNumber: frameCount,
        });
        
        lastFrame = text;
        
        // Log to file for analysis
        writeFileSync(this.logFile, frames.map(f => 
          `=== Frame ${f.frameNumber} at ${f.time} ===\n${f.content}\n`
        ).join('\n'), { flag: 'w' });
      });

      // Send input after 2 seconds
      setTimeout(() => {
        console.log(`Sending input: "${input}"`);
        tiger.stdin.write(input + '\n');
      }, 2000);

      // Collect data for specified duration
      setTimeout(() => {
        tiger.stdin.write('/exit\n');
        setTimeout(() => {
          tiger.kill();
          resolve({
            frames,
            totalFrames: frameCount,
            lastFrame,
          });
        }, 1000);
      }, duration);
    });
  }

  analyzeRendering(frames) {
    console.log('\n🔍 RENDERING ANALYSIS:');
    console.log(`Total frames captured: ${frames.length}`);
    
    // Check for rapid updates (more than 10 frames per second)
    const timeWindows = {};
    frames.forEach(frame => {
      const second = Math.floor(frame.time / 1000);
      timeWindows[second] = (timeWindows[second] || 0) + 1;
    });
    
    const rapidUpdates = Object.entries(timeWindows)
      .filter(([_, count]) => count > 10)
      .map(([second, count]) => ({ second: new Date(second * 1000).toISOString(), count }));
    
    if (rapidUpdates.length > 0) {
      console.log('❌ PROBLEM: Rapid screen updates detected:');
      rapidUpdates.forEach(({ second, count }) => {
        console.log(`   - ${count} updates in one second at ${second}`);
      });
    } else {
      console.log('✅ No rapid screen updates detected');
    }
    
    // Check for duplicate consecutive frames
    let duplicates = 0;
    for (let i = 1; i < frames.length; i++) {
      if (frames[i].content === frames[i-1].content && frames[i].content.length > 50) {
        duplicates++;
      }
    }
    
    if (duplicates > 5) {
      console.log(`❌ PROBLEM: Found ${duplicates} duplicate consecutive frames`);
    } else {
      console.log('✅ Minimal duplicate frames');
    }
    
    return rapidUpdates.length > 0 || duplicates > 5;
  }

  checkToolExecution(frames) {
    console.log('\n🔧 TOOL EXECUTION ANALYSIS:');
    
    const lastFrameContent = frames[frames.length - 1]?.content || '';
    const allContent = frames.map(f => f.content).join('\n');
    
    // Check 1: Did LLM mention creating a file?
    const fileCreationMentions = [
      'create.*file',
      'write.*file',
      'creating.*test.txt',
      'I\'ll create',
      'I will create',
    ];
    
    const mentionedCreation = fileCreationMentions.some(pattern => 
      new RegExp(pattern, 'i').test(allContent)
    );
    
    console.log(mentionedCreation 
      ? '✅ LLM mentioned creating a file' 
      : '❌ PROBLEM: LLM did not mention creating a file'
    );
    
    // Check 2: Did tool_use appear?
    const hasToolUse = allContent.includes('<tool_use>') || allContent.includes('tool_use');
    console.log(hasToolUse 
      ? '✅ Found tool_use in output' 
      : '❌ PROBLEM: No tool_use found - LLM is not calling tools!'
    );
    
    // Check 3: Check our debug logs
    const hasLLMResponse = allContent.includes('[Chat] LLM Response:');
    const hasParsedTools = allContent.includes('[Chat] Parsed tool calls:');
    const hasToolExecution = allContent.includes('[Chat] Executing tool:');
    const hasToolNotFound = allContent.includes('[Chat] Tool not found:');
    
    console.log('\nDebug log analysis:');
    console.log(`  LLM Response logged: ${hasLLMResponse ? '✅' : '❌'}`);
    console.log(`  Tool parsing logged: ${hasParsedTools ? '✅' : '❌'}`);
    console.log(`  Tool execution logged: ${hasToolExecution ? '✅' : '❌'}`);
    console.log(`  Tool not found error: ${hasToolNotFound ? '❌ PROBLEM' : '✅'}`);
    
    // Check 4: Was the file actually created?
    const fileCreated = existsSync('test.txt');
    console.log(fileCreated 
      ? '✅ File was created successfully' 
      : '❌ PROBLEM: File was NOT created!'
    );
    
    // Clean up if file was created
    if (fileCreated) {
      unlinkSync('test.txt');
    }
    
    return !hasToolUse || !fileCreated;
  }

  async run() {
    console.log('🚀 Tiger E2E Problem Detection Test');
    console.log('=' * 50);
    console.log('Testing for:');
    console.log('1. Rendering issues (flickering/duplicates)');
    console.log('2. Tool execution (file creation)');
    console.log('=' * 50);
    
    console.log('\n📝 Sending command: "Create a file named test.txt with content hello world"');
    
    const result = await this.runTigerAndCapture(
      'Create a file named test.txt with content hello world',
      7000
    );
    
    const hasRenderingIssues = this.analyzeRendering(result.frames);
    const hasToolIssues = this.checkToolExecution(result.frames);
    
    console.log('\n' + '=' * 50);
    console.log('📊 SUMMARY:');
    console.log(`Rendering issues: ${hasRenderingIssues ? '❌ YES' : '✅ NO'}`);
    console.log(`Tool execution issues: ${hasToolIssues ? '❌ YES' : '✅ NO'}`);
    
    if (hasRenderingIssues || hasToolIssues) {
      console.log('\n💡 Debug info saved to:', this.logFile);
      console.log('Review the frame-by-frame output to understand the issue.');
    } else {
      // Clean up log file if no issues
      if (existsSync(this.logFile)) {
        unlinkSync(this.logFile);
      }
    }
    
    process.exit(hasRenderingIssues || hasToolIssues ? 1 : 0);
  }
}

const test = new RenderingAndToolTest();
test.run().catch(console.error);