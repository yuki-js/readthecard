/**
 * SmartCardDevice のクライアント側プロキシ
 * @aokiapp/jsapdu-interface の SmartCardDevice を継承
 */

import {
  SmartCardDevice,
  SmartCardDeviceInfo,
  type SmartCardPlatform,
  type SmartCard,
  type EmulatedCard,
  SmartCardError,
} from '@aokiapp/jsapdu-interface';
import type { ClientTransport } from '../transport.js';
import type { RpcRequest, RpcResponse } from '../types.js';
import { SmartCardProxyError, type SmartCardDeviceInfoProxy } from './platform-proxy.js';
import { SmartCardProxy } from './card-proxy.js';

let requestIdCounter = 0;
function generateRequestId(): string {
  return `req-${Date.now()}-${++requestIdCounter}`;
}

/**
 * SmartCardDevice のクライアント側プロキシ
 * SmartCardDeviceを正しく継承
 */
export class SmartCardDeviceProxy extends SmartCardDevice {
  private _sessionActive: boolean = false;
  private _deviceInfo: SmartCardDeviceInfoProxy;
  private cards: Map<string, SmartCardProxy> = new Map();

  constructor(
    private readonly transport: ClientTransport,
    private readonly deviceHandle: string,
    deviceInfo: SmartCardDeviceInfoProxy,
    parentPlatform: SmartCardPlatform
  ) {
    super(parentPlatform);
    this._deviceInfo = deviceInfo;
  }

  /**
   * RPC呼び出し
   */
  private async call<T>(method: string, params?: unknown[]): Promise<T> {
    const request: RpcRequest = {
      id: generateRequestId(),
      method,
      params: [this.deviceHandle, ...(params || [])],
    };

    const response: RpcResponse = await this.transport.call(request);

    if (response.error) {
      throw new SmartCardProxyError(
        response.error.code,
        response.error.message,
        response.error.data
      );
    }

    return response.result as T;
  }

  /**
   * デバイス情報を取得
   */
  getDeviceInfo(): SmartCardDeviceInfo {
    return this._deviceInfo;
  }

  /**
   * セッションがアクティブかどうか
   */
  isSessionActive(): boolean {
    return this._sessionActive;
  }

  /**
   * デバイスが利用可能かどうか
   */
  async isDeviceAvailable(): Promise<boolean> {
    return this.call<boolean>('device.isDeviceAvailable');
  }

  /**
   * カードが挿入されているかどうか
   */
  async isCardPresent(): Promise<boolean> {
    return this.call<boolean>('device.isCardPresent');
  }

  /**
   * カードセッションを開始
   */
  async startSession(): Promise<SmartCard> {
    const cardHandle = await this.call<string>('device.startSession');
    this._sessionActive = true;
    const card = new SmartCardProxy(this.transport, cardHandle, this);
    this.cards.set(cardHandle, card);
    this.card = card;
    return card;
  }

  /**
   * カードの挿入を待機
   */
  async waitForCardPresence(timeout: number): Promise<void> {
    await this.call<void>('device.waitForCardPresence', [timeout]);
  }

  /**
   * HCEセッションを開始（ネットワーク越しでは未サポート）
   */
  async startHceSession(): Promise<EmulatedCard> {
    throw new SmartCardError('NOT_SUPPORTED', 'HCE is not supported over network');
  }

  /**
   * デバイスを解放
   */
  async release(): Promise<void> {
    // Release all cards first
    for (const card of this.cards.values()) {
      try {
        await card.release();
      } catch {
        // ignore
      }
    }
    this.cards.clear();
    this.card = null;

    await this.call<void>('device.release');
    this._sessionActive = false;

    // Notify parent platform
    const platform = this.parentPlatform as any;
    if (platform.untrackDevice) {
      platform.untrackDevice(this._deviceInfo.id, this.deviceHandle);
    }
  }

  /**
   * カードの追跡を解除（内部用）
   */
  untrackCard(cardHandle: string): void {
    this.cards.delete(cardHandle);
    if (this.card && (this.card as any).cardHandle === cardHandle) {
      this.card = null;
    }
  }
}
