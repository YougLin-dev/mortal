import './services';

import { app, BrowserWindow, nativeTheme } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { setupIPC } from './ipc-handlers';
import { AppProtocol } from './electron-protocol';
import { TITLE_BAR_OVERLAY, WIN } from '@/shared/consts/ui';
import { platform } from '@electron-toolkit/utils';
import { themeService } from './services/theme-service';
import { storage } from './storage';
import { WindowStateManager } from './window-state-manager';
import { toArgument } from '@/shared/utils/preload-utils';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

const mainWindowProtocal = new AppProtocol(
  'main',
  'localhost',
  import.meta.dirname,
  path.join(import.meta.dirname, `./renderer/${MAIN_WINDOW_VITE_NAME}`)
);

if (started) {
  app.quit();
}

const createWindow = async () => {
  await themeService.initFromStorage();

  const mainWindowState = new WindowStateManager({
    windowId: 'main',
    restoreFullScreen: false,
    restoreMaximized: true,
    defaultState: {
      width: WIN.MIN_WIDTH,
      height: WIN.MIN_HEIGHT,
      isFullScreen: false,
      type: 'main'
    }
  });
  await mainWindowState.initialize();

  const { shouldUseDarkColors } = nativeTheme;

  const mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: WIN.MIN_WIDTH,
    minHeight: WIN.MIN_HEIGHT,
    fullscreen: mainWindowState.isFullScreen,
    backgroundColor: platform.isMacOS ? undefined : nativeTheme.shouldUseDarkColors ? '#1f2020' : '#f4f3f2',
    autoHideMenuBar: true,
    titleBarStyle: platform.isMacOS ? 'hiddenInset' : 'hidden',
    titleBarOverlay: !platform.isMacOS ? (shouldUseDarkColors ? TITLE_BAR_OVERLAY.DARK : TITLE_BAR_OVERLAY.LIGHT) : undefined,
    darkTheme: nativeTheme.shouldUseDarkColors,
    frame: false,
    transparent: false,
    webPreferences: {
      preload: mainWindowProtocal.getPreloadFile(),
      nodeIntegration: false,
      contextIsolation: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,

      additionalArguments: [toArgument('windowState', mainWindowState.windowState), toArgument('isMac', platform.isMacOS)]
    },
    icon: path.join(import.meta.dirname, './resources/images/icon.png')
  });

  mainWindowState.manage(mainWindow);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.on('did-frame-finish-load', () => {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    });
  } else {
    mainWindow.loadURL(mainWindowProtocal.getLoadUrl());
  }
};

app.whenReady().then(async () => {
  await storage.migrate();

  setupIPC();

  mainWindowProtocal.setupHandler();

  createWindow();
});

app.on('window-all-closed', async () => {
  console.log('saving all window states before dispose');
  await WindowStateManager.saveAllStates();
  console.log('wait for storage dispose');
  await storage.dispose();
  console.log('storage disposed');
  if (!platform.isMacOS) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
