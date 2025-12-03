import { useEffect, useCallback, useState } from 'react';
import { cardManager, type CardManagerState } from '../managers/CardManager';

interface WaitForCardProps {
  onCardReady: () => void;
  onError: (error: string) => void;
  status: CardManagerState['status'];
}

export default function WaitForCard({ onCardReady, onError, status }: WaitForCardProps) {
  const [message, setMessage] = useState('初期化中...');

  // ステータスに応じたメッセージを更新
  useEffect(() => {
    switch (status) {
      case 'idle':
      case 'initializing':
        setMessage('初期化中...');
        break;
      case 'waiting-device':
        setMessage('デバイス検索中...');
        break;
      case 'waiting-card':
        setMessage('カードをかざしてください...');
        break;
      case 'ready':
        setMessage('カード接続完了');
        break;
      case 'error':
        setMessage('エラーが発生しました');
        break;
      default:
        setMessage('処理中...');
    }
  }, [status]);

  // 初期化とカード待機を実行
  useEffect(() => {
    let cancelled = false;

    const initAndWait = async () => {
      try {
        // プラットフォーム初期化
        await cardManager.initialize();
        
        if (cancelled) return;

        // カード待機
        await cardManager.waitForCardAndConnect(60000);
        
        if (cancelled) return;

        onCardReady();
      } catch (err) {
        if (!cancelled) {
          onError(String(err));
        }
      }
    };

    initAndWait();

    return () => {
      cancelled = true;
    };
  }, [onCardReady, onError]);

  return (
    <div className="wait-screen">
      <div className="wait-icon">&#128179;</div>
      <h1 className="wait-title">マイナンバーカードを</h1>
      <h1 className="wait-title">リーダーにかざしてください</h1>
      <p className="wait-message" style={{ marginTop: '40px' }}>
        {message}
      </p>
    </div>
  );
}
