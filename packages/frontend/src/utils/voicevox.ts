/**
 * VOICEVOX Core を使用した音声合成ユーティリティ
 * ずんだもん (Speaker ID: 3) を使用
 */

// VOICEVOX Coreのスピーカー ID（ずんだもん）
const ZUNDAMON_SPEAKER_ID = 3;

// バックエンドのVOICEVOX APIエンドポイント
const VOICEVOX_API_BASE = '/api/voicevox';

/**
 * テキストを読み上げる
 * バックエンドのVOICEVOX Core経由で音声合成
 */
export async function speakText(text: string): Promise<void> {
  try {
    // 音声合成リクエスト
    const response = await fetch(`${VOICEVOX_API_BASE}/synthesis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        speakerId: ZUNDAMON_SPEAKER_ID,
      }),
    });

    if (!response.ok) {
      console.warn('VOICEVOX音声合成に失敗しました:', response.statusText);
      // フォールバック: Web Speech API
      fallbackSpeak(text);
      return;
    }

    // 音声データを取得して再生
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error('音声再生に失敗しました'));
      };
      audio.play().catch(reject);
    });
  } catch (error) {
    console.warn('VOICEVOX音声合成に失敗しました:', error);
    // フォールバック: Web Speech API
    fallbackSpeak(text);
  }
}

/**
 * フォールバック: Web Speech APIを使用した読み上げ
 */
function fallbackSpeak(text: string): void {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
  }
}
