/**
 * SmartCard のクライアント側プロキシ
 */

import type { ClientTransport } from '../transport.js';
import type { RpcRequest, RpcResponse, SerializedCommandApdu, SerializedResponseApdu } from '../types.js';
import { SmartCardProxyError } from './platform-proxy.js';

let requestIdCounter = 0;
function generateRequestId(): string {
  return `req-${Date.now()}-${++requestIdCounter}`;
}

/**
 * CommandApdu クラス（jsapduと同じインターフェース）
 */
export class CommandApdu {
  constructor(
    public readonly cla: number,
    public readonly ins: number,
    public readonly p1: number,
    public readonly p2: number,
    public readonly data: Uint8Array | null = null,
    public readonly le: number | null = null
  ) {}

  toUint8Array(): Uint8Array {
    const header = new Uint8Array([this.cla, this.ins, this.p1, this.p2]);
    const isExtended = (this.data && this.data.length > 255) || (this.le && this.le > 256);

    let bodyLen = 0;
    if (this.data && this.le !== null) {
      bodyLen = isExtended ? 1 + 2 + this.data.length + 2 : 1 + this.data.length + 1;
    } else if (this.data) {
      bodyLen = isExtended ? 1 + 2 + this.data.length : 1 + this.data.length;
    } else if (this.le !== null) {
      bodyLen = isExtended ? 1 + 2 : 1;
    }

    const result = new Uint8Array(4 + bodyLen);
    result.set(header, 0);
    // 簡略化のため詳細なエンコードは省略
    return result;
  }

  /** シリアライズ */
  toSerialized(): SerializedCommandApdu {
    return {
      cla: this.cla,
      ins: this.ins,
      p1: this.p1,
      p2: this.p2,
      data: this.data ? Array.from(this.data) : null,
      le: this.le,
    };
  }

  static fromSerialized(s: SerializedCommandApdu): CommandApdu {
    return new CommandApdu(
      s.cla,
      s.ins,
      s.p1,
      s.p2,
      s.data ? new Uint8Array(s.data) : null,
      s.le
    );
  }
}

/**
 * ResponseApdu クラス（jsapduと同じインターフェース）
 */
export class ResponseApdu {
  constructor(
    public readonly data: Uint8Array,
    public readonly sw1: number,
    public readonly sw2: number
  ) {}

  get sw(): number {
    return (this.sw1 << 8) | this.sw2;
  }

  toUint8Array(): Uint8Array {
    const result = new Uint8Array(this.data.length + 2);
    result.set(this.data, 0);
    result[this.data.length] = this.sw1;
    result[this.data.length + 1] = this.sw2;
    return result;
  }

  static fromSerialized(s: SerializedResponseApdu): ResponseApdu {
    return new ResponseApdu(
      new Uint8Array(s.data),
      s.sw1,
      s.sw2
    );
  }
}

/**
 * SmartCard のクライアント側プロキシ
 */
export class SmartCardProxy {
  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  constructor(
    private readonly transport: ClientTransport,
    private readonly cardId: string,
    private readonly parentDevice: object
  ) {}

  /**
   * RPC呼び出し
   */
  private async call<T>(method: string, params?: unknown[]): Promise<T> {
    const request: RpcRequest = {
      id: generateRequestId(),
      method,
      params: [this.cardId, ...(params || [])],
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
   * ATRを取得
   */
  async getAtr(): Promise<Uint8Array> {
    const atr = await this.call<number[]>('card.getAtr');
    return new Uint8Array(atr);
  }

  /**
   * APDUコマンドを送信
   */
  async transmit(apdu: CommandApdu): Promise<ResponseApdu>;
  async transmit(apdu: Uint8Array): Promise<Uint8Array>;
  async transmit(apdu: CommandApdu | Uint8Array): Promise<ResponseApdu | Uint8Array> {
    if (apdu instanceof CommandApdu) {
      const result = await this.call<SerializedResponseApdu>('card.transmit', [apdu.toSerialized()]);
      return ResponseApdu.fromSerialized(result);
    } else {
      const result = await this.call<number[]>('card.transmitRaw', [Array.from(apdu)]);
      return new Uint8Array(result);
    }
  }

  /**
   * カードをリセット
   */
  async reset(): Promise<void> {
    await this.call<void>('card.reset');
  }

  /**
   * セッションを解放
   */
  async release(): Promise<void> {
    await this.call<void>('card.release');
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
