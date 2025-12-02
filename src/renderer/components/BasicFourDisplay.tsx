import type { BasicFourInfo } from '../App';

interface BasicFourDisplayProps {
  info: BasicFourInfo;
  onSpeak: () => void;
}

function formatBirthDate(birth: string): string {
  // birth format from card: "H01.01.01" or similar
  // Convert Japanese era format to readable format
  const eraMap: Record<string, string> = {
    'M': '明治',
    'T': '大正',
    'S': '昭和',
    'H': '平成',
    'R': '令和',
  };
  
  const match = birth.match(/^([MTSHR])(\d{2})\.(\d{2})\.(\d{2})$/);
  if (match) {
    const [, era, year, month, day] = match;
    const eraName = eraMap[era] || era;
    return `${eraName}${parseInt(year)}年${parseInt(month)}月${parseInt(day)}日`;
  }
  
  return birth;
}

function formatGender(gender: string): string {
  switch (gender) {
    case '1':
      return '男性';
    case '2':
      return '女性';
    default:
      return gender;
  }
}

function BasicFourDisplay({ info, onSpeak }: BasicFourDisplayProps) {
  return (
    <div className="basic-four-container">
      <h1 className="title">基本4情報</h1>
      
      <div className="basic-four-card">
        <div className="info-row">
          <span className="info-label">氏名</span>
          <span className="info-value name">{info.name}</span>
        </div>
        
        <div className="info-row">
          <span className="info-label">住所</span>
          <span className="info-value address">{info.address}</span>
        </div>
        
        <div className="info-row">
          <span className="info-label">生年月日</span>
          <span className="info-value">{formatBirthDate(info.birthDate)}</span>
        </div>
        
        <div className="info-row">
          <span className="info-label">性別</span>
          <span className="info-value">{formatGender(info.gender)}</span>
        </div>
      </div>
      
      <button className="speak-button" onClick={onSpeak}>
        ずんだもんに読み上げてもらう
      </button>
    </div>
  );
}

export default BasicFourDisplay;
