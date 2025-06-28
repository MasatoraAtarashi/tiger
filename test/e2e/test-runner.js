#!/usr/bin/env node
import { spawn } from 'child_process';
import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

class E2ETestRunner {
  constructor() {
    this.results = [];
    this.currentTest = null;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async runTest(name, fn) {
    this.log(`\n▶ Running: ${name}`, 'blue');
    this.currentTest = { name, passed: false, errors: [] };

    try {
      await fn();
      this.currentTest.passed = true;
      this.log(`✓ ${name}`, 'green');
    } catch (error) {
      this.currentTest.errors.push(error.message);
      this.log(`✗ ${name}: ${error.message}`, 'red');
    } finally {
      this.results.push(this.currentTest);
    }
  }

  async runTigerWithInput(input, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const output = [];
      const errors = [];
      let processExited = false;

      const tiger = spawn('node', ['dist/cli.js', '--no-logo'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Collect output
      tiger.stdout.on('data', (data) => {
        const text = data.toString();
        output.push(text);
      });

      tiger.stderr.on('data', (data) => {
        errors.push(data.toString());
      });

      tiger.on('exit', (code) => {
        processExited = true;
        if (code !== 0) {
          reject(new Error(`Tiger exited with code ${code}`));
        }
      });

      // Send input after a short delay
      setTimeout(() => {
        tiger.stdin.write(input + '\n');
      }, 1000);

      // Wait for output or timeout
      setTimeout(() => {
        if (!processExited) {
          tiger.kill();
          resolve({
            output: output.join(''),
            errors: errors.join(''),
            killed: true,
          });
        } else {
          resolve({
            output: output.join(''),
            errors: errors.join(''),
            killed: false,
          });
        }
      }, timeout);
    });
  }

  async testToolExecution() {
    await this.runTest('Tool execution - write_file', async () => {
      const testFile = 'test-output.txt';
      const testContent = 'Hello from E2E test';

      // Clean up if exists
      if (existsSync(testFile)) {
        await unlink(testFile);
      }

      // Run tiger with write_file command
      const result = await this.runTigerWithInput(
        `Create a file named ${testFile} with content: ${testContent}`
      );

      // Check if tool_use appears in output
      if (!result.output.includes('<tool_use>') && !result.output.includes('tool_use')) {
        throw new Error('No tool_use found in output. Tool was not called.');
      }

      // Check if file was created
      if (!existsSync(testFile)) {
        throw new Error(`File ${testFile} was not created. Tool execution failed.`);
      }

      // Check file content
      const content = await readFile(testFile, 'utf-8');
      if (!content.includes(testContent)) {
        throw new Error(`File content mismatch. Expected: ${testContent}, Got: ${content}`);
      }

      // Clean up
      await unlink(testFile);
    });
  }

  async testDuplicateMessages() {
    await this.runTest('Duplicate messages detection', async () => {
      const result = await this.runTigerWithInput('Hello, can you help me?', 5000);
      
      // Split output into lines
      const lines = result.output.split('\n').filter(line => line.trim());
      
      // Check for duplicate consecutive lines
      const duplicates = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === lines[i - 1] && lines[i].length > 10) {
          duplicates.push(lines[i]);
        }
      }

      if (duplicates.length > 0) {
        throw new Error(`Found duplicate messages: ${duplicates.slice(0, 3).join(', ')}`);
      }
    });
  }

  async testInputEcho() {
    await this.runTest('Input echo on screen update', async () => {
      const result = await this.runTigerWithInput('test input echo', 3000);
      
      // Count how many times the input appears
      const inputOccurrences = (result.output.match(/test input echo/g) || []).length;
      
      if (inputOccurrences > 2) {
        throw new Error(`Input echoed ${inputOccurrences} times (expected <= 2)`);
      }
    });
  }

  async testToolRegistration() {
    await this.runTest('Tool registration check', async () => {
      const result = await this.runTigerWithInput('/exit', 3000);
      
      // Check if tools were registered (from our debug logs)
      const toolsRegistered = [
        'write_file',
        'read_file',
        'edit_file',
        'run_command',
        'list_directory',
      ];

      const missingTools = [];
      for (const tool of toolsRegistered) {
        if (!result.output.includes(`[Chat] Registered tool: ${tool}`)) {
          missingTools.push(tool);
        }
      }

      if (missingTools.length > 0) {
        throw new Error(`Tools not registered: ${missingTools.join(', ')}`);
      }
    });
  }

  async testLLMResponse() {
    await this.runTest('LLM response parsing', async () => {
      const result = await this.runTigerWithInput('Create a file test.py', 8000);
      
      // Check if LLM response was received
      if (!result.output.includes('[Chat] LLM Response:')) {
        throw new Error('No LLM response detected');
      }

      // Check if tool calls were parsed
      if (!result.output.includes('[Chat] Parsed tool calls:')) {
        throw new Error('Tool parsing did not occur');
      }

      // Check for tool execution attempt
      if (result.output.includes('[Chat] Tool not found:')) {
        const match = result.output.match(/\[Chat\] Available tools: \[(.*?)\]/);
        if (match) {
          throw new Error(`Tool not found. Available tools: ${match[1]}`);
        } else {
          throw new Error('Tool not found and available tools list is empty');
        }
      }
    });
  }

  printSummary() {
    this.log('\n' + '='.repeat(50), 'blue');
    this.log('E2E Test Summary', 'blue');
    this.log('='.repeat(50), 'blue');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    this.log(`\nTotal: ${this.results.length}`);
    this.log(`Passed: ${passed}`, 'green');
    this.log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');

    if (failed > 0) {
      this.log('\nFailed Tests:', 'red');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          this.log(`  - ${r.name}`, 'red');
          r.errors.forEach(e => this.log(`    ${e}`, 'yellow'));
        });
    }

    return failed === 0;
  }

  async run() {
    this.log('Starting Tiger E2E Tests', 'blue');
    this.log('='.repeat(50), 'blue');

    // Run all tests
    await this.testToolRegistration();
    await this.testDuplicateMessages();
    await this.testInputEcho();
    await this.testLLMResponse();
    await this.testToolExecution();

    // Print summary
    const success = this.printSummary();
    process.exit(success ? 0 : 1);
  }
}

// Run tests
const runner = new E2ETestRunner();
runner.run().catch(console.error);