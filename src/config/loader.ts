import { promises as fs } from 'fs';
import { homedir } from 'os';
import path from 'path';

import { DEFAULT_SYSTEM_PROMPT, DEFAULT_ENABLED_TOOLS } from './constants.js';
import { TigerConfig } from './types.js';

const DEFAULT_CONFIG: TigerConfig = {
  llm: {
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'gemma3:4b',
  },
  temperature: 0.7,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  enabledTools: DEFAULT_ENABLED_TOOLS,
  options: {
    streamByDefault: true,
    debug: false,
  },
};

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: TigerConfig | null = null;

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  async load(): Promise<TigerConfig> {
    if (this.config) {
      return this.config;
    }

    // 環境変数からデバッグモードを設定
    if (process.env['TIGER_DEBUG'] === 'true') {
      DEFAULT_CONFIG.options = {
        ...DEFAULT_CONFIG.options,
        debug: true,
      };
    }

    // 設定ファイルの検索優先順位
    const configPaths = [
      // 環境変数で指定されたパスを最優先
      ...(process.env['TIGER_CONFIG_PATH'] ? [path.resolve(process.env['TIGER_CONFIG_PATH'])] : []),
      path.join(process.cwd(), '.tigerrc.json'),
      path.join(process.cwd(), 'tiger.config.json'),
      path.join(homedir(), '.tiger', 'config.json'),
      path.join(homedir(), '.tigerrc.json'),
    ];

    for (const configPath of configPaths) {
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        const userConfig = JSON.parse(content) as Partial<TigerConfig>;
        this.config = this.mergeConfig(DEFAULT_CONFIG, userConfig);

        if (this.config.options?.debug) {
          console.log(`Loaded config from: ${configPath}`);
        }

        return this.config;
      } catch (error) {
        // ファイルが存在しない場合は次を試す
        if (error instanceof Error && !error.message.includes('ENOENT')) {
          console.warn(`Error loading config from ${configPath}:`, error.message);
        }
        continue;
      }
    }

    // 設定ファイルが見つからない場合はデフォルト設定を使用
    this.config = DEFAULT_CONFIG;
    return this.config;
  }

  // 設定をマージ（深いマージ）
  private mergeConfig(defaultConfig: TigerConfig, userConfig: Partial<TigerConfig>): TigerConfig {
    const mergedConfig = {
      ...defaultConfig,
      ...userConfig,
      llm: {
        ...defaultConfig.llm,
        ...userConfig.llm,
      },
      options: {
        ...defaultConfig.options,
        ...userConfig.options,
      },
    };

    // llm.defaultModelをconfig.defaultModelに設定（後方互換性）
    if (!mergedConfig.defaultModel && mergedConfig.llm.defaultModel) {
      mergedConfig.defaultModel = mergedConfig.llm.defaultModel;
    }

    // ユーザー設定でenabledToolsやsystemPromptが指定されていても、内部のデフォルト値を使用
    mergedConfig.enabledTools = DEFAULT_ENABLED_TOOLS;
    mergedConfig.systemPrompt = DEFAULT_SYSTEM_PROMPT;

    return mergedConfig;
  }

  // 設定をリロード
  async reload(): Promise<TigerConfig> {
    this.config = null;
    return this.load();
  }

  // 現在の設定を取得
  getConfig(): TigerConfig | null {
    return this.config;
  }
}
