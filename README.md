# Tiger 🐯

A CLI-based coding assistant powered by local LLMs. Tiger helps you with programming tasks using models running on your own machine, ensuring privacy and low latency.

## Features

- 🤖 **Local LLM Integration** - Uses Ollama for local model execution
- 🔧 **Tool System** - Extensible tool architecture (file reading, code execution, etc.)
- 🌊 **Streaming Responses** - Real-time streaming for better user experience
- 🎨 **Rich Terminal UI** - Beautiful interface built with React and Ink
- 🔌 **Pluggable Architecture** - Easy to add new LLM providers or tools
- 🛡️ **Privacy First** - All processing happens locally on your machine

## Prerequisites

- Node.js 18 or higher
- [Ollama](https://ollama.ai/) installed and running
- A local LLM model (e.g., llama3, codellama, mistral)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tiger.git
cd tiger

# Install dependencies
npm install

# Build the project
npm run build
```

## Quick Start

1. **Start Ollama** (if not already running):

   ```bash
   ollama serve
   ```

2. **Pull a model** (if you haven't already):

   ```bash
   ollama pull llama3
   ```

3. **Run Tiger**:
   ```bash
   npm run dev
   ```

## Configuration

Tiger can be configured using a `.tigerrc.json` file. The configuration is searched in the following locations (in order):

1. `./.tigerrc.json` (current directory)
2. `./tiger.config.json` (current directory)
3. `~/.tiger/config.json` (home directory)
4. `~/.tigerrc.json` (home directory)

### Configuration Options

```json
{
  "llm": {
    "type": "ollama",
    "baseUrl": "http://localhost:11434",
    "defaultModel": "llama3"
  },
  "temperature": 0.7,
  "maxTokens": 2048,
  "systemPrompt": "You are Tiger, a helpful coding assistant.",
  "enabledTools": ["read_file"],
  "options": {
    "streamByDefault": true,
    "debug": false,
    "timeout": 30000
  }
}
```

### Configuration Fields

#### LLM Provider Settings (`llm`)

- `type`: The LLM provider to use. Currently supports:
  - `"ollama"` - Ollama local models
  - Future support: `"openai"`, `"anthropic"`, `"gemini"`
- `baseUrl`: The base URL for the LLM API (default: `"http://localhost:11434"` for Ollama)
- `defaultModel`: The default model to use (default: `"llama3"`)

#### Model Parameters

- `temperature`: Controls randomness in responses (0.0-1.0, default: 0.7)
- `maxTokens`: Maximum tokens in response (optional)
- `systemPrompt`: The system prompt that defines Tiger's behavior

#### Tools

- `enabledTools`: Array of enabled tool names. Available tools:
  - `"read_file"` - Read local files
  - More tools coming soon!

#### Options

- `streamByDefault`: Enable streaming responses (default: true)
- `debug`: Enable debug mode to see internal operations (default: false)
- `timeout`: Request timeout in milliseconds (default: 30000)

## Configuration Examples

### Using CodeLlama for Better Code Generation

```json
{
  "llm": {
    "type": "ollama",
    "defaultModel": "codellama"
  },
  "temperature": 0.3,
  "systemPrompt": "You are Tiger, an expert programming assistant specialized in writing clean, efficient code."
}
```

### Using Mistral with Higher Temperature

```json
{
  "llm": {
    "type": "ollama",
    "defaultModel": "mistral"
  },
  "temperature": 0.9,
  "maxTokens": 4096
}
```

### Debug Mode for Development

```json
{
  "llm": {
    "type": "ollama",
    "defaultModel": "llama3"
  },
  "options": {
    "debug": true,
    "streamByDefault": false
  }
}
```

## Debug Mode

Enable debug mode to see what Tiger is doing behind the scenes:

```json
{
  "options": {
    "debug": true
  }
}
```

Or set the environment variable:

```bash
TIGER_DEBUG=true npm run dev
```

Debug mode shows:

- LLM API requests and responses
- Tool execution details
- Token usage statistics
- Configuration loading information
- Error details and stack traces

## Command Line Options

```bash
tiger [options]

Options:
  --debug, -d     Enable debug mode
  --no-logo       Skip the startup logo
```

## Available Commands

While in Tiger:

- Type your message and press Enter to send
- `/exit` or `/quit` - Exit Tiger
- `Ctrl+C` - Force quit

## Supported Models

Tiger works with any model available in Ollama. Popular choices:

- **llama3** - General purpose, good balance
- **codellama** - Optimized for code generation
- **mistral** - Fast and efficient
- **mixtral** - Larger, more capable model
- **phi** - Small but capable model

Pull models with:

```bash
ollama pull <model-name>
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## Architecture

Tiger uses a modular architecture:

```
src/
├── llm/           # LLM provider interfaces and implementations
├── tools/         # Tool system for extending capabilities
├── core/          # Core chat and conversation management
├── config/        # Configuration loading and management
├── components/    # React/Ink UI components
└── hooks/         # React hooks for state management
```

## Troubleshooting

### "Failed to connect to Ollama"

- Make sure Ollama is running: `ollama serve`
- Check if Ollama is accessible: `curl http://localhost:11434/api/version`
- Verify the baseUrl in your configuration

### "Model not found"

- Pull the model first: `ollama pull <model-name>`
- List available models: `ollama list`

### Performance Issues

- Try a smaller model like `phi` or `llama3`
- Reduce `maxTokens` in configuration
- Disable streaming with `"streamByDefault": false`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Inspired by [Claude Code](https://github.com/anthropics/claude-code) and [Gemini CLI](https://github.com/google/gemini-cli)
- Built with [Ink](https://github.com/vadimdemedes/ink) for the terminal UI
- Powered by [Ollama](https://ollama.ai/) for local LLM execution
