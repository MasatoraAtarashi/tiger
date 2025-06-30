const React = require('react');
const { render, Text } = require('ink');

const HelloWorld = () => {
  return React.createElement(Text, { color: 'green' }, 'Hello, world!');
};

render(React.createElement(HelloWorld));