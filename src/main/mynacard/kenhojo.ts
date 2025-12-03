/**
 * マイナンバーカード基本4情報読み取り
 * 券面事項入力補助AP（KENHOJO_AP）から名前、住所、生年月日、性別を読み取る
 */

import { selectDf, verify, readBinary } from '@aokiapp/apdu-utils';
import { KENHOJO_AP, KENHOJO_AP_EF, schemaKenhojoBasicFour } from '@aokiapp/mynacard';
import { SchemaParser } from '@aokiapp/tlv/parser';
import type { SmartCard } from '@aokiapp/jsapdu-interface';

/** 基本4情報の型定義 */
export interface BasicFourInfo {
  /** 氏名 */
  name: string;
  /** 住所 */
  address: string;
  /** 生年月日 */
  birth: string;
  /** 性別（"1": 男性, "2": 女性） */
  gender: string;
}

/**
 * 券面事項入力補助APを選択
 * @param card スマートカードセッション
 */
export async function selectKenhojoAp(card: SmartCard): Promise<void> {
  const response = await card.transmit(selectDf(KENHOJO_AP));
  if (response.sw !== 0x9000) {
    throw new Error(`アプリケーション選択エラー: SW=${response.sw.toString(16)}`);
  }
}

/**
 * PIN認証を実行
 * @param card スマートカードセッション
 * @param pin 4桁のPINコード
 */
export async function verifyPin(card: SmartCard, pin: string): Promise<void> {
  const response = await card.transmit(verify(pin, { ef: KENHOJO_AP_EF.PIN }));
  
  if (response.sw !== 0x9000) {
    if (response.sw1 === 0x63) {
      const remaining = response.sw2 & 0x0F;
      throw new Error(`PIN認証失敗。残り試行回数: ${remaining}回`);
    }
    throw new Error(`PIN認証エラー: SW=${response.sw.toString(16)}`);
  }
}

/**
 * 基本4情報を読み取り
 * @param card スマートカードセッション
 * @returns 基本4情報
 */
export async function readBasicFour(card: SmartCard): Promise<BasicFourInfo> {
  const response = await card.transmit(
    readBinary(0, 2048, true, true, { shortEfId: KENHOJO_AP_EF.BASIC_FOUR })
  );
  
  if (response.sw !== 0x9000) {
    throw new Error(`データ読み取りエラー: SW=${response.sw.toString(16)}`);
  }
  
  // TLVパーサーでデータを解析
  const parser = new SchemaParser(schemaKenhojoBasicFour);
  const buffer = new ArrayBuffer(response.data.length);
  new Uint8Array(buffer).set(response.data);
  const parsed = parser.parse(buffer);
  
  return {
    name: parsed.name,
    address: parsed.address,
    birth: parsed.birth,
    gender: parsed.gender,
  };
}
