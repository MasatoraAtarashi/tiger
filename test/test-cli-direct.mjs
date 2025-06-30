import { spawn } from 'child_process';
import { SimpleLogger } from './src/simple-logger.mjs';

const logger = new SimpleLogger();
console.log(`📝 Log file: ${logger.getLogFilePath()}\n`);

logger.log('info', 'Starting direct test of tiger-cli');

const scriptContent = `
  const { tigerChat } = require('./src/tiger');
  const { Logger } = require('./src/logger');
  const logger = new Logger();
  
  console.error('DEBUG: Starting tigerChat');
  
  tigerChat('hello', logger)
    .then((result) => {
      console.log(JSON.stringify(result));
      logger.close();
    })
    .catch((error) => {
      console.error('ERROR:', error);
      console.log(JSON.stringify({ error: error.message || error.toString() }));
      logger.close();
    });
`;

const child = spawn('npx', ['ts-node', '--transpile-only', '-e', scriptContent], {
  cwd: process.cwd()
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  stdout += data.toString();
  logger.log('info', `STDOUT: ${data.toString()}`);
});

child.stderr.on('data', (data) => {
  stderr += data.toString();
  logger.log('error', `STDERR: ${data.toString()}`);
});

child.on('close', (code) => {
  logger.log('info', `Process exited with code ${code}`);
  logger.log('info', `Final stdout: ${stdout}`);
  logger.log('error', `Final stderr: ${stderr}`);
  logger.close();
  
  console.log('\n✅ Test completed. Check the log file.');
});