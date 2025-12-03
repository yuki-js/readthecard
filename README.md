# ReadTheCard - マイナンバーカード読み取りアプリ

Windows 11対応のマイナンバーカード読み取りアプリケーションです。
券面事項入力補助AP（KENHOJO_AP）から基本4情報（氏名、住所、生年月日、性別）を読み取り、
VOICEVOX Coreのずんだもんボイスで読み上げます。

## 機能

- 4桁PIN入力（大きな入力ボックス）
- カードリーダーへのカード配置プロンプト
- 基本4情報の大きな画面表示
- VOICEVOX Core（ずんだもん）による音声読み上げ
- フルスクリーン表示
- シンプルな昔ながらのUIデザイン（CSS2準拠）

## 必要要件

- Windows 11
- Node.js 20以上
- PC/SC対応スマートカードリーダー
- マイナンバーカード

## 使用ライブラリ

- [jsapdu](https://github.com/AokiApp/jsapdu) - スマートカード通信ライブラリ
  - @aokiapp/jsapdu-interface
  - @aokiapp/jsapdu-pcsc
  - @aokiapp/apdu-utils
  - @aokiapp/mynacard
- [Electron](https://www.electronjs.org/) 39.2.4 - デスクトップアプリフレームワーク
- [React](https://react.dev/) 19.1.1 - UIライブラリ
- [VOICEVOX Core](https://github.com/VOICEVOX/voicevox_core) 0.16.2 - 音声合成エンジン（MIT LICENSE）
- [koffi](https://github.com/Koromix/koffi) 2.14.1 - FFIライブラリ

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. VOICEVOX Coreのセットアップ

```bash
npm run setup:voicevox
```

これにより以下がダウンロードされます：
- VOICEVOX Core 0.16.2 (Windows x64 CPU版)
- ONNX Runtime 1.17.3
- Open JTalk辞書

**注意**: ずんだもんのVVMファイルは別途必要です。VOICEVOXダウンローダーを使用するか、
公式サイトから取得して`voicevox/model/`に配置してください。

### 3. ビルドと実行

```bash
# ビルド
npm run build

# 実行
npm start
```

## 開発

```bash
# 開発モード
npm run dev
```

## アーキテクチャ

```
src/
├── main/                  # Electronメインプロセス
│   ├── main.ts           # エントリーポイント
│   ├── preload.ts        # プリロードスクリプト
│   ├── cardReader.ts     # カード読み取り統合
│   ├── voicevox.ts       # VOICEVOX統合
│   ├── pcsc/             # PC/SCプラットフォーム
│   │   ├── index.ts
│   │   └── platform.ts
│   ├── mynacard/         # マイナンバーカード処理
│   │   ├── index.ts
│   │   └── kenhojo.ts
│   └── voicevox/         # VOICEVOX Core FFI
│       ├── index.ts
│       ├── core.ts       # FFIバインディング
│       ├── player.ts     # WAV再生
│       └── windows-tts.ts # フォールバック
└── renderer/             # Reactレンダラー
    ├── App.tsx
    ├── index.tsx
    ├── screens/
    └── styles.css
```

## ライセンス

このプロジェクトはjsapduライブラリのライセンス（ANAL-Tight-1.0.1）に従います。

VOICEVOX Core 0.16.2はMIT LICENSEです。

## 注意事項

- 本アプリケーションはマイナンバーカードの個人情報を取り扱います。適切なセキュリティ対策を講じてください。
- PIN入力の試行回数には制限があります。3回連続で間違えるとカードがロックされます。
