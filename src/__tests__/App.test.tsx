import { render } from 'ink-testing-library';
import React from 'react';

import { App } from '../App.js';

describe('App', () => {
  it('should render hello world message', () => {
    const { lastFrame } = render(<App />);

    expect(lastFrame()).toContain('Hello World from Tiger CLI! 🐯');
  });

  it('should display commands', () => {
    const { lastFrame } = render(<App />);

    expect(lastFrame()).toContain('Commands:');
    expect(lastFrame()).toContain('h - Show help message');
    expect(lastFrame()).toContain('r - Reset message');
    expect(lastFrame()).toContain('q/ESC - Quit');
  });

  it('should change message when h is pressed', () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write('h');

    expect(lastFrame()).toContain('Welcome to Tiger - Your local LLM-powered coding agent!');
  });

  it('should reset message when r is pressed', () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write('h');
    stdin.write('r');

    expect(lastFrame()).toContain('Hello World from Tiger CLI! 🐯');
  });
});
