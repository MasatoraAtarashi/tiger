
import subprocess
import time
import sys
import os

# Start Tiger process
proc = subprocess.Popen(
    ['node', 'dist/cli.js', '--no-logo'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=0,
    env={**dict(os.environ), 'FORCE_COLOR': '1'}
)

output = []

# Function to read available output
def read_output():
    import select
    while True:
        ready, _, _ = select.select([proc.stdout], [], [], 0.1)
        if ready:
            line = proc.stdout.readline()
            if line:
                output.append(line)
                sys.stdout.write(line)
                sys.stdout.flush()
        else:
            break

# Wait for initial render
time.sleep(2)
read_output()

# Type characters one by one
for char in 'hello':
    print(f"\nTyping: {char}")
    proc.stdin.write(char)
    proc.stdin.flush()
    time.sleep(0.5)
    read_output()

# Exit
proc.stdin.write('\n/exit\n')
proc.stdin.flush()
time.sleep(1)
read_output()

proc.terminate()

# Save output
with open('test-output-direct.log', 'w') as f:
    f.write(''.join(output))
