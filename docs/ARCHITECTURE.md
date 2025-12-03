# アーキテクチャドキュメント

## 概要

readthecardは、マイナンバーカード（個人番号カード）から基本4情報を読み取るアプリケーションです。

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Frontend)                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              React Native Web                                │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐   │ │
│  │  │  CardManager   │  │  PinInput      │  │ BasicFour    │   │ │
│  │  │  (ViewModel)   │  │  Component     │  │ Display      │   │ │
│  │  └────────────────┘  └────────────────┘  └──────────────┘   │ │
│  │           │                                                   │ │
│  │  ┌────────────────────────────────────────────────────────┐  │ │
│  │  │          RemoteSmartCardPlatform (jsapdu-over-ip)      │  │ │
│  │  │  - RemoteSmartCardDevice                               │  │ │
│  │  │  - RemoteSmartCard                                     │  │ │
│  │  │  - FetchClientTransport                                │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ HTTP POST /api/jsapdu/rpc
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Node.js (Backend)                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Hono HTTP Server                          │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐   │ │
│  │  │  Static Files  │  │  jsapdu RPC    │  │  VOICEVOX    │   │ │
│  │  │  (Frontend)    │  │  Route         │  │  TTS Route   │   │ │
│  │  └────────────────┘  └────────────────┘  └──────────────┘   │ │
│  │                              │                    │          │ │
│  │  ┌───────────────────────────┴────────────────────┘          │ │
│  │  │                                                           │ │
│  │  │  SmartCardPlatformAdapter                                 │ │
│  │  │  ┌──────────────────────────────────────────────┐         │ │
│  │  │  │  @aokiapp/jsapdu-pcsc (実カード) or          │         │ │
│  │  │  │  MockSmartCardPlatform (テスト用)            │         │ │
│  │  │  └──────────────────────────────────────────────┘         │ │
│  │  └───────────────────────────────────────────────────────────│ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    PC/SC or Mock                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## パッケージ構成

### packages/frontend

React Native Webを使用したブラウザフロントエンド。

- **技術スタック**: React Native Web, Vite, TypeScript
- **主要コンポーネント**:
  - `App.tsx`: メインアプリケーション
  - `CardManager`: jsapduとReactのライフサイクルを分離するViewModel
  - `PinInput`: 4桁PIN入力（大きな入力ボックス）
  - `BasicFourDisplay`: 基本4情報表示（氏名を大きく赤字太字で表示）
  - `WaitForCard`: カード待機画面

### packages/backend

Honoを使用したNode.jsバックエンド。

- **技術スタック**: Hono v4.6.20, TypeScript, koffi (FFI)
- **主要機能**:
  - フロントエンドアセットの配信
  - jsapdu RPCエンドポイント
  - VOICEVOX Core音声合成

### packages/jsapdu-over-ip

jsapduインターフェースをネットワーク越しに透過的に利用するためのブリッジ。

- **Transport Agnostic設計**: HTTP, WebSocket, IPCなど任意のトランスポート層に対応
- **100% TypeScript互換**: `@aokiapp/jsapdu-interface`の抽象クラスを正しく継承

## 技術的決定

### なぜReact Native Web?

- クロスプラットフォーム対応の将来性
- 既存のReact Nativeコードベースとの互換性
- Web環境でのReact Nativeコンポーネント利用

### なぜHono?

- TypeScriptファーストの設計
- Expressの10倍以上高速
- 軽量で依存関係が少ない
- エッジ/サーバーレス対応

### なぜjsapdu-over-ip?

- ブラウザからPC/SCに直接アクセスできない
- サーバーサイドでカードリーダーを操作し、結果をブラウザに転送
- 透過的なプロキシにより、クライアントコードはローカルカードリーダーを使うかのように記述可能

## ファイル構造

```
readthecard/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # CIパイプライン
│       └── copilot-setup-steps.yml # Copilot Agent環境設定
├── docs/
│   ├── ARCHITECTURE.md            # このファイル
│   └── DEVELOPMENT.md             # 開発ガイド
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.ts           # Honoサーバー
│   │   │   ├── mock/              # モックプラットフォーム
│   │   │   ├── routes/            # APIルート
│   │   │   └── services/          # サービス層
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── App.tsx            # メインアプリ
│   │   │   ├── components/        # UIコンポーネント
│   │   │   ├── managers/          # CardManager
│   │   │   └── utils/             # ユーティリティ
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── jsapdu-over-ip/
│       ├── src/
│       │   ├── client/            # クライアント側プロキシ
│       │   ├── server/            # サーバー側アダプタ
│       │   ├── transport.ts       # トランスポート抽象化
│       │   └── types.ts           # 型定義
│       ├── package.json
│       └── tsconfig.json
├── scripts/
│   └── setup-jsapdu.sh            # jsapduビルドスクリプト
├── local-packages/                # ビルドされたjsapdu tgzファイル
├── package.json                   # ルートpackage.json
├── turbo.json                     # Turborepo設定
└── README.md                      # プロジェクト概要
```
