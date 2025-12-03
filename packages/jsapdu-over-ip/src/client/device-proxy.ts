/**
 * SmartCardDevice のクライアント側プロキシ
 */

import type { ClientTransport } from '../transport.js';
import type { SerializedDeviceInfo, RpcRequest, RpcResponse } from '../types.js';
import { SmartCardDeviceInfoProxy, SmartCardProxyError } from './platform-proxy.js';
import { SmartCardProxy } from './card-proxy.js';

let requestIdCounter = 0;
function generateRequestId(): string {
  return `req-${Date.now()}-${++requestIdCounter}`;
}

/**
 * SmartCardDevice のクライアント側プロキシ
 */
export class SmartCardDeviceProxy {
  private _sessionActive: boolean = false;
  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  constructor(
    private readonly transport: ClientTransport,
    private readonly deviceId: string,
    private readonly parentPlatform: { assertInitialized(): void }
  ) {
    this.parentPlatform.assertInitialized();
  }

  /**
   * RPC呼び出し
   */
  private async call<T>(method: string, params?: unknown[]): Promise<T> {
    const request: RpcRequest = {
      id: generateRequestId(),
      method,
      params: [this.deviceId, ...(params || [])],
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
  async getDeviceInfo(): Promise<SmartCardDeviceInfoProxy> {
    const info = await this.call<SerializedDeviceInfo>('device.getDeviceInfo');
    return new SmartCardDeviceInfoProxy(info);
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
  async startSession(): Promise<SmartCardProxy> {
    const cardId = await this.call<string>('device.startSession');
    this._sessionActive = true;
    return new SmartCardProxy(this.transport, cardId, this);
  }

  /**
   * カードの挿入を待機
   */
  async waitForCardPresence(timeout: number): Promise<void> {
    await this.call<void>('device.waitForCardPresence', [timeout]);
  }

  /**
   * HCEセッションを開始（未実装）
   */
  async startHceSession(): Promise<never> {
    throw new SmartCardProxyError('NOT_SUPPORTED', 'HCE is not supported over network');
  }

  /**
   * デバイスを解放
   */
  async release(): Promise<void> {
    await this.call<void>('device.release');
    this._sessionActive = false;
  }

  /**
   * イベントリスナーを登録
   */
  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * asyncDispose
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.release();
  }
}
