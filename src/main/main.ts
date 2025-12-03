/**
 * Electronメインプロセス
 * アプリケーションのエントリーポイント
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readMynaCard } from './cardReader.js';
import { speakWithVoicevox } from './voicevox.js';
import { getReaders, releasePlatform } from './pcsc/index.js';
import { isVoicevoxAvailable, cleanupVoicevoxCore } from './voicevox/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  // リソースをクリーンアップ
  cleanupVoicevoxCore();
  releasePlatform().catch(console.error);
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handler: カード読み取り
ipcMain.handle('read-card', async (_event, pin: string) => {
  try {
    const result = await readMynaCard(pin);
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'カード読み取りエラー';
    return { success: false, error: errorMessage };
  }
});

// IPC handler: 音声読み上げ
ipcMain.handle('speak', async (_event, text: string) => {
  try {
    await speakWithVoicevox(text);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '音声合成エラー';
    return { success: false, error: errorMessage };
  }
});

// IPC handler: リーダー一覧取得
ipcMain.handle('get-readers', async () => {
  try {
    const readers = await getReaders();
    return { success: true, readers: readers.map((r) => r.name) };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'リーダー検出エラー';
    return { success: false, error: errorMessage };
  }
});

// IPC handler: VOICEVOX状態取得
ipcMain.handle('get-voicevox-status', async () => {
  try {
    const available = isVoicevoxAvailable();
    return { success: true, available, initialized: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'VOICEVOX状態取得エラー';
    return { success: false, error: errorMessage };
  }
});

// IPC handler: 音声停止（将来の実装用）
ipcMain.handle('stop-speaking', async () => {
  // TODO: 音声再生中の停止機能を実装
  return { success: true };
});
