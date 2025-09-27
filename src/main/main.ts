import './services';

import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';
import { setupIPC } from './ipc-handlers';
import { storage } from './storage';
import { WindowStateManager } from './window-state-manager';
import { windowService } from './services/window-service';
import { platform } from '@electron-toolkit/utils';

if (started) {
  app.quit();
}

app.whenReady().then(async () => {
  await storage.migrate();

  setupIPC();

  windowService.setupProtocolHandler();

  await windowService.createMainWindow();
});

app.on('window-all-closed', async () => {
  console.log('saving all window states before dispose');
  WindowStateManager.saveAllStates();
  console.log('wait for storage dispose');
  await storage.dispose();
  console.log('storage disposed');
  if (!platform.isMacOS) {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await windowService.createMainWindow();
  }
});
