#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';

import { ChatApp } from './ChatApp.js';
import { TigerLogo } from './components/TigerLogo.js';

const parseArgs = (): { debug: boolean; skipLogo: boolean } => {
  const args = process.argv.slice(2);
  return {
    debug: args.includes('--debug') || args.includes('-d'),
    skipLogo: args.includes('--no-logo'),
  };
};

const main = (): void => {
  const { debug, skipLogo } = parseArgs();

  // デバッグモードの設定
  if (debug) {
    process.env['TIGER_DEBUG'] = 'true';
  }

  if (skipLogo) {
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
