import React from 'react';
import { render, Text } from 'ink';

const HelloWorld = () => {
  return <Text color="green">Hello, world!</Text>;
};

render(<HelloWorld />);