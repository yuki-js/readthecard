import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { readMynaCard } from './cardReader';
import { speakWithVoicevox } from './voicevox';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for card reading
ipcMain.handle('read-card', async (_event, pin: string) => {
  try {
    const result = await readMynaCard(pin);
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'カード読み取りエラー';
    return { success: false, error: errorMessage };
  }
});

// IPC handler for VOICEVOX speech
ipcMain.handle('speak', async (_event, text: string) => {
  try {
    await speakWithVoicevox(text);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '音声合成エラー';
    return { success: false, error: errorMessage };
  }
});

// IPC handler for getting available readers
ipcMain.handle('get-readers', async () => {
  try {
    // ESMモジュールを動的インポート
    const { PcscPlatformManager } = await import('@aokiapp/jsapdu-pcsc');
    const platform = PcscPlatformManager.getInstance().getPlatform();
    await platform.init();
    const devices = await platform.getDeviceInfo();
    await platform.release();
    return { success: true, readers: devices.map((d: any) => d.friendlyName) };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'リーダー検出エラー';
    return { success: false, error: errorMessage };
  }
});
