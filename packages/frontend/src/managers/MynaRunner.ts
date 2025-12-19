import { DumpRunner } from "./DumpRunner";
import { CommandApdu, ResponseApdu } from "@aokiapp/jsapdu-interface";
import {
  readBinary,
  readCurrentEfBinaryFull,
  selectEf,
  selectDf,
  verify,
} from "@aokiapp/apdu-utils";
import * as MynaConst from "@aokiapp/mynacard";
import { parseKojinBango } from "../utils/myna";
import { SchemaParser } from "@aokiapp/tlv/parser";
import * as efTester from "../utils/apdutest/eftester";

abstract class CardRunner {
  protected hasUnlocked: boolean = false;
  constructor(protected readonly dumpRunner: DumpRunner) {}

  async listEfs(start = 0x0000, end = 0x0030): Promise<number[]> {
    const p = this.dumpRunner;
    const logger = this.dumpRunner.newLog("message");
    let openingEfs = [];
    if (!this.hasUnlocked) {
      throw new Error("カードがアンロックされていません。");
    }
    // 対象のDFはすでに選択されている前提。チェックをスキップ
    logger.update("EF一覧の取得中...");
    for (let fid = start; fid < end; fid++) {
      try {
        await p.check(p.send(selectEf([(fid >> 8) & 0xff, fid & 0xff])));
        openingEfs.push(fid);
        logger.update(
          `開いてるEFリスト: ${openingEfs
            .map((f) => f.toString(16).padStart(4, "0"))
            .join(", ")}`,
        );
      } catch (e) {
        // EFが存在しない場合、無視
      }
    }
    logger.update(
      "EF一覧の取得が完了しました: " +
        openingEfs.map((f) => f.toString(16).padStart(4, "0")).join(", "),
    );
    return openingEfs;
  }

  async testEf(fid: number) {
    const p = this.dumpRunner;
    // p.sendWaitSeconds = 3;
    if (!this.hasUnlocked) {
      throw new Error("カードがアンロックされていません。");
    }
    // 対象のDFはすでに選択されている前提。チェックをスキップ
    const logger = this.dumpRunner.newLog("message");
    logger.update(`EF ${fid.toString(16).padStart(4, "0")} のテスト中...`);
    await p.check(p.send(selectEf([(fid >> 8) & 0xff, fid & 0xff])));

    let type: null | "binary" | "record" | "internalAuth" | "extAuth" | "pin" =
      null;

    if (await efTester.testIfBinary(p)) {
      type = "binary";
      logger.update(
        `EF ${fid.toString(16).padStart(4, "0")} はバイナリ形式です。`,
      );
    } else if (await efTester.testIfRecord(p)) {
      type = "record";
      logger.update(
        `EF ${fid.toString(16).padStart(4, "0")} はレコード形式です。`,
      );
    } else if (await efTester.testIfInternalAuth(p)) {
      type = "internalAuth";
      logger.update(
        `EF ${fid.toString(16).padStart(4, "0")} はINTERNAL AUTHENTICATE形式です。`,
      );
    } else if (await efTester.testIfExtAuth(p)) {
      type = "extAuth";
      logger.update(
        `EF ${fid.toString(16).padStart(4, "0")} はEXTERNAL AUTHENTICATE形式です。`,
      );
    } else if (await efTester.testIfPin(p)) {
      type = "pin";
      logger.update(`EF ${fid.toString(16).padStart(4, "0")} はPIN形式です。`);
    } else {
      logger.update(
        `EF ${fid.toString(16).padStart(4, "0")} の形式は不明です。`,
      );
    }
    // p.sendWaitSeconds = 0;
    return type;
  }
  async testEfs(
    fids: number[],
  ): Promise<{ fid: number; type: string | null }[]> {
    const results: { fid: number; type: string | null }[] = [];
    for (const fid of fids) {
      const result = await this.testEf(fid);

      results.push({ fid, type: result });
    }
    return results;
  }

