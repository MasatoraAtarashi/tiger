import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';

export async function loadMemory(): Promise<string | null> {
  const memoryPaths = [
    path.join(process.cwd(), 'TIGER.md'),
    path.join(homedir(), '.tiger', 'TIGER.md')
  ];
  
  const memories: string[] = [];
  
  for (const memPath of memoryPaths) {
    try {
      const content = await fs.readFile(memPath, 'utf-8');
      memories.push(`# From ${memPath}\n${content}`);
    } catch {
      // File doesn't exist, skip
    }
  }
  
  return memories.length > 0 ? memories.join('\n\n---\n\n') : null;
}