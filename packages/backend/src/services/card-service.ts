/**
 * カードサービス
 * jsapdu を使用してマイナンバーカードを読み取る
 */

import type { ICardService } from '@readthecard/jsapdu-over-ip/server';
import type { BasicFourResponse, DeviceInfoResponse } from '@readthecard/jsapdu-over-ip';
import { PcscPlatformManager } from '@aokiapp/jsapdu-pcsc';
import { selectDf, verify, readEfBinaryFull } from '@aokiapp/apdu-utils';
import { KENHOJO_AP, KENHOJO_AP_EF } from '@aokiapp/mynacard';
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

    // TLVパース（簡易実装）
    const parsed = this.parseBasicFourTlv(readResp.data);

    return {
      name: parsed.name,
      address: parsed.address,
      birthDate: parsed.birth,
      sex: parsed.gender,
    };
  }

  /**
   * 基本4情報のTLVをパース（簡易実装）
   */
  private parseBasicFourTlv(data: Uint8Array): { name: string; address: string; birth: string; gender: string } {
    const decoder = new TextDecoder('utf-8');
    let offset = 0;
    const result = { name: '', address: '', birth: '', gender: '' };

    while (offset < data.length) {
      const tag = data[offset]!;
      offset++;
      
      if (offset >= data.length) break;
      let length = data[offset]!;
      offset++;
      
      // 長さが0x81以上の場合は拡張長さ
      if (length === 0x81) {
        length = data[offset]!;
        offset++;
      } else if (length === 0x82) {
        length = (data[offset]! << 8) | data[offset + 1]!;
        offset += 2;
      }
      
      if (offset + length > data.length) break;
      
      const value = data.slice(offset, offset + length);
      offset += length;

      // タグに応じてパース (Private class tags: 0xDF21, 0xDF22, etc.)
      // 簡易実装: 0xDF22=name, 0xDF23=address, 0xDF24=birth, 0xDF25=gender
      if (tag === 0xDF) {
        // 2バイトタグ
        const tag2 = value[0];
        const actualValue = value.slice(1);
        const text = decoder.decode(actualValue);
        
        switch (tag2) {
          case 0x22: result.name = text; break;
          case 0x23: result.address = text; break;
          case 0x24: result.birth = text; break;
          case 0x25: result.gender = text; break;
        }
      }
    }

    return result;
  }

  /**
   * レスポンスが成功かどうかを判定
   */
  private isSuccess(resp: ResponseApdu): boolean {
    return resp.sw === 0x9000;
  }
}
