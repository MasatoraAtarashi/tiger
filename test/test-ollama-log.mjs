import { spawn } from 'child_process';

console.log('Testing Ollama logging...\n');

const child = spawn('npx', ['ts-node', '--transpile-only', 'src/tiger.ts'], {
  cwd: process.cwd(),
  env: { ...process.env }
});

// Send input to the process
setTimeout(() => {
  child.stdin.write("What's 2+2?\n");
}, 1000);

// Capture output
child.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

child.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

child.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
  
  // Check the latest log file
  import('fs').then(fs => {
    import('path').then(path => {
      import('os').then(os => {
        const logDir = path.default.join(os.default.homedir(), '.tiger', 'logs');
        const files = fs.default.readdirSync(logDir);
        const latestLog = files.sort().pop();
        if (latestLog) {
          console.log(`\nLatest log file: ${latestLog}`);
          const logContent = fs.default.readFileSync(path.default.join(logDir, latestLog), 'utf-8');
          console.log('\nLog content preview:');
          console.log(logContent.split('\n').slice(0, 50).join('\n'));
        }
      });
    });
  });
});