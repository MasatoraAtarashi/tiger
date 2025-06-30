import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';
import { Logger } from './logger';

export interface Memory {
  content: string;
  source: 'project' | 'user' | 'imported';
  path: string;
}

export class MemoryManager {
  private memories: Memory[] = [];
  private logger?: Logger;
  
  constructor(logger?: Logger) {
    this.logger = logger;
  }
  
  async loadMemories(currentDir: string): Promise<void> {
    this.memories = [];
    
    // 1. Load user memory (~/.tiger/TIGER.md)
    await this.loadUserMemory();
    
    // 2. Load project memories (recursive up the directory tree)
    await this.loadProjectMemories(currentDir);
    
    // 3. Process imports
    await this.processImports();
    
    if (this.logger) {
      this.logger.log({
        timestamp: new Date().toISOString(),
        type: 'memory_loaded',
        message: `Loaded ${this.memories.length} memory files`,
        metadata: { 
          sources: this.memories.map(m => ({ path: m.path, source: m.source }))
        }
      });
    }
  }
  
  private async loadUserMemory(): Promise<void> {
    const userMemoryPath = path.join(homedir(), '.tiger', 'TIGER.md');
    try {
      const content = await fs.readFile(userMemoryPath, 'utf-8');
      this.memories.push({
        content,
        source: 'user',
        path: userMemoryPath
      });
    } catch (error) {
      // User memory is optional
    }
  }
  
  private async loadProjectMemories(dir: string): Promise<void> {
    let currentDir = dir;
    const projectMemories: Memory[] = [];
    
    while (currentDir !== path.dirname(currentDir)) {
      const memoryPath = path.join(currentDir, 'TIGER.md');
      try {
        const content = await fs.readFile(memoryPath, 'utf-8');
        projectMemories.push({
          content,
          source: 'project',
          path: memoryPath
        });
      } catch (error) {
        // Continue searching up the tree
      }
      currentDir = path.dirname(currentDir);
    }
    
    // Add in reverse order (root to current)
    this.memories.push(...projectMemories.reverse());
  }
  
  private async processImports(): Promise<void> {
    const importPattern = /@([^\s]+)/g;
    const processedPaths = new Set<string>();
    
    for (const memory of [...this.memories]) {
      const matches = memory.content.matchAll(importPattern);
      
      for (const match of matches) {
        const importPath = match[1];
        const absolutePath = path.isAbsolute(importPath) 
          ? importPath 
          : path.resolve(path.dirname(memory.path), importPath);
        
        if (!processedPaths.has(absolutePath)) {
          processedPaths.add(absolutePath);
          try {
            const content = await fs.readFile(absolutePath, 'utf-8');
            this.memories.push({
              content,
              source: 'imported',
              path: absolutePath
            });
          } catch (error: any) {
            if (this.logger) {
              this.logger.log({
                timestamp: new Date().toISOString(),
                type: 'memory_import_error',
                message: `Failed to import ${absolutePath}`,
                metadata: { error: error.message }
              });
            }
          }
        }
      }
    }
  }
  
  getCombinedMemory(): string {
    return this.memories
      .map(m => `# Memory from ${m.path}\n\n${m.content}`)
      .join('\n\n---\n\n');
  }
  
  async addQuickMemory(content: string, projectDir: string): Promise<void> {
    const memoryPath = path.join(projectDir, 'TIGER.md');
    
    try {
      const existingContent = await fs.readFile(memoryPath, 'utf-8');
      const newContent = existingContent + '\n\n' + content;
      await fs.writeFile(memoryPath, newContent, 'utf-8');
    } catch (error) {
      // File doesn't exist, create it
      await fs.writeFile(memoryPath, content, 'utf-8');
    }
    
    // Reload memories
    await this.loadMemories(projectDir);
  }
  
  async initProjectMemory(projectDir: string, template?: string): Promise<void> {
    const memoryPath = path.join(projectDir, 'TIGER.md');
    
    const defaultTemplate = `# Tiger Project Memory

## Project Overview
[Describe your project here]

## Conventions
- Code style: 
- Testing approach: 
- File organization: 

## Important Context
[Add any important context Tiger should know]

## Common Tasks
[List common tasks or workflows]
`;
    
    await fs.writeFile(memoryPath, template || defaultTemplate, 'utf-8');
  }
}