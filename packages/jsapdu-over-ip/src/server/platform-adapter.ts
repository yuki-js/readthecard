/**
 * SmartCardPlatform のサーバー側アダプタ
 * 任意のSmartCardPlatformインスタンスをRPCで公開
 *
 * Transport Agnostic: 任意のServerTransportを注入して使用
 * @aokiapp/jsapdu-interface の SmartCardPlatform を受け入れ
 */

import {
  type SmartCardPlatform,
  type SmartCardDevice,
  type SmartCard,
  type SmartCardDeviceInfo,
  CommandApdu,
  ResponseApdu,
} from "@aokiapp/jsapdu-interface";
import type { ServerTransport } from "../transport.js";
import type {
  RpcRequest,
  RpcResponse,
  RpcError,
  SerializedDeviceInfo,
  SerializedCommandApdu,
  SerializedResponseApdu,
} from "../types.js";

/**
 * SmartCardPlatform アダプタ
 * 任意のSmartCardPlatformをRPCで公開する
 * 複数デバイス/カードをサポート
 */
export class SmartCardPlatformAdapter {
  private devices: Map<string, SmartCardDevice> = new Map();
  private deviceHandleToId: Map<string, string> = new Map();
  private cards: Map<string, SmartCard> = new Map();
  private cardHandleCounter = 0;
  private deviceHandleCounter = 0;

  constructor(
    private readonly platform: SmartCardPlatform,
    private readonly transport: ServerTransport,
  ) {
    this.transport.onRequest(this.handleRequest.bind(this));
  }

  /**
   * アダプタを開始
   */
  async start(): Promise<void> {
    await this.transport.start();
  }

  /**
   * アダプタを停止
   */
  async stop(): Promise<void> {
    await this.transport.stop();
  }

  /**
   * RPCリクエストを処理
   */
  private async handleRequest(request: RpcRequest): Promise<RpcResponse> {
    try {
      const result = await this.dispatch(request.method, request.params || []);
      return { id: request.id, result };
    } catch (error) {
      const rpcError: RpcError = {
        code: (error as { code?: string }).code || "INTERNAL_ERROR",
        message: (error as Error).message || "Unknown error",
      };
      return { id: request.id, error: rpcError };
    }
  }

  /**
   * メソッドをディスパッチ
   */
  private async dispatch(method: string, params: unknown[]): Promise<unknown> {
    switch (method) {
      // Platform methods
      case "platform.init":
        await this.platform.init(params[0] as boolean | undefined);
        return null;

      case "platform.release":
        // Release all devices and cards first
        for (const card of this.cards.values()) {
          try {
            await card.release();
          } catch {}
        }
        this.cards.clear();
        for (const device of this.devices.values()) {
          try {
            await device.release();
          } catch {}
        }
        this.devices.clear();
        this.deviceHandleToId.clear();
        await this.platform.release(params[0] as boolean | undefined);
        return null;

      case "platform.isInitialized":
        return this.platform.isInitialized();

      case "platform.getDeviceInfo": {
        const infos = await this.platform.getDeviceInfo();
        return infos.map((info) => this.serializeDeviceInfo(info));
      }

      case "platform.acquireDevice": {
        const deviceId = params[0] as string;
        const device = await this.platform.acquireDevice(deviceId);
        const deviceHandle = `device-${++this.deviceHandleCounter}`;
        this.devices.set(deviceHandle, device);
        this.deviceHandleToId.set(deviceHandle, deviceId);
        return deviceHandle;
      }

      // Device methods
      case "device.getDeviceInfo": {
        const device = this.getDevice(params[0] as string);
        return this.serializeDeviceInfo(device.getDeviceInfo());
      }

      case "device.isSessionActive": {
        const device = this.getDevice(params[0] as string);
        return device.isSessionActive();
      }

      case "device.isDeviceAvailable": {
        const device = this.getDevice(params[0] as string);
        return device.isDeviceAvailable();
      }

      case "device.isCardPresent": {
        const device = this.getDevice(params[0] as string);
        return device.isCardPresent();
      }

      case "device.startSession": {
        const deviceHandle = params[0] as string;
        const device = this.getDevice(deviceHandle);
        const card = await device.startSession();
        const cardHandle = `card-${++this.cardHandleCounter}`;
        this.cards.set(cardHandle, card);
        return cardHandle;
      }

      case "device.waitForCardPresence": {
        const device = this.getDevice(params[0] as string);
        const timeout = params[1] as number;
        await device.waitForCardPresence(timeout);
        return null;
      }

      case "device.release": {
        const deviceHandle = params[0] as string;
        const device = this.getDevice(deviceHandle);
        await device.release();
        this.devices.delete(deviceHandle);
        this.deviceHandleToId.delete(deviceHandle);
        return null;
      }

      // Card methods
      case "card.getAtr": {
        const card = this.getCard(params[0] as string);
        const atr = await card.getAtr();
        return Array.from(atr);
      }

      case "card.transmit": {
        const card = this.getCard(params[0] as string);
        const cmdSerialized = params[1] as SerializedCommandApdu;
        const cmd = new CommandApdu(
          cmdSerialized.cla,
          cmdSerialized.ins,
          cmdSerialized.p1,
          cmdSerialized.p2,
          cmdSerialized.data ? new Uint8Array(cmdSerialized.data) : null,
          cmdSerialized.le,
        );
        const resp = await card.transmit(cmd);
        return this.serializeResponseApdu(resp as ResponseApdu);
      }

      case "card.transmitRaw": {
        const card = this.getCard(params[0] as string);
        const rawCmd = new Uint8Array(params[1] as number[]);
        const resp = await card.transmit(rawCmd);
        return Array.from(resp as Uint8Array);
      }

      case "card.reset": {
        const card = this.getCard(params[0] as string);
        await card.reset();
        return null;
      }

      case "card.release": {
        const cardHandle = params[0] as string;
        const card = this.getCard(cardHandle);
        await card.release();
        this.cards.delete(cardHandle);
        return null;
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private getDevice(handle: string): SmartCardDevice {
    const device = this.devices.get(handle);
    if (!device) {
      throw new Error(`Device not found: ${handle}`);
    }
    return device;
  }

  private getCard(handle: string): SmartCard {
    const card = this.cards.get(handle);
    if (!card) {
      throw new Error(`Card not found: ${handle}`);
    }
    return card;
  }

  private serializeDeviceInfo(info: SmartCardDeviceInfo): SerializedDeviceInfo {
    return {
      id: info.id,
      devicePath: info.devicePath,
      friendlyName: info.friendlyName,
      description: info.description,
      supportsApdu: info.supportsApdu,
      supportsHce: info.supportsHce,
      isIntegratedDevice: info.isIntegratedDevice,
      isRemovableDevice: info.isRemovableDevice,
      d2cProtocol: info.d2cProtocol as SerializedDeviceInfo["d2cProtocol"],
      p2dProtocol: info.p2dProtocol as SerializedDeviceInfo["p2dProtocol"],
      apduApi: info.apduApi,
      antennaInfo: info.antennaInfo as SerializedDeviceInfo["antennaInfo"],
    };
  }

  private serializeResponseApdu(resp: ResponseApdu): SerializedResponseApdu {
    return {
      data: Array.from(resp.data),
      sw1: resp.sw1,
      sw2: resp.sw2,
    };
  }
}
