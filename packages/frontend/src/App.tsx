import { useState, useCallback } from 'react';
import { ApiClient, type BasicFourResponse } from '@readthecard/jsapdu-over-ip/client';
import PinInput from './components/PinInput';
import WaitForCard from './components/WaitForCard';
import BasicFourDisplay from './components/BasicFourDisplay';
import ErrorDisplay from './components/ErrorDisplay';
import { speakText } from './utils/voicevox';

type AppState = 'wait-card' | 'pin-input' | 'loading' | 'result' | 'error';

const apiClient = new ApiClient();

export default function App() {
  const [state, setState] = useState<AppState>('wait-card');
  const [error, setError] = useState<string>('');
  const [basicFour, setBasicFour] = useState<BasicFourResponse | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | undefined>(undefined);

  const handleCardDetected = useCallback(async () => {
    try {
      // セッション開始
      const sessionResult = await apiClient.startSession();
      if (!sessionResult.success) {
        throw new Error(sessionResult.error?.error || 'セッション開始に失敗しました');
      }
      setState('pin-input');
    } catch (err) {
      setError(String(err));
      setState('error');
    }
  }, []);

  const handlePinSubmit = useCallback(async (pin: string) => {
    setState('loading');
    setRemainingAttempts(undefined);
    
    try {
      // PIN検証
      const verifyResult = await apiClient.verifyPin(pin);
      if (!verifyResult.success || !verifyResult.data?.verified) {
        if (verifyResult.error?.remainingAttempts !== undefined) {
          setRemainingAttempts(verifyResult.error.remainingAttempts);
        }
        setState('pin-input');
        return;
      }

      // 基本4情報読み取り
      const basicFourResult = await apiClient.readBasicFour();
      if (!basicFourResult.success || !basicFourResult.data) {
        throw new Error(basicFourResult.error?.error || '基本4情報の読み取りに失敗しました');
      }

      setBasicFour(basicFourResult.data);
      setState('result');

      // 読み上げ
      await speakBasicFour(basicFourResult.data);
    } catch (err) {
      setError(String(err));
      setState('error');
    }
  }, []);

  const handleReset = useCallback(async () => {
    try {
      await apiClient.endSession();
    } catch {
      // セッション終了エラーは無視
    }
    setBasicFour(null);
    setError('');
    setRemainingAttempts(undefined);
    setState('wait-card');
  }, []);

  return (
    <div className="app-container">
      <div className="app-content">
        {state === 'wait-card' && (
          <WaitForCard onCardDetected={handleCardDetected} />
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

async function speakBasicFour(data: BasicFourResponse) {
  const text = `お名前は${data.name}さん。住所は${data.address}。生年月日は${data.birthDate}。性別は${data.sex}です。`;
  await speakText(text);
}
