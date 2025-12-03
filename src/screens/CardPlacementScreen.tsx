import React from 'react';

interface CardPlacementScreenProps {
  isLoading: boolean;
}

export function CardPlacementScreen({ isLoading }: CardPlacementScreenProps): React.ReactElement {
  return (
    <div className="reading-container">
      <div className="reading-message">
        {isLoading ? 'カード読み取り中...' : 'カードをリーダーにセットしてください'}
      </div>
      <div className="reading-icon">
        {isLoading ? '⏳' : '💳'}
      </div>
    </div>
  );
}
