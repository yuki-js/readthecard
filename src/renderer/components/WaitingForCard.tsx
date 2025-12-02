import { useEffect } from 'react';

interface WaitingForCardProps {
  onCardReady: () => void;
}

function WaitingForCard({ onCardReady }: WaitingForCardProps) {
  useEffect(() => {
    let isCancelled = false;

    const checkForCard = async () => {
      try {
        const result = await window.electronAPI.waitForCard();
        if (!isCancelled && result.success) {
          onCardReady();
        }
      } catch (error) {
        console.error('Error waiting for card:', error);
      }
    };

    checkForCard();

    return () => {
      isCancelled = true;
    };
  }, [onCardReady]);

  return (
    <div className="waiting-container">
      <div className="card-icon"></div>
      <p className="waiting-message">
        カードリーダーにマイナンバーカードを置いてください
      </p>
    </div>
  );
}

export default WaitingForCard;
