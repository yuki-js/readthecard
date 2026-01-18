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
  const resp = await p.send(new CommandApdu(0x00, 0x20, 0x00, 0x80, undefined));
  if (resp.sw1 === 0x63) {
    return true;
  }
  return false;
}

export async function testIfIntAuth(p: DumpRunner): Promise<boolean> {
  // いちばんわかりやすく成功率の高いコマンドとして、INTERNAL AUTHENTICATEを実際に試してみる
  const resp = await p.send(
    new CommandApdu(0x00, 0x88, 0x00, 0x80, Uint8Array.from([0x00]), 0x00),
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
    new CommandApdu(0x80, 0x82, 0x00, 0x80, undefined, 0x00),
  );
  if (resp.sw1 === 0x63) {
    return true;
  }
  return false;
}

function createRandomBytes(length: number): Uint8Array<ArrayBuffer> {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

// ランダムな32バイトのデータをランダムに生成する
const testData32Byte = createRandomBytes(32);

export async function testIfPsoCds(p: DumpRunner): Promise<boolean> {
  // いちばんわかりやすく成功率の高いコマンドとして、PSO: COMPUTE DIGITAL SIGNATUREを実際に試してみる
  const resp = await p.send(
    new CommandApdu(0x00, 0x2a, 0x9e, 0x9a, testData32Byte, 0x00),
  );
  // もし、0x9000が返ってきたら、チャレンジを正しく処理したことになるので、PSO: CDS形式と判断できる
  if (resp.sw1 === 0x90) {
    return true;
  }
  return false;
}

export async function testIfPsoDec(p: DumpRunner): Promise<boolean> {
  // いちばんわかりやすく成功率の高いコマンドとして、PSO: DECIPHERを実際に試してみる
  const resp = await p.send(
    new CommandApdu(0x00, 0x2a, 0x80, 0x86, testData32Byte, 0x00),
  );
  // もし、0x9000が返ってきたら、チャレンジを正しく処理したことになるので、PSO: DEC形式と判断できる
  if (resp.sw1 === 0x90) {
    return true;
  }
  return false;
}

export async function testIfPsoEnc(p: DumpRunner): Promise<boolean> {
  // いちばんわかりやすく成功率の高いコマンドとして、PSO: ENCRYPTを実際に試してみる
  const resp = await p.send(
    new CommandApdu(0x00, 0x2a, 0x80, 0x84, testData32Byte, 0x00),
  );
  // もし、0x9000が返ってきたら、チャレンジを正しく処理したことになるので、PSO: ENC形式と判断できる
  if (resp.sw1 === 0x90) {
    return true;
  }
  return false;
}

export async function testIfPsoHash(p: DumpRunner): Promise<boolean> {
  // いちばんわかりやすく成功率の高いコマンドとして、PSO: HASHを実際に試してみる
  const resp = await p.send(
    new CommandApdu(0x00, 0x2a, 0x90, 0x86, testData32Byte, 0x00),
  );
  // もし、0x9000が返ってきたら、チャレンジを正しく処理したことになるので、PSO: HASH形式と判断できる
  if (resp.sw1 === 0x90) {
    return true;
  }
  return false;
}

export async function testIfJpkiSign(p: DumpRunner): Promise<boolean> {
  // いちばんわかりやすく成功率の高いコマンドとして、JPKI署名用署名生成コマンドを実際に試してみる
  // P1=0x03: PKCS#1 v1.5, カード側でハッシュ計算を行い、DigestInfoまで付加する。
  // P2=0x80: 現在選択中のEFを指定
  const resp = await p.send(
    new CommandApdu(0x80, 0x2a, 0x03, 0x80, testData32Byte, 0x00),
  );
  // もし、0x9000が返ってきたら、チャレンジを正しく処理したことになるので、JPKI署名形式と判断できる
  if (resp.sw1 === 0x90) {
    return true;
  }
  return false;
}

export async function testIfJpkiTrust06C1(p: DumpRunner): Promise<boolean> {
  const resp = await p.send(
    new CommandApdu(0x80, 0xa2, 0x06, 0xc1, testData32Byte, 0x00),
  );
  return false;
}

export async function testIfJpkiTrust00C1(p: DumpRunner): Promise<boolean> {
  const l = p.newLog("message");
  const resp = await p.send(
    new CommandApdu(0x80, 0xa2, 0x00, 0xc1, testData32Byte, 0x00),
  );
  return false;
}