  async findAndDumpReadableFields() {
    const results: any = {};
    const p = this.dumpRunner;
    if (!this.hasUnlocked) {
      throw new Error("カードがアンロックされていません。");
    }
    const logger = this.dumpRunner.newLog("message");
    logger.update("バイナリ形式のEFを探索中...");
    const efs = await this.listEfs();
    for (const fid of efs) {
      try {
        await p.check(p.send(selectEf([(fid >> 8) & 0xff, fid & 0xff])));
        if (await efTester.testIfBinary(p)) {
          const data = await p.check(p.send(readCurrentEfBinaryFull()));
          results[fid.toString(16).padStart(4, "0")] = {
            type: "binary",
            binary: Array.from(data)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join(""),
          };
        } else if (await efTester.testIfRecord(p)) {
          // レコード形式も試す
          // すべてのレコードを順繰りに読み、全てのレコードを取る。
          const records: string[] = [];
          let recordIndex = 1;
          while (true) {
            try {
              const recordData = await p.check(
                p.send(
                  new CommandApdu(
                    0x00,
                    0xb2,
                    recordIndex,
                    0x04,
                    undefined,
                    0x00,
                  ),
                ),
              );
              records.push(
                Array.from(recordData)
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join(""),
              );
              recordIndex++;
            } catch (e) {
              // 読めなくなったら終了
              break;
            }
          }
          results[fid.toString(16).padStart(4, "0")] = {
            type: "record",
            records: records,
          };
        } else {
          results[fid.toString(16).padStart(4, "0")] = {
            type: "unknown",
          };
        }
      } catch (e) {
        // EFが存在しない場合、無視
      }
    }
    logger.update("バイナリ形式のEFの探索とダンプが完了しました。");
    return results;
  }
}

export class KenhojoRunner extends CardRunner {
  private logger = this.dumpRunner.newLog("message");
  async getKojinBango(kenhojoPin: string): Promise<string> {
    if (!this.hasUnlocked) {
      await this.unlockWithKenhojoPin(kenhojoPin);
    }
    this.logger.update("個人番号APの選択中...");
    const p = this.dumpRunner;
    await p.send(selectEf([0, MynaConst.KENHOJO_AP_EF.MY_NUMBER]));
    const kojinBango = parseKojinBango(await p.check(p.send(readBinary(0, 0))));
    this.logger.update(`個人番号を取得しました: ${kojinBango}`);
    return kojinBango;
  }

  async unlockWithKenhojoPin(kenhojoPin: string): Promise<void> {
    this.logger.update("券面事項入力補助APの選択中...");
    const p = this.dumpRunner;
    await p.check(p.send(selectDf(MynaConst.KENHOJO_AP)));
    this.logger.update("券面事項入力補助APを選択しました。PIN検証中...");
    await p.check(p.send(selectEf([0, MynaConst.KENHOJO_AP_EF.PIN])));
    this.logger.update("PIN EFを選択しました。PINを検証中...");
    await p.ensureRetryCount(3);
    this.logger.update("PINの残回数はOKで、安全に進められます。");
    await p.send(verify(toAscii(kenhojoPin), { isCurrent: true }));
    this.logger.update("PINを検証しました。");
    this.hasUnlocked = true;
  }
  async unlockWithPinB(pinB: string): Promise<void> {
    this.logger.update("券面事項入力補助APの選択中...");
    const p = this.dumpRunner;
    await p.check(p.send(selectDf(MynaConst.KENHOJO_AP)));
    this.logger.update("券面事項入力補助APを選択しました。PIN検証中...");
    await p.check(p.send(selectEf([0, MynaConst.KENHOJO_AP_EF.PIN_B])));
    this.logger.update("PIN B EFを選択しました。PINを検証中...");
    await p.ensureRetryCount(10);
    this.logger.update("PINの残回数はOKで、安全に進められます。");
    await p.send(verify(toAscii(pinB), { isCurrent: true }));
    this.logger.update("PIN Bを検証しました。");
    this.hasUnlocked = true;
  }
}

