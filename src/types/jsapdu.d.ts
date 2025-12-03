/**
 * jsapduパッケージの型定義
 * 
 * 【この型定義ファイルが必要な理由】
 * 
 * jsapduパッケージはGitHub monorepoからインストールされ、postinstallスクリプトで
 * TypeScriptをビルドして型定義ファイル(.d.ts)を生成している。
 * 
 * しかし、以下の理由により手動の型定義が必要:
 * 
 * 1. モジュール構造の不一致:
 *    - npmは各パッケージ名(@aokiapp/jsapdu-interface等)でインストールするが、
 *      実際にはmonorepo全体がインストールされ、パッケージは packages/ サブディレクトリにある
 *    - TypeScriptの標準的なモジュール解決では packages/interface/dist/src/index.d.ts を見つけられない
 * 
 * 2. ESM/CommonJS互換性:
 *    - jsapduパッケージは "type": "module" でESMのみサポート
 *    - ElectronのメインプロセスはCommonJSを使用
 *    - node16/nodenextのmoduleResolutionでは動的インポートが必要になる
 * 
 * 将来的にjsapduが以下のいずれかになれば、このファイルは不要になる:
 * - npmに個別パッケージとして公開される
 * - CommonJSとESMの両方をサポートするdual packageになる
 */

declare module '@aokiapp/jsapdu-interface' {
  export class CommandApdu {
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
