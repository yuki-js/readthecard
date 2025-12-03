# VOICEVOX Core セットアップ

このディレクトリにVOICEVOX Core 0.16.2（MIT LICENSE）をセットアップしてください。

## 自動セットアップ

```bash
npm run setup:voicevox
```

## 手動セットアップ

1. [VOICEVOX Core releases](https://github.com/VOICEVOX/voicevox_core/releases)から最新版をダウンロード
   - Windows: `voicevox_core-windows-x64-cpu-0.16.2.zip`
   
2. ダウンロードしたファイルを展開し、このディレクトリに配置

## VOICEVOX Coreについて

VOICEVOX CoreはC APIの動的ライブラリ（.dll/.so/.dylib）として提供されます。
Node.jsから使用するにはFFIラッパー（ffi-napi、koffi等）が必要です。

現在の実装ではWindows TTSにフォールバックしています。

## ずんだもんについて

- スピーカーID: 3
- キャラクター: ずんだもん

## ライセンス

- VOICEVOX Core 0.16以上: MIT LICENSE
- VOICEVOX Core 0.16未満: 別ライセンス（注意）

## 参考リンク

- [VOICEVOX Core GitHub](https://github.com/VOICEVOX/voicevox_core)
- [VOICEVOX 公式サイト](https://voicevox.hiroshiba.jp/)
