import type { IpcMainInvokeEvent } from 'electron';
import { BrowserWindow, nativeTheme } from 'electron';
import path from 'node:path';
import { Handler, Service } from '@/shared/decorators';
import { AppProtocol } from '@/main/electron-protocol';
import { TITLE_BAR_OVERLAY, WIN } from '@/shared/consts/ui';
import { platform } from '@electron-toolkit/utils';
import { WindowStateManager } from '@/main/window-state-manager';
import { toArgument } from '@/shared/utils/preload-utils';

@Service
export class WindowService {
  private mainWindowProtocol: AppProtocol;

  constructor() {
    this.mainWindowProtocol = new AppProtocol(
      'main',
      'localhost',
      import.meta.dirname,
      path.join(import.meta.dirname, `./renderer/${MAIN_WINDOW_VITE_NAME}`)
    );
  }

  @Handler
  setAlwaysOnTop(_event: IpcMainInvokeEvent, alwaysOnTop: boolean): void {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.setAlwaysOnTop(alwaysOnTop);
    }
  }

  async createMainWindow(): Promise<BrowserWindow> {
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

    const { shouldUseDarkColors } = nativeTheme;

    const mainWindow = new BrowserWindow({
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      minWidth: WIN.MIN_WIDTH,
      minHeight: WIN.MIN_HEIGHT,
      fullscreen: mainWindowState.isFullScreen,
      alwaysOnTop: mainWindowState.isAlwaysOnTop,
      backgroundColor: platform.isMacOS ? undefined : nativeTheme.shouldUseDarkColors ? '#1f2020' : '#f4f3f2',
      autoHideMenuBar: true,
      titleBarStyle: platform.isMacOS ? 'hiddenInset' : 'hidden',
      titleBarOverlay: !platform.isMacOS ? (shouldUseDarkColors ? TITLE_BAR_OVERLAY.DARK : TITLE_BAR_OVERLAY.LIGHT) : undefined,
      darkTheme: nativeTheme.shouldUseDarkColors,
      frame: false,
      transparent: false,
      webPreferences: {
        preload: this.mainWindowProtocol.getPreloadFile(),
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
      mainWindow.loadURL(this.mainWindowProtocol.getLoadUrl());
    }

    return mainWindow;
  }

  setupProtocolHandler(): void {
    this.mainWindowProtocol.setupHandler();
  }

  getAllWindows(): BrowserWindow[] {
    return BrowserWindow.getAllWindows();
  }

  getFocusedWindow(): BrowserWindow | null {
    return BrowserWindow.getFocusedWindow();
  }
}

export const windowService = new WindowService();
