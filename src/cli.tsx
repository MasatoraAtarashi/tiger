#!/usr/bin/env node
import { render } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import React from 'react';

import { ChatApp } from './ChatApp.js';

const TigerLogo: React.FC = () => (
  <Gradient colors={['#FF6B00', '#FFD93D', '#FF6B00']}>
    <BigText text="TIGER" align="center" font="chrome" />
  </Gradient>
);

const main = (): void => {
  const { clear } = render(<TigerLogo />);

  setTimeout(() => {
    clear();
    render(<ChatApp />);
  }, 1500);
};

main();
