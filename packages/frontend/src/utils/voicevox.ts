/**
 * VOICEVOX Core を使用した音声合成ユーティリティ
 * ずんだもん (Speaker ID: 3) を使用
 */
import { getSelectedSpeakerId } from "./settings";

// VOICEVOX Coreのスピーカー ID（ずんだもん）
const ZUNDAMON_SPEAKER_ID = 3;
// バックエンドのVOICEVOX APIエンドポイント
const VOICEVOX_API_BASE = "/api/voicevox";

// プリセット音声マッピングのキャッシュ
let presetCache: Record<string, { file?: string; text?: string }> | null = null;

/**
 * プリセット音声マッピングを読み込む
 */
async function loadVoicePresets(): Promise<
  Record<string, { file?: string; text?: string }>
> {
  if (presetCache !== null) {
    return presetCache;
  }

  try {
    const response = await fetch("/audio/presets/voice-presets.json");
    if (!response.ok) {
      presetCache = {};
      return presetCache;
    }
    const data = await response.json();
    const presets: Record<string, { file?: string; text?: string }> =
      data.presets || {};
    presetCache = presets;
    return presets;
  } catch {
    presetCache = {};
    return presetCache;
  }
}

/**
 * プリセット音声を再生する
 * @param audioPath プリセット音声ファイルのパス
 * @returns 再生成功した場合はtrue、失敗した場合はfalse
 */
async function playPresetAudio(audioPath: string): Promise<boolean> {
  try {
    const audio = new Audio(audioPath);

    return await new Promise<boolean>((resolve) => {
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      audio.play().catch(() => resolve(false));
    });
  } catch {
    return false;
  }
}

/**
 * 名前からプリセット音声のパスを取得する
 * @param name 名前
 * @returns プリセット音声のパス、見つからない場合はnull
 */
export async function getPresetAudioPath(name: string): Promise<string | null> {
  const presets = await loadVoicePresets();
  return presets[name]?.file || null;
}

/**
 * 名前からプリセット音声のパスを取得する
 * @param name 名前
 * @returns プリセット音声のパス、見つからない場合はnull
 */
export async function getPresetText(name: string): Promise<string | null> {
  const presets = await loadVoicePresets();
  return presets[name]?.text || null;
}

/**
 * 名前に対応するプリセット音声があるかチェックし、あれば再生する
 * @param name 名前
 * @returns プリセット音声を再生した場合はtrue、なければfalse
 */
export async function speakPresetGreeting(name: string): Promise<boolean> {
  const audioPath = await getPresetAudioPath(name);
  if (audioPath) {
    const success = await playPresetAudio(audioPath);
    if (success) {
      return true;
    }
  }
  return false;
}

/**
 * テキストを読み上げる
 * バックエンドのVOICEVOX Core経由で音声合成
 */
export async function speakText(text: string): Promise<void> {
  try {
    // 音声合成リクエスト
    const response = await fetch(`${VOICEVOX_API_BASE}/synthesis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        speakerId: getSelectedSpeakerId() ?? ZUNDAMON_SPEAKER_ID,
      }),
    });

    if (!response.ok) {
      console.warn("VOICEVOX音声合成に失敗しました:", response.statusText);
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
        reject(new Error("音声再生に失敗しました"));
      };
      audio.play().catch(reject);
    });
  } catch (error) {
    console.warn("VOICEVOX音声合成に失敗しました:", error);
    // フォールバック: Web Speech API
    fallbackSpeak(text);
  }
}

/**
 * フォールバック: Web Speech APIを使用した読み上げ
 */
function fallbackSpeak(text: string): void {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    window.speechSynthesis.speak(utterance);
  }
}
