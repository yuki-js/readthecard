import { CommandApdu, ResponseApdu } from "@aokiapp/jsapdu-interface";
import {
  readBinary,
  readCurrentEfBinaryFull,
  selectEf,
  selectDf,
  verify,
} from "@aokiapp/apdu-utils";
import * as MynaConst from "@aokiapp/mynacard";
import {
  RemoteSmartCardPlatform,
  FetchClientTransport,
} from "@aokiapp/jsapdu-over-ip";
import type { SmartCardDevice, SmartCard } from "@aokiapp/jsapdu-interface";
import { getSelectedReaderId } from "../utils/settings";
import { parseKojinBango } from "../utils/myna";
import { SchemaParser } from "@aokiapp/tlv/parser";

interface Runnable {
  run(): void;
  onLogUpdated(callback: (log: Log) => void): void;
  interrupt(): void;
}

export class DumpRunner implements Runnable {
  constructor(
    private signPin: string,
    private authPin: string,
    private kenhojoPin: string,
  ) {}

  private isReady: boolean = false;
  private logs: Log = [];
  private logListeners: Set<(log: Log) => void> = new Set();
  private interrupted: boolean = false;

  private transport?: FetchClientTransport;
  private platform?: RemoteSmartCardPlatform;
  private device: SmartCardDevice | null = null;
  private card: SmartCard | null = null;

  private connectPromise: Promise<void> | null = null;

