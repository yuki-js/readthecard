/**
 * カード読み取りサービス
 * jsapdu を使用してマイナンバーカードを読み取るサーバーサイドサービス
 */

import type { BasicFourResponse, DeviceInfoResponse } from '../types.js';

/**
 * カードサービスのインターフェース
 * バックエンドで実装される
 */
export interface ICardService {
  /**
   * 利用可能なデバイス一覧を取得
   */
  getDevices(): Promise<DeviceInfoResponse[]>;

  /**
   * デバイスの状態を取得
   */
  getDeviceStatus(): Promise<DeviceInfoResponse | null>;

  /**
   * セッションを開始
   */
  startSession(): Promise<string>;

  /**
   * セッションを終了
   */
  endSession(): Promise<void>;

  /**
   * カードの挿入を待機
   */
  waitForCard(timeoutMs: number): Promise<boolean>;

  /**
   * PINを検証（券面事項入力補助AP用）
   */
  verifyPin(pin: string): Promise<{ verified: boolean; remainingAttempts?: number }>;

  /**
   * 基本4情報を読み取り
   */
  readBasicFour(): Promise<BasicFourResponse>;
}
