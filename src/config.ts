import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TigerConfig {
  logDir: string;
  logEnabled: boolean;
  logLevel: 'info' | 'debug' | 'error';
  model: string;
  timeout: number;
  maxIterations: number;
  temperature?: number;
  systemPrompt?: string;
}

const DEFAULT_CONFIG: TigerConfig = {
  logDir: path.join(os.homedir(), '.tiger', 'logs'),
  logEnabled: true,
  logLevel: 'info',
  model: 'llama3.2:3b',
  timeout: 60000,
  maxIterations: 10,
  temperature: 0.7
};

const CONFIG_FILE_PATH = path.join(os.homedir(), '.tiger', 'config.json');

export function loadConfig(): TigerConfig {
  // まず環境変数から設定を読み込む
  const envConfig: Partial<TigerConfig> = {};
  if (process.env.TIGER_MODEL) {
    envConfig.model = process.env.TIGER_MODEL;
  }
  if (process.env.TIGER_TIMEOUT) {
    envConfig.timeout = parseInt(process.env.TIGER_TIMEOUT, 10);
  }
  if (process.env.TIGER_MAX_ITERATIONS) {
    envConfig.maxIterations = parseInt(process.env.TIGER_MAX_ITERATIONS, 10);
  }
  if (process.env.TIGER_TEMPERATURE) {
    envConfig.temperature = parseFloat(process.env.TIGER_TEMPERATURE);
  }

  // 設定ファイルから読み込む
  let fileConfig = {};
  
  // .tigerrcファイルを優先的に探す
  const configPaths = [
    path.join(process.cwd(), '.tigerrc'),
    path.join(process.cwd(), '.tigerrc.json'),
    path.join(os.homedir(), '.tigerrc'),
    path.join(os.homedir(), '.tigerrc.json'),
    CONFIG_FILE_PATH
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf-8');
        fileConfig = JSON.parse(configData);
        break;
      }
    } catch (error) {
      console.error(`Error loading config from ${configPath}:`, error);
    }
  }
  
  // デフォルト設定、ファイル設定、環境変数の順で優先度を付けてマージ
  return { ...DEFAULT_CONFIG, ...fileConfig, ...envConfig };
}

export function saveConfig(config: Partial<TigerConfig>): void {
  const configDir = path.dirname(CONFIG_FILE_PATH);
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig, ...config };
  
  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(newConfig, null, 2));
}

export function ensureLogDirectory(config: TigerConfig): void {
  if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir, { recursive: true });
  }
}