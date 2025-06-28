export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: unknown;
}

export interface ToolSchema {
  name: string;
  displayName: string;
  description: string;
  parameters: ToolParameter[];
}

export interface Tool<TParams = unknown, TResult = unknown> {
  schema: ToolSchema;
  
  // ツールの実行前にパラメータを検証
  validateParams(params: TParams): boolean;
  
  // ユーザーに実行確認が必要かどうか
  shouldConfirmExecute(params: TParams): boolean;
  
  // ツールの実行
  execute(params: TParams): AsyncGenerator<TResult, void, unknown>;
}

export interface ToolExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ツールのレジストリ
export interface ToolRegistry {
  register(tool: Tool): void;
  get(name: string): Tool | undefined;
  list(): ToolSchema[];
}