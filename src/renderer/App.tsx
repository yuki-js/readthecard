import { useState, useCallback } from 'react';
import PinInput from './components/PinInput';
import WaitingForCard from './components/WaitingForCard';
import BasicFourDisplay from './components/BasicFourDisplay';

export interface BasicFourInfo {
  name: string;
  address: string;
  birthDate: string;
  gender: string;
}

type AppState = 'pin-input' | 'waiting-for-card' | 'reading' | 'display' | 'error';

function App() {
  const [state, setState] = useState<AppState>('pin-input');
  const [pin, setPin] = useState<string>('');
  const [basicFourInfo, setBasicFourInfo] = useState<BasicFourInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handlePinSubmit = useCallback((submittedPin: string) => {
    setPin(submittedPin);
    setState('waiting-for-card');
  }, []);

  const handleCardReady = useCallback(async () => {
    setState('reading');
    
    try {
      const result = await window.electronAPI.readCard(pin);
      
      if (result.success && result.data) {
        setBasicFourInfo(result.data);
        setState('display');
      } else {
        setErrorMessage(result.error || '読み取りに失敗しました');
        setState('error');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '不明なエラーが発生しました');
      setState('error');
    }
  }, [pin]);

  const handleReset = useCallback(() => {
    setPin('');
    setBasicFourInfo(null);
    setErrorMessage('');
    setState('pin-input');
  }, []);

  const handleSpeak = useCallback(async () => {
    if (!basicFourInfo) return;
    
    try {
      await window.electronAPI.speakText(basicFourInfo);
    } catch (error) {
      console.error('読み上げエラー:', error);
    }
  }, [basicFourInfo]);

  return (
    <div className="app-container">
      {state === 'pin-input' && (
        <div>
          <h1>マイナンバーカード読み取り</h1>
          <PinInput onSubmit={handlePinSubmit} />
        </div>
      )}

      {state === 'waiting-for-card' && (
        <div>
          <h1>マイナンバーカード読み取り</h1>
          <WaitingForCard onCardReady={handleCardReady} />
        </div>
      )}

      {state === 'reading' && (
        <div>
          <h1>マイナンバーカード読み取り</h1>
          <div className="loading">
            <p className="loading-text">カードを読み取り中...</p>
          </div>
        </div>
      )}

      {state === 'display' && basicFourInfo && (
        <div>
          <button className="back-button" onClick={handleReset}>
            戻る
          </button>
          <BasicFourDisplay info={basicFourInfo} onSpeak={handleSpeak} />
        </div>
      )}

      {state === 'error' && (
        <div>
          <h1>エラー</h1>
          <div className="status-message error">{errorMessage}</div>
          <br />
          <button className="submit-button" onClick={handleReset}>
            最初に戻る
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
