/**
 * Shell Tool Integration Tests
 * Tests for shell command execution
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import { TestRig, outputContains, toolWasCalled } from './test-helper.js';

test('shell tool executes simple commands', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create a test file
  rig.createFile('hello.txt', 'Hello from Tiger CLI!');
  
  // Run a simple echo command
  const output = rig.run('Run the command: echo "Testing Tiger CLI"');
  
  // Verify shell tool was called
  assert.ok(toolWasCalled(output, 'shell'), 'shell tool should be called');
  
  // Verify command output
  assert.ok(outputContains(output, 'Testing Tiger CLI'), 'Should show echo output');
  
  rig.cleanup();
});

test('shell tool handles file operations', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create initial file
  rig.createFile('input.txt', 'Line 1\nLine 2\nLine 3');
  
  // Run wc command to count lines
  const output = rig.run('Count the number of lines in input.txt using wc -l');
  
  assert.ok(toolWasCalled(output, 'shell'), 'shell tool should be called');
  assert.ok(outputContains(output, '3'), 'Should show 3 lines');
  
  rig.cleanup();
});

test('shell tool handles command errors gracefully', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Try to run a command on non-existent file
  const output = rig.run('Try to cat a file called nonexistent.txt');
  
  assert.ok(toolWasCalled(output, 'shell'), 'shell tool should be called');
  // Should handle the error gracefully without crashing
  assert.ok(output.includes('nonexistent') || output.includes('error') || output.includes('No such file'), 
    'Should mention the error');
  
  rig.cleanup();
});

test('shell tool with piped commands', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create test files
  rig.createFile('data.txt', 'apple\nbanana\napple\norange\napple\nbanana');
  
  // Run piped command
  const output = rig.run('Run this command: cat data.txt | sort | uniq -c');
  
  assert.ok(toolWasCalled(output, 'shell'), 'shell tool should be called');
  // Should show counts
  assert.ok(outputContains(output, 'apple'), 'Should show apple');
  assert.ok(outputContains(output, 'banana'), 'Should show banana');
  assert.ok(outputContains(output, 'orange'), 'Should show orange');
  
  rig.cleanup();
});

test('shell tool creates and modifies files', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Use shell to create a file
  const output1 = rig.run('Create a file using: echo "Created by shell" > shell-output.txt');
  
  assert.ok(toolWasCalled(output1, 'shell'), 'shell tool should be called');
  assert.ok(rig.fileExists('shell-output.txt'), 'File should be created');
  
  const content = rig.readFile('shell-output.txt');
  assert.ok(content.includes('Created by shell'), 'File should contain expected content');
  
  // Append to file
  const output2 = rig.run('Append to the file: echo "Second line" >> shell-output.txt');
  
  assert.ok(toolWasCalled(output2, 'shell'), 'shell tool should be called');
  
  const updatedContent = rig.readFile('shell-output.txt');
  assert.ok(updatedContent.includes('Created by shell'), 'Should still have first line');
  assert.ok(updatedContent.includes('Second line'), 'Should have appended line');
  
  rig.cleanup();
});

test('shell tool with environment info', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Get current directory
  const output1 = rig.run('Show the current working directory using pwd');
  
  assert.ok(toolWasCalled(output1, 'shell'), 'shell tool should be called');
  assert.ok(output1.includes(rig.testDir) || output1.includes('test-runs'), 
    'Should show test directory path');
  
  // List environment variable (cross-platform)
  const output2 = rig.run('Show the PATH environment variable');
  
  assert.ok(toolWasCalled(output2, 'shell'), 'shell tool should be called');
  // PATH should contain something
  assert.ok(output2.length > 50, 'Should show PATH content');
  
  rig.cleanup();
});