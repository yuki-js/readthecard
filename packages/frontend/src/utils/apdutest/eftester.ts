import { CommandApdu } from "@aokiapp/jsapdu-interface";
import { DumpRunner } from "../../managers/DumpRunner";

export async function testIfBinary(p: DumpRunner): Promise<boolean> {
  // いちばんわかりやすく成功率の高いコマンドとして、全領域をREAD BINARYするコマンドを送る
  const resp = await p.send(
    new CommandApdu(0x00, 0xb0, 0x00, 0x00, undefined, 0x00),
  );
  if (resp.sw1 === 0x90) {
    return true;
  }
  return false;
}

export async function testIfRecord(p: DumpRunner): Promise<boolean> {
  try {
    // いちばんわかりやすく成功率の高いコマンドとして、1レコード目をREAD RECORDするコマンドを送る
    await p.check(
      p.send(new CommandApdu(0x00, 0xb2, 0x01, 0x04, undefined, 0x00)),
    );
  } catch (e) {
    return false;
  }
  return true;
}

export async function testIfPin(p: DumpRunner): Promise<boolean> {
  // いちばんわかりやすく成功率の高いコマンドとして、PINの残り試行回数を取得するVERIFYコマンドを送る
  const resp = await p.send(
    new CommandApdu(0x00, 0x20, 0x00, 0x00, undefined, 0x00),
  );
  if (resp.sw1 === 0x63) {
    return true;
  }
  return false;
}

export async function testIfInternalAuth(p: DumpRunner): Promise<boolean> {
  // いちばんわかりやすく成功率の高いコマンドとして、INTERNAL AUTHENTICATEを実際に試してみる
  const resp = await p.send(
    new CommandApdu(0x00, 0x88, 0x00, 0x00, Uint8Array.from([0x00]), 0x00),
  );
  // もし、0x9000が返ってきたら、チャレンジを正しく処理したことになるので、Internal Auth形式と判断できる
  if (resp.sw1 === 0x90) {
    return true;
  }
  return false;
}
export async function testIfExtAuth(p: DumpRunner): Promise<boolean> {
  // いちばんわかりやすく成功率の高いコマンドとして、EXTERNAL AUTHENTICATEの残回数を取得するコマンドを送る
  const resp = await p.send(
    new CommandApdu(0x00, 0x82, 0x00, 0x00, undefined, 0x00),
  );
  if (resp.sw1 === 0x63) {
    return true;
  }
  return false;
}
