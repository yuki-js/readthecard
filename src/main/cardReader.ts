/**
 * マイナンバーカード読み取りモジュール
 * jsapduライブラリを使用して券面事項入力補助AP（KENHOJO_AP）から基本4情報を読み取る
 */

import { acquireDevice } from './pcsc/index.js';
import { selectKenhojoAp, verifyPin, readBasicFour, type BasicFourInfo } from './mynacard/index.js';
import type { SmartCardDevice, SmartCard } from './pcsc/index.js';

export type { BasicFourInfo };

/**
 * マイナンバーカードから基本4情報を読み取る
 * @param pin 4桁のPINコード
 * @returns 基本4情報
 * @throws カード読み取りに失敗した場合
 */
export async function readMynaCard(pin: string): Promise<BasicFourInfo> {
  let device: SmartCardDevice | null = null;
  let card: SmartCard | null = null;

  try {
    // デバイス取得
    device = await acquireDevice();

    // カードの存在確認と待機
    const isCardPresent = await device.isCardPresent();
    if (!isCardPresent) {
      await device.waitForCardPresence(30000);
    }

    // カードセッション開始
    card = await device.startSession();

    // 券面事項入力補助APを選択
    await selectKenhojoAp(card);

    // PIN認証
    await verifyPin(card, pin);

    // 基本4情報を読み取り
    return await readBasicFour(card);

  } finally {
    // リソースの解放（逆順）
    if (card) {
      try {
        await card.release();
      } catch (error) {
        console.warn('カードセッション解放エラー:', error);
      }
    }
    if (device) {
      try {
        await device.release();
      } catch (error) {
        console.warn('デバイス解放エラー:', error);
      }
    }
  }
}
