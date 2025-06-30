# Tiger CLI 🐯

![Tiger CLI](https://raw.githubusercontent.com/MasatoraAtarashi/tiger/main/screenshot.png)

ローカルLLMを使用したパワフルなコーディングエージェント。自然言語でコーディングタスクを実行できます。

## 必要なもの

- Node.js 18以上
- [Ollama](https://ollama.ai/)（ローカルLLM実行環境）

## インストール

```bash
# Ollamaをインストール
curl -fsSL https://ollama.ai/install.sh | sh

# デフォルトのモデルをダウンロード
ollama pull llama3.2:3b

# Tigerをインストール
npm install -g @truetiger/tiger
```

## 使い方

```bash
# Tigerを起動
tiger

# 以下のような自然言語でタスクを指示できます：
> ファイルを一覧表示して
> package.jsonを読んで
> hello.txtというファイルを作成して
> npm testを実行して
```

### 主な機能

- 📁 ファイル操作（一覧表示、読み込み、作成、編集）
- 🔧 シェルコマンドの実行
- 🔍 ファイル検索
- 📝 自然言語でのコーディング支援

### 設定

`.tigerrc`ファイルで設定をカスタマイズできます：

```json
{
  "model": "llama3.2:3b",      // 使用するOllamaモデル
  "timeout": 60000,            // タイムアウト（ミリ秒）
  "maxIterations": 10          // 最大実行ステップ数
}
```

## ライセンス

MIT License