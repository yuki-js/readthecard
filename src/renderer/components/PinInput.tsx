import { useState, useRef, useCallback, KeyboardEvent, ChangeEvent } from 'react';

interface PinInputProps {
  onSubmit: (pin: string) => void;
}

function PinInput({ onSubmit }: PinInputProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = useCallback((index: number, event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    
    // Only allow single digit
    if (value.length > 1) {
      const lastDigit = value.slice(-1);
      if (/^\d$/.test(lastDigit)) {
        const newDigits = [...digits];
        newDigits[index] = lastDigit;
        setDigits(newDigits);
        
        // Move to next input
        if (index < 3) {
          inputRefs.current[index + 1]?.focus();
        }
      }
      return;
    }
    
    if (value === '' || /^\d$/.test(value)) {
      const newDigits = [...digits];
      newDigits[index] = value;
      setDigits(newDigits);
      
      // Move to next input if digit entered
      if (value && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  }, [digits]);

  const handleKeyDown = useCallback((index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    } else if (event.key === 'Enter') {
      handleSubmit();
    }
  }, [digits]);

  const handleSubmit = useCallback(() => {
    const pin = digits.join('');
    if (pin.length === 4) {
      onSubmit(pin);
    }
  }, [digits, onSubmit]);

  const isPinComplete = digits.every(d => d !== '');

  return (
    <div className="pin-container">
      <p className="pin-label">券面事項入力補助AP用の4桁の暗証番号を入力してください</p>
      
      <div className="pin-input-wrapper">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={el => { inputRefs.current[index] = el; }}
            type="password"
            inputMode="numeric"
            maxLength={2}
            value={digit}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="pin-digit"
            autoFocus={index === 0}
            aria-label={`暗証番号${index + 1}桁目`}
          />
        ))}
      </div>
      
      <button 
        className="submit-button" 
        onClick={handleSubmit}
        disabled={!isPinComplete}
      >
        読み取り開始
      </button>
    </div>
  );
}

export default PinInput;
