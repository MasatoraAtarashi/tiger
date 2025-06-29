import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TigerConfig {
  logDir: string;
  logEnabled: boolean;
  logLevel: 'info' | 'debug' | 'error';
}

const DEFAULT_CONFIG: TigerConfig = {
  logDir: path.join(os.homedir(), '.tiger', 'logs'),
  logEnabled: true,
  logLevel: 'info'
};

const CONFIG_FILE_PATH = path.join(os.homedir(), '.tiger', 'config.json');

export function loadConfig(): TigerConfig {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const userConfig = JSON.parse(configData);
      return { ...DEFAULT_CONFIG, ...userConfig };
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  
  return DEFAULT_CONFIG;
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