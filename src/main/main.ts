import { app, BrowserWindow, nativeTheme } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import started from 'electron-squirrel-startup';
import { platform } from '@electron-toolkit/utils';
import { TITLE_BAR_OVERLAY } from './ui';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (started) {
  app.quit();
}

const createWindow = async (): Promise<void> => {
  const { shouldUseDarkColors } = nativeTheme;

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    backgroundColor: platform.isMacOS ? undefined : nativeTheme.shouldUseDarkColors ? '#1f2020' : '#f4f3f2',
    autoHideMenuBar: true,
    titleBarStyle: platform.isMacOS ? 'hiddenInset' : 'hidden',
    titleBarOverlay: !platform.isMacOS ? (shouldUseDarkColors ? TITLE_BAR_OVERLAY.DARK : TITLE_BAR_OVERLAY.LIGHT) : undefined,
    darkTheme: nativeTheme.shouldUseDarkColors,
    frame: false,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    icon: path.join(__dirname, `renderer/${MAIN_WINDOW_VITE_NAME}/icon.png`)
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.on('did-frame-finish-load', () => {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, `renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

app.whenReady().then(async () => {
  createWindow();
});

app.on('window-all-closed', async () => {
  if (!platform.isMacOS) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