  public run(): void {
    this.connectToCard();

    this.process().catch((error) => {
      this.log(
        `エラー: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  public onLogUpdated(callback: (log: Log) => void): void {
    this.logListeners.add(callback);
    // 初期状態も通知
    callback(this.logs);
  }

  public interrupt(): void {
    this.interrupted = true;
    // キャンセルを通知
    this.log("操作を中断しました。");

    // セッションとデバイスを開放（非同期で実行）
    const cleanup = async () => {
      try {
        if (this.card) {
          await this.card.release();
          this.card = null;
        }
        if (this.device) {
          await this.device.release();
          this.device = null;
        }
        if (this.platform && this.platform.isInitialized()) {
          await this.platform.release();
        }
      } catch {
        // ignore cleanup errors
      } finally {
        this.isReady = false;
        this.connectPromise = null;
      }
    };
    // Fire-and-forget
    cleanup();
  }

  private async send(command: CommandApdu): Promise<ResponseApdu> {
    if (this.interrupted) {
      throw new Error("操作が中断されました");
    }
    await this.ensureConnected();
    if (!this.card) {
      throw new Error("カードセッションが確立されていません");
    }
    return this.card.transmit(command);
  }
  private async check(response: Promise<ResponseApdu>): Promise<Uint8Array> {
    const resp = await response;
    if (resp.sw !== 0x9000) {
      throw new Error(`APDU Error: SW=${resp.sw.toString(16)}`);
    }
    return resp.data;
  }

  private async ensureConnected(): Promise<void> {
    if (this.interrupted) {
      throw new Error("操作が中断されました");
    }
    if (!this.connectPromise) {
      this.connectToCard();
    }
    await this.connectPromise;
    if (this.interrupted) {
      throw new Error("操作が中断されました");
    }
  }

  private notifyLogListeners(): void {
    const snapshot = this.logs.slice();
    for (const cb of this.logListeners) {
      try {
        cb(snapshot);
      } catch {
        // ignore listener errors
      }
    }
  }

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private connectToCard(): void {
    if (this.connectPromise) return;

    this.interrupted = false;

    const connectLog = this.newLog("message");
    this.connectPromise = (async () => {
      try {
        connectLog.update("カードリーダーに接続中...");
        // 初期化
        this.transport = new FetchClientTransport("/api/jsapdu/rpc");
        this.platform = new RemoteSmartCardPlatform(this.transport);
        await this.platform.init(true);
        await this.platform.release(); // 既存セッションがあれば解放
        await this.platform.init(false);

        // デバイス検出
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
          const found = devices.find((d) => d.id === selectedId);
          if (found) target = found;
        }

        // デバイス確保とカード待機
        this.device = await this.platform.acquireDevice(target.id);
        connectLog.update(
          `デバイスを取得: ${target.friendlyName || target.id}。カード挿入待機中...`,
        );
        await this.device.waitForCardPresence(30000);
        this.card = await this.device.startSession();

        this.isReady = true;
        connectLog.update("カードに接続しました。");
      } catch (e) {
        this.isReady = false;
        this.connectPromise = null;
        throw e;
      }
    })();
  }

  private async process(): Promise<void> {
    const kenhojoStatsLog = this.newLog("message");
    kenhojoStatsLog.update("券面事項入力補助APの選択中...");
    await this.check(this.send(selectDf(MynaConst.KENHOJO_AP)));
    kenhojoStatsLog.update("券面事項入力補助APを選択しました。PIN検証中...");
    await this.check(this.send(selectEf([0, MynaConst.KENHOJO_AP_EF.PIN])));
    kenhojoStatsLog.update("PIN EFを選択しました。PINを検証中...");
    await this.ensureRetryCount(3);
    kenhojoStatsLog.update("PINの残回数はOKで、安全に進められます。");
    await this.send(verify(toAscii(this.kenhojoPin), { isCurrent: true }));
    kenhojoStatsLog.update("PINを検証しました。");
    await this.send(selectEf([0, MynaConst.KENHOJO_AP_EF.MY_NUMBER]));
    const kojinBango = parseKojinBango(
      await this.check(this.send(readBinary(0, 0))),
    );
    kenhojoStatsLog.update(`個人番号を取得しました: ${kojinBango}`);

    const kenkakuStatusLog = this.newLog("message");
    kenkakuStatusLog.update("券面事項確認APの選択中...");
    await this.check(this.send(selectDf(MynaConst.KENKAKU_AP)));
    kenkakuStatusLog.update("券面事項確認APを選択しました。PIN検証中...");
    await this.check(this.send(selectEf([0, MynaConst.KENKAKU_AP_EF.PIN_A])));
    kenkakuStatusLog.update("PIN EFを選択しました。PINを検証中...");
    await this.ensureRetryCount(10);
    kenkakuStatusLog.update("PINの残回数はOKで、安全に進められます。");
    await this.send(verify(toAscii(kojinBango), { isCurrent: true }));
    kenkakuStatusLog.update("PINを検証しました。");
    await this.send(selectEf([0, MynaConst.KENKAKU_AP_EF.ENTRIES]));
    kenkakuStatusLog.update("券面事項確認APのエントリEFを選択しました。");

    const rawEntries = await this.check(this.send(readCurrentEfBinaryFull()));

    // remove trailing 0xff bytes
    let endIdx = rawEntries.length;
    while (endIdx > 0 && rawEntries[endIdx - 1] === 0xff) {
      endIdx--;
    }
    const entries = rawEntries.slice(0, endIdx);
    const parsed = new SchemaParser(MynaConst.schemaKenkakuEntries).parse(
      entries.buffer as ArrayBuffer,
    );
    kenkakuStatusLog.update("券面事項確認APのエントリEFを解析しました。");
    const dumpLog = this.newLog("message");
    dumpLog.update(`取得したデータ: 
       生年月日: ${parsed.birth}
       性別: ${parsed.gender}
       有効期限: ${parsed.expire}
       名前PNGバイナリ: (${parsed.namePng.length} バイト)
       住所PNGバイナリ: (${parsed.addressPng.length} バイト)
       顔写真JPEG2000バイナリ: (${parsed.faceJp2.length} バイト)
       セキュリティコードPNGバイナリ: (${parsed.securityCodePng.length} バイト)

    `);
  }

  private async ensureRetryCount(count: number): Promise<void> {
    const sw = await this.send(
      CommandApdu.fromUint8Array(Uint8Array.from([0x00, 0x20, 0x00, 0x80])),
    );
    if (sw.sw1 !== 0x63) {
      throw new Error(`Unexpected SW: SW=${sw.sw.toString(16)}`);
    }
    const remaining = sw.sw2 & 0x0f;
    if (remaining < count) {
      throw new Error(`Not enough retry attempts: ${remaining} < ${count}`);
    }
  }

  private log(message: string): void {
    const item: LogItem = {
      id: this.generateId(),
      kind: "message",
      payload: message,
      timestamp: Date.now(),
    };
    this.logs = [...this.logs, item];
    this.notifyLogListeners();
  }

  private newLog(kind: string): {
    update: (payload: string | any) => void;
  } {
    const id = this.generateId();
    const item: LogItem = {
      id,
      kind,
      payload: "",
      timestamp: Date.now(),
    };
    this.logs = [...this.logs, item];
    this.notifyLogListeners();

    return {
      update: (payload: string | any) => {
        const idx = this.logs.findIndex((l) => l.id === id);
        if (idx >= 0) {
          const updated: LogItem = {
            ...this.logs[idx],
            payload,
            timestamp: Date.now(),
          };
          this.logs = [
            ...this.logs.slice(0, idx),
            updated,
            ...this.logs.slice(idx + 1),
          ];
          this.notifyLogListeners();
        }
      },
    };
  }
}

export type Log = LogItem[];
type LogItem = {
  // ID: 一意な識別子で、これをつかってログ項目をパッチ更新できる
  id: string;
  // 種類: メッセージ種類。これに応じてコンテンツの表示方法が変わる。とりあえず "message" のみ実装
  kind: "message" | string;
  // ペイロード: 種類に応じたデータ本体
  payload: string | any;
  // タイムスタンプ: ログ項目の生成時刻
  timestamp: number;
};

function toAscii(str: string): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}
