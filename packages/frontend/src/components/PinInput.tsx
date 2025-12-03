import { useState, useCallback } from 'react';

interface PinInputProps {
  onSubmit: (pin: string) => void;
  remainingAttempts?: number;
}

export default function PinInput({ onSubmit, remainingAttempts }: PinInputProps) {
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(value);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 4 && !isSubmitting) {
      setIsSubmitting(true);
      onSubmit(pin);
      setIsSubmitting(false);
      setPin('');
    }
  }, [pin, isSubmitting, onSubmit]);

  return (
    <div className="pin-screen">
      <h1 className="pin-title">暗証番号を入力してください</h1>
      <p style={{ fontSize: '24px', marginBottom: '20px' }}>
        （券面事項入力補助用暗証番号: 4桁）
      </p>
      <form onSubmit={handleSubmit}>
        <div className="pin-input-container">
          <input
            type="password"
            className="pin-input"
            value={pin}
            onChange={handleChange}
            maxLength={4}
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </div>
        <button
          type="submit"
          className="pin-button"
          disabled={pin.length !== 4 || isSubmitting}
        >
          確認
        </button>
      </form>
      {remainingAttempts !== undefined && (
        <p className="pin-error">
          暗証番号が正しくありません。残り{remainingAttempts}回
        </p>
      )}
    </div>
  );
}
