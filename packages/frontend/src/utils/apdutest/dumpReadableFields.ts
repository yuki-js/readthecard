import { CommandApdu } from "@aokiapp/jsapdu-interface";
import { readCurrentEfBinaryFull, selectEf } from "@aokiapp/apdu-utils";
import { DumpRunner } from "../../managers/DumpRunner";
import * as efTester from "./eftester";

// ランダムな32バイトのデータをランダムに生成する
const testData32Byte = Uint8Array.from(
  Array.from({ length: 32 }, () => Math.floor(Math.random() * 256)),
);

export type ReadableEfDump = {
  binary?: { binary: string };
  record?: { records: string[] };
  internalAuth?: { challenge: string };
  extAuth?: {};
  pin?: { remainingAttempts: number };
  sign?: {
    subresp: Record<string, string>;
    signature: string;
    challenge: string;
  };
};

export type ReadableEfDumpMap = Record<string, ReadableEfDump>;

function toHex(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fidToKey(fid: number): string {
  return fid.toString(16).padStart(4, "0");
}

async function dumpBinaryCurrentEf(p: DumpRunner): Promise<string> {
  const data = await p.check(p.send(readCurrentEfBinaryFull()));
  return toHex(data);
}

async function dumpRecordCurrentEf(p: DumpRunner): Promise<string[]> {
  const records: string[] = [];
  let recordIndex = 1;
  while (true) {
    try {
      const recordData = await p.check(
        p.send(new CommandApdu(0x00, 0xb2, recordIndex, 0x04, undefined, 0x00)),
      );
      records.push(toHex(recordData));
      recordIndex++;
    } catch {
      // 読めなくなったら終了
      break;
    }
  }
  return records;
}

export async function findAndDumpReadableFields(
  p: DumpRunner,
  efs: number[],
  opts?: {
    onProgress?: (message: string) => void;
  },
): Promise<ReadableEfDumpMap> {
  const results: ReadableEfDumpMap = {};

  opts?.onProgress?.("EFを探索中...");

  for (const fid of efs) {
    try {
      await p.check(p.send(selectEf([(fid >> 8) & 0xff, fid & 0xff])));

      const key = fidToKey(fid);
      const efData: ReadableEfDump = {};

      // Binary型のチェック
      if (await efTester.testIfBinary(p)) {
        efData.binary = {
          binary: await dumpBinaryCurrentEf(p),
        };
      }

      // Record型のチェック
      if (await efTester.testIfRecord(p)) {
        efData.record = {
          records: await dumpRecordCurrentEf(p),
        };
      }

      // Internal Authenticate のチェック
      if (await efTester.testIfIntAuth(p)) {
        try {
          const resp = await p.send(
            new CommandApdu(
              0x00,
              0x88,
              0x00,
              0x00,
              Uint8Array.from([0x00]),
              0x00,
            ),
          );
          efData.internalAuth = {
            challenge: toHex(resp.toUint8Array()),
          };
        } catch {
          // Internal Authenticate が失敗しても続行
        }
      }

      // External Authenticate のチェック
      if (await efTester.testIfExtAuth(p)) {
        efData.extAuth = {};
      }

      // PIN のチェック
      if (await efTester.testIfPin(p)) {
        try {
          const resp = await p.send(
            new CommandApdu(0x00, 0x20, 0x00, 0x80, undefined),
          );
          const remainingAttempts = resp.sw1 === 0x63 ? resp.sw2 & 0x0f : 0;
          efData.pin = { remainingAttempts };
        } catch {
          // PIN チェックが失敗しても続行
        }
      }

      // JPKI署名のチェック
      if (await efTester.testIfJpkiSign(p)) {
        try {
          const subtypeResponses: Record<string, string> = {};

          if (await efTester.testIfPsoCds(p)) {
            try {
              const resp = await p.send(
                new CommandApdu(0x00, 0x2a, 0x9e, 0x9a, testData32Byte, 0x00),
              );
              subtypeResponses["pso-cds"] = toHex(resp.toUint8Array());
            } catch {
              // PSO-CDS が失敗しても続行
            }
          }
          if (await efTester.testIfPsoDec(p)) {
            try {
              const resp = await p.send(
                new CommandApdu(0x00, 0x2a, 0x80, 0x86, testData32Byte, 0x00),
              );
              subtypeResponses["pso-dec"] = toHex(resp.toUint8Array());
            } catch {
              // PSO-DEC が失敗しても続行
            }
          }
          if (await efTester.testIfPsoEnc(p)) {
            try {
              const resp = await p.send(
                new CommandApdu(0x00, 0x2a, 0x80, 0x84, testData32Byte, 0x00),
              );
              subtypeResponses["pso-enc"] = toHex(resp.toUint8Array());
            } catch {
              // PSO-ENC が失敗しても続行
            }
          }
          if (await efTester.testIfPsoHash(p)) {
            try {
              const resp = await p.send(
                new CommandApdu(0x00, 0x2a, 0x90, 0x86, testData32Byte, 0x00),
              );
              subtypeResponses["pso-hash"] = toHex(resp.toUint8Array());
            } catch {
              // PSO-HASH が失敗しても続行
            }
          }

          const signResp = await p.send(
            new CommandApdu(0x80, 0x2a, 0x03, 0x80, testData32Byte, 0x00),
          );
          const signResponseHex = toHex(signResp.toUint8Array());

          efData.sign = {
            subresp: subtypeResponses,
            signature: signResponseHex,
            challenge: toHex(testData32Byte),
          };
        } catch {
          // JPKI署名が失敗しても続行
        }
      }

      // 何かしらの属性が見つかった場合のみ結果に追加
      if (Object.keys(efData).length > 0) {
        results[key] = efData;
      }
    } catch {
      // EFが存在しない場合、無視
    }
  }

  opts?.onProgress?.("EFの探索とダンプが完了しました。");
  return results;
}
