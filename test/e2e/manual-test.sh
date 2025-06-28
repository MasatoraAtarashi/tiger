#!/bin/bash

echo "🧪 Manual Keystroke Rendering Test"
echo "================================="
echo
echo "This test will:"
echo "1. Start Tiger in a real terminal"
echo "2. Type 'hello' one character at a time"
echo "3. Record the output to analyze rendering"
echo
echo "Starting in 3 seconds..."
sleep 3

# Create a test script that types characters
cat > test-input.exp << 'EOF'
#!/usr/bin/expect -f
set timeout 10
spawn node dist/cli.js --no-logo

# Wait for initial render
sleep 2

# Type each character with delay
send "h"
sleep 0.5
send "e"
sleep 0.5
send "l"
sleep 0.5
send "l"
sleep 0.5
send "o"
sleep 1

# Exit
send "\n"
send "/exit\n"
expect eof
EOF

chmod +x test-input.exp

# Run with script command to capture output
echo "Recording session..."
script -q test-session.log ./test-input.exp

# Analyze the output
echo
echo "🔍 Analysis:"
echo "============"

# Count how many times TIGER CONSOLE appears (handle UTF-8)
HEADER_COUNT=$(grep -c "TIGER CONSOLE v1.0" test-session.log || echo 0)
echo "TIGER header appearances: $HEADER_COUNT"

# Count clear screen sequences
CLEAR_COUNT=$(grep -o '\[2J\|\[H\|\[3J' test-session.log | wc -l | tr -d ' ')
echo "Clear screen sequences: $CLEAR_COUNT"

# Count frames (lines starting with escape sequences)
FRAME_COUNT=$(grep -c '^\[' test-session.log || echo 0)
echo "Probable frame updates: $FRAME_COUNT"

echo
if [ "$HEADER_COUNT" -gt 3 ] || [ "$CLEAR_COUNT" -gt 10 ]; then
    echo "❌ PROBLEM DETECTED: Excessive re-rendering!"
    echo "   The screen is being redrawn on every keystroke."
    exit 1
else
    echo "✅ No excessive re-rendering detected"
    exit 0
fi