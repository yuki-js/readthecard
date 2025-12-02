import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { readMynaCard, waitForCard } from './cardReader.js';
import { speakWithVoicevox } from './voicevox.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'マイナンバーカード読み取り',
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers
ipcMain.handle('wait-for-card', async () => {
  try {
    await waitForCard();
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'カード待機中にエラーが発生しました'
    };
  }
});

ipcMain.handle('read-card', async (_event, pin: string) => {
  try {
    const data = await readMynaCard(pin);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'カード読み取りに失敗しました'
    };
  }
});

interface BasicFourInfo {
  name: string;
  address: string;
  birthDate: string;
  gender: string;
}

ipcMain.handle('speak-text', async (_event, info: BasicFourInfo) => {
  try {
    // Format birth date for speech
    const formatBirthForSpeech = (birth: string): string => {
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
    };

    const genderText = info.gender === '1' ? '男性' : info.gender === '2' ? '女性' : info.gender;
    
    const text = `お名前は、${info.name}さんなのだ。住所は、${info.address}なのだ。生年月日は、${formatBirthForSpeech(info.birthDate)}なのだ。性別は、${genderText}なのだ。`;
    
    await speakWithVoicevox(text);
    return { success: true };
  } catch (error) {
    console.error('Speech error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '読み上げに失敗しました'
    };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
