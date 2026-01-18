import {
  CommandApdu,
  type ResponseApdu,
  type SmartCard,
  type SmartCardDevice,
} from "@aokiapp/jsapdu-interface";
import {
  FetchClientTransport,
  RemoteSmartCardPlatform,
} from "@aokiapp/jsapdu-over-ip";
import { readBinary, selectDf, selectEf, verify } from "@aokiapp/apdu-utils";
import * as MynaConst from "@aokiapp/mynacard";
import { parseKojinBango } from "../utils/myna";
import { getSelectedReaderId } from "../utils/settings";

export type PinTargetId =
  | "kenhojo.pin"
  | "kenhojo.pinB"
  | "kenkaku.pinA"
  | "kenkaku.pinB"
  | "kenkaku.birthPin"
  | "jpki.authPin"
  | "jpki.signPin";

export type PinTarget = {
  id: PinTargetId;
  /** UI label */
  label: string;
  /** DF(AID) bytes */
  aid: number[];
  /** EF(FID) bytes (usually 2 bytes) */
  fid: number[];

  /** default input value (usually empty) */
  defaultPin?: string;
  /** acceptance rule (checked right before VERIFY) */
  acceptRegex: RegExp;
};

export type PinCheckResult = {
  sw: number;
  remainingAttempts?: number;
};

export type PinVerifyResult = {
  ok: boolean;
  sw: number;
  remainingAttempts?: number;
};

function toHex(bytes: ArrayLike<number>): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += (bytes[i] & 0xff).toString(16).padStart(2, "0");
  }
  return out.toUpperCase();
}

function formatSw(sw: number): string {
  return "0x" + (sw & 0xffff).toString(16).padStart(4, "0").toUpperCase();
}

function assertOk(resp: ResponseApdu, context: string): void {
  if (resp.sw !== 0x9000) {
    throw new Error(`${context}: SW=${formatSw(resp.sw)}`);
  }
}

/**
 * PINリフレッシュ用途の最小Runner。
 * - 既存Runnerの「残回数が最大でないと弾くガード」を通さずに VERIFY できるようにする。
 */
export class PinRefresherRunner {
  private transport?: FetchClientTransport;
  private platform?: RemoteSmartCardPlatform;
  private device: SmartCardDevice | null = null;
  private card: SmartCard | null = null;

  async connect(): Promise<void> {
    if (this.platform && this.platform.isInitialized() && this.device) return;

    this.transport = new FetchClientTransport("/api/jsapdu/rpc");
    this.platform = new RemoteSmartCardPlatform(this.transport);

    // 既存セッションがあっても確実に掴み直す
    await this.platform.init(true);
    try {
      await this.platform.release();
    } catch {
      // ignore
    }
    await this.platform.init(false);

    const devices = await this.platform.getDeviceInfo();
    if (!devices || devices.length === 0) {
      throw new Error("カードリーダーが見つかりません");
    }

    const selectedId =
      typeof getSelectedReaderId === "function"
        ? getSelectedReaderId()
        : undefined;

    let target = devices[0];
    if (selectedId) {
      const found = devices.find((d: any) => d.id === selectedId);
      if (found) target = found;
    }

    this.device = await this.platform.acquireDevice((target as any).id);
  }

  async ensureSession(timeoutMs: number = 60000): Promise<void> {
    await this.connect();
    if (!this.device) throw new Error("デバイスが初期化されていません");
    if (this.card) return;

    const devAny: any = this.device as any;
    if (typeof devAny.waitForCardPresence === "function") {
      await devAny.waitForCardPresence(timeoutMs);
    }
    this.card = await this.device.startSession();
  }

  async release(): Promise<void> {
    try {
      if (this.card) {
        await this.card.release();
      }
    } catch {
      // ignore
    } finally {
      this.card = null;
    }

    try {
      if (this.device) {
        await this.device.release();
      }
    } catch {
      // ignore
    } finally {
      this.device = null;
    }

    try {
      if (this.platform && this.platform.isInitialized()) {
        await this.platform.release();
      }
    } catch {
      // ignore
    } finally {
      this.platform = undefined;
      this.transport = undefined;
    }
  }

  async selectTarget(target: PinTarget): Promise<void> {
    await this.ensureSession();
    if (!this.card) throw new Error("カードセッションがありません");

    const dfResp = await this.card.transmit(selectDf(target.aid));
    assertOk(dfResp, `DF選択失敗 (${target.id})`);

    const efResp = await this.card.transmit(selectEf(target.fid));
    assertOk(efResp, `EF選択失敗 (${target.id})`);
  }

