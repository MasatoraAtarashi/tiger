import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testOllama() {
  try {
    console.log('Testing Ollama connectivity...');
    
    const prompt = "Say 'Hello from Ollama' and nothing else";
    const command = `echo '${prompt}' | ollama run gemma3:4b`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Error:', stderr);
    }
    
    console.log('Ollama response:', stdout.trim());
    return stdout.trim();
  } catch (error) {
    console.error('Failed to connect to Ollama:', error);
    throw error;
  }
}

testOllama()
  .then(response => {
    console.log('✓ Ollama connectivity test passed');
  })
  .catch(error => {
    console.error('✗ Ollama connectivity test failed');
    process.exit(1);
  });