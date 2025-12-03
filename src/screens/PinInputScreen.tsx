import React, { useState, useCallback } from 'react';

interface PinInputScreenProps {
  onSubmit: (pin: string) => void;
}

export function PinInputScreen({ onSubmit }: PinInputScreenProps): React.ReactElement {
  const [pin, setPin] = useState('');

  const handleKeyPress = useCallback((key: string) => {
    if (key === 'clear') {
      setPin('');
    } else if (key === 'back') {
      setPin(prev => prev.slice(0, -1));
    } else if (pin.length < 4) {
      setPin(prev => prev + key);
    }
  }, [pin.length]);

  const handleSubmit = useCallback(() => {
    if (pin.length === 4) {
      onSubmit(pin);
    }
  }, [pin, onSubmit]);

  return (
    <div className="pin-container">
      <div className="pin-label">券面事項入力補助AP用 暗証番号（4桁）</div>
      <input
        type="password"
        className="pin-input"
        value={pin}
        readOnly
        maxLength={4}
        placeholder="----"
      />
      
      <div className="pin-keypad">
        <table>
          <tbody>
            <tr>
              <td><button className="key-button" onClick={() => handleKeyPress('1')}>1</button></td>
              <td><button className="key-button" onClick={() => handleKeyPress('2')}>2</button></td>
              <td><button className="key-button" onClick={() => handleKeyPress('3')}>3</button></td>
            </tr>
            <tr>
              <td><button className="key-button" onClick={() => handleKeyPress('4')}>4</button></td>
              <td><button className="key-button" onClick={() => handleKeyPress('5')}>5</button></td>
              <td><button className="key-button" onClick={() => handleKeyPress('6')}>6</button></td>
            </tr>
            <tr>
              <td><button className="key-button" onClick={() => handleKeyPress('7')}>7</button></td>
              <td><button className="key-button" onClick={() => handleKeyPress('8')}>8</button></td>
              <td><button className="key-button" onClick={() => handleKeyPress('9')}>9</button></td>
            </tr>
            <tr>
              <td><button className="key-button" onClick={() => handleKeyPress('clear')}>C</button></td>
              <td><button className="key-button" onClick={() => handleKeyPress('0')}>0</button></td>
              <td><button className="key-button" onClick={() => handleKeyPress('back')}>←</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <button
        className="submit-button"
        onClick={handleSubmit}
        disabled={pin.length !== 4}
      >
        読み取り開始
      </button>
    </div>
  );
}
