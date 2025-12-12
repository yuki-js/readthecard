/**
 * 設定を永続化するユーティリティ
 * localStorage を使用して設定を保存
 */

const SETTINGS_KEY = "readthecard-settings";

export interface Settings {
  /** 選択されたカードリーダーのID */
  selectedReaderId?: string;
  /** 選択されたVOICEVOXスピーカーID（スタイルID） */
  selectedSpeakerId?: number;
  /** テストカードモード */
  testCardMode?: boolean;
}

/**
 * 設定を読み込む
 */
export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn("設定の読み込みに失敗しました:", error);
  }
  return {};
}

/**
 * 設定を保存
 */
export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("設定の保存に失敗しました:", error);
  }
}

/**
 * 選択されたカードリーダーIDを取得
 */
export function getSelectedReaderId(): string | undefined {
  return loadSettings().selectedReaderId;
}

/**
 * 選択されたカードリーダーIDを保存
 */
export function setSelectedReaderId(readerId: string | undefined): void {
  const settings = loadSettings();
  settings.selectedReaderId = readerId;
  saveSettings(settings);
}

export function getSelectedSpeakerId(): number | undefined {
  return loadSettings().selectedSpeakerId;
}

export function setSelectedSpeakerId(speakerId: number | undefined): void {
  const settings = loadSettings();
  settings.selectedSpeakerId = speakerId;
  saveSettings(settings);
}

/** テストカードモード取得 */
export function getTestCardMode(): boolean {
  return !!loadSettings().testCardMode;
}

/** テストカードモード設定 */
export function setTestCardMode(value: boolean): void {
  const settings = loadSettings();
  settings.testCardMode = value;
  saveSettings(settings);
}
