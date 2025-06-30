import { SimpleLogger } from './src/simple-logger.mjs';
import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

async function runTigerChatWithLogger(userInput, logger) {
  logger.log('user', userInput);
  
  return new Promise((resolve) => {
    const child = spawn('npx', ['ts-node', '--transpile-only', '-e', `
      const { tigerChat } = require('./src/tiger');
      tigerChat('${userInput.replace(/'/g, "\\'")}')
        .then((result) => console.log(JSON.stringify(result)))
        .catch((error) => console.error(error));
    `], { cwd: process.cwd() });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      logger.log('error', `Process error: ${data.toString()}`);
    });
    
    child.on('close', () => {
      try {
        const result = JSON.parse(output);
        if (result.logs) {
          result.logs.forEach(log => {
            logger.log(log.type, log.message);
          });
        }
        logger.log('assistant', result.response);
        resolve(result);
      } catch (error) {
        logger.log('error', `Failed to parse result: ${error.message}`);
        resolve({
          response: 'Error processing request',
          logs: [{ type: 'error', message: error.toString() }]
        });
      }
    });
  });
}

async function testLogger() {
  console.log('🧪 Testing Tiger CLI Logger...\n');
  
  const logger = new SimpleLogger();
  console.log(`📝 Log file: ${logger.getLogFilePath()}\n`);
  
  const testQueries = [
    "List files in the current directory",
    "What's the current date?",
    "Show me the package.json file"
  ];
  
  for (const query of testQueries) {
    console.log(`👤 User: ${query}`);
    const result = await runTigerChatWithLogger(query, logger);
    console.log(`🐯 Tiger: ${result.response}\n`);
    await sleep(1000);
  }
  
  logger.close();
  console.log('✅ Test completed! Check the log file.');
}

testLogger().catch(console.error);