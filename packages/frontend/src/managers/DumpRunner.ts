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
import {
  CommonApRunner,
  JpkiRunner,
  KenhojoRunner,
  KenkakuRunner,
} from "./MynaRunner";

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
    private dob?: string,
    private expireYear?: string,
    private securityCode?: string,
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
    // リーダー・プラットフォームに接続（カードの挿入待ちは処理ループ側で行う）
    this.connectToCard();

    // 連続処理ループ開始（中断されるまで繰り返す）
    this.processLoop().catch((error) => {
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
  private lastSrLog = this.newLog("message");
  public sendWaitSeconds: number = 0;
  public async send(command: CommandApdu): Promise<ResponseApdu> {
    if (this.interrupted) {
      throw new Error("操作が中断されました");
    }
    await this.ensureConnected();
    if (!this.card) {
      throw new Error("カードセッションが確立されていません");
    }
    const ret = await this.card.transmit(command);

    const sendHex = command.toHexString();
    const recvHex = Array.from(ret.toUint8Array())
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const recvHexDisplay =
      recvHex.length > 24
        ? `${recvHex.slice(0, 8)}...(Len=${recvHex.length / 2 - 2})...${recvHex.slice(-4)}`
        : recvHex;
    this.lastSrLog.update(`>> ${sendHex}\n<< ${recvHexDisplay}`);

    if (this.sendWaitSeconds > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.sendWaitSeconds * 1000),
      );
    }
    return ret;
  }
  public async check(response: Promise<ResponseApdu>): Promise<Uint8Array> {
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

        // デバイス確保（カード待機は処理ループで行う）
        this.device = await this.platform.acquireDevice(target.id);
        connectLog.update(
          `デバイスを取得: ${target.friendlyName || target.id}。カード挿入待機中...`,
        );

        // ここではカードの挿入待機やセッション開始は行わず、処理ループで行う
        this.isReady = true;
        connectLog.update(
          "カードリーダーに接続しました。カード挿入を待機しています。",
        );
      } catch (e) {
        this.isReady = false;
        this.connectPromise = null;
        throw e;
      }
    })();
  }

  private async reacquireDevice(): Promise<void> {
    await this.ensureConnected();
    if (!this.platform) {
      throw new Error("カードリーダープラットフォームが利用できません");
    }
    const reacqLog = this.newLog("message");
    reacqLog.update("カードリーダーを再取得します...");

    // プラットフォームを強制再初期化してデバイス一覧を最新化
    try {
      await this.platform.init(true);
    } catch {
      // ignore
    }
    try {
      if (this.platform.isInitialized()) {
        await this.platform.release();
      }
    } catch {
      // ignore
    }
    await this.platform.init(false);

    const devices = await this.platform.getDeviceInfo();
    if (!devices || devices.length === 0) {
      throw new Error("カードリーダーが見つかりません");
    }

    const deviceListText = devices
      .map((d: any) => d.friendlyName || d.id)
      .join(", ");
    reacqLog.update(`利用可能なデバイス一覧: ${deviceListText}`);

    const selectedId =
      typeof getSelectedReaderId === "function"
        ? getSelectedReaderId()
        : undefined;
    let target = devices[0];
    if (selectedId) {
      const found = devices.find((d: any) => d.id === selectedId);
      if (found) target = found;
    }

    try {
      if (this.device) {
        await this.device.release();
      }
    } catch {
      // ignore release errors
    }

    this.device = await this.platform.acquireDevice(target.id);
    reacqLog.update(
      `デバイスを再取得しました: ${target.friendlyName || target.id}`,
    );
  }

  private _artifacts: any = null;
  /**
   * 読み取り結果のアーティファクト群
   * Downloadボタンを押すとjsonファイルを手元にファイルとして保存しダウンロードできる
   */
  get artifacts() {
    return this._artifacts;
  }
  /**
   * 1枚のカードからダンプを取得して返す（セッション開始済みであること）
   */
  private async processSingle(): Promise<Record<string, any>> {
    const dumps: Record<string, any> = {};

    this.log(
      "読み取りを開始します。まずは券面事項入力補助APから読み取ります。",
    );
    const kenhojoRunner = new KenhojoRunner(this);

    if (this.dob && this.expireYear && this.securityCode) {
      await kenhojoRunner.unlockWithPinB(
        `${this.dob}${this.expireYear}${this.securityCode}`,
      );
    } else {
      const kojinBango = await kenhojoRunner.getKojinBango(this.kenhojoPin);
      dumps["kojinBango"] = kojinBango;
    }
    dumps["kenhojo"] = await kenhojoRunner.findAndDumpReadableFields();

    this.log("次に、券面事項確認APを読み取ります。");
    const kenkakuRunner = new KenkakuRunner(this);
    if (!dumps["kojinBango"]) {
      await kenkakuRunner.unlockTwoAps(
        `${this.dob!}${this.expireYear!}${this.securityCode!}`,
        this.dob!,
      );
    } else {
      const kojinBango = dumps["kojinBango"];
      await kenkakuRunner.unlockWithKojinBango(kojinBango);
    }
    kenkakuRunner.showKenkakuData("");
    dumps["kenkaku"] = await kenkakuRunner.findAndDumpReadableFields();

    this.log("次に、共通APを読み取ります。");
    const commonApRunner = new CommonApRunner(this);
    await commonApRunner.selectCommonAp();
    dumps["commonAp"] = await commonApRunner.findAndDumpReadableFields();

    this.log("最後に、JPKI APを読み取ります。");
    const jpkiApRunner = new JpkiRunner(this);
    await jpkiApRunner.unlockWithJpkiPin(this.authPin, this.signPin);
    dumps["jpkiAp"] = await jpkiApRunner.findAndDumpReadableFields();

    return dumps;
  }

  /**
   * 中断されるまで、カードの挿入→読み取り→抜去待機を繰り返す。
   * これにより max cards パラメータは不要。
   */
  private async processLoop(): Promise<void> {
    const aggregated: any[] = [];
    this._artifacts = null;

    // 最初のカード挿入待機
    while (!this.interrupted) {
      await this.waitForCardPresentAndStart();
      if (this.interrupted) break;

      try {
        const dump = await this.processSingle();
        aggregated.push(dump);
        this._artifacts = { cards: aggregated };
        this.log(
          `読み取りが完了しました。このカードを取り外してください。（累計 ${aggregated.length} 枚）`,
        );
      } catch (error) {
        this.log(
          `読み取り中にエラーが発生しました: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      } finally {
        try {
          if (this.card) {
            await this.card.release();
          }
        } catch {
          // ignore
        } finally {
          this.card = null;
        }
      }

      // カード抜去を待機
      await this.waitForCardRemoval();
      if (this.interrupted) break;

      this.log(
        "次のカードを挿入してください。停止する場合は停止ボタンを押してください。",
      );
    }

    if (this._artifacts && Array.isArray((this._artifacts as any).cards)) {
      this.log(
        `連続読み取りを終了しました。ダウンロードボタンから ${
          (this._artifacts as any).cards.length
        } 枚分のJSONをダウンロードできます。`,
      );
    } else {
      this.log("連続読み取りを終了しました。");
    }
  }

  /**
   * カード挿入を待機してセッションを開始する。タイムアウトはループで再試行。
   */
  private async waitForCardPresentAndStart(): Promise<void> {
    await this.ensureConnected();
    // 既にカードセッションがある場合は何もしない
    if (this.card) {
      this.log("既存のカードセッションが見つかりました。");
      return;
    }

    this.log("カード挿入待機中...");
    let attempts = 0;

    // タイムアウト付き待機を繰り返し、キャンセル可能にする
    while (!this.interrupted) {
      attempts++;
      try {
        // 毎回デバイスを再取得して最新状態に合わせる
        try {
          await this.reacquireDevice();
        } catch (re) {
          const m2 = re instanceof Error ? re.message : String(re);
          this.log(`カードリーダー再取得に失敗: ${m2}`);
        }
        let device = this.device;
        if (!device) {
          await new Promise((r) => setTimeout(r, 700));
          continue;
        }
        const devAny: any = device as any;

        let presenceDetected = false;

        // 1) waitForCardPresence を常に短タイムアウトで試す
        if (typeof devAny.waitForCardPresence === "function") {
          try {
            await devAny.waitForCardPresence(2000);
            presenceDetected = true;
            this.log("在席検出: waitForCardPresence");
          } catch {
            // タイムアウトは無視（他の方法を試す）
          }
        }

        // 2) isCardPresent があるなら併用（ヒントとして）
        if (!presenceDetected && typeof devAny.isCardPresent === "function") {
          try {
            const present = await devAny.isCardPresent();
            if (present) {
              presenceDetected = true;
              this.log("在席検出: isCardPresent=true");
            }
          } catch {
            // 無視
          }
        }

        // 3) 最後の手段: セッション開始をプローブして在席検出
        if (!presenceDetected) {
          try {
            const probe = await device.startSession();
            try {
              await probe.release();
            } catch {
              // ignore
            }
            presenceDetected = true;
            this.log("在席検出: startSession probe");
          } catch {
            // 在席検出失敗
          }
        }

        // 在席を検出できたら本セッションを開始
        if (presenceDetected) {
          try {
            // 再取得でデバイスが変わっている可能性があるため、最新のデバイスで開始
            const currentDevice = this.device;
            this.card = await (currentDevice ?? device).startSession();
            this.log("カードに接続しました。");
            return;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.log(
              `カードセッション開始に失敗しました。再試行します: ${msg}`,
            );
            if (/Device not found/i.test(msg)) {
              this.log("カードリーダーを再取得します...");
              try {
                await this.reacquireDevice();
              } catch (re) {
                const m2 = re instanceof Error ? re.message : String(re);
                this.log(`カードリーダー再取得に失敗: ${m2}`);
              }
            }
          }
        }

        // 長時間検出できない場合のフェイルセーフ: 定期的に再取得
        if (attempts % 10 === 0) {
          this.log("カードが検出されません。カードリーダーを再取得します...");
          try {
            await this.reacquireDevice();
          } catch (re) {
            const m2 = re instanceof Error ? re.message : String(re);
            this.log(`カードリーダー再取得に失敗: ${m2}`);
          }
        }

        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.log(
          `カード挿入待機中にエラーが発生しました。再試行します: ${msg}`,
        );
        if (/Device not found/i.test(msg)) {
          this.log("カードリーダーを再取得します...");
          try {
            await this.reacquireDevice();
          } catch (re) {
            const m2 = re instanceof Error ? re.message : String(re);
            this.log(`カードリーダー再取得に失敗: ${m2}`);
          }
        }
        await new Promise((r) => setTimeout(r, 700));
      }
    }
    throw new Error("操作が中断されました");
  }

  /**
   * カード抜去を待機する。APIがあればそれを使用し、無ければポーリングで代替。
   */
  private async waitForCardRemoval(): Promise<void> {
    if (!this.device) return;

    // API が存在する場合はそれを優先
    const devAny: any = this.device as any;
    try {
      if (typeof devAny.waitForCardAbsence === "function") {
        // 反復待機に備えて短いタイムアウトでループ
        while (!this.interrupted) {
          try {
            await devAny.waitForCardAbsence(5000);
            return;
          } catch {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
        return;
      }
      if (typeof devAny.waitForCardRemoval === "function") {
        while (!this.interrupted) {
          try {
            await devAny.waitForCardRemoval(5000);
            return;
          } catch {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
        return;
      }
    } catch {
      // 下のフォールバックへ
    }

    // フォールバック: セッション開始を試みて、成功する間はまだカードが挿入されているとみなす
    this.log("カード抜去待機中...");
    while (!this.interrupted) {
      try {
        const probe = await this.device.startSession();
        // まだカードがある。すぐ閉じて再試行。
        try {
          await probe.release();
        } catch {
          // ignore
        }
        await new Promise((r) => setTimeout(r, 500));
      } catch {
        // セッション開始できない = 抜去された
        return;
      }
    }
  }

  public async ensureRetryCount(count: number): Promise<void> {
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

  public log(message: string): void {
    const item: LogItem = {
      id: this.generateId(),
      kind: "message",
      payload: message,
      timestamp: Date.now(),
    };
    this.logs = [...this.logs, item];
    this.notifyLogListeners();
  }

  public newLog(kind: string): {
    update: (payload: string | any) => void;
  } {
    const id = this.generateId();
    const now = Date.now();
    const item: LogItem = {
      id,
      kind,
      payload: "",
      timestamp: now,
      history: [{ payload: "", timestamp: now }],
    };
    this.logs = [...this.logs, item];
    this.notifyLogListeners();

    return {
      update: (payload: string | any) => {
        const idx = this.logs.findIndex((l) => l.id === id);
        if (idx >= 0) {
          const now = Date.now();
          const currentLog = this.logs[idx];
          const updated: LogItem = {
            ...currentLog,
            payload,
            timestamp: now,
            history: [
              ...(currentLog.history || []),
              { payload, timestamp: now },
            ],
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
export type LogItem = {
  // ID: 一意な識別子で、これをつかってログ項目をパッチ更新できる
  id: string;
  // 種類: メッセージ種類。これに応じてコンテンツの表示方法が変わる。とりあえず "message" のみ実装
  kind: "message" | string;
  // ペイロード: 種類に応じたデータ本体
  payload: string | any;
  // タイムスタンプ: ログ項目の生成時刻
  timestamp: number;
  // 履歴: ペイロードの更新履歴（初期値とその後の更新をすべて保存）
  history?: Array<{ payload: string | any; timestamp: number }>;
};
