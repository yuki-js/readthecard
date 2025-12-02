import React, { useState, useCallback } from 'react';
import { PinInputScreen } from './screens/PinInputScreen';
import { CardPlacementScreen } from './screens/CardPlacementScreen';
import { ResultScreen } from './screens/ResultScreen';

// 画面の状態
type AppScreen = 'pin' | 'reading' | 'result';

// 基本4情報の型
export interface BasicFourInfo {
  name: string;
  address: string;
  birth: string;
  gender: string;
}

export function App(): React.ReactElement {
  const [screen, setScreen] = useState<AppScreen>('pin');
  const [pin, setPin] = useState('');
  const [result, setResult] = useState<BasicFourInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // PIN入力完了時の処理
  const handlePinSubmit = useCallback(async (inputPin: string) => {
    setPin(inputPin);
    setScreen('reading');
    setIsLoading(true);
    setError(null);

    try {
      const response = await window.electronAPI.readCard(inputPin);
      
      if (response.success && response.data) {
        setResult(response.data);
        setScreen('result');
        
        // 読み上げを開始
        const text = formatReadAloud(response.data);
        window.electronAPI.speak(text);
      } else {
        setError(response.error || 'カード読み取りエラーが発生しました');
        setScreen('pin');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      setScreen('pin');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 戻るボタンの処理
  const handleBack = useCallback(() => {
    setScreen('pin');
    setPin('');
    setResult(null);
    setError(null);
  }, []);

  // 読み上げ用テキストの生成
  const formatReadAloud = (info: BasicFourInfo): string => {
    const genderText = info.gender === '1' ? '男性' : info.gender === '2' ? '女性' : '不明';
    return `お名前は${info.name}さんです。住所は${info.address}です。生年月日は${formatBirthDate(info.birth)}です。性別は${genderText}です。`;
  };

  // 生年月日のフォーマット
  const formatBirthDate = (birth: string): string => {
    // 例: "H01.01.01" -> "平成1年1月1日"
    if (!birth) return '';
    const match = birth.match(/^([A-Z])(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return birth;
    
    const eraMap: Record<string, string> = {
      'M': '明治', 'T': '大正', 'S': '昭和', 'H': '平成', 'R': '令和'
    };
    const era = eraMap[match[1]] || match[1];
    const year = parseInt(match[2], 10);
    const month = parseInt(match[3], 10);
    const day = parseInt(match[4], 10);
    
    return `${era}${year}年${month}月${day}日`;
  };

  return (
    <div className="container">
      <div className="header">
        <h1>マイナンバーカード読み取り</h1>
      </div>
      
      <div className="main-content">
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        {screen === 'pin' && (
          <PinInputScreen onSubmit={handlePinSubmit} />
        )}
        
        {screen === 'reading' && (
          <CardPlacementScreen isLoading={isLoading} />
        )}
        
        {screen === 'result' && result && (
          <ResultScreen info={result} onBack={handleBack} />
        )}
      </div>
      
      <div className="status-bar">
        状態: {screen === 'pin' ? 'PIN入力待ち' : screen === 'reading' ? 'カード読み取り中...' : '読み取り完了'}
      </div>
    </div>
  );
}
