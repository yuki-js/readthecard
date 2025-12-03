/**
 * VOICEVOX Core音声合成モジュール
 * ずんだもんボイスで読み上げを行う
 * 
 * VOICEVOX Core 0.16.2 (MIT LICENSE)
 * https://github.com/VOICEVOX/voicevox_core
 * 
 * VOICEVOX CoreはC APIの動的ライブラリ（.dll/.so/.dylib）として提供される。
 * Node.jsから使用するにはFFIラッパーが必要。
 * 
 * セットアップ:
 *   npm run setup:voicevox
 * 
 * 現在の実装:
 *   VOICEVOX CoreのFFI統合は未実装のため、Windows TTSにフォールバック。
 *   将来的にはffi-napiまたはkoffiを使用してVOICEVOX Coreを直接呼び出す予定。
 */

import { spawn, ChildProcess } from 'child_process';

// ずんだもんのスピーカーID（VOICEVOX Core用、将来の実装で使用）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ZUNDAMON_SPEAKER_ID = 3;

/**
 * テキストを音声で読み上げる
 * 
 * 現在はWindows TTSを使用。
 * VOICEVOX Core FFI統合後は、ずんだもんボイスで読み上げる。
 * 
 * @param text 読み上げるテキスト
 */
export async function speakWithVoicevox(text: string): Promise<void> {
  // TODO: VOICEVOX Core FFI統合
  // 現在はWindows TTSにフォールバック
  await speakWithWindowsTTS(text);
}

/**
 * Windows TTSで読み上げ（フォールバック）
 */
async function speakWithWindowsTTS(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // PowerShellでSAPIを使用してテキスト読み上げ
    const escapedText = text.replace(/'/g, "''");
    const process: ChildProcess = spawn('powershell', [
      '-Command',
      `Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Speak('${escapedText}')`,
    ], {
      windowsHide: true,
    });

    process.on('close', (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`TTS failed with code ${code}`));
      }
    });

    process.on('error', (err: Error) => {
      reject(err);
    });
  });
}
