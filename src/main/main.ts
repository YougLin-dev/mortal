import './services';

import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';
import { setupIPC } from './core/ipc/setup';
import { setupRouter } from './core/router/setup';
import { storage } from './core/storage/config';
import { WindowStateManager } from './services/window/window-state-manager';
import { windowService } from './services/window/window-service';
import { platform } from '@electron-toolkit/utils';
import { initLogging } from '@/shared/logging/config';
import { getLoggerBy } from '@/shared/logging/helpers';

initLogging('main');
const logger = getLoggerBy('app', 'lifecycle');

// Handle Squirrel events on Windows (installer/uninstaller) and quit early
if (started) {
  app.quit();
}

// Ensure single-instance application
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running — quit this one
  app.quit();
} else {
  // Focus existing window when a second instance is launched
  app.on('second-instance', async () => {
    const all = BrowserWindow.getAllWindows();
    if (all.length > 0) {
      const mainWindow = all[0];
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    } else if (app.isReady()) {
      await windowService.createMainWindow();
    }
  });

  app.whenReady().then(async () => {
    await storage.migrate();

    setupIPC();
    setupRouter();

    windowService.setupProtocolHandler();

    await windowService.createMainWindow();
  });

  app.on('window-all-closed', async () => {
    logger.info('saving all window states before dispose');
    WindowStateManager.saveAllStates();
    logger.info('wait for storage dispose');
    await storage.dispose();
    logger.info('storage disposed');
    if (!platform.isMacOS) {
      app.quit();
    }
  });

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await windowService.createMainWindow();
    }
  });
}
