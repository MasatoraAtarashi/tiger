import { Box, Text } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import React, { useEffect, useState } from 'react';

export const TigerLogo: React.FC = () => {
  const [frame, setFrame] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % 2);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const tigerFrames = [
    [
      '                    ,-.             .-.',
      '                   /  |   (\\_//)   |  \\',
      '                  /   |  (\\/o o\\/)  |   \\',
      '                 /    |   \\  ^  /   |    \\',
      '                /     |    "> <"    |     \\',
      '               |      |  _ /|=|\\ _  |      |',
      '               |      |=(((==)))==)==|      |',
      '               |      /_____________\\|      |',
      '                \\    /               \\    /',
      '                 \\  /    GRRRRRR!     \\  /',
      '                  \\/___________________\\/',
    ],
    [
      '                    ,-.             .-.',
      '                   /  |   (\\_//)   |  \\',
      '                  /   |  (\\/- -\\/)  |   \\',
      '                 /    |   \\  ^  /   |    \\',
      '                /     |    "> <"    |     \\',
      '               |      |  _ /|=|\\ _  |      |',
      '               |      |=(((==)))==)==|      |',
      '               |      /_____________\\|      |',
      '                \\    /               \\    /',
      '                 \\  /    ROAAAAR!     \\  /',
      '                  \\/___________________\\/',
    ],
  ];

  return (
    <Box flexDirection="column" alignItems="center">
      <Box flexDirection="column" marginBottom={1}>
        {tigerFrames[frame]?.map((line, i) => (
          <Text key={i} color={i < 7 ? 'yellow' : 'gray'}>
            {line}
          </Text>
        ))}
      </Box>
      <Box marginBottom={1}>
        <Gradient colors={['#FF6B00', '#FFD93D', '#FF6B00']}>
          <BigText text="TIGER" align="center" font="chrome" />
        </Gradient>
      </Box>
      <Box flexDirection="column" alignItems="center">
        <Text bold color="yellow">
          🐯 Local LLM-Powered Coding Agent 🐯
        </Text>
        <Text dimColor>
          Your fierce companion for coding adventures
        </Text>
      </Box>
    </Box>
  );
};