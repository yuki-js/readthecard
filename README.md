# readthecard

マイナンバーカード読み取りアプリケーション

## 概要

Windows 11で動作するマイナンバーカード読み取りアプリケーションです。
券面事項入力補助AP（Kenhojo AP）を使用して、基本4情報（氏名、住所、生年月日、性別）を読み取り、フルスクリーンで表示します。
VOICEVOX ずんだもんによる音声読み上げ機能も搭載しています。

## 機能

- 4桁暗証番号入力（大きな入力ボックス）
- マイナンバーカードの基本4情報読み取り
- フルスクリーン表示
- VOICEVOX ずんだもんによる読み上げ
- 日本語UI

## 必要要件

### ハードウェア
- PC/SC対応のICカードリーダー
- マイナンバーカード

### ソフトウェア
- Windows 11
- Node.js 22以上
- VOICEVOX（音声読み上げ機能を使用する場合）

## セットアップ

```bash
npm install
```

## 起動

### 開発モード

```bash
npm run electron:dev
```

### ビルド

```bash
npm run build
```

## 技術スタック

- Electron 39.2.4
- React 19.2.0
- TypeScript 5.9.3
- jsapdu (カードリーダー)
  - @aokiapp/jsapdu-pcsc
  - @aokiapp/mynacard
  - @aokiapp/apdu-utils
- VOICEVOX ずんだもん

## ライセンス

MIT
