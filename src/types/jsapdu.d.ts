/**
 * jsapduパッケージの型定義
 * GitHub monorepoから直接参照しているため、手動で型定義を提供
 */

// @aokiapp/jsapdu-interface
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
    toHexString(): string;
    toString(): string;
    static fromUint8Array(byteArray: Uint8Array): CommandApdu;
  }

  export class ResponseApdu {
    readonly data: Uint8Array;
    readonly sw1: number;
    readonly sw2: number;
    readonly sw: number;
    arrayBuffer(): ArrayBuffer;
    toUint8Array(): Uint8Array;
    static fromUint8Array(byteArray: Uint8Array): ResponseApdu;
  }

  export interface SmartCardDeviceInfo {
    id: string;
    friendlyName: string;
    description?: string;
    supportsApdu: boolean;
    supportsHce: boolean;
    isIntegratedDevice: boolean;
    isRemovableDevice: boolean;
    d2cProtocol: string;
    p2dProtocol: string;
    apduApi: string[];
  }

  export abstract class SmartCardPlatform {
    abstract init(force?: boolean): Promise<void>;
    abstract release(force?: boolean): Promise<void>;
    isInitialized(): boolean;
    abstract getDeviceInfo(): Promise<SmartCardDeviceInfo[]>;
    abstract acquireDevice(deviceId: string): Promise<SmartCardDevice>;
    on<K extends string>(event: K, callback: (...args: unknown[]) => void): () => void;
  }

  export abstract class SmartCardDevice {
    abstract getDeviceInfo(): SmartCardDeviceInfo;
    abstract isSessionActive(): boolean;
    abstract isDeviceAvailable(): Promise<boolean>;
    abstract isCardPresent(): Promise<boolean>;
    abstract waitForCardPresence(timeout: number): Promise<void>;
    abstract startSession(): Promise<SmartCard>;
    abstract release(): Promise<void>;
  }

  export abstract class SmartCard {
    abstract getAtr(): Promise<Uint8Array>;
    abstract transmit(apdu: CommandApdu): Promise<ResponseApdu>;
    abstract transmit(apdu: Uint8Array): Promise<Uint8Array>;
    abstract reset(): Promise<void>;
    abstract release(): Promise<void>;
  }

  export class SmartCardError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
  }
}

// @aokiapp/jsapdu-pcsc
declare module '@aokiapp/jsapdu-pcsc' {
  import { SmartCardPlatform } from '@aokiapp/jsapdu-interface';

  export class PcscPlatformManager {
    static getInstance(): PcscPlatformManager;
    getPlatform(): SmartCardPlatform;
  }
}

// @aokiapp/apdu-utils
declare module '@aokiapp/apdu-utils' {
  import { CommandApdu } from '@aokiapp/jsapdu-interface';

  export function select(
    p1: number,
    p2: number,
    data: Uint8Array | number[] | string,
    le?: number | null
  ): CommandApdu;

  export function selectDf(
    data: Uint8Array | number[] | string,
    fciRequested?: boolean
  ): CommandApdu;

  export function selectEf(data: Uint8Array | number[] | string): CommandApdu;

  export function readBinary(
    offset: number,
    length: number,
    isExtended?: boolean,
    useMaxLe?: boolean,
    options?: {
      isCurrentEF?: boolean;
      shortEfId?: number;
      useRelativeAddress15Bit?: boolean;
      useRelativeAddress8Bit?: boolean;
    }
  ): CommandApdu;

  export function readCurrentEfBinaryFull(): CommandApdu;
  export function readEfBinaryFull(shortEfId: number): CommandApdu;

  export function verify(
    data: string | Uint8Array | number[],
    options?: {
      ef?: number | string;
      isCurrent?: boolean;
    }
  ): CommandApdu;
}

// @aokiapp/mynacard
declare module '@aokiapp/mynacard' {
  export const JPKI_AP: Uint8Array;
  export const KENHOJO_AP: Uint8Array;
  export const KENKAKU_AP: Uint8Array;

  export const JPKI_AP_EF: {
    AUTH_CERT_CA: number;
    SIGN_CERT_CA: number;
    AUTH_PIN: number;
    AUTH_KEY: number;
    AUTH_CERT: number;
    SIGN_PIN: number;
    SIGN_KEY: number;
    SIGN_CERT: number;
  };

  export const KENHOJO_AP_EF: {
    PIN: number;
    BASIC_FOUR: number;
    CERTIFICATE: number;
    MY_NUMBER: number;
    SIGNATURE: number;
    SIGN_PINLESS: number;
  };

  export const KENKAKU_AP_EF: {
    PIN: number;
    BASIC_FOUR: number;
    CERTIFICATE: number;
    MY_NUMBER: number;
    ENTRIES: number;
    SIGNATURE: number;
  };

  export const schemaKenhojoBasicFour: unknown;
  export const schemaKenhojoSignature: unknown;
  export const schemaKenkakuEntries: unknown;
  export const schemaKenkakuMyNumber: unknown;

  export function decodePublicKey(buffer: ArrayBuffer): Promise<CryptoKey>;
  export function decodeText(buffer: ArrayBuffer): string;
  export function decodeOffsets(buffer: ArrayBuffer): number[];
}

// @aokiapp/tlv
declare module '@aokiapp/tlv' {
  export class SchemaParser {
    constructor(schema: unknown);
    parse(buffer: ArrayBuffer): {
      name: string;
      address: string;
      birth: string;
      gender: string;
      offsets: number[];
      [key: string]: unknown;
    };
  }
}
