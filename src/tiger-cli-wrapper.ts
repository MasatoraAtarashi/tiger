#!/usr/bin/env node
import { tigerChat } from './tiger';
import { Logger } from './logger';

// コマンドライン引数を取得
const userInput = process.argv[2];
const skipConfirmation = process.argv[3] === 'true';

if (!userInput) {
  console.error('Usage: tiger-cli-wrapper <input> [skipConfirmation]');
  process.exit(1);
}

const logger = new Logger();

// ログを標準出力に送信するカスタムロガー
const customLogger = {
  log: (entry: any) => {
    logger.log(entry);

    // 特定のログのみを親プロセスに送信
    if (['tool', 'exec', 'success', 'error'].includes(entry.type)) {
      console.log(`LOG:${JSON.stringify({
        type: entry.type,
        message: entry.message
      })}`);
    }
  }
};

async function main() {
  try {
    const result = await tigerChat(userInput, customLogger as any, skipConfirmation);

    // 結果を親プロセスに送信
    console.log(`RESPONSE:${JSON.stringify({
      response: result.response,
      requiresConfirmation: result.requiresConfirmation,
      contextInfo: result.contextInfo
    })}`);

    logger.close();
  } catch (error: any) {
    console.error(error.message);
    logger.close();
    process.exit(1);
  }
}

main();