export class KenkakuRunner extends CardRunner {
  private logger = this.dumpRunner.newLog("message");
  async showKenkakuData(kojinBango: string): Promise<Uint8Array> {
    if (!this.hasUnlocked) {
      debugger;
      await this.unlockWithKojinBango(kojinBango);
    }
    this.logger.update("券面事項確認APのデータ取得中...");
    const p = this.dumpRunner;
    await p.send(selectEf([0, MynaConst.KENKAKU_AP_EF.ENTRIES]));
    this.logger.update("券面事項確認APのエントリEFを選択しました。");

    const rawEntries = await p.check(p.send(readCurrentEfBinaryFull()));

    // remove trailing 0xff bytes
    let endIdx = rawEntries.length;
    while (endIdx > 0 && rawEntries[endIdx - 1] === 0xff) {
      endIdx--;
    }
    const entries = rawEntries.slice(0, endIdx);
    const parsed = new SchemaParser(MynaConst.schemaKenkakuEntries).parse(
      entries.buffer as ArrayBuffer,
    );
    this.logger.update("券面事項確認APのエントリEFを解析しました。");
    this.logger.update(`取得したデータ: 
        生年月日: ${parsed.birth}
        性別: ${parsed.gender}
        有効期限: ${parsed.expire}
        名前PNGバイナリ: (${parsed.namePng.length} バイト)
        住所PNGバイナリ: (${parsed.addressPng.length} バイト)
        顔写真JPEG2000バイナリ: (${parsed.faceJp2.length} バイト)
        セキュリティコードPNGバイナリ: (${parsed.securityCodePng.length} バイト)
     `);
    return entries;
  }
  async unlockWithKojinBango(kojinBango: string): Promise<void> {
    this.logger.update("券面事項確認APの選択中...");
    const p = this.dumpRunner;
    await p.check(p.send(selectDf(MynaConst.KENKAKU_AP)));
    this.logger.update("券面事項確認APを選択しました。PIN検証中...");
    await p.check(p.send(selectEf([0, MynaConst.KENKAKU_AP_EF.PIN_A])));
    this.logger.update("PIN EFを選択しました。PINを検証中...");
    await p.ensureRetryCount(10);
    this.logger.update("PINの残回数はOKで、安全に進められます。");
    await p.send(verify(toAscii(kojinBango), { isCurrent: true }));
    this.logger.update("PINを検証しました。");
    this.hasUnlocked = true;
  }

  async unlockWithPinB(pinB: string): Promise<void> {
    this.logger.update("券面事項確認APの選択中...");
    const p = this.dumpRunner;
    await p.check(p.send(selectDf(MynaConst.KENKAKU_AP)));
    this.logger.update("券面事項確認APを選択しました。PIN検証中...");
    await p.check(p.send(selectEf([0, MynaConst.KENKAKU_AP_EF.PIN_B])));
    this.logger.update("PIN B EFを選択しました。PINを検証中...");
    await p.ensureRetryCount(10);
    this.logger.update("PINの残回数はOKで、安全に進められます。");
    await p.send(verify(toAscii(pinB), { isCurrent: true }));
    this.logger.update("PIN Bを検証しました。");
    this.hasUnlocked = true;
  }
}

export class CommonApRunner extends CardRunner {
  private logger = this.dumpRunner.newLog("message");
  constructor(dumpRunner: DumpRunner) {
    super(dumpRunner);
  }
  async selectCommonAp(): Promise<void> {
    this.logger.update("共通APの選択中...");
    const p = this.dumpRunner;

    // D3921000310001010100
    await p.check(
      p.send(
        selectDf([0xd3, 0x92, 0x10, 0x00, 0x31, 0x00, 0x01, 0x01, 0x01, 0x00]),
      ),
    );
    this.hasUnlocked = true;
    this.logger.update("共通APを選択しました。");
  }
}

export class JpkiRunner extends CardRunner {
  private logger = this.dumpRunner.newLog("message");
  constructor(dumpRunner: DumpRunner) {
    super(dumpRunner);
  }
  async unlockWithJpkiPin(authPin: string, signPin: string): Promise<void> {
    this.logger.update("JPKI APの選択中...");
    const p = this.dumpRunner;
    await p.check(p.send(selectDf(MynaConst.JPKI_AP)));
    this.logger.update("JPKI APのPIN検証中...");
    await p.check(p.send(selectEf([0, MynaConst.JPKI_AP_EF.AUTH_PIN])));
    this.logger.update("Auth PIN EFを選択しました。PINを検証中...");
    await p.ensureRetryCount(3);
    this.logger.update("PINの残回数はOKで、安全に進められます。");
    await p.send(verify(toAscii(authPin), { isCurrent: true }));
    // Auth PIN検証完了, 次にSign PIN
    try {
      this.logger.update("Auth PINを検証しました。Sign PINの検証中...");
      await p.check(p.send(selectEf([0, MynaConst.JPKI_AP_EF.SIGN_PIN])));
      this.logger.update("Sign PIN EFを選択しました。PINを検証中...");
      await p.ensureRetryCount(5);
      this.logger.update("PINの残回数はOKで、安全に進められます。");
      await p.send(verify(toAscii(signPin), { isCurrent: true }));
      this.logger.update("Sign PINを検証しました。");
    } catch (e) {
      this.logger.update("Sign PINの検証に失敗したのでスキップします。");
    }
    this.hasUnlocked = true;
  }
}

function toAscii(str: string): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}
