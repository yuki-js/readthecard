# ReadTheCard - マイナンバーカード読み取りアプリ

Windows 11対応のマイナンバーカード読み取りアプリケーションです。券面事項入力補助AP（Kenhojo AP）から基本4情報（氏名、住所、生年月日、性別）を読み取り、音声で読み上げます。

## 機能

- 4桁PIN入力（大きな入力ボックス）
- カードリーダーへのカード配置プロンプト
- 基本4情報の大きな画面表示
- 音声読み上げ（現在はWindows TTS、将来的にVOICEVOX Coreのずんだもん対応予定）
- フルスクリーン表示
- シンプルな昔ながらのUIデザイン（CSS2準拠）

## 必要要件

- Windows 11
- Node.js 20以上
- PC/SC対応スマートカードリーダー
- マイナンバーカード

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. VOICEVOX Coreのセットアップ（オプション）

VOICEVOX Core 0.16.2（MIT LICENSE）をダウンロードできます：

```bash
npm run setup:voicevox
```

**注意**: VOICEVOX CoreはC APIの動的ライブラリ（.dll）として提供されます。
Node.jsから使用するにはFFIラッパーが必要です。現在の実装ではWindows TTSにフォールバックします。

### 3. ビルドと実行

```bash
# ビルド
npm run build

# 実行
npm start
```

## 開発

```bash
# 開発モード（ホットリロード）
npm run dev
```

## 使用ライブラリ

- [jsapdu](https://github.com/AokiApp/jsapdu) - スマートカード通信ライブラリ
  - @aokiapp/jsapdu-interface
  - @aokiapp/jsapdu-pcsc
  - @aokiapp/apdu-utils
  - @aokiapp/mynacard
- [Electron](https://www.electronjs.org/) 39.2.4 - デスクトップアプリフレームワーク
- [React](https://react.dev/) 19.1.1 - UIライブラリ
- [VOICEVOX Core](https://github.com/VOICEVOX/voicevox_core) 0.16.2 - 音声合成エンジン（MIT LICENSE）

## ライセンス

このプロジェクトはjsapduライブラリのライセンス（ANAL-Tight-1.0.1）に従います。

## 注意事項

- 本アプリケーションはマイナンバーカードの個人情報を取り扱います。適切なセキュリティ対策を講じてください。
- PIN入力の試行回数には制限があります。3回連続で間違えるとカードがロックされます。
