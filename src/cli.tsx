#!/usr/bin/env node
import { render } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import React from 'react';

import { ChatApp } from './ChatApp.js';

const TigerLogo: React.FC = () => (
  <>
    <BigText text="" />  {/* スペース用 */}
    <Gradient colors={['#FF6B00', '#FFD93D', '#FF6B00']}>
      <BigText text="TIGER" align="center" font="chrome" />
    </Gradient>
  </>
);

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
    const { clear } = render(<TigerLogo />);

    setTimeout(() => {
      clear();
      render(<ChatApp />);
    }, 1500);
  }
};

main();
