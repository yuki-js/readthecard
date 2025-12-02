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
      // Call the main process to read the card
      const result = await window.electronAPI.readCard(pin);
      
      if (result.success && result.data) {
        setBasicFourInfo(result.data);
        setState('display');
      } else {
        setErrorMessage(result.error || '読み取りに失敗しました');
        setState('error');
      }
    } catch (error) {
      console.error('Card reading error:', error);
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
      console.error('Speech error:', error);
    }
  }, [basicFourInfo]);

  return (
    <div className="app-container">
      {state === 'pin-input' && (
        <>
          <h1 className="title">マイナンバーカード読み取り</h1>
          <PinInput onSubmit={handlePinSubmit} />
        </>
      )}

      {state === 'waiting-for-card' && (
        <>
          <h1 className="title">マイナンバーカード読み取り</h1>
          <WaitingForCard onCardReady={handleCardReady} />
        </>
      )}

      {state === 'reading' && (
        <>
          <h1 className="title">マイナンバーカード読み取り</h1>
          <div className="loading">
            <div className="spinner"></div>
            <p className="loading-text">カードを読み取り中...</p>
          </div>
        </>
      )}

      {state === 'display' && basicFourInfo && (
        <>
          <button className="back-button" onClick={handleReset}>
            ← 最初に戻る
          </button>
          <BasicFourDisplay info={basicFourInfo} onSpeak={handleSpeak} />
        </>
      )}

      {state === 'error' && (
        <>
          <h1 className="title">エラー</h1>
          <div className="status-message error">{errorMessage}</div>
          <button className="submit-button" onClick={handleReset} style={{ marginTop: '2rem' }}>
            最初に戻る
          </button>
        </>
      )}
    </div>
  );
}

export default App;
