#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

console.log('🧪 Direct Keystroke Test');
console.log('=======================\n');

// Create a Python script to interact with Tiger
const pythonScript = `
import subprocess
import time
import sys
import os

# Start Tiger process
proc = subprocess.Popen(
    ['node', 'dist/cli.js', '--no-logo'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=0,
    env={**dict(os.environ), 'FORCE_COLOR': '1'}
)

output = []

# Function to read available output
def read_output():
    import select
    while True:
        ready, _, _ = select.select([proc.stdout], [], [], 0.1)
        if ready:
            line = proc.stdout.readline()
            if line:
                output.append(line)
                sys.stdout.write(line)
                sys.stdout.flush()
        else:
            break

# Wait for initial render
time.sleep(2)
read_output()

# Type characters one by one
for char in 'hello':
    print(f"\\nTyping: {char}")
    proc.stdin.write(char)
    proc.stdin.flush()
    time.sleep(0.5)
    read_output()

# Exit
proc.stdin.write('\\n/exit\\n')
proc.stdin.flush()
time.sleep(1)
read_output()

proc.terminate()

# Save output
with open('test-output-direct.log', 'w') as f:
    f.write(''.join(output))
`;

// Write Python script
writeFileSync('test-interact.py', pythonScript);

// Check if we have Python
try {
  execSync('python3 --version', { stdio: 'ignore' });
} catch {
  console.error('❌ Python3 is required for this test');
  process.exit(1);
}

// Run the test
console.log('Running test with Python interaction...\n');
try {
  execSync('python3 test-interact.py', { stdio: 'inherit' });
} catch (error) {
  console.error('Test execution failed');
}

// Analyze results
console.log('\n🔍 Analyzing output...');
try {
  const output = readFileSync('test-output-direct.log', 'utf-8');
  
  // Count patterns
  const tigerHeaders = (output.match(/TIGER CONSOLE v1\.0/g) || []).length;
  const clearScreens = (output.match(/\x1b\[2J|\x1b\[3J|\x1b\[H/g) || []).length;
  const fullScreenRenders = (output.match(/┌──────────.*└──────────/gs) || []).length;
  
  console.log(`TIGER headers: ${tigerHeaders}`);
  console.log(`Clear screens: ${clearScreens}`);
  console.log(`Full screen renders: ${fullScreenRenders}`);
  
  if (tigerHeaders > 3 || clearScreens > 5) {
    console.log('\n❌ PROBLEM: Excessive re-rendering detected!');
    console.log('The UI is being completely redrawn on every keystroke.');
    process.exit(1);
  } else {
    console.log('\n✅ No excessive re-rendering detected');
    process.exit(0);
  }
} catch (error) {
  console.error('Failed to analyze output:', error.message);
  process.exit(1);
}