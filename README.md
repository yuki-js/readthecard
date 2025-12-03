# ReadTheCard - マイナンバーカード読み取りアプリ

Windows 11向けマイナンバーカード読み取りアプリ。券面事項入力補助AP（Kenhojo AP）から基本4情報を読み取り、VOICEVOX Coreのずんだもんで読み上げる。

## アーキテクチャ

- **Tauri 2.4.1** - 軽量デスクトップアプリフレームワーク（WebView2使用）
- **React 19.1.1** - フロントエンドUI
- **Rust pcsc 2.9.0** - PC/SCスマートカード通信
- **VOICEVOX Core 0.16.2** - ずんだもんTTS（MIT LICENSE）

### なぜElectronではなくTauriか？

| | Electron | Tauri |
|---|---|---|
| アプリサイズ | ~150MB | ~2MB |
| ランタイム | Chromium内蔵 | WebView2（Windows 11標準） |
| ネイティブアクセス | Node.js + FFI | Rust |
| メモリ使用量 | 高い | 低い |

## 機能

- 4桁PIN入力画面（大きな入力ボックス + 数字キーパッド）
- カード配置プロンプト画面
- 基本4情報表示（氏名、住所、生年月日、性別）大画面表示
- フルスクリーンモード
- CSS2準拠のシンプルUI（CSS3不使用）
- 日本語UI

## プロジェクト構造

```
readthecard/
├── src/                    # React フロントエンド
│   ├── main.tsx           # エントリーポイント
│   ├── App.tsx            # メインコンポーネント
│   └── screens/           # 画面コンポーネント
├── src-tauri/             # Rust バックエンド
│   ├── src/
│   │   ├── main.rs        # エントリーポイント
│   │   ├── lib.rs         # Tauriコマンド定義
│   │   ├── mynacard.rs    # マイナンバーカード処理（jsapdu仕様準拠）
│   │   └── voicevox.rs    # VOICEVOX Core FFI
│   ├── Cargo.toml         # Rust依存関係
│   └── tauri.conf.json    # Tauri設定
├── voicevox/              # VOICEVOX Core（セットアップ後）
└── index.html             # HTMLエントリーポイント
```

## セットアップ

### 前提条件

- Node.js 22以上
- Rust 1.86以上
- Windows 11（WebView2は標準搭載）
- PC/SC対応スマートカードリーダー

### インストール

```bash
# 依存関係インストール
npm install

# VOICEVOX Coreセットアップ
npm run setup:voicevox
```

## 開発

```bash
# 開発サーバー起動
npm run tauri dev
```

## ビルド

```bash
# リリースビルド
npm run tauri build
```

出力先: `src-tauri/target/release/bundle/`

## カード読み取りフロー

jsapdu (https://github.com/AokiApp/jsapdu) の仕様に基づいて実装:

```rust
// src-tauri/src/mynacard.rs

// 1. 券面事項入力補助AP (AID: D3 92 10 00 00 01 00 01 04 08) を選択
//    SELECT DF: 00 A4 04 0C Lc [AID]

// 2. PIN認証 (VERIFY: 00 20 00 81 04 [PIN])
//    EF番号 0x01 = PIN

// 3. 基本4情報読み取り (READ BINARY: 00 B0 82 00 00)
//    EF番号 0x02 = BASIC_FOUR

// 4. TLVパース
//    DF21 = 名前
//    DF22 = 住所
//    DF23 = 生年月日
//    DF24 = 性別
```

## ライセンス

- VOICEVOX Core: MIT LICENSE
- ずんだもん: クレジット表記推奨（詳細は https://zunko.jp/con_ongen_kiyaku.html ）

## GitHub Actions

- TypeScript型チェック + フロントエンドビルド（Ubuntu）
- Windows向けTauriアプリビルド
- 積極的なキャッシュ戦略（node_modules, Cargo registry/build, VOICEVOX）

## 注意事項

- 本アプリケーションはマイナンバーカードの個人情報を取り扱います。適切なセキュリティ対策を講じてください。
- PIN入力の試行回数には制限があります。3回連続で間違えるとカードがロックされます。
