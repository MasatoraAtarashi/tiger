#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';

import { ChatApp } from './ChatApp.js';
import { TigerLogo } from './components/TigerLogo.js';
import { SimpleApp } from './SimpleApp.js';
import { FilteredStream } from './utils/filtered-stream.js';

const parseArgs = (): { debug: boolean; skipLogo: boolean; noRender: boolean } => {
  const args = process.argv.slice(2);
  return {
    debug: args.includes('--debug') || args.includes('-d'),
    skipLogo: args.includes('--no-logo'),
    noRender: args.includes('--no-render'),
  };
};

const main = (): void => {
  const { debug, skipLogo, noRender } = parseArgs();

  // デバッグモードの設定
  if (debug) {
    process.env['TIGER_DEBUG'] = 'true';
  }

  if (noRender || !process.stdout.isTTY) {
    // Non-rendering mode for testing/piping
    process.env['TIGER_NO_RENDER'] = 'true';
    console.log('🐯 Tiger CLI - Non-interactive mode');
    render(<SimpleApp />, {
      stdout: process.stdout,
      stdin: process.stdin,
      stderr: process.stderr,
      debug: false,
      exitOnCtrlC: true,
      patchConsole: false,
    });
  } else {
    // Create filtered stdout to prevent screen clearing
    const filteredStdout = new FilteredStream(process.stdout);
    
    if (skipLogo) {
      render(<ChatApp />, {
        stdout: filteredStdout as any,
        stdin: process.stdin,
        stderr: process.stderr,
        exitOnCtrlC: true,
        patchConsole: false,
        debug: false,
      });
    } else {
      const { unmount } = render(<TigerLogo />, {
        stdout: filteredStdout as any,
        stdin: process.stdin,
        stderr: process.stderr,
        exitOnCtrlC: true,
        patchConsole: false,
        debug: false,
      });

      setTimeout(() => {
        unmount();
        // Clear screen manually once before starting the main app
        process.stdout.write('\x1Bc');
        render(<ChatApp />, {
          stdout: filteredStdout as any,
          stdin: process.stdin,
          stderr: process.stderr,
          exitOnCtrlC: true,
          patchConsole: false,
          debug: false,
        });
      }, 1500);
    }
  }
};

main();
