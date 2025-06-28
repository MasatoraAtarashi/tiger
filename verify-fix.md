# Tiger CLI 修正確認

## 修正内容

### 1. UIレンダリング問題の修正
- `Static`コンポーネントを使用してヘッダーとフッターを固定化
- React.memoを各コンポーネントに適用
- ストリーミング更新の頻度を制限（3チャンクごと）

### 2. ツール呼び出し認識の修正
- `</tool_use>`タグが欠けている場合の処理を改善
- 正規表現を改善してマルチラインのツール呼び出しに対応

### 3. ストリーミング完了の修正
- `done`イベントが確実に送信されるように修正

## 動作確認手順

1. ターミナル1でOllamaを起動
```bash
ollama serve
```

2. ターミナル2でTigerを起動
```bash
npm run dev -- --no-logo
```

3. 以下のテストを実行
- シンプルな挨拶: "Hello"
- ファイル読み取り: "Read package.json"
- コード生成: "Create a simple hello.py file that prints Hello, World!"

## 期待される動作

1. **UIの安定性**
   - 文字入力時に画面全体が再描画されない
   - "TIGER CONSOLE"が重複表示されない

2. **ツール実行**
   - LLMがツールを正しく呼び出す
   - ツール実行結果が表示される

3. **ストリーミング**
   - レスポンスが順次表示される
   - "Tiger is hunting for answers..."が終了後に消える