import { useState, useCallback, useRef } from 'react';
import { 
  SmartCardPlatformProxy,
  FetchClientTransport,
  type SmartCardDeviceProxy,
  type SmartCardProxy,
} from '@readthecard/jsapdu-over-ip';
import { selectKenhojoAp, verifyPin, readBasicFour, type BasicFourInfo } from './services/mynacard';
import PinInput from './components/PinInput';
import WaitForCard from './components/WaitForCard';
import BasicFourDisplay from './components/BasicFourDisplay';
import ErrorDisplay from './components/ErrorDisplay';
import { speakText } from './utils/voicevox';

type AppState = 'wait-card' | 'pin-input' | 'loading' | 'result' | 'error';

// jsapdu-over-ip のプラットフォームプロキシ（シングルトン）
const transport = new FetchClientTransport('/api/jsapdu/rpc');
const platform = new SmartCardPlatformProxy(transport);

export default function App() {
  const [state, setState] = useState<AppState>('wait-card');
  const [error, setError] = useState<string>('');
  const [basicFour, setBasicFour] = useState<BasicFourInfo | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | undefined>(undefined);
  
  // jsapdu プロキシのリソース
  const deviceRef = useRef<SmartCardDeviceProxy | null>(null);
  const cardRef = useRef<SmartCardProxy | null>(null);

  const handleCardDetected = useCallback(async (card: SmartCardProxy) => {
    try {
      cardRef.current = card;
      
      // 券面事項入力補助APを選択
      await selectKenhojoAp(card);
      
      setState('pin-input');
    } catch (err) {
      setError(String(err));
      setState('error');
    }
  }, []);

  const handlePinSubmit = useCallback(async (pin: string) => {
    setState('loading');
    setRemainingAttempts(undefined);
    
    if (!cardRef.current) {
      setError('カードセッションがありません');
      setState('error');
      return;
    }

    try {
      // PIN検証（jsapdu プロキシを透過的に使用）
      const verifyResult = await verifyPin(cardRef.current, pin);
      if (!verifyResult.verified) {
        if (verifyResult.remainingAttempts !== undefined) {
          setRemainingAttempts(verifyResult.remainingAttempts);
        }
        setState('pin-input');
        return;
      }

      // 基本4情報読み取り（jsapdu プロキシを透過的に使用）
      const basicFourData = await readBasicFour(cardRef.current);

      setBasicFour(basicFourData);
      setState('result');

      // 読み上げ
      await speakBasicFour(basicFourData);
    } catch (err) {
      setError(String(err));
      setState('error');
    }
  }, []);

  const handleReset = useCallback(async () => {
    // jsapdu プロキシのリソースを解放
    try {
      if (cardRef.current) {
        await cardRef.current.release();
        cardRef.current = null;
      }
      if (deviceRef.current) {
        await deviceRef.current.release();
        deviceRef.current = null;
      }
    } catch {
      // エラーは無視
    }
    
    setBasicFour(null);
    setError('');
    setRemainingAttempts(undefined);
    setState('wait-card');
  }, []);

  // デバイス取得コールバック
  const handleDeviceAcquired = useCallback((device: SmartCardDeviceProxy) => {
    deviceRef.current = device;
  }, []);

  return (
    <div className="app-container">
      <div className="app-content">
        {state === 'wait-card' && (
          <WaitForCard 
            platform={platform}
            onDeviceAcquired={handleDeviceAcquired}
            onCardDetected={handleCardDetected} 
          />
        )}
        {state === 'pin-input' && (
          <PinInput
            onSubmit={handlePinSubmit}
            remainingAttempts={remainingAttempts}
          />
        )}
        {state === 'loading' && (
          <div className="loading">読み込み中...</div>
        )}
        {state === 'result' && basicFour && (
          <BasicFourDisplay
            data={basicFour}
            onBack={handleReset}
          />
        )}
        {state === 'error' && (
          <ErrorDisplay
            message={error}
            onRetry={handleReset}
          />
        )}
      </div>
    </div>
  );
}

async function speakBasicFour(data: BasicFourInfo) {
  const text = `お名前は${data.name}さん。住所は${data.address}。生年月日は${data.birthDate}。性別は${data.sex}です。`;
  await speakText(text);
}
