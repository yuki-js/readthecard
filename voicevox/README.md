# VOICEVOX Core セットアップ

このディレクトリにVOICEVOX Core 0.16.2（MIT LICENSE）をセットアップしてください。

## 自動セットアップ

```bash
npm run setup:voicevox
```

これにより以下がダウンロードされます：
- VOICEVOX Core 動的ライブラリ (voicevox_core.dll)
- ONNX Runtime 動的ライブラリ (onnxruntime.dll)
- Open JTalk 辞書 (open_jtalk_dic_utf_8-1.11/)

## ディレクトリ構造

```
voicevox/
├── voicevox_core.dll           # VOICEVOX Core本体
├── onnxruntime.dll             # ONNX Runtime
└── open_jtalk_dic_utf_8-1.11/  # Open JTalk辞書
```

## VOICEVOX Coreについて

VOICEVOX CoreはC APIの動的ライブラリとして提供されます。
本アプリケーションではRustの`libloading`クレートを使用して
FFI経由で呼び出しています。

### スピーカーID

- ずんだもん（ノーマル）: 3

## ライセンス

- VOICEVOX Core 0.16以上: **MIT LICENSE**

## 参考リンク

- [VOICEVOX Core GitHub](https://github.com/VOICEVOX/voicevox_core)
- [VOICEVOX 公式サイト](https://voicevox.hiroshiba.jp/)
