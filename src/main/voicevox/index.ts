/**
 * VOICEVOX音声合成モジュールのエクスポート
 */

export {
  initVoicevoxCore,
  synthesize,
  cleanupVoicevoxCore,
  isVoicevoxAvailable,
} from './core.js';

export { playWav } from './player.js';

export { speakWithWindowsTTS } from './windows-tts.js';
