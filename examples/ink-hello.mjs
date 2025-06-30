import React from 'react';
import { render, Text } from 'ink';

const HelloWorld = () => {
  return React.createElement(Text, { color: 'green' }, 'Hello, world!');
};

render(React.createElement(HelloWorld));