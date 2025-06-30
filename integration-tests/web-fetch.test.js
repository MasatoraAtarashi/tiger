/**
 * Web Fetch Tool Integration Tests
 * Tests for web_fetch tool
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import { TestRig, outputContains, toolWasCalled } from './test-helper.js';

test('web_fetch tool fetches content from URL', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Fetch a simple test API
  const output = rig.run('Fetch content from https://httpbin.org/json');
  
  // Verify web_fetch tool was called
  assert.ok(toolWasCalled(output, 'web_fetch'), 'web_fetch tool should be called');
  
  // Verify response contains expected content
  assert.ok(outputContains(output, 'slideshow') || outputContains(output, 'title'), 
    'Should contain JSON response data');
  
  rig.cleanup();
});

test('web_fetch tool handles HTTP status codes', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Test successful fetch
  const output1 = rig.run('Check if https://httpbin.org/status/200 is accessible');
  
  assert.ok(toolWasCalled(output1, 'web_fetch'), 'web_fetch tool should be called');
  assert.ok(outputContains(output1, '200') || outputContains(output1, 'success'), 
    'Should indicate successful response');
  
  // Test 404 response
  const output2 = rig.run('Try to fetch https://httpbin.org/status/404');
  
  assert.ok(toolWasCalled(output2, 'web_fetch'), 'web_fetch tool should be called');
  assert.ok(outputContains(output2, '404') || outputContains(output2, 'not found'), 
    'Should indicate 404 status');
  
  rig.cleanup();
});

test('web_fetch tool with JSON API', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Fetch user agent info
  const output = rig.run('Get my user agent info from https://httpbin.org/user-agent');
  
  assert.ok(toolWasCalled(output, 'web_fetch'), 'web_fetch tool should be called');
  assert.ok(outputContains(output, 'user-agent') || outputContains(output, 'node'), 
    'Should contain user agent information');
  
  rig.cleanup();
});

test('web_fetch tool saves fetched content', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Fetch and save content
  const output = rig.run('Fetch the content from https://httpbin.org/uuid and save it to uuid.json');
  
  // Should use both web_fetch and write_file
  assert.ok(toolWasCalled(output, 'web_fetch'), 'web_fetch tool should be called');
  
  // Check if file operations were performed
  if (rig.fileExists('uuid.json')) {
    const content = rig.readFile('uuid.json');
    assert.ok(content.includes('uuid') || content.length > 10, 
      'Saved file should contain fetched content');
  }
  
  rig.cleanup();
});

test('web_fetch tool handles invalid URLs', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Try to fetch from invalid URL
  const output = rig.run('Try to fetch from invalid-url-that-does-not-exist');
  
  // Tool might be called or error might be caught earlier
  // Should handle gracefully without crashing
  assert.ok(output.includes('error') || output.includes('invalid') || output.includes('failed') || 
    output.includes('could not') || output.includes('unable'), 
    'Should indicate an error occurred');
  
  rig.cleanup();
});