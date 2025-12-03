/**
 * PC/SCプラットフォーム管理
 * スマートカードリーダーへのアクセスを提供
 */

import { PcscPlatformManager } from '@aokiapp/jsapdu-pcsc';
import type { SmartCardPlatform, SmartCardDevice, SmartCard } from '@aokiapp/jsapdu-interface';

/** プラットフォームシングルトン */
let platformInstance: SmartCardPlatform | null = null;

/**
 * PC/SCプラットフォームを取得
 * @returns SmartCardPlatform
 */
export function getPlatform(): SmartCardPlatform {
  if (!platformInstance) {
    platformInstance = PcscPlatformManager.getInstance().getPlatform();
  }
  return platformInstance;
}

/**
 * プラットフォームを初期化
 */
export async function initPlatform(): Promise<void> {
  const platform = getPlatform();
  await platform.init();
}

/**
 * プラットフォームを解放
 */
export async function releasePlatform(): Promise<void> {
  if (platformInstance) {
    try {
      await platformInstance.release();
    } catch (error) {
      console.warn('プラットフォーム解放エラー:', error);
    }
    platformInstance = null;
  }
}

/**
 * 利用可能なリーダー一覧を取得
 * @returns リーダー情報の配列
 */
export async function getReaders(): Promise<Array<{ id: string; name: string }>> {
  const platform = getPlatform();
  await platform.init();
  
  const devices = await platform.getDeviceInfo();
  return devices.map((d) => ({
    id: d.id,
    name: d.friendlyName || d.id,
  }));
}

/**
 * デバイスを取得
 * @param deviceId デバイスID（省略時は最初のリーダー）
 * @returns SmartCardDevice
 */
export async function acquireDevice(deviceId?: string): Promise<SmartCardDevice> {
  const platform = getPlatform();
  await platform.init();
  
  const devices = await platform.getDeviceInfo();
  if (devices.length === 0) {
    throw new Error('カードリーダーが見つかりません');
  }
  
  const targetId = deviceId || devices[0].id;
  return platform.acquireDevice(targetId);
}

export type { SmartCardPlatform, SmartCardDevice, SmartCard };
