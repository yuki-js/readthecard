import React, { useState, useCallback } from 'react';

interface PinInputScreenProps {
  onSubmit: (pin: string) => void;
}

export function PinInputScreen({ onSubmit }: PinInputScreenProps): React.ReactElement {
  const [pin, setPin] = useState('');

  // キー入力処理
  const handleKeyPress = useCallback((key: string) => {
    if (key === 'clear') {
      setPin('');
    } else if (key === 'back') {
      setPin(prev => prev.slice(0, -1));
    } else if (pin.length < 4) {
      setPin(prev => prev + key);
    }
  }, [pin]);

  // 送信処理
  const handleSubmit = useCallback(() => {
    if (pin.length === 4) {
      onSubmit(pin);
    }
  }, [pin, onSubmit]);

  return (
    <div className="pin-screen">
      <label className="pin-label">
        券面事項入力補助AP用PINを入力してください（4桁）
      </label>
      
      <input
        type="password"
        className="pin-input"
        value={pin.replace(/./g, '●')}
        maxLength={4}
        readOnly
        placeholder="●●●●"
      />
      
      <div className="keypad">
        <div className="keypad-row">
          <button className="key-btn" onClick={() => handleKeyPress('1')}>1</button>
          <button className="key-btn" onClick={() => handleKeyPress('2')}>2</button>
          <button className="key-btn" onClick={() => handleKeyPress('3')}>3</button>
        </div>
        <div className="keypad-row">
          <button className="key-btn" onClick={() => handleKeyPress('4')}>4</button>
          <button className="key-btn" onClick={() => handleKeyPress('5')}>5</button>
          <button className="key-btn" onClick={() => handleKeyPress('6')}>6</button>
        </div>
        <div className="keypad-row">
          <button className="key-btn" onClick={() => handleKeyPress('7')}>7</button>
          <button className="key-btn" onClick={() => handleKeyPress('8')}>8</button>
          <button className="key-btn" onClick={() => handleKeyPress('9')}>9</button>
        </div>
        <div className="keypad-row">
          <button className="key-btn" onClick={() => handleKeyPress('clear')}>C</button>
          <button className="key-btn" onClick={() => handleKeyPress('0')}>0</button>
          <button className="key-btn" onClick={() => handleKeyPress('back')}>←</button>
        </div>
      </div>
      
      <div className="button-group">
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={pin.length !== 4}
        >
          読み取り開始
        </button>
      </div>
    </div>
  );
}
