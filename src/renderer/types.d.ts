// Electron API 型定義
export {};

declare global {
  interface Window {
    electronAPI: {
      readCard: (pin: string) => Promise<{
        success: boolean;
        data?: {
          name: string;
          address: string;
          birth: string;
          gender: string;
        };
        error?: string;
      }>;
      speak: (text: string) => Promise<{ success: boolean; error?: string }>;
      getReaders: () => Promise<{ success: boolean; readers?: string[]; error?: string }>;
    };
  }
}
