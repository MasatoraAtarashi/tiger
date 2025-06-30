/**
 * Task Planner Tools Integration Tests
 * Tests for plan_task, execute_plan, complete_step, get_plan_status
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import { TestRig, outputContains, toolWasCalled } from './test-helper.js';

test('plan_task tool creates a task plan', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create a task plan
  const output = rig.run('Create a plan to build a simple calculator with add and subtract functions');
  
  // Verify plan_task tool was called
  assert.ok(toolWasCalled(output, 'plan_task'), 'plan_task tool should be called');
  
  // Verify plan contains steps
  assert.ok(outputContains(output, 'calculator') || outputContains(output, 'add') || 
    outputContains(output, 'subtract'), 'Plan should mention calculator functions');
  
  rig.cleanup();
});

test('execute_plan tool starts task execution', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // First create a plan
  const output1 = rig.run('Plan a task to create a hello world program');
  assert.ok(toolWasCalled(output1, 'plan_task'), 'plan_task tool should be called');
  
  // Then execute the plan
  const output2 = rig.run('Execute the plan we just created');
  
  // Should use execute_plan tool
  assert.ok(toolWasCalled(output2, 'execute_plan'), 'execute_plan tool should be called');
  assert.ok(outputContains(output2, 'executing') || outputContains(output2, 'started') || 
    outputContains(output2, 'beginning'), 'Should indicate execution started');
  
  rig.cleanup();
});

test('complete_step tool marks steps as done', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create a simple plan
  const output1 = rig.run('Plan to create a README file with project description');
  assert.ok(toolWasCalled(output1, 'plan_task'), 'plan_task tool should be called');
  
  // Execute plan
  const output2 = rig.run('Start executing the README creation plan');
  assert.ok(toolWasCalled(output2, 'execute_plan'), 'execute_plan tool should be called');
  
  // Complete a step
  const output3 = rig.run('Mark the first step of the plan as completed');
  
  assert.ok(toolWasCalled(output3, 'complete_step'), 'complete_step tool should be called');
  assert.ok(outputContains(output3, 'completed') || outputContains(output3, 'done') || 
    outputContains(output3, 'finished'), 'Should indicate step completion');
  
  rig.cleanup();
});

test('get_plan_status tool shows plan progress', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create and partially execute a plan
  const output1 = rig.run('Create a plan to refactor code with 3 steps: analyze, refactor, test');
  assert.ok(toolWasCalled(output1, 'plan_task'), 'plan_task tool should be called');
  
  // Get initial status
  const output2 = rig.run('Show the current status of the refactoring plan');
  
  assert.ok(toolWasCalled(output2, 'get_plan_status'), 'get_plan_status tool should be called');
  assert.ok(outputContains(output2, 'status') || outputContains(output2, 'progress') || 
    outputContains(output2, 'plan'), 'Should show plan status');
  
  rig.cleanup();
});

test('complete task planning workflow', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create initial files for the task
  rig.createFile('old-code.js', 'function oldFunc() { return "needs refactor"; }');
  
  // Step 1: Plan the task
  const output1 = rig.run('Plan a task to refactor old-code.js to use modern ES6 syntax');
  assert.ok(toolWasCalled(output1, 'plan_task'), 'Should create a plan');
  
  // Step 2: Execute the plan
  const output2 = rig.run('Execute the refactoring plan');
  assert.ok(toolWasCalled(output2, 'execute_plan'), 'Should start execution');
  
  // Step 3: Do some work (read file)
  const output3 = rig.run('Read old-code.js to analyze what needs refactoring');
  assert.ok(toolWasCalled(output3, 'read_file'), 'Should read the file');
  
  // Step 4: Complete analysis step
  const output4 = rig.run('Complete the analysis step - found that we need to convert to arrow function');
  assert.ok(toolWasCalled(output4, 'complete_step'), 'Should complete step');
  
  // Step 5: Check status
  const output5 = rig.run('Show the current progress of the refactoring task');
  assert.ok(toolWasCalled(output5, 'get_plan_status'), 'Should show status');
  
  // Verify workflow progression
  assert.ok(outputContains(output5, 'progress') || outputContains(output5, 'completed') || 
    outputContains(output5, 'status'), 'Should show task progress');
  
  rig.cleanup();
});

test('plan_task with complex requirements', async (t) => {
  const rig = new TestRig();
  rig.setup(t.name);
  
  // Create a complex plan
  const output = rig.run(`Create a detailed plan to build a REST API with the following requirements:
    - User authentication with JWT
    - CRUD operations for posts
    - Input validation
    - Error handling
    - Unit tests`);
  
  assert.ok(toolWasCalled(output, 'plan_task'), 'plan_task tool should be called');
  
  // Verify plan includes key components
  assert.ok(outputContains(output, 'authentication') || outputContains(output, 'JWT') || 
    outputContains(output, 'auth'), 'Should include authentication');
  assert.ok(outputContains(output, 'CRUD') || outputContains(output, 'create') || 
    outputContains(output, 'read'), 'Should include CRUD operations');
  assert.ok(outputContains(output, 'test') || outputContains(output, 'testing'), 
    'Should include testing');
  
  rig.cleanup();
});