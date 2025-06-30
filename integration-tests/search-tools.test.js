/**
 * Search Tools Integration Tests
 * Tests for grep and glob tools
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import { TestRig, outputContains, toolWasCalled } from './test-helper.js';

test('grep tool searches for patterns in files', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create test files with searchable content
  rig.createFile('app.js', `
    function hello() {
      console.log('Hello, World!');
    }
    
    function goodbye() {
      console.log('Goodbye!');
    }
  `);
  
  rig.createFile('utils.js', `
    export function formatMessage(msg) {
      return \`Message: \${msg}\`;
    }
    
    export function logError(err) {
      console.error('Error:', err);
    }
  `);
  
  // Search for console statements
  const output = rig.run('Search for all console.log statements in the code');
  
  // Verify grep tool was called
  assert.ok(toolWasCalled(output, 'grep'), 'grep tool should be called');
  
  // Verify search results
  assert.ok(outputContains(output, 'app.js'), 'Should find matches in app.js');
  assert.ok(outputContains(output, 'Hello, World'), 'Should find Hello, World console.log');
  assert.ok(outputContains(output, 'Goodbye'), 'Should find Goodbye console.log');
  
  rig.cleanup();
});

test('grep tool searches with specific patterns', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create test files
  rig.createFile('config.json', JSON.stringify({
    apiKey: 'secret-key-123',
    endpoint: 'https://api.example.com',
    timeout: 5000
  }, null, 2));
  
  rig.createFile('settings.json', JSON.stringify({
    debug: true,
    apiKey: 'another-secret',
    port: 3000
  }, null, 2));
  
  // Search for apiKey
  const output = rig.run('Find all occurrences of apiKey in JSON files');
  
  assert.ok(toolWasCalled(output, 'grep'), 'grep tool should be called');
  assert.ok(outputContains(output, 'config.json'), 'Should find apiKey in config.json');
  assert.ok(outputContains(output, 'settings.json'), 'Should find apiKey in settings.json');
  
  rig.cleanup();
});

test('glob tool finds files by pattern', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create test file structure
  rig.createFile('index.js', '// Main file');
  rig.createFile('app.js', '// App file');
  rig.createFile('utils.js', '// Utils');
  rig.mkdir('src');
  rig.createFile('src/component.js', '// Component');
  rig.createFile('src/helper.js', '// Helper');
  rig.createFile('test.spec.js', '// Test file');
  rig.createFile('README.md', '# README');
  
  // Find all JavaScript files
  const output = rig.run('Find all JavaScript files in the project');
  
  // Verify glob tool was called
  assert.ok(toolWasCalled(output, 'glob'), 'glob tool should be called');
  
  // Verify results include JS files
  assert.ok(outputContains(output, 'index.js'), 'Should find index.js');
  assert.ok(outputContains(output, 'app.js'), 'Should find app.js');
  assert.ok(outputContains(output, 'component.js'), 'Should find src/component.js');
  
  // Should not include non-JS files
  assert.ok(!outputContains(output, 'README.md'), 'Should not include README.md');
  
  rig.cleanup();
});

test('glob tool with specific patterns', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create test file structure
  rig.mkdir('src');
  rig.mkdir('tests');
  rig.createFile('src/index.ts', '// TypeScript file');
  rig.createFile('src/app.tsx', '// React component');
  rig.createFile('src/utils.ts', '// Utils');
  rig.createFile('tests/app.test.ts', '// Test file');
  rig.createFile('tests/utils.test.ts', '// Test file');
  rig.createFile('package.json', '{}');
  
  // Find all TypeScript files in src
  const output = rig.run('Find all TypeScript files in the src directory');
  
  assert.ok(toolWasCalled(output, 'glob'), 'glob tool should be called');
  assert.ok(outputContains(output, 'index.ts'), 'Should find src/index.ts');
  assert.ok(outputContains(output, 'app.tsx'), 'Should find src/app.tsx');
  assert.ok(outputContains(output, 'utils.ts'), 'Should find src/utils.ts');
  
  // Should not include test files
  assert.ok(!outputContains(output, 'test.ts'), 'Should not include test files');
  
  rig.cleanup();
});

test('combined search operations', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create a more complex file structure
  rig.mkdir('src');
  rig.mkdir('src/components');
  rig.mkdir('src/utils');
  
  rig.createFile('src/components/Button.tsx', `
    import React from 'react';
    
    export const Button = ({ onClick, label }) => {
      return <button onClick={onClick}>{label}</button>;
    };
  `);
  
  rig.createFile('src/components/Input.tsx', `
    import React from 'react';
    
    export const Input = ({ value, onChange }) => {
      return <input value={value} onChange={onChange} />;
    };
  `);
  
  rig.createFile('src/utils/format.ts', `
    export function formatDate(date: Date): string {
      return date.toISOString();
    }
  `);
  
  // Complex search: Find all React components with onClick props
  const output = rig.run('Find all React component files that use onClick prop');
  
  // Should use both glob and grep
  assert.ok(toolWasCalled(output, 'glob') || toolWasCalled(output, 'grep'), 
    'Should use search tools');
  assert.ok(outputContains(output, 'Button.tsx'), 'Should find Button.tsx with onClick');
  
  rig.cleanup();
});