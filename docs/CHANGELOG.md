# 開発履歴

このドキュメントは、readthecardプロジェクトのブートストラップ過程を記録しています。

## 2024年12月 - 初期ブートストラップ

### Phase 1: モノレポ構築

- npm workspacesとTurborepoでモノレポを構築
- 3つのパッケージを作成:
  - `packages/frontend` - React Native Webフロントエンド
  - `packages/backend` - Node.jsバックエンド
  - `packages/jsapdu-over-ip` - jsapduプロキシ

### Phase 2: jsapdu統合

jsapduはnpmに公開されていないため、ローカルでビルドして使用する設計を採用。

1. `scripts/setup-jsapdu.sh`を作成
2. OSの一時ディレクトリ（`mktemp -d`）でビルド
3. tgzファイルを`local-packages/`に配置
4. `package.json`で`file:`プロトコルで参照

### Phase 3: jsapdu-over-ip開発

#### 最初のアプローチ（却下）

- 独自APIで実装
- 問題: jsapduのインターフェースと異なる

#### 最終アプローチ

- `@aokiapp/jsapdu-interface`の抽象クラスを継承
- Transport Agnostic設計で柔軟性を確保
- 完全なプロキシとして実装

クラス名の変遷:

- `SmartCardPlatformProxy` → `RemoteSmartCardPlatform`
- `SmartCardDeviceProxy` → `RemoteSmartCardDevice`
- `SmartCardProxy` → `RemoteSmartCard`

### Phase 4: フロントエンド

#### フレームワーク変遷

1. 最初: 素のReact + CSS
2. 最終: React Native Web + StyleSheet

#### コンポーネント設計

- `CardManager`: ViewModelパターンでReactのライフサイクルから分離
- `useJsapdu`フック → 却下（Reactとの相性が悪い）

### Phase 5: バックエンド

#### フレームワーク変遷

- Express → Hono v4.6.20
- 理由: TypeScriptファースト、高速、モダン

#### 機能

- フロントエンドアセットのホスト
- jsapdu RPCエンドポイント
- VOICEVOX Core音声合成

### Phase 6: UI/UX改善

- 氏名を大きく赤字太字で表示（96px, #FF0000）
- ずんだもん挨拶: 「○○さん、こんにちわなのだ！」

### Phase 7: CI/CD

- `copilot-setup-steps.yml`: 環境セットアップ
- `ci.yml`: ビルドパイプライン
- 積極的なキャッシュ戦略

## 技術的決定のログ

### Express vs Hono

| 観点           | Express | Hono         |
| -------------- | ------- | ------------ |
| TypeScript     | 後付け  | ファースト   |
| パフォーマンス | 標準    | 10倍以上高速 |
| サイズ         | 大きい  | 軽量         |
| 設計           | 古い    | モダン       |

**結論**: Hono v4.6.20を採用

### React Hook vs ViewModel

| 観点           | useJsapdu Hook | CardManager Class |
| -------------- | -------------- | ----------------- |
| Reactとの結合  | 強い           | 弱い              |
| ライフサイクル | React依存      | 独立              |
| テスト容易性   | 低い           | 高い              |
| 手続き的処理   | 困難           | 容易              |

**結論**: CardManagerクラスを採用

### プロキシ命名

| 案             | 例                      | 評価 |
| -------------- | ----------------------- | ---- |
| Suffixプロキシ | SmartCardPlatformProxy  | 長い |
| Prefixリモート | RemoteSmartCardPlatform | 明確 |

**結論**: `Remote*`プレフィックスを採用

## 学んだ教訓

1. **jsapduとReactの相性**: オブジェクトモデルとライフサイクルの違いから、直接統合は避けるべき
2. **Transport Agnostic**: 将来的なWebSocket対応などを見据えた設計が重要
3. **モックの重要性**: 開発・テスト環境でPC/SCなしでも動作確認できるように
4. **一時ディレクトリの活用**: ビルドキャッシュの汚染を防ぐ
