/**
 * jsapdu プラットフォームプロキシのReactフック
 * SmartCardPlatformProxy を透過的に使用
 */

import { useRef, useCallback } from 'react';
import { 
  SmartCardPlatformProxy,
  FetchClientTransport,
  type SmartCardDeviceProxy,
  type SmartCardProxy,
} from '@readthecard/jsapdu-over-ip';

// シングルトンのトランスポートとプラットフォーム
const transport = new FetchClientTransport('/api/jsapdu/rpc');
const platform = new SmartCardPlatformProxy(transport);

export interface UseJsapduResult {
  platform: SmartCardPlatformProxy;
  initPlatform: () => Promise<void>;
  releasePlatform: () => Promise<void>;
  acquireFirstDevice: () => Promise<SmartCardDeviceProxy | null>;
  waitForCardAndStartSession: (device: SmartCardDeviceProxy, timeout?: number) => Promise<SmartCardProxy>;
}

export function useJsapdu(): UseJsapduResult {
  const deviceRef = useRef<SmartCardDeviceProxy | null>(null);
  const cardRef = useRef<SmartCardProxy | null>(null);

  const initPlatform = useCallback(async () => {
    if (!platform.isInitialized()) {
      await platform.init();
    }
  }, []);

  const releasePlatform = useCallback(async () => {
    if (cardRef.current) {
      try {
        await cardRef.current.release();
      } catch { /* ignore */ }
      cardRef.current = null;
    }
    if (deviceRef.current) {
      try {
        await deviceRef.current.release();
      } catch { /* ignore */ }
      deviceRef.current = null;
    }
    if (platform.isInitialized()) {
      await platform.release();
    }
  }, []);

  const acquireFirstDevice = useCallback(async (): Promise<SmartCardDeviceProxy | null> => {
    await initPlatform();
    const devices = await platform.getDeviceInfo();
    if (devices.length === 0) {
      return null;
    }
    const device = await platform.acquireDevice(devices[0].id);
    deviceRef.current = device;
    return device;
  }, [initPlatform]);

  const waitForCardAndStartSession = useCallback(async (
    device: SmartCardDeviceProxy,
    timeout: number = 30000
  ): Promise<SmartCardProxy> => {
    await device.waitForCardPresence(timeout);
    const card = await device.startSession();
    cardRef.current = card;
    return card;
  }, []);

  return {
    platform,
    initPlatform,
    releasePlatform,
    acquireFirstDevice,
    waitForCardAndStartSession,
  };
}
