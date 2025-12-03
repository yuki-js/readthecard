import type { BasicFourInfo } from '../services/mynacard';

interface BasicFourDisplayProps {
  data: BasicFourInfo;
  onBack: () => void;
}

export default function BasicFourDisplay({ data, onBack }: BasicFourDisplayProps) {
  return (
    <div className="result-screen">
      <h1 className="result-title">基本4情報</h1>
      <div className="result-item">
        <span className="result-label">氏名:</span>
        <span className="result-value">{data.name}</span>
      </div>
      <div className="result-item">
        <span className="result-label">住所:</span>
        <span className="result-value">{data.address}</span>
      </div>
      <div className="result-item">
        <span className="result-label">生年月日:</span>
        <span className="result-value">{data.birthDate}</span>
      </div>
      <div className="result-item">
        <span className="result-label">性別:</span>
        <span className="result-value">{data.sex}</span>
      </div>
      <button className="result-back-button" onClick={onBack}>
        戻る
      </button>
    </div>
  );
}
