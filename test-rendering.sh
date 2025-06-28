#!/bin/bash

echo "Manual Rendering Test for Tiger"
echo "================================"
echo ""
echo "This test will help verify if the rendering issue is fixed."
echo ""
echo "Instructions:"
echo "1. Run: ./test-rendering.sh"
echo "2. When Tiger starts, slowly type 'hello' one character at a time"
echo "3. Watch if the entire screen flickers/redraws on each keystroke"
echo ""
echo "Expected behavior (FIXED):"
echo "- Only the input area updates"
echo "- Header '🐯 TIGER CONSOLE v1.0 🐯' stays static"
echo "- No screen flickering"
echo ""
echo "Buggy behavior (NOT FIXED):"
echo "- Entire screen clears and redraws"
echo "- Header flickers on each keystroke"
echo ""
echo "Press Enter to start Tiger with the test configuration..."
read

# Run Tiger with test config
TIGER_CONFIG_PATH=.tigerrc.test.json node dist/cli.js --no-logo