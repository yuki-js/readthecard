/**
 * SmartCard のクライアント側リモート実装
 * @aokiapp/jsapdu-interface の SmartCard を継承
 */

import {
  SmartCard,
  type SmartCardDevice,
  CommandApdu as JsapduCommandApdu,
  ResponseApdu as JsapduResponseApdu,
} from "@aokiapp/jsapdu-interface";
import type { ClientTransport } from "../transport.js";
import type {
  RpcRequest,
  RpcResponse,
  SerializedCommandApdu,
  SerializedResponseApdu,
} from "../types.js";
import { RemoteSmartCardError } from "./platform-proxy.js";

let requestIdCounter = 0;
function generateRequestId(): string {
  return `req-${Date.now()}-${++requestIdCounter}`;
}

// Re-export CommandApdu and ResponseApdu from jsapdu-interface
export { JsapduCommandApdu as CommandApdu, JsapduResponseApdu as ResponseApdu };

/**
 * SmartCard のクライアント側リモート実装
 * SmartCardを正しく継承
 */
export class RemoteSmartCard extends SmartCard {
  private readonly cardHandle: string;

  constructor(
    private readonly transport: ClientTransport,
    cardHandle: string,
    parentDevice: SmartCardDevice,
  ) {
    super(parentDevice);
    this.cardHandle = cardHandle;
  }

  /**
   * RPC呼び出し
   */
  private async call<T>(method: string, params?: unknown[]): Promise<T> {
    const request: RpcRequest = {
      id: generateRequestId(),
      method,
      params: [this.cardHandle, ...(params || [])],
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
   * ATRを取得
   */
  async getAtr(): Promise<Uint8Array> {
    const atr = await this.call<number[]>("card.getAtr");
    return new Uint8Array(atr);
  }

  /**
   * APDUコマンドを送信
   */
  async transmit(apdu: JsapduCommandApdu): Promise<JsapduResponseApdu>;
  async transmit(apdu: Uint8Array): Promise<Uint8Array>;
  async transmit(
    apdu: JsapduCommandApdu | Uint8Array,
  ): Promise<JsapduResponseApdu | Uint8Array> {
    if (apdu instanceof JsapduCommandApdu) {
      const serialized: SerializedCommandApdu = {
        cla: apdu.cla,
        ins: apdu.ins,
        p1: apdu.p1,
        p2: apdu.p2,
        data: apdu.data ? Array.from(apdu.data) : null,
        le: apdu.le,
      };
      const result = await this.call<SerializedResponseApdu>("card.transmit", [
        serialized,
      ]);
      return new JsapduResponseApdu(
        new Uint8Array(result.data),
        result.sw1,
        result.sw2,
      );
    } else {
      const result = await this.call<number[]>("card.transmitRaw", [
        Array.from(apdu),
      ]);
      return new Uint8Array(result);
    }
  }

  /**
   * カードをリセット
   */
  async reset(): Promise<void> {
    await this.call<void>("card.reset");
  }

  /**
   * セッションを解放
   */
  async release(): Promise<void> {
    await this.call<void>("card.release");

    // Notify parent device
    const device = this.parentDevice as any;
    if (device.untrackCard) {
      device.untrackCard(this.cardHandle);
    }
  }
}
