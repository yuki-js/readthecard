/**
 * モック SmartCardPlatform
 * テスト用にマイナンバーカードの動作をシミュレート
 *
 * 注意: このモックはSmartCardPlatformの抽象クラスを直接継承せず、
 * 互換性のあるインターフェースを提供します。
 * これはテスト目的のためであり、本番環境では使用しないでください。
 */

import { CommandApdu, ResponseApdu } from "@aokiapp/jsapdu-interface";

// 券面事項入力補助APのAID（フロントエンドと一致させる）
const KENHOJO_AID = Buffer.from([
  0xd3, 0x92, 0x10, 0x00, 0x00, 0x00, 0x01, 0x01,
]);

// モックの基本4情報
const MOCK_BASIC_FOUR = {
  name: "山田太郎",
  address: "東京都千代田区霞が関1-2-3",
  birthDate: "19800101",
  sex: "1", // 1: 男性, 2: 女性
};

/**
 * モック SmartCardDeviceInfo
 */
class MockSmartCardDeviceInfo {
  readonly id: string;
  readonly devicePath?: string;
  readonly friendlyName?: string;
  readonly description?: string;
  readonly supportsApdu: boolean;
  readonly supportsHce: boolean;
  readonly isIntegratedDevice: boolean;
  readonly isRemovableDevice: boolean;
  readonly d2cProtocol: "iso7816" | "nfc" | "integrated" | "other" | "unknown";
  readonly p2dProtocol:
    | "usb"
    | "ble"
    | "nfc"
    | "integrated"
    | "other"
    | "unknown";
  readonly apduApi: string[];
  readonly antennaInfo?: any;

  constructor(id: string) {
    this.id = id;
    this.friendlyName = `Mock Card Reader ${id}`;
    this.description = "モックスマートカードリーダー";
    this.supportsApdu = true;
    this.supportsHce = false;
    this.isIntegratedDevice = false;
    this.isRemovableDevice = true;
    this.d2cProtocol = "iso7816";
    this.p2dProtocol = "usb";
    this.apduApi = ["mock"];
  }
}

/**
 * モック SmartCard
 */
class MockSmartCard {
  private parentDevice: MockSmartCardDevice;
  private selectedAid: Buffer | null = null;
  private pinVerified = false;
  private atr = new Uint8Array([
    0x3b, 0x8f, 0x80, 0x01, 0x80, 0x4f, 0x0c, 0xa0, 0x00, 0x00, 0x00, 0x63,
    0x50, 0x4b, 0x43, 0x53, 0x2d, 0x31, 0x35, 0x56,
  ]);

  constructor(parentDevice: MockSmartCardDevice) {
    this.parentDevice = parentDevice;
  }

  async getAtr(): Promise<Uint8Array> {
    return this.atr;
  }

  async transmit(
    command: CommandApdu | Uint8Array,
  ): Promise<ResponseApdu | Uint8Array> {
    let cmd: CommandApdu;
    let isRawMode = false;

    if (command instanceof Uint8Array) {
      // Uint8Array から CommandApdu を解析
      cmd = CommandApdu.fromUint8Array(
        new Uint8Array(
          command.buffer.slice(
            command.byteOffset,
            command.byteOffset + command.byteLength,
          ),
        ) as Uint8Array<ArrayBuffer>,
      );
      isRawMode = true;
    } else {
      cmd = command;
    }

    const ins = cmd.ins;
    const p1 = cmd.p1;
    const p2 = cmd.p2;
    const data = cmd.data;

    let sw1: number;
    let sw2: number;
    let responseData: Uint8Array = new Uint8Array(0);

    // SELECT FILE (A4)
    if (ins === 0xa4) {
      if (p1 === 0x04 && data) {
        // SELECT by DF name (AID)
        if (Buffer.from(data).equals(KENHOJO_AID)) {
          this.selectedAid = KENHOJO_AID;
          sw1 = 0x90;
          sw2 = 0x00;
        } else {
          sw1 = 0x6a;
          sw2 = 0x82; // File not found
        }
      } else if (p1 === 0x02 && data) {
        // SELECT by EF id
        // Accept any EF selection within the selected DF
        if (this.selectedAid) {
          sw1 = 0x90;
          sw2 = 0x00;
        } else {
          sw1 = 0x6a;
          sw2 = 0x82;
        }
      } else {
        sw1 = 0x6a;
        sw2 = 0x82; // File not found
      }
    }
    // VERIFY (20) - PIN検証
    else if (ins === 0x20) {
      // P2の下位4ビットがEF番号、0x80以上ならPIN検証
      if ((p2 & 0x80) !== 0 && data) {
        const pin = Buffer.from(data).toString();
        if (pin.length === 4 && /^\d{4}$/.test(pin)) {
          this.pinVerified = true;
          sw1 = 0x90;
          sw2 = 0x00;
        } else {
          sw1 = 0x63;
          sw2 = 0xc2; // Wrong PIN, 2 tries remaining
        }
      } else {
        sw1 = 0x6d;
        sw2 = 0x00;
      }
    }
    // READ BINARY (B0) - 基本4情報読み取り
    else if (ins === 0xb0) {
      if (!this.pinVerified) {
        sw1 = 0x69;
        sw2 = 0x82; // Security status not satisfied
      } else if (p1 === 0x00 && p2 === 0x00) {
        responseData = new Uint8Array(this.createBasicFourTlv());
        sw1 = 0x90;
        sw2 = 0x00;
      } else {
        sw1 = 0x6d;
        sw2 = 0x00;
      }
    }
    // 未知のコマンド
    else {
      sw1 = 0x6d;
      sw2 = 0x00;
    }

    if (isRawMode) {
      // Raw mode: data + SW1 + SW2
      const result = new Uint8Array(responseData.length + 2);
      result.set(responseData);
      result[responseData.length] = sw1;
      result[responseData.length + 1] = sw2;
      return result;
    }
    // Cast to Uint8Array<ArrayBuffer> for compatibility
    const responseDataCasted = new Uint8Array(
      responseData.buffer.slice(
        responseData.byteOffset,
        responseData.byteOffset + responseData.byteLength,
      ),
    ) as Uint8Array<ArrayBuffer>;
    return new ResponseApdu(responseDataCasted, sw1, sw2);
  }

