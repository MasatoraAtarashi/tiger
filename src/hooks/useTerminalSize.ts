import { useState, useEffect } from 'react';

const TERMINAL_PADDING_X = 2; // 左右のパディング

export function useTerminalSize(): { columns: number; rows: number } {
  const [size, setSize] = useState({
    columns: (process.stdout.columns || 80) - TERMINAL_PADDING_X,
    rows: process.stdout.rows || 24,
  });

  useEffect(() => {
    function updateSize() {
      setSize({
        columns: (process.stdout.columns || 80) - TERMINAL_PADDING_X,
        rows: process.stdout.rows || 24,
      });
    }

    process.stdout.on('resize', updateSize);
    return () => {
      process.stdout.off('resize', updateSize);
    };
  }, []);

  return size;
}