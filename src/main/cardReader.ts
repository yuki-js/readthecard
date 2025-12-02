/**
 * マイナンバーカード読み取りモジュール
 * jsapduライブラリを使用して券面事項入力補助AP（Kenhojo AP）から基本4情報を読み取る
 */

import type { SmartCardPlatform, SmartCardDevice, SmartCard } from '@aokiapp/jsapdu-interface';

// 基本4情報の型定義
export interface BasicFourInfo {
  name: string;      // 氏名
  address: string;   // 住所
  birth: string;     // 生年月日
  gender: string;    // 性別（"1": 男性, "2": 女性）
}

/**
 * マイナンバーカードから基本4情報を読み取る
 * @param pin 4桁のPINコード
 * @returns 基本4情報
 */
export async function readMynaCard(pin: string): Promise<BasicFourInfo> {
  // 動的インポート（ESM対応）
  const jsapduPcsc = await import('@aokiapp/jsapdu-pcsc');
  const mynacard = await import('@aokiapp/mynacard');
  const apduUtils = await import('@aokiapp/apdu-utils');
  const tlv = await import('@aokiapp/tlv');

  const { PcscPlatformManager } = jsapduPcsc;
  const { KENHOJO_AP, KENHOJO_AP_EF, schemaKenhojoBasicFour } = mynacard;
  const { selectDf, verify, readBinary } = apduUtils;
  const { SchemaParser } = tlv;

  let platform: SmartCardPlatform | undefined;
  let device: SmartCardDevice | undefined;
  let card: SmartCard | undefined;

  try {
    // PC/SCプラットフォーム初期化
    platform = PcscPlatformManager.getInstance().getPlatform();
    await platform.init();

    // 利用可能なリーダーを取得
    const devices = await platform.getDeviceInfo();
    if (devices.length === 0) {
      throw new Error('カードリーダーが見つかりません');
    }

    // 最初のリーダーを使用
    device = await platform.acquireDevice(devices[0].id);

    // カードの存在確認と待機
    const isCardPresent = await device.isCardPresent();
    if (!isCardPresent) {
      // カードを待機（30秒タイムアウト）
      await device.waitForCardPresence(30000);
    }

    // カードセッション開始
    card = await device.startSession();

    // 券面事項入力補助AP（KENHOJO_AP）を選択
    const selectResponse = await card.transmit(selectDf(KENHOJO_AP));
    if (selectResponse.sw !== 0x9000) {
      throw new Error(`アプリケーション選択エラー: SW=${selectResponse.sw.toString(16)}`);
    }

    // PIN認証
    const verifyResponse = await card.transmit(verify(pin, { ef: KENHOJO_AP_EF.PIN }));
    if (verifyResponse.sw !== 0x9000) {
      if (verifyResponse.sw1 === 0x63) {
        const remaining = verifyResponse.sw2 & 0x0F;
        throw new Error(`PIN認証失敗。残り試行回数: ${remaining}回`);
      }
      throw new Error(`PIN認証エラー: SW=${verifyResponse.sw.toString(16)}`);
    }

    // 基本4情報を読み取り（最大2048バイト）
    const readResponse = await card.transmit(
      readBinary(0, 2048, true, true, { shortEfId: KENHOJO_AP_EF.BASIC_FOUR })
    );
    if (readResponse.sw !== 0x9000) {
      throw new Error(`データ読み取りエラー: SW=${readResponse.sw.toString(16)}`);
    }

    // TLVパーサーでデータを解析
    const parser = new SchemaParser(schemaKenhojoBasicFour);
    // ArrayBuffer型に変換
    const buffer = new ArrayBuffer(readResponse.data.length);
    const view = new Uint8Array(buffer);
    view.set(readResponse.data);
    const parsed = parser.parse(buffer);

    return {
      name: parsed.name,
      address: parsed.address,
      birth: parsed.birth,
      gender: parsed.gender,
    };
  } finally {
    // リソースの解放（逆順）
    if (card) {
      try {
        await card.release();
      } catch {
        // リリースエラーは無視
      }
    }
    if (device) {
      try {
        await device.release();
      } catch {
        // リリースエラーは無視
      }
    }
    if (platform) {
      try {
        await platform.release();
      } catch {
        // リリースエラーは無視
      }
    }
  }
}
