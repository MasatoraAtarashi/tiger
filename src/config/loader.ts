import { promises as fs } from 'fs';
import { homedir } from 'os';
import path from 'path';

import { TigerConfig } from './types.js';

const DEFAULT_CONFIG: TigerConfig = {
  llm: {
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'llama3',
  },
  temperature: 0.7,
  systemPrompt: 'You are Tiger, a helpful coding assistant powered by a local LLM.',
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

    // 設定ファイルの検索優先順位
    const configPaths = [
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
        continue;
      }
    }

    // 設定ファイルが見つからない場合はデフォルト設定を使用
    this.config = DEFAULT_CONFIG;
    return this.config;
  }

  // 設定をマージ（深いマージ）
  private mergeConfig(defaultConfig: TigerConfig, userConfig: Partial<TigerConfig>): TigerConfig {
    return {
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
