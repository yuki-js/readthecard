/**
 * カード読み取りマネージャー
 * jsapdu-over-ip を使用してマイナンバーカードを読み取る
 *
 * Reactのライフサイクルとは独立した手続き的処理を提供
 * ViewModelパターンでReactコンポーネントに抽象的な操作のみ公開
 */

import {
  RemoteSmartCardPlatform,
  FetchClientTransport,
  CommandApdu,
  type RemoteSmartCardDeviceInfo,
} from "@aokiapp/jsapdu-over-ip";
import type { SmartCardDevice, SmartCard } from "@aokiapp/jsapdu-interface";
import {
  KENHOJO_AP,
  KENHOJO_AP_EF,
  KENKAKU_AP,
  KENKAKU_AP_EF,
  schemaKenhojoBasicFour,
  schemaKenkakuEntries,
} from "@aokiapp/mynacard";
import { SchemaParser } from "@aokiapp/tlv/parser";
import { getSelectedReaderId } from "../utils/settings";
import { parseKojinBango } from "../utils/myna";
import {
  readBinary,
  readCurrentEfBinaryFull,
  selectEf,
  selectDf,
  verify,
} from "@aokiapp/apdu-utils";

export interface CardManagerState {
  status:
    | "idle"
    | "initializing"
    | "waiting-device"
    | "waiting-card"
    | "ready"
    | "reading"
    | "error";
  error?: string;
  deviceName?: string;
}

export type CardManagerListener = (state: CardManagerState) => void;

/**
 * カード読み取りマネージャークラス
 * シングルトンパターンで実装
 */
export class CardManager {
  private static instance: CardManager | null = null;

  private transport: FetchClientTransport;
  private platform: RemoteSmartCardPlatform;
  private device: SmartCardDevice | null = null;
  private card: SmartCard | null = null;
  private listeners: Set<CardManagerListener> = new Set();
  private _state: CardManagerState = { status: "idle" };

