import { z } from 'zod';

// シンプルなツール定義
const echoToolDefinition = {
  id: 'echo',
  description: 'Echo back the input message',
  inputSchema: z.object({
    message: z.string().describe('The message to echo')
  }),
  outputSchema: z.object({
    echoed: z.string()
  }),
  execute: async (input: { message: string }) => {
    console.log(`Echo tool called with: ${input.message}`);
    return { echoed: input.message };
  }
};

async function main() {
  console.log('Testing echo tool implementation...');

  // ツール定義の確認
  console.log('Tool ID:', echoToolDefinition.id);
  console.log('Tool Description:', echoToolDefinition.description);

  // 入力のバリデーション
  const input = { message: 'Hello from echo tool!' };
  const validatedInput = echoToolDefinition.inputSchema.parse(input);
  console.log('Validated input:', validatedInput);

  // ツールの実行
  const result = await echoToolDefinition.execute(validatedInput);
  console.log('Tool result:', result);

  // 出力のバリデーション
  const validatedOutput = echoToolDefinition.outputSchema.parse(result);
  console.log('Validated output:', validatedOutput);
}

main().catch(console.error);