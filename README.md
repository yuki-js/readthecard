# readthecard

マイナンバーカード読み取りアプリケーション

## 概要

Windows 11上で動作するマイナンバーカード（Mynacard）読み取りアプリケーションです。
React Native Webを使用したブラウザフロントエンドと、Node.jsバックエンドで構成されるクライアント・サーバーモデルを採用しています。

## 機能

- 券面事項入力補助AP（Kenhojo AP）を使用した基本4情報（氏名、住所、生年月日、性別）の読み取り
- 4桁PIN入力による認証
- フルスクリーン表示
- VOICEVOX Core（ずんだもん）による読み上げ
- 日本語UI

## 技術スタック

- **フロントエンド**: React Native Web
- **バックエンド**: Node.js + Express
- **カード通信**: [jsapdu](https://github.com/AokiApp/jsapdu)（PC/SC経由）
- **音声合成**: [VOICEVOX Core](https://github.com/VOICEVOX/voicevox_core)（ずんだもん）
- **ビルドツール**: Turborepo, Vite, TypeScript

## パッケージ構成（モノレポ）

```
packages/
├── frontend/         # React Native Webフロントエンド
├── backend/          # Node.js + Express バックエンド
├── jsapdu-over-ip/   # jsapduインターフェースのHTTPミラーリング
└── jsapdu/           # jsapduライブラリ（ローカルビルド）
```

## 必要要件

- Node.js 22以上
- Windows 11（PC/SC対応カードリーダー）
- VOICEVOX Core（音声合成用、オプション）

## セットアップ

### 1. 依存関係のインストール

```bash
# jsapduのクローンとビルド
git clone --depth=1 --branch dev https://github.com/AokiApp/jsapdu.git packages/jsapdu
cd packages/jsapdu/packages/interface && npm install && npm run build
cd ../apdu-utils && npm install && npm run build
cd ../mynacard && npm install && npm run build
cd ../pcsc-ffi-node && npm install && npm run build
cd ../pcsc && npm install && npm run build

# パッケージング
mkdir -p local-packages
cd packages/jsapdu/packages/interface && npm pack && mv *.tgz ../../../../local-packages/
cd ../apdu-utils && npm pack && mv *.tgz ../../../../local-packages/
cd ../mynacard && npm pack && mv *.tgz ../../../../local-packages/
cd ../pcsc-ffi-node && npm pack && mv *.tgz ../../../../local-packages/
cd ../pcsc && npm pack && mv *.tgz ../../../../local-packages/

# 依存関係のインストール
npm install
```

### 2. VOICEVOX Coreのセットアップ（オプション）

[VOICEVOX Core Releases](https://github.com/VOICEVOX/voicevox_core/releases)からDownloaderをダウンロードし、以下を実行：

```bash
# Downloaderを実行
./download

# voicevox_coreディレクトリが作成されます
```

環境変数`VOICEVOX_CORE_DIR`でパスを指定できます（デフォルト: `./voicevox_core`）

### 3. ビルドと実行

```bash
# ビルド
npm run build

# 開発サーバー起動
npm run dev
```

## 使い方

1. バックエンドサーバーを起動（http://localhost:3001）
2. フロントエンドを起動（http://localhost:5173）
3. カードリーダーにマイナンバーカードをかざす
4. 券面事項入力補助用暗証番号（4桁）を入力
5. 基本4情報が表示され、ずんだもんが読み上げます

## ライセンス

このプロジェクトは以下のライブラリを使用しています：

- jsapdu: [ANAL License](https://github.com/AokiApp/jsapdu)
- VOICEVOX Core: [MIT License](https://github.com/VOICEVOX/voicevox_core)
- ずんだもん音声: [VOICEVOX利用規約](https://voicevox.hiroshiba.jp/)に従います
