import { Logger } from './logger';

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export async function callOllamaAPI(
  prompt: string,
  model: string = 'llama3.2:3b',
  logger?: Logger
): Promise<string> {
  try {
    if (logger) {
      logger.log({
        timestamp: new Date().toISOString(),
        type: 'ollama_call',
        message: `Calling Ollama API with model ${model}`,
        metadata: { promptLength: prompt.length, model }
      });
    }

    const response = await global.fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as OllamaResponse;

    if (logger) {
      logger.log({
        timestamp: new Date().toISOString(),
        type: 'ollama_response',
        message: 'Received Ollama API response',
        metadata: {
          responseLength: data.response.length,
          response: data.response.substring(0, 500) + (data.response.length > 500 ? '...' : '')
        }
      });
    }

    return data.response;
  } catch (error: any) {
    if (logger) {
      logger.log({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: 'Ollama API call failed',
        metadata: { error: error.message }
      });
    }

    // Ollamaが起動していない場合
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      throw new Error('Ollama is not running. Please start Ollama first with: ollama serve');
    }

    throw error;
  }
}