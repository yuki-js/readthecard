# 開発ガイド

## セットアップ

### 前提条件

- Node.js 22以上
- npm 10以上
- PC/SCライブラリ（Linuxの場合: `pcscd`, `libpcsclite-dev`）
- 日本語フォント（例: `fonts-noto-cjk`）

### インストール

```bash
# jsapduをクローン・ビルド・パック
./scripts/setup-jsapdu.sh

# 依存関係インストール
npm install

# ビルド
npm run build
```

### 開発サーバー起動

```bash
# バックエンド起動（フロントエンドもホスト）
cd packages/backend
npm run dev
```

ブラウザで http://localhost:3000 にアクセス。

## モックモード

PC/SCライブラリがない環境やテスト時には、モックモードを使用できます。

```bash
USE_MOCK_PLATFORM=true npm run dev
```

モックは以下の動作をシミュレートします：

- カード検出待機
- PIN検証（正しいPIN: "1234"）
- 基本4情報読み取り

## jsapdu-over-ip

### 概要

`jsapdu-over-ip`は、ブラウザからサーバーサイドのPC/SCにアクセスするためのブリッジです。

### Transport Agnostic設計

```typescript
// クライアント側
const transport = new FetchClientTransport("/api/jsapdu/rpc");
const platform = new RemoteSmartCardPlatform(transport);

// サーバー側
const adapter = new SmartCardPlatformAdapter(realPlatform);
app.post("/api/jsapdu/rpc", async (c) => {
  const response = await adapter.handleRequest(await c.req.json());
  return c.json(response);
});
```

### クラス継承構造

```
SmartCardPlatform (jsapdu-interface)
    └── RemoteSmartCardPlatform (jsapdu-over-ip)

SmartCardDevice (jsapdu-interface)
    └── RemoteSmartCardDevice (jsapdu-over-ip)

SmartCard (jsapdu-interface)
    └── RemoteSmartCard (jsapdu-over-ip)
```

## CI/CD

### GitHub Actions

- `copilot-setup-steps.yml`: Copilot Agent環境セットアップ
- `ci.yml`: ビルド・テストパイプライン

### キャッシュ戦略

以下をキャッシュして高速化：

- `~/.npm`: npmキャッシュ
- `node_modules/.cache/turbo`: Turborepoキャッシュ
- `local-packages/`: jsapduパッケージ
- `voicevox_core/`: VOICEVOX Coreバイナリ

## VOICEVOX Core統合

### 概要

VOICEVOX Coreは、C FFI経由で音声合成を行います。`koffi`ライブラリを使用。

### 使用方法

```typescript
import koffi from 'koffi';

// ライブラリロード
const lib = koffi.load('voicevox_core.dll'); // or .so

// 関数定義
const voicevox_initialize = lib.func('voicevox_initialize', 'int32', [...]);
```

### 注意事項

- Windows: `voicevox_core.dll`
- Linux: `libvoicevox_core.so`
- ずんだもんのspeaker_id: 3

## コーディング規約

### TypeScript

- 厳格な型チェック（`strict: true`）
- async/awaitを使用
- エラーは適切にハンドリング

### React Native Web

- `View`, `Text`, `TextInput`, `Pressable`を使用
- `StyleSheet.create()`でスタイル定義
- CSSファイルは使用しない

### コミットメッセージ

```
<type>: <description>

例:
feat: Add big red bold name display
fix: Fix Japanese font rendering
docs: Add architecture documentation
```

## トラブルシューティング

### PC/SCライブラリが見つからない

```bash
# Ubuntu/Debian
sudo apt install pcscd libpcsclite-dev

# Fedora
sudo dnf install pcsc-lite pcsc-lite-devel
```

### 日本語が表示されない

```bash
# Ubuntu/Debian
sudo apt install fonts-noto-cjk
```

### jsapduのビルドが失敗する

```bash
# 一時ディレクトリをクリーンアップして再実行
rm -rf local-packages/
./scripts/setup-jsapdu.sh
```
