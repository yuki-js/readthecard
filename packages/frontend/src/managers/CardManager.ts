/**
 * カード読み取りマネージャー
 * jsapdu-over-ip を使用してマイナンバーカードを読み取る
 * 
 * Reactのライフサイクルとは独立した手続き的処理を提供
 * ViewModelパターンでReactコンポーネントに抽象的な操作のみ公開
 */

import { 
  RemoteSmartCardPlatform,
  FetchClientTransport,
  CommandApdu,
} from '@readthecard/jsapdu-over-ip';
import type { SmartCardDevice, SmartCard } from '@aokiapp/jsapdu-interface';

// マイナンバーカード 券面事項入力補助AP
const KENHOJO_AP = new Uint8Array([0xD3, 0x92, 0x10, 0x00, 0x00, 0x00, 0x01, 0x01]);

// 券面事項入力補助AP EF
const KENHOJO_EF = {
  PIN: 0x01,
  BASIC_FOUR: 0x02,
};

export interface BasicFourInfo {
  name: string;
  address: string;
  birthDate: string;
  sex: string;
}

export interface CardManagerState {
  status: 'idle' | 'initializing' | 'waiting-device' | 'waiting-card' | 'ready' | 'reading' | 'error';
  error?: string;
  deviceName?: string;
}

export type CardManagerListener = (state: CardManagerState) => void;

/**
 * カード読み取りマネージャークラス
 * シングルトンパターンで実装
 */
export class CardManager {
  private static instance: CardManager | null = null;
  
  private transport: FetchClientTransport;
  private platform: RemoteSmartCardPlatform;
  private device: SmartCardDevice | null = null;
  private card: SmartCard | null = null;
  private listeners: Set<CardManagerListener> = new Set();
  private _state: CardManagerState = { status: 'idle' };

  private constructor(apiEndpoint: string) {
    this.transport = new FetchClientTransport(apiEndpoint);
    this.platform = new RemoteSmartCardPlatform(this.transport);
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(apiEndpoint: string = '/api/jsapdu/rpc'): CardManager {
    if (!CardManager.instance) {
      CardManager.instance = new CardManager(apiEndpoint);
    }
    return CardManager.instance;
  }

  /**
   * 状態を取得
   */
  get state(): CardManagerState {
    return this._state;
  }

  /**
   * 状態変更リスナーを登録
   */
  addListener(listener: CardManagerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(state: CardManagerState): void {
    this._state = state;
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  /**
   * プラットフォームを初期化しデバイスを取得
   */
  async initialize(): Promise<void> {
    try {
      this.setState({ status: 'initializing' });
      
      if (!this.platform.isInitialized()) {
        await this.platform.init();
      }

      this.setState({ status: 'waiting-device' });
      
      const devices = await this.platform.getDeviceInfo();
      if (devices.length === 0) {
        throw new Error('カードリーダーが見つかりません');
      }

      this.device = await this.platform.acquireDevice(devices[0].id);
      this.setState({ 
        status: 'waiting-card',
        deviceName: devices[0].friendlyName || devices[0].id,
      });
    } catch (err) {
      this.setState({ status: 'error', error: String(err) });
      throw err;
    }
  }

  /**
   * カードの挿入を待機してセッションを開始
   */
  async waitForCardAndConnect(timeoutMs: number = 30000): Promise<void> {
    if (!this.device) {
      throw new Error('デバイスが初期化されていません');
    }

    try {
      await this.device.waitForCardPresence(timeoutMs);
      this.card = await this.device.startSession();
      
      // 券面事項入力補助APを選択
      const selectCmd = new CommandApdu(0x00, 0xA4, 0x04, 0x0C, KENHOJO_AP, null);
      const response = await this.card.transmit(selectCmd);
      if (response.sw !== 0x9000) {
        throw new Error(`券面事項入力補助APの選択に失敗: SW=${response.sw.toString(16)}`);
      }

      this.setState({ status: 'ready', deviceName: this._state.deviceName });
    } catch (err) {
      this.setState({ status: 'error', error: String(err) });
      throw err;
    }
  }

  /**
   * PINを検証
   */
  async verifyPin(pin: string): Promise<{ verified: boolean; remainingAttempts?: number }> {
    if (!this.card) {
      throw new Error('カードセッションがありません');
    }

    const pinData = new Uint8Array(pin.split('').map(c => c.charCodeAt(0)));
    const verifyCmd = new CommandApdu(0x00, 0x20, 0x00, 0x80 + KENHOJO_EF.PIN, pinData, null);
    const response = await this.card.transmit(verifyCmd);

    if (response.sw === 0x9000) {
      return { verified: true };
    }

    if (response.sw1 === 0x63) {
      const remainingAttempts = response.sw2 & 0x0F;
      return { verified: false, remainingAttempts };
    }

    throw new Error(`PIN検証エラー: SW=${response.sw.toString(16)}`);
  }

  /**
   * 基本4情報を読み取り
   */
  async readBasicFour(): Promise<BasicFourInfo> {
    if (!this.card) {
      throw new Error('カードセッションがありません');
    }

    this.setState({ status: 'reading', deviceName: this._state.deviceName });

    try {
      // EF(基本4情報)を選択
      const selectEfCmd = new CommandApdu(0x00, 0xA4, 0x02, 0x0C, new Uint8Array([0x00, KENHOJO_EF.BASIC_FOUR]), null);
      const selectResp = await this.card.transmit(selectEfCmd);
      if (selectResp.sw !== 0x9000) {
        throw new Error(`基本4情報EFの選択に失敗: SW=${selectResp.sw.toString(16)}`);
      }

      // READ BINARY
      const readCmd = new CommandApdu(0x00, 0xB0, 0x00, 0x00, null, 0);
      const readResp = await this.card.transmit(readCmd);
      if (readResp.sw !== 0x9000 && readResp.sw1 !== 0x62) {
        throw new Error(`基本4情報の読み取りに失敗: SW=${readResp.sw.toString(16)}`);
      }

      return this.parseBasicFourTlv(readResp.data);
    } finally {
      this.setState({ status: 'ready', deviceName: this._state.deviceName });
    }
  }

  /**
   * リソースを解放
   */
  async release(): Promise<void> {
    try {
      if (this.card) {
        await this.card.release();
        this.card = null;
      }
      if (this.device) {
        await this.device.release();
        this.device = null;
      }
      if (this.platform.isInitialized()) {
        await this.platform.release();
      }
    } catch {
      // エラーは無視
    }
    this.setState({ status: 'idle' });
  }

  /**
   * 基本4情報のTLVをパース
   */
  private parseBasicFourTlv(data: Uint8Array): BasicFourInfo {
    const decoder = new TextDecoder('utf-8');
    const result: BasicFourInfo = { name: '', address: '', birthDate: '', sex: '' };
    let offset = 0;

    while (offset < data.length) {
      let tag = data[offset]!;
      offset++;
      
      if ((tag & 0x1F) === 0x1F) {
        tag = (tag << 8) | data[offset]!;
        offset++;
      }

      if (offset >= data.length) break;

      let length = data[offset]!;
      offset++;

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

      switch (tag) {
        case 0xDF22:
          result.name = decoder.decode(value);
          break;
        case 0xDF23:
          result.address = decoder.decode(value);
          break;
        case 0xDF24:
          result.birthDate = decoder.decode(value);
          break;
        case 0xDF25:
          result.sex = decoder.decode(value);
          break;
      }
    }

    return result;
  }
}

// デフォルトのカードマネージャーインスタンス
export const cardManager = CardManager.getInstance();
