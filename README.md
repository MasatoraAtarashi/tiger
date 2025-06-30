# Tiger CLI 🐯

A powerful CLI coding agent powered by Ollama and Mastra tools. Tiger helps you with various coding tasks through natural language interaction.

## Features

- 🤖 Natural language interface for coding tasks
- 🛠️ Built-in tools for file operations, shell commands, and more
- 📝 Session logging for debugging and audit trails
- 🎨 Beautiful terminal UI with Ink
- ⚡ Fast responses using local Ollama models

## Prerequisites

- Node.js 18+ 
- [Ollama](https://ollama.ai/) installed and running
- Gemma3:4b model (or modify the model in `src/tiger.ts`)

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the Gemma3:4b model
ollama pull gemma3:4b
```

## Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/tiger-cli.git
cd tiger-cli

# Install dependencies
npm install

# Run Tiger CLI
npm start
```

### Global Installation

```bash
# Install globally to use 'tiger' command anywhere
npm install -g .

# Now you can run Tiger from anywhere
tiger
```

## Usage

Once Tiger is running, you can interact with it using natural language:

```
🐯 Tiger CLI Agent
Powered by Ollama + Mastra

> List files in the current directory
> Read package.json
> Create a new file called hello.txt with "Hello World" content
> Run ls -la command
```

### Available Commands

Tiger understands natural language requests for:
- **File Operations**: List files, read file contents, create/edit files
- **Shell Commands**: Execute shell commands safely
- **Echo**: Test the agent with simple echo responses

### Keyboard Shortcuts

- `Enter` - Send your message
- `ESC` or `Ctrl+C` - Exit the application

## Development

```bash
# Run in development mode
npm run dev

# Type checking
npm run typecheck

# Build the project
npm run build
```

## Project Structure

```
tiger-cli/
├── src/
│   ├── tiger-cli.mjs    # CLI entry point with Ink UI
│   ├── tiger.ts         # Core Tiger logic and Ollama integration
│   ├── tools/           # Mastra tool implementations
│   ├── logger.ts        # Session logging
│   └── config.ts        # Configuration
├── examples/            # Example usage and tests
└── test/               # Test files
```

## Configuration

Tiger logs all sessions to help with debugging. Logs are stored in:
- Default: `./logs/tiger-session-{timestamp}.log`

You can modify the log directory in `src/config.ts`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with [Ollama](https://ollama.ai/) for local LLM inference
- UI powered by [Ink](https://github.com/vadimdemedes/ink)
- Tools framework by [Mastra](https://mastra.dev/)