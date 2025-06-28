#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';

import { App } from './App.js';

const TigerLogo: React.FC = () => (
  <Gradient name="orange">
    <BigText text="TIGER" align="center" font="chrome" />
  </Gradient>
);

const main = (): void => {
  render(<TigerLogo />);
  
  setTimeout(() => {
    render(<App />);
  }, 2000);
};

main();