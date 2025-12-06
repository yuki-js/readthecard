/**
 * SmartCardPlatform のクライアント側リモート実装
 * @aokiapp/jsapdu-interface の SmartCardPlatform を継承
 *
 * サーバー側のSmartCardPlatformインスタンスを完全にミラーリング
 * ローカルかリモートか区別できない完全なSmartCardPlatform
 */

import {
  SmartCardPlatform,
  SmartCardDeviceInfo,
  type SmartCardDevice,
  type NfcAntennaInfo,
} from "@aokiapp/jsapdu-interface";
import type { ClientTransport } from "../transport.js";
import type {
  SerializedDeviceInfo,
  RpcRequest,
  RpcResponse,
} from "../types.js";
import { RemoteSmartCardDevice } from "./device-proxy.js";

let requestIdCounter = 0;
function generateRequestId(): string {
  return `req-${Date.now()}-${++requestIdCounter}`;
}

/**
 * リモートエラー
 */
export class RemoteSmartCardError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "RemoteSmartCardError";
  }
}

/**
 * SmartCardDeviceInfo のクライアント側リモート実装
 * SmartCardDeviceInfoを正しく継承
 */
export class RemoteSmartCardDeviceInfo extends SmartCardDeviceInfo {
  public readonly id: string;
  public readonly devicePath?: string;
  public readonly friendlyName?: string;
  public readonly description?: string;
  public readonly supportsApdu: boolean;
  public readonly supportsHce: boolean;
  public readonly isIntegratedDevice: boolean;
  public readonly isRemovableDevice: boolean;
  public readonly d2cProtocol:
    | "iso7816"
    | "nfc"
    | "integrated"
    | "other"
    | "unknown";
  public readonly p2dProtocol:
    | "usb"
    | "ble"
    | "nfc"
    | "integrated"
    | "other"
    | "unknown";
  public readonly apduApi: string[];
  public readonly antennaInfo?: NfcAntennaInfo;

  constructor(info: SerializedDeviceInfo) {
    super();
    this.id = info.id;
    this.devicePath = info.devicePath;
    this.friendlyName = info.friendlyName;
    this.description = info.description;
    this.supportsApdu = info.supportsApdu;
    this.supportsHce = info.supportsHce;
    this.isIntegratedDevice = info.isIntegratedDevice;
    this.isRemovableDevice = info.isRemovableDevice;
    this.d2cProtocol = info.d2cProtocol;
    this.p2dProtocol = info.p2dProtocol;
    this.apduApi = info.apduApi;
    this.antennaInfo = info.antennaInfo;
  }
}

/**
 * SmartCardPlatform のクライアント側リモート実装
 * SmartCardPlatformを正しく継承
 * jsapduのSmartCardPlatformと100%互換
 */
export class RemoteSmartCardPlatform extends SmartCardPlatform {
  private acquiredDevices: Map<string, RemoteSmartCardDevice> = new Map();
  private devicesByHandle: Map<string, RemoteSmartCardDevice> = new Map();

  /**
   * @param transport - 使用するトランスポート（HTTP, WebSocket, IPC等）
   */
  constructor(private readonly transport: ClientTransport) {
    super();
  }

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
      throw new RemoteSmartCardError(
        response.error.code,
        response.error.message,
        response.error.data,
      );
    }

    return response.result as T;
  }

  /**
   * プラットフォームを初期化
   */
  async init(force?: boolean): Promise<void> {
    if (!force) {
      this.assertNotInitialized();
    }
    await this.call<void>("platform.init", [force]);
    this.initialized = true;
  }

  /**
   * プラットフォームを解放
   */
  async release(force?: boolean): Promise<void> {
    if (!force) {
      this.assertInitialized();
    }

    // Release all acquired devices
    const releasePromises = Array.from(this.acquiredDevices.values()).map(
      (device) => device.release().catch(() => {}),
    );
    await Promise.allSettled(releasePromises);
    this.acquiredDevices.clear();
    this.devicesByHandle.clear();

    await this.call<void>("platform.release", [force]);
    this.initialized = false;
  }

  /**
   * デバイス情報一覧を取得
   */
  async getDeviceInfo(): Promise<RemoteSmartCardDeviceInfo[]> {
    this.assertInitialized();
    const infos = await this.call<SerializedDeviceInfo[]>(
      "platform.getDeviceInfo",
    );
    return infos.map((info) => new RemoteSmartCardDeviceInfo(info));
  }

  /**
   * デバイスを取得
   */
  async acquireDevice(id: string): Promise<SmartCardDevice> {
    this.assertInitialized();

    if (this.acquiredDevices.has(id)) {
      throw new RemoteSmartCardError(
        "ALREADY_CONNECTED",
        `Device ${id} is already acquired`,
      );
    }

    const deviceHandle = await this.call<string>("platform.acquireDevice", [
      id,
    ]);

    // Get device info
    const infos = await this.getDeviceInfo();
    const deviceInfo = infos.find((info) => info.id === id);
    if (!deviceInfo) {
      throw new RemoteSmartCardError("READER_ERROR", `Device ${id} not found`);
    }

    const device = new RemoteSmartCardDevice(
      this.transport,
      deviceHandle,
      deviceInfo,
      this,
    );
    this.acquiredDevices.set(id, device);
    this.devicesByHandle.set(deviceHandle, device);
    return device;
  }

  /**
   * デバイスの追跡を解除（内部用）
   */
  untrackDevice(deviceId: string, deviceHandle?: string): void {
    this.acquiredDevices.delete(deviceId);
    if (deviceHandle) {
      this.devicesByHandle.delete(deviceHandle);
    }
  }
}
