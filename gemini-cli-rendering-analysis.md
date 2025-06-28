# gemini-cliのReact/Ink実装調査結果

## 概要
gemini-cliのReact/Ink実装を調査し、レンダリング最適化とちらつき防止の技術をまとめました。

## 主要な実装技術

### 1. Staticコンポーネントによる履歴管理

```tsx
// App.tsx
<Static
  key={staticKey}
  items={[
    <Box flexDirection="column" key="header">
      <Header terminalWidth={terminalWidth} />
      <Tips config={config} />
      {updateMessage && <UpdateNotification message={updateMessage} />}
    </Box>,
    ...history.map((h) => (
      <HistoryItemDisplay
        terminalWidth={mainAreaWidth}
        availableTerminalHeight={staticAreaMaxItemHeight}
        key={h.id}
        item={h}
        isPending={false}
        config={config}
      />
    )),
  ]}
>
  {(item) => item}
</Static>
```

- `Static`コンポーネントは過去の履歴を一度だけ描画し、再描画しない
- `staticKey`を使った明示的なリフレッシュ制御
- 端末をクリアして`staticKey`をインクリメントすることで、必要な時だけ再描画

### 2. コンテキストの分離によるレンダリング最適化

```tsx
// OverflowContext.tsx
const OverflowStateContext = createContext<OverflowState | undefined>(undefined);
const OverflowActionsContext = createContext<OverflowActions | undefined>(undefined);
```

- 状態とアクションを別々のコンテキストに分離
- `useMemo`を使った値のメモ化で不要な再レンダリングを防止

### 3. measureElementによる動的レイアウト調整

```tsx
// App.tsx
useEffect(() => {
  if (mainControlsRef.current) {
    const fullFooterMeasurement = measureElement(mainControlsRef.current);
    setFooterHeight(fullFooterMeasurement.height);
  }
}, [terminalHeight, consoleMessages, showErrorDetails]);

const availableTerminalHeight = useMemo(
  () => terminalHeight - footerHeight - staticExtraHeight,
  [terminalHeight, footerHeight],
);
```

- `measureElement`でコンポーネントの実際の高さを測定
- 利用可能な画面高さを動的に計算

### 4. React.memoによるコンポーネントの最適化

```tsx
// MarkdownDisplay.tsx
const RenderInline = React.memo(RenderInlineInternal);
const RenderCodeBlock = React.memo(RenderCodeBlockInternal);
const RenderListItem = React.memo(RenderListItemInternal);
export const MarkdownDisplay = React.memo(MarkdownDisplayInternal);
```

- 頻繁に使用されるレンダリングコンポーネントをメモ化

### 5. ストリーミング状態管理とちらつき防止

```tsx
// StreamingContext.tsx
export enum StreamingState {
  Idle = 'idle',
  Responding = 'responding',
  WaitingForConfirmation = 'waiting_for_confirmation',
}
```

- ストリーミング状態を管理し、適切なタイミングでのみ再描画
- `staticNeedsRefresh`フラグで再描画の必要性を管理

### 6. 端末サイズ変更のデバウンス処理

```tsx
// App.tsx
useEffect(() => {
  if (isInitialMount.current) {
    isInitialMount.current = false;
    return;
  }

  const handler = setTimeout(() => {
    setStaticNeedsRefresh(false);
    refreshStatic();
  }, 300);

  return () => {
    clearTimeout(handler);
  };
}, [terminalWidth, terminalHeight, refreshStatic]);
```

- 端末サイズ変更時に300msのデバウンスを適用
- 頻繁なリサイズによる再描画を防止

### 7. 高さ制約によるスクロール制御

```tsx
// ShowMoreLines.tsx
export const ShowMoreLines = ({ constrainHeight }: ShowMoreLinesProps) => {
  if (
    overflowState === undefined ||
    overflowState.overflowingIds.size === 0 ||
    !constrainHeight ||
    !(streamingState === StreamingState.Idle || 
      streamingState === StreamingState.WaitingForConfirmation)
  ) {
    return null;
  }
  // ...
};
```

- オーバーフロー状態を管理し、必要な時だけ「もっと見る」を表示

### 8. ツールメッセージの幅固定

```tsx
// ToolGroupMessage.tsx
<Box
  flexDirection="column"
  borderStyle="round"
  width="100%"  // 重要：Inkのレンダリングバグを防ぐため幅を固定
  marginLeft={1}
  borderDimColor={hasPending}
  borderColor={borderColor}
>
```

- 幅を100%に固定することで、頻繁な状態変更時のボーダー描画バグを防止

### 9. 長いコンテンツの切り詰め処理

```tsx
// ToolMessage.tsx
const MAXIMUM_RESULT_DISPLAY_CHARACTERS = 1000000;

if (resultDisplay.length > MAXIMUM_RESULT_DISPLAY_CHARACTERS) {
  resultDisplay = '...' + resultDisplay.slice(-MAXIMUM_RESULT_DISPLAY_CHARACTERS);
}
```

- 非常に長い出力をトランケートしてパフォーマンス問題を防止

## その他の重要な実装

### ターミナルサイズの監視

```tsx
// useTerminalSize.ts
export function useTerminalSize(): { columns: number; rows: number } {
  const [size, setSize] = useState({
    columns: (process.stdout.columns || 60) - TERMINAL_PADDING_X,
    rows: process.stdout.rows || 20,
  });

  useEffect(() => {
    function updateSize() {
      setSize({
        columns: (process.stdout.columns || 60) - TERMINAL_PADDING_X,
        rows: process.stdout.rows || 20,
      });
    }

    process.stdout.on('resize', updateSize);
    return () => {
      process.stdout.off('resize', updateSize);
    };
  }, []);

  return size;
}
```

### コンソールパッチング

```tsx
// ConsolePatcher.tsx
const patchConsoleMethod =
  (
    type: 'log' | 'warn' | 'error' | 'debug',
    originalMethod: (...args: unknown[]) => void,
  ) =>
  (...args: unknown[]) => {
    if (debugMode) {
      originalMethod.apply(console, args);
    }

    if (type !== 'debug' || debugMode) {
      onNewMessage({
        type,
        content: formatArgs(args),
        count: 1,
      });
    }
  };
```

## ちらつき防止の主要な工夫

1. **constrainHeight制御**
   - ユーザー入力時に自動的に高さ制約モードに戻る
   - Ctrl+Sで一時的に制約を解除可能

2. **ストリーミング状態管理**
   - `StreamingState.Idle`時のみ静的コンテンツをリフレッシュ
   - 応答中は不要な再描画を抑制

3. **コンポーネントのメモ化**
   - React.memoで頻繁に使用されるコンポーネントをメモ化

4. **幅の固定**
   - Inkのレンダリングバグ回避のため幅を100%に固定

## まとめ

gemini-cliは以下の最適化により、大量のコンテンツとストリーミング応答を扱いながら、スムーズでちらつきのないCLI体験を提供しています：

- 過去の履歴の不要な再描画を防止
- ストリーミング中の適切なレンダリング制御
- 端末サイズ変更時のちらつき防止
- 大量のコンテンツでもスムーズな表示

これらの技術は、React/InkでCLIツールを作る際の重要な参考になります。