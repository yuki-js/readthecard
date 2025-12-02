import { contextBridge, ipcRenderer } from 'electron';

interface BasicFourInfo {
  name: string;
  address: string;
  birthDate: string;
  gender: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  readCard: (pin: string) => ipcRenderer.invoke('read-card', pin),
  waitForCard: () => ipcRenderer.invoke('wait-for-card'),
  speakText: (info: BasicFourInfo) => ipcRenderer.invoke('speak-text', info),
});
