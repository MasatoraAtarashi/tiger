export enum ErrorCode {
  // Tool errors
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_VALIDATION_FAILED = 'TOOL_VALIDATION_FAILED',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',
  
  // LLM errors
  LLM_CONNECTION_FAILED = 'LLM_CONNECTION_FAILED',
  LLM_RESPONSE_PARSE_FAILED = 'LLM_RESPONSE_PARSE_FAILED',
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_RATE_LIMIT = 'LLM_RATE_LIMIT',
  
  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  
  // Configuration errors
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_INVALID = 'CONFIG_INVALID',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorContext {
  [key: string]: unknown;
}

export class TigerError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: ErrorContext;
  public readonly isRetryable: boolean;
  public readonly originalError?: Error;

  constructor(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    originalError?: Error,
    isRetryable = false
  ) {
    super(message);
    this.name = 'TigerError';
    this.code = code;
    this.context = context;
    this.originalError = originalError;
    this.isRetryable = isRetryable;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TigerError);
    }
  }

  static fromError(error: unknown, code = ErrorCode.UNKNOWN_ERROR): TigerError {
    if (error instanceof TigerError) {
      return error;
    }

    if (error instanceof Error) {
      return new TigerError(
        code,
        error.message,
        { originalError: error.name },
        error
      );
    }

    return new TigerError(
      code,
      'An unknown error occurred',
      { error: String(error) }
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      isRetryable: this.isRetryable,
      stack: this.stack,
    };
  }
}

// Specific error classes
export class ToolError extends TigerError {
  constructor(
    code: ErrorCode,
    message: string,
    toolName: string,
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(
      code,
      message,
      { ...context, toolName },
      originalError,
      code === ErrorCode.TOOL_TIMEOUT
    );
    this.name = 'ToolError';
  }
}

export class LLMError extends TigerError {
  constructor(
    code: ErrorCode,
    message: string,
    provider: string,
    model?: string,
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(
      code,
      message,
      { ...context, provider, model },
      originalError,
      code === ErrorCode.LLM_TIMEOUT || code === ErrorCode.LLM_RATE_LIMIT
    );
    this.name = 'LLMError';
  }
}

export class FileSystemError extends TigerError {
  constructor(
    code: ErrorCode,
    message: string,
    path: string,
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(
      code,
      message,
      { ...context, path },
      originalError,
      false
    );
    this.name = 'FileSystemError';
  }
}

export class ConfigError extends TigerError {
  constructor(
    code: ErrorCode,
    message: string,
    configPath?: string,
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(
      code,
      message,
      { ...context, configPath },
      originalError,
      false
    );
    this.name = 'ConfigError';
  }
}