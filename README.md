# readthecard

マイナンバーカード読み取りアプリケーション

## 概要

Windows 11上で動作するマイナンバーカード（Mynacard）読み取りアプリケーションです。
React Native Webを使用したブラウザフロントエンドと、Node.js + Honoバックエンドで構成されるクライアント・サーバーモデルを採用しています。

## 機能

- 券面事項入力補助AP（Kenhojo AP）を使用した基本4情報（氏名、住所、生年月日、性別）の読み取り
- 4桁PIN入力による認証
- フルスクリーン表示
- VOICEVOX Core（ずんだもん）による読み上げ（「○○さん、こんにちわなのだ！」）
- 日本語UI
- 氏名を大きく赤字太字で中央表示

## 技術スタック

- **フロントエンド**: React Native Web (View, Text, TextInput, Pressable, StyleSheet)
- **バックエンド**: Node.js + Hono (v4.6.20)
- **カード通信**: [jsapdu](https://github.com/AokiApp/jsapdu)（PC/SC経由）
- **音声合成**: [VOICEVOX Core](https://github.com/VOICEVOX/voicevox_core)（ずんだもん、C FFI経由）
- **ビルドツール**: Turborepo, Vite, TypeScript

## パッケージ構成（モノレポ）

```
packages/
├── frontend/         # React Native Webフロントエンド
├── backend/          # Node.js + Hono バックエンド（フロントエンドアセットもホスト）
└── jsapdu-over-ip/   # jsapduインターフェースのHTTPミラーリング（Transport Agnostic）

scripts/
└── setup-jsapdu.sh   # jsapduビルドスクリプト（一時ディレクトリ使用）

local-packages/       # jsapduのビルド済みtgzファイル（.gitignore）
```

## jsapdu-over-ip アーキテクチャ

jsapdu-over-ipは、jsapduの完全なプロキシを提供します。クライアント側からはリモートのSmartCardPlatformがそのままワープしてきたように透過的に使用できます。

### クラス構成

- `RemoteSmartCardPlatform` - SmartCardPlatformを継承
- `RemoteSmartCardDevice` - SmartCardDeviceを継承
- `RemoteSmartCard` - SmartCardを継承
- `SmartCardPlatformAdapter` - サーバー側RPC adapter

### Transport Agnostic設計

- `ClientTransport` / `ServerTransport` インターフェースでトランスポート層を抽象化
- HTTP, WebSocket, IPC等、任意のトランスポートを注入可能
- `FetchClientTransport` - HTTPトランスポート実装（フロントエンド用）

## 必要要件

- Node.js 22以上
- Windows 11（PC/SC対応カードリーダー）
- VOICEVOX Core（音声合成用、オプション）

## セットアップ

### 1. jsapduのビルド

```bash
# スクリプトを使用（一時ディレクトリでビルド、クリーンアップ自動）
./scripts/setup-jsapdu.sh
```

スクリプトは以下を行います:

- OSの一時ディレクトリ (`mktemp -d`) でjsapduをクローン
- turborepoでビルド
- 必要なパッケージを`local-packages/`にパック
- 終了時に一時ディレクトリを自動削除

### 2. 依存関係のインストール

```bash
npm install
```

### 3. VOICEVOX Coreのセットアップ（オプション）

[VOICEVOX Core Releases](https://github.com/VOICEVOX/voicevox_core/releases)からDownloaderをダウンロードし、以下を実行：

```bash
# Downloaderを実行
./voicevox_core_downloader

# voicevox_coreディレクトリが作成されます
```

環境変数`VOICEVOX_CORE_DIR`でパスを指定できます（デフォルト: `./voicevox_core`）

### 4. ビルドと実行

```bash
# ビルド
npm run build

# 開発サーバー起動
npm run dev
```

## 使い方

1. バックエンドサーバーを起動（http://localhost:3001）
   - フロントエンドアセットもバックエンドからホストされます
2. カードリーダーにマイナンバーカードをかざす
3. 券面事項入力補助用暗証番号（4桁）を入力
4. 基本4情報が表示され、ずんだもんが「○○さん、こんにちわなのだ！」と読み上げます

## モックモード

PC/SCハードウェアがない環境でもテストできます:

```bash
# 環境変数でモックモードを有効化
USE_MOCK_PLATFORM=true npm run dev
```

または、PC/SCライブラリが利用できない場合は自動的にモックにフォールバックします。

## GitHub Actions

### copilot-setup-steps.yml

- 日本語フォント (fonts-noto-cjk) インストール
- PC/SCライブラリ (pcscd, libpcsclite-dev) インストール
- `scripts/setup-jsapdu.sh` 実行
- local-packages, VOICEVOX Coreをキャッシュ

### ci.yml

- npm, turbo, local-packages, VOICEVOX Coreの積極的キャッシュ
- 最新版のGitHub Actions使用 (checkout@v4, setup-node@v4, cache@v4)

## ライセンス

このプロジェクトは以下のライブラリを使用しています：

- jsapdu: [ANAL License](https://github.com/AokiApp/jsapdu)
- VOICEVOX Core: [MIT License](https://github.com/VOICEVOX/voicevox_core)
- ずんだもん音声: [VOICEVOX利用規約](https://voicevox.hiroshiba.jp/)に従います
