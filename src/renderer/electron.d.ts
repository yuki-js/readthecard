import type { BasicFourInfo } from './App';

export interface ElectronAPI {
  readCard: (pin: string) => Promise<{ success: boolean; data?: BasicFourInfo; error?: string }>;
  waitForCard: () => Promise<{ success: boolean; error?: string }>;
  speakText: (info: BasicFourInfo) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