  private constructor(apiEndpoint: string) {
    this.transport = new FetchClientTransport(apiEndpoint);
    this.platform = new RemoteSmartCardPlatform(this.transport);
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(apiEndpoint: string = "/api/jsapdu/rpc"): CardManager {
    if (!CardManager.instance) {
      CardManager.instance = new CardManager(apiEndpoint);
    }
    return CardManager.instance;
  }

  /**
   * 状態を取得
   */
  get state(): CardManagerState {
    return this._state;
  }

  /**
   * 状態変更リスナーを登録
   */
  addListener(listener: CardManagerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(state: CardManagerState): void {
    this._state = state;
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  /**
   * プラットフォームを初期化しデバイスを取得
   */
  async initialize(): Promise<void> {
    try {
      this.setState({ status: "initializing" });

      // force=trueを使用して、バックエンドが既に初期化されている場合でも再初期化できるようにする
      // これにより、ページリロード時の「Platform already initialized」エラーを防ぐ
      await this.platform.init(true);

      this.setState({ status: "waiting-device" });

      const devices = await this.platform.getDeviceInfo();
      if (devices.length === 0) {
        throw new Error("カードリーダーが見つかりません");
      }

      // 設定から選択されたリーダーIDを取得し、利用可能なら使用
      const selectedId = getSelectedReaderId();
      let targetDevice = devices[0];
      if (selectedId) {
        const found = devices.find(
          (d: RemoteSmartCardDeviceInfo) => d.id === selectedId,
        );
        if (found) {
          targetDevice = found;
        }
      }

      this.device = await this.platform.acquireDevice(targetDevice.id);
      this.setState({
        status: "waiting-card",
        deviceName: targetDevice.friendlyName || targetDevice.id,
      });
    } catch (err) {
      this.setState({ status: "error", error: String(err) });
      throw err;
    }
  }

  /**
   * 利用可能なデバイス一覧を取得
   */
  async getAvailableDevices(): Promise<RemoteSmartCardDeviceInfo[]> {
    if (!this.platform.isInitialized()) {
      await this.platform.init();
    }
    return this.platform.getDeviceInfo();
  }

  /**
   * カードの挿入を待機してセッションを開始
   */
  async waitForCardAndConnect(timeoutMs: number = 30000): Promise<void> {
    if (!this.device) {
      throw new Error("デバイスが初期化されていません");
    }

    try {
      await this.device.waitForCardPresence(timeoutMs);
      this.card = await this.device.startSession();

      // 券面事項入力補助APを選択
      const selectCmd = new CommandApdu(
        0x00,
        0xa4,
        0x04,
        0x0c,
        new Uint8Array(KENHOJO_AP),
        null,
      );
      const response = await this.card.transmit(selectCmd);
      if (response.sw !== 0x9000) {
        throw new Error(
          `券面事項入力補助APの選択に失敗: SW=${response.sw.toString(16)}`,
        );
      }

      this.setState({ status: "ready", deviceName: this._state.deviceName });
    } catch (err) {
      this.setState({ status: "error", error: String(err) });
      throw err;
    }
  }

  /**
   * PINを検証
   */
  async verifyPin(
    pin: string,
  ): Promise<{ verified: boolean; remainingAttempts?: number }> {
    if (!this.card) {
      throw new Error("カードセッションがありません");
    }
    const pinData = new Uint8Array(pin.split("").map((c) => c.charCodeAt(0)));
    const verifyCmd = new CommandApdu(
      0x00,
      0x20,
      0x00,
      0x80 + KENHOJO_AP_EF.PIN,
      pinData,
      null,
    );
    const response = await this.card.transmit(verifyCmd);

    if (response.sw === 0x9000) {
      return { verified: true };
    }

    if (response.sw1 === 0x63) {
      const remainingAttempts = response.sw2 & 0x0f;
      return { verified: false, remainingAttempts };
    }

    throw new Error(`PIN検証エラー: SW=${response.sw.toString(16)}`);
  }

  /**
   * 基本4情報を読み取り
   */
  async readBasicFour() {
    if (!this.card) {
      throw new Error("カードセッションがありません");
    }

    this.setState({ status: "reading", deviceName: this._state.deviceName });

    try {
      // EF(基本4情報)を選択
      const selectEfCmd = new CommandApdu(
        0x00,
        0xa4,
        0x02,
        0x0c,
        new Uint8Array([0x00, KENHOJO_AP_EF.BASIC_FOUR]),
        null,
      );
      const selectResp = await this.card.transmit(selectEfCmd);
      if (selectResp.sw !== 0x9000) {
        throw new Error(
          `基本4情報EFの選択に失敗: SW=${selectResp.sw.toString(16)}`,
        );
      }

      // READ BINARY
      const readCmd = readCurrentEfBinaryFull();
      const readResp = await this.card.transmit(readCmd);
      if (readResp.sw !== 0x9000 && readResp.sw1 !== 0x62) {
        throw new Error(
          `基本4情報の読み取りに失敗: SW=${readResp.sw.toString(16)}`,
        );
      }

      return this.parseBasicFourTlv(readResp.data);
    } finally {
      this.setState({ status: "ready", deviceName: this._state.deviceName });
    }
  }

  /**
   * 顔写真(JPEG2000)を取得（券面事項確認AP経由）
   * DumpRunner を参考に、MY_NUMBER を読み出して PIN_A 検証 → ENTRIES 解析 → faceJp2 抽出
   */
  async readFaceJp2(): Promise<Uint8Array> {
    if (!this.card) {
      throw new Error("カードセッションがありません");
    }

    // 1) 券面事項入力補助APを選択して MY_NUMBER を取得（apdu-utils 準拠）
    {
      const resp = await this.card.transmit(selectDf(KENHOJO_AP));
      if (resp.sw !== 0x9000) {
        throw new Error(
          `券面事項入力補助APの選択に失敗: SW=${resp.sw.toString(16)}`,
        );
      }
    }
    {
      const resp = await this.card.transmit(
        selectEf([0, KENHOJO_AP_EF.MY_NUMBER]),
      );
      if (resp.sw !== 0x9000) {
        throw new Error(
          `MY_NUMBER EF の選択に失敗: SW=${resp.sw.toString(16)}`,
        );
      }
    }
    const mynoResp = await this.card.transmit(readBinary(0, 0));
    if (mynoResp.sw !== 0x9000 && mynoResp.sw1 !== 0x62) {
      throw new Error(
        `MY_NUMBER の読み取りに失敗: SW=${mynoResp.sw.toString(16)}`,
      );
    }
    const kojinBango = parseKojinBango(mynoResp.data);

    // 2) 券面事項確認APを選択して PIN_A を個人番号で検証（apdu-utils 準拠）
    {
      const resp = await this.card.transmit(selectDf(KENKAKU_AP));
      if (resp.sw !== 0x9000) {
        throw new Error(
          `券面事項確認APの選択に失敗: SW=${resp.sw.toString(16)}`,
        );
      }
    }
    {
      const resp = await this.card.transmit(selectEf([0, KENKAKU_AP_EF.PIN_A]));
      if (resp.sw !== 0x9000) {
        throw new Error(`PIN_A EF の選択に失敗: SW=${resp.sw.toString(16)}`);
      }
    }
    {
      const vResp = await this.card.transmit(
        verify(new TextEncoder().encode(kojinBango), { isCurrent: true }),
      );
      if (vResp.sw !== 0x9000) {
        if (vResp.sw1 === 0x63) {
          const remaining = vResp.sw2 & 0x0f;
          throw new Error(`PIN_A 検証失敗（残り${remaining}回）`);
        }
        throw new Error(`PIN_A 検証エラー: SW=${vResp.sw.toString(16)}`);
      }
    }

    // 3) ENTRIES EF を選択して全体を読む（readCurrentEfBinaryFull）
    {
      const resp = await this.card.transmit(
        selectEf([0, KENKAKU_AP_EF.ENTRIES]),
      );
      if (resp.sw !== 0x9000) {
        throw new Error(`ENTRIES EF の選択に失敗: SW=${resp.sw.toString(16)}`);
      }
    }
    // DumpRunner と同様に EF 全体を取得
    const entriesResp = await this.card.transmit(readCurrentEfBinaryFull());
    if (entriesResp.sw !== 0x9000) {
      throw new Error(
        `ENTRIES の読み取りに失敗: SW=${entriesResp.sw.toString(16)}`,
      );
    }

    // 末尾の 0xFF パディングを除去
    let endIdx = entriesResp.data.length;
    while (endIdx > 0 && entriesResp.data[endIdx - 1] === 0xff) endIdx--;
    const entries = entriesResp.data.slice(0, endIdx);

    const parsed = new SchemaParser(schemaKenkakuEntries).parse(
      entries.buffer as ArrayBuffer,
    ) as any;

    const faceJp2: Uint8Array | undefined =
      (parsed && (parsed as any).faceJp2) || undefined;

    if (!faceJp2 || faceJp2.length === 0) {
      throw new Error("顔写真データが見つかりません");
    }
    return faceJp2;
  }

  /**
   * KENKAKU entries から画像群を取得
   */
  async readKenkakuImages(): Promise<{
    namePng: Uint8Array;
    addressPng: Uint8Array;
    securityCodePng: Uint8Array;
    faceJp2: Uint8Array;
  }> {
    if (!this.card) {
      throw new Error("カードセッションがありません");
    }

    // 1) 券面事項入力補助AP → 個人番号取得
    {
      const resp = await this.card.transmit(selectDf(KENHOJO_AP));
      if (resp.sw !== 0x9000) {
        throw new Error(
          `券面事項入力補助APの選択に失敗: SW=${resp.sw.toString(16)}`,
        );
      }
    }
    {
      const resp = await this.card.transmit(
        selectEf([0, KENHOJO_AP_EF.MY_NUMBER]),
      );
      if (resp.sw !== 0x9000) {
        throw new Error(
          `MY_NUMBER EF の選択に失敗: SW=${resp.sw.toString(16)}`,
        );
      }
    }
    const mynoResp = await this.card.transmit(readBinary(0, 0));
    if (mynoResp.sw !== 0x9000 && mynoResp.sw1 !== 0x62) {
      throw new Error(
        `MY_NUMBER の読み取りに失敗: SW=${mynoResp.sw.toString(16)}`,
      );
    }
    const kojinBango = parseKojinBango(mynoResp.data);

    // 2) 券面事項確認AP → PIN_A 検証（個人番号）
    {
      const resp = await this.card.transmit(selectDf(KENKAKU_AP));
      if (resp.sw !== 0x9000) {
        throw new Error(
          `券面事項確認APの選択に失敗: SW=${resp.sw.toString(16)}`,
        );
      }
    }
    {
      const resp = await this.card.transmit(selectEf([0, KENKAKU_AP_EF.PIN_A]));
      if (resp.sw !== 0x9000) {
        throw new Error(`PIN_A EF の選択に失敗: SW=${resp.sw.toString(16)}`);
      }
    }
    {
      const vResp = await this.card.transmit(
        verify(new TextEncoder().encode(kojinBango), { isCurrent: true }),
      );
      if (vResp.sw !== 0x9000) {
        if (vResp.sw1 === 0x63) {
          const remaining = vResp.sw2 & 0x0f;
          throw new Error(`PIN_A 検証失敗（残り${remaining}回）`);
        }
        throw new Error(`PIN_A 検証エラー: SW=${vResp.sw.toString(16)}`);
      }
    }

    // 3) ENTRIES EF → フル読み（readCurrentEfBinaryFull）
    {
      const resp = await this.card.transmit(
        selectEf([0, KENKAKU_AP_EF.ENTRIES]),
      );
      if (resp.sw !== 0x9000) {
        throw new Error(`ENTRIES EF の選択に失敗: SW=${resp.sw.toString(16)}`);
      }
    }
    const entriesResp = await this.card.transmit(readCurrentEfBinaryFull());
    if (entriesResp.sw !== 0x9000) {
      throw new Error(
        `ENTRIES の読み取りに失敗: SW=${entriesResp.sw.toString(16)}`,
      );
    }

    // 末尾の 0xFF パディングを除去
    let endIdx = entriesResp.data.length;
    while (endIdx > 0 && entriesResp.data[endIdx - 1] === 0xff) endIdx--;
    const entries = entriesResp.data.slice(0, endIdx);

    const parsed = new SchemaParser(schemaKenkakuEntries).parse(
      entries.buffer as ArrayBuffer,
    );

    return {
      namePng: parsed.namePng,
      addressPng: parsed.addressPng,
      securityCodePng: parsed.securityCodePng,
      faceJp2: parsed.faceJp2,
    };
  }

  /**
  /**
   * リソースを解放
   */
  async release(): Promise<void> {
    try {
      if (this.card) {
        await this.card.release();
        this.card = null;
      }
      if (this.device) {
        await this.device.release();
        this.device = null;
      }
      if (this.platform.isInitialized()) {
        await this.platform.release();
      }
    } catch {
      // エラーは無視
    }
    this.setState({ status: "idle" });
  }

  /**
   * 基本4情報のTLVをパース
   */
  private parseBasicFourTlv(data: Uint8Array) {
    // find how many 0xff are at the end
    let paddingCount = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i] === 0xff) {
        paddingCount++;
      } else {
        break;
      }
    }
    // remove padding 0xff
    data = data.slice(0, data.length - paddingCount);

    const parser = new SchemaParser(schemaKenhojoBasicFour);
    // Create a real ArrayBuffer copy (not a SharedArrayBuffer) and pass it to the parser
    const arrayBuffer = new Uint8Array(data).slice().buffer;
    const result = parser.parse(arrayBuffer);
    return result;
  }
}

// デフォルトのカードマネージャーインスタンス
export const cardManager = CardManager.getInstance();

export type BasicFourInfo = Awaited<ReturnType<CardManager["readBasicFour"]>>;
