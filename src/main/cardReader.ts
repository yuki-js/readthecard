/**
 * マイナンバーカード読み取りモジュール
 * jsapduライブラリを使用して券面事項入力補助AP（Kenhojo AP）から基本4情報を読み取る
 * 
 * 注: jsapduはESMモジュールのため、CommonJS環境では動的インポートを使用する
 */

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
 * マイナンバーカードから基本4情報を読み取る
 * @param pin 4桁のPINコード
 * @returns 基本4情報
 * @throws カード読み取りに失敗した場合
 */
export async function readMynaCard(pin: string): Promise<BasicFourInfo> {
  // ESMモジュールを動的インポート（CommonJS環境での互換性のため）
  const { PcscPlatformManager } = await import('@aokiapp/jsapdu-pcsc');
  const { KENHOJO_AP, KENHOJO_AP_EF, schemaKenhojoBasicFour } = await import('@aokiapp/mynacard');
  const { selectDf, verify, readBinary } = await import('@aokiapp/apdu-utils');
  const { SchemaParser } = await import('@aokiapp/tlv/parser');

  let platform: any;
  let device: any;
  let card: any;

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
    // Uint8ArrayからArrayBufferを作成
    const buffer = new ArrayBuffer(readResponse.data.length);
    new Uint8Array(buffer).set(readResponse.data);
    const parsed = parser.parse(buffer);

    return {
      name: parsed.name,
      address: parsed.address,
      birth: parsed.birth,
      gender: parsed.gender,
    };
  } finally {
    // リソースの解放（逆順）
    // 注: エラーが発生してもリソースリークを防ぐため、個別にtry-catchでラップ
    if (card) {
      try { await card.release(); } catch (e) { console.warn('カードセッション解放エラー:', e); }
    }
    if (device) {
      try { await device.release(); } catch (e) { console.warn('デバイス解放エラー:', e); }
    }
    if (platform) {
      try { await platform.release(); } catch (e) { console.warn('プラットフォーム解放エラー:', e); }
    }
  }
}
