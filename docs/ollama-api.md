# Ollama API Documentation

## Chat Completions

### Generate a chat completion

```
POST /api/chat
```

Generate the next message in a chat with a provided model. This is a streaming endpoint, so there will be a series of responses. The final response object will include statistics and additional data from the request.

### Parameters

- `model` (required): the model name
- `messages`: the messages of the chat, this can be used to keep a chat memory
- `stream`: if `false` the response will be returned as a single response object, rather than a stream of objects (default: true)
- `format`: the format to return a response in. Currently the only accepted value is `json`
- `options`: additional model parameters listed in the documentation for the Modelfile such as `temperature`
- `system`: system message to (overrides what is defined in the `Modelfile`)
- `template`: the prompt template to use (overrides what is defined in the `Modelfile`)
- `keep_alive`: controls how long the model will stay loaded into memory following the request (default: `5m`)

### Message Format

The `messages` parameter is an array of message objects with the following fields:

- `role`: the role of the message, either `system`, `user`, `assistant`, or `tool`
- `content`: the content of the message
- `images` (optional): a list of images to include in the message (for multimodal models)
- `tool_calls` (optional): a list of tools the model wants to use

### Examples

#### Chat Request (Streaming)

##### Request

```shell
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [
    {
      "role": "user",
      "content": "why is the sky blue?"
    }
  ]
}'
```

##### Response

A stream of JSON objects is returned:

```json
{
  "model": "llama3.2",
  "created_at": "2023-08-04T08:52:19.385406455-07:00",
  "message": {
    "role": "assistant",
    "content": "The"
  },
  "done": false
}
```

Final response:

```json
{
  "model": "llama3.2",
  "created_at": "2023-08-04T19:22:45.499127Z",
  "done": true,
  "total_duration": 4883583458,
  "load_duration": 1334875,
  "prompt_eval_count": 26,
  "prompt_eval_duration": 342546000,
  "eval_count": 282,
  "eval_duration": 4535599000
}
```

#### Chat Request (No Streaming)

##### Request

```shell
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [
    {
      "role": "user",
      "content": "why is the sky blue?"
    }
  ],
  "stream": false
}'
```

##### Response

```json
{
  "model": "llama3.2",
  "created_at": "2023-12-12T14:13:43.416799Z",
  "message": {
    "role": "assistant",
    "content": "Hello! How are you today?"
  },
  "done": true,
  "total_duration": 5191566416,
  "load_duration": 2154458,
  "prompt_eval_count": 26,
  "prompt_eval_duration": 383809000,
  "eval_count": 298,
  "eval_duration": 4799921000
}
```

#### Chat Request with History

##### Request

```shell
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [
    {
      "role": "user",
      "content": "why is the sky blue?"
    },
    {
      "role": "assistant",
      "content": "due to rayleigh scattering."
    },
    {
      "role": "user",
      "content": "how is that different than mie scattering?"
    }
  ]
}'
```

#### Chat Request with Options

##### Request

```shell
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [
    {
      "role": "user",
      "content": "why is the sky blue?"
    }
  ],
  "options": {
    "temperature": 0
  },
  "stream": false
}'
```

### JSON mode

You can force a model to respond in JSON format by specifying `format` as `json`.

```shell
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [
    {
      "role": "user",
      "content": "What color is the sky at different times of the day? Respond using JSON"
    }
  ],
  "format": "json",
  "stream": false
}'
```

### Tool Calling

> Note: Tool calling is currently an experimental feature in Ollama and subject to change.

Tool calling allows a model to call external tools or functions to extend its capabilities. Models that support tool calling can invoke functions you define.

#### Example with Tools

```shell
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [
    {
      "role": "user",
      "content": "What is the weather today in Paris?"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_current_weather",
        "description": "Get the current weather for a location",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "The location to get the weather for, e.g. San Francisco, CA"
            },
            "format": {
              "type": "string",
              "description": "The format to return the weather in, e.g. fahrenheit, celsius",
              "enum": ["fahrenheit", "celsius"]
            }
          },
          "required": ["location", "format"]
        }
      }
    }
  ]
}'
```

### Important Notes

1. **Streaming is Default**: By default, responses are streamed. Set `stream: false` for a single response.

2. **Message Roles**: Messages can have roles of `system`, `user`, `assistant`, or `tool`.

3. **Model Loading**: Models stay loaded for 5 minutes by default after the last request. This can be configured with `keep_alive`.

4. **Response Format**: When streaming, each chunk contains partial content. The final chunk has `done: true` and includes timing statistics.

5. **Tool Support**: Tool calling is experimental and not all models support it. Check model capabilities before using tools.