  /**
   * 現在選択されているPIN参照データのリトライ残回数を取得。
   * 多くのカードで VERIFY(00 20 00 80, Lcなし) が 63Cx を返す。
   */
  async checkRetryCount(): Promise<PinCheckResult> {
    await this.ensureSession();
    if (!this.card) throw new Error("カードセッションがありません");

    const resp = await this.card.transmit(
      CommandApdu.fromUint8Array(Uint8Array.from([0x00, 0x20, 0x00, 0x80])),
    );

    if (resp.sw1 === 0x63) {
      return { sw: resp.sw, remainingAttempts: resp.sw2 & 0x0f };
    }

    return { sw: resp.sw };
  }

  async verifyPin(pin: string): Promise<PinVerifyResult> {
    await this.ensureSession();
    if (!this.card) throw new Error("カードセッションがありません");

    const pinBytes = new TextEncoder().encode(pin);
    const resp = await this.card.transmit(
      verify(pinBytes, { isCurrent: true }),
    );

    if (resp.sw === 0x9000) return { ok: true, sw: resp.sw };
    if (resp.sw1 === 0x63) {
      return { ok: false, sw: resp.sw, remainingAttempts: resp.sw2 & 0x0f };
    }
    return { ok: false, sw: resp.sw };
  }

  /**
   * (Builder用) KENHOJO_AP / MY_NUMBER を読み、個人番号(12桁)を抽出する。
   * PIN未検証で読めない環境もあるため、失敗時は例外。
   */
  async readKojinBango(): Promise<string> {
    await this.ensureSession();
    if (!this.card) throw new Error("カードセッションがありません");

    assertOk(
      await this.card.transmit(selectDf(MynaConst.KENHOJO_AP)),
      "券面事項入力補助APの選択に失敗",
    );
    assertOk(
      await this.card.transmit(
        selectEf([0x00, MynaConst.KENHOJO_AP_EF.MY_NUMBER]),
      ),
      "MY_NUMBER EF の選択に失敗",
    );

    const resp = await this.card.transmit(readBinary(0, 0));
    if (resp.sw !== 0x9000 && resp.sw1 !== 0x62) {
      throw new Error(`MY_NUMBER の読み取りに失敗: SW=${formatSw(resp.sw)}`);
    }

    return parseKojinBango(resp.data);
  }

  formatTargetAidFid(target: PinTarget): string {
    return `${toHex(target.aid)}:${toHex(target.fid)}`;
  }
}

export const PIN_TARGETS: PinTarget[] = [
  {
    id: "kenhojo.pin",
    label: "Kenhojo PIN",
    aid: MynaConst.KENHOJO_AP,
    fid: [0x00, MynaConst.KENHOJO_AP_EF.PIN],
    acceptRegex: /^[0-9]{4}$/,
    defaultPin: "",
  },
  {
    id: "kenhojo.pinB",
    label: "Kenhojo PIN_B",
    aid: MynaConst.KENHOJO_AP,
    fid: [0x00, MynaConst.KENHOJO_AP_EF.PIN_B],
    acceptRegex: /^[0-9]{14}$/,
    defaultPin: "",
  },
  {
    id: "kenkaku.pinA",
    label: "Kenkaku PIN_A (KojinBango)",
    aid: MynaConst.KENKAKU_AP,
    fid: [0x00, MynaConst.KENKAKU_AP_EF.PIN_A],
    acceptRegex: /^[0-9]{12}$/,
    defaultPin: "",
  },
  {
    id: "kenkaku.pinB",
    label: "Kenkaku PIN_B",
    aid: MynaConst.KENKAKU_AP,
    fid: [0x00, MynaConst.KENKAKU_AP_EF.PIN_B],
    acceptRegex: /^[0-9]{14}$/,
    defaultPin: "",
  },
  {
    id: "kenkaku.birthPin",
    label: "Kenkaku Birth PIN",
    aid: MynaConst.KENKAKU_AP,
    fid: [0x00, MynaConst.KENKAKU_AP_EF.BIRTH_PIN],
    acceptRegex: /^[0-9]{6}$/,
    defaultPin: "",
  },
  {
    id: "jpki.authPin",
    label: "JPKI Auth PIN",
    aid: MynaConst.JPKI_AP,
    fid: [0x00, MynaConst.JPKI_AP_EF.AUTH_PIN],
    acceptRegex: /^[0-9]{4,8}$/,
    defaultPin: "",
  },
  {
    id: "jpki.signPin",
    label: "JPKI Sign PIN",
    aid: MynaConst.JPKI_AP,
    fid: [0x00, MynaConst.JPKI_AP_EF.SIGN_PIN],
    acceptRegex: /^[A-Z0-9]{6,16}$/,
    defaultPin: "",
  },
];
