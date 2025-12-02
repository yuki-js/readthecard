/**
 * VOICEVOX Core音声合成モジュール
 * ずんだもんボイスで読み上げを行う
 * 
 * VOICEVOX Coreのセットアップ:
 * 1. https://github.com/VOICEVOX/voicevox_core/releases からWindows版をダウンロード
 * 2. voicevox_core-windows-x64-0.16.2.zip を展開
 * 3. voicevox/ ディレクトリに配置
 * 4. Open JTalkの辞書とずんだもんのVVMファイルを配置
 */

import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { app } from 'electron';

// ずんだもんのスピーカーID
const ZUNDAMON_SPEAKER_ID = 3;

// VOICEVOX Coreのパス
function getVoicevoxPath(): string {
  const resourcesPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../../voicevox')
    : path.join(app.getAppPath(), '../voicevox');
  return resourcesPath;
}

// 一時ファイル用ディレクトリ
function getTempDir(): string {
  return path.join(app.getPath('temp'), 'readthecard');
}

/**
 * VOICEVOX Coreでテキストを音声に変換して再生
 * @param text 読み上げるテキスト
 */
export async function speakWithVoicevox(text: string): Promise<void> {
  const voicevoxPath = getVoicevoxPath();
  const cliPath = path.join(voicevoxPath, 'voicevox_core.exe');

  // VOICEVOX Coreが存在するか確認
  if (!fs.existsSync(cliPath)) {
    console.warn('VOICEVOX Coreが見つかりません。音声合成をスキップします。');
    console.warn(`期待されるパス: ${cliPath}`);
    // フォールバック: Windows TTSを使用
    await speakWithWindowsTTS(text);
    return;
  }

  const tempDir = getTempDir();
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const wavPath = path.join(tempDir, `speech_${Date.now()}.wav`);

  try {
    // VOICEVOX Coreで音声合成
    await synthesizeWithVoicevox(cliPath, text, wavPath, ZUNDAMON_SPEAKER_ID);
    
    // 音声を再生
    await playWavFile(wavPath);
  } finally {
    // 一時ファイルを削除
    if (fs.existsSync(wavPath)) {
      fs.unlinkSync(wavPath);
    }
  }
}

/**
 * VOICEVOX Coreで音声合成を実行
 */
async function synthesizeWithVoicevox(
  cliPath: string,
  text: string,
  outputPath: string,
  speakerId: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const voicevoxDir = path.dirname(cliPath);
    const process: ChildProcess = spawn(cliPath, [
      '--text', text,
      '--speaker-id', speakerId.toString(),
      '--output', outputPath,
    ], {
      cwd: voicevoxDir,
      windowsHide: true,
    });

    let stderr = '';
    process.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    process.on('close', (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`VOICEVOX Core failed with code ${code}: ${stderr}`));
      }
    });

    process.on('error', (err: Error) => {
      reject(err);
    });
  });
}

/**
 * WAVファイルを再生（Windows）
 */
async function playWavFile(wavPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // PowerShellでWAVファイルを再生
    const process: ChildProcess = spawn('powershell', [
      '-Command',
      `(New-Object Media.SoundPlayer '${wavPath}').PlaySync()`,
    ], {
      windowsHide: true,
    });

    process.on('close', (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`WAV playback failed with code ${code}`));
      }
    });

    process.on('error', (err: Error) => {
      reject(err);
    });
  });
}

/**
 * フォールバック: Windows TTSで読み上げ
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
