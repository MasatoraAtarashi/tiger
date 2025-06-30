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

# ファイルを含めてメッセージを送信
> このコードをレビューして @src/index.js @package.json

# 過去の会話履歴を確認
> /history 20
> /history search エラー
> /history -v
```

### 実装されている機能

#### ファイル操作ツール
- 📁 **ls** - ディレクトリの内容を一覧表示
- 📄 **read_file** - ファイルの内容を読み取り
- ✏️ **write_file** - ファイルへの書き込み
- 🔍 **grep** - ファイル内のパターン検索
- 🎯 **glob** - グロブパターンでファイル検索

#### 実行・システムツール
- 🔧 **shell** - シェルコマンドの実行
- 🌐 **web_fetch** - URLからコンテンツを取得
- 💾 **memory** - メモリへの保存・取得

#### タスク管理ツール
- 📋 **plan_task** - 複数ステップのタスクプランを作成
- ▶️ **execute_plan** - タスクプランの実行
- ✅ **complete_step** - ステップの完了マーク
- 📊 **get_plan_status** - タスクプランの状態確認
- 🎯 **complete** - タスク完了の報告

#### スラッシュコマンド
- **/help** - 利用可能なコマンドを表示
- **/clear** - 会話をクリア
- **/quit** - Tigerを終了
- **/history [count]** - 最近のチャット履歴を表示（デフォルト: 10件）
- **/history search <query>** - チャット履歴を検索
- **/history clear** - チャット履歴をクリア
- **/history -v** - 詳細な履歴（使用ツール含む）を表示
- **/memory [user|project]** - メモリファイルを編集
- **/init** - プロジェクトメモリを初期化
- **/status** - 現在のステータスを表示
- **/model** - 使用中のモデルを表示

#### その他の機能
- 📎 **@ファイル指定** - メッセージに`@filename`でファイル内容を含める
- 📜 **チャット履歴** - 過去の会話履歴を保存・検索（~/.tiger/history.json）
- 🧠 プロジェクト・ユーザーレベルのメモリ管理（TIGER.md）
- 📝 詳細なログ記録（~/.tiger/logs/）
- 🎨 カラフルなインタラクティブUI
- ⚡ リアルタイムストリーミング応答

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