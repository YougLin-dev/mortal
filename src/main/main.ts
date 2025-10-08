import './services';

import { app, BaseWindow } from 'electron';
import started from 'electron-squirrel-startup';
import { setupIPC } from './core/ipc/setup';
import { setupRouter } from './core/router/setup';
import { storage } from './core/storage/config';
import { WindowStateManager } from './services/window/window-state-manager';
import { platform } from '@electron-toolkit/utils';
import { initLogging } from '@/shared/logging/config';
import { getLoggerBy } from '@/shared/logging/helpers';
import { setupProtocolHandlers, shellWindowService } from './services/window/shell-window-service';

initLogging('main');
const logger = getLoggerBy('app', 'lifecycle');

function resotreWindows() {
  storage.getKeysSync('app:windows').forEach((key) => {
    const windowState = storage.getItemSync(key as 'app:windows:');
    if (windowState) shellWindowService.createWindow(windowState);
  });
}

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
    const all = BaseWindow.getAllWindows();
    if (all.length > 0) {
      const window = all[0];
      if (window.isMinimized()) window.restore();
      if (!window.isVisible()) window.show();
      window.focus();
    } else if (app.isReady()) {
      resotreWindows();
    }
  });

  app.whenReady().then(async () => {
    await storage.migrate();

    setupIPC();
    setupRouter();
    setupProtocolHandlers();

    resotreWindows();
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
    if (BaseWindow.getAllWindows().length === 0) {
      resotreWindows();
    }
  });
}
