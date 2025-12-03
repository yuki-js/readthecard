/**
 * SmartCardPlatform のサーバー側アダプタ
 * 実際のSmartCardPlatformインスタンスをRPCで公開
 * 
 * Transport Agnostic: 任意のServerTransportを注入して使用
 */

import type { ServerTransport } from '../transport.js';
import type { 
  RpcRequest, 
  RpcResponse, 
  RpcError,
  SerializedDeviceInfo,
  SerializedCommandApdu,
  SerializedResponseApdu,
} from '../types.js';

/**
 * jsapdu の型定義（実際のjsapduからインポートする代わりにここで定義）
 */
interface SmartCardPlatform {
  init(force?: boolean): Promise<void>;
  release(force?: boolean): Promise<void>;
  isInitialized(): boolean;
  getDeviceInfo(): Promise<SmartCardDeviceInfo[]>;
  acquireDevice(id: string): Promise<SmartCardDevice>;
}

interface SmartCardDeviceInfo {
  id: string;
  devicePath?: string;
  friendlyName?: string;
  description?: string;
  supportsApdu: boolean;
  supportsHce: boolean;
  isIntegratedDevice: boolean;
  isRemovableDevice: boolean;
  d2cProtocol: string;
  p2dProtocol: string;
  apduApi: string[];
  antennaInfo?: unknown;
}

interface SmartCardDevice {
  getDeviceInfo(): SmartCardDeviceInfo;
  isSessionActive(): boolean;
  isDeviceAvailable(): Promise<boolean>;
  isCardPresent(): Promise<boolean>;
  startSession(): Promise<SmartCard>;
  waitForCardPresence(timeout: number): Promise<void>;
  release(): Promise<void>;
}

interface SmartCard {
  getAtr(): Promise<Uint8Array>;
  transmit(apdu: unknown): Promise<unknown>;
  reset(): Promise<void>;
  release(): Promise<void>;
}

interface CommandApdu {
  cla: number;
  ins: number;
  p1: number;
  p2: number;
  data: Uint8Array | null;
  le: number | null;
}

interface ResponseApdu {
  data: Uint8Array;
  sw1: number;
  sw2: number;
}

/**
 * SmartCardPlatform アダプタ
 * 実際のSmartCardPlatformをRPCで公開する
 */
export class SmartCardPlatformAdapter {
  private devices: Map<string, SmartCardDevice> = new Map();
  private cards: Map<string, SmartCard> = new Map();
  private cardIdCounter = 0;

  constructor(
    private readonly platform: SmartCardPlatform,
    private readonly transport: ServerTransport
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
        code: (error as { code?: string }).code || 'INTERNAL_ERROR',
        message: (error as Error).message || 'Unknown error',
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
      case 'platform.init':
        await this.platform.init(params[0] as boolean | undefined);
        return null;

      case 'platform.release':
        await this.platform.release(params[0] as boolean | undefined);
        return null;

      case 'platform.isInitialized':
        return this.platform.isInitialized();

      case 'platform.getDeviceInfo':
        const infos = await this.platform.getDeviceInfo();
        return infos.map(this.serializeDeviceInfo);

      case 'platform.acquireDevice': {
        const deviceId = params[0] as string;
        const device = await this.platform.acquireDevice(deviceId);
        this.devices.set(deviceId, device);
        return deviceId;
      }

      // Device methods
      case 'device.getDeviceInfo': {
        const device = this.getDevice(params[0] as string);
        return this.serializeDeviceInfo(device.getDeviceInfo());
      }

      case 'device.isSessionActive': {
        const device = this.getDevice(params[0] as string);
        return device.isSessionActive();
      }

      case 'device.isDeviceAvailable': {
        const device = this.getDevice(params[0] as string);
        return device.isDeviceAvailable();
      }

      case 'device.isCardPresent': {
        const device = this.getDevice(params[0] as string);
        return device.isCardPresent();
      }

      case 'device.startSession': {
        const device = this.getDevice(params[0] as string);
        const card = await device.startSession();
        const cardId = `card-${++this.cardIdCounter}`;
        this.cards.set(cardId, card);
        return cardId;
      }

      case 'device.waitForCardPresence': {
        const device = this.getDevice(params[0] as string);
        const timeout = params[1] as number;
        await device.waitForCardPresence(timeout);
        return null;
      }

      case 'device.release': {
        const deviceId = params[0] as string;
        const device = this.getDevice(deviceId);
        await device.release();
        this.devices.delete(deviceId);
        return null;
      }

      // Card methods
      case 'card.getAtr': {
        const card = this.getCard(params[0] as string);
        const atr = await card.getAtr();
        return Array.from(atr);
      }

      case 'card.transmit': {
        const card = this.getCard(params[0] as string);
        const cmdSerialized = params[1] as SerializedCommandApdu;
        const cmd = this.deserializeCommandApdu(cmdSerialized);
        const resp = await card.transmit(cmd) as ResponseApdu;
        return this.serializeResponseApdu(resp);
      }

      case 'card.transmitRaw': {
        const card = this.getCard(params[0] as string);
        const rawCmd = new Uint8Array(params[1] as number[]);
        const resp = await card.transmit(rawCmd) as Uint8Array;
        return Array.from(resp);
      }

      case 'card.reset': {
        const card = this.getCard(params[0] as string);
        await card.reset();
        return null;
      }

      case 'card.release': {
        const cardId = params[0] as string;
        const card = this.getCard(cardId);
        await card.release();
        this.cards.delete(cardId);
        return null;
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private getDevice(id: string): SmartCardDevice {
    const device = this.devices.get(id);
    if (!device) {
      throw new Error(`Device not found: ${id}`);
    }
    return device;
  }

  private getCard(id: string): SmartCard {
    const card = this.cards.get(id);
    if (!card) {
      throw new Error(`Card not found: ${id}`);
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
      d2cProtocol: info.d2cProtocol as SerializedDeviceInfo['d2cProtocol'],
      p2dProtocol: info.p2dProtocol as SerializedDeviceInfo['p2dProtocol'],
      apduApi: info.apduApi,
      antennaInfo: info.antennaInfo as SerializedDeviceInfo['antennaInfo'],
    };
  }

  private deserializeCommandApdu(s: SerializedCommandApdu): CommandApdu {
    return {
      cla: s.cla,
      ins: s.ins,
      p1: s.p1,
      p2: s.p2,
      data: s.data ? new Uint8Array(s.data) : null,
      le: s.le,
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
