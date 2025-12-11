import { CommandApdu, ResponseApdu } from "@aokiapp/jsapdu-interface";
import { selectDf, selectEf, verify } from "@aokiapp/apdu-utils";
import * as MynaConst from "@aokiapp/mynacard";


interface Runnable {
  run(): void;
  onLogUpdated(callback: (log: Log)): void;
  interrupt(): void;
}

class DumpRunner implements Runnable {
  constructor(
    private signPin: string,
    private authPin: string,
    private kenhojoPin: string,
  ) {}

  private isReady: boolean = false;
  private logs: Log = [];

  public run(): void {
    this.connectToCard();
    this.process();
  }

  public onLogUpdated(callback: (log: Log)): void {
    // ログ更新のコールバック登録処理の実装
    // ここでのログが呼び出し側にて、switch-caseで分岐して、適切なコンポーネントにrouteされ、表示される
  }

  public interrupt(): void {
    // 割り込み処理の実装
  }

  private async send(command: CommandApdu): Promise<ResponseApdu> {
    // todo: 実際のAPDU送信処理を実装
    throw new Error("Method not implemented.");
  }
  private async check(response: Promise<ResponseApdu>): Promise<Uint8Array> {
    const resp = await response;
    if (resp.sw !== 0x9000) {
      throw new Error(`APDU Error: SW=${resp.sw.toString(16)}`);
    }
    return resp.data;
  }

  private connectToCard(): void {
    // todo: カード接続処理を実装
  }

  private async process(): Promise<void> {
    const kenhojoStatsLog = this.newLog("message");
    kenhojoStatsLog.update("券面事項入力補助APの選択中...");
    await this.check(this.send(selectDf(MynaConst.KENHOJO_AP)));
    kenhojoStatsLog.update("券面事項入力補助APを選択しました。PIN検証中...");
    await this.check(this.send(selectEf([0,MynaConst.KENHOJO_AP_EF.PIN])));
    kenhojoStatsLog.update("PIN EFを選択しました。PINを検証中...");
    await this.ensureRetryCount(3);
    await this.send(verify(toAscii(this.kenhojoPin), {isCurrent: true}));
    kenhojoStatsLog.update("PINを検証しました。");
  };

  private async ensureRetryCount(count: number): Promise<void> {
    const sw = await this.send(verify(new Uint8Array([]), {isCurrent: true}));
    if (sw.sw1 !== 0x63) {
      throw new Error(`Unexpected SW1: ${sw.sw1.toString(16)}`);
    }
    const remaining = sw.sw2 & 0x0f;
    if (remaining < count) {
      throw new Error(`Not enough retry attempts: ${remaining} < ${count}`);
    }
  }

  private log(message: string): void {
    // todo: ログ追加処理の実装
  }

  private newLog(kind: string): {
    update: (payload: string | any) => void;
  } {
    // todo: 新しいログ項目の生成処理の実装
    return {
      update: (payload: string | any) => {
        // ログ項目更新処理の実装
      }
    };
  }


}

type Log = LogItem[];
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