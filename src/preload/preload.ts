import { contextBridge } from 'electron';

import { initPreloadBridge, globalEmitter, setupEventForwarding } from './bridge/generator';
import { ipcFetch, createStreamController } from './fetch/bridge';
import { electronAPI } from '@electron-toolkit/preload';
import { getArgumentValue } from '@/shared/utils/preload-utils';
import type { WindowState } from '@/shared/types/window';

const windowState = getArgumentValue<WindowState>('windowState');
const isMac = getArgumentValue<boolean>('isMac');
const locale = getArgumentValue<string>('locale');

setupEventForwarding();

const bridge = initPreloadBridge();

console.log('Generated bridge:', Object.keys(bridge));

for (const [serviceName, serviceObj] of Object.entries(bridge)) {
  console.log(`Exposing ${serviceName} with methods:`, Object.keys(serviceObj));
  contextBridge.exposeInMainWorld(serviceName, serviceObj);
}

contextBridge.exposeInMainWorld('_ipcFetchRaw', ipcFetch);
contextBridge.exposeInMainWorld('_createStreamController', createStreamController);
contextBridge.exposeInMainWorld('events', globalEmitter);
contextBridge.exposeInMainWorld('electron', electronAPI);
contextBridge.exposeInMainWorld('windowState', windowState);
contextBridge.exposeInMainWorld('isMac', isMac);
contextBridge.exposeInMainWorld('locale', locale);
