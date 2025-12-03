import { useEffect, useCallback, useState } from 'react';
import type { SmartCardPlatformProxy, SmartCardDeviceProxy, SmartCardProxy } from '@readthecard/jsapdu-over-ip';

interface WaitForCardProps {
  platform: SmartCardPlatformProxy;
  onDeviceAcquired: (device: SmartCardDeviceProxy) => void;
  onCardDetected: (card: SmartCardProxy) => void;
}

export default function WaitForCard({ platform, onDeviceAcquired, onCardDetected }: WaitForCardProps) {
  const [waiting, setWaiting] = useState(false);
  const [status, setStatus] = useState('初期化中...');

  const checkCard = useCallback(async () => {
    if (waiting) return;
    
    setWaiting(true);
    try {
      // プラットフォーム初期化
      if (!platform.isInitialized()) {
        setStatus('プラットフォーム初期化中...');
        await platform.init();
      }

      // デバイス一覧取得
      setStatus('デバイス検索中...');
      const devices = await platform.getDeviceInfo();
      if (devices.length === 0) {
        setStatus('カードリーダーが見つかりません');
        setWaiting(false);
        return;
      }

      // 最初のデバイスを取得
      setStatus('デバイス接続中...');
      const device = await platform.acquireDevice(devices[0].id);
      onDeviceAcquired(device);

      // カード待機
      setStatus('カードをかざしてください...');
      await device.waitForCardPresence(30000);

      // カードセッション開始
      setStatus('カード読み取り中...');
      const card = await device.startSession();
      
      onCardDetected(card);
      return;
    } catch (err) {
      console.error('カード検出エラー:', err);
      setStatus('エラー: ' + String(err));
    }
    setWaiting(false);
  }, [platform, onDeviceAcquired, onCardDetected, waiting]);

  useEffect(() => {
    checkCard();
    const interval = setInterval(checkCard, 5000);
    return () => clearInterval(interval);
  }, [checkCard]);

  return (
    <div className="wait-screen">
      <div className="wait-icon">&#128179;</div>
      <h1 className="wait-title">マイナンバーカードを</h1>
      <h1 className="wait-title">リーダーにかざしてください</h1>
      <p className="wait-message" style={{ marginTop: '40px' }}>
        {status}
      </p>
    </div>
  );
}
