/**
 * VOICEVOX音声合成統合モジュール
 * ずんだもんボイスで読み上げを行う
 * 
 * VOICEVOX Core 0.16.2 (MIT LICENSE)
 * https://github.com/VOICEVOX/voicevox_core
 */

import {
  initVoicevoxCore,
  synthesize,
  isVoicevoxAvailable,
  playWav,
  speakWithWindowsTTS,
} from './voicevox/index.js';

/** ずんだもんのスタイルID */
const ZUNDAMON_STYLE_ID = 3;

/** VOICEVOX Core初期化済みフラグ */
let voicevoxInitialized = false;
let voicevoxInitFailed = false;

/**
 * VOICEVOX Coreを初期化（必要に応じて）
 */
async function ensureVoicevoxInitialized(): Promise<boolean> {
  if (voicevoxInitialized) return true;
  if (voicevoxInitFailed) return false;
  
  if (!isVoicevoxAvailable()) {
    console.log('VOICEVOX Coreが見つかりません。Windows TTSを使用します。');
    voicevoxInitFailed = true;
    return false;
  }
  
  try {
    await initVoicevoxCore();
    voicevoxInitialized = true;
    return true;
  } catch (error) {
    console.warn('VOICEVOX Core初期化失敗。Windows TTSにフォールバックします:', error);
    voicevoxInitFailed = true;
    return false;
  }
}

/**
 * テキストを音声で読み上げる
 * VOICEVOX Coreが利用可能な場合はずんだもんボイス、
 * そうでなければWindows TTSを使用
 * 
 * @param text 読み上げるテキスト
 */
export async function speakWithVoicevox(text: string): Promise<void> {
  const useVoicevox = await ensureVoicevoxInitialized();
  
  if (useVoicevox) {
    try {
      const wavData = await synthesize(text, ZUNDAMON_STYLE_ID);
      await playWav(wavData);
      return;
    } catch (error) {
      console.warn('VOICEVOX音声合成エラー。Windows TTSにフォールバック:', error);
    }
  }
  
  // フォールバック: Windows TTS
  await speakWithWindowsTTS(text);
}
