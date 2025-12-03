/**
 * 音声再生モジュール
 * WAVデータを再生する
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * WAVデータを再生（Windows）
 * @param wavData WAVデータ
 */
export async function playWav(wavData: Buffer): Promise<void> {
  // 一時ファイルに保存
  const tempPath = path.join(os.tmpdir(), `voicevox_${Date.now()}.wav`);
  fs.writeFileSync(tempPath, wavData);
  
  return new Promise((resolve, reject) => {
    // PowerShellでWAVファイルを再生
    const process: ChildProcess = spawn('powershell', [
      '-Command',
      `$player = New-Object System.Media.SoundPlayer('${tempPath.replace(/'/g, "''")}'); $player.PlaySync(); $player.Dispose()`,
    ], {
      windowsHide: true,
    });
    
    process.on('close', (code: number | null) => {
      // 一時ファイルを削除（エラーは無視：他プロセスがまだ使用中の可能性）
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ファイル削除失敗は無視（OSが後でクリーンアップ）
      }
      
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`WAV再生エラー: code=${code}`));
      }
    });
    
    process.on('error', (err: Error) => {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ファイル削除失敗は無視
      }
      reject(err);
    });
  });
}