  private createBasicFourTlv(): Buffer {
    // TLV形式でデータを返す（フロントエンドのparseBasicFourTlvと互換）
    const encoder = new TextEncoder();
    const name = encoder.encode(MOCK_BASIC_FOUR.name);
    const address = encoder.encode(MOCK_BASIC_FOUR.address);
    const birthDate = encoder.encode(MOCK_BASIC_FOUR.birthDate);
    const sex = encoder.encode(MOCK_BASIC_FOUR.sex);

    // Tag-Length-Value (フロントエンドが期待するタグ形式)
    const parts: Buffer[] = [];

    // Tag 0xDF22: 名前
    parts.push(Buffer.from([0xdf, 0x22, name.length]));
    parts.push(Buffer.from(name));

    // Tag 0xDF23: 住所
    parts.push(Buffer.from([0xdf, 0x23, address.length]));
    parts.push(Buffer.from(address));

    // Tag 0xDF24: 生年月日
    parts.push(Buffer.from([0xdf, 0x24, birthDate.length]));
    parts.push(Buffer.from(birthDate));

    // Tag 0xDF25: 性別
    parts.push(Buffer.from([0xdf, 0x25, sex.length]));
    parts.push(Buffer.from(sex));

    return Buffer.concat(parts);
  }

  async reset(): Promise<void> {
    this.selectedAid = null;
    this.pinVerified = false;
  }

  async release(): Promise<void> {
    this.parentDevice.cardReleased();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.release();
  }

  on(_event: string, _cb: any): () => void {
    return () => {};
  }
}

/**
 * モック SmartCardDevice
 */
class MockSmartCardDevice {
  private parentPlatform: MockSmartCardPlatform;
  private info: MockSmartCardDeviceInfo;
  private cardPresent = true;
  private card: MockSmartCard | null = null;
  private sessionActive = false;

  constructor(parentPlatform: MockSmartCardPlatform, id: string) {
    this.parentPlatform = parentPlatform;
    this.info = new MockSmartCardDeviceInfo(id);
  }

  getDeviceInfo(): MockSmartCardDeviceInfo {
    return this.info;
  }

  isSessionActive(): boolean {
    return this.sessionActive;
  }

  async isDeviceAvailable(): Promise<boolean> {
    return true;
  }

  async isCardPresent(): Promise<boolean> {
    return this.cardPresent;
  }

  async startSession(): Promise<MockSmartCard> {
    if (!this.cardPresent) {
      throw new Error("Card not present");
    }
    this.card = new MockSmartCard(this);
    this.sessionActive = true;
    return this.card;
  }

  async waitForCardPresence(_timeout: number): Promise<void> {
    // モックでは即座にカードが存在する
    this.cardPresent = true;
  }

  async startHceSession(): Promise<any> {
    throw new Error("HCE not supported in mock");
  }

  async release(): Promise<void> {
    if (this.card) {
      this.card = null;
    }
    this.sessionActive = false;
    this.parentPlatform.deviceReleased(this.info.id);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.release();
  }

  on(_event: string, _cb: any): () => void {
    return () => {};
  }

  cardReleased(): void {
    this.card = null;
    this.sessionActive = false;
  }
}

/**
 * モック SmartCardPlatform
 */
export class MockSmartCardPlatform {
  private initialized = false;
  private devices: Map<string, MockSmartCardDevice> = new Map();
  private deviceInfos: MockSmartCardDeviceInfo[] = [
    new MockSmartCardDeviceInfo("mock-reader-0"),
  ];

  async init(): Promise<void> {
    this.initialized = true;
    console.log(
      "[MockSmartCardPlatform] 初期化完了 - マイナンバーカードモック",
    );
  }

  async release(_force?: boolean): Promise<void> {
    this.initialized = false;
    this.devices.clear();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  assertInitialized(): void {
    if (!this.initialized) {
      throw new Error("Platform not initialized");
    }
  }

  assertNotInitialized(): void {
    if (this.initialized) {
      throw new Error("Platform already initialized");
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.release();
  }

  async getDeviceInfo(): Promise<MockSmartCardDeviceInfo[]> {
    return this.deviceInfos;
  }

  async acquireDevice(id: string): Promise<MockSmartCardDevice> {
    if (!this.initialized) {
      throw new Error("Platform not initialized");
    }

    const info = this.deviceInfos.find((d) => d.id === id);
    if (!info) {
      throw new Error(`Device not found: ${id}`);
    }

    let device = this.devices.get(id);
    if (!device) {
      device = new MockSmartCardDevice(this, id);
      this.devices.set(id, device);
    }

    return device;
  }

  deviceReleased(id: string): void {
    this.devices.delete(id);
  }

  on(_event: string, _cb: any): () => void {
    return () => {};
  }
}

// シングルトンインスタンス
let mockPlatformInstance: MockSmartCardPlatform | null = null;

export function getMockPlatform(): MockSmartCardPlatform {
  if (!mockPlatformInstance) {
    mockPlatformInstance = new MockSmartCardPlatform();
  }
  return mockPlatformInstance;
}
