import React from 'react';
import type { BasicFourInfo } from '../App';

interface ResultScreenProps {
  info: BasicFourInfo;
  onBack: () => void;
}

export function ResultScreen({ info, onBack }: ResultScreenProps): React.ReactElement {
  // 生年月日のフォーマット
  const formatBirthDate = (birth: string): string => {
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

  // 性別のフォーマット
  const formatGender = (gender: string): string => {
    if (gender === '1') return '男性';
    if (gender === '2') return '女性';
    return '不明';
  };

  return (
    <div className="result-container">
      <div className="result-title">基本4情報</div>
      
      <div className="result-item">
        <div className="result-label">氏名</div>
        <div className="result-value">{info.name}</div>
      </div>
      
      <div className="result-item">
        <div className="result-label">住所</div>
        <div className="result-value">{info.address}</div>
      </div>
      
      <div className="result-item">
        <div className="result-label">生年月日</div>
        <div className="result-value">{formatBirthDate(info.birth)}</div>
      </div>
      
      <div className="result-item">
        <div className="result-label">性別</div>
        <div className="result-value">{formatGender(info.gender)}</div>
      </div>
      
      <button className="back-button" onClick={onBack}>
        戻る
      </button>
    </div>
  );
}
