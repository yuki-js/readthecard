/**
 * カードサービス
 * jsapdu を使用してマイナンバーカードを読み取る
 */

import type { ICardService } from '@readthecard/jsapdu-over-ip/server';
import type { BasicFourResponse, DeviceInfoResponse } from '@readthecard/jsapdu-over-ip';
import { PcscPlatformManager } from '@aokiapp/jsapdu-pcsc';
import { selectDf, verify, readEfBinaryFull } from '@aokiapp/apdu-utils';
import { KENHOJO_AP, KENHOJO_AP_EF, schemaKenhojoBasicFour } from '@aokiapp/mynacard';
import { Schema } from '@aokiapp/tlv/parser';
import type { SmartCardPlatform, SmartCardDevice, SmartCard, ResponseApdu } from '@aokiapp/jsapdu-interface';

export class CardService implements ICardService {
  private platform: SmartCardPlatform | null = null;
  private device: SmartCardDevice | null = null;
  private card: SmartCard | null = null;

  /**
   * サービスの初期化
   */
  async initialize(): Promise<void> {
    try {
      this.platform = PcscPlatformManager.getInstance().getPlatform();
      await this.platform.init();
      console.log('PC/SCプラットフォームを初期化しました');
    } catch (error) {
      console.warn('PC/SCプラットフォームの初期化に失敗しました（カードリーダーが接続されていない可能性があります）:', error);
      // プラットフォームがなくても動作継続（デモ用）
    }
  }

  /**
   * 利用可能なデバイス一覧を取得
   */
  async getDevices(): Promise<DeviceInfoResponse[]> {
    if (!this.platform) {
      return [];
    }

    try {
      const devices = await this.platform.getDeviceInfo();
      return devices.map(d => ({
        id: d.id,
        name: d.friendlyName ?? d.id,
        isCardPresent: false, // デバイス情報からは取得できない
      }));
    } catch (error) {
      console.error('デバイス一覧の取得に失敗:', error);
      return [];
    }
  }

  /**
   * デバイスの状態を取得
   */
  async getDeviceStatus(): Promise<DeviceInfoResponse | null> {
    if (!this.device) {
      const devices = await this.getDevices();
      if (devices.length === 0) {
        return null;
      }
      return devices[0] ?? null;
    }
    return {
      id: 'current',
      name: '現在のデバイス',
      isCardPresent: this.card !== null,
    };
  }

  /**
   * セッションを開始
   */
  async startSession(): Promise<string> {
    if (!this.platform) {
      throw new Error('プラットフォームが初期化されていません');
    }

    const devices = await this.platform.getDeviceInfo();
    if (devices.length === 0) {
      throw new Error('カードリーダーが見つかりません');
    }

    this.device = await this.platform.acquireDevice(devices[0]!.id);
    return `session-${Date.now()}`;
  }

  /**
   * セッションを終了
   */
  async endSession(): Promise<void> {
    if (this.card) {
      await this.card.release();
      this.card = null;
    }
    if (this.device) {
      await this.device.release();
      this.device = null;
    }
  }

  /**
   * カードの挿入を待機
   */
  async waitForCard(timeoutMs: number): Promise<boolean> {
    if (!this.device) {
      throw new Error('セッションが開始されていません');
    }

    try {
      await this.device.waitForCardPresence(timeoutMs);
      this.card = await this.device.startSession();
      return true;
    } catch (error) {
      console.error('カードの待機に失敗:', error);
      return false;
    }
  }

  /**
   * PINを検証（券面事項入力補助AP用）
   */
  async verifyPin(pin: string): Promise<{ verified: boolean; remainingAttempts?: number }> {
    if (!this.card) {
      throw new Error('カードが挿入されていません');
    }

    // 券面事項入力補助APを選択
    const selectCmd = selectDf(KENHOJO_AP);
    const selectResp = await this.card.transmit(selectCmd);
    if (!this.isSuccess(selectResp)) {
      throw new Error('券面事項入力補助APの選択に失敗しました');
    }

    // PIN検証
    const verifyCmd = verify(pin, { ef: KENHOJO_AP_EF.PIN });
    const verifyResp = await this.card.transmit(verifyCmd);

    if (this.isSuccess(verifyResp)) {
      return { verified: true };
    }

    // PIN検証失敗
    if (verifyResp.sw1 === 0x63) {
      const remainingAttempts = verifyResp.sw2 & 0x0f;
      return { verified: false, remainingAttempts };
    }

    throw new Error(`PIN検証に失敗しました: SW=${verifyResp.sw.toString(16)}`);
  }

  /**
   * 基本4情報を読み取り
   */
  async readBasicFour(): Promise<BasicFourResponse> {
    if (!this.card) {
      throw new Error('カードが挿入されていません');
    }

    // 基本4情報を読み取り
    const readCmd = readEfBinaryFull(KENHOJO_AP_EF.BASIC_FOUR);
    const readResp = await this.card.transmit(readCmd);

    if (!this.isSuccess(readResp)) {
      throw new Error(`基本4情報の読み取りに失敗しました: SW=${readResp.sw.toString(16)}`);
    }

    // TLVパース
    const parser = new Schema.Parser(schemaKenhojoBasicFour);
    const parsed = parser.parse(readResp.data.buffer) as {
      name: string;
      address: string;
      birth: string;
      gender: string;
    };

    return {
      name: parsed.name,
      address: parsed.address,
      birthDate: parsed.birth,
      sex: parsed.gender,
    };
  }

  /**
   * レスポンスが成功かどうかを判定
   */
  private isSuccess(resp: ResponseApdu): boolean {
    return resp.sw === 0x9000;
  }
}
