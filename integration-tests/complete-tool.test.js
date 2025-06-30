/**
 * Complete Tool Integration Tests
 * Tests for task completion reporting
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import { TestRig, outputContains, toolWasCalled } from './test-helper.js';

test('complete tool reports task completion', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Complete a simple task
  const output = rig.run('Report that the task "Create README file" has been completed successfully');
  
  // Verify complete tool was called
  assert.ok(toolWasCalled(output, 'complete'), 'complete tool should be called');
  
  // Verify completion report
  assert.ok(outputContains(output, 'completed') || outputContains(output, 'success'), 
    'Should indicate successful completion');
  assert.ok(outputContains(output, 'README'), 'Should mention the task');
  
  rig.cleanup();
});

test('complete tool with detailed summary', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create some files to simulate work done
  rig.createFile('app.js', 'console.log("Hello");');
  rig.createFile('utils.js', 'export function helper() {}');
  
  // Report completion with details
  const output = rig.run(`Report task completion: "Refactor JavaScript files"
    Summary: Converted to ES6 modules and added helper functions
    Files modified: app.js, utils.js
    Result: Successful`);
  
  assert.ok(toolWasCalled(output, 'complete'), 'complete tool should be called');
  assert.ok(outputContains(output, 'refactor') || outputContains(output, 'JavaScript'), 
    'Should mention the task');
  assert.ok(outputContains(output, 'ES6') || outputContains(output, 'modules'), 
    'Should include summary details');
  
  rig.cleanup();
});

test('complete tool reports partial completion', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Report partial completion
  const output = rig.run(`Mark task as partially complete: "Implement authentication system"
    Summary: Completed login functionality but registration is pending
    Files modified: auth/login.js
    Result: Partial success`);
  
  assert.ok(toolWasCalled(output, 'complete'), 'complete tool should be called');
  assert.ok(outputContains(output, 'partial') || outputContains(output, 'pending'), 
    'Should indicate partial completion');
  assert.ok(outputContains(output, 'authentication') || outputContains(output, 'login'), 
    'Should mention the task details');
  
  rig.cleanup();
});

test('complete tool reports failure', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Report task failure
  const output = rig.run(`Report task failure: "Deploy to production"
    Summary: Deployment failed due to missing environment variables
    Commands executed: npm run build, npm run deploy
    Result: Failed`);
  
  assert.ok(toolWasCalled(output, 'complete'), 'complete tool should be called');
  assert.ok(outputContains(output, 'failed') || outputContains(output, 'failure'), 
    'Should indicate failure');
  assert.ok(outputContains(output, 'environment') || outputContains(output, 'deploy'), 
    'Should include failure reason');
  
  rig.cleanup();
});

test('complete tool with commands executed', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Simulate a task with multiple commands
  const output = rig.run(`Complete the task: "Set up project dependencies"
    Summary: Installed all required packages and initialized configuration
    Commands executed: npm init -y, npm install express, npm install --save-dev jest
    Result: Success`);
  
  assert.ok(toolWasCalled(output, 'complete'), 'complete tool should be called');
  assert.ok(outputContains(output, 'npm') || outputContains(output, 'install'), 
    'Should mention executed commands');
  assert.ok(outputContains(output, 'success') || outputContains(output, 'completed'), 
    'Should indicate success');
  
  rig.cleanup();
});

test('complete tool in workflow context', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Simulate a complete workflow
  
  // Step 1: Create files
  rig.createFile('index.html', '<html><body>Hello</body></html>');
  rig.createFile('style.css', 'body { margin: 0; }');
  
  // Step 2: Read files (simulating work)
  const output1 = rig.run('Read index.html and style.css files');
  assert.ok(toolWasCalled(output1, 'read_file'), 'Should read files');
  
  // Step 3: Modify files (simulating work)
  const output2 = rig.run('Add a title to index.html');
  
  // Step 4: Complete the task
  const output3 = rig.run(`Mark the task as complete: "Create basic web page"
    Summary: Created HTML structure with CSS styling
    Files modified: index.html, style.css
    Result: Success`);
  
  assert.ok(toolWasCalled(output3, 'complete'), 'complete tool should be called');
  assert.ok(outputContains(output3, 'web page') || outputContains(output3, 'HTML'), 
    'Should mention the completed task');
  assert.ok(outputContains(output3, 'success'), 'Should indicate success');
  
  rig.cleanup();
});