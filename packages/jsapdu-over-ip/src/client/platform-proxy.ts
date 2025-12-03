/**
 * SmartCardPlatform のクライアント側プロキシ
 * サーバー側のSmartCardPlatformインスタンスを完全にミラーリング
 * 
 * Transport Agnostic: 任意のClientTransportを注入して使用
 */

import type { ClientTransport } from '../transport.js';
import type { SerializedDeviceInfo, RpcRequest, RpcResponse } from '../types.js';
import { SmartCardDeviceProxy } from './device-proxy.js';

let requestIdCounter = 0;
function generateRequestId(): string {
  return `req-${Date.now()}-${++requestIdCounter}`;
}

/**
 * プロキシエラー
 */
export class SmartCardProxyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'SmartCardProxyError';
  }
}

/**
 * SmartCardDeviceInfo のクライアント側実装
 */
export class SmartCardDeviceInfoProxy {
  constructor(private readonly info: SerializedDeviceInfo) {}

  get id(): string { return this.info.id; }
  get devicePath(): string | undefined { return this.info.devicePath; }
  get friendlyName(): string | undefined { return this.info.friendlyName; }
  get description(): string | undefined { return this.info.description; }
  get supportsApdu(): boolean { return this.info.supportsApdu; }
  get supportsHce(): boolean { return this.info.supportsHce; }
  get isIntegratedDevice(): boolean { return this.info.isIntegratedDevice; }
  get isRemovableDevice(): boolean { return this.info.isRemovableDevice; }
  get d2cProtocol(): SerializedDeviceInfo['d2cProtocol'] { return this.info.d2cProtocol; }
  get p2dProtocol(): SerializedDeviceInfo['p2dProtocol'] { return this.info.p2dProtocol; }
  get apduApi(): string[] { return this.info.apduApi; }
  get antennaInfo(): SerializedDeviceInfo['antennaInfo'] { return this.info.antennaInfo; }
}

/**
 * SmartCardPlatform のクライアント側プロキシ
 * jsapduのSmartCardPlatformと同じインターフェースを提供
 */
export class SmartCardPlatformProxy {
  private _initialized: boolean = false;
  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  /**
   * @param transport - 使用するトランスポート（HTTP, WebSocket, IPC等）
   */
  constructor(private readonly transport: ClientTransport) {}

  /**
   * RPC呼び出し
   */
  private async call<T>(method: string, params?: unknown[]): Promise<T> {
    const request: RpcRequest = {
      id: generateRequestId(),
      method,
      params,
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
   * プラットフォームを初期化
   */
  async init(force?: boolean): Promise<void> {
    await this.call<void>('platform.init', [force]);
    this._initialized = true;
  }

  /**
   * プラットフォームを解放
   */
  async release(force?: boolean): Promise<void> {
    await this.call<void>('platform.release', [force]);
    this._initialized = false;
  }

  /**
   * 初期化済みかどうか
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * 初期化済みであることを確認
   */
  assertInitialized(): void {
    if (!this._initialized) {
      throw new SmartCardProxyError('NOT_INITIALIZED', 'Platform not initialized');
    }
  }

  /**
   * 初期化されていないことを確認
   */
  assertNotInitialized(): void {
    if (this._initialized) {
      throw new SmartCardProxyError('ALREADY_INITIALIZED', 'Platform already initialized');
    }
  }

  /**
   * デバイス情報一覧を取得
   */
  async getDeviceInfo(): Promise<SmartCardDeviceInfoProxy[]> {
    const infos = await this.call<SerializedDeviceInfo[]>('platform.getDeviceInfo');
    return infos.map(info => new SmartCardDeviceInfoProxy(info));
  }

  /**
   * デバイスを取得
   */
  async acquireDevice(id: string): Promise<SmartCardDeviceProxy> {
    const deviceId = await this.call<string>('platform.acquireDevice', [id]);
    return new SmartCardDeviceProxy(this.transport, deviceId, this);
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
    if (this._initialized) {
      await this.release();
    }
  }
}
