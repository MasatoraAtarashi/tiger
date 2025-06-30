/**
 * File System Tools Integration Tests
 * Tests for ls, read_file, write_file tools
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import { TestRig, outputContains, toolWasCalled } from './test-helper.js';

test('ls tool lists directory contents', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create test files
  rig.createFile('file1.txt', 'Content 1');
  rig.createFile('file2.txt', 'Content 2');
  rig.mkdir('subdir');
  rig.createFile('subdir/file3.txt', 'Content 3');
  
  // Run ls command
  const output = rig.run('List the files in the current directory');
  
  // Verify ls tool was called
  assert.ok(toolWasCalled(output, 'ls'), 'ls tool should be called');
  
  // Verify files are listed
  assert.ok(outputContains(output, 'file1.txt'), 'Should list file1.txt');
  assert.ok(outputContains(output, 'file2.txt'), 'Should list file2.txt');
  assert.ok(outputContains(output, 'subdir'), 'Should list subdir');
  
  rig.cleanup();
});

test('read_file tool reads file content', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create a test file
  const testContent = 'Hello, Tiger CLI!\nThis is a test file.';
  rig.createFile('test.txt', testContent);
  
  // Run read command
  const output = rig.run('Read the contents of test.txt');
  
  // Verify read_file tool was called
  assert.ok(toolWasCalled(output, 'read_file'), 'read_file tool should be called');
  
  // Verify content is shown
  assert.ok(outputContains(output, 'Hello, Tiger CLI'), 'Should contain file content');
  assert.ok(outputContains(output, 'This is a test file'), 'Should contain second line');
  
  rig.cleanup();
});

test('write_file tool creates new file', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Run write command
  const newContent = 'This file was created by Tiger CLI';
  const output = rig.run(`Create a file called output.txt with the content: "${newContent}"`);
  
  // Verify write_file tool was called
  assert.ok(toolWasCalled(output, 'write_file'), 'write_file tool should be called');
  
  // Verify file was created
  assert.ok(rig.fileExists('output.txt'), 'output.txt should be created');
  
  // Verify file content
  const content = rig.readFile('output.txt');
  assert.ok(content.includes(newContent), 'File should contain the specified content');
  
  rig.cleanup();
});

test('write_file tool overwrites existing file', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create initial file
  rig.createFile('existing.txt', 'Original content');
  
  // Run write command to overwrite
  const newContent = 'Updated content';
  const output = rig.run(`Write "${newContent}" to existing.txt`);
  
  // Verify write_file tool was called
  assert.ok(toolWasCalled(output, 'write_file'), 'write_file tool should be called');
  
  // Verify file content was updated
  const content = rig.readFile('existing.txt');
  assert.ok(content.includes(newContent), 'File should contain updated content');
  assert.ok(!content.includes('Original content'), 'Original content should be replaced');
  
  rig.cleanup();
});

test('file operations in subdirectories', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create subdirectory structure
  rig.mkdir('src');
  rig.mkdir('src/components');
  
  // Test creating file in subdirectory
  const output1 = rig.run('Create a file src/components/Button.tsx with content "export const Button = () => {}"');
  assert.ok(toolWasCalled(output1, 'write_file'), 'write_file tool should be called');
  assert.ok(rig.fileExists('src/components/Button.tsx'), 'File should be created in subdirectory');
  
  // Test reading file from subdirectory
  const output2 = rig.run('Read src/components/Button.tsx');
  assert.ok(toolWasCalled(output2, 'read_file'), 'read_file tool should be called');
  assert.ok(outputContains(output2, 'Button'), 'Should read file from subdirectory');
  
  // Test listing subdirectory
  const output3 = rig.run('List files in src/components');
  assert.ok(toolWasCalled(output3, 'ls'), 'ls tool should be called');
  assert.ok(outputContains(output3, 'Button.tsx'), 'Should list file in subdirectory');
  
  rig.cleanup();
});