import { Writable } from 'stream';

export class FilteredStream extends Writable {
  private stdout: NodeJS.WriteStream;
  private clearScreenRegex = /(\x1b\[2J|\x1b\[3J|\x1b\[H|\x1bc)/g;
  private eraseLinesRegex = /\x1b\[\d+A/g;  // Move cursor up n lines
  private cursorHomeRegex = /\x1b\[0;0H/g;  // Move cursor to home position

  constructor(stdout: NodeJS.WriteStream) {
    super();
    this.stdout = stdout;
  }

  override _write(chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void): void {
    let data = chunk.toString();
    
    // Filter out clear screen sequences
    data = data.replace(this.clearScreenRegex, '');
    
    // Filter out cursor movements that cause re-rendering
    data = data.replace(this.eraseLinesRegex, '');
    data = data.replace(this.cursorHomeRegex, '');
    
    this.stdout.write(data);
    callback();
  }

  // Forward other methods to stdout
  get isTTY(): boolean {
    return this.stdout.isTTY || false;
  }

  get columns(): number {
    return this.stdout.columns || 80;
  }

  get rows(): number {
    return this.stdout.rows || 24;
  }
}