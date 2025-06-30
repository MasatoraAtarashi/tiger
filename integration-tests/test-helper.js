/**
 * Test Helper Utilities for Tiger CLI Integration Tests
 * Based on Gemini CLI's test structure
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TestRig {
  constructor() {
    // Use mock CLI for testing (doesn't require Ollama)
    this.cliPath = path.join(__dirname, '..', 'src', 'tiger-cli-test-mock.mjs');
    this.testDir = null;
    this.testOutput = [];
  }

  /**
   * Set up test environment with a unique directory
   */
  setup(testName) {
    // Sanitize test name for directory
    const sanitizedName = testName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    
    this.testDir = path.join(__dirname, 'test-runs', sanitizedName);
    
    // Create test directory
    fs.mkdirSync(this.testDir, { recursive: true });
    
    // Clear test output
    this.testOutput = [];
    
    return this.testDir;
  }

  /**
   * Create a file in the test directory
   */
  createFile(filename, content) {
    const filePath = path.join(this.testDir, filename);
    const dir = path.dirname(filePath);
    
    // Ensure directory exists
    fs.mkdirSync(dir, { recursive: true });
    
    // Write file
    fs.writeFileSync(filePath, content, 'utf-8');
    
    return filePath;
  }

  /**
   * Create a directory in the test environment
   */
  mkdir(dirname) {
    const dirPath = path.join(this.testDir, dirname);
    fs.mkdirSync(dirPath, { recursive: true });
    return dirPath;
  }

  /**
   * Run Tiger CLI command with a prompt
   */
  run(prompt, options = {}) {
    const keepOutput = process.env.KEEP_OUTPUT === 'true';
    
    try {
      // Change to test directory
      const originalCwd = process.cwd();
      process.chdir(this.testDir);
      
      // Prepare command - properly escape quotes in prompt
      const escapedPrompt = prompt.replace(/"/g, '\\"');
      const command = `node "${this.cliPath}" "${escapedPrompt}"`;
      
      // Add additional options if provided
      const execOptions = {
        encoding: 'utf-8',
        stdio: 'pipe',
        env: {
          ...process.env,
          TIGER_CLI_INTEGRATION_TEST: 'true'
        },
        ...options
      };
      
      // Execute command
      const output = execSync(command, execOptions);
      
      // Log output if requested
      if (keepOutput) {
        console.log(`[RUN] ${prompt}`);
        console.log(output);
        this.testOutput.push({ prompt, output });
      }
      
      // Change back to original directory
      process.chdir(originalCwd);
      
      return output;
    } catch (error) {
      // Log error if keeping output
      if (keepOutput) {
        console.error(`[ERROR] ${prompt}`);
        console.error(error.message);
        this.testOutput.push({ prompt, error: error.message });
      }
      
      throw error;
    }
  }

  /**
   * Read a file from the test directory
   */
  readFile(filename, log = false) {
    const filePath = path.join(this.testDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (log || process.env.KEEP_OUTPUT === 'true') {
      console.log(`[READ] ${filename}`);
      console.log(content);
    }
    
    return content;
  }

  /**
   * Check if a file exists in the test directory
   */
  fileExists(filename) {
    const filePath = path.join(this.testDir, filename);
    return fs.existsSync(filePath);
  }

  /**
   * List files in a directory
   */
  listFiles(dirname = '.') {
    const dirPath = path.join(this.testDir, dirname);
    return fs.readdirSync(dirPath);
  }

  /**
   * Clean up test directory (optional)
   */
  cleanup() {
    if (!process.env.KEEP_OUTPUT && this.testDir) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
  }

  /**
   * Write test output to log file (for debugging)
   */
  writeTestLog() {
    if (this.testOutput.length > 0) {
      const logPath = path.join(this.testDir, 'test.log');
      const logContent = this.testOutput
        .map(entry => {
          if (entry.error) {
            return `ERROR: ${entry.prompt}\n${entry.error}\n`;
          }
          return `RUN: ${entry.prompt}\n${entry.output}\n`;
        })
        .join('\n---\n\n');
      
      fs.writeFileSync(logPath, logContent, 'utf-8');
    }
  }
}

/**
 * Helper function to extract tool calls from CLI output
 */
export function extractToolCalls(output) {
  // Parse tool calls from the output
  // This assumes the CLI outputs tool calls in a specific format
  const toolCallRegex = /Tool: (\w+)\nInput: ({[^}]+})\nOutput: ({[^}]+})/g;
  const toolCalls = [];
  
  let match;
  while ((match = toolCallRegex.exec(output)) !== null) {
    toolCalls.push({
      tool: match[1],
      input: JSON.parse(match[2]),
      output: JSON.parse(match[3])
    });
  }
  
  return toolCalls;
}

/**
 * Helper to check if output contains expected content
 */
export function outputContains(output, expected) {
  const normalizedOutput = output.toLowerCase();
  const normalizedExpected = expected.toLowerCase();
  return normalizedOutput.includes(normalizedExpected);
}

/**
 * Helper to check if a tool was called
 */
export function toolWasCalled(output, toolName) {
  return output.includes(`Tool: ${toolName}`) || 
         output.includes(`"tool": "${toolName}"`) ||
         output.includes(`Calling ${toolName}`) ||
         output.includes(`Using tool: ${toolName}`) ||
         output.includes(`🔧 Using tool: ${toolName}`);
}