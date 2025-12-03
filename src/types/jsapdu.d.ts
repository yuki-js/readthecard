/**
 * jsapduパッケージの型定義
 * 
 * 【重要】これらの型定義が必要な理由:
 * jsapduパッケージはGitHubのmonorepoから直接インストールされるが、
 * ビルド済みの型定義ファイル(dist/*.d.ts)が含まれていない。
 * そのため、TypeScriptが型情報を解決できるよう、手動で型定義を提供する必要がある。
 * 
 * 将来的にjsapduがnpmに公開され、型定義が同梱されれば、このファイルは不要になる。
 */

declare module '@aokiapp/jsapdu-interface' {
  export class CommandApdu {
    readonly cla: number;
    readonly ins: number;
    readonly p1: number;
    readonly p2: number;
    readonly data: Uint8Array | null;
    readonly le: number | null;

    constructor(
      cla: number,
      ins: number,
      p1: number,
      p2: number,
      data?: Uint8Array | number[] | null,
      le?: number | null
    );
    toUint8Array(): Uint8Array;
  }

  export class ResponseApdu {
    readonly data: Uint8Array;
    readonly sw1: number;
    readonly sw2: number;
    readonly sw: number;
  }

  export interface SmartCardDeviceInfo {
    id: string;
    friendlyName: string;
  }

  export abstract class SmartCardPlatform {
    abstract init(): Promise<void>;
    abstract release(): Promise<void>;
    abstract getDeviceInfo(): Promise<SmartCardDeviceInfo[]>;
    abstract acquireDevice(deviceId: string): Promise<SmartCardDevice>;
  }

  export abstract class SmartCardDevice {
    abstract isCardPresent(): Promise<boolean>;
    abstract waitForCardPresence(timeout: number): Promise<void>;
    abstract startSession(): Promise<SmartCard>;
    abstract release(): Promise<void>;
  }

  export abstract class SmartCard {
    abstract transmit(apdu: CommandApdu): Promise<ResponseApdu>;
    abstract release(): Promise<void>;
  }
}

declare module '@aokiapp/jsapdu-pcsc' {
  import type { SmartCardPlatform } from '@aokiapp/jsapdu-interface';

  export class PcscPlatformManager {
    static getInstance(): PcscPlatformManager;
    getPlatform(): SmartCardPlatform;
  }
}

declare module '@aokiapp/apdu-utils' {
  import type { CommandApdu } from '@aokiapp/jsapdu-interface';

  export function selectDf(aid: Uint8Array): CommandApdu;
  export function verify(pin: string, options: { ef: number }): CommandApdu;
  export function readBinary(
    offset: number,
    length: number,
    isExtended?: boolean,
    useMaxLe?: boolean,
    options?: { shortEfId?: number }
  ): CommandApdu;
}

declare module '@aokiapp/mynacard' {
  export const KENHOJO_AP: Uint8Array;
  export const KENHOJO_AP_EF: {
    PIN: number;
    BASIC_FOUR: number;
  };
  export const schemaKenhojoBasicFour: unknown;
}

declare module '@aokiapp/tlv' {
  export class SchemaParser {
    constructor(schema: unknown);
    parse(buffer: ArrayBuffer): {
      name: string;
      address: string;
      birth: string;
      gender: string;
    };
  }
}
