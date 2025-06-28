#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';

import { ChatApp } from './ChatApp.js';
import { SimpleApp } from './SimpleApp.js';
import { TigerLogo } from './components/TigerLogo.js';

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
  } else if (skipLogo) {
    render(<ChatApp />);
  } else {
    const { unmount } = render(<TigerLogo />);

    setTimeout(() => {
      unmount();
      process.stdout.write('\x1Bc'); // Clear screen
      render(<ChatApp />);
    }, 1500);
  }
};

main();
