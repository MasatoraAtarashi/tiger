# Tiger CLI 🐯

![Tiger CLI](https://raw.githubusercontent.com/MasatoraAtarashi/tiger/main/screenshot.png)

A powerful coding agent powered by local LLMs. Execute coding tasks using natural language.

## Requirements

- Node.js 18+
- [Ollama](https://ollama.ai/) (Local LLM runtime)

## Installation

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download the default model
ollama pull llama3.2:3b

# Install Tiger
npm install -g @truetiger/tiger
```

## Usage

```bash
# Start Tiger
tiger

# Give it tasks in natural language:
> List all files
> Read package.json
> Create a file called hello.txt
> Run npm test

# Include file contents in your message
> Review this code @src/index.js @package.json

# View chat history
> /history 20
> /history search error
> /history -v
```

### Features

#### File Operation Tools
- 📁 **ls** - List directory contents
- 📄 **read_file** - Read file contents
- ✏️ **write_file** - Write to files
- 🔍 **grep** - Search for patterns in files
- 🎯 **glob** - Find files with glob patterns

#### Execution & System Tools
- 🔧 **shell** - Execute shell commands
- 🌐 **web_fetch** - Fetch content from URLs
- 💾 **memory** - Store and retrieve from memory

#### Task Management Tools
- 📋 **plan_task** - Create multi-step task plans
- ▶️ **execute_plan** - Execute task plans
- ✅ **complete_step** - Mark steps as completed
- 📊 **get_plan_status** - Get task plan status
- 🎯 **complete** - Report task completion

#### Slash Commands
- **/help** - Show available commands
- **/clear** - Clear conversation
- **/quit** - Exit Tiger
- **/history [count]** - Show recent chat history (default: 10)
- **/history search <query>** - Search chat history
- **/history clear** - Clear chat history
- **/history -v** - Show detailed history with tools used
- **/memory [user|project]** - Edit memory files
- **/init** - Initialize project memory
- **/status** - Show current status
- **/model** - Show current model

#### Other Features
- 📎 **@file inclusion** - Include file contents with `@filename` in messages
- 📜 **Chat history** - Save and search conversation history (~/.tiger/history.json)
- 🧠 Project & user-level memory management (TIGER.md)
- 📝 Detailed logging (~/.tiger/logs/)
- 🎨 Colorful interactive UI
- ⚡ Real-time streaming responses

### Configuration

Customize settings with a `.tigerrc` file:

```json
{
  "model": "llama3.2:3b",      // Ollama model to use
  "timeout": 60000,            // Timeout in milliseconds
  "maxIterations": 10          // Maximum execution steps
}
```

## License

MIT License