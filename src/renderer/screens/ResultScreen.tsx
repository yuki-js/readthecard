import React, { useCallback } from 'react';
import type { BasicFourInfo } from '../App';

interface ResultScreenProps {
  info: BasicFourInfo;
  onBack: () => void;
}

export function ResultScreen({ info, onBack }: ResultScreenProps): React.ReactElement {
  // 性別の表示
  const getGenderDisplay = (gender: string): { text: string; className: string } => {
    if (gender === '1') {
      return { text: '男性', className: 'gender-male' };
    } else if (gender === '2') {
      return { text: '女性', className: 'gender-female' };
    }
    return { text: '不明', className: '' };
  };

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

  // 読み上げボタン
  const handleSpeak = useCallback(() => {
    const genderText = info.gender === '1' ? '男性' : info.gender === '2' ? '女性' : '不明';
    const text = `お名前は${info.name}さんです。住所は${info.address}です。生年月日は${formatBirthDate(info.birth)}です。性別は${genderText}です。`;
    window.electronAPI.speak(text);
  }, [info]);

  const gender = getGenderDisplay(info.gender);

  return (
    <div className="result-screen">
      <h2 style={{ fontSize: '28px', marginBottom: '30px' }}>基本4情報</h2>
      
      <table className="info-table">
        <tbody>
          <tr>
            <th>氏名</th>
            <td>{info.name}</td>
          </tr>
          <tr>
            <th>住所</th>
            <td>{info.address}</td>
          </tr>
          <tr>
            <th>生年月日</th>
            <td>{formatBirthDate(info.birth)}</td>
          </tr>
          <tr>
            <th>性別</th>
            <td className={gender.className}>{gender.text}</td>
          </tr>
        </tbody>
      </table>
      
      <div className="button-group">
        <button className="btn" onClick={handleSpeak}>
          もう一度読み上げ
        </button>
        <button className="btn" onClick={onBack}>
          戻る
        </button>
      </div>
    </div>
  );
}
