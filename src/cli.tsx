#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';

import { ChatApp } from './ChatApp.js';
import { TigerLogo } from './components/TigerLogo.js';
import { SimpleApp } from './SimpleApp.js';

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
    // Use single render instance to avoid multiple renders
    const app = skipLogo ? <ChatApp /> : <TigerLogo />;
    const { rerender } = render(app, {
      exitOnCtrlC: true,
      patchConsole: false,
    });

    if (!skipLogo) {
      setTimeout(() => {
        // Instead of unmounting and creating new render, just rerender with new component
        rerender(<ChatApp />);
      }, 1500);
    }
  }
};

main();
