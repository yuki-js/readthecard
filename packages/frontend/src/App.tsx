import { useState, useEffect, useCallback } from 'react';
import { cardManager, type BasicFourInfo, type CardManagerState } from './managers/CardManager';
import PinInput from './components/PinInput';
import WaitForCard from './components/WaitForCard';
import BasicFourDisplay from './components/BasicFourDisplay';
import ErrorDisplay from './components/ErrorDisplay';
import { speakText } from './utils/voicevox';

type AppState = 'wait-card' | 'pin-input' | 'loading' | 'result' | 'error';

export default function App() {
  const [state, setState] = useState<AppState>('wait-card');
  const [error, setError] = useState<string>('');
  const [basicFour, setBasicFour] = useState<BasicFourInfo | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | undefined>(undefined);
  const [managerState, setManagerState] = useState<CardManagerState>(cardManager.state);

  // CardManagerの状態変更を監視
  useEffect(() => {
    const unsubscribe = cardManager.addListener(setManagerState);
    return unsubscribe;
  }, []);

  const handleCardReady = useCallback(() => {
    setState('pin-input');
  }, []);

  const handlePinSubmit = useCallback(async (pin: string) => {
    setState('loading');
    setRemainingAttempts(undefined);

    try {
      // PIN検証
      const verifyResult = await cardManager.verifyPin(pin);
      if (!verifyResult.verified) {
        if (verifyResult.remainingAttempts !== undefined) {
          setRemainingAttempts(verifyResult.remainingAttempts);
        }
        setState('pin-input');
        return;
      }

      // 基本4情報読み取り
      const basicFourData = await cardManager.readBasicFour();

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
    await cardManager.release();
    setBasicFour(null);
    setError('');
    setRemainingAttempts(undefined);
    setState('wait-card');
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setState('error');
  }, []);

  return (
    <div className="app-container">
      <div className="app-content">
        {state === 'wait-card' && (
          <WaitForCard 
            onCardReady={handleCardReady}
            onError={handleError}
            status={managerState.status}
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
