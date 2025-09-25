import { contextBridge } from 'electron';

import { initPreloadBridge, globalEmitter, setupEventForwarding } from './preload-bridge-generator';
import { electronAPI } from '@electron-toolkit/preload';
import { getArgumentValue } from '@/shared/utils/preload-utils';
import type { WindowState } from '@/shared/types/window';

const windowState = getArgumentValue<WindowState>('windowState');
const isMac = getArgumentValue<boolean>('isMac');

setupEventForwarding();

const bridge = initPreloadBridge();

console.log('Generated bridge:', Object.keys(bridge));

for (const [serviceName, serviceObj] of Object.entries(bridge)) {
  console.log(`Exposing ${serviceName} with methods:`, Object.keys(serviceObj));
  contextBridge.exposeInMainWorld(serviceName, serviceObj);
}

contextBridge.exposeInMainWorld('events', globalEmitter);
contextBridge.exposeInMainWorld('electron', electronAPI);
contextBridge.exposeInMainWorld('windowState', windowState);
contextBridge.exposeInMainWorld('isMac', isMac);
