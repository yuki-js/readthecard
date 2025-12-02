import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods for the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  readCard: (pin: string) => ipcRenderer.invoke('read-card', pin),
  speak: (text: string) => ipcRenderer.invoke('speak', text),
  getReaders: () => ipcRenderer.invoke('get-readers'),
});

// Type declarations for the exposed API
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
