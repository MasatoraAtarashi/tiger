/**
 * Memory Tool Integration Tests
 * Tests for memory storage and retrieval
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import { TestRig, outputContains, toolWasCalled } from './test-helper.js';

test('memory tool stores and retrieves values', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Store a value
  const output1 = rig.run('Store the value "Tiger CLI rocks!" with the key "message" in memory');
  
  assert.ok(toolWasCalled(output1, 'memory'), 'memory tool should be called');
  assert.ok(outputContains(output1, 'success') || outputContains(output1, 'stored'), 
    'Should indicate successful storage');
  
  // Retrieve the value
  const output2 = rig.run('Get the value stored with key "message" from memory');
  
  assert.ok(toolWasCalled(output2, 'memory'), 'memory tool should be called');
  assert.ok(outputContains(output2, 'Tiger CLI rocks'), 'Should retrieve stored value');
  
  rig.cleanup();
});

test('memory tool handles different data types', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Store a number
  const output1 = rig.run('Store the number 42 with key "answer" in memory');
  assert.ok(toolWasCalled(output1, 'memory'), 'memory tool should be called');
  
  // Store an object/JSON
  const output2 = rig.run('Store a JSON object {"name": "Tiger", "version": "0.1.0"} with key "config" in memory');
  assert.ok(toolWasCalled(output2, 'memory'), 'memory tool should be called');
  
  // Retrieve and verify
  const output3 = rig.run('Get the value with key "answer" from memory');
  assert.ok(outputContains(output3, '42'), 'Should retrieve number');
  
  const output4 = rig.run('Get the value with key "config" from memory');
  assert.ok(outputContains(output4, 'Tiger') || outputContains(output4, 'version'), 
    'Should retrieve object data');
  
  rig.cleanup();
});

test('memory tool deletes values', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Store a value
  const output1 = rig.run('Store "temporary data" with key "temp" in memory');
  assert.ok(toolWasCalled(output1, 'memory'), 'memory tool should be called');
  
  // Delete the value
  const output2 = rig.run('Delete the value with key "temp" from memory');
  assert.ok(toolWasCalled(output2, 'memory'), 'memory tool should be called');
  assert.ok(outputContains(output2, 'success') || outputContains(output2, 'deleted'), 
    'Should indicate successful deletion');
  
  // Try to retrieve deleted value
  const output3 = rig.run('Try to get the value with key "temp" from memory');
  assert.ok(toolWasCalled(output3, 'memory'), 'memory tool should be called');
  assert.ok(outputContains(output3, 'undefined') || outputContains(output3, 'not found') || 
    outputContains(output3, 'null') || outputContains(output3, 'no value'), 
    'Should indicate value not found');
  
  rig.cleanup();
});

test('memory tool with workflow data', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Simulate a workflow that uses memory
  
  // Step 1: Read a file and store its content
  rig.createFile('data.txt', 'Important data: API_KEY=secret123');
  const output1 = rig.run('Read data.txt and store its content in memory with key "file_data"');
  
  // Should use both read_file and memory tools
  assert.ok(toolWasCalled(output1, 'read_file') || toolWasCalled(output1, 'memory'), 
    'Should use file and/or memory tools');
  
  // Step 2: Process the stored data
  const output2 = rig.run('Get the "file_data" from memory and extract the API_KEY value');
  
  assert.ok(outputContains(output2, 'secret123') || outputContains(output2, 'API_KEY'), 
    'Should work with stored data');
  
  rig.cleanup();
});

test('memory tool handles non-existent keys', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Try to get a non-existent key
  const output = rig.run('Get the value with key "nonexistent_key" from memory');
  
  assert.ok(toolWasCalled(output, 'memory'), 'memory tool should be called');
  assert.ok(outputContains(output, 'undefined') || outputContains(output, 'not found') || 
    outputContains(output, 'null') || outputContains(output, 'no') || 
    outputContains(output, 'does not exist'), 
    'Should handle non-existent key gracefully');
  
  rig.cleanup();
});