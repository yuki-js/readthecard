/**
 * Electronプリロードスクリプト
 * レンダラープロセスとメインプロセス間の安全なAPI公開
 */

import { contextBridge, ipcRenderer } from 'electron';

/** 基本4情報の型 */
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

// レンダラープロセスに公開するAPI
const electronAPI = {
  /**
   * マイナンバーカードから基本4情報を読み取る
   * @param pin 4桁のPINコード
   */
  readCard: (pin: string): Promise<ReadCardResult> => {
    return ipcRenderer.invoke('read-card', pin);
  },
  
  /**
   * テキストを音声で読み上げる
   * @param text 読み上げるテキスト
   */
  speak: (text: string): Promise<SpeakResult> => {
    return ipcRenderer.invoke('speak', text);
  },
  
  /**
   * 利用可能なカードリーダー一覧を取得
   */
  getReaders: (): Promise<GetReadersResult> => {
    return ipcRenderer.invoke('get-readers');
  },
  
  /**
   * VOICEVOX Coreの状態を取得
   */
  getVoicevoxStatus: (): Promise<VoicevoxStatusResult> => {
    return ipcRenderer.invoke('get-voicevox-status');
  },
  
  /**
   * 音声合成を停止
   */
  stopSpeaking: (): Promise<SpeakResult> => {
    return ipcRenderer.invoke('stop-speaking');
  },
};

// コンテキストブリッジでAPIを公開
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript用の型定義
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
