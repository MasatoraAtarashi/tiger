#!/usr/bin/env node

/**
 * Test Runner for Tiger CLI Integration Tests
 * Based on Gemini CLI's test runner pattern
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const keepOutput = args.includes('--keep-output');
const specificTest = args.find(arg => !arg.startsWith('--'));

// Set environment variables
if (keepOutput) {
  process.env.KEEP_OUTPUT = 'true';
}

// Find all test files
const testDir = __dirname;
const testFiles = fs.readdirSync(testDir)
  .filter(file => file.endsWith('.test.js') && file !== 'run-tests.js')
  .sort();

// Filter to specific test if provided
const testsToRun = specificTest 
  ? testFiles.filter(file => file.includes(specificTest))
  : testFiles;

if (testsToRun.length === 0) {
  console.error(`No tests found${specificTest ? ` matching "${specificTest}"` : ''}`);
  process.exit(1);
}

console.log(`Running ${testsToRun.length} integration test${testsToRun.length === 1 ? '' : 's'}...`);
if (verbose) {
  console.log('Tests:', testsToRun.join(', '));
}

// Track test results
let allTestsPassed = true;
const testResults = [];

// Run each test file
for (const testFile of testsToRun) {
  console.log(`\n📋 Running ${testFile}...`);
  
  const testPath = path.join(testDir, testFile);
  const startTime = Date.now();
  
  try {
    // Run test using Node.js test runner
    const result = await runTest(testPath, verbose);
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log(`✅ ${testFile} passed (${duration}ms)`);
      testResults.push({ file: testFile, success: true, duration });
    } else {
      console.log(`❌ ${testFile} failed (${duration}ms)`);
      if (result.error) {
        console.error(`   ${result.error}`);
      }
      testResults.push({ file: testFile, success: false, duration, error: result.error });
      allTestsPassed = false;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${testFile} crashed (${duration}ms)`);
    console.error(`   ${error.message}`);
    testResults.push({ file: testFile, success: false, duration, error: error.message });
    allTestsPassed = false;
  }
}

// Print summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary:');
console.log('='.repeat(60));

const passed = testResults.filter(r => r.success).length;
const failed = testResults.filter(r => !r.success).length;
const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

console.log(`Total: ${testResults.length} tests`);
console.log(`Passed: ${passed} ✅`);
console.log(`Failed: ${failed} ❌`);
console.log(`Duration: ${totalDuration}ms`);

if (!allTestsPassed) {
  console.log('\nFailed tests:');
  testResults
    .filter(r => !r.success)
    .forEach(r => {
      console.log(`  - ${r.file}`);
      if (r.error && verbose) {
        console.log(`    ${r.error}`);
      }
    });
}

// Write test results to file if keeping output
if (keepOutput) {
  const resultsPath = path.join(testDir, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    tests: testResults,
    summary: { total: testResults.length, passed, failed, duration: totalDuration }
  }, null, 2));
  console.log(`\nTest results saved to: ${resultsPath}`);
}

// Exit with appropriate code
process.exit(allTestsPassed ? 0 : 1);

/**
 * Run a single test file
 */
function runTest(testPath, verbose) {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      TIGER_CLI_INTEGRATION_TEST: 'true'
    };
    
    // Use node --test for native test runner
    const args = ['--test', testPath];
    if (!verbose) {
      args.push('--test-reporter=dot');
    }
    
    const child = spawn('node', args, {
      env,
      stdio: verbose ? 'inherit' : 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    if (!verbose) {
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
    }
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        const error = errorOutput || output || 'Test failed';
        resolve({ success: false, error });
      }
    });
    
    child.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}