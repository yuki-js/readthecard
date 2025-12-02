import React from 'react';

interface CardPlacementScreenProps {
  isLoading: boolean;
}

export function CardPlacementScreen({ isLoading }: CardPlacementScreenProps): React.ReactElement {
  return (
    <div className="card-placement-screen">
      <div className="card-placement-message">
        カードをリーダーにかざしてください
      </div>
      
      <div className="card-icon">
        [ カード ]
      </div>
      
      {isLoading && (
        <div className="loading-message">
          読み取り中...しばらくお待ちください
        </div>
      )}
    </div>
  );
}
