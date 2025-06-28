# Gemini CLI 調査レポート

## 概要
Gemini CLIは、Google Gemini APIを使用したCLI型のコーディングエージェントです。本レポートでは、Tigerプロジェクトの参考として、Gemini CLIの設計と実装を詳細に調査しました。

## 技術スタック

### フロントエンド（CLI）
- **Node.js**: v18以上
- **TypeScript**: 型安全な開発
- **React + Ink** (v6.0.1): ターミナルUIフレームワーク
  - ink-big-text: 大きなテキスト表示（起動時のロゴ等）
  - ink-gradient: グラデーション表示
  - ink-spinner: ローディング表示
  - ink-select-input: インタラクティブな選択UI
  - ink-text-input: テキスト入力UI
- **highlight.js/lowlight**: コードのシンタックスハイライト
- **yargs**: コマンドラインパーサー

### バックエンド（Core）
- **@google/genai**: Gemini API公式クライアント
- **@modelcontextprotocol/sdk**: MCP（Model Context Protocol）サポート
- **OpenTelemetry**: テレメトリ・監視
- **simple-git**: Git操作
- **glob/micromatch**: ファイルパターンマッチング

## アーキテクチャ

### モノレポ構造
```
gemini-cli/
├── packages/
│   ├── cli/      # ユーザーインターフェース層
│   └── core/     # ビジネスロジック層
```

### レイヤー分離の利点
1. **関心の分離**: UIとビジネスロジックの明確な分離
2. **再利用性**: Coreパッケージは他のUIからも利用可能
3. **テスタビリティ**: 各層を独立してテスト可能
4. **拡張性**: 新しいUIやツールを追加しやすい

## 主要コンポーネント

### CLI Package
- **UI Components**: Reactベースのコンポーネント群
- **Theme System**: 複数のカラーテーマ対応
- **Configuration**: 設定管理システム
- **History**: 履歴管理機能

### Core Package
- **Tool Engine**: ツール実行エンジン
- **Session Management**: セッション状態管理
- **API Client**: Gemini APIとの通信
- **Telemetry**: 使用状況の追跡

## ツールシステム

### ツールインターフェース
```typescript
interface Tool<TParams, TResult> {
  name: string;
  displayName: string;
  description: string;
  schema: FunctionDeclaration;
  isOutputMarkdown: boolean;
  canUpdateOutput: boolean;
  
  validateParams(params: TParams): boolean;
  shouldConfirmExecute(params: TParams): boolean;
  execute(params: TParams): AsyncGenerator<TResult>;
}
```

### 実装されているツール
1. **ファイル操作**
   - read-file: ファイル読み取り
   - write-file: ファイル書き込み
   - edit: ファイル編集
   - ls: ディレクトリ一覧
   - glob: パターン検索
   - grep: 内容検索

2. **シェル実行**
   - shell: コマンド実行（サンドボックス対応）

3. **Web機能**
   - web-fetch: Webページ取得
   - web-search: Web検索

4. **メモリ**
   - memory: 永続的な情報保存

5. **拡張機能**
   - MCP: 外部ツールとの統合

## 特徴的な実装

### 1. リッチなターミナルUI
- React/Inkによるインタラクティブな体験
- 複数のカラーテーマ
- プログレス表示とスピナー
- コードのシンタックスハイライト

### 2. 安全性への配慮
- ツール実行前の確認プロンプト
- Dockerサンドボックスサポート
- ファイル操作の制限

### 3. 拡張性
- MCPプロトコルによる外部ツール統合
- プラグインアーキテクチャ

### 4. 開発者体験
- TypeScriptによる型安全性
- 詳細なテレメトリ
- エラーハンドリング

## Tigerプロジェクトへの応用

### 採用すべき要素
1. **モノレポ構造**: CLI/Coreの分離
2. **React/Ink**: リッチなターミナルUI
3. **ツールシステム**: 拡張可能なツールインターフェース
4. **TypeScript**: 型安全な開発

### ローカルLLM対応での差別化
1. **LLMインターフェース**: Gemini API部分をローカルLLM（Ollama等）に置き換え
2. **レスポンス速度**: ローカル実行による低レイテンシ
3. **プライバシー**: データがローカルに留まる
4. **カスタマイズ性**: モデルの選択やファインチューニング

### 実装の優先順位
1. **Phase 1**: 基本的なCLI構造とReact/Inkセットアップ
2. **Phase 2**: ローカルLLMとの統合
3. **Phase 3**: 基本的なツール実装（ファイル操作、シェル実行）
4. **Phase 4**: 高度な機能（メモリ、Web検索等）

## まとめ
Gemini CLIは非常に洗練されたアーキテクチャを持っており、Tigerプロジェクトの良い参考になります。特にUI/Coreの分離、React/Inkの活用、拡張可能なツールシステムは、そのまま採用する価値があります。ローカルLLMの特性を活かした独自の機能を追加することで、差別化されたツールを作ることができるでしょう。