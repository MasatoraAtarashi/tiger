# Tiger 🐯

ローカルLLMを使用したCLIベースのコーディングアシスタント。Tigerは、プライバシーと低遅延を確保しながら、あなたのマシン上で動作するモデルを使ってプログラミングタスクをサポートします。

## 機能

- 🤖 **ローカルLLM統合** - ローカルモデル実行のためにOllamaを使用
- 🔧 **ツールシステム** - 拡張可能なツールアーキテクチャ（ファイル読み取り、コード実行など）
- 🌊 **ストリーミングレスポンス** - より良いユーザーエクスペリエンスのためのリアルタイムストリーミング
- 🎨 **リッチなターミナルUI** - ReactとInkで構築された美しいインターフェース
- 🔌 **プラガブルアーキテクチャ** - 新しいLLMプロバイダーやツールを簡単に追加可能
- 🛡️ **プライバシーファースト** - すべての処理があなたのマシン上でローカルに実行

## 前提条件

- Node.js 18以上
- [Ollama](https://ollama.ai/)がインストールされ実行されていること
- ローカルLLMモデル（例：llama3、codellama、mistral）

## インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/tiger.git
cd tiger

# 依存関係をインストール
npm install

# プロジェクトをビルド
npm run build
```

## クイックスタート

1. **Ollamaを起動**（まだ実行していない場合）：

   ```bash
   ollama serve
   ```

2. **モデルをプル**（まだしていない場合）：

   ```bash
   ollama pull llama3
   ```

3. **Tigerを実行**：
   ```bash
   npm run dev
   ```

## 設定

Tigerは`.tigerrc.json`ファイルを使用して設定できます。設定は以下の場所で検索されます（順番に）：

1. `./.tigerrc.json`（カレントディレクトリ）
2. `./tiger.config.json`（カレントディレクトリ）
3. `~/.tiger/config.json`（ホームディレクトリ）
4. `~/.tigerrc.json`（ホームディレクトリ）

### 設定オプション

```json
{
  "llm": {
    "type": "ollama",
    "baseUrl": "http://localhost:11434",
    "defaultModel": "llama3"
  },
  "temperature": 0.7,
  "maxTokens": 2048,
  "systemPrompt": "You are Tiger, a helpful coding assistant.",
  "enabledTools": ["read_file"],
  "options": {
    "streamByDefault": true,
    "debug": false,
    "timeout": 30000
  }
}
```

### 設定フィールド

#### LLMプロバイダー設定（`llm`）

- `type`: 使用するLLMプロバイダー。現在サポート：
  - `"ollama"` - Ollamaローカルモデル
  - 将来的にサポート予定：`"openai"`、`"anthropic"`、`"gemini"`
- `baseUrl`: LLM APIのベースURL（Ollamaのデフォルト：`"http://localhost:11434"`）
- `defaultModel`: 使用するデフォルトモデル（デフォルト：`"llama3"`）

#### モデルパラメータ

- `temperature`: レスポンスのランダム性を制御（0.0-1.0、デフォルト：0.7）
- `maxTokens`: レスポンスの最大トークン数（オプション）
- `systemPrompt`: Tigerの動作を定義するシステムプロンプト

#### ツール

- `enabledTools`: 有効なツール名の配列。利用可能なツール：
  - `"read_file"` - ローカルファイルを読む
  - さらに多くのツールが近日公開！

#### オプション

- `streamByDefault`: ストリーミングレスポンスを有効化（デフォルト：true）
- `debug`: 内部操作を見るためのデバッグモードを有効化（デフォルト：false）
- `timeout`: リクエストタイムアウト（ミリ秒）（デフォルト：30000）

## 設定例

### より良いコード生成のためのCodeLlamaの使用

```json
{
  "llm": {
    "type": "ollama",
    "defaultModel": "codellama"
  },
  "temperature": 0.3,
  "systemPrompt": "You are Tiger, an expert programming assistant specialized in writing clean, efficient code."
}
```

### 高い温度でMistralを使用

```json
{
  "llm": {
    "type": "ollama",
    "defaultModel": "mistral"
  },
  "temperature": 0.9,
  "maxTokens": 4096
}
```

### 開発用デバッグモード

```json
{
  "llm": {
    "type": "ollama",
    "defaultModel": "llama3"
  },
  "options": {
    "debug": true,
    "streamByDefault": false
  }
}
```

## デバッグモード

Tigerが裏で何をしているかを見るためにデバッグモードを有効にします：

```json
{
  "options": {
    "debug": true
  }
}
```

または環境変数を設定：

```bash
TIGER_DEBUG=true npm run dev
```

デバッグモードで表示される内容：

- LLM APIリクエストとレスポンス
- ツール実行の詳細
- トークン使用統計
- 設定読み込み情報
- エラーの詳細とスタックトレース

## コマンドラインオプション

```bash
tiger [options]

オプション：
  --debug, -d     デバッグモードを有効化
  --no-logo       起動時のロゴをスキップ
```

## 利用可能なコマンド

Tiger内で：

- メッセージを入力してEnterを押して送信
- `/exit`または`/quit` - Tigerを終了
- `Ctrl+C` - 強制終了

## サポートされているモデル

TigerはOllamaで利用可能なすべてのモデルで動作します。人気の選択肢：

- **llama3** - 汎用、良いバランス
- **codellama** - コード生成に最適化
- **mistral** - 高速で効率的
- **mixtral** - より大きく、より高性能なモデル
- **phi** - 小さいが有能なモデル

モデルをプル：

```bash
ollama pull <model-name>
```

## 開発

```bash
# 開発モードで実行
npm run dev

# テストを実行
npm test

# コードをリント
npm run lint

# コードをフォーマット
npm run format

# プロダクション用にビルド
npm run build
```

## アーキテクチャ

Tigerはモジュラーアーキテクチャを使用：

```
src/
├── llm/           # LLMプロバイダーインターフェースと実装
├── tools/         # 機能を拡張するためのツールシステム
├── core/          # コアチャットと会話管理
├── config/        # 設定の読み込みと管理
├── components/    # React/Ink UIコンポーネント
└── hooks/         # 状態管理のためのReactフック
```

## トラブルシューティング

### 「Ollamaに接続できません」

- Ollamaが実行されていることを確認：`ollama serve`
- Ollamaがアクセス可能か確認：`curl http://localhost:11434/api/version`
- 設定のbaseUrlを確認

### 「モデルが見つかりません」

- まずモデルをプル：`ollama pull <model-name>`
- 利用可能なモデルをリスト：`ollama list`

### パフォーマンスの問題

- `phi`や`llama3`のような小さいモデルを試す
- 設定で`maxTokens`を減らす
- `"streamByDefault": false`でストリーミングを無効化

## コントリビューション

貢献を歓迎します！プルリクエストをお気軽に送信してください。

## ライセンス

MIT

## 謝辞

- [Claude Code](https://github.com/anthropics/claude-code)と[Gemini CLI](https://github.com/google/gemini-cli)にインスパイアされています
- ターミナルUIに[Ink](https://github.com/vadimdemedes/ink)を使用
- ローカルLLM実行に[Ollama](https://ollama.ai/)を使用