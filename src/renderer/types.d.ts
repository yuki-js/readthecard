/**
 * Electron API 型定義
 * preload.tsで公開されるAPIの型
 */

export {};

/** 基本4情報 */
interface BasicFourInfo {
  name: string;
  address: string;
  birth: string;
  gender: string;
}

/** カード読み取り結果 */
interface ReadCardResult {
  success: boolean;
  data?: BasicFourInfo;
  error?: string;
}

/** 音声合成結果 */
interface SpeakResult {
  success: boolean;
  error?: string;
}

/** リーダー取得結果 */
interface GetReadersResult {
  success: boolean;
  readers?: string[];
  error?: string;
}

/** VOICEVOX状態 */
interface VoicevoxStatusResult {
  success: boolean;
  available?: boolean;
  initialized?: boolean;
  error?: string;
}

declare global {
  interface Window {
    electronAPI: {
      /** マイナンバーカードから基本4情報を読み取る */
      readCard: (pin: string) => Promise<ReadCardResult>;
      /** テキストを音声で読み上げる */
      speak: (text: string) => Promise<SpeakResult>;
      /** 利用可能なカードリーダー一覧を取得 */
      getReaders: () => Promise<GetReadersResult>;
      /** VOICEVOX Coreの状態を取得 */
      getVoicevoxStatus: () => Promise<VoicevoxStatusResult>;
      /** 音声合成を停止 */
      stopSpeaking: () => Promise<SpeakResult>;
    };
  }
}
