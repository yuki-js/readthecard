/**
 * マイナンバーカード読み取りサービス
 * jsapdu-over-ip の SmartCardProxy を透過的に使用
 */

import { 
  type SmartCardProxy,
  CommandApdu,
} from '@readthecard/jsapdu-over-ip';

// マイナンバーカード 券面事項入力補助AP
const KENHOJO_AP = new Uint8Array([0xD3, 0x92, 0x10, 0x00, 0x00, 0x00, 0x01, 0x01]);

// 券面事項入力補助AP EF
const KENHOJO_EF = {
  PIN: 0x01,
  BASIC_FOUR: 0x02,
};

export interface BasicFourInfo {
  name: string;
  address: string;
  birthDate: string;
  sex: string;
}

/**
 * 券面事項入力補助APを選択
 */
export async function selectKenhojoAp(card: SmartCardProxy): Promise<void> {
  const selectCmd = new CommandApdu(0x00, 0xA4, 0x04, 0x0C, KENHOJO_AP, null);
  const response = await card.transmit(selectCmd);
  if (response.sw !== 0x9000) {
    throw new Error(`券面事項入力補助APの選択に失敗: SW=${response.sw.toString(16)}`);
  }
}

/**
 * PINを検証
 */
export async function verifyPin(card: SmartCardProxy, pin: string): Promise<{ verified: boolean; remainingAttempts?: number }> {
  // PINをASCIIバイト列に変換
  const pinData = new Uint8Array(pin.split('').map(c => c.charCodeAt(0)));
  const verifyCmd = new CommandApdu(0x00, 0x20, 0x00, 0x80 + KENHOJO_EF.PIN, pinData, null);
  const response = await card.transmit(verifyCmd);

  if (response.sw === 0x9000) {
    return { verified: true };
  }

  // PIN検証失敗
  if (response.sw1 === 0x63) {
    const remainingAttempts = response.sw2 & 0x0F;
    return { verified: false, remainingAttempts };
  }

  throw new Error(`PIN検証エラー: SW=${response.sw.toString(16)}`);
}

/**
 * 基本4情報を読み取り
 */
export async function readBasicFour(card: SmartCardProxy): Promise<BasicFourInfo> {
  // EF(基本4情報)を選択
  const selectEfCmd = new CommandApdu(0x00, 0xA4, 0x02, 0x0C, new Uint8Array([0x00, KENHOJO_EF.BASIC_FOUR]), null);
  const selectResp = await card.transmit(selectEfCmd);
  if (selectResp.sw !== 0x9000) {
    throw new Error(`基本4情報EFの選択に失敗: SW=${selectResp.sw.toString(16)}`);
  }

  // READ BINARY
  const readCmd = new CommandApdu(0x00, 0xB0, 0x00, 0x00, null, 0);
  const readResp = await card.transmit(readCmd);
  if (readResp.sw !== 0x9000 && readResp.sw1 !== 0x62) {
    throw new Error(`基本4情報の読み取りに失敗: SW=${readResp.sw.toString(16)}`);
  }

  // TLVパース
  return parseBasicFourTlv(readResp.data);
}

/**
 * 基本4情報のTLVをパース
 */
function parseBasicFourTlv(data: Uint8Array): BasicFourInfo {
  const decoder = new TextDecoder('utf-8');
  const result: BasicFourInfo = { name: '', address: '', birthDate: '', sex: '' };
  let offset = 0;

  while (offset < data.length) {
    // タグ読み取り（2バイトタグの場合も考慮）
    let tag = data[offset]!;
    offset++;
    
    if ((tag & 0x1F) === 0x1F) {
      // 2バイト目
      tag = (tag << 8) | data[offset]!;
      offset++;
    }

    if (offset >= data.length) break;

    // 長さ読み取り
    let length = data[offset]!;
    offset++;

    if (length === 0x81) {
      length = data[offset]!;
      offset++;
    } else if (length === 0x82) {
      length = (data[offset]! << 8) | data[offset + 1]!;
      offset += 2;
    }

    if (offset + length > data.length) break;

    const value = data.slice(offset, offset + length);
    offset += length;

    // タグに応じて値を設定
    // DF22=名前, DF23=住所, DF24=生年月日, DF25=性別
    switch (tag) {
      case 0xDF22:
        result.name = decoder.decode(value);
        break;
      case 0xDF23:
        result.address = decoder.decode(value);
        break;
      case 0xDF24:
        result.birthDate = decoder.decode(value);
        break;
      case 0xDF25:
        result.sex = decoder.decode(value);
        break;
    }
  }

  return result;
}
