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

## ずんだもんVVMファイル

ずんだもんのVVMファイルは自動ダウンロードに含まれていません。
以下の方法で取得してください：

1. [VOICEVOX ダウンローダー](https://github.com/VOICEVOX/voicevox_core/releases)を使用
2. または公式サイトから取得

取得したVVMファイルは `voicevox/model/` に配置してください。

## ディレクトリ構造

```
voicevox/
├── voicevox_core.dll       # VOICEVOX Core本体
├── onnxruntime.dll         # ONNX Runtime
├── open_jtalk_dic_utf_8-1.11/  # Open JTalk辞書
└── model/
    └── zundamon.vvm        # ずんだもんVVM（手動配置）
```

## VOICEVOX Coreについて

VOICEVOX CoreはC APIの動的ライブラリとして提供されます。
本アプリケーションでは[koffi](https://github.com/Koromix/koffi)を使用して
Node.jsからFFI経由で呼び出しています。

### スタイルID

- ずんだもん（ノーマル）: 3
- ずんだもん（あまあま）: 1
- ずんだもん（ツンツン）: 7
- ずんだもん（セクシー）: 5

## ライセンス

- VOICEVOX Core 0.16以上: **MIT LICENSE**
- VOICEVOX Core 0.16未満: 別ライセンス（使用注意）

## 参考リンク

- [VOICEVOX Core GitHub](https://github.com/VOICEVOX/voicevox_core)
- [VOICEVOX 公式サイト](https://voicevox.hiroshiba.jp/)
- [koffi FFIライブラリ](https://github.com/Koromix/koffi)
