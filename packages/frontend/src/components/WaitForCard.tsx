import { useEffect, useCallback, useState } from 'react';
import { ApiClient } from '@readthecard/jsapdu-over-ip/client';

interface WaitForCardProps {
  onCardDetected: () => void;
}

const apiClient = new ApiClient();

export default function WaitForCard({ onCardDetected }: WaitForCardProps) {
  const [waiting, setWaiting] = useState(false);

  const checkCard = useCallback(async () => {
    if (waiting) return;
    
    setWaiting(true);
    try {
      // セッション開始を試みる
      const sessionResult = await apiClient.startSession();
      if (sessionResult.success) {
        // カード待機
        const waitResult = await apiClient.waitForCard(30000);
        if (waitResult.success && waitResult.data?.cardPresent) {
          onCardDetected();
          return;
        }
      }
    } catch (err) {
      console.error('カード検出エラー:', err);
    }
    setWaiting(false);
  }, [onCardDetected, waiting]);

  useEffect(() => {
    const interval = setInterval(checkCard, 2000);
    checkCard(); // 初回即時実行
    return () => clearInterval(interval);
  }, [checkCard]);

  return (
    <div className="wait-screen">
      <div className="wait-icon">&#128179;</div>
      <h1 className="wait-title">マイナンバーカードを</h1>
      <h1 className="wait-title">リーダーにかざしてください</h1>
      {waiting && (
        <p className="wait-message" style={{ marginTop: '40px' }}>
          カードを読み取り中...
        </p>
      )}
    </div>
  );
}
