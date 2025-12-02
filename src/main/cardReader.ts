// カードリーダーモジュール - jsapduライブラリを使用
// @aokiapp/jsapdu-pcsc, @aokiapp/mynacard, @aokiapp/apdu-utils

import { PcscPlatformManager } from '@aokiapp/jsapdu-pcsc';
import { KENHOJO_AP, KENHOJO_AP_EF, schemaKenhojoBasicFour } from '@aokiapp/mynacard';
import { selectDf, verify, readEfBinaryFull } from '@aokiapp/apdu-utils';
import { SchemaParser } from '@aokiapp/tlv/parser';
import type { SmartCardPlatform, SmartCardDevice, SmartCard } from '@aokiapp/jsapdu-interface';

interface BasicFourInfo {
  name: string;
  address: string;
  birthDate: string;
  gender: string;
}

let platform: SmartCardPlatform | null = null;
let device: SmartCardDevice | null = null;

async function getPlatform(): Promise<SmartCardPlatform> {
  if (!platform) {
    platform = PcscPlatformManager.getInstance().getPlatform();
    await platform.init();
  }
  return platform;
}

export async function waitForCard(): Promise<void> {
  const p = await getPlatform();
  
  const devices = await p.getDeviceInfo();
  if (devices.length === 0) {
    throw new Error('カードリーダーが見つかりません。カードリーダーを接続してください。');
  }
  
  device = await p.acquireDevice(devices[0].id);
  
  const isPresent = await device.isCardPresent();
  if (!isPresent) {
    await device.waitForCardPresence(60000);
  }
}

export async function readMynaCard(pin: string): Promise<BasicFourInfo> {
  if (!device) {
    throw new Error('カードリーダーが初期化されていません');
  }
  
  const session: SmartCard = await device.startSession();
  
  try {
    // 券面事項入力補助AP (KENHOJO_AP) を選択
    const selectResponse = await session.transmit(selectDf(KENHOJO_AP));
    if (!selectResponse.isSuccess()) {
      throw new Error('券面事項入力補助APの選択に失敗しました。マイナンバーカードを確認してください。');
    }
    
    // PIN認証
    const verifyResponse = await session.transmit(
      verify(pin, { ef: KENHOJO_AP_EF.PIN })
    );
    
    if (!verifyResponse.isSuccess()) {
      if (verifyResponse.sw1 === 0x63) {
        const remaining = verifyResponse.sw2 & 0x0F;
        throw new Error('暗証番号が間違っています。残り' + remaining + '回で利用停止になります。');
      }
      throw new Error('暗証番号の認証に失敗しました。');
    }
    
    // 基本4情報を読み取り
    const dataResponse = await readEfBinaryFull(KENHOJO_AP_EF.BASIC_FOUR, session);
    
    // TLVデータをパース
    const parser = new SchemaParser(schemaKenhojoBasicFour);
    const parsed = parser.parse(dataResponse.buffer);
    
    return {
      name: parsed.name,
      address: parsed.address,
      birthDate: parsed.birth,
      gender: parsed.gender,
    };
  } finally {
    await session.release();
  }
}

export async function releasePlatform(): Promise<void> {
  if (device) {
    await device.release();
    device = null;
  }
  if (platform) {
    await platform.release();
    platform = null;
  }
}
