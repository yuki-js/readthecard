/**
 * Windows TTS フォールバック
 * VOICEVOX Coreが利用できない場合に使用
 */

import { spawn, ChildProcess } from 'child_process';

/**
 * Windows TTSで読み上げ
 * @param text 読み上げるテキスト
 */
export async function speakWithWindowsTTS(text: string): Promise<void> {
